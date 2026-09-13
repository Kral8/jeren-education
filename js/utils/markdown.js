/**
 * Safe Markdown → DOM (no innerHTML, no eval)
 * Supports: headings, lists, bold, italic, code, blockquote, fenced code, tables, paragraphs
 */

function appendInline(parent, text) {
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      parent.appendChild(document.createTextNode(text.slice(last, match.index)));
    }
    const token = match[0];
    if (token.startsWith('**')) {
      const strong = document.createElement('strong');
      strong.textContent = token.slice(2, -2);
      parent.appendChild(strong);
    } else if (token.startsWith('*')) {
      const em = document.createElement('em');
      em.textContent = token.slice(1, -1);
      parent.appendChild(em);
    } else if (token.startsWith('`')) {
      const code = document.createElement('code');
      code.className = 'md-code-inline';
      code.textContent = token.slice(1, -1);
      parent.appendChild(code);
    }
    last = match.index + token.length;
  }

  if (last < text.length) {
    parent.appendChild(document.createTextNode(text.slice(last)));
  }
}

function flushList(listEl, listType, container) {
  if (!listEl) return null;
  container.appendChild(listEl);
  return null;
}

function isTableRow(line) {
  const trimmed = line.trim();
  return trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.includes('|');
}

function isTableSeparator(line) {
  return /^\|[\s\-:|]+\|$/.test(line.trim());
}

function parseTableRow(line) {
  return line.trim().slice(1, -1).split('|').map((cell) => cell.trim());
}

function renderTable(rows, container) {
  if (rows.length < 1) return;
  const wrapper = document.createElement('div');
  wrapper.className = 'md-table-wrapper';
  const table = document.createElement('table');
  table.className = 'md-table';
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  parseTableRow(rows[0]).forEach((cell) => {
    const th = document.createElement('th');
    appendInline(th, cell);
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  rows.slice(1).forEach((rowLine) => {
    const tr = document.createElement('tr');
    parseTableRow(rowLine).forEach((cell) => {
      const td = document.createElement('td');
      appendInline(td, cell);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  wrapper.appendChild(table);
  container.appendChild(wrapper);
}

export function renderMarkdown(text, container) {
  container.replaceChildren();
  const lines = String(text || '').split('\n');
  let listEl = null;
  let listType = null;
  let inCode = false;
  let codeLines = [];
  let tableRows = [];

  function flushTable() {
    if (tableRows.length > 0) {
      const dataRows = tableRows.filter((r) => !isTableSeparator(r));
      if (dataRows.length > 0) renderTable(dataRows, container);
      tableRows = [];
    }
  }

  lines.forEach((rawLine) => {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (inCode) {
      if (trimmed.startsWith('```')) {
        inCode = false;
        const pre = document.createElement('pre');
        pre.className = 'md-pre';
        const code = document.createElement('code');
        code.textContent = codeLines.join('\n');
        pre.appendChild(code);
        container.appendChild(pre);
        codeLines = [];
      } else {
        codeLines.push(line);
      }
      return;
    }

    if (trimmed.startsWith('```')) {
      listEl = flushList(listEl, listType, container);
      listType = null;
      flushTable();
      inCode = true;
      codeLines = [];
      return;
    }

    if (isTableRow(trimmed)) {
      listEl = flushList(listEl, listType, container);
      listType = null;
      tableRows.push(trimmed);
      return;
    }

    if (tableRows.length > 0) {
      flushTable();
    }

    if (!trimmed) {
      listEl = flushList(listEl, listType, container);
      listType = null;
      return;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      listEl = flushList(listEl, listType, container);
      listType = null;
      const level = Math.min(heading[1].length + 2, 4);
      const h = document.createElement(`h${level}`);
      h.className = 'md-heading';
      appendInline(h, heading[2]);
      container.appendChild(h);
      return;
    }

    if (trimmed.startsWith('> ')) {
      listEl = flushList(listEl, listType, container);
      listType = null;
      const bq = document.createElement('blockquote');
      bq.className = 'md-blockquote';
      appendInline(bq, trimmed.slice(2));
      container.appendChild(bq);
      return;
    }

    const ul = trimmed.match(/^[-*•]\s+(.+)$/);
    if (ul) {
      if (listType !== 'ul') {
        listEl = flushList(listEl, listType, container);
        listEl = document.createElement('ul');
        listEl.className = 'md-list';
        listType = 'ul';
      }
      const li = document.createElement('li');
      appendInline(li, ul[1]);
      listEl.appendChild(li);
      return;
    }

    const ol = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (ol) {
      if (listType !== 'ol') {
        listEl = flushList(listEl, listType, container);
        listEl = document.createElement('ol');
        listEl.className = 'md-list md-list--ol';
        listType = 'ol';
      }
      const li = document.createElement('li');
      appendInline(li, ol[1]);
      listEl.appendChild(li);
      return;
    }

    listEl = flushList(listEl, listType, container);
    listType = null;
    const p = document.createElement('p');
    p.className = 'md-paragraph';
    appendInline(p, trimmed);
    container.appendChild(p);
  });

  if (inCode && codeLines.length) {
    const pre = document.createElement('pre');
    pre.className = 'md-pre';
    const code = document.createElement('code');
    code.textContent = codeLines.join('\n');
    pre.appendChild(code);
    container.appendChild(pre);
  }

  flushTable();
  flushList(listEl, listType, container);
}
