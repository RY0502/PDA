import { NextRequest } from 'next/server';
import { getEntries } from '@/lib/global-cache';

export async function GET(_req: NextRequest) {
  try {
    const entries = getEntries();
    return new Response(JSON.stringify({ entries }), {
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
