import { NextRequest } from 'next/server';
import { getKeys, getValue, setValue } from '@/lib/global-cache';
import { resolveMediumLinkDetailed } from '@/lib/medium-resolver';

export async function GET(_req: NextRequest) {
  try {
    const keys = getKeys();
    const marker = process.env.MEMBER_ARTICLE || '';
    setTimeout(async () => {
      for (const key of keys) {
        const existing = getValue(key);
        if (existing) continue;
        try {
          const { value, memberDetected, statusCode } = await resolveMediumLinkDetailed(key, 60000, marker);
          if (value) {
            setValue(key, value);
          } else if (memberDetected === false && statusCode === 200) {
            setValue(key, key);
          } // else unknown or member detected and no link -> leave value blank
          await new Promise((res) => setTimeout(res, 500));
        } catch {
          await new Promise((res) => setTimeout(res, 1000));
        }
      }
    }, 0);
    return new Response(JSON.stringify({ ok: true, scheduled: keys.length }), {
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
