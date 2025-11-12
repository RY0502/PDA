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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Server is not configured (missing GEMINI_API_KEY).' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const prompt = `Generate a short text summary of the given news regarding ${tab}. Provide the latest available contents through search quickly for this: ${title}`;

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