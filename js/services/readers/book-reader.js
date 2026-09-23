/**
 * BookReader — format dispatcher
 * User never sees format; system picks renderer
 */

import { getBookById, getBookFileUrl } from '../library.service.js';
import { parseRtfToDocument } from './rtf-parser.js';
import { renderDocument, renderToc, renderHtmlDocument } from './document-renderer.js';

async function loadPreconvertedContent(bookId, basePath) {
  const response = await fetch(`${basePath}data/library/content/${bookId}.json`);
  if (!response.ok) return null;
  return response.json();
}

async function loadRtfDocument(book, basePath) {
  const url = getBookFileUrl(book, basePath);
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to load book');
  const buffer = await response.arrayBuffer();
  return parseRtfToDocument(buffer);
}

async function loadPdfDocument(book, basePath) {
  return {
    type: 'pdf',
    url: getBookFileUrl(book, basePath),
  };
}

export async function loadBookDocument(bookId, basePath) {
  const book = await getBookById(bookId, basePath);
  if (!book) throw new Error('Book not found');

  const pre = await loadPreconvertedContent(book.id, basePath);
  if (pre?.html) {
    return { book, mode: 'html', html: pre.html, toc: pre.toc || [] };
  }
  if (pre?.sections?.length) {
    return { book, mode: 'document', ...pre, toc: buildTocFromSections(pre.sections) };
  }

  if (book.format === 'rtf') {
    const doc = await loadRtfDocument(book, basePath);
    return { book, mode: 'document', ...doc };
  }

  if (book.format === 'pdf') {
    return { book, mode: 'pdf', ...(await loadPdfDocument(book, basePath)) };
  }

  if (book.format === 'txt') {
    const url = getBookFileUrl(book, basePath);
    const response = await fetch(url);
    const text = await response.text();
    const sections = text.split(/\n{2,}/).filter(Boolean).map((t) => ({ type: 'paragraph', text: t.trim() }));
    return { book, mode: 'document', sections, toc: buildTocFromSections(sections) };
  }

  return { book, mode: 'unsupported' };
}

function buildTocFromSections(sections) {
  return sections
    .map((s, idx) => (s.type === 'heading' ? { id: `je-sec-${idx}`, text: s.text, level: s.level || 2 } : null))
    .filter(Boolean);
}

export function mountReader(documentModel, elements) {
  const { contentEl, tocEl, scrollEl } = elements;

  if (documentModel.mode === 'pdf') {
    contentEl.replaceChildren();
    const frame = document.createElement('iframe');
    frame.className = 'je-reader__pdf';
    frame.src = documentModel.url;
    frame.title = documentModel.book.title;
    contentEl.appendChild(frame);
    if (tocEl) tocEl.hidden = true;
    return;
  }

  if (documentModel.mode === 'html') {
    renderHtmlDocument(documentModel.html, contentEl);
    if (tocEl && scrollEl && documentModel.toc?.length >= 3) {
      renderToc(documentModel.toc, tocEl, scrollEl);
    } else if (tocEl) {
      tocEl.hidden = true;
    }
    return;
  }

  if (documentModel.mode === 'unsupported') {
    contentEl.replaceChildren();
    const msg = document.createElement('p');
    msg.className = 'je-reader__message';
    msg.textContent = 'Эта книга скоро будет доступна для чтения в JEREN EDUCATION Reader.';
    contentEl.appendChild(msg);
    if (tocEl) tocEl.hidden = true;
    return;
  }

  renderDocument(documentModel.sections, contentEl);
  if (tocEl && scrollEl && documentModel.toc?.length >= 3) {
    renderToc(documentModel.toc, tocEl, scrollEl);
  } else if (tocEl) {
    tocEl.hidden = true;
  }
}
