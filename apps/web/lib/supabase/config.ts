/**
 * Supabase + email environment resolution. Single place that decides whether
 * the app talks to real backends or stays in labelled demo mode.
 *
 * Key naming: current Supabase docs call the browser-safe key the publishable
 * key (`sb_publishable_...`); older projects call it the anon key. Both env
 * names are accepted so either project works; the publishable name wins when
 * both are set. Same for the server-only admin key: `SUPABASE_SECRET_KEY` is
 * canonical and `SUPABASE_SERVICE_ROLE_KEY` is the legacy fallback.
 */

export type SupabaseEnv = {
  url: string
  publishableKey: string
}

export function getSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const publishableKey = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    ''
  ).trim()
  if (!url || !publishableKey) return null
  return { url, publishableKey }
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseEnv() !== null
}

export function getAdminKey(): string | null {
  const key = (
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    ''
  ).trim()
  return key ? key : null
}

export type EmailEnv = {
  apiKey: string
  from: string
}

export function getEmailEnv(): EmailEnv | null {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.RESEND_FROM_EMAIL?.trim()
  if (!apiKey || !from) return null
  return { apiKey, from }
}

export function isEmailConfigured(): boolean {
  return getEmailEnv() !== null
}

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000'
}
