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

function getSearchableDictionaries() {
  return catalog?.dictionaries.filter((d) => d.searchable) || [];
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

function renderLexiconCard(container, entry, extraRows = []) {
  const card = el('article', 'dict-result card card--elevated');
  card.appendChild(el('div', 'dict-result__word', entry.word));
  appendRow(card, t('dictionaries.meaning'), entry.meaning);
  extraRows.forEach(({ label, value }) => appendRow(card, label, value));
  container.appendChild(card);
}

function renderPhraseologyCard(container, entry) {
  renderLexiconCard(container, entry, [
    { label: t('dictionaries.grammar'), value: entry.syntax },
    { label: t('dictionaries.examples'), value: (entry.examples || []).join('; ') },
    { label: t('dictionaries.synonyms'), value: entry.synonyms?.join(', ') },
    { label: t('dictionaries.antonyms'), value: entry.antonyms?.join(', ') },
    { label: t('dictionaries.etymology'), value: entry.etymology },
  ]);
}

function renderResults(data) {
  const container = document.getElementById('dict-result');
  container.replaceChildren();

  if (!data.results.length) {
    container.appendChild(el('div', 'empty-state', t('dictionaries.noResults')));
    return;
  }

  const header = el('div', 'dict-results-header');
  header.appendChild(el('span', 'badge badge--gold', `${data.results.length} ${t('dictionaries.results')}`));
  container.appendChild(header);

  data.results.forEach((result) => {
    if (result.type === 'ozhegov') renderOzhegovCard(container, result.entries);
    else if (result.type === 'phraseology') renderPhraseologyCard(container, result.entry);
    else renderLexiconCard(container, result.entry, [
      { label: t('dictionaries.antonym'), value: result.entry.antonym },
      { label: t('dictionaries.synonyms'), value: result.entry.pair },
    ]);
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

function updateDictionaryInfo() {
  const info = document.getElementById('dict-info');
  const dict = getSearchableDictionaries().find((d) => d.id === activeDictionaryId);
  if (!info || !dict) return;
  info.replaceChildren();
  const meta = el('div', 'dict-toolbar__meta');
  meta.appendChild(el('span', 'badge badge--gold', dict.title));
  if (dict.entryCount) {
    meta.appendChild(el('span', 'badge badge--muted', `${formatCount(dict.entryCount)} ${t('dictionaries.entriesLabel')}`));
  }
  info.appendChild(meta);
  if (dict.description) {
    info.appendChild(el('p', 'text-small text-muted', dict.description));
  }
}

function highlightPickerSelection() {
  document.querySelectorAll('.dict-chip').forEach((chip) => {
    chip.classList.toggle('is-active', chip.dataset.id === activeDictionaryId);
    chip.setAttribute('aria-selected', chip.dataset.id === activeDictionaryId ? 'true' : 'false');
  });
}

function selectDictionary(id) {
  if (!catalog?.dictionaries.some((d) => d.id === id && d.searchable)) return;
  activeDictionaryId = id;
  highlightPickerSelection();
  updateDictionaryInfo();
  doSearch();
}

function renderStats() {
  const statsEl = document.getElementById('dict-stats');
  if (!statsEl || !catalog) return;

  const searchable = getSearchableDictionaries();
  const totalEntries = searchable.reduce((sum, d) => sum + (d.entryCount || 0), 0);

  statsEl.replaceChildren();
  [
    { value: searchable.length, label: t('dictionaries.statInstalled') },
    { value: searchable.length, label: t('dictionaries.statSearchable') },
    { value: formatCount(totalEntries), label: t('dictionaries.statEntries') },
  ].forEach(({ value, label }) => {
    const item = el('div', 'dict-stat');
    item.appendChild(el('div', 'dict-stat__value', String(value)));
    item.appendChild(el('div', 'dict-stat__label', label));
    statsEl.appendChild(item);
  });
}

function renderDictionaryPicker() {
  const picker = document.getElementById('dict-picker');
  const searchable = getSearchableDictionaries();
  if (!picker || !searchable.length) return;

  picker.replaceChildren();
  searchable.forEach((dict) => {
    const chip = el('button', 'dict-chip');
    chip.type = 'button';
    chip.dataset.id = dict.id;
    chip.setAttribute('role', 'option');
    chip.textContent = dict.title;
    chip.addEventListener('click', () => selectDictionary(dict.id));
    picker.appendChild(chip);
  });

  if (!searchable.some((d) => d.id === activeDictionaryId)) {
    activeDictionaryId = searchable[0].id;
  }
  highlightPickerSelection();
}

export async function init() {
  const input = document.getElementById('dict-search');
  if (!input) return;

  try {
    catalog = await loadCatalog(basePath);
    renderStats();
    renderDictionaryPicker();
    updateDictionaryInfo();
  } catch (err) {
    console.error(err);
    document.getElementById('dict-result')?.replaceChildren(el('div', 'empty-state', t('common.error')));
    return;
  }

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
    renderDictionaryPicker();
    updateDictionaryInfo();
  });
}

init();
