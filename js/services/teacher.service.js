import { API } from '../config.js';
import { authHeaders } from './auth.service.js';

export async function listTeachers() {
  const response = await fetch(API.adminTeachers, {
    headers: authHeaders(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    console.error('[Teachers] list failed', response.status, data);
    return { success: false, error: data.error };
  }
  return { success: true, teachers: data.teachers };
}

export async function createTeacher(firstName, lastName) {
  const response = await fetch(API.adminTeachers, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ firstName, lastName }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    return { success: false, error: data.error };
  }
  return { success: true, teacher: data.teacher };
}

export async function updateTeacher(id, payload) {
  const response = await fetch(`${API.adminTeachers}/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    return { success: false, error: data.error };
  }
  return { success: true, teacher: data.teacher, deleted: data.deleted };
}
