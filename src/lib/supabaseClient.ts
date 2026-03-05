// FILE: src/lib/supabaseClient.ts

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let supabaseClient: SupabaseClient | null = null

export function createClient(): SupabaseClient {

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error(
      'Missing Supabase environment variables. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    )
  }

  if (!supabaseClient) {

    supabaseClient = createBrowserClient(url, key)

  }

  return supabaseClient

}

/* optional direct export (used in some components) */

export const supabase = createClient()