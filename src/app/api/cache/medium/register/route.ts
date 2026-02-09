import { NextRequest } from 'next/server';
import { registerKey } from '@/lib/global-cache';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const key = typeof body?.key === 'string' ? body.key.trim() : '';
    if (!key) {
      return new Response(JSON.stringify({ error: 'Missing key' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    registerKey(key);
    return new Response(JSON.stringify({ ok: true }), {
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
