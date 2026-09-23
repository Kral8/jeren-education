const GEMINI_MODELS = [
  'gemini-3.6-flash',
  'gemini-flash-latest',
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite',
];

export async function callGeminiText(prompt, apiKey, options = {}) {
  const parts = [{ text: prompt }];
  return callGeminiParts(parts, apiKey, options);
}

export async function callGeminiParts(parts, apiKey, options = {}) {
  const key = String(apiKey || '').trim();
  if (!key) throw new Error('Gemini API key missing');

  let lastError = '';
  for (const model of GEMINI_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
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

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': key,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        lastError = await response.text();
        console.error(`Gemini ${model}`, response.status, lastError.slice(0, 400));
        continue;
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('').trim();
      if (text) return text;
      lastError = 'Empty AI response';
    } catch (err) {
      lastError = err?.message || 'Gemini request failed';
      console.error(`Gemini ${model}`, lastError);
    }
  }
  throw new Error(lastError || 'Gemini API unavailable');
}
