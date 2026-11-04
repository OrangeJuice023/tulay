'use server'

import { revalidatePath } from 'next/cache'
import { DirectoryProfileSchema, NeedSchema, OfferSchema } from '@tulay/shared'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient, getSessionUser } from '@/lib/supabase/server'
import { SupabaseCommunityRepository } from '@/lib/supabase/repository'

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string }

async function repository() {
  const user = await getSessionUser()
  if (!user) return { user: null, repo: null as SupabaseCommunityRepository | null }
  const client = await createServerSupabaseClient()
  if (!client) return { user, repo: null as SupabaseCommunityRepository | null }
  return { user, repo: new SupabaseCommunityRepository(client, createAdminClient()) }
}

export async function saveProfileAction(input: { profile: unknown }): Promise<ActionResult<null>> {
  const { user, repo } = await repository()
  if (!user || !repo) return { ok: false, error: 'Sign in to save your profile.' }
  const parsed = DirectoryProfileSchema.safeParse({ ...(input.profile as object), id: user.id, isDemo: false })
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check your profile details.' }
  try {
    await repo.saveOwnProfile(user.id, parsed.data)
    revalidatePath('/profile')
    revalidatePath('/home')
    revalidatePath('/discover')
    return { ok: true, data: null }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not save your profile.' }
  }
}

export async function addNeedAction(input: {
  description: unknown
  tags: unknown
}): Promise<ActionResult<null>> {
  const { user, repo } = await repository()
  if (!user || !repo) return { ok: false, error: 'Sign in to add needs.' }
  const parsed = NeedSchema.safeParse({ profileId: user.id, description: input.description, tags: input.tags ?? [] })
  if (!parsed.success) return { ok: false, error: 'Describe the help you need first.' }
  try {
    await repo.addNeed(user.id, parsed.data)
    revalidatePath('/profile')
    revalidatePath('/home')
    return { ok: true, data: null }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not save your need.' }
  }
}

export async function addOfferAction(input: {
  description: unknown
  tags: unknown
  capacity?: unknown
}): Promise<ActionResult<null>> {
  const { user, repo } = await repository()
  if (!user || !repo) return { ok: false, error: 'Sign in to add offers.' }
  const parsed = OfferSchema.safeParse({
    profileId: user.id,
    description: input.description,
    tags: input.tags ?? [],
    capacity: input.capacity,
  })
  if (!parsed.success) return { ok: false, error: 'Describe what you can offer first.' }
  try {
    await repo.addOffer(user.id, parsed.data)
    revalidatePath('/profile')
    revalidatePath('/home')
    return { ok: true, data: null }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not save your offer.' }
  }
}

export async function closeNeedAction(input: { needId: unknown }): Promise<ActionResult<null>> {
  const { user, repo } = await repository()
  if (!user || !repo) return { ok: false, error: 'Sign in to manage needs.' }
  if (typeof input.needId !== 'string') return { ok: false, error: 'That need was not valid.' }
  try {
    await repo.closeNeed(user.id, input.needId)
    revalidatePath('/profile')
    revalidatePath('/home')
    return { ok: true, data: null }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not close that need.' }
  }
}
