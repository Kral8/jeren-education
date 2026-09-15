import { t } from '../i18n/index.js';
import {
  loadIndex,
  searchBooks,
  toggleFavorite,
  isFavorite,
} from '../services/library.service.js';

const basePath = document.body.dataset.base || '../';
const DEBOUNCE_MS = 300;
let debounceTimer = null;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function renderPremiumCoverFallback(cover, book) {
  const inner = el('div', 'book-card__cover-inner');
  inner.appendChild(el('div', 'book-card__cover-brand', 'JEREN'));
  inner.appendChild(el('div', 'book-card__cover-brand-sub', 'EDUCATION'));
  inner.appendChild(el('div', 'book-card__cover-title', book.title));
  if (book.author) inner.appendChild(el('div', 'book-card__cover-author', book.author));
  cover.appendChild(inner);
}

function resolveCoverSrc(book) {
  if (book.coverUrl) {
    if (/^https?:\/\//i.test(book.coverUrl)) return book.coverUrl;
    return `${basePath}${book.coverUrl.replace(/^\//, '')}`;
  }
  if (book.cover) return `${basePath}data/library/${book.cover}`;
  return null;
}

function renderPremiumCover(book) {
  const cover = el('div', 'book-card__cover book-card__cover--premium');
  const src = resolveCoverSrc(book);

  if (src) {
    const img = document.createElement('img');
    img.className = 'book-card__cover-img';
    img.src = src;
    img.alt = book.title;
    img.loading = 'lazy';
    img.referrerPolicy = 'no-referrer';
    img.addEventListener('error', () => {
      img.remove();
      renderPremiumCoverFallback(cover, book);
    });
    cover.appendChild(img);
    return cover;
  }

  renderPremiumCoverFallback(cover, book);
  return cover;
}

function renderBookCard(book) {
  const card = el('article', 'book-card card card--interactive');
  card.tabIndex = 0;

  card.appendChild(renderPremiumCover(book));

  const body = el('div', 'book-card__body');
  body.appendChild(el('h3', 'book-card__title', book.title));

  if (book.author) {
    body.appendChild(el('p', 'book-card__author', book.author));
  }

  if (book.description) {
    body.appendChild(el('p', 'book-card__desc', book.description));
  }

  const footer = el('div', 'book-card__footer');
  const readBtn = el('a', 'btn btn--primary btn--full', t('library.readBook'));
  readBtn.href = `reader.html?book=${encodeURIComponent(book.id)}`;
  footer.appendChild(readBtn);

  const favBtn = el('button', 'btn btn--ghost btn--sm fav-btn', isFavorite(book.id) ? '♥' : '♡');
  favBtn.type = 'button';
  favBtn.setAttribute('aria-label', isFavorite(book.id) ? t('library.removeFavorite') : t('library.addFavorite'));
  favBtn.dataset.id = book.id;
  footer.appendChild(favBtn);

  card.appendChild(body);
  card.appendChild(footer);

  card.addEventListener('click', (e) => {
    if (e.target.closest('.fav-btn')) return;
    if (e.target.closest('a')) return;
    readBtn.click();
  });

  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') readBtn.click();
  });

  favBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFavorite(book.id);
    render();
  });

  return card;
}

async function render() {
  const grid = document.getElementById('library-grid');
  const searchInput = document.getElementById('library-search');
  if (!grid) return;

  grid.replaceChildren(el('div', 'empty-state', t('common.loading')));

  try {
    const books = await searchBooks(searchInput?.value || '', 'all', basePath);
    grid.replaceChildren();

    if (!books.length) {
      grid.appendChild(el('div', 'empty-state', t('library.noResults')));
      return;
    }

    books.forEach((book) => grid.appendChild(renderBookCard(book)));
  } catch (err) {
    grid.replaceChildren(el('div', 'empty-state', t('common.error')));
    console.error(err);
  }
}

function scheduleRender() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(render, DEBOUNCE_MS);
}

export async function init() {
  const searchInput = document.getElementById('library-search');
  if (!searchInput) return;

  try {
    await loadIndex(basePath);
  } catch (err) {
    console.error(err);
    document.getElementById('library-grid')?.replaceChildren(el('div', 'empty-state', t('common.error')));
    return;
  }

  searchInput.addEventListener('input', scheduleRender);
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      clearTimeout(debounceTimer);
      render();
    }
  });

  window.addEventListener('langchange', render);
  await render();
}

init();
