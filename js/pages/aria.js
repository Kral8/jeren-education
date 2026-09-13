import { t } from '../i18n/index.js';
import { sendMessage, isDemoMode } from '../services/aria.service.js';

export function init() {
  const messagesEl = document.getElementById('aria-messages');
  const input = document.getElementById('aria-input');
  const sendBtn = document.getElementById('aria-send');
  if (!messagesEl) return;

  addMessage(t('aria.greeting'), 'bot');

  async function handleSend() {
    const text = input.value.trim();
    if (!text) return;
    addMessage(text, 'user');
    input.value = '';
    sendBtn.disabled = true;

    const result = await sendMessage(text);
    addMessage(result.reply || t('common.error'), 'bot');
    sendBtn.disabled = false;
  }

  sendBtn?.addEventListener('click', handleSend);
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  });

  if (isDemoMode()) {
    document.getElementById('aria-disclaimer').hidden = false;
  }
}

function addMessage(text, role) {
  const el = document.getElementById('aria-messages');
  const msg = document.createElement('div');
  msg.className = `aria-msg aria-msg--${role}`;
  msg.textContent = text;
  el.appendChild(msg);
  el.scrollTop = el.scrollHeight;
}

init();
