'use server';
import { GEMINI_BASE_MODEL_URL } from '@/lib/constants';

export async function fetchGeminiApiKey(
  keyUrl: string,
  attempts = 3,
  delayMs = 1000
): Promise<string | null> {
  try {
    const u = new URL(keyUrl);
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const r = await fetch(u.toString(), { method: 'GET' });
        if (r.ok) {
          const data = await r.json();
          const key = data?.keys?.[0]?.vault_keys?.decrypted_value;
          if (typeof key === 'string' && key.length > 0) return key;
        }
      } catch {}
      await new Promise(res => setTimeout(res, delayMs));
    }
    return null;
  } catch {
    return null;
  }
}

export async function generateSummaryWithRetry(
  apiKey: string,
  prompt: string,
  attempts = 3,
  delayMs = 2000
): Promise<string | null> {
  const url = `${GEMINI_BASE_MODEL_URL}:generateContent`;
  const headers = {
    'x-goog-api-key': apiKey,
    'Content-Type': 'application/json',
  };
  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }]}],
    tools: [{ google_search: {} }],
    generationConfig: { thinkingConfig: { thinkingBudget: 0 } },
  });
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, { method: 'POST', headers, body });
      if (!response.ok) {
        if (attempt === attempts) return null;
        await new Promise(res => setTimeout(res, delayMs));
        continue;
      }
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof text === 'string' && text.length > 0) return text;
      if (attempt === attempts) return null;
      await new Promise(res => setTimeout(res, delayMs));
    } catch {
      if (attempt === attempts) return null;
      await new Promise(res => setTimeout(res, delayMs));
    }
  }
  return null;
}
