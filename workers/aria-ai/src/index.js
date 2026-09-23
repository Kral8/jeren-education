import { isAllowedOrigin, jsonResponse, preflight } from './cors.js';
import { getSession, handleAuthLogin, handleAuthGuest, handleAuthSession, handleAuthLogout } from './auth.js';
import { handleTeachersList, handleTeacherCreate, handleTeacherUpdate } from './teachers.js';
import {
  handleAccessRequestCreate,
  handleAccessRequestStatus,
  handleAccessRequestsList,
  handleAccessRequestUpdate,
} from './access-requests.js';
import { sendAccessCodeEmail } from './email.js';
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
      if (path === '/api/access-requests' && request.method === 'POST') {
        return handleAccessRequestCreate(request, env, origin);
      }
      if (path === '/api/access-requests/status' && request.method === 'GET') {
        return handleAccessRequestStatus(request, env, origin);
      }

      const session = await getSession(request, env);

      if (path === '/api/admin/email/test' && request.method === 'POST') {
        if (!session || session.role !== 'admin') {
          return jsonResponse({ success: false, error: 'Forbidden' }, 403, origin);
        }
        let testBody;
        try {
          testBody = await request.json();
        } catch {
          return jsonResponse({ success: false, error: 'Invalid JSON' }, 400, origin);
        }
        const emailResult = await sendAccessCodeEmail(
          env,
          testBody.email,
          testBody.code || 'JER-TEST-000',
          testBody.firstName || 'Test',
          testBody.lastName || '',
        );
        return jsonResponse({ success: emailResult.success, ...emailResult }, emailResult.success ? 200 : 502, origin);
      }

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
      if (path === '/api/admin/access-requests' && request.method === 'GET') {
        return handleAccessRequestsList(request, env, origin, session);
      }
      const requestMatch = path.match(/^\/api\/admin\/access-requests\/([a-f0-9]+)$/);
      if (requestMatch && request.method === 'PATCH') {
        return handleAccessRequestUpdate(request, env, origin, session, requestMatch[1]);
      }

      return jsonResponse({ error: 'Not found' }, 404, origin);
    } catch (err) {
      console.error('Worker unhandled error', err);
      return jsonResponse({ success: false, error: 'Internal error', code: 'INTERNAL' }, 500, origin);
    }
  },
};
