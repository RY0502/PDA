import { NextRequest } from 'next/server';
import { registerKey } from '@/lib/global-cache';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const keys: unknown = body?.keys;
    if (!Array.isArray(keys)) {
      return new Response(JSON.stringify({ error: 'Missing keys array' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    let count = 0;
    for (const k of keys) {
      if (typeof k === 'string' && k.trim().length > 0) {
        await registerKey(k.trim());
        count++;
      }
    }
    return new Response(JSON.stringify({ ok: true, registered: count }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
