import { t } from '../i18n/index.js';
import { renderLanguageSwitcher } from './language-switcher.js';
import { getUser, getRole, isAuthenticated } from '../services/auth.service.js';

const NAV_PUBLIC = [
  { key: 'nav.home', file: 'index.html', page: 'home' },
  { key: 'nav.aria', file: 'aria.html', page: 'aria' },
  { key: 'nav.checkWork', file: 'check-work.html', page: 'check-work' },
  { key: 'nav.library', file: 'library.html', page: 'library' },
  { key: 'nav.dictionaries', file: 'dictionaries.html', page: 'dictionaries' },
];

const NAV_EXTRA = [
  { key: 'nav.dashboard', file: 'dashboard.html', page: 'dashboard' },
  { key: 'nav.adminTeachers', file: 'admin.html', page: 'admin', roles: ['admin'] },
];

function resolveHref(file, isSubpage) {
  if (file === 'index.html') return isSubpage ? '../index.html' : 'index.html';
  return isSubpage ? file : `pages/${file}`;
}

function getNavItems() {
  const role = getRole();
  const items = [...NAV_PUBLIC];
  if (isAuthenticated()) {
    NAV_EXTRA.forEach((item) => {
      if (!item.roles || item.roles.includes(role)) items.push(item);
    });
  }
  return items;
}

function renderNavLinks(isSubpage, activePage, className) {
  return getNavItems().map(({ key, file, page }) => {
    const url = resolveHref(file, isSubpage);
    const isActive = page === activePage;
    return `<a href="${url}" class="${className}${isActive ? ` ${className}--active` : ''}"
               ${isActive ? 'aria-current="page"' : ''} data-i18n="${key}">${t(key)}</a>`;
  }).join('');
}

export function renderHeader(isSubpage = false, activePage = '') {
  const homeUrl = resolveHref('index.html', isSubpage);
  const loginUrl = resolveHref('login.html', isSubpage);
  const user = getUser();
  const loginLabel = user?.displayName
    ? user.displayName.split(' ')[0]
    : t('nav.login');

  return `
    <header class="header" role="banner">
      <div class="header__inner">
        <a href="${homeUrl}" class="header__logo" aria-label="${t('brand.name')}">
          <span class="header__logo-name">${t('brand.name')}</span>
          <span class="header__logo-tagline">${t('brand.tagline')}</span>
        </a>
        <nav class="header__nav" aria-label="Main navigation">${renderNavLinks(isSubpage, activePage, 'header__nav-link')}</nav>
        <div class="header__actions">
          ${renderLanguageSwitcher()}
          <a href="${loginUrl}" class="btn btn--secondary btn--sm header__login" data-i18n="nav.login">${loginLabel}</a>
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
        ${renderNavLinks(isSubpage, activePage, 'mobile-nav__link')}
        <hr class="mobile-nav__divider">
        <div class="mobile-nav__footer">
          <a href="${loginUrl}" class="btn btn--primary btn--full">${loginLabel}</a>
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
  mobileNav.querySelectorAll('.mobile-nav__link, .mobile-nav__footer a').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
}
