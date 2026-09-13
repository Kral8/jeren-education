import { t } from '../i18n/index.js';

function link(file, isSubpage) {
  if (file === 'index.html') return isSubpage ? '../index.html' : 'index.html';
  return isSubpage ? file : `pages/${file}`;
}

export function renderFooter(isSubpage = false) {
  return `
    <footer class="footer" role="contentinfo">
      <div class="footer__inner">
        <div class="footer__top">
          <div class="footer__brand">
            <div class="footer__brand-name">${t('brand.name')}</div>
            <p class="footer__brand-desc" data-i18n="hero.description">${t('hero.description')}</p>
            <p class="footer__creator"><span data-i18n="brand.creatorLabel">${t('brand.creatorLabel')}</span></p>
          </div>
          <div>
            <div class="footer__nav-title" data-i18n="footer.platform">${t('footer.platform')}</div>
            <ul class="footer__nav-list">
              <li><a href="${link('about.html', isSubpage)}" class="footer__nav-link" data-i18n="nav.about">${t('nav.about')}</a></li>
              <li><a href="${link('teachers.html', isSubpage)}" class="footer__nav-link" data-i18n="nav.teachers">${t('nav.teachers')}</a></li>
              <li><a href="${link('library.html', isSubpage)}" class="footer__nav-link" data-i18n="nav.library">${t('nav.library')}</a></li>
            </ul>
          </div>
          <div>
            <div class="footer__nav-title" data-i18n="footer.resources">${t('footer.resources')}</div>
            <ul class="footer__nav-list">
              <li><a href="${link('dictionaries.html', isSubpage)}" class="footer__nav-link" data-i18n="nav.dictionaries">${t('nav.dictionaries')}</a></li>
              <li><a href="${link('tests.html', isSubpage)}" class="footer__nav-link" data-i18n="nav.tests">${t('nav.tests')}</a></li>
              <li><a href="${link('aria.html', isSubpage)}" class="footer__nav-link" data-i18n="nav.aria">${t('nav.aria')}</a></li>
            </ul>
          </div>
        </div>
        <div class="footer__bottom">
          <p class="footer__copyright" data-i18n="footer.copyright">${t('footer.copyright')}</p>
          <p class="footer__tagline" data-i18n="footer.tagline">${t('footer.tagline')}</p>
        </div>
      </div>
    </footer>
  `;
}
