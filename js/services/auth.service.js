import { API } from '../config.js';

const TOKEN_KEY = 'jeren_session_token';
const USER_KEY = 'jeren_user';

export function getToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getUser() {
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getRole() {
  return getUser()?.role || null;
}

export function isAuthenticated() {
  return Boolean(getToken());
}

export function isTeacher() {
  const role = getRole();
  return role === 'teacher' || role === 'admin';
}

export function isAdmin() {
  return getRole() === 'admin';
}

export function isGuest() {
  return getRole() === 'guest';
}

function saveSession(token, user) {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new CustomEvent('authchange'));
}

export function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  window.dispatchEvent(new CustomEvent('authchange'));
}

export async function loginWithCode(code) {
  const response = await fetch(API.authLogin, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: code.trim() }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    console.error('[Auth] login failed', response.status, data);
    return { success: false, error: data.error || 'invalid' };
  }
  saveSession(data.token, { role: data.role, ...data.user });
  return { success: true, role: data.role, user: data.user };
}

export async function loginAsGuest() {
  const response = await fetch(API.authGuest, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    console.error('[Auth] guest failed', response.status, data);
    return { success: false };
  }
  saveSession(data.token, { role: data.role, ...data.user });
  return { success: true, role: data.role };
}

export async function verifySession() {
  const token = getToken();
  if (!token) return { success: false };

  const response = await fetch(API.authSession, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    clearSession();
    return { success: false };
  }
  saveSession(token, { role: data.role, ...data.user });
  return { success: true, role: data.role, user: data.user };
}

export async function logout() {
  const token = getToken();
  if (token) {
    try {
      await fetch(API.authLogout, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.warn('[Auth] logout request failed', err);
    }
  }
  clearSession();
}

export function authHeaders() {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export function getDisplayName() {
  const user = getUser();
  if (!user) return null;
  return user.displayName || [user.firstName, user.lastName].filter(Boolean).join(' ') || null;
}
