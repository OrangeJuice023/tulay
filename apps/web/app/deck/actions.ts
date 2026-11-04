'use server'

import { z } from 'zod'
import { DeckSchema } from '@tulay/shared'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient, getSessionUser } from '@/lib/supabase/server'
import { SupabaseCommunityRepository } from '@/lib/supabase/repository'

const DeckIdSchema = z.string().uuid('That deck link is invalid.')

async function authedRepo() {
  const user = await getSessionUser()
  if (!user) return { user: null, repo: null }
  const client = await createServerSupabaseClient()
  if (!client) return { user: null, repo: null }
  return { user, repo: new SupabaseCommunityRepository(client, createAdminClient()) }
}

export async function listDecksAction() {
  const { user, repo } = await authedRepo()
  if (!user || !repo) return { ok: false as const, error: 'Sign in to see your saved decks.' }
  try {
    return { ok: true as const, data: await repo.listOwnDecks(user.id) }
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'Decks unavailable.' }
  }
}

export async function saveDeckAction(input: unknown) {
  const { user, repo } = await authedRepo()
  if (!user || !repo) return { ok: false as const, error: 'Sign in to save decks to your account.' }
  const parsed = DeckSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'That deck has invalid content.' }
  if (!DeckIdSchema.safeParse(parsed.data.id).success)
    return { ok: false as const, error: 'That deck link is invalid.' }
  try {
    return { ok: true as const, data: await repo.saveDeck(user.id, parsed.data) }
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'Could not save this deck.' }
  }
}

export async function deleteDeckAction(input: unknown) {
  const { user, repo } = await authedRepo()
  if (!user || !repo) return { ok: false as const, error: 'Sign in to manage saved decks.' }
  const parsed = z.object({ id: DeckIdSchema }).safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'That deck link is invalid.' }
  try {
    await repo.deleteDeck(user.id, parsed.data.id)
    return { ok: true as const }
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'Could not delete this deck.' }
  }
}
