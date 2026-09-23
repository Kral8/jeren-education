import { t } from '../i18n/index.js';
import { loginWithCode, loginAsGuest, isAuthenticated, getRole } from '../services/auth.service.js';
import {
  submitAccessRequest,
  checkAccessRequestStatus,
  getPendingRequest,
  clearPendingRequest,
  savePendingRequest,
} from '../services/access-request.service.js';
import {
  getCountries,
  getCountryById,
  getRegions,
  getCities,
  getInstitutions,
  localizedName,
  formatPhone,
  validatePhone,
} from '../services/geography.service.js';

const POLL_MS = 5000;
let pollTimer = null;
let activeDeliveryMethod = 'email';
let currentInstitutions = [];

function redirectAfterLogin(role) {
  window.location.href = role === 'admin' ? 'admin.html' : 'dashboard.html';
}

function showModal(id) {
  const overlay = document.getElementById(id);
  if (!overlay) return;
  overlay.hidden = false;
  overlay.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}

function hideModal(id) {
  const overlay = document.getElementById(id);
  if (!overlay) return;
  overlay.hidden = true;
  overlay.setAttribute('aria-hidden', 'true');
  if (!document.querySelector('.modal-overlay:not([hidden])')) {
    document.body.classList.remove('modal-open');
  }
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function updatePendingModalText() {
  const subtitle = document.querySelector('#request-sent-modal .modal__subtitle');
  if (!subtitle) return;
  subtitle.textContent = activeDeliveryMethod === 'email'
    ? t('login.requestSentTextEmail')
    : t('login.requestSentText');
}

function showApprovedCode(code) {
  stopPolling();
  hideModal('request-sent-modal');
  const codeEl = document.getElementById('approved-code');
  if (codeEl) codeEl.textContent = code;
  showModal('request-approved-modal');
}

function showEmailSent(emailMasked) {
  stopPolling();
  hideModal('request-sent-modal');
  const textEl = document.getElementById('email-sent-text');
  if (textEl) {
    textEl.textContent = emailMasked
      ? t('login.emailSentTextAddress').replace('{email}', emailMasked)
      : t('login.emailSentText');
  }
  showModal('request-email-modal');
}

function handleApprovedResult(result) {
  clearPendingRequest();
  if (result.deliveryMethod === 'email' && result.emailSent && !result.accessCode) {
    showEmailSent(result.emailMasked);
    return;
  }
  if (result.accessCode) {
    if (result.emailFailed) {
      const codeEl = document.getElementById('approved-code');
      if (codeEl) codeEl.textContent = result.accessCode;
      showModal('request-approved-modal');
      const subtitle = document.querySelector('#request-approved-modal .modal__subtitle');
      if (subtitle) subtitle.textContent = t('login.emailFallbackText');
      stopPolling();
      hideModal('request-sent-modal');
      return;
    }
    showApprovedCode(result.accessCode);
  }
}

async function pollRequestStatus(requestId, clientToken) {
  const result = await checkAccessRequestStatus(requestId, clientToken);
  if (!result.success) return;
  if (result.status === 'approved') {
    handleApprovedResult(result);
  } else if (result.status === 'rejected') {
    stopPolling();
    clearPendingRequest();
    hideModal('request-sent-modal');
    const errorEl = document.getElementById('request-error');
    if (errorEl) {
      errorEl.textContent = t('login.requestRejected');
      errorEl.hidden = false;
    }
    showModal('request-modal');
  }
}

function startPolling(requestId, clientToken, deliveryMethod) {
  activeDeliveryMethod = deliveryMethod || 'screen';
  savePendingRequest(requestId, clientToken, activeDeliveryMethod);
  stopPolling();
  pollRequestStatus(requestId, clientToken);
  pollTimer = setInterval(() => pollRequestStatus(requestId, clientToken), POLL_MS);
}

async function resumePendingRequest() {
  const pending = getPendingRequest();
  if (!pending?.requestId || !pending?.clientToken) return;

  activeDeliveryMethod = pending.deliveryMethod || 'screen';
  const result = await checkAccessRequestStatus(pending.requestId, pending.clientToken);
  if (!result.success) {
    clearPendingRequest();
    return;
  }
  if (result.status === 'approved') {
    handleApprovedResult(result);
    return;
  }
  if (result.status === 'pending') {
    updatePendingModalText();
    showModal('request-sent-modal');
    startPolling(pending.requestId, pending.clientToken, activeDeliveryMethod);
  }
}

function openCodeLogin() {
  hideModal('request-email-modal');
  hideModal('request-approved-modal');
  const choices = document.getElementById('auth-choices');
  const form = document.getElementById('auth-form');
  if (choices && form) {
    choices.hidden = true;
    form.hidden = false;
    document.getElementById('auth-code')?.focus();
  }
}

function populateCountrySelect(select) {
  if (!select) return;
  select.replaceChildren();
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = t('login.countryPlaceholder');
  placeholder.disabled = true;
  placeholder.selected = true;
  select.appendChild(placeholder);
  getCountries().forEach((country) => {
    const opt = document.createElement('option');
    opt.value = country.id;
    opt.textContent = `${country.flag} ${localizedName(country)}`;
    select.appendChild(opt);
  });
}

function fillSelect(select, items, placeholderKey, valueKey = 'id') {
  if (!select) return;
  select.replaceChildren();
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = t(placeholderKey);
  placeholder.disabled = true;
  placeholder.selected = true;
  select.appendChild(placeholder);
  items.forEach((item) => {
    const opt = document.createElement('option');
    opt.value = item[valueKey] || item;
    opt.textContent = typeof item === 'string' ? item : localizedName(item);
    select.appendChild(opt);
  });
}

function updatePhonePrefix(countryId) {
  const country = getCountryById(countryId);
  const flagEl = document.getElementById('phone-flag');
  const codeEl = document.getElementById('phone-code');
  const phoneInput = document.getElementById('req-phone');
  if (flagEl) flagEl.textContent = country?.flag || '🌐';
  if (codeEl) codeEl.textContent = country?.dialCode || '+';
  if (phoneInput && country) {
    phoneInput.placeholder = '0'.repeat(country.phoneLength);
    phoneInput.maxLength = country.phoneLength + 4;
  }
}

function hideOrgSuggestions() {
  const list = document.getElementById('org-suggestions');
  if (list) list.hidden = true;
}

function renderOrgSuggestions(filter = '') {
  const list = document.getElementById('org-suggestions');
  const orgInput = document.getElementById('req-org');
  if (!list || !orgInput) return;

  const query = filter.trim().toLowerCase();
  const matches = currentInstitutions.filter((name) =>
    !query || name.toLowerCase().includes(query),
  );

  list.replaceChildren();
  if (!matches.length) {
    list.hidden = true;
    return;
  }

  matches.slice(0, 8).forEach((name) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'autocomplete-field__item';
    btn.textContent = name;
    btn.addEventListener('click', () => {
      orgInput.value = name;
      hideOrgSuggestions();
    });
    list.appendChild(btn);
  });
  list.hidden = false;
}

function refreshInstitutions(countryId, regionId, cityId) {
  currentInstitutions = getInstitutions(countryId, regionId, cityId);
  const orgInput = document.getElementById('req-org');
  const orgHint = document.getElementById('org-hint');
  if (!orgInput) return;

  orgInput.value = '';
  if (cityId && currentInstitutions.length) {
    orgInput.disabled = false;
    orgInput.placeholder = t('login.organizationPlaceholder');
    if (orgHint) {
      orgHint.textContent = t('login.organizationHintCount').replace('{count}', String(currentInstitutions.length));
    }
  } else {
    orgInput.disabled = true;
    orgInput.placeholder = t('login.organizationSelectCity');
    if (orgHint) orgHint.textContent = t('login.organizationHint');
  }
  hideOrgSuggestions();
}

function initRegistrationForm() {
  const countrySelect = document.getElementById('req-country');
  const regionSelect = document.getElementById('req-region');
  const citySelect = document.getElementById('req-city');
  const orgInput = document.getElementById('req-org');

  populateCountrySelect(countrySelect);

  countrySelect?.addEventListener('change', () => {
    const countryId = countrySelect.value;
    updatePhonePrefix(countryId);
    fillSelect(regionSelect, getRegions(countryId), 'login.regionPlaceholder');
    regionSelect.disabled = !countryId;
    citySelect.replaceChildren();
    citySelect.disabled = true;
    refreshInstitutions('', '', '');
  });

  regionSelect?.addEventListener('change', () => {
    const countryId = countrySelect?.value;
    const regionId = regionSelect.value;
    fillSelect(citySelect, getCities(countryId, regionId), 'login.cityPlaceholder');
    citySelect.disabled = !regionId;
    refreshInstitutions(countryId, regionId, '');
  });

  citySelect?.addEventListener('change', () => {
    refreshInstitutions(countrySelect?.value, regionSelect?.value, citySelect.value);
  });

  orgInput?.addEventListener('input', () => renderOrgSuggestions(orgInput.value));
  orgInput?.addEventListener('focus', () => {
    if (!orgInput.disabled) renderOrgSuggestions(orgInput.value);
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#org-autocomplete')) hideOrgSuggestions();
  });

  window.addEventListener('langchange', () => {
    const countryId = countrySelect?.value;
    const regionId = regionSelect?.value;
    if (countryId) {
      populateCountrySelect(countrySelect);
      countrySelect.value = countryId;
      fillSelect(regionSelect, getRegions(countryId), 'login.regionPlaceholder');
      if (regionId) {
        regionSelect.value = regionId;
        fillSelect(citySelect, getCities(countryId, regionId), 'login.cityPlaceholder');
        const cityId = citySelect?.value;
        if (cityId) citySelect.value = cityId;
      }
    }
  });
}

function resetRegistrationForm() {
  const form = document.getElementById('request-form');
  form?.reset();
  document.querySelector('input[name="delivery"][value="email"]')?.click();
  const regionSelect = document.getElementById('req-region');
  const citySelect = document.getElementById('req-city');
  const orgInput = document.getElementById('req-org');
  if (regionSelect) {
    regionSelect.disabled = true;
    regionSelect.replaceChildren();
  }
  if (citySelect) {
    citySelect.disabled = true;
    citySelect.replaceChildren();
  }
  if (orgInput) orgInput.disabled = true;
  currentInstitutions = [];
  hideOrgSuggestions();
  populateCountrySelect(document.getElementById('req-country'));
  updatePhonePrefix('');
}

function validateRegistrationForm() {
  const errorBox = document.getElementById('request-error');
  const countryId = document.getElementById('req-country')?.value;
  const regionId = document.getElementById('req-region')?.value;
  const cityId = document.getElementById('req-city')?.value;
  const phone = document.getElementById('req-phone')?.value.trim();
  const org = document.getElementById('req-org')?.value.trim();

  if (!countryId || !regionId || !cityId) {
    errorBox.textContent = t('login.validationLocation');
    errorBox.hidden = false;
    return false;
  }
  if (!validatePhone(countryId, phone)) {
    errorBox.textContent = t('login.validationPhone');
    errorBox.hidden = false;
    return false;
  }
  if (!org) {
    errorBox.textContent = t('login.validationOrganization');
    errorBox.hidden = false;
    return false;
  }
  errorBox.hidden = true;
  return true;
}

async function init() {
  if (isAuthenticated()) {
    redirectAfterLogin(getRole());
    return;
  }

  initRegistrationForm();

  const choices = document.getElementById('auth-choices');
  const form = document.getElementById('auth-form');
  const codeInput = document.getElementById('auth-code');
  const errorEl = document.getElementById('auth-error');

  document.getElementById('btn-has-code')?.addEventListener('click', () => {
    choices.hidden = true;
    form.hidden = false;
    codeInput?.focus();
  });

  document.getElementById('btn-back-choices')?.addEventListener('click', () => {
    form.hidden = true;
    choices.hidden = false;
    errorEl.hidden = true;
  });

  document.getElementById('btn-guest')?.addEventListener('click', async () => {
    const result = await loginAsGuest();
    if (result.success) redirectAfterLogin('guest');
  });

  document.getElementById('btn-request-code')?.addEventListener('click', () => {
    document.getElementById('request-error')?.setAttribute('hidden', '');
    showModal('request-modal');
  });

  document.getElementById('request-modal-close')?.addEventListener('click', () => hideModal('request-modal'));
  document.getElementById('request-sent-close')?.addEventListener('click', () => hideModal('request-sent-modal'));
  document.getElementById('email-sent-login')?.addEventListener('click', openCodeLogin);

  document.querySelectorAll('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay && overlay.id !== 'request-approved-modal') {
        hideModal(overlay.id);
      }
    });
  });

  document.getElementById('request-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateRegistrationForm()) return;

    const errorBox = document.getElementById('request-error');
    const submitBtn = document.getElementById('request-submit');
    errorBox.hidden = true;
    submitBtn.disabled = true;

    const countryId = document.getElementById('req-country')?.value;
    const regionId = document.getElementById('req-region')?.value;
    const cityId = document.getElementById('req-city')?.value;
    const country = getCountryById(countryId);
    const region = getRegions(countryId).find((r) => r.id === regionId);
    const city = getCities(countryId, regionId).find((c) => c.id === cityId);
    const deliveryMethod = document.querySelector('input[name="delivery"]:checked')?.value || 'email';
    const phoneNational = document.getElementById('req-phone')?.value.trim();

    const payload = {
      lastName: document.getElementById('req-last')?.value.trim(),
      firstName: document.getElementById('req-first')?.value.trim(),
      country: country ? localizedName(country) : countryId,
      countryId,
      region: region ? localizedName(region) : regionId,
      regionId,
      city: city ? localizedName(city) : cityId,
      cityId,
      phone: formatPhone(countryId, phoneNational),
      email: document.getElementById('req-email')?.value.trim(),
      organization: document.getElementById('req-org')?.value.trim(),
      deliveryMethod,
    };

    const result = await submitAccessRequest(payload);
    submitBtn.disabled = false;

    if (!result.success) {
      errorBox.textContent = result.error || t('login.requestError');
      errorBox.hidden = false;
      return;
    }

    activeDeliveryMethod = deliveryMethod;
    hideModal('request-modal');
    resetRegistrationForm();

    if (result.status === 'approved' && deliveryMethod === 'email' && result.emailSent) {
      clearPendingRequest();
      showEmailSent(result.emailMasked);
      return;
    }

    if (result.status === 'approved' && result.accessCode) {
      clearPendingRequest();
      if (result.emailFailed) {
        handleApprovedResult({
          deliveryMethod,
          accessCode: result.accessCode,
          emailFailed: true,
        });
      } else {
        showApprovedCode(result.accessCode);
      }
      return;
    }

    updatePendingModalText();
    showModal('request-sent-modal');
    startPolling(result.requestId, result.clientToken, deliveryMethod);
  });

  document.getElementById('approved-use-code')?.addEventListener('click', async () => {
    const code = document.getElementById('approved-code')?.textContent?.trim();
    if (!code || code === '—') return;
    const result = await loginWithCode(code);
    if (result.success) redirectAfterLogin(result.role);
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

  await resumePendingRequest();
}

init();
