import { getItem, setItem } from '../utils/storage.js';

export const QUESTIONS_PER_TEST = 20;

const USED_IDS_KEY = 'tests_used_question_ids';

const TRACK_FILES = {
  russian: 'russian-language.json',
  literature: 'literature-bank.json',
};

let poolsCache = {};
let sessionSeed = Date.now();

function normalizeQuestion(item) {
  if (!item?.question || !item?.options?.length) return null;
  const options = item.options.slice(0, 4);
  return {
    id: item.id,
    track: item.track,
    category: item.category,
    testTitle: String(item.testTitle || '').trim(),
    question: item.question,
    options,
    correct: Math.max(0, Math.min(options.length - 1, item.correct ?? 0)),
  };
}

export function parseTestNumber(title) {
  const match = String(title || '').match(/(?:№|N°|#)\s*(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

export function formatTestLabel(title) {
  const number = parseTestNumber(title);
  if (number != null && /^тест\s*№?\s*\d+/i.test(String(title).trim())) {
    return `Тест №${number}`;
  }
  return String(title || 'Тест').trim();
}

function sortTests(a, b) {
  const numA = parseTestNumber(a.title);
  const numB = parseTestNumber(b.title);
  if (numA != null && numB != null) return numA - numB;
  if (numA != null) return -1;
  if (numB != null) return 1;
  return a.title.localeCompare(b.title, 'ru');
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

export async function getCategoryTests(track, category, basePath = '') {
  const pool = await loadTrackPool(track, basePath);
  const groups = new Map();

  pool.forEach((question) => {
    if (question.category !== category) return;
    const title = question.testTitle || 'Тест';
    if (!groups.has(title)) groups.set(title, []);
    groups.get(title).push(question);
  });

  return [...groups.entries()]
    .map(([title, questions]) => ({
      title,
      shortLabel: formatTestLabel(title),
      questionCount: Math.min(questions.length, QUESTIONS_PER_TEST),
      totalAvailable: questions.length,
    }))
    .sort(sortTests);
}

export async function buildTestByTitle(track, category, testTitle, basePath = '') {
  const pool = await loadTrackPool(track, basePath);
  const selected = pool.filter(
    (question) => question.category === category && question.testTitle === testTitle,
  );
  return selected.slice(0, QUESTIONS_PER_TEST);
}

/** @deprecated Use buildTestByTitle */
export async function buildFreshTest(track, category, basePath = '', testTitle = '') {
  if (testTitle) return buildTestByTitle(track, category, testTitle, basePath);
  const tests = await getCategoryTests(track, category, basePath);
  if (!tests.length) return [];
  return buildTestByTitle(track, category, tests[0].title, basePath);
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

export { TRACK_FILES };
