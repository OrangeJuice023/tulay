import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { createServerSupabaseClient, getSessionUser } from '@/lib/supabase/server'
import { SupabaseCommunityRepository } from '@/lib/supabase/repository'
import { DeckStudio } from './DeckStudio'

export const metadata: Metadata = {
  title: 'Pitch Deck Studio · Tulay',
  description: 'Build a pitch deck, proposal, or portfolio presentation — draft with AI, edit every slide, export to PowerPoint.',
}

// Session-dependent studio: always render per request, never prerender.
export const instant = false

export default async function DeckPage() {
  const user = isSupabaseConfigured() ? await getSessionUser() : null
  if (!user) return <DeckStudio mode="demo" initial={[]} />
  const client = await createServerSupabaseClient()
  if (!client) return <DeckStudio mode="demo" initial={[]} />
  const repo = new SupabaseCommunityRepository(client, createAdminClient())
  const initial = await repo.listOwnDecks(user.id).catch(() => [])
  return <DeckStudio mode="authed" initial={initial} />
}
