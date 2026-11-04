import { Suspense } from 'react'
import type { Metadata } from 'next'
import { DemoProvider, getAIProvider } from '@tulay/ai'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { createServerSupabaseClient, getSessionUser } from '@/lib/supabase/server'
import { SupabaseCommunityRepository } from '@/lib/supabase/repository'
import { ArkoWorkspace } from './ArkoWorkspace'

export const metadata: Metadata = {
  title: 'Ask Arko · Tulay',
  description: 'Talk through your next career move with Arko, then meet people who can help.',
}

type AskSearchParams = Promise<{ q?: string; meet?: string; need?: string }>

/**
 * Instant shell: renders immediately while the workspace loader below reads
 * the URL + session inside Suspense. Awaiting `searchParams` here would break
 * instant navigation (see `instant-shell-url-data`) and, in dev, can send the
 * client router into a repeated re-navigation loop.
 */
export default function Ask({ searchParams }: { searchParams: AskSearchParams }) {
  return (
    <Suspense fallback={<AskLoading />}>
      <AskWorkspaceLoader searchParams={searchParams} />
    </Suspense>
  )
}

async function AskWorkspaceLoader({ searchParams }: { searchParams: AskSearchParams }) {
  const params = await searchParams
  const demoMode = getAIProvider() instanceof DemoProvider
  const user = isSupabaseConfigured() ? await getSessionUser() : null
  let serverName: string | null = null
  let ownNeeds: Parameters<typeof ArkoWorkspace>[0]['ownNeeds'] = []
  let ownOffers: Parameters<typeof ArkoWorkspace>[0]['ownOffers'] = []
  if (user) {
    const client = await createServerSupabaseClient()
    if (client) {
      const repo = new SupabaseCommunityRepository(client, createAdminClient())
      const member = await repo.getOwnProfile(user.id).catch(() => null)
      serverName = member?.profile.displayName ?? user.email?.split('@')[0] ?? 'there'
      ownNeeds = member?.needs ?? []
      ownOffers = member?.offers ?? []
    }
  }
  return (
    <ArkoWorkspace
      demoMode={demoMode}
      authed={user !== null}
      serverName={serverName}
      ownNeeds={ownNeeds}
      ownOffers={ownOffers}
      initialQ={typeof params.q === 'string' ? params.q.slice(0, 2000) : null}
      meetId={typeof params.meet === 'string' ? params.meet : null}
    />
  )
}

/** Lightweight placeholder while the workspace resolves. No data, no auth. */
function AskLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6" aria-busy="true" aria-label="Loading Ask Arko">
      <div className="rounded-[var(--radius-card)] border border-line/70 bg-white p-8 shadow-[var(--shadow-card)]">
        <p className="text-xl font-extrabold tracking-tight text-ink">Ask Arko</p>
        <p className="mt-1 flex items-center gap-2 text-sm text-muted">
          <span aria-hidden="true" className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
          Getting your workspace ready…
        </p>
      </div>
    </div>
  )
}
