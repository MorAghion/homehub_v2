/**
 * Supabase JS client — single shared instance for the entire app.
 *
 * Initialised once here. All hooks and components import from this module.
 * NEVER import supabase directly in a component — use a custom hook instead.
 *
 * Environment variables:
 *   VITE_SUPABASE_URL          — public, safe to bundle
 *   VITE_SUPABASE_ANON_KEY     — public, safe to bundle
 *
 * SUPABASE_SERVICE_ROLE_KEY is server-only (Edge Functions); it MUST NOT
 * appear here or anywhere under src/.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env['VITE_SUPABASE_URL'] as string
const supabaseAnonKey = import.meta.env['VITE_SUPABASE_ANON_KEY'] as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
      'Copy .env.example → .env.local and fill in the values.',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
