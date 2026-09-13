import ru from './ru.js';
import tm from './tm.js';
import { getLang, setLang } from '../utils/storage.js';

const locales = { ru, tm };
let currentLang = getLang();
let currentLocale = locales[currentLang] || ru;

function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

export function t(key, fallback = '') {
  return getNestedValue(currentLocale, key) ?? getNestedValue(ru, key) ?? fallback;
}

export function getCurrentLang() {
  return currentLang;
}

export function setLanguage(lang) {
  if (!locales[lang]) return;
  currentLang = lang;
  currentLocale = locales[lang];
  setLang(lang);
  document.documentElement.lang = lang === 'tm' ? 'tk' : 'ru';
  applyTranslations();
  window.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const value = t(key);
    if (value) el.textContent = value;
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    const value = t(key);
    if (value) el.placeholder = value;
  });

  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    const value = t(key);
    if (value) el.title = value;
  });

  document.querySelectorAll('[data-i18n-html]').forEach((el) => {
    const key = el.getAttribute('data-i18n-html');
    const value = t(key);
    if (value) el.innerHTML = value;
  });
}

export function initI18n() {
  document.documentElement.lang = currentLang === 'tm' ? 'tk' : 'ru';
  applyTranslations();
}
