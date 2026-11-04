import { createClient } from '@supabase/supabase-js'
import { getAdminKey, getSupabaseEnv } from './config'

/**
 * Admin client. Bypasses RLS: strictly server-only, used only for privileged
 * operations the session path cannot do (recipient email lookup for
 * notifications, notification inserts). Never import from a client component.
 * Returns null when the key is missing so callers degrade honestly.
 *
 * Auth state is fully disabled: no session persistence, no automatic token
 * refresh, no URL session detection. The secret key never leaves the server.
 */
export function createAdminClient() {
  const env = getSupabaseEnv()
  const adminKey = getAdminKey()
  if (!env || !adminKey) return null
  return createClient(env.url, adminKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}
