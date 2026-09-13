let testsCache = null;

export async function loadTests(basePath = '') {
  if (testsCache) return testsCache;
  const response = await fetch(`${basePath}data/tests/demo-tests.json`);
  if (!response.ok) throw new Error('Failed to load tests');
  testsCache = await response.json();
  return testsCache;
}

export function getTestByCategory(tests, category, difficulty = 'medium', count = 5) {
  const pool = tests.filter(
    (t) => t.category === category && t.difficulty === difficulty
  );
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export function calculateScore(answers, questions) {
  let correct = 0;
  questions.forEach((q, i) => {
    if (answers[i] === q.correct) correct++;
  });
  return {
    correct,
    total: questions.length,
    percent: Math.round((correct / questions.length) * 100),
  };
}
