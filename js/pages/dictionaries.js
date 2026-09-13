import { t } from '../i18n/index.js';
import { loadCatalog, searchDictionary } from '../services/dictionary.service.js';

const basePath = document.body.dataset.base || '../';
const DEBOUNCE_MS = 300;

let catalog = null;
let activeDictionaryId = 'ozhegov';
let debounceTimer = null;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function appendRow(parent, label, value) {
  if (!value) return;
  const row = el('div', 'dict-result__row');
  row.appendChild(el('span', 'dict-result__label', label));
  row.appendChild(el('span', 'dict-result__value', value));
  parent.appendChild(row);
}

function renderOzhegovCard(container, entries) {
  entries.forEach((entry, idx) => {
    const card = el('article', 'dict-result card card--elevated');
    if (idx > 0) card.style.marginTop = 'var(--space-4)';

    const word = el('div', 'dict-result__word', entry.word);
    card.appendChild(word);

    appendRow(card, t('dictionaries.meaning'), entry.meaning);
    appendRow(card, t('dictionaries.grammar'), entry.grammar);
    appendRow(card, t('dictionaries.style'), entry.style);
    appendRow(card, t('dictionaries.pronunciation'), entry.phonetic);
    appendRow(card, t('dictionaries.examples'), entry.examples);
    appendRow(card, t('dictionaries.antonym'), entry.antonym);

    container.appendChild(card);
  });
}

function renderForeignCard(container, entry) {
  const card = el('article', 'dict-result card card--elevated');
  card.appendChild(el('div', 'dict-result__word', entry.word));
  appendRow(card, t('dictionaries.meaning'), entry.meaning);
  container.appendChild(card);
}

function renderPhraseologyCard(container, entry) {
  const card = el('article', 'dict-result card card--elevated');
  card.appendChild(el('div', 'dict-result__word', entry.word));
  appendRow(card, t('dictionaries.meaning'), entry.meaning);
  appendRow(card, t('dictionaries.grammar'), entry.syntax);
  appendRow(card, t('dictionaries.examples'), (entry.examples || []).join('; '));
  if (entry.synonyms?.length) appendRow(card, t('dictionaries.synonyms'), entry.synonyms.join(', '));
  if (entry.antonyms?.length) appendRow(card, t('dictionaries.antonyms'), entry.antonyms.join(', '));
  if (entry.etymology) appendRow(card, t('dictionaries.etymology'), entry.etymology);
  container.appendChild(card);
}

function renderArchiveNotice(container, dictionary) {
  const note = el('div', 'demo-note');
  note.appendChild(el('span', 'badge badge--muted', t('dictionaries.archive')));
  note.appendChild(document.createTextNode(' ' + (dictionary.statusNote || t('dictionaries.archiveNote'))));
  container.appendChild(note);

  const link = el('a', 'btn btn--secondary', t('dictionaries.downloadArchive'));
  link.href = `${basePath}data/dictionaries/${dictionary.data}`;
  link.download = '';
  link.style.marginTop = 'var(--space-4)';
  container.appendChild(link);
}

function renderResults(data) {
  const container = document.getElementById('dict-result');
  container.replaceChildren();

  if (data.archive) {
    renderArchiveNotice(container, data.dictionary);
    return;
  }

  if (!data.results.length) {
    container.appendChild(el('div', 'empty-state', t('dictionaries.noResults')));
    return;
  }

  const header = el('div', 'dict-results-header');
  header.appendChild(el('span', 'badge badge--gold', `${data.results.length} ${t('dictionaries.results')}`));
  container.appendChild(header);

  data.results.forEach((result) => {
    if (result.type === 'ozhegov') {
      renderOzhegovCard(container, result.entries);
    } else if (result.type === 'foreign') {
      renderForeignCard(container, result.entry);
    } else if (result.type === 'phraseology') {
      renderPhraseologyCard(container, result.entry);
    }
  });
}

async function doSearch() {
  const input = document.getElementById('dict-search');
  const query = input?.value.trim();
  const resultsEl = document.getElementById('dict-result');
  if (!query) {
    resultsEl.replaceChildren();
    return;
  }

  resultsEl.replaceChildren(el('div', 'empty-state', t('common.loading')));

  try {
    const data = await searchDictionary(activeDictionaryId, query, basePath);
    renderResults(data);
  } catch (err) {
    resultsEl.replaceChildren(el('div', 'empty-state', t('common.error')));
    console.error(err);
  }
}

function scheduleSearch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(doSearch, DEBOUNCE_MS);
}

function populateDictionarySelect() {
  const select = document.getElementById('dict-select');
  if (!select || !catalog) return;

  select.replaceChildren();
  catalog.dictionaries.forEach((dict) => {
    const option = el('option');
    option.value = dict.id;
    option.textContent = `${dict.title} (${dict.searchable ? dict.entryCount : t('dictionaries.archive')})`;
    if (dict.id === activeDictionaryId) option.selected = true;
    select.appendChild(option);
  });
}

function updateDictionaryInfo() {
  const info = document.getElementById('dict-info');
  const dict = catalog?.dictionaries.find((d) => d.id === activeDictionaryId);
  if (!info || !dict) return;
  info.replaceChildren();
  info.appendChild(el('p', 'text-small text-muted', dict.description));
  if (!dict.searchable) {
    const badge = el('span', 'badge badge--warning');
    badge.textContent = t('dictionaries.searchUnavailable');
    badge.style.marginTop = 'var(--space-2)';
    info.appendChild(badge);
  }
}

export async function init() {
  const input = document.getElementById('dict-search');
  const select = document.getElementById('dict-select');
  if (!input) return;

  try {
    catalog = await loadCatalog(basePath);
    populateDictionarySelect();
    updateDictionaryInfo();
  } catch (err) {
    console.error(err);
    document.getElementById('dict-result')?.replaceChildren(
      el('div', 'empty-state', t('common.error'))
    );
    return;
  }

  select?.addEventListener('change', () => {
    activeDictionaryId = select.value;
    updateDictionaryInfo();
    doSearch();
  });

  input.addEventListener('input', scheduleSearch);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      clearTimeout(debounceTimer);
      doSearch();
    }
  });
  document.getElementById('dict-search-btn')?.addEventListener('click', () => {
    clearTimeout(debounceTimer);
    doSearch();
  });

  window.addEventListener('langchange', () => {
    populateDictionarySelect();
    updateDictionaryInfo();
  });
}

init();
