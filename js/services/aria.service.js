/**
 * ARIA AI Service — Architecture stub
 * Future: Frontend → Backend/Worker → AI API
 * NO API keys in frontend code.
 */

const API_ENDPOINT = null; // Will be configured via backend

export async function sendMessage(message, history = []) {
  if (!API_ENDPOINT) {
    return {
      success: false,
      demo: true,
      reply: getDemoReply(message),
    };
  }

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history }),
    });
    if (!response.ok) throw new Error('API error');
    return await response.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function getDemoReply(message) {
  const lower = message.toLowerCase();
  if (lower.includes('курсов') || lower.includes('kurs')) {
    return 'Для курсовых работ используйте конструктор в разделе «Курсовые работы». Я помогу со структурой, но не буду выдумывать источники и цитаты. Полноценная AI-помощь будет доступна после подключения backend API.';
  }
  if (lower.includes('ударен') || lower.includes('basgy')) {
    return 'Попробуйте тренажёр ударений в соответствующем разделе платформы. Там вы сможете тренироваться и проходить тесты.';
  }
  if (lower.includes('тест') || lower.includes('test')) {
    return 'В разделе «Тесты» вы найдёте интерактивные задания по русскому языку и литературе с таймером и статистикой.';
  }
  return 'Спасибо за ваш вопрос! Я — Ария, виртуальная помощница платформы. Сейчас работаю в демо-режиме. Для полноценных ответов необходимо подключение AI через backend. Могу подсказать, какие разделы платформы помогут с вашим запросом.';
}

export function isDemoMode() {
  return !API_ENDPOINT;
}
