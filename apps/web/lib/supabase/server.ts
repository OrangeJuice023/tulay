import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseEnv } from './config'

/**
 * Server Supabase client (server components, server actions, route handlers).
 * Returns null when Supabase is not configured so callers can take the demo
 * path. Auth state is read with `getClaims()` (signature-verified); server
 * code must never trust an unverified session.
 */
export async function createServerSupabaseClient() {
  const env = getSupabaseEnv()
  if (!env) return null
  const cookieStore = await cookies()
  return createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // setAll from a server component is a no-op by design: refresh
          // happens in proxy.ts. Mutations must use server actions instead.
        }
      },
    },
  })
}

export type SessionUser = { id: string; email: string | null }

/** Verified current user, or null when signed out or unconfigured. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) return null
  const sub = data.claims.sub
  if (typeof sub !== 'string' || !sub) return null
  const email = typeof data.claims.email === 'string' ? data.claims.email : null
  return { id: sub, email }
}
