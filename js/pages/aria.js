import { t } from '../i18n/index.js';
import { sendMessage } from '../services/aria.service.js';
import { getDisplayName, getRole } from '../services/auth.service.js';
import { renderMarkdown } from '../utils/markdown.js';

const history = [];
let isSending = false;

const QUICK_ACTIONS = [
  'lessonPlan',
  'createTest',
  'createTasks',
  'checkText',
  'courseworkHelp',
  'explainTopic',
  'analyzeWork',
];

export function init() {
  const messagesEl = document.getElementById('aria-messages');
  const input = document.getElementById('aria-input');
  const sendBtn = document.getElementById('aria-send');
  const quickEl = document.getElementById('aria-quick-actions');
  const statusEl = document.getElementById('aria-status');
  if (!messagesEl) return;

  renderQuickActions(quickEl, input);
  addMessage(getGreeting(), 'bot');

  async function handleSend(forcedText) {
    const text = (forcedText ?? input.value).trim();
    if (!text || isSending) return;

    addMessage(text, 'user');
    if (!forcedText) input.value = '';
    setSending(true, sendBtn, input, statusEl);

    const result = await sendMessage(text, history);
    removeTyping(messagesEl);

    if (result.success) {
      history.push({ role: 'user', text });
      history.push({ role: 'assistant', text: result.reply });
      addMessage(result.reply, 'bot', true);
      setStatus(statusEl, t('aria.statusOnline'));
    } else {
      console.error('[Aria UI] failed', result.code, result.debug || result.error);
      addMessage(t('aria.unavailable'), 'bot');
      setStatus(statusEl, t('aria.statusOffline'));
    }

    setSending(false, sendBtn, input, statusEl);
    input?.focus();
  }

  sendBtn?.addEventListener('click', () => handleSend());
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  input?.addEventListener('focus', () => {
    window.setTimeout(() => {
      input.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 300);
  });

  window.addEventListener('langchange', () => {
    if (quickEl) renderQuickActions(quickEl, input);
  });
}

function renderQuickActions(container, input) {
  if (!container) return;
  container.replaceChildren();
  QUICK_ACTIONS.forEach((key) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'aria-quick-btn';
    btn.textContent = t(`aria.actions.${key}`);
    btn.addEventListener('click', () => {
      const prompt = t(`aria.prompts.${key}`);
      if (input) input.value = prompt;
      input?.focus();
    });
    container.appendChild(btn);
  });
}

function setSending(active, sendBtn, input, statusEl) {
  isSending = active;
  if (sendBtn) sendBtn.disabled = active;
  if (input) input.disabled = active;
  if (active) {
    showTyping(document.getElementById('aria-messages'));
    setStatus(statusEl, t('aria.statusTyping'));
  }
}

function setStatus(el, text) {
  if (el) el.textContent = text;
}

function showTyping(container) {
  removeTyping(container);
  const msg = document.createElement('div');
  msg.className = 'aria-msg aria-msg--bot aria-msg--typing';
  msg.id = 'aria-typing';
  msg.setAttribute('aria-live', 'polite');
  msg.textContent = t('aria.typing');
  container.appendChild(msg);
  scrollMessagesToBottom(container);
}

function removeTyping(container) {
  container?.querySelector('#aria-typing')?.remove();
}

function scrollMessagesToBottom(container) {
  if (!container) return;
  requestAnimationFrame(() => {
    container.scrollTop = container.scrollHeight;
  });
}

function addMessage(text, role, markdown = false) {
  const container = document.getElementById('aria-messages');
  const msg = document.createElement('div');
  msg.className = `aria-msg aria-msg--${role} aria-msg--enter`;

  if (role === 'bot' && markdown) {
    const body = document.createElement('div');
    body.className = 'aria-msg__body';
    renderMarkdown(text, body);
    msg.appendChild(body);
  } else {
    msg.classList.add('aria-msg--plain');
    msg.textContent = text;
  }

  container.appendChild(msg);
  scrollMessagesToBottom(container);
}

function getGreeting() {
  const name = getDisplayName();
  const role = getRole();
  if (name && role === 'teacher') {
    return `Здравствуйте, ${name}! Я Ария — ваш интеллектуальный помощник JEREN EDUCATION.\n\n${t('aria.greeting').split('\n\n').slice(2).join('\n\n')}`;
  }
  return t('aria.greeting');
}

init();
