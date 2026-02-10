import { NextRequest } from 'next/server';
import { setValue } from '@/lib/global-cache';
import { resolveMediumLinkDetailed } from '@/lib/medium-resolver';
import { createClient } from '@supabase/supabase-js';

export async function GET(_req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data } = await supabase
      .from('medium_cache')
      .select('key')
      .eq('value', '');
    const keys = (data || []).map((row: any) => String(row.key)).filter(Boolean);
    const marker = process.env.MEMBER_ARTICLE || '';
    setTimeout(async () => {
      for (const key of keys) {
        try {
          const { value, memberDetected, statusCode } = await resolveMediumLinkDetailed(key, 60000, marker);
          if (value) {
            await setValue(key, value);
          } else if (memberDetected === false && statusCode === 200) {
            await setValue(key, key);
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
