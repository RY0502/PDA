import { NextRequest } from 'next/server';
import { getValue } from '@/lib/global-cache';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key') || '';
    if (!key) {
      return new Response(JSON.stringify({ error: 'Missing key' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const value = getValue(key);
    return new Response(JSON.stringify({ value }), {
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
