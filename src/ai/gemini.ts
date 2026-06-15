'use server';
import { GEMINI_BASE_MODEL_URL } from '@/lib/constants';
import { isRateLimitError } from './rate-limit';

function backoffDelay(attempt: number, baseMs: number): number {
  const exponential = baseMs * Math.pow(2, attempt - 1);
  const jitter = exponential * (0.75 + Math.random() * 0.5);
  return Math.min(jitter, 15000);
}

export async function fetchGeminiApiKey(
  keyUrl: string,
  attempts = 4,
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
          console.warn(`[fetchGeminiApiKey] Attempt ${attempt}: response OK but no valid key in payload`);
        } else {
          console.warn(`[fetchGeminiApiKey] Attempt ${attempt}: HTTP ${r.status} ${r.statusText}`);
        }
      } catch (err) {
        console.error(`[fetchGeminiApiKey] Attempt ${attempt} failed:`, err);
      }
      if (attempt < attempts) await new Promise(res => setTimeout(res, backoffDelay(attempt, delayMs)));
    }
    console.error(`[fetchGeminiApiKey] All ${attempts} attempts exhausted for ${keyUrl}`);
    return null;
  } catch (err) {
    console.error('[fetchGeminiApiKey] Invalid URL or unexpected error:', err);
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
  let sawServerError = false;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await postGemini(apiKey, prompt);
      if (res.ok) {
        const t = extractText(res.data);
        if (t) return { text: t, rateLimited: false };
        console.warn(`[attemptWithKey] Attempt ${attempt}: response OK but no text extracted`);
      } else {
        if (isRateLimitError(res.status, res.data)) {
          console.warn(`[attemptWithKey] Rate limited on attempt ${attempt}`);
          return { text: null, rateLimited: true };
        }
        if (res.status >= 500) {
          sawServerError = true;
          console.warn(`[attemptWithKey] Attempt ${attempt}: server error ${res.status}`);
        } else {
          console.warn(`[attemptWithKey] Attempt ${attempt}: HTTP ${res.status}`, res.data);
        }
      }
    } catch (err) {
      console.error(`[attemptWithKey] Attempt ${attempt} threw:`, err);
    }
    if (attempt < attempts) await new Promise(res => setTimeout(res, backoffDelay(attempt, delayMs)));
  }
  console.error(`[attemptWithKey] All ${attempts} attempts exhausted. sawServerError=${sawServerError}`);
  return { text: null, rateLimited: sawServerError };
}

export async function generateSummaryWithRetry(
  apiKey: string,
  prompt: string,
  attempts = 3,
  delayMs = 2000
): Promise<string | null> {
  const first = await attemptWithKey(apiKey, prompt, attempts, delayMs);
  if (first.text) return first.text;
  if (!first.rateLimited) {
    console.error('[generateSummaryWithRetry] Primary key failed with non-retriable error, no fallback triggered');
    return null;
  }
  console.warn('[generateSummaryWithRetry] Primary key exhausted (rate-limited or server error), trying fallback key...');
  const fallbackUrl = process.env.PDA_FALLBACK_KEY_URL;
  if (typeof fallbackUrl !== 'string' || fallbackUrl.length === 0) {
    console.error('[generateSummaryWithRetry] No PDA_FALLBACK_KEY_URL configured');
    return null;
  }
  const anotherKey = await fetchGeminiApiKey(fallbackUrl);
  if (typeof anotherKey !== 'string' || anotherKey.length === 0) {
    console.error('[generateSummaryWithRetry] Failed to fetch fallback API key');
    return null;
  }
  const second = await attemptWithKey(anotherKey, prompt, attempts, delayMs);
  if (second.text) return second.text;
  console.error('[generateSummaryWithRetry] Fallback key also failed. All retries exhausted.');
  return null;
}

