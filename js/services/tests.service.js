import { getItem, setItem } from '../utils/storage.js';

const QUESTIONS_PER_TEST = 15;
const USED_IDS_KEY = 'tests_used_question_ids';

const TRACK_FILES = {
  russian: 'russian-language.json',
  literature: 'literature-bank.json',
};

let poolsCache = {};
let sessionSeed = Date.now();

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function normalizeQuestion(item) {
  if (!item?.question || !item?.options?.length) return null;
  const options = item.options.slice(0, 4);
  return {
    id: item.id,
    track: item.track,
    category: item.category,
    difficulty: item.difficulty || 'medium',
    question: item.question,
    options,
    correct: Math.max(0, Math.min(options.length - 1, item.correct ?? 0)),
  };
}

function getUsedIds() {
  return new Set(getItem(USED_IDS_KEY, []));
}

function markUsed(questions) {
  const used = getUsedIds();
  questions.forEach((q) => used.add(q.id));
  setItem(USED_IDS_KEY, [...used].slice(-4000));
}

function filterUnused(questions) {
  const used = getUsedIds();
  return questions.filter((q) => !used.has(q.id));
}

async function loadTrackPool(track, basePath) {
  const cacheKey = `${basePath}${track}`;
  if (poolsCache[cacheKey] && poolsCache[cacheKey].seed === sessionSeed) {
    return poolsCache[cacheKey].data;
  }

  const file = TRACK_FILES[track];
  if (!file) return [];

  try {
    const response = await fetch(`${basePath}data/tests/${file}?v=${sessionSeed}`, { cache: 'no-store' });
    if (!response.ok) return [];
    const data = await response.json();
    const pool = (Array.isArray(data) ? data : data.questions || [])
      .map(normalizeQuestion)
      .filter(Boolean);
    poolsCache[cacheKey] = { seed: sessionSeed, data: pool };
    return pool;
  } catch {
    return [];
  }
}

function pickQuestions(pool, category, difficulty, count) {
  let source = pool.filter((q) => q.category === category && q.difficulty === difficulty);
  if (source.length < count) {
    source = pool.filter((q) => q.category === category);
  }
  if (source.length < count) {
    source = [...pool];
  }
  return shuffle(source);
}

export async function buildFreshTest(track, category, difficulty, basePath = '') {
  const pool = await loadTrackPool(track, basePath);
  if (!pool.length) return [];

  let available = filterUnused(pool.filter((q) => q.category === category || !category));
  if (available.length < QUESTIONS_PER_TEST) {
    const used = getUsedIds();
    if (used.size > 30) {
      setItem(USED_IDS_KEY, [...used].slice(Math.floor(used.size / 2)));
      available = filterUnused(pool);
    } else {
      available = pool;
    }
  }

  const ordered = pickQuestions(available, category, difficulty, QUESTIONS_PER_TEST * 4);
  const selected = ordered.slice(0, QUESTIONS_PER_TEST);

  if (selected.length) markUsed(selected);
  return selected;
}

export function refreshTestPool() {
  poolsCache = {};
  sessionSeed = Date.now();
}

export function calculateScore(answers, questions) {
  let correct = 0;
  questions.forEach((q, i) => {
    if (answers[i] === q.correct) correct++;
  });
  const total = questions.length;
  const percent = total ? Math.round((correct / total) * 100) : 0;
  return { correct, total, percent, points: correct };
}

export function getCorrectAnswerText(question) {
  return question?.options?.[question.correct] ?? '';
}

export { QUESTIONS_PER_TEST, TRACK_FILES };
