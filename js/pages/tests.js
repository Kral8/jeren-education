import { t } from '../i18n/index.js';
import {
  buildFreshTest,
  calculateScore,
  refreshTestPool,
  getCorrectAnswerText,
  QUESTIONS_PER_TEST,
} from '../services/tests.service.js';

const basePath = document.body.dataset.base || '../';
const TEST_DURATION_SECONDS = 15 * 60;

const TRACK_CATEGORIES = {
  russian: ['orthography', 'orthoepy', 'syntax', 'phonetics', 'noun', 'adjective'],
  literature: ['authors', 'general', 'works'],
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
  loading: false,
  finished: false,
};

function categoryButtons(track, active) {
  const cats = TRACK_CATEGORIES[track] || TRACK_CATEGORIES.russian;
  return cats.map((c) => {
    const isActive = c === active;
    return `<button type="button" class="test-category-chip${isActive ? ' test-category-chip--active' : ''}" data-category="${c}">${t(`tests.categories.${c}`)}</button>`;
  }).join('');
}

function formatTimer(seconds) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function startTimer(el) {
  clearInterval(state.timer);
  state.timer = setInterval(() => {
    if (state.finished) return;
    state.timeLeft -= 1;
    const timerEl = el.querySelector('.test-meta__timer');
    if (timerEl) {
      timerEl.textContent = formatTimer(state.timeLeft);
      timerEl.classList.toggle('test-meta__timer--warn', state.timeLeft <= 60);
    }
    if (state.timeLeft <= 0) finishTestTimedOut();
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
  const progress = ((state.current + 1) / state.questions.length) * 100;
  const revealed = state.revealed[state.current];

  el.innerHTML = `
    <div class="test-panel test-panel--active">
      <div class="test-meta">
        <span class="test-meta__counter">${state.current + 1} / ${state.questions.length}</span>
        <span class="test-meta__timer">${formatTimer(state.timeLeft)}</span>
      </div>
      <div class="test-progress"><div class="test-progress__bar" style="width:${progress}%"></div></div>
      <div class="test-question">${q.question}</div>
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
        <button class="btn btn--primary btn--lg" id="test-next" type="button">${revealed
          ? (state.current < state.questions.length - 1 ? t('tests.next') : t('tests.finish'))
          : t('tests.checkAnswer')}</button>
      </div>
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

async function startTest(setupEl, activeEl, resultEl, fromRetry = false) {
  if (state.loading) return;
  state.loading = true;

  const startBtn = document.getElementById('test-start');
  if (startBtn) startBtn.disabled = true;

  try {
    refreshTestPool();
    state.questions = await buildFreshTest(state.track, state.category, basePath);
  } finally {
    state.loading = false;
    if (startBtn) startBtn.disabled = false;
  }

  if (!state.questions.length) {
    alert(t('tests.noQuestions'));
    if (!fromRetry) return;
    setupEl.hidden = false;
    return;
  }

  state.answers = new Array(state.questions.length).fill(null);
  state.revealed = new Array(state.questions.length).fill(false);
  state.current = 0;
  state.finished = false;
  state.timeLeft = TEST_DURATION_SECONDS;
  setupEl.hidden = true;
  activeEl.hidden = false;
  resultEl.hidden = true;
  startTimer(activeEl);
  renderQuestion(activeEl);
}

function bindResultActions(resultEl, setupEl, activeEl) {
  document.getElementById('test-retry')?.addEventListener('click', async () => {
    resultEl.hidden = true;
    await startTest(setupEl, activeEl, resultEl, true);
  });

  document.getElementById('test-back-setup')?.addEventListener('click', () => {
    resultEl.hidden = true;
    setupEl.hidden = false;
  });
}

async function finishTest() {
  if (state.finished) return;
  state.finished = true;
  clearInterval(state.timer);

  const activeEl = document.getElementById('test-active');
  const resultEl = document.getElementById('test-result');
  const setupEl = document.getElementById('test-setup');
  activeEl.hidden = true;
  resultEl.hidden = false;

  const score = calculateScore(state.answers, state.questions);
  resultEl.innerHTML = `
    <div class="card card--elevated test-result-card test-panel">
      <p class="test-result-eyebrow">${t('tests.result')}</p>
      <div class="test-score">${score.percent}%</div>
      <p class="test-result-line">${t('tests.score')}: ${score.correct} / ${score.total}</p>
      <p class="test-result-points">${t('tests.points')}: ${score.points} ${t('tests.pointsLabel')}</p>
      <div class="test-result-actions">
        <button class="btn btn--primary btn--lg" id="test-retry" type="button">${t('tests.retry')}</button>
        <button class="btn btn--ghost" id="test-back-setup" type="button">${t('tests.backToSetup')}</button>
      </div>
    </div>`;

  bindResultActions(resultEl, setupEl, activeEl);
}

function finishTestTimedOut() {
  if (state.finished) return;
  state.finished = true;
  clearInterval(state.timer);

  const activeEl = document.getElementById('test-active');
  const resultEl = document.getElementById('test-result');
  const setupEl = document.getElementById('test-setup');
  activeEl.hidden = true;
  resultEl.hidden = false;

  resultEl.innerHTML = `
    <div class="card card--elevated test-result-card test-panel test-result-card--timeout">
      <p class="test-result-eyebrow">${t('tests.timeUp')}</p>
      <div class="test-score test-score--timeout">15:00</div>
      <p class="test-result-line test-result-line--timeout">${t('tests.timeUpMessage')}</p>
      <div class="test-result-actions">
        <button class="btn btn--primary btn--lg" id="test-retry" type="button">${t('tests.retry')}</button>
        <button class="btn btn--ghost" id="test-back-setup" type="button">${t('tests.exit')}</button>
      </div>
    </div>`;

  bindResultActions(resultEl, setupEl, activeEl);
}

function bindSetupEvents(setupEl, activeEl, resultEl) {
  setupEl.querySelectorAll('.test-track-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.track = btn.dataset.track;
      setupEl.querySelectorAll('.test-track-card').forEach((b) => {
        b.classList.toggle('test-track-card--active', b === btn);
      });
      const grid = document.getElementById('test-category-grid');
      if (grid) {
        const cats = TRACK_CATEGORIES[state.track];
        state.category = cats[0];
        grid.innerHTML = categoryButtons(state.track, state.category);
        bindCategoryChips(setupEl, activeEl, resultEl);
      }
    });
  });

  bindCategoryChips(setupEl, activeEl, resultEl);

  document.getElementById('test-start')?.addEventListener('click', async () => {
    await startTest(setupEl, activeEl, resultEl);
  });
}

function bindCategoryChips(setupEl, activeEl, resultEl) {
  setupEl.querySelectorAll('.test-category-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      state.category = chip.dataset.category;
      setupEl.querySelectorAll('.test-category-chip').forEach((c) => {
        c.classList.toggle('test-category-chip--active', c === chip);
      });
    });
  });
}

function initSetup(setupEl, activeEl, resultEl) {
  setupEl.hidden = false;
  setupEl.innerHTML = `
    <div class="test-panel">
      <div class="test-panel__head">
        <span class="test-panel__eyebrow">JEREN EDUCATION</span>
        <h2 class="test-panel__title">${t('tests.panelTitle')}</h2>
      </div>
      <div class="test-panel__section">
        <div class="test-panel__label">${t('tests.selectTrack')}</div>
        <div class="test-track-grid">
          <button type="button" class="test-track-card${state.track === 'russian' ? ' test-track-card--active' : ''}" data-track="russian">
            <span class="test-track-card__title">${t('tests.tracks.russian')}</span>
          </button>
          <button type="button" class="test-track-card${state.track === 'literature' ? ' test-track-card--active' : ''}" data-track="literature">
            <span class="test-track-card__title">${t('tests.tracks.literature')}</span>
          </button>
        </div>
      </div>
      <div class="test-panel__section">
        <div class="test-panel__label">${t('tests.selectCategory')}</div>
        <div class="test-category-grid" id="test-category-grid">
          ${categoryButtons(state.track, state.category)}
        </div>
      </div>
      <p class="test-panel__note">${t('tests.fixedCount')}</p>
      <p class="test-panel__note test-panel__note--muted">${t('tests.timeLimit')}</p>
      <button class="btn btn--primary btn--lg btn--full" id="test-start" type="button">${t('tests.start')}</button>
    </div>`;

  bindSetupEvents(setupEl, activeEl, resultEl);
}

export async function init() {
  const setupEl = document.getElementById('test-setup');
  const activeEl = document.getElementById('test-active');
  const resultEl = document.getElementById('test-result');
  if (!setupEl) return;
  initSetup(setupEl, activeEl, resultEl);
}

init();
