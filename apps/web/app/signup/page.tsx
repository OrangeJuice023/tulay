import type { Metadata } from 'next'
import { AuthForm } from '@/components/AuthForm'
import { isSupabaseConfigured } from '@/lib/supabase/config'

export const metadata: Metadata = { title: 'Join Tulay · Tulay' }

export default function Signup() {
  return <AuthForm mode="signup" configured={isSupabaseConfigured()} />
}
