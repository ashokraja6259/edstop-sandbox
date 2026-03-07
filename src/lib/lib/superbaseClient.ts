// FILE: src/lib/lib/superbaseClient.ts

/**
 * ⚠️ Legacy compatibility file
 * 
 * This re-exports the singleton browser client.
 * 
 * Do NOT create new Supabase instances here.
 */

export { supabase } from './supabaseClient';
export { createClient } from './supabaseClient';