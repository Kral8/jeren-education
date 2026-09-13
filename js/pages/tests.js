import { t } from '../i18n/index.js';
import { loadTests, getTestByCategory, calculateScore } from '../services/tests.service.js';

const basePath = document.body.dataset.base || '../';
const CATEGORIES = ['orthography', 'grammar', 'punctuation', 'literature', 'stress', 'lexicon', 'pedagogy'];

let state = { questions: [], answers: [], current: 0, timer: null, timeLeft: 0 };

export async function init() {
  const setupEl = document.getElementById('test-setup');
  const activeEl = document.getElementById('test-active');
  const resultEl = document.getElementById('test-result');
  if (!setupEl) return;

  const tests = await loadTests(basePath);

  setupEl.innerHTML = `
    <div class="form-group">
      <label class="form-label" data-i18n="tests.selectCategory">${t('tests.selectCategory')}</label>
      <select class="form-select" id="test-category">
        ${CATEGORIES.map((c) => `<option value="${c}">${t(`tests.categories.${c}`)}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label" data-i18n="tests.difficulty">${t('tests.difficulty')}</label>
      <select class="form-select" id="test-difficulty">
        <option value="easy">${t('tests.easy')}</option>
        <option value="medium" selected>${t('tests.medium')}</option>
        <option value="hard">${t('tests.hard')}</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label" data-i18n="tests.questions">${t('tests.questions')}</label>
      <select class="form-select" id="test-count">
        <option value="3">3</option>
        <option value="5" selected>5</option>
        <option value="10">10</option>
      </select>
    </div>
    <button class="btn btn--primary" id="test-start" data-i18n="tests.start">${t('tests.start')}</button>`;

  document.getElementById('test-start').addEventListener('click', () => {
    const cat = document.getElementById('test-category').value;
    const diff = document.getElementById('test-difficulty').value;
    const count = parseInt(document.getElementById('test-count').value, 10);
    state.questions = getTestByCategory(tests, cat, diff, count);
    if (!state.questions.length) {
      alert(t('library.noResults'));
      return;
    }
    state.answers = new Array(state.questions.length).fill(null);
    state.current = 0;
    state.timeLeft = state.questions.length * 60;
    setupEl.hidden = true;
    activeEl.hidden = false;
    resultEl.hidden = true;
    startTimer(activeEl);
    renderQuestion(activeEl);
  });
}

function startTimer(el) {
  clearInterval(state.timer);
  state.timer = setInterval(() => {
    state.timeLeft--;
    const timerEl = el.querySelector('.test-timer');
    if (timerEl) timerEl.textContent = `${t('tests.timeLeft')}: ${Math.floor(state.timeLeft / 60)}:${String(state.timeLeft % 60).padStart(2, '0')}`;
    if (state.timeLeft <= 0) finishTest();
  }, 1000);
}

function renderQuestion(el) {
  const q = state.questions[state.current];
  const progress = ((state.current) / state.questions.length) * 100;
  el.innerHTML = `
    <div class="test-timer">${t('tests.timeLeft')}: ${Math.floor(state.timeLeft / 60)}:${String(state.timeLeft % 60).padStart(2, '0')}</div>
    <div class="test-progress"><div class="test-progress__bar" style="width:${progress}%"></div></div>
    <div class="test-question">${state.current + 1}. ${q.question}</div>
    <div class="test-options">
      ${q.options.map((opt, i) =>
        `<button class="test-option${state.answers[state.current] === i ? ' test-option--selected' : ''}" data-i="${i}">${opt}</button>`
      ).join('')}
    </div>
    <div style="margin-top:var(--space-6);display:flex;gap:var(--space-3);">
      <button class="btn btn--primary" id="test-next">${state.current < state.questions.length - 1 ? t('tests.next') : t('tests.finish')}</button>
    </div>`;

  el.querySelectorAll('.test-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.answers[state.current] = parseInt(btn.dataset.i, 10);
      el.querySelectorAll('.test-option').forEach((b) => b.classList.remove('test-option--selected'));
      btn.classList.add('test-option--selected');
    });
  });

  document.getElementById('test-next').addEventListener('click', () => {
    if (state.answers[state.current] === null) return;
    if (state.current < state.questions.length - 1) {
      state.current++;
      renderQuestion(el);
    } else {
      finishTest();
    }
  });
}

function finishTest() {
  clearInterval(state.timer);
  const activeEl = document.getElementById('test-active');
  const resultEl = document.getElementById('test-result');
  const setupEl = document.getElementById('test-setup');
  activeEl.hidden = true;
  resultEl.hidden = false;

  const score = calculateScore(state.answers, state.questions);
  resultEl.innerHTML = `
    <div class="card card--elevated" style="text-align:center;padding:var(--space-10);">
      <div class="test-score">${score.percent}%</div>
      <p style="color:var(--color-text-muted);margin-bottom:var(--space-6);">${t('tests.score')}: ${score.correct} / ${score.total}</p>
      <button class="btn btn--primary" id="test-retry">${t('tests.retry')}</button>
    </div>`;

  document.getElementById('test-retry').addEventListener('click', () => {
    resultEl.hidden = true;
    setupEl.hidden = false;
  });
}

init();
