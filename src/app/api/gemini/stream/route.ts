import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tab = searchParams.get('tab');
  const title = searchParams.get('title');

  if (!tab || !title) {
    return new Response(JSON.stringify({ error: 'Missing tab or title' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async function fetchSlugApiKey(): Promise<string | null> {
    const base = process.env.SLUG_KEY_URL || '';
    try {
      const u = new URL(base);
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const r = await fetch(u.toString(), { method: 'GET' });
          if (r.ok) {
            const data = await r.json();
            const key = data?.keys?.[0]?.vault_keys?.decrypted_value;
            if (typeof key === 'string' && key.length > 0) return key;
          }
        } catch (_e) {}
        await new Promise((res) => setTimeout(res, 1000));
      }
      return null;
    } catch (_e) {
      return null;
    }
  }

  const globalKeySymbol = '__PDA_SLUG_API_KEY__';
  const g = globalThis as any;
  if (typeof g[globalKeySymbol] !== 'string') {
    g[globalKeySymbol] = '';
  }
  let apiKey: string | null = g[globalKeySymbol] || null;
  if (!apiKey) {
    apiKey = await fetchSlugApiKey();
    if (apiKey) {
      g[globalKeySymbol] = apiKey;
    }
  }
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Server is not configured (missing SLUG_KEY_URL and GEMINI_API_KEY).' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const prompt =
    tab === 'medium'
      ? `Give me detailed contents of the following page: ${title}`
      : `Generate a short text summary of the given news regarding ${tab}. Provide the latest available contents through search quickly for this: ${title}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=${apiKey}&alt=sse`;

  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        tools: [
          {
            google_search: {},
          },
        ],
        generationConfig: {
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => '');
      return new Response(
        JSON.stringify({ error: 'Gemini upstream error', details: text }),
        { status: upstream.status || 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Failed to fetch stream', message: err?.message || 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
