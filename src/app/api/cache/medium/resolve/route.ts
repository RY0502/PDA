import { NextRequest } from 'next/server';
import { resolveMediumLink } from '@/lib/medium-resolver';
import { setValue } from '@/lib/global-cache';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url') || '';
    if (!url) {
      return new Response(JSON.stringify({ error: 'Missing url' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const marker = process.env.MEMBER_ARTICLE || '';
    const final = await resolveMediumLink(url, 60000, marker);
    if (!final) {
      return new Response(JSON.stringify({ value: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    try {
      await setValue(url, final);
    } catch {}
    return new Response(JSON.stringify({ value: final }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ value: null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
