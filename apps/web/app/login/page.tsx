import type { Metadata } from 'next'
import { AuthForm } from '@/components/AuthForm'
import { isSupabaseConfigured } from '@/lib/supabase/config'

export const metadata: Metadata = { title: 'Sign in · Tulay' }

// Reads the callback failure flag per request; never a static shell.
export const instant = false

const LINK_ERRORS: Record<string, string> = {
  link: 'That confirmation link expired or was already used. Sign in if you already verified, or create a new account to get a fresh link.',
}

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const initialError = params.error ? (LINK_ERRORS[params.error] ?? 'Something went wrong. Please try again.') : null
  return <AuthForm mode="login" configured={isSupabaseConfigured()} initialError={initialError} />
}
