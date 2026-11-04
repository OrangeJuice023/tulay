import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { createServerSupabaseClient, getSessionUser } from '@/lib/supabase/server'
import { SupabaseCommunityRepository } from '@/lib/supabase/repository'
import { OnboardingForm } from './OnboardingForm'

export const metadata: Metadata = {
  title: 'Set up your profile · Tulay',
  description: 'Tell Tulay who you are, what you are working toward, and how others can help.',
}

// Request-time auth gates: must redirect before any prerendered shell.
export const instant = false

/**
 * Welcome + profile setup for freshly confirmed users. Guests are sent to
 * signup; users who already finished go home. Prefills from the minimal
 * profile row the auth callback ensures.
 */
export default async function Onboarding() {
  if (!isSupabaseConfigured()) redirect('/start')
  const user = await getSessionUser()
  if (!user) redirect('/signup')

  const client = await createServerSupabaseClient()
  if (!client) redirect('/start')
  const repo = new SupabaseCommunityRepository(client, createAdminClient())
  const [member, completed] = await Promise.all([
    repo.getOwnProfile(user.id).catch(() => null),
    repo.getOnboardingCompleted(user.id).catch(() => false),
  ])
  if (completed) redirect('/home')

  return (
    <OnboardingForm
      initial={{
        displayName: member?.profile.displayName && member.profile.displayName !== 'Tulay member' ? member.profile.displayName : '',
        currentSituation: member?.profile.currentSituation ?? '',
        careerGoal: member?.profile.careerGoal ?? '',
      }}
    />
  )
}
