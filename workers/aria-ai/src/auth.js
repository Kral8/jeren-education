import { jsonResponse } from './cors.js';
import { sha256, randomToken, normalizeCode } from './crypto.js';

const SESSION_TTL_SEC = 60 * 60 * 24 * 7; // 7 days

export async function getSession(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) return null;
  const raw = await env.TEACHERS_KV.get(`session:${token}`);
  if (!raw) return null;
  const session = JSON.parse(raw);
  if (session.expiresAt && Date.now() > session.expiresAt) {
    await env.TEACHERS_KV.delete(`session:${token}`);
    return null;
  }
  return session;
}

async function createSession(env, data) {
  const token = randomToken(32);
  const session = {
    ...data,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_SEC * 1000,
  };
  await env.TEACHERS_KV.put(`session:${token}`, JSON.stringify(session), {
    expirationTtl: SESSION_TTL_SEC,
  });
  return { token, session };
}

async function findTeacherByCodeHash(env, codeHash) {
  const listRaw = await env.TEACHERS_KV.get('teachers:list');
  const ids = listRaw ? JSON.parse(listRaw) : [];
  for (const id of ids) {
    const raw = await env.TEACHERS_KV.get(`teacher:${id}`);
    if (!raw) continue;
    const teacher = JSON.parse(raw);
    if (teacher.codeHash === codeHash && teacher.status === 'active') {
      return teacher;
    }
  }
  return null;
}

export async function handleAuthLogin(request, env, origin) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON' }, 400, origin);
  }

  const code = normalizeCode(body.code);
  if (!code) {
    return jsonResponse({ success: false, error: 'Code required' }, 400, origin);
  }

  const adminCode = env.JEREN_ADMIN_CODE;
  if (!adminCode) {
    console.error('JEREN_ADMIN_CODE secret missing');
    return jsonResponse({ success: false, error: 'Auth not configured' }, 503, origin);
  }

  const codeHash = await sha256(code);

  if (code === normalizeCode(adminCode)) {
    const { token, session } = await createSession(env, {
      role: 'admin',
      firstName: 'Джерен',
      lastName: 'Алламурдовна',
      displayName: 'Джерен Алламурдовна',
    });
    return jsonResponse({
      success: true,
      token,
      role: session.role,
      user: {
        firstName: session.firstName,
        lastName: session.lastName,
        displayName: session.displayName,
      },
    }, 200, origin);
  }

  const teacher = await findTeacherByCodeHash(env, codeHash);
  if (!teacher) {
    return jsonResponse({ success: false, error: 'Invalid code' }, 401, origin);
  }

  const { token, session } = await createSession(env, {
    role: 'teacher',
    teacherId: teacher.id,
    firstName: teacher.firstName,
    lastName: teacher.lastName,
    displayName: `${teacher.firstName} ${teacher.lastName}`,
  });

  return jsonResponse({
    success: true,
    token,
    role: session.role,
    user: {
      firstName: session.firstName,
      lastName: session.lastName,
      displayName: session.displayName,
    },
  }, 200, origin);
}

export async function handleAuthGuest(request, env, origin) {
  const { token, session } = await createSession(env, {
    role: 'guest',
    displayName: 'Гость',
  });
  return jsonResponse({
    success: true,
    token,
    role: session.role,
    user: { displayName: session.displayName },
  }, 200, origin);
}

export async function handleAuthSession(request, env, origin) {
  const session = await getSession(request, env);
  if (!session) {
    return jsonResponse({ success: false, error: 'Unauthorized' }, 401, origin);
  }
  return jsonResponse({
    success: true,
    role: session.role,
    user: {
      firstName: session.firstName,
      lastName: session.lastName,
      displayName: session.displayName,
    },
  }, 200, origin);
}

export async function handleAuthLogout(request, env, origin) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (token) await env.TEACHERS_KV.delete(`session:${token}`);
  return jsonResponse({ success: true }, 200, origin);
}

export function requireRole(session, roles) {
  return session && roles.includes(session.role);
}
