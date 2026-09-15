import { t } from '../i18n/index.js';

function link(file, isSubpage) {
  if (file === 'index.html') return isSubpage ? '../index.html' : 'index.html';
  return isSubpage ? file : `pages/${file}`;
}

const FOOTER_NAV = [
  { key: 'nav.home', file: 'index.html' },
  { key: 'nav.aria', file: 'aria.html' },
  { key: 'nav.checkWork', file: 'check-work.html' },
  { key: 'nav.library', file: 'library.html' },
  { key: 'nav.dictionaries', file: 'dictionaries.html' },
  { key: 'nav.tests', file: 'tests.html' },
];

export function renderFooter(isSubpage = false) {
  const navLinks = FOOTER_NAV.map(({ key, file }) =>
    `<li><a href="${link(file, isSubpage)}" class="footer__nav-link" data-i18n="${key}">${t(key)}</a></li>`
  ).join('');

  return `
    <footer class="footer" role="contentinfo">
      <div class="footer__inner">
        <div class="footer__top">
          <div class="footer__brand">
            <div class="footer__brand-name">${t('brand.name')}</div>
            <p class="footer__brand-desc" data-i18n="footer.taglineDesc">${t('footer.taglineDesc')}</p>
          </div>
          <div class="footer__col">
            <div class="footer__nav-title" data-i18n="footer.navigation">${t('footer.navigation')}</div>
            <ul class="footer__nav-list">${navLinks}</ul>
          </div>
          <div class="footer__col footer__contact">
            <div class="footer__nav-title" data-i18n="footer.contactTitle">${t('footer.contactTitle')}</div>
            <a href="mailto:Jeren666@bk.ru" class="footer__email">Jeren666@bk.ru</a>
            <p class="footer__contact-note" data-i18n="footer.contactNote">${t('footer.contactNote')}</p>
          </div>
        </div>
        <div class="footer__bottom">
          <p class="footer__copyright" data-i18n="footer.copyright">${t('footer.copyright')}</p>
        </div>
      </div>
    </footer>
  `;
}
