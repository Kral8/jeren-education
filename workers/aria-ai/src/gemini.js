const GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-2.5-flash'];

export async function callGeminiText(prompt, apiKey, options = {}) {
  const parts = [{ text: prompt }];
  return callGeminiParts(parts, apiKey, options);
}

export async function callGeminiParts(parts, apiKey, options = {}) {
  let lastError = '';
  for (const model of GEMINI_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const body = {
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: options.temperature ?? 0.65,
        maxOutputTokens: options.maxOutputTokens ?? 4096,
      },
    };
    if (options.systemInstruction) {
      body.systemInstruction = { parts: [{ text: options.systemInstruction }] };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      lastError = await response.text();
      console.error(`Gemini ${model}`, response.status, lastError.slice(0, 400));
      continue;
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text?.trim()) return text.trim();
    lastError = 'Empty AI response';
  }
  throw new Error(lastError || 'Gemini API unavailable');
}
