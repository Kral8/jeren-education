/**
 * ARIA AI Service — Frontend → Cloudflare Worker → Gemini
 * Retries + local fallback so the user always gets an answer.
 */

import { API } from '../config.js';
import { authHeaders, getUser } from './auth.service.js';
import { buildFallbackReply, canUseFallback } from './aria-fallback.js';

const RETRY_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 55000;
const RETRY_DELAY_MS = 1200;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestOnce(message, history) {
  const user = getUser();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(API.aria, {
      method: 'POST',
      headers: authHeaders(),
      signal: controller.signal,
      body: JSON.stringify({
        message,
        history: history.map((item) => ({ role: item.role, text: item.text })),
        context: user ? { role: user.role, displayName: user.displayName } : null,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.success === false) {
      console.warn('[Aria] attempt failed', {
        status: response.status,
        code: data.code,
        error: data.error,
        debug: data.debug,
        origin: window.location.origin,
      });
      return {
        success: false,
        error: data.error || 'unavailable',
        code: data.code,
        debug: data.debug,
      };
    }

    const reply = data.answer || data.text || data.reply || data.response || data.message;
    if (!reply?.trim()) {
      return { success: false, error: 'empty', code: 'EMPTY_REPLY' };
    }

    return { success: true, reply: reply.trim(), fallback: Boolean(data.fallback) };
  } catch (error) {
    const code = error?.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK';
    console.warn('[Aria] request error', code, error?.message || error);
    return { success: false, error: 'network', code };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function sendMessage(message, history = []) {
  const text = message?.trim();
  if (!text) {
    return { success: false, error: 'empty', code: 'NO_MESSAGE' };
  }

  for (let attempt = 0; attempt < RETRY_ATTEMPTS; attempt += 1) {
    if (attempt > 0) {
      await sleep(RETRY_DELAY_MS * attempt);
    }
    const result = await requestOnce(text, history);
    if (result.success) {
      return result;
    }
  }

  if (canUseFallback(text)) {
    console.info('[Aria] using local fallback');
    return {
      success: true,
      reply: buildFallbackReply(text),
      fallback: true,
    };
  }

  return { success: false, error: 'unavailable', code: 'EXHAUSTED' };
}

export function isDemoMode() {
  return false;
}
