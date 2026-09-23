import { API } from '../config.js';
import { authHeaders } from './auth.service.js';

const STORAGE_KEY = 'jeren_access_request';

export function savePendingRequest(requestId, clientToken, deliveryMethod = 'screen') {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    requestId,
    clientToken,
    deliveryMethod,
    savedAt: Date.now(),
  }));
}

export function getPendingRequest() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearPendingRequest() {
  localStorage.removeItem(STORAGE_KEY);
}

export async function submitAccessRequest(payload) {
  const response = await fetch(API.accessRequests, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    return { success: false, error: data.error || 'Request failed' };
  }
  if (data.status !== 'approved') {
    savePendingRequest(data.requestId, data.clientToken, payload.deliveryMethod || 'email');
  }
  return {
    success: true,
    requestId: data.requestId,
    clientToken: data.clientToken,
    status: data.status || 'pending',
    deliveryMethod: payload.deliveryMethod,
    emailSent: Boolean(data.emailSent),
    emailFailed: Boolean(data.emailFailed),
    emailMasked: data.emailMasked || null,
    accessCode: data.accessCode || null,
    error: data.error || null,
  };
}

export async function checkAccessRequestStatus(requestId, clientToken) {
  const url = new URL(API.accessRequestStatus);
  url.searchParams.set('requestId', requestId);
  url.searchParams.set('clientToken', clientToken);
  const response = await fetch(url.toString());
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    return { success: false, error: data.error };
  }
  return {
    success: true,
    status: data.status,
    accessCode: data.accessCode || null,
    deliveryMethod: data.deliveryMethod || data.request?.deliveryMethod || 'screen',
    emailSent: Boolean(data.emailSent),
    emailFailed: Boolean(data.emailFailed),
    emailMasked: data.emailMasked || null,
    request: data.request,
  };
}

export async function listAccessRequests() {
  const response = await fetch(API.adminAccessRequests, { headers: authHeaders() });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    return { success: false, error: data.error };
  }
  return { success: true, requests: data.requests };
}

export async function resolveAccessRequest(id, action) {
  const response = await fetch(`${API.adminAccessRequests}/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ action }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    return { success: false, error: data.error || data.emailError };
  }
  return {
    success: true,
    request: data.request,
    accessCode: data.accessCode,
    emailError: data.emailError,
  };
}

export async function testEmail(email, code, firstName, lastName) {
  const response = await fetch(API.adminEmailTest, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ email, code, firstName, lastName }),
  });
  const data = await response.json().catch(() => ({}));
  return { success: Boolean(data.success), error: data.error, ...data };
}
