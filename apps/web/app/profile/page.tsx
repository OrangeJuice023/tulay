import type { Metadata } from 'next'
import { getSessionUser, createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { SupabaseCommunityRepository } from '@/lib/supabase/repository'
import { AuthedProfileEditor, DemoProfileEditor } from './ProfileEditor'

export const metadata: Metadata = { title: 'My profile · Tulay' }

export default async function Profile() {
  const user = isSupabaseConfigured() ? await getSessionUser() : null
  if (!user) return <DemoProfileEditor />

  const client = await createServerSupabaseClient()
  if (!client) return <DemoProfileEditor />
  const repo = new SupabaseCommunityRepository(client, createAdminClient())
  const member = await repo.getOwnProfile(user.id).catch(() => null)
  return <AuthedProfileEditor email={user.email} member={member} />
}
