import { isAllowedOrigin, jsonResponse, preflight } from './cors.js';
import { getSession, handleAuthLogin, handleAuthGuest, handleAuthSession, handleAuthLogout } from './auth.js';
import { handleTeachersList, handleTeacherCreate, handleTeacherUpdate } from './teachers.js';
import { handleAriaChat } from './aria-handler.js';
import { handleAnalyzeWork } from './analyze.js';

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return preflight(origin);
    }

    if (!isAllowedOrigin(origin)) {
      console.error('Origin blocked:', origin);
      return jsonResponse({ success: false, error: 'Origin not allowed', code: 'CORS' }, 403, origin);
    }

    try {
      if (path === '/api/auth/login' && request.method === 'POST') {
        return handleAuthLogin(request, env, origin);
      }
      if (path === '/api/auth/guest' && request.method === 'POST') {
        return handleAuthGuest(request, env, origin);
      }
      if (path === '/api/auth/session' && request.method === 'GET') {
        return handleAuthSession(request, env, origin);
      }
      if (path === '/api/auth/logout' && request.method === 'POST') {
        return handleAuthLogout(request, env, origin);
      }

      const session = await getSession(request, env);

      if (path === '/api/aria' && request.method === 'POST') {
        return handleAriaChat(request, env, origin, session);
      }
      if (path === '/api/analyze/work' && request.method === 'POST') {
        return handleAnalyzeWork(request, env, origin, session);
      }
      if (path === '/api/admin/teachers' && request.method === 'GET') {
        return handleTeachersList(request, env, origin, session);
      }
      if (path === '/api/admin/teachers' && request.method === 'POST') {
        return handleTeacherCreate(request, env, origin, session);
      }
      const teacherMatch = path.match(/^\/api\/admin\/teachers\/([a-f0-9]+)$/);
      if (teacherMatch && request.method === 'PATCH') {
        return handleTeacherUpdate(request, env, origin, session, teacherMatch[1]);
      }

      return jsonResponse({ error: 'Not found' }, 404, origin);
    } catch (err) {
      console.error('Worker unhandled error', err);
      return jsonResponse({ success: false, error: 'Internal error', code: 'INTERNAL' }, 500, origin);
    }
  },
};
