import { t } from '../i18n/index.js';
import { searchWord } from '../services/dictionary.service.js';

const basePath = document.body.dataset.base || '../';

export async function init() {
  const input = document.getElementById('dict-search');
  const resultEl = document.getElementById('dict-result');
  if (!input || !resultEl) return;

  async function doSearch() {
    const query = input.value.trim();
    if (!query) { resultEl.innerHTML = ''; return; }

    const entry = await searchWord(query, basePath);
    if (!entry) {
      resultEl.innerHTML = `<div class="empty-state" data-i18n="dictionaries.noResults">${t('dictionaries.noResults')}</div>`;
      return;
    }

    resultEl.innerHTML = `
      <div class="dict-result animate-fade-in-up">
        <div class="dict-result__word">${entry.word}</div>
        <div class="dict-result__row"><span class="dict-result__label">${t('dictionaries.meaning')}</span><span class="dict-result__value">${entry.meaning}</span></div>
        <div class="dict-result__row"><span class="dict-result__label">${t('dictionaries.stress')}</span><span class="dict-result__value">${entry.stress}</span></div>
        <div class="dict-result__row"><span class="dict-result__label">${t('dictionaries.pronunciation')}</span><span class="dict-result__value">${entry.pronunciation}</span></div>
        <div class="dict-result__row"><span class="dict-result__label">${t('dictionaries.pos')}</span><span class="dict-result__value">${entry.pos}</span></div>
        ${entry.examples ? `<div class="dict-result__row"><span class="dict-result__label">${t('dictionaries.examples')}</span><span class="dict-result__value">${entry.examples.join('; ')}</span></div>` : ''}
      </div>`;
  }

  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
  document.getElementById('dict-search-btn')?.addEventListener('click', doSearch);
}

init();
