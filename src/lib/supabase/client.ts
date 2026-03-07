// FILE: src/lib/supabase/client.ts

import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
  );
}

/**
 * Singleton Supabase browser client
 * Prevents multiple GoTrue lock conflicts
 */
export const supabase = createBrowserClient(
  supabaseUrl,
  supabaseAnonKey
);

/**
 * Only keep this for legacy files that still import createClient()
 * It returns the singleton — NOT a new instance.
 */
export function createClient() {
  return supabase;
}