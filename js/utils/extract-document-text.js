let unzipSyncFn = null;

async function getUnzip() {
  if (!unzipSyncFn) {
    const mod = await import('https://esm.sh/fflate@0.8.2');
    unzipSyncFn = mod.unzipSync;
  }
  return unzipSyncFn;
}

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

async function extractDocxText(arrayBuffer) {
  const unzipSync = await getUnzip();
  const files = unzipSync(new Uint8Array(arrayBuffer));
  const entry = files['word/document.xml'];
  if (!entry) throw new Error('docx_no_document');
  const xml = new TextDecoder('utf-8').decode(entry);
  const text = parseWordXml(xml);
  if (!text) throw new Error('docx_empty');
  return text;
}

async function readAsArrayBuffer(file) {
  return file.arrayBuffer();
}

async function readAsText(file) {
  return file.text();
}

export async function extractDocumentText(file, mime) {
  if (!file) return '';

  try {
    if (mime === 'text/plain') {
      return (await readAsText(file)).trim();
    }

    if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return await extractDocxText(await readAsArrayBuffer(file));
    }

    if (mime === 'application/rtf' || mime === 'text/rtf') {
      return parseRtf(await readAsText(file));
    }
  } catch (error) {
    console.warn('[ExtractText]', error?.message || error);
  }

  return '';
}
