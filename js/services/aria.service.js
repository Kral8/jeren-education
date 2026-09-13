/**
 * ARIA AI Service — Frontend → Cloudflare Worker → Gemini
 * NO API keys in frontend.
 */

import { API } from '../config.js';
import { authHeaders, getUser } from './auth.service.js';

export async function sendMessage(message, history = []) {
  try {
    const user = getUser();
    const response = await fetch(API.aria, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        message,
        history: history.map((item) => ({ role: item.role, text: item.text })),
        context: user ? { role: user.role, displayName: user.displayName } : null,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.success === false) {
      console.error('[Aria] request failed', {
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
    if (!reply) {
      console.error('[Aria] empty reply', data);
      return { success: false, error: 'empty', code: 'EMPTY_REPLY' };
    }

    return { success: true, reply };
  } catch (error) {
    console.error('[Aria] network error', error);
    return { success: false, error: 'network', code: 'NETWORK' };
  }
}

export function isDemoMode() {
  return false;
}
