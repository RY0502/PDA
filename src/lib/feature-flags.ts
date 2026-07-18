import { createClient } from '@supabase/supabase-js';

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

export async function getFeatureFlag(key: string): Promise<string | null> {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();
    if (!data) return null;
    return typeof data.value === 'string' ? data.value : null;
  } catch {
    return null;
  }
}

export async function setFeatureFlag(key: string, value: string): Promise<boolean> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key, value }, { onConflict: 'key' });
    if (error) {
      console.error('[feature-flags] setFeatureFlag error', error);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function isFreediumEnabled(): Promise<boolean> {
  const val = await getFeatureFlag('freedium_enabled');
  return val === 'true';
}
