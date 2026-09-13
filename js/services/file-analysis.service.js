import { API } from '../config.js';
import { authHeaders } from './auth.service.js';

const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
  'application/pdf', 'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/rtf', 'text/rtf',
]);

const MAX_SIZE = 8 * 1024 * 1024;

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = String(result).split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function validateFile(file) {
  if (!file) return { ok: false, error: 'no_file' };
  if (file.size > MAX_SIZE) return { ok: false, error: 'too_large' };
  const mime = file.type || 'application/octet-stream';
  if (!ALLOWED_TYPES.has(mime)) return { ok: false, error: 'unsupported_type' };
  return { ok: true, mime };
}

export async function analyzeWork(file, meta) {
  const check = validateFile(file);
  if (!check.ok) return { success: false, error: check.error };

  const data = await fileToBase64(file);

  const response = await fetch(API.analyzeWork, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      file: { data, mimeType: check.mime, name: file.name },
      meta: {
        subject: meta.subject || '',
        grade: meta.grade || '',
        topic: meta.topic || '',
        workType: meta.workType || '',
        gradingSystem: meta.gradingSystem || '5-балльная',
        maxGrade: meta.maxGrade || 5,
      },
    }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || !result.success) {
    console.error('[Analyze] failed', response.status, result);
    return {
      success: false,
      error: result.error || 'analysis_failed',
      code: result.code,
      debug: result.debug,
    };
  }

  return { success: true, analysis: result.analysis || result.result };
}
