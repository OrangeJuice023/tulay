import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import type { CandidateMatch } from '@tulay/shared'
import { DemoProvider, getAIProvider } from '@tulay/ai'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { createServerSupabaseClient, getSessionUser } from '@/lib/supabase/server'
import { SupabaseCommunityRepository } from '@/lib/supabase/repository'
import { getDirectoryStats, getPublicCommunity } from '@/lib/directory'
import type { AuthedDashboardData } from '@/lib/dashboard'
import { Dashboard } from './Dashboard'

export const metadata: Metadata = {
  title: 'Home · Tulay',
  description: 'Your Tulay home: greetings from Arko, your career journey, and what to do next.',
}

// Session-dependent dashboard: always render per request, never prerender.
export const instant = false

export default async function Home() {
  const demoMode = getAIProvider() instanceof DemoProvider
  const user = isSupabaseConfigured() ? await getSessionUser() : null
  const stats = getDirectoryStats()
  const community = getPublicCommunity()

  let server: AuthedDashboardData | null = null
  let serverMatches: CandidateMatch[] = []
  let serverMatchNeed: string | null = null

  if (user) {
    const client = await createServerSupabaseClient()
    if (client) {
      const repo = new SupabaseCommunityRepository(client, createAdminClient())
      const onboarded = await repo.getOnboardingCompleted(user.id).catch(() => true)
      if (!onboarded) redirect('/onboarding')
      try {
        const [member, intros, collabs, notifications, directory] = await Promise.all([
          repo.getOwnProfile(user.id),
          repo.listIntroductions(user.id),
          repo.listCollaborations(user.id),
          repo.listNotifications(user.id),
          repo.listDiscoverable(),
        ])
        const pendingIntros = intros.filter((intro) => intro.status === 'pending')
        const active = collabs.filter((collab) => collab.status === 'agreed' || collab.status === 'in_progress')
        const completed = collabs.filter((collab) => collab.status === 'completed')
        const openNeeds = (member?.needs ?? []).filter((need) => need.status === 'open')
        const upcoming: AuthedDashboardData['upcoming'] = []
        for (const intro of pendingIntros.filter((item) => item.toProfileId === user.id)) {
          const partner = await repo.getMember(intro.fromProfileId)
          upcoming.push({
            id: `up-${intro.id}`,
            label: `Reply to ${partner?.profile.displayName ?? 'a member'}'s intro request`,
            when: 'Today',
            href: '/introductions',
          })
        }
        for (const collab of active.slice(0, 3)) {
          const partnerId = collab.requesterId === user.id ? collab.helperId : collab.requesterId
          const partner = await repo.getMember(partnerId)
          const next = collab.nextSteps.find((step) => !step.done)?.text
          upcoming.push({
            id: `up-collab-${collab.id}`,
            label: next ? `Next with ${partner?.profile.displayName ?? 'your collaborator'}: ${next}` : `Set next step with ${partner?.profile.displayName ?? 'your collaborator'}`,
            when: 'This week',
            href: '/collaborations',
          })
        }
        const latestActive = active[0]
        let activeView: AuthedDashboardData['active'] = null
        if (latestActive) {
          const partnerId = latestActive.requesterId === user.id ? latestActive.helperId : latestActive.requesterId
          const partner = await repo.getMember(partnerId)
          const total = latestActive.nextSteps.length
          activeView = {
            partnerName: partner?.profile.displayName ?? 'A Tulay member',
            title: latestActive.intendedOutcome ?? 'Collaboration',
            next: latestActive.nextSteps.find((step) => !step.done)?.text ?? null,
            progress: total > 0 ? { done: latestActive.nextSteps.filter((step) => step.done).length, total } : null,
          }
        }
        const careerGoal = member?.profile.careerGoal?.trim() ? member.profile.careerGoal : null
        server = {
          displayName: member?.profile.displayName ?? user.email?.split('@')[0] ?? 'there',
          overview: {
            directoryMembers: directory.length,
            pendingIntroductions: pendingIntros.length,
            activeCollaborations: active.length,
            completedCollaborations: completed.length,
            helpedCount: 0,
            goalsCount: careerGoal ? 1 : 0,
            unreadNotifications: notifications.filter((item) => !item.read).length,
            actionsDue: pendingIntros.length + active.length,
          },
          notifications: notifications.slice(0, 20).map((item) => ({
            id: item.id as string,
            title: item.title,
            body: item.body,
            read: item.read,
            link: item.link,
          })),
          upcoming: upcoming.slice(0, 5),
          active: activeView,
          careerGoal,
          openNeeds: openNeeds.slice(0, 5).map((need) => ({ id: need.id, description: need.description })),
        }
        if (openNeeds[0]) {
          serverMatches = await repo.findMatchesFor(openNeeds[0], member?.offers ?? [], 3)
          serverMatchNeed = openNeeds[0].description
        }
      } catch {
        server = null
      }
    }
  }

  return (
    <Dashboard
      demoMode={demoMode}
      server={server}
      serverMatches={serverMatches}
      serverMatchNeed={serverMatchNeed}
      directoryMembers={stats.members}
      community={community}
    />
  )
}
