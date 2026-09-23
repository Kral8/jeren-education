import { t } from '../i18n/index.js';
import { loadBookDocument, mountReader } from '../services/readers/book-reader.js';
import {
  getFontSizeIndex,
  setFontSizeIndex,
  FONT_SIZES,
  setLastBookId,
} from '../services/reader-storage.js';

const basePath = document.body.dataset.base || '../';
const FONT_LABELS = ['89%', '100%', '111%', '133%', '156%'];

function getBookId() {
  const id = new URLSearchParams(window.location.search).get('book');
  if (!id || !/^[a-z0-9-]+$/.test(id)) return null;
  return id;
}

function applyFontSize(index) {
  const clamped = Math.max(0, Math.min(FONT_SIZES.length - 1, index));
  const px = FONT_SIZES[clamped];
  const root = document.getElementById('je-reader');
  if (root) root.style.setProperty('--reader-font-size', `${px}px`);
  const label = document.getElementById('font-value');
  if (label) label.textContent = FONT_LABELS[clamped] || '100%';
}

function updateProgress(scrollEl) {
  const max = scrollEl.scrollHeight - scrollEl.clientHeight;
  const ratio = max > 0 ? scrollEl.scrollTop / max : 0;
  const bar = document.getElementById('reader-progress-bar');
  if (bar) bar.style.width = `${Math.round(ratio * 100)}%`;
}

function blockCopyShortcuts(e) {
  if ((e.ctrlKey || e.metaKey) && ['c', 'x', 'a'].includes(e.key.toLowerCase())) {
    const content = document.getElementById('reader-content');
    if (content?.contains(document.activeElement) || document.getSelection()?.anchorNode) {
      e.preventDefault();
    }
  }
}

async function init() {
  const bookId = getBookId();
  const scrollEl = document.getElementById('reader-scroll');
  const contentEl = document.getElementById('reader-content');
  const tocEl = document.getElementById('reader-toc');
  const titleEl = document.getElementById('reader-title');

  if (!bookId || !scrollEl || !contentEl) return;

  setLastBookId(bookId);
  applyFontSize(getFontSizeIndex());

  document.getElementById('font-decrease')?.addEventListener('click', () => {
    applyFontSize(setFontSizeIndex(getFontSizeIndex() - 1));
  });
  document.getElementById('font-increase')?.addEventListener('click', () => {
    applyFontSize(setFontSizeIndex(getFontSizeIndex() + 1));
  });

  document.getElementById('reader-fullscreen')?.addEventListener('click', () => {
    const root = document.getElementById('je-reader');
    if (!document.fullscreenElement) root?.requestFullscreen?.();
    else document.exitFullscreen?.();
  });

  document.addEventListener('keydown', blockCopyShortcuts);

  scrollEl.addEventListener('scroll', () => {
    updateProgress(scrollEl);
  }, { passive: true });

  try {
    const doc = await loadBookDocument(bookId, basePath);
    if (titleEl) titleEl.textContent = doc.book.title;
    document.title = `${doc.book.title} — JEREN EDUCATION`;

    mountReader(doc, { contentEl, tocEl, scrollEl });
    applyFontSize(getFontSizeIndex());

    requestAnimationFrame(() => updateProgress(scrollEl));
  } catch (err) {
    contentEl.replaceChildren();
    const msg = document.createElement('p');
    msg.className = 'je-reader__message';
    msg.textContent = t('common.error');
    contentEl.appendChild(msg);
    console.error(err);
  }
}

init();
