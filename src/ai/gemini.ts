'use server';
import { GEMINI_BASE_MODEL_URL } from '@/lib/constants';
import { isRateLimitError } from './rate-limit';

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

 

async function postGemini(
  apiKey: string,
  prompt: string
): Promise<{ status: number; ok: boolean; data: any }> {
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
  const response = await fetch(url, { method: 'POST', headers, body });
  const data = await response.json().catch(() => null);
  return { status: response.status, ok: response.ok, data };
}

function extractText(data: any): string | null {
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return typeof text === 'string' && text.length > 0 ? text : null;
}

async function attemptWithKey(
  apiKey: string,
  prompt: string,
  attempts: number,
  delayMs: number
): Promise<{ text: string | null; rateLimited: boolean }> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await postGemini(apiKey, prompt);
      if (res.ok) {
        const t = extractText(res.data);
        if (t) return { text: t, rateLimited: false };
      } else {
        if (isRateLimitError(res.status, res.data)) {
          return { text: null, rateLimited: true };
        }
      }
    } catch {}
    if (attempt < attempts) await new Promise(res => setTimeout(res, delayMs));
  }
  return { text: null, rateLimited: false };
}

export async function generateSummaryWithRetry(
  apiKey: string,
  prompt: string,
  attempts = 3,
  delayMs = 2000
): Promise<string | null> {
  const first = await attemptWithKey(apiKey, prompt, attempts, delayMs);
  if (first.text) return first.text;
  if (!first.rateLimited) return null;
  const fallbackUrl = process.env.PDA_FALLBACK_KEY_URL;
  if (typeof fallbackUrl !== 'string' || fallbackUrl.length === 0) return null;
  const anotherKey = await fetchGeminiApiKey(fallbackUrl);
  if (typeof anotherKey !== 'string' || anotherKey.length === 0) return null;
  const second = await attemptWithKey(anotherKey, prompt, attempts, delayMs);
  if (second.text) return second.text;
  return null;
}
