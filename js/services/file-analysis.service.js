import { API } from '../config.js';
import { authHeaders } from './auth.service.js';
import { buildAnalysisFallback, buildAnalysisFromText } from './work-analysis-fallback.js';
import { extractDocumentText } from '../utils/extract-document-text.js';

const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
  'application/pdf', 'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/rtf', 'text/rtf',
]);

const EXT_MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.rtf': 'application/rtf',
};

const MAX_SIZE = 8 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 90000;
const RETRY_ATTEMPTS = 2;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extOf(name = '') {
  const match = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? `.${match[1]}` : '';
}

export function resolveFileMime(file) {
  if (file.type && ALLOWED_TYPES.has(file.type)) {
    return file.type;
  }
  const fromExt = EXT_MIME[extOf(file.name)];
  if (fromExt) return fromExt;
  return file.type || '';
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = String(result).split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('read_failed'));
    reader.readAsDataURL(file);
  });
}

export function validateFile(file) {
  if (!file) return { ok: false, error: 'no_file' };
  if (file.size > MAX_SIZE) return { ok: false, error: 'too_large' };
  const mime = resolveFileMime(file);
  if (!mime || !ALLOWED_TYPES.has(mime)) {
    return { ok: false, error: 'unsupported_type' };
  }
  return { ok: true, mime };
}

export async function readDocumentText(file, mime) {
  return extractDocumentText(file, mime);
}

async function requestAnalysis(file, meta, mime, extractedText) {
  const data = await fileToBase64(file);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(API.analyzeWork, {
      method: 'POST',
      headers: authHeaders(),
      signal: controller.signal,
      body: JSON.stringify({
        file: { data, mimeType: mime, name: file.name },
        extractedText,
        meta: {
          subject: meta.subject || '',
          grade: meta.grade || '',
          topic: meta.topic || '',
          gradingSystem: '5-балльная',
          maxGrade: 5,
        },
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.success) {
      return {
        success: false,
        error: result.error || 'analysis_failed',
        code: result.code,
        debug: result.debug,
      };
    }

    return {
      success: true,
      analysis: result.analysis || result.result,
      extractedText: result.extractedText || extractedText,
      fallback: Boolean(result.fallback),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function analyzeWork(file, meta, extractedText = '') {
  const check = validateFile(file);
  if (!check.ok) return { success: false, error: check.error };

  let workText = extractedText || '';
  if (!workText) {
    workText = await readDocumentText(file, check.mime);
  }

  for (let attempt = 0; attempt < RETRY_ATTEMPTS; attempt += 1) {
    if (attempt > 0) await sleep(1500);
    try {
      const result = await requestAnalysis(file, meta, check.mime, workText);
      if (result.success) {
        return { ...result, extractedText: workText };
      }
    } catch (error) {
      console.warn('[Analyze] attempt failed', error?.message || error);
    }
  }

  const fromText = buildAnalysisFromText(workText, meta);
  if (fromText) {
    return {
      success: true,
      fallback: true,
      extractedText: workText,
      analysis: fromText,
    };
  }

  return {
    success: true,
    fallback: true,
    extractedText: workText,
    analysis: buildAnalysisFallback(meta, file.name, 'резервный режим', workText),
  };
}

export function extractSuggestedGrade(analysis) {
  if (!analysis) return null;
  const bold = analysis.match(/\*\*(\d+)\s*\/\s*(\d+)\*\*/);
  if (bold) return { score: bold[1], max: bold[2] };
  const text = analysis.match(/поставить\s+\*\*(\d+)\*\*/i) || analysis.match(/оценк[а-я]*\s+\*\*(\d+)\*\*/i);
  if (text) return { score: text[1], max: '5' };
  return null;
}
