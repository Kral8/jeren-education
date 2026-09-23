/**
 * Dictionary Service — JEREN EDUCATION
 * Catalog, lazy loading, search, caching
 */

const catalogCache = new Map();
const dataCache = new Map();
const ozhegovMetaCache = new Map();
const ozhegovChunkCache = new Map();

export function normalizeQuery(query) {
  return query.trim().toLowerCase().replace(/ё/g, 'е');
}

export async function loadCatalog(basePath = '') {
  const key = basePath;
  if (catalogCache.has(key)) return catalogCache.get(key);

  const response = await fetch(`${basePath}data/dictionaries/index.json`);
  if (!response.ok) throw new Error('Failed to load dictionary catalog');
  const catalog = await response.json();
  catalogCache.set(key, catalog);
  return catalog;
}

export function getDictionaryById(catalog, id) {
  return catalog.dictionaries.find((d) => d.id === id) || null;
}

async function loadJsonDictionary(basePath, dataPath) {
  const cacheKey = `${basePath}${dataPath}`;
  if (dataCache.has(cacheKey)) return dataCache.get(cacheKey);

  const response = await fetch(`${basePath}data/dictionaries/${dataPath}`);
  if (!response.ok) throw new Error(`Failed to load ${dataPath}`);
  const data = await response.json();
  dataCache.set(cacheKey, data);
  return data;
}

async function loadOzhegovMeta(basePath) {
  const key = basePath;
  if (ozhegovMetaCache.has(key)) return ozhegovMetaCache.get(key);

  const response = await fetch(`${basePath}data/dictionaries/ozhegov/meta.json`);
  if (!response.ok) throw new Error('Failed to load ozhegov meta');
  const meta = await response.json();
  ozhegovMetaCache.set(key, meta);
  return meta;
}

function getOzhegovChunkKey(normalizedQuery) {
  if (!normalizedQuery) return null;
  const ch = normalizedQuery[0];
  const letters = 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя';
  if (letters.includes(ch)) return ch;
  if (ch === '-') return '_prefix';
  return '_other';
}

async function loadOzhegovChunk(basePath, chunkKey) {
  const cacheKey = `${basePath}${chunkKey}`;
  if (ozhegovChunkCache.has(cacheKey)) return ozhegovChunkCache.get(cacheKey);

  const meta = await loadOzhegovMeta(basePath);
  const chunkInfo = meta.chunks[chunkKey];
  if (!chunkInfo) return {};

  const response = await fetch(`${basePath}data/dictionaries/${chunkInfo.file}`);
  if (!response.ok) throw new Error(`Failed to load chunk ${chunkKey}`);
  const chunk = await response.json();
  ozhegovChunkCache.set(cacheKey, chunk);
  return chunk;
}

function matchEntriesFromMap(map, normalizedQuery, limit = 20) {
  if (!map || !normalizedQuery) return [];

  if (map[normalizedQuery]) {
    return [{ key: normalizedQuery, entries: map[normalizedQuery], match: 'exact' }];
  }

  const prefixMatches = [];
  for (const key of Object.keys(map)) {
    if (key.startsWith(normalizedQuery)) {
      prefixMatches.push({ key, entries: map[key], match: 'prefix' });
      if (prefixMatches.length >= limit) break;
    }
  }
  return prefixMatches;
}

function searchPhraseology(data, normalizedQuery, limit = 20) {
  if (data[normalizedQuery]) {
    return [{ key: normalizedQuery, entry: data[normalizedQuery], match: 'exact' }];
  }
  const results = [];
  for (const key of Object.keys(data)) {
    if (key.includes(normalizedQuery) || data[key].word?.toLowerCase().replace(/ё/g, 'е').includes(normalizedQuery)) {
      results.push({ key, entry: data[key], match: 'partial' });
      if (results.length >= limit) break;
    }
  }
  return results;
}

function searchForeignWords(data, normalizedQuery, limit = 20) {
  return searchGenericLexicon(data, normalizedQuery, limit, 'prefix-first');
}

function searchGenericLexicon(data, normalizedQuery, limit = 20, mode = 'broad') {
  if (data[normalizedQuery]) {
    return [{ key: normalizedQuery, entry: data[normalizedQuery], match: 'exact' }];
  }

  const results = [];
  for (const key of Object.keys(data)) {
    const entry = data[key];
    const wordNorm = entry.word?.toLowerCase().replace(/ё/g, 'е') || key;
    const prefixMatch = key.startsWith(normalizedQuery) || wordNorm.startsWith(normalizedQuery);
    const partialMatch = key.includes(normalizedQuery) || wordNorm.includes(normalizedQuery);

    if (mode === 'prefix-first' ? prefixMatch : partialMatch) {
      results.push({ key, entry, match: prefixMatch ? 'prefix' : 'partial' });
      if (results.length >= limit) break;
    }
  }

  if (!results.length && mode === 'prefix-first') {
    return searchGenericLexicon(data, normalizedQuery, limit, 'broad');
  }

  return results;
}

/**
 * Search a dictionary by id
 * @returns {{ results: Array, dictionary: object, query: string }}
 */
export async function searchDictionary(dictionaryId, query, basePath = '', limit = 20) {
  const catalog = await loadCatalog(basePath);
  const dictionary = getDictionaryById(catalog, dictionaryId);
  if (!dictionary) throw new Error('Dictionary not found');
  if (!dictionary.searchable) {
    return { results: [], dictionary, query, unavailable: true };
  }

  const normalizedQuery = normalizeQuery(query);
  if (!normalizedQuery) return { results: [], dictionary, query: normalizedQuery };

  if (dictionary.id === 'ozhegov') {
    const chunkKey = getOzhegovChunkKey(normalizedQuery);
    const chunk = await loadOzhegovChunk(basePath, chunkKey);
    let results = matchEntriesFromMap(chunk, normalizedQuery, limit);

    if (!results.length && chunkKey !== '_other') {
      const meta = await loadOzhegovMeta(basePath);
      for (const altKey of Object.keys(meta.chunks)) {
        if (altKey === chunkKey) continue;
        const altChunk = await loadOzhegovChunk(basePath, altKey);
        results = matchEntriesFromMap(altChunk, normalizedQuery, limit);
        if (results.length) break;
      }
    }

    return {
      results: results.map((r) => ({
        ...r,
        entries: r.entries,
        type: 'ozhegov',
      })),
      dictionary,
      query: normalizedQuery,
    };
  }

  if (dictionary.format === 'json') {
    const data = await loadJsonDictionary(basePath, dictionary.data);
    const searchFn = dictionary.id === 'phraseology' ? searchPhraseology : searchForeignWords;
    const resultType = dictionary.id === 'phraseology' ? 'phraseology' : 'lexicon';
    return {
      results: searchFn(data, normalizedQuery, limit).map((r) => ({
        ...r,
        type: resultType,
      })),
      dictionary,
      query: normalizedQuery,
    };
  }

  return { results: [], dictionary, query: normalizedQuery };
}

export function clearDictionaryCache() {
  catalogCache.clear();
  dataCache.clear();
  ozhegovMetaCache.clear();
  ozhegovChunkCache.clear();
}
