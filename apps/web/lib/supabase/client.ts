'use client'

import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseEnv } from './config'

/**
 * Browser Supabase client. Call only when `isSupabaseConfigured()` is true;
 * it throws otherwise so demo mode can never silently misbehave.
 */
export function createClient() {
  const env = getSupabaseEnv()
  if (!env) throw new Error('Supabase is not configured: running in demo mode.')
  return createBrowserClient(env.url, env.publishableKey)
}
