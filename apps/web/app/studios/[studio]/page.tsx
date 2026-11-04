import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { CandidateMatch } from '@tulay/shared'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { createServerSupabaseClient, getSessionUser } from '@/lib/supabase/server'
import { SupabaseCommunityRepository } from '@/lib/supabase/repository'
import { getPublicCommunity, toPublicMember } from '@/lib/directory'
import { STUDIOS, getStudio, studioOpportunities, studioShortlist } from '@/lib/studios'
import { StudioView } from './StudioView'

type StudioParams = Promise<{ studio: string }>

export function generateStaticParams() {
  return STUDIOS.map((studio) => ({ studio: studio.id }))
}

export async function generateMetadata({ params }: { params: StudioParams }): Promise<Metadata> {
  const studio = getStudio((await params).studio)
  if (!studio) return { title: 'Studio · Tulay' }
  return {
    title: `${studio.name} · Tulay`,
    description: `${studio.name} for the "${studio.journey}" journey: ${studio.purpose}`,
  }
}

/**
 * One studio workspace. Guests get the labelled demo community; signed-in
 * members get their own matches (unverifiable until a Supabase project is
 * connected — failures degrade to honest empty states, never demo data
 * dressed as member data).
 */
export default async function StudioPage({ params }: { params: StudioParams }) {
  const studio = getStudio((await params).studio)
  if (!studio) notFound()

  const user = isSupabaseConfigured() ? await getSessionUser() : null
  const community = getPublicCommunity()

  let matches: CandidateMatch[] = []
  let matchNeed: string | null = null
  let authedOpportunities = studioOpportunities(community, studio)

  if (user) {
    const client = await createServerSupabaseClient()
    if (client) {
      try {
        const repo = new SupabaseCommunityRepository(client, createAdminClient())
        const [member, directory] = await Promise.all([
          repo.getOwnProfile(user.id),
          repo.listDiscoverable(),
        ])
        const openNeed = (member?.needs ?? []).find((need) => need.status === 'open')
        if (openNeed) {
          matches = await repo.findMatchesFor(openNeed, member?.offers ?? [], 3)
          matchNeed = openNeed.description
        }
        authedOpportunities = studioOpportunities(directory.map(toPublicMember), studio)
      } catch {
        matches = []
        matchNeed = null
        authedOpportunities = []
      }
    }
  }

  return (
    <StudioView
      studio={studio}
      authed={user !== null}
      shortlist={user ? [] : studioShortlist(community, studio)}
      opportunities={user ? authedOpportunities : studioOpportunities(community, studio)}
      matches={matches}
      matchNeed={matchNeed}
    />
  )
}
