/** JEREN EDUCATION — API configuration (no secrets here) */
export const API_BASE = 'https://jeren-aria-ai.jeren-education.workers.dev';

export const API = {
  aria: `${API_BASE}/api/aria`,
  analyzeWork: `${API_BASE}/api/analyze/work`,
  authLogin: `${API_BASE}/api/auth/login`,
  authGuest: `${API_BASE}/api/auth/guest`,
  authSession: `${API_BASE}/api/auth/session`,
  authLogout: `${API_BASE}/api/auth/logout`,
  adminTeachers: `${API_BASE}/api/admin/teachers`,
  accessRequests: `${API_BASE}/api/access-requests`,
  accessRequestStatus: `${API_BASE}/api/access-requests/status`,
  adminAccessRequests: `${API_BASE}/api/admin/access-requests`,
  adminEmailTest: `${API_BASE}/api/admin/email/test`,
};
