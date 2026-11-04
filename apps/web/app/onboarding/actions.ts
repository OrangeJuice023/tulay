'use server'

import { revalidatePath } from 'next/cache'
import { DirectoryProfileSchema } from '@tulay/shared'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient, getSessionUser } from '@/lib/supabase/server'
import { SupabaseCommunityRepository } from '@/lib/supabase/repository'
import { OnboardingInputSchema } from './schema'

export type OnboardingResult = { ok: true } | { ok: false; error: string }

/**
 * Saves the full onboarding answers and marks the profile complete.
 * Idempotent: re-running skips needs/offers whose descriptions already exist
 * and returns success when onboarding is already finished.
 */
export async function saveOnboardingAction(input: unknown): Promise<OnboardingResult> {
  const user = await getSessionUser()
  if (!user) return { ok: false, error: 'Sign in to set up your profile.' }
  const parsed = OnboardingInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check your answers.' }
  const client = await createServerSupabaseClient()
  if (!client) return { ok: false, error: 'Accounts are unavailable right now. Please try again.' }
  const repo = new SupabaseCommunityRepository(client, createAdminClient())
  try {
    const existing = await repo.getOwnProfile(user.id).catch(() => null)
    if (existing) {
      const alreadyDone = await repo.getOnboardingCompleted(user.id).catch(() => false)
      if (alreadyDone) return { ok: true }
    }
    const data = parsed.data
    const profileParsed = DirectoryProfileSchema.safeParse({
      ...existing?.profile,
      id: user.id,
      isDemo: false,
      displayName: data.displayName,
      currentSituation: data.currentSituation || undefined,
      careerGoal: data.careerGoal,
      primaryStudio: data.primaryStudio,
      discoverable: true,
    })
    if (!profileParsed.success) return { ok: false, error: 'Check your profile answers.' }
    await repo.saveOwnProfile(user.id, profileParsed.data)
    const haveNeeds = new Set((existing?.needs ?? []).map((need) => need.description.trim().toLowerCase()))
    for (const need of data.needs) {
      if (haveNeeds.has(need.description.trim().toLowerCase())) continue
      await repo.addNeed(user.id, {
        description: need.description,
        tags: need.tags,
        goalContext: data.careerGoal,
        status: 'open',
        aiSuggested: false,
      })
    }
    const haveOffers = new Set((existing?.offers ?? []).map((offer) => offer.description.trim().toLowerCase()))
    for (const offer of data.offers) {
      if (haveOffers.has(offer.description.trim().toLowerCase())) continue
      await repo.addOffer(user.id, { description: offer.description, tags: offer.tags, status: 'active' })
    }
    await repo.setOnboardingCompleted(user.id, true)
    revalidatePath('/home')
    revalidatePath('/profile')
    revalidatePath('/discover')
    revalidatePath('/onboarding')
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not save your profile.' }
  }
}
