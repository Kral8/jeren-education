import { getItem, setItem } from '../utils/storage.js';

let wordsCache = null;

export async function loadStressWords(basePath = '') {
  if (wordsCache) return wordsCache;
  const response = await fetch(`${basePath}data/stress/stress-words.json`);
  if (!response.ok) throw new Error('Failed to load stress words');
  wordsCache = await response.json();
  return wordsCache;
}

export function getStats() {
  return getItem('stress_stats', { total: 0, correct: 0, streak: 0, level: 1 });
}

export function updateStats(wasCorrect) {
  const stats = getStats();
  stats.total++;
  if (wasCorrect) {
    stats.correct++;
    stats.streak++;
  } else {
    stats.streak = 0;
  }
  stats.level = Math.floor(stats.correct / 10) + 1;
  setItem('stress_stats', stats);
  return stats;
}

export function shuffleWords(words) {
  return [...words].sort(() => Math.random() - 0.5);
}
