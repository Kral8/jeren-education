import { initI18n } from './i18n/index.js';
import { renderHeader, initMobileNav } from './components/header.js';
import { renderFooter } from './components/footer.js';
import { initLanguageSwitcher } from './components/language-switcher.js';
import { verifySession } from './services/auth.service.js';

const isSubpage = document.body.dataset.subpage === 'true';
const activePage = document.body.dataset.page || '';

function mountLayout() {
  const headerEl = document.getElementById('site-header');
  const footerEl = document.getElementById('site-footer');
  if (headerEl) headerEl.innerHTML = renderHeader(isSubpage, activePage);
  if (footerEl) footerEl.innerHTML = renderFooter(isSubpage);
  initLanguageSwitcher();
  initMobileNav();
  initI18n();
}

async function initApp() {
  await verifySession();
  mountLayout();
}

initApp();

window.addEventListener('langchange', mountLayout);
window.addEventListener('authchange', mountLayout);
