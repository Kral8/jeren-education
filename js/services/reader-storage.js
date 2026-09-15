import { getItem, setItem } from '../utils/storage.js';

export const FONT_SIZES = [16, 18, 20, 24, 28];

export function getFontSizeIndex() {
  return getItem('reader_font_size_idx', 1);
}

export function setFontSizeIndex(idx) {
  const clamped = Math.max(0, Math.min(FONT_SIZES.length - 1, idx));
  setItem('reader_font_size_idx', clamped);
  return clamped;
}

export function getFontSizePx(index = getFontSizeIndex()) {
  return FONT_SIZES[index] ?? FONT_SIZES[1];
}

export function getProgress(bookId) {
  return getItem(`reader_progress_${bookId}`, 0);
}

export function saveProgress(bookId, ratio) {
  setItem(`reader_progress_${bookId}`, Math.max(0, Math.min(1, ratio)));
}

export function getLastBookId() {
  return getItem('reader_last_book', null);
}

export function setLastBookId(bookId) {
  setItem('reader_last_book', bookId);
}
