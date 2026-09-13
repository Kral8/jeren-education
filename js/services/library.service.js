import { getItem, setItem } from '../utils/storage.js';

let catalogCache = null;

export async function loadCatalog(basePath = '') {
  if (catalogCache) return catalogCache;
  const response = await fetch(`${basePath}data/library/catalog.json`);
  if (!response.ok) throw new Error('Failed to load catalog');
  catalogCache = await response.json();
  return catalogCache;
}

export async function searchMaterials(query = '', category = 'all', basePath = '') {
  const catalog = await loadCatalog(basePath);
  const q = query.trim().toLowerCase();
  return catalog.filter((item) => {
    const matchCat = category === 'all' || item.category === category;
    const matchQ = !q ||
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q);
    return matchCat && matchQ;
  });
}

export function getFavorites() {
  return getItem('favorites', []);
}

export function toggleFavorite(id) {
  const favs = getFavorites();
  const idx = favs.indexOf(id);
  if (idx >= 0) favs.splice(idx, 1);
  else favs.push(id);
  setItem('favorites', favs);
  return favs.includes(id);
}

export function isFavorite(id) {
  return getFavorites().includes(id);
}
