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

function formatCount(count) {
  if (count == null) return '—';
  if (count >= 1000) return `${Math.round(count / 1000)}K+`;
  return String(count);
}

function getCategoryLabel(dict) {
  const key = dict.type && t(`dictionaries.categories.${dict.type}`);
  if (key && !key.startsWith('dictionaries.')) return key;
  return dict.type || '';
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
    card.appendChild(el('div', 'dict-result__word', entry.word));
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

function renderUnavailableNotice(container) {
  const note = el('div', 'demo-note');
  note.appendChild(el('span', 'badge badge--muted', t('dictionaries.comingSoon')));
  note.appendChild(document.createTextNode(' ' + t('dictionaries.comingSoonNote')));
  container.appendChild(note);
}

function renderResults(data) {
  const container = document.getElementById('dict-result');
  container.replaceChildren();

  if (data.unavailable) {
    renderUnavailableNotice(container);
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
    if (result.type === 'ozhegov') renderOzhegovCard(container, result.entries);
    else if (result.type === 'foreign') renderForeignCard(container, result.entry);
    else if (result.type === 'phraseology') renderPhraseologyCard(container, result.entry);
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

function getSearchableDictionaries() {
  return catalog?.dictionaries.filter((d) => d.searchable) || [];
}

function selectDictionary(id, scrollToSearch = true) {
  if (!catalog?.dictionaries.some((d) => d.id === id && d.searchable)) return;
  activeDictionaryId = id;
  const select = document.getElementById('dict-select');
  if (select) select.value = id;
  updateDictionaryInfo();
  highlightCatalogSelection();
  if (scrollToSearch) {
    document.getElementById('dict-search-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.getElementById('dict-search')?.focus();
  }
  doSearch();
}

function highlightCatalogSelection() {
  document.querySelectorAll('.dict-catalog-card--active').forEach((card) => {
    card.classList.toggle('is-selected', card.dataset.id === activeDictionaryId);
  });
}

function renderStats() {
  const statsEl = document.getElementById('dict-stats');
  if (!statsEl || !catalog) return;

  const searchable = getSearchableDictionaries();
  const totalEntries = searchable.reduce((sum, d) => sum + (d.entryCount || 0), 0);

  statsEl.replaceChildren();
  [
    { value: catalog.totalDictionaries || catalog.dictionaries.length, label: t('dictionaries.statInstalled') },
    { value: searchable.length, label: t('dictionaries.statSearchable') },
    { value: formatCount(totalEntries), label: t('dictionaries.statEntries') },
  ].forEach(({ value, label }) => {
    const item = el('div', 'dict-stat');
    item.appendChild(el('div', 'dict-stat__value', String(value)));
    item.appendChild(el('div', 'dict-stat__label', label));
    statsEl.appendChild(item);
  });
}

function renderCatalog() {
  const grid = document.getElementById('dict-catalog');
  if (!grid || !catalog) return;

  grid.replaceChildren();
  catalog.dictionaries.forEach((dict) => {
    const isActive = dict.searchable;
    const card = el('article', `dict-catalog-card card ${isActive ? 'dict-catalog-card--active' : 'dict-catalog-card--archive'}`);
    card.dataset.id = dict.id;

    const head = el('div', 'dict-catalog-card__head');
    head.appendChild(el('h3', 'dict-catalog-card__title', dict.title));
    const badgeClass = isActive ? 'badge badge--gold' : 'badge badge--muted';
    const badgeText = isActive ? t('dictionaries.statusActive') : t('dictionaries.statusInstalled');
    head.appendChild(el('span', badgeClass, badgeText));
    card.appendChild(head);

    card.appendChild(el('p', 'dict-catalog-card__desc', dict.description || ''));

    const meta = el('div', 'dict-catalog-card__meta');
    const category = getCategoryLabel(dict);
    if (category) meta.appendChild(el('span', 'badge badge--muted', category));
    if (dict.entryCount) meta.appendChild(el('span', 'badge badge--muted', `${formatCount(dict.entryCount)} ${t('dictionaries.entriesLabel')}`));
    if (!isActive) meta.appendChild(el('span', 'badge badge--muted', t('dictionaries.comingSoon')));
    card.appendChild(meta);

    if (isActive) {
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.addEventListener('click', () => selectDictionary(dict.id));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectDictionary(dict.id);
        }
      });
    }

    grid.appendChild(card);
  });

  highlightCatalogSelection();
}

function populateDictionarySelect() {
  const select = document.getElementById('dict-select');
  const searchable = getSearchableDictionaries();
  if (!select || !searchable.length) return;

  select.replaceChildren();
  searchable.forEach((dict) => {
    const option = el('option');
    option.value = dict.id;
    option.textContent = `${dict.title} (${formatCount(dict.entryCount)})`;
    if (dict.id === activeDictionaryId) option.selected = true;
    select.appendChild(option);
  });

  if (!searchable.some((d) => d.id === activeDictionaryId)) {
    activeDictionaryId = searchable[0].id;
    select.value = activeDictionaryId;
  }
}

function updateDictionaryInfo() {
  const info = document.getElementById('dict-info');
  const dict = getSearchableDictionaries().find((d) => d.id === activeDictionaryId);
  if (!info || !dict) return;
  info.replaceChildren();
  info.appendChild(el('p', 'text-small text-muted', dict.description));
}

export async function init() {
  const input = document.getElementById('dict-search');
  const select = document.getElementById('dict-select');
  if (!input) return;

  try {
    catalog = await loadCatalog(basePath);
    renderStats();
    renderCatalog();
    populateDictionarySelect();
    updateDictionaryInfo();
  } catch (err) {
    console.error(err);
    document.getElementById('dict-result')?.replaceChildren(el('div', 'empty-state', t('common.error')));
    return;
  }

  select?.addEventListener('change', () => {
    activeDictionaryId = select.value;
    updateDictionaryInfo();
    highlightCatalogSelection();
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
    renderStats();
    renderCatalog();
    populateDictionarySelect();
    updateDictionaryInfo();
  });
}

init();
