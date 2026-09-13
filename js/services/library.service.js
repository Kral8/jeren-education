/**
 * Library Service — JEREN EDUCATION
 * Catalog, search, filtering, book access
 */

import { getItem, setItem } from '../utils/storage.js';

let indexCache = null;

export function normalizeQuery(query) {
  return query.trim().toLowerCase().replace(/ё/g, 'е');
}

export async function loadIndex(basePath = '') {
  const key = basePath;
  if (indexCache?.key === key) return indexCache.data;

  const response = await fetch(`${basePath}data/library/index.json`);
  if (!response.ok) throw new Error('Failed to load library index');
  const data = await response.json();
  indexCache = { key, data };
  return data;
}

export async function getBookById(id, basePath = '') {
  if (!id || !/^[a-z0-9-]+$/.test(id)) return null;
  const index = await loadIndex(basePath);
  return index.books.find((b) => b.id === id) || null;
}

export async function searchBooks(query = '', format = 'all', basePath = '') {
  const index = await loadIndex(basePath);
  const q = normalizeQuery(query);

  return index.books.filter((book) => {
    const matchFormat = format === 'all' || book.format === format;
    if (!matchFormat) return false;
    if (!q) return true;

    const haystack = [book.title, book.author, book.description]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .replace(/ё/g, 'е');

    return haystack.includes(q);
  });
}

export function getBookFileUrl(book, basePath = '') {
  if (!book?.path || book.path.includes('..') || book.path.startsWith('/')) return null;
  return `${basePath}data/library/${book.path}`;
}

export function isViewableInBrowser(book) {
  return Boolean(book?.viewableInBrowser);
}

export function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getAvailableFormats(index) {
  const formats = new Set(index.books.map((b) => b.format));
  return ['all', ...Array.from(formats).sort()];
}

export function getFavorites() {
  return getItem('library_favorites', []);
}

export function toggleFavorite(id) {
  const favs = getFavorites();
  const idx = favs.indexOf(id);
  if (idx >= 0) favs.splice(idx, 1);
  else favs.push(id);
  setItem('library_favorites', favs);
  return favs.includes(id);
}

export function isFavorite(id) {
  return getFavorites().includes(id);
}

export function clearLibraryCache() {
  indexCache = null;
}
