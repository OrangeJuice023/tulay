'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getAppUrl, isSupabaseConfigured } from '@/lib/supabase/config'
import { friendlyAuthError } from './auth-errors'

const CredentialsSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.').max(320),
  password: z.string().min(8, 'Password needs at least 8 characters.').max(128),
})

const SignUpSchema = CredentialsSchema.extend({
  displayName: z.string().trim().min(1, 'Tell us what to call you.').max(100),
})

const EmailSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.').max(320),
})

export type AuthResult = { ok: true; pending: boolean } | { ok: false; error: string }

async function clients() {
  if (!isSupabaseConfigured()) {
    return { supabase: null as null, unavailable: 'Sign-in needs a Supabase project. The demo works without one.' }
  }
  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    return { supabase: null as null, unavailable: 'Sign-in is unavailable right now. The demo works without it.' }
  }
  return { supabase, unavailable: null as null }
}

function callbackUrl(): string {
  return `${getAppUrl().replace(/\/$/, '')}/auth/callback`
}

/**
 * Email + password registration. The display name is stored on the auth user
 * so onboarding can greet and prefill; the profile row itself is created
 * idempotently by the auth callback after verification.
 *
 * When email confirmation is on, Supabase returns no session: the caller
 * shows the check-your-email state instead of landing on a guest home.
 */
export async function signUpAction(input: {
  email: unknown
  password: unknown
  displayName: unknown
}): Promise<AuthResult> {
  const parsed = SignUpSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check your details.' }
  const { supabase, unavailable } = await clients()
  if (!supabase) return { ok: false, error: unavailable }
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName },
      emailRedirectTo: callbackUrl(),
    },
  })
  if (error) return { ok: false, error: friendlyAuthError(error.message) }
  if (!data.session) return { ok: true, pending: true }
  redirect('/home')
}

export async function signInAction(input: { email: unknown; password: unknown }): Promise<AuthResult> {
  const parsed = CredentialsSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check your details.' }
  const { supabase, unavailable } = await clients()
  if (!supabase) return { ok: false, error: unavailable }
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })
  if (error) return { ok: false, error: friendlyAuthError(error.message) }
  redirect('/home')
}

/** Resends the signup confirmation email. Rate-limited by Supabase. */
export async function resendVerificationAction(input: { email: unknown }): Promise<AuthResult> {
  const parsed = EmailSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check your email.' }
  const { supabase, unavailable } = await clients()
  if (!supabase) return { ok: false, error: unavailable }
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: parsed.data.email,
    options: { emailRedirectTo: callbackUrl() },
  })
  if (error) return { ok: false, error: friendlyAuthError(error.message) }
  return { ok: true, pending: true }
}

export async function signOutAction(): Promise<void> {
  const { supabase } = await clients()
  if (supabase) await supabase.auth.signOut()
  redirect('/')
}
