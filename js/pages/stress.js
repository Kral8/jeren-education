import { t } from '../i18n/index.js';
import { loadStressWords, getStats, updateStats, shuffleWords } from '../services/stress.service.js';

const basePath = document.body.dataset.base || '../';

let words = [];
let index = 0;
let mode = 'training';
let answered = false;

export async function init() {
  words = shuffleWords(await loadStressWords(basePath));
  renderStats();
  renderWord();

  document.getElementById('stress-mode-training')?.addEventListener('click', () => { mode = 'training'; reset(); });
  document.getElementById('stress-mode-test')?.addEventListener('click', () => { mode = 'test'; reset(); });
  document.getElementById('stress-next')?.addEventListener('click', nextWord);
}

function reset() {
  index = 0;
  words = shuffleWords(words);
  answered = false;
  renderWord();
}

function renderStats() {
  const stats = getStats();
  const el = document.getElementById('stress-stats');
  if (!el) return;
  el.innerHTML = `
    <div class="stress-stat"><div class="stress-stat__val">${stats.level}</div><div class="stress-stat__lbl">${t('stress.level')}</div></div>
    <div class="stress-stat"><div class="stress-stat__val">${stats.streak}</div><div class="stress-stat__lbl">${t('stress.streak')}</div></div>
    <div class="stress-stat"><div class="stress-stat__val">${stats.correct}/${stats.total}</div><div class="stress-stat__lbl">${t('stress.total')}</div></div>`;
}

function renderWord() {
  const w = words[index];
  if (!w) return;
  answered = false;

  document.getElementById('stress-word').textContent = w.word;
  document.getElementById('stress-options').innerHTML = w.options.map((opt) =>
    `<button class="stress-option" data-opt="${opt}">${opt}</button>`
  ).join('');
  document.getElementById('stress-feedback').innerHTML = '';
  document.getElementById('stress-next').hidden = true;

  document.querySelectorAll('.stress-option').forEach((btn) => {
    btn.addEventListener('click', () => selectOption(btn, w));
  });
}

function selectOption(btn, w) {
  if (answered) return;
  answered = true;
  const chosen = btn.dataset.opt;
  const correct = chosen === w.correct;

  document.querySelectorAll('.stress-option').forEach((b) => {
    b.disabled = true;
    if (b.dataset.opt === w.correct) b.classList.add('stress-option--correct');
    else if (b === btn && !correct) b.classList.add('stress-option--wrong');
  });

  updateStats(correct);
  renderStats();

  document.getElementById('stress-feedback').innerHTML = `
    <div style="font-weight:600;color:${correct ? 'var(--color-status-success)' : 'var(--color-status-error)'};margin-bottom:var(--space-3);">
      ${correct ? t('stress.correct') : t('stress.incorrect')}
    </div>
    <div><strong>${t('stress.correctAnswer')}:</strong> ${w.correct}</div>
    <div style="margin-top:var(--space-2);color:var(--color-text-muted);">${w.explanation}</div>`;

  document.getElementById('stress-next').hidden = false;
}

function nextWord() {
  index = (index + 1) % words.length;
  renderWord();
}

init();
