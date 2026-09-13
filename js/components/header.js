import { t } from '../i18n/index.js';
import { renderLanguageSwitcher } from './language-switcher.js';

const NAV_ITEMS = [
  { key: 'nav.home', file: 'index.html', page: 'home' },
  { key: 'nav.library', file: 'library.html', page: 'library' },
  { key: 'nav.dictionaries', file: 'dictionaries.html', page: 'dictionaries' },
  { key: 'nav.tests', file: 'tests.html', page: 'tests' },
  { key: 'nav.stress', file: 'stress.html', page: 'stress' },
  { key: 'nav.coursework', file: 'coursework.html', page: 'coursework' },
  { key: 'nav.aria', file: 'aria.html', page: 'aria' },
  { key: 'nav.materials', file: 'materials.html', page: 'materials' },
  { key: 'nav.teachers', file: 'teachers.html', page: 'teachers' },
  { key: 'nav.about', file: 'about.html', page: 'about' },
];

function resolveHref(file, isSubpage) {
  if (file === 'index.html') return isSubpage ? '../index.html' : 'index.html';
  return isSubpage ? file : `pages/${file}`;
}

export function renderHeader(isSubpage = false, activePage = '') {
  const navLinks = NAV_ITEMS.map(({ key, file, page }) => {
    const url = resolveHref(file, isSubpage);
    const isActive = page === activePage;
    return `<a href="${url}" class="header__nav-link${isActive ? ' header__nav-link--active' : ''}"
               ${isActive ? 'aria-current="page"' : ''} data-i18n="${key}">${t(key)}</a>`;
  }).join('');

  const mobileLinks = NAV_ITEMS.map(({ key, file, page }) => {
    const url = resolveHref(file, isSubpage);
    const isActive = page === activePage;
    return `<a href="${url}" class="mobile-nav__link${isActive ? ' mobile-nav__link--active' : ''}"
               ${isActive ? 'aria-current="page"' : ''} data-i18n="${key}">${t(key)}</a>`;
  }).join('');

  const homeUrl = resolveHref('index.html', isSubpage);
  const loginUrl = isSubpage ? 'login.html' : 'pages/login.html';

  return `
    <header class="header" role="banner">
      <div class="header__inner">
        <a href="${homeUrl}" class="header__logo" aria-label="${t('brand.name')}">
          <span class="header__logo-name">${t('brand.name')}</span>
          <span class="header__logo-tagline">${t('brand.tagline')}</span>
        </a>
        <nav class="header__nav" aria-label="Main navigation">${navLinks}</nav>
        <div class="header__actions">
          ${renderLanguageSwitcher()}
          <a href="${loginUrl}" class="btn btn--secondary btn--sm header__login" data-i18n="nav.login">${t('nav.login')}</a>
          <button class="header__menu-toggle" aria-label="Menu" aria-expanded="false" aria-controls="mobile-nav">
            <span class="header__menu-toggle-line"></span>
            <span class="header__menu-toggle-line"></span>
            <span class="header__menu-toggle-line"></span>
          </button>
        </div>
      </div>
    </header>
    <div class="mobile-nav" id="mobile-nav" aria-hidden="true">
      <div class="mobile-nav__backdrop"></div>
      <nav class="mobile-nav__panel" aria-label="Mobile navigation">
        ${mobileLinks}
        <hr class="mobile-nav__divider">
        <div class="mobile-nav__footer">
          <a href="${loginUrl}" class="btn btn--primary btn--full" data-i18n="nav.login">${t('nav.login')}</a>
        </div>
      </nav>
    </div>
  `;
}

export function initMobileNav() {
  const toggle = document.querySelector('.header__menu-toggle');
  const mobileNav = document.querySelector('.mobile-nav');
  const backdrop = document.querySelector('.mobile-nav__backdrop');
  if (!toggle || !mobileNav) return;

  function closeMenu() {
    toggle.setAttribute('aria-expanded', 'false');
    mobileNav.classList.remove('mobile-nav--open');
    mobileNav.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function openMenu() {
    toggle.setAttribute('aria-expanded', 'true');
    mobileNav.classList.add('mobile-nav--open');
    mobileNav.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  toggle.addEventListener('click', () => {
    toggle.getAttribute('aria-expanded') === 'true' ? closeMenu() : openMenu();
  });

  backdrop?.addEventListener('click', closeMenu);
  mobileNav.querySelectorAll('.mobile-nav__link').forEach((link) => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
}
