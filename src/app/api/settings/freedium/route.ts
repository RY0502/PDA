import { NextRequest } from 'next/server';
import { isFreediumEnabled, setFeatureFlag } from '@/lib/feature-flags';
import { createClient } from '@supabase/supabase-js';

const ALLOWED_EMAIL = 'ravi.y0102@gmail.com';

async function isAuthorized(req: NextRequest): Promise<boolean> {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return false;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!supabaseUrl || !supabaseAnonKey) return false;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase.auth.getUser(token);
  if (error) return false;
  const email = data.user?.email || '';
  return email === ALLOWED_EMAIL;
}

export async function GET() {
  try {
    const enabled = await isFreediumEnabled();
    return new Response(JSON.stringify({ enabled }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ enabled: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ok = await isAuthorized(req);
    if (!ok) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const current = await isFreediumEnabled();
    const newValue = !current;
    const success = await setFeatureFlag('freedium_enabled', String(newValue));
    if (!success) {
      return new Response(JSON.stringify({ error: 'Failed to update setting' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ enabled: newValue }), {
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
