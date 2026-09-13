import { getCurrentLang, setLanguage } from '../i18n/index.js';

export function initLanguageSwitcher() {
  document.querySelectorAll('.lang-switcher').forEach((switcher) => {
    const buttons = switcher.querySelectorAll('.lang-switcher__btn');
    updateActiveState(buttons);

    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const lang = btn.dataset.lang;
        if (lang && lang !== getCurrentLang()) {
          setLanguage(lang);
          updateActiveState(buttons);
        }
      });
    });
  });

  window.addEventListener('langchange', () => {
    document.querySelectorAll('.lang-switcher__btn').forEach((btn) => {
      btn.classList.toggle('lang-switcher__btn--active', btn.dataset.lang === getCurrentLang());
    });
  });
}

function updateActiveState(buttons) {
  const lang = getCurrentLang();
  buttons.forEach((btn) => {
    btn.classList.toggle('lang-switcher__btn--active', btn.dataset.lang === lang);
    btn.setAttribute('aria-pressed', btn.dataset.lang === lang ? 'true' : 'false');
  });
}

export function renderLanguageSwitcher() {
  const lang = getCurrentLang();
  return `
    <div class="lang-switcher" role="group" aria-label="Language">
      <button class="lang-switcher__btn ${lang === 'ru' ? 'lang-switcher__btn--active' : ''}"
              data-lang="ru" aria-pressed="${lang === 'ru'}">RU</button>
      <button class="lang-switcher__btn ${lang === 'tm' ? 'lang-switcher__btn--active' : ''}"
              data-lang="tm" aria-pressed="${lang === 'tm'}">TM</button>
    </div>
  `;
}
