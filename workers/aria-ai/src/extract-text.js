import { unzipSync } from 'fflate';

function parseWordXml(xml) {
  const parts = [];
  const re = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
  let match = re.exec(xml);
  while (match) {
    parts.push(
      match[1]
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"'),
    );
    match = re.exec(xml);
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

function parseRtf(raw) {
  return raw
    .replace(/\\par[d]?/g, '\n')
    .replace(/\\'[0-9a-f]{2}/gi, ' ')
    .replace(/\\[a-z]+\d*(?:\s)?/gi, '')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function extractTextFromFile(base64, mimeType) {
  if (!base64) return '';

  try {
    if (mimeType === 'text/plain') {
      return new TextDecoder('utf-8').decode(base64ToBytes(base64)).trim();
    }

    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const files = unzipSync(base64ToBytes(base64));
      const entry = files['word/document.xml'];
      if (!entry) return '';
      const xml = new TextDecoder('utf-8').decode(entry);
      return parseWordXml(xml);
    }

    if (mimeType === 'application/rtf' || mimeType === 'text/rtf') {
      return parseRtf(new TextDecoder('utf-8').decode(base64ToBytes(base64)));
    }
  } catch (err) {
    console.error('extractTextFromFile', err?.message?.slice(0, 200));
  }

  return '';
}
