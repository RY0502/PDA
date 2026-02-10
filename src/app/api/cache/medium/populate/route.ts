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
    let updated = 0;
    for (const key of keys) {
      try {
        const { value, memberDetected, statusCode } = await resolveMediumLinkDetailed(key, 60000, marker);
        if (value) {
          const ok = await setValue(key, value);
          if (ok) updated++;
        } else if (memberDetected === false && statusCode === 200) {
          const ok = await setValue(key, key);
          if (ok) updated++;
        }
        await new Promise((res) => setTimeout(res, 500));
      } catch {
        await new Promise((res) => setTimeout(res, 1000));
      }
    }
    return new Response(JSON.stringify({ ok: true, processed: keys.length, updated }), {
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
