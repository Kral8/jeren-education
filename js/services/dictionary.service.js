/**
 * Dictionary Service — lazy loading architecture
 * Large dictionaries (ozhegov.txt, foreign words JSON) loaded on demand only.
 */

let demoCache = null;

export async function loadDemoDictionary(basePath = '') {
  if (demoCache) return demoCache;
  const response = await fetch(`${basePath}data/dictionaries/demo-words.json`);
  if (!response.ok) throw new Error('Failed to load dictionary');
  demoCache = await response.json();
  return demoCache;
}

export async function searchWord(query, basePath = '') {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  const dict = await loadDemoDictionary(basePath);
  const entry = dict[q] || dict[Object.keys(dict).find((k) => k.startsWith(q))];
  return entry || null;
}

export async function loadFullDictionary(name, basePath = '') {
  // Future: load ozhegov.txt, phraseology.json etc. on demand
  const map = {
    phraseology: `${basePath}data/dictionaries/phraseology-demo.json`,
    foreign: `${basePath}data/dictionaries/foreign-demo.json`,
  };
  const url = map[name];
  if (!url) return null;
  const response = await fetch(url);
  if (!response.ok) return null;
  return response.json();
}
