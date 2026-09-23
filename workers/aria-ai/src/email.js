import { connect } from 'cloudflare:sockets';

const SUBJECT = 'Ваш код доступа — JEREN EDUCATION';

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizeEmail(email));
}

export function maskEmail(email) {
  const normalized = normalizeEmail(email);
  const [local, domain] = normalized.split('@');
  if (!local || !domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

function toBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function encodeSubject(subject) {
  return `=?UTF-8?B?${toBase64(subject)}?=`;
}

function buildEmailContent(code, firstName, lastName) {
  const greeting = firstName
    ? `Здравствуйте, ${firstName}${lastName ? ` ${lastName}` : ''}!`
    : 'Здравствуйте!';

  const text = `${greeting}

Ваш код доступа к платформе JEREN EDUCATION:

${code}

Введите этот код на странице входа, чтобы получить полный доступ.

С уважением,
команда JEREN EDUCATION`;

  const html = `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:32px 16px;background:#0b0d14;font-family:Georgia,serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
    <table role="presentation" width="100%" style="max-width:560px;background:#151822;border:1px solid #3a3224;border-radius:20px;">
      <tr><td style="padding:28px 32px;text-align:center;">
        <div style="font-size:11px;letter-spacing:0.28em;color:#d4af6a;">JEREN EDUCATION</div>
        <h1 style="margin:16px 0 8px;font-size:24px;color:#f5f1e8;">Код доступа</h1>
        <p style="margin:0;color:#a8a095;font-size:15px;">${greeting}</p>
        <div style="margin:24px 0;padding:18px 28px;border-radius:14px;background:rgba(212,175,106,0.12);border:1px solid #6b5735;font-family:monospace;font-size:28px;letter-spacing:0.18em;color:#e8c878;">${code}</div>
        <p style="margin:0;color:#a8a095;font-size:14px;">Введите код на странице входа платформы.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  return { text, html };
}

function escapeDotLines(body) {
  return body.replace(/^\./gm, '..');
}

function buildMimeMessage({ fromName, fromEmail, to, subject, text, html }) {
  const boundary = `JerenEdu_${Date.now()}`;
  const fromHeader = fromName ? `${fromName} <${fromEmail}>` : fromEmail;

  const parts = [
    `From: ${fromHeader}`,
    `To: ${to}`,
    `Subject: ${encodeSubject(subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    toBase64(text),
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    toBase64(html),
    '',
    `--${boundary}--`,
    '',
  ];

  return escapeDotLines(parts.join('\r\n'));
}

async function readSmtpResponse(reader) {
  const decoder = new TextDecoder();
  let buffer = '';
  let lines = [];
  let expectedCode = null;

  while (true) {
    const { value, done } = await reader.read();
    if (value) buffer += decoder.decode(value, { stream: true });

    while (buffer.includes('\r\n')) {
      const splitAt = buffer.indexOf('\r\n');
      const line = buffer.slice(0, splitAt);
      buffer = buffer.slice(splitAt + 2);
      lines.push(line);

      if (!expectedCode) {
        expectedCode = line.slice(0, 3);
      }

      if (line.length >= 4 && line[3] === ' ') {
        const code = parseInt(expectedCode, 10);
        const response = { code, text: lines.join('\n') };
        lines = [];
        expectedCode = null;
        return response;
      }
    }

    if (done) {
      if (lines.length) {
        const code = parseInt(lines[0].slice(0, 3), 10);
        return { code, text: lines.join('\n') };
      }
      throw new Error('SMTP connection closed unexpectedly');
    }
  }
}

async function smtpCommand(writer, reader, command) {
  if (command != null) {
    await writer.write(new TextEncoder().encode(`${command}\r\n`));
  }
  const response = await readSmtpResponse(reader);
  if (response.code >= 400) {
    throw new Error(`SMTP ${response.code}: ${response.text}`);
  }
  return response;
}

async function smtpLogin(writer, reader, username, password) {
  await smtpCommand(writer, reader, 'AUTH LOGIN');
  await smtpCommand(writer, reader, toBase64(username));
  await smtpCommand(writer, reader, toBase64(password));
}

async function sendViaSmtp({ host, port, username, password, fromName, fromEmail, to, subject, text, html }) {
  const socket = connect(`${host}:${port}`, { secureTransport: 'on' });
  const writer = socket.writable.getWriter();
  const reader = socket.readable.getReader();

  try {
    await readSmtpResponse(reader);
    await smtpCommand(writer, reader, `EHLO jeren-education`);
    await smtpLogin(writer, reader, username, password);
    await smtpCommand(writer, reader, `MAIL FROM:<${fromEmail}>`);
    await smtpCommand(writer, reader, `RCPT TO:<${to}>`);
    await smtpCommand(writer, reader, 'DATA');

    const message = buildMimeMessage({ fromName, fromEmail, to, subject, text, html });
    await writer.write(new TextEncoder().encode(`${message}\r\n.\r\n`));
    await readSmtpResponse(reader);

    await smtpCommand(writer, reader, 'QUIT');
    return { success: true };
  } finally {
    try {
      writer.releaseLock();
    } catch {
      /* ignore */
    }
    try {
      reader.releaseLock();
    } catch {
      /* ignore */
    }
    try {
      await socket.close();
    } catch {
      /* ignore */
    }
  }
}

export async function sendAccessCodeEmail(env, email, code, firstName, lastName = '') {
  const username = String(env.SMTP_USER || env.EMAIL_FROM || '').trim();
  const password = String(env.SMTP_PASSWORD || '').trim();
  const host = String(env.SMTP_HOST || 'smtp.mail.ru').trim();
  const port = Number(env.SMTP_PORT || 465);
  const fromEmail = username;
  const fromName = String(env.EMAIL_FROM_NAME || 'JEREN EDUCATION').trim();

  if (!username || !password) {
    return { success: false, error: 'Email not configured (SMTP credentials missing)' };
  }

  const to = normalizeEmail(email);
  if (!isValidEmail(to)) {
    return { success: false, error: `Invalid email: ${email}` };
  }

  const { text, html } = buildEmailContent(code, firstName, lastName);

  try {
    await sendViaSmtp({
      host,
      port,
      username,
      password,
      fromName,
      fromEmail,
      to,
      subject: SUBJECT,
      text,
      html,
    });
    console.log('[Email] SMTP sent to', to);
    return { success: true, recipient: to };
  } catch (err) {
    console.error('[Email] SMTP failed', err);
    return { success: false, error: err.message || 'Email send failed' };
  }
}
