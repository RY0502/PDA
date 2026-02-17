import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

export function createClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || (!supabaseAnonKey && !serviceRoleKey)) {
    throw new Error('Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL or keys');
  }

  const key = serviceRoleKey || supabaseAnonKey!;
  return createSupabaseClient(supabaseUrl, key);
}
