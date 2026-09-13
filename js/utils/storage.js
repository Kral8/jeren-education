/**
 * Local storage utilities for JEREN EDUCATION
 */

const STORAGE_PREFIX = 'jeren_';

export function getItem(key, fallback = null) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function setItem(key, value) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeItem(key) {
  localStorage.removeItem(STORAGE_PREFIX + key);
}

export function getLang() {
  return getItem('lang', 'ru');
}

export function setLang(lang) {
  setItem('lang', lang);
}
