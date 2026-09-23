import { t } from '../i18n/index.js';
import {
  buildTestByTitle,
  calculateScore,
  refreshTestPool,
  getCorrectAnswerText,
  getCategoryTests,
  formatTestLabel,
  QUESTIONS_PER_TEST,
} from '../services/tests.service.js';

const basePath = document.body.dataset.base || '../';
const TEST_DURATION_SECONDS = 20 * 60;

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

const TRACK_CATEGORIES = {
  russian: ['orthography', 'orthoepy', 'syntax', 'phonetics', 'noun', 'adjective'],
  literature: ['authors', 'general', 'works'],
};

let state = {
  track: 'russian',
  category: 'orthography',
  testTitle: '',
  availableTests: [],
  questions: [],
  answers: [],
  revealed: [],
  current: 0,
  timer: null,
  timeLeft: 0,
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

function testButtons(tests, activeTitle) {
  if (!tests.length) {
    return `<p class="test-panel__empty">${t('tests.noTestsInCategory')}</p>`;
  }
  return tests.map((test, index) => {
    const isActive = test.title === activeTitle;
    const countLabel = test.questionCount < QUESTIONS_PER_TEST
      ? t('tests.questionsCountShort').replace('{count}', String(test.questionCount))
      : `${QUESTIONS_PER_TEST}`;
    return `<button type="button" class="test-number-chip${isActive ? ' test-number-chip--active' : ''}" data-test-index="${index}" title="${escapeHtml(test.title)}">
      <span class="test-number-chip__label">${escapeHtml(test.shortLabel)}</span>
      <span class="test-number-chip__meta">${countLabel} ${t('tests.questionsShort')}</span>
    </button>`;
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
        <span class="test-meta__label">${formatTestLabel(state.testTitle)}</span>
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

async function loadTestsForCategory(setupEl) {
  const grid = document.getElementById('test-number-grid');
  if (!grid) return;

  grid.innerHTML = `<p class="test-panel__loading">${t('tests.loadingTests')}</p>`;
  state.availableTests = await getCategoryTests(state.track, state.category, basePath);

  if (!state.availableTests.length) {
    state.testTitle = '';
    grid.innerHTML = testButtons([], '');
    updateStartButton();
    return;
  }

  const stillValid = state.availableTests.some((test) => test.title === state.testTitle);
  if (!stillValid) state.testTitle = state.availableTests[0].title;

  grid.innerHTML = testButtons(state.availableTests, state.testTitle);
  bindTestChips(setupEl);
  updateStartButton();
}

function updateStartButton() {
  const startBtn = document.getElementById('test-start');
  const noteEl = document.getElementById('test-selected-note');
  const activeTest = state.availableTests.find((test) => test.title === state.testTitle);

  if (startBtn) {
    startBtn.disabled = !activeTest;
  }
  if (noteEl && activeTest) {
    noteEl.textContent = t('tests.selectedTestNote')
      .replace('{test}', activeTest.shortLabel)
      .replace('{count}', String(activeTest.questionCount));
  } else if (noteEl) {
    noteEl.textContent = t('tests.noTestsInCategory');
  }
}

async function startTest(setupEl, activeEl, resultEl, fromRetry = false) {
  if (state.loading || !state.testTitle) return;
  state.loading = true;

  const startBtn = document.getElementById('test-start');
  if (startBtn) startBtn.disabled = true;

  try {
    refreshTestPool();
    state.questions = await buildTestByTitle(state.track, state.category, state.testTitle, basePath);
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
      <p class="test-result-points">${t('tests.points')}: ${score.points} ${t('tests.pointsOf').replace('{total}', String(score.total))}</p>
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
      <div class="test-score test-score--timeout">20:00</div>
      <p class="test-result-line test-result-line--timeout">${t('tests.timeUpMessage')}</p>
      <div class="test-result-actions">
        <button class="btn btn--primary btn--lg" id="test-retry" type="button">${t('tests.retry')}</button>
        <button class="btn btn--ghost" id="test-back-setup" type="button">${t('tests.exit')}</button>
      </div>
    </div>`;

  bindResultActions(resultEl, setupEl, activeEl);
}

function bindTestChips(setupEl) {
  setupEl.querySelectorAll('.test-number-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const index = parseInt(chip.dataset.testIndex, 10);
      state.testTitle = state.availableTests[index]?.title || '';
      setupEl.querySelectorAll('.test-number-chip').forEach((c) => {
        c.classList.toggle('test-number-chip--active', c === chip);
      });
      updateStartButton();
    });
  });
}

function bindCategoryChips(setupEl, activeEl, resultEl) {
  setupEl.querySelectorAll('.test-category-chip').forEach((chip) => {
    chip.addEventListener('click', async () => {
      state.category = chip.dataset.category;
      setupEl.querySelectorAll('.test-category-chip').forEach((c) => {
        c.classList.toggle('test-category-chip--active', c === chip);
      });
      await loadTestsForCategory(setupEl);
    });
  });
}

function bindSetupEvents(setupEl, activeEl, resultEl) {
  setupEl.querySelectorAll('.test-track-card').forEach((btn) => {
    btn.addEventListener('click', async () => {
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
        await loadTestsForCategory(setupEl);
      }
    });
  });

  bindCategoryChips(setupEl, activeEl, resultEl);

  document.getElementById('test-start')?.addEventListener('click', async () => {
    await startTest(setupEl, activeEl, resultEl);
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
      <div class="test-panel__section">
        <div class="test-panel__label">${t('tests.selectTest')}</div>
        <div class="test-number-grid" id="test-number-grid">
          <p class="test-panel__loading">${t('tests.loadingTests')}</p>
        </div>
      </div>
      <p class="test-panel__note" id="test-selected-note">${t('tests.fixedCount')}</p>
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
  await loadTestsForCategory(setupEl);
}

init();
