import { t } from '../i18n/index.js';
import { loginWithCode, loginAsGuest, isAuthenticated, getRole } from '../services/auth.service.js';

function redirectAfterLogin(role) {
  if (role === 'admin') {
    window.location.href = 'admin.html';
  } else {
    window.location.href = 'dashboard.html';
  }
}

async function init() {
  if (isAuthenticated()) {
    redirectAfterLogin(getRole());
    return;
  }

  const choices = document.getElementById('auth-choices');
  const form = document.getElementById('auth-form');
  const codeInput = document.getElementById('auth-code');
  const errorEl = document.getElementById('auth-error');

  document.getElementById('btn-has-code')?.addEventListener('click', () => {
    choices.hidden = true;
    form.hidden = false;
    codeInput?.focus();
  });

  document.getElementById('btn-guest')?.addEventListener('click', async () => {
    const result = await loginAsGuest();
    if (result.success) redirectAfterLogin('guest');
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    const code = codeInput?.value || '';
    const result = await loginWithCode(code);
    if (result.success) {
      redirectAfterLogin(result.role);
    } else {
      errorEl.textContent = t('login.invalidCode');
      errorEl.hidden = false;
    }
  });
}

init();
