import { createClient } from '@supabase/supabase-js';

export type CacheKV = {
  key: string;
  value: string;
  expiresAt: number;
};

function now(): number {
  return Date.now();
}

function ttlMs(): number {
  return 24 * 60 * 60 * 1000;
}

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!supabaseUrl) {
    throw new Error('Supabase URL missing');
  }
  const key = serviceKey || anonKey;
  if (!key) {
    throw new Error('Supabase key missing');
  }
  return createClient(supabaseUrl, key);
}

export async function registerKey(key: string): Promise<boolean> {
  const supabase = getSupabase();
  const expiresAt = now() + ttlMs();
  const { error } = await supabase.from('medium_cache').insert({ key, value: '', expiresAt });
  if (error) {
    const msg = String((error as any)?.message || '');
    const code = (error as any)?.code || '';
    if (code === '23505' || msg.toLowerCase().includes('duplicate key')) {
      console.warn('[cache] registerKey duplicate', { key });
      return true;
    }
    console.error('[cache] registerKey error', error);
    return false;
  }
  return true;
}

export async function setValue(key: string, value: string): Promise<boolean> {
  const supabase = getSupabase();
  const { error } = await supabase.from('medium_cache').update({ value }).eq('key', key);
  if (error) {
    console.error('[cache] setValue error', error);
    return false;
  }
  return true;
}

export async function getValue(key: string): Promise<string | null> {
  const supabase = getSupabase();
  const t = now();
  const { data } = await supabase.from('medium_cache').select('value, expiresAt').eq('key', key).maybeSingle();
  if (!data) return null;
  const exp = Number(data.expiresAt || 0);
  if (exp <= t) {
    await supabase.from('medium_cache').delete().eq('key', key);
    return null;
  }
  const v = data.value;
  if (!v || typeof v !== 'string' || v.trim().length === 0) return null;
  return v;
}

export async function getKeys(): Promise<string[]> {
  const supabase = getSupabase();
  const t = now();
  const { data } = await supabase.from('medium_cache').select('key, expiresAt').gt('expiresAt', t);
  return (data || []).map((row: any) => row.key);
}

export async function getEntries(): Promise<CacheKV[]> {
  const supabase = getSupabase();
  const t = now();
  const { data } = await supabase.from('medium_cache').select('key, value, expiresAt').gt('expiresAt', t);
  return (data || []).map((row: any) => ({
    key: row.key,
    value: row.value || '',
    expiresAt: Number(row.expiresAt || 0),
  }));
}

export async function clearAll(): Promise<void> {
  const supabase = getSupabase();
  await supabase.from('medium_cache').delete().neq('key', '');
}

export async function clearValuesOnly(): Promise<void> {
  const supabase = getSupabase();
  const t = now();
  await supabase.from('medium_cache').update({ value: '' }).gt('expiresAt', t);
}
