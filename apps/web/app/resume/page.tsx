import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { createServerSupabaseClient, getSessionUser } from '@/lib/supabase/server'
import { SupabaseCommunityRepository } from '@/lib/supabase/repository'
import { ResumeStudio } from './ResumeStudio'

export const metadata: Metadata = {
  title: 'Resume Studio · Tulay',
  description: 'Turn your actual experience into a clear, relevant resume — AI-assisted rewriting, honest gaps, PDF export.',
}

// Session-dependent studio: always render per request, never prerender.
export const instant = false

export default async function ResumePage() {
  const user = isSupabaseConfigured() ? await getSessionUser() : null
  if (!user) return <ResumeStudio mode="demo" initial={[]} profileSeed={null} />
  const client = await createServerSupabaseClient()
  if (!client) return <ResumeStudio mode="demo" initial={[]} profileSeed={null} />
  const repo = new SupabaseCommunityRepository(client, createAdminClient())
  const initial = await repo.listOwnResumes(user.id).catch(() => [])
  const member = await repo.getOwnProfile(user.id).catch(() => null)
  return (
    <ResumeStudio
      mode="authed"
      initial={initial}
      profileSeed={
        member
          ? {
              displayName: member.profile.displayName,
              headline: member.profile.headline ?? '',
              situation: member.profile.currentSituation ?? '',
              goal: member.profile.careerGoal ?? '',
            }
          : null
      }
    />
  )
}
