/**
 * Safe RTF → document model parser (cp1251 + unicode)
 * Strips objects, links, OLE, scripts
 */

const SKIP_GROUP_KEYWORDS = new Set([
  'fonttbl', 'colortbl', 'stylesheet', 'filetbl', 'listtable', 'listoverridetable',
  'listtext', 'leveltext', 'levelnumbers', 'revisiontbl', 'generator',
  'info', 'pict', 'object', 'objdata', 'objclass', 'objupdate', 'header', 'footer',
  'footnote', 'headerf', 'footerf', 'field', 'fldinst', 'fldrslt', 'datafield',
  'nonshppict', 'shpinst', 'xmlns', 'mmath', 'mmathP', 'rsidtbl', 'xmlnstbl',
]);

function decodeCp1251Hex(hex) {
  const code = parseInt(hex, 16);
  if (Number.isNaN(code)) return '';
  try {
    return new TextDecoder('windows-1251').decode(new Uint8Array([code]));
  } catch {
    return '';
  }
}

function removeIgnoredGroups(src) {
  let out = '';
  let i = 0;
  while (i < src.length) {
    if (src[i] === '{') {
      const end = findGroupEnd(src, i);
      const inner = src.slice(i + 1, end);
      const kwMatch = inner.match(/^\\([A-Za-z]+)/);
      const kw = kwMatch ? kwMatch[1].toLowerCase() : '';
      if (kw && SKIP_GROUP_KEYWORDS.has(kw)) {
        i = end + 1;
        continue;
      }
      out += '{' + removeIgnoredGroups(inner) + '}';
      i = end + 1;
      continue;
    }
    out += src[i];
    i += 1;
  }
  return out;
}

function findGroupEnd(src, start) {
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    if (src[i] === '{') depth++;
    if (src[i] === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return src.length - 1;
}

function decodeRtfText(src) {
  let out = '';
  let i = 0;
  let bold = false;
  let pendingSize = null;

  while (i < src.length) {
    const ch = src[i];
    if (ch === '\\') {
      const cmdMatch = src.slice(i).match(/^\\([a-zA-Z]+)(-?\d+)?\s?/);
      if (cmdMatch) {
        const cmd = cmdMatch[1];
        const arg = cmdMatch[2] || '';
        i += cmdMatch[0].length;

        if (cmd === 'par' || cmd === 'line') out += '\n\n';
        else if (cmd === 'tab') out += '\t';
        else if (cmd === 'bullet') out += '• ';
        else if (cmd === 'emdash') out += '—';
        else if (cmd === 'endash') out += '–';
        else if (cmd === 'lquote') out += '«';
        else if (cmd === 'rquote') out += '»';
        else if (cmd === 'u' && arg) {
          let cp = parseInt(arg, 10);
          if (cp < 0) cp += 65536;
          out += String.fromCodePoint(cp);
          if (src[i] === '?') i++;
        } else if (cmd === 'b') bold = arg !== '0';
        else if (cmd === 'fs') pendingSize = parseInt(arg, 10) || pendingSize;
        continue;
      }

      const hexMatch = src.slice(i).match(/^\\'([0-9a-fA-F]{2})/);
      if (hexMatch) {
        out += decodeCp1251Hex(hexMatch[1]);
        i += hexMatch[0].length;
        continue;
      }

      if (src[i] === '\\') { out += '\\'; i++; continue; }
      if (src[i] === '{' || src[i] === '}') { out += src[i]; i++; continue; }
      i++;
      continue;
    }

    if (ch === '{' || ch === '}') { i++; continue; }
    out += ch;
    i++;
  }

  return out;
}

function cleanPlainText(text) {
  return text
    .replace(/\\[*]?[a-zA-Z]+\d*\s?/g, ' ')
    .replace(/\\\*+/g, '')
    .replace(/[{}]/g, '')
    .replace(/©[^\n]*/g, '')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeBlock(text) {
  return text
    .replace(/(?<=[а-яёa-z0-9])\n(?=[а-яёa-z0-9])/gi, '')
    .replace(/^[\s\\*().]+|[\s\\*().]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isReadableBlock(text) {
  const t = normalizeBlock(text);
  if (!t || t.length < 8) return false;
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(t)) return false;
  const letters = t.match(/[A-Za-zА-Яа-яЁё0-9]/g) || [];
  return letters.length >= Math.min(10, t.length * 0.3);
}

function buildSections(plain) {
  const sections = [];
  const blocks = cleanPlainText(plain)
    .split(/\n{2,}/)
    .map(normalizeBlock)
    .filter(isReadableBlock);

  blocks.forEach((block) => {
    const isHeading = block.length <= 80 &&
      !/[.!?;:]$/.test(block) &&
      (/^[А-ЯA-ZЁ][А-ЯA-ZЁa-zа-яё\s\-–—]{0,75}$/.test(block) || block === block.toUpperCase());
    if (isHeading) {
      sections.push({ type: 'heading', level: block.length < 45 ? 1 : 2, text: block });
    } else {
      sections.push({ type: 'paragraph', text: block });
    }
  });

  sections.forEach((section, index) => {
    if (section.type === 'heading') section.id = `je-sec-${index}`;
  });

  return sections;
}

export function parseRtfToDocument(buffer) {
  const raw = new TextDecoder('latin1').decode(buffer);
  const cleaned = removeIgnoredGroups(raw);
  const plain = decodeRtfText(cleaned)
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const sections = buildSections(plain);
  const toc = sections
    .map((s, idx) => (s.type === 'heading' ? { id: s.id || `je-sec-${idx}`, text: s.text, level: s.level } : null))
    .filter(Boolean);

  return { sections, toc };
}
