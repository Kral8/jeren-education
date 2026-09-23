import { jsonResponse } from './cors.js';
import { sha256, randomToken, generateTeacherCode } from './crypto.js';
import { requireRole } from './auth.js';

async function getTeachersList(env) {
  const listRaw = await env.TEACHERS_KV.get('teachers:list');
  const ids = listRaw ? JSON.parse(listRaw) : [];
  const teachers = [];
  for (const id of ids) {
    const raw = await env.TEACHERS_KV.get(`teacher:${id}`);
    if (raw) teachers.push(JSON.parse(raw));
  }
  return teachers.sort((a, b) => b.createdAt - a.createdAt);
}

export async function createTeacherRecord(env, {
  firstName,
  lastName,
  organization = '',
  specialty = '',
  email = '',
  phone = '',
  country = '',
  region = '',
  city = '',
  birthYear = '',
  fromRequestId = null,
} = {}) {
  const plainCode = generateTeacherCode();
  const codeHash = await sha256(plainCode);
  const id = randomToken(8);
  const now = Date.now();
  const teacher = {
    id,
    firstName: String(firstName || '').trim(),
    lastName: String(lastName || '').trim(),
    codeHash,
    plainCode,
    status: 'active',
    organization: String(organization || '').trim(),
    specialty: String(specialty || '').trim(),
    email: String(email || '').trim(),
    phone: String(phone || '').trim(),
    country: String(country || '').trim(),
    region: String(region || '').trim(),
    city: String(city || '').trim(),
    birthYear: String(birthYear || '').trim(),
    fromRequestId,
    createdAt: now,
    updatedAt: now,
  };

  await env.TEACHERS_KV.put(`teacher:${id}`, JSON.stringify(teacher));

  const listRaw = await env.TEACHERS_KV.get('teachers:list');
  const ids = listRaw ? JSON.parse(listRaw) : [];
  ids.push(id);
  await env.TEACHERS_KV.put('teachers:list', JSON.stringify(ids));

  return teacher;
}

export async function handleTeachersList(request, env, origin, session) {
  if (!requireRole(session, ['admin'])) {
    return jsonResponse({ success: false, error: 'Forbidden' }, 403, origin);
  }
  const teachers = await getTeachersList(env);
  return jsonResponse({
    success: true,
    teachers: teachers.map((t) => ({
      id: t.id,
      firstName: t.firstName,
      lastName: t.lastName,
      code: t.plainCode,
      status: t.status,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    })),
  }, 200, origin);
}

export async function handleTeacherCreate(request, env, origin, session) {
  if (!requireRole(session, ['admin'])) {
    return jsonResponse({ success: false, error: 'Forbidden' }, 403, origin);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON' }, 400, origin);
  }

  const firstName = String(body.firstName || '').trim();
  const lastName = String(body.lastName || '').trim();
  if (!firstName || !lastName) {
    return jsonResponse({ success: false, error: 'Name required' }, 400, origin);
  }

  const teacher = await createTeacherRecord(env, { firstName, lastName });

  return jsonResponse({
    success: true,
    teacher: {
      id: teacher.id,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      code: teacher.plainCode,
      status: teacher.status,
      createdAt: teacher.createdAt,
    },
  }, 201, origin);
}

export async function handleTeacherUpdate(request, env, origin, session, teacherId) {
  if (!requireRole(session, ['admin'])) {
    return jsonResponse({ success: false, error: 'Forbidden' }, 403, origin);
  }

  const raw = await env.TEACHERS_KV.get(`teacher:${teacherId}`);
  if (!raw) {
    return jsonResponse({ success: false, error: 'Not found' }, 404, origin);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON' }, 400, origin);
  }

  const teacher = JSON.parse(raw);

  if (body.status === 'active' || body.status === 'inactive') {
    teacher.status = body.status;
  }
  if (body.regenerateCode) {
    teacher.plainCode = generateTeacherCode();
    teacher.codeHash = await sha256(teacher.plainCode);
  }
  if (body.delete) {
    await env.TEACHERS_KV.delete(`teacher:${teacherId}`);
    const listRaw = await env.TEACHERS_KV.get('teachers:list');
    const ids = (listRaw ? JSON.parse(listRaw) : []).filter((id) => id !== teacherId);
    await env.TEACHERS_KV.put('teachers:list', JSON.stringify(ids));
    return jsonResponse({ success: true, deleted: true }, 200, origin);
  }

  teacher.updatedAt = Date.now();
  await env.TEACHERS_KV.put(`teacher:${teacherId}`, JSON.stringify(teacher));

  return jsonResponse({
    success: true,
    teacher: {
      id: teacher.id,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      code: teacher.plainCode,
      status: teacher.status,
      createdAt: teacher.createdAt,
      updatedAt: teacher.updatedAt,
    },
  }, 200, origin);
}
