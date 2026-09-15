import { t } from '../i18n/index.js';
import {
  buildFreshTest,
  calculateScore,
  refreshTestPool,
  getCorrectAnswerText,
  QUESTIONS_PER_TEST,
} from '../services/tests.service.js';

const basePath = document.body.dataset.base || '../';

const TRACK_CATEGORIES = {
  russian: ['orthography', 'grammar', 'punctuation', 'stress', 'lexicon'],
  literature: ['authors', 'works', 'poetry', 'terms'],
};

let state = {
  track: 'russian',
  questions: [],
  answers: [],
  revealed: [],
  current: 0,
  timer: null,
  timeLeft: 0,
  category: 'orthography',
  difficulty: 'medium',
  loading: false,
};

function categoryOptions(track) {
  const cats = TRACK_CATEGORIES[track] || TRACK_CATEGORIES.russian;
  return cats.map((c) => `<option value="${c}">${t(`tests.categories.${c}`)}</option>`).join('');
}

function startTimer(el) {
  clearInterval(state.timer);
  state.timer = setInterval(() => {
    state.timeLeft--;
    const timerEl = el.querySelector('.test-timer');
    if (timerEl) {
      timerEl.textContent = `${t('tests.timeLeft')}: ${Math.floor(state.timeLeft / 60)}:${String(state.timeLeft % 60).padStart(2, '0')}`;
    }
    if (state.timeLeft <= 0) finishTest();
  }, 1000);
}

function revealCurrentAnswer(el) {
  const q = state.questions[state.current];
  const selected = state.answers[state.current];
  const isCorrect = selected === q.correct;
  state.revealed[state.current] = true;

  el.querySelectorAll('.test-option').forEach((btn) => {
    const idx = parseInt(btn.dataset.i, 10);
    btn.disabled = true;
    btn.classList.remove('test-option--selected');
    if (idx === q.correct) btn.classList.add('test-option--correct');
    if (idx === selected && !isCorrect) btn.classList.add('test-option--wrong');
  });

  let feedback = el.querySelector('.test-feedback');
  if (!feedback) {
    feedback = document.createElement('div');
    feedback.className = 'test-feedback';
    el.querySelector('.test-options')?.after(feedback);
  }

  if (isCorrect) {
    feedback.className = 'test-feedback test-feedback--ok';
    feedback.textContent = t('tests.correct');
  } else {
    feedback.className = 'test-feedback test-feedback--bad';
    feedback.textContent = `${t('tests.incorrect')}. ${t('tests.correctAnswer')}: ${getCorrectAnswerText(q)}`;
  }

  const nextBtn = document.getElementById('test-next');
  if (nextBtn) {
    nextBtn.textContent = state.current < state.questions.length - 1 ? t('tests.next') : t('tests.finish');
  }
}

function renderQuestion(el) {
  const q = state.questions[state.current];
  const progress = (state.current / state.questions.length) * 100;
  const revealed = state.revealed[state.current];

  el.innerHTML = `
    <div class="test-timer">${t('tests.timeLeft')}: ${Math.floor(state.timeLeft / 60)}:${String(state.timeLeft % 60).padStart(2, '0')}</div>
    <div class="test-progress"><div class="test-progress__bar" style="width:${progress}%"></div></div>
    <div class="test-question">${state.current + 1} / ${state.questions.length}. ${q.question}</div>
    <div class="test-options">
      ${q.options.map((opt, i) => {
        let cls = 'test-option';
        if (!revealed && state.answers[state.current] === i) cls += ' test-option--selected';
        if (revealed && i === q.correct) cls += ' test-option--correct';
        if (revealed && state.answers[state.current] === i && i !== q.correct) cls += ' test-option--wrong';
        return `<button class="${cls}" data-i="${i}" type="button"${revealed ? ' disabled' : ''}>${opt}</button>`;
      }).join('')}
    </div>
    ${revealed ? `<div class="test-feedback ${state.answers[state.current] === q.correct ? 'test-feedback--ok' : 'test-feedback--bad'}">${
      state.answers[state.current] === q.correct
        ? t('tests.correct')
        : `${t('tests.incorrect')}. ${t('tests.correctAnswer')}: ${getCorrectAnswerText(q)}`
    }</div>` : ''}
    <div class="test-actions">
      <button class="btn btn--primary" id="test-next" type="button">${revealed
        ? (state.current < state.questions.length - 1 ? t('tests.next') : t('tests.finish'))
        : t('tests.checkAnswer')}</button>
    </div>`;

  if (!revealed) {
    el.querySelectorAll('.test-option').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.answers[state.current] = parseInt(btn.dataset.i, 10);
        el.querySelectorAll('.test-option').forEach((b) => b.classList.remove('test-option--selected'));
        btn.classList.add('test-option--selected');
      });
    });
  }

  document.getElementById('test-next').addEventListener('click', () => {
    if (state.answers[state.current] === null) return;

    if (!state.revealed[state.current]) {
      revealCurrentAnswer(el);
      return;
    }

    if (state.current < state.questions.length - 1) {
      state.current++;
      renderQuestion(el);
    } else {
      finishTest();
    }
  });
}

async function startTest(setupEl, activeEl, resultEl) {
  if (state.loading) return;
  state.loading = true;

  setupEl.innerHTML = `<div class="empty-state">${t('tests.loading')}</div>`;

  try {
    refreshTestPool();
    state.questions = await buildFreshTest(state.track, state.category, state.difficulty, basePath);
  } finally {
    state.loading = false;
  }

  if (state.questions.length < QUESTIONS_PER_TEST) {
    alert(t('tests.noQuestions'));
    await initSetup(setupEl, activeEl, resultEl);
    return;
  }

  state.answers = new Array(state.questions.length).fill(null);
  state.revealed = new Array(state.questions.length).fill(false);
  state.current = 0;
  state.timeLeft = state.questions.length * 45;
  setupEl.hidden = true;
  activeEl.hidden = false;
  resultEl.hidden = true;
  startTimer(activeEl);
  renderQuestion(activeEl);
}

async function finishTest() {
  clearInterval(state.timer);
  const activeEl = document.getElementById('test-active');
  const resultEl = document.getElementById('test-result');
  const setupEl = document.getElementById('test-setup');
  activeEl.hidden = true;
  resultEl.hidden = false;

  const score = calculateScore(state.answers, state.questions);
  resultEl.innerHTML = `
    <div class="card card--elevated test-result-card">
      <div class="test-score">${score.percent}%</div>
      <p class="test-result-line">${t('tests.score')}: ${score.correct} / ${score.total}</p>
      <p class="test-result-points">${t('tests.points')}: ${score.points} ${t('tests.pointsLabel')}</p>
      <button class="btn btn--primary" id="test-retry" type="button">${t('tests.retry')}</button>
    </div>`;

  document.getElementById('test-retry').addEventListener('click', async () => {
    resultEl.hidden = true;
    setupEl.hidden = false;
    await startTest(setupEl, activeEl, resultEl);
  });
}

function bindTrackChange(setupEl, activeEl, resultEl) {
  const trackEl = document.getElementById('test-track');
  const categoryEl = document.getElementById('test-category');
  if (!trackEl || !categoryEl) return;

  trackEl.addEventListener('change', () => {
    state.track = trackEl.value;
    categoryEl.innerHTML = categoryOptions(state.track);
    state.category = categoryEl.value;
  });

  document.getElementById('test-start')?.addEventListener('click', async () => {
    state.track = trackEl.value;
    state.category = categoryEl.value;
    state.difficulty = document.getElementById('test-difficulty').value;
    await startTest(setupEl, activeEl, resultEl);
  });
}

async function initSetup(setupEl, activeEl, resultEl) {
  setupEl.hidden = false;
  setupEl.innerHTML = `
    <div class="form-group">
      <label class="form-label" for="test-track">${t('tests.selectTrack')}</label>
      <select class="form-select" id="test-track">
        <option value="russian"${state.track === 'russian' ? ' selected' : ''}>${t('tests.tracks.russian')}</option>
        <option value="literature"${state.track === 'literature' ? ' selected' : ''}>${t('tests.tracks.literature')}</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label" for="test-category">${t('tests.selectCategory')}</label>
      <select class="form-select" id="test-category">
        ${categoryOptions(state.track)}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label" for="test-difficulty">${t('tests.difficulty')}</label>
      <select class="form-select" id="test-difficulty">
        <option value="easy">${t('tests.easy')}</option>
        <option value="medium" selected>${t('tests.medium')}</option>
        <option value="hard">${t('tests.hard')}</option>
      </select>
    </div>
    <p class="text-small text-muted">${t('tests.fixedCount')}</p>
    <p class="text-small text-muted">${t('tests.sourceNote')}</p>
    <button class="btn btn--primary" id="test-start" type="button">${t('tests.start')}</button>`;

  bindTrackChange(setupEl, activeEl, resultEl);
}

export async function init() {
  const setupEl = document.getElementById('test-setup');
  const activeEl = document.getElementById('test-active');
  const resultEl = document.getElementById('test-result');
  if (!setupEl) return;
  await initSetup(setupEl, activeEl, resultEl);
}

init();
