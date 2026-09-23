const TEXTBEE_URL = 'https://api.textbee.dev/api/v1/gateway/send-sms';

export function normalizePhoneE164(phone) {
  const raw = String(phone || '').trim();
  if (!raw) return null;

  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  if (raw.startsWith('+')) {
    return digits.length >= 11 ? `+${digits}` : null;
  }

  if (digits.startsWith('993') && digits.length === 11) {
    return `+${digits}`;
  }

  if (digits.startsWith('8') && digits.length === 11) {
    return `+7${digits.slice(1)}`;
  }

  if (digits.startsWith('7') && digits.length === 11) {
    return `+${digits}`;
  }

  if (digits.length === 8) {
    return `+993${digits}`;
  }

  return digits.length >= 11 ? `+${digits}` : null;
}

function parseTextBeeResult(httpOk, payload) {
  if (!httpOk) {
    const msg = payload?.message || payload?.error || payload?.data?.message || `HTTP error`;
    return { success: false, error: String(msg) };
  }

  const data = payload?.data;
  if (!data) {
    return { success: false, error: 'Empty TextBee response' };
  }

  if (data.success === false) {
    return { success: false, error: data.message || 'SMS batch rejected' };
  }

  const pushed = Number(data.successCount || 0);
  const failed = Number(data.failureCount || 0);
  const queued = Boolean(data.smsBatchId);

  if (failed > 0 && pushed === 0 && !queued) {
    return { success: false, error: data.message || 'SMS could not reach the device' };
  }

  if (data.success === true || pushed > 0 || queued) {
    return {
      success: true,
      smsBatchId: data.smsBatchId || null,
      message: data.message || null,
      successCount: pushed,
      failureCount: failed,
    };
  }

  return { success: false, error: data.message || 'SMS was not accepted' };
}

async function postSms(apiKey, { recipients, message, deviceId }) {
  const body = { recipients, message };
  if (deviceId) body.deviceId = deviceId;

  const response = await fetch(TEXTBEE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  const parsed = parseTextBeeResult(response.ok, payload);

  return {
    ...parsed,
    httpStatus: response.status,
    raw: payload,
  };
}

export async function sendAccessCodeSms(env, phone, code, firstName) {
  const apiKey = String(env.TEXTBEE_API_KEY || '').trim();
  if (!apiKey) {
    return { success: false, error: 'SMS not configured (TEXTBEE_API_KEY missing)' };
  }

  const recipient = normalizePhoneE164(phone);
  if (!recipient) {
    return { success: false, error: `Invalid phone number: ${phone}` };
  }

  const name = String(firstName || '').trim();
  const greeting = name ? `${name}, ` : '';
  const message = `JEREN EDUCATION. ${greeting}kod dostupa: ${code}. Vvedite na stranice vhoda.`;

  const deviceId = String(env.TEXTBEE_DEVICE_ID || '').trim() || null;

  let result = await postSms(apiKey, {
    recipients: [recipient],
    message,
    deviceId,
  });

  if (!result.success && deviceId) {
    console.warn('[TextBee] retry without deviceId', result.error);
    result = await postSms(apiKey, {
      recipients: [recipient],
      message,
      deviceId: null,
    });
  }

  if (!result.success) {
    console.error('[TextBee] send failed', result.httpStatus, result.error, JSON.stringify(result.raw || {}));
    return { success: false, error: result.error, recipient, httpStatus: result.httpStatus };
  }

  console.log('[TextBee] send accepted', recipient, result.smsBatchId || result.successCount);
  return {
    success: true,
    recipient,
    smsBatchId: result.smsBatchId,
    deliveryNote: result.message,
  };
}

export function maskPhone(phone) {
  const e164 = normalizePhoneE164(phone);
  if (!e164) return phone;
  const digits = e164.replace(/\D/g, '');
  if (digits.length < 6) return e164;
  return `${e164.slice(0, 4)} *** ** ${digits.slice(-2)}`;
}
