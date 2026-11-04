'use client'

import Link from 'next/link'
import { findCandidates, type CandidateMatch } from '@tulay/shared'
import type { PublicCommunityMember } from '@/lib/directory'
import type { AuthedDashboardData } from '@/lib/dashboard'
import {
  removeJourneyGoal,
  type JourneyInteractionKind,
  type JourneySnapshot,
} from '@/lib/journey-store'
import type { RecommendedStep } from '@/lib/dashboard'
import { Arko } from '@/components/Arko'
import { DemoBadge, EmptyState, LinkButton, Tag, humanizeTag } from '@/components/ui'
import { ArrowRight, Swap } from '@/components/icons'

/**
 * Dashboard sections driven by real local state: matches for the visitor's
 * own open needs (never invented people, never numeric match scores), their
 * goals, recent interactions and recommended next steps.
 */
export function PotentialMatches({
  community,
  journey,
  serverMode,
  serverMatches,
  serverMatchNeed,
}: {
  community: PublicCommunityMember[]
  journey: JourneySnapshot
  serverMode: boolean
  serverMatches: CandidateMatch[]
  serverMatchNeed: string | null
}) {
  const need = serverMode ? null : journey.needs.find((item) => item.status === 'open')
  const matches = serverMode
    ? serverMatches
    : need
      ? findCandidates(need, community, { seekerOffers: journey.offers, limit: 3 })
      : []
  const needLabel = serverMode ? serverMatchNeed : need?.description ?? null

  return (
    <section aria-labelledby="potential-matches">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="potential-matches" className="text-xl font-extrabold tracking-tight text-ink">
          Potential matches for you
        </h2>
        <Link href="/discover" className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-forest hover:underline">
          View all
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      {!needLabel ? (
        <div className="mt-3">
          <EmptyState
            title="Tell Arko what you need"
            action={
              <span className="flex flex-wrap justify-center gap-2">
                <LinkButton href="/ask">Ask Arko</LinkButton>
                {!serverMode && (
                  <LinkButton href="/start" variant="secondary">Try the guided journey</LinkButton>
                )}
              </span>
            }
          >
            Matches appear here once you describe the help you need.{' '}
            {serverMode
              ? 'Everyone shown is a discoverable member'
              : 'Everyone shown is a sample member from the demo community'}{' '}
            — Tulay never invents people.
          </EmptyState>
        </div>
      ) : matches.length === 0 ? (
        <div className="mt-3 flex items-start gap-3 rounded-[var(--radius-card)] border border-dashed border-line bg-white/60 p-5">
          <Arko state="empty" size={64} label="Arko found no matches" />
          <div>
            <p className="font-bold text-ink">No one matches that need yet</p>
            <p className="mt-1 text-sm text-muted">
              Try broadening “{needLabel.slice(0, 80)}” in Ask Arko, or browse the whole
              directory yourself.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <LinkButton href="/ask" size="md">Refine with Arko</LinkButton>
              <LinkButton href="/discover" variant="secondary" size="md">Browse directory</LinkButton>
            </div>
          </div>
        </div>
      ) : (
        <ul className="mt-3 grid gap-3 md:grid-cols-3">
          {matches.map((match) => (
            <li
              key={`${match.profile.id}-${match.offer.id}`}
              className="flex flex-col rounded-3xl border border-line/70 bg-white p-4 shadow-[var(--shadow-card)]"
            >
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-mist text-sm font-bold text-forest"
                >
                  {match.profile.displayName
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join('')
                    .toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-bold text-ink">{match.profile.displayName}</p>
                  <p className="truncate text-xs text-muted">
                    {match.profile.careerGoal?.slice(0, 60) ?? match.offer.description.slice(0, 60)}
                  </p>
                </div>
              </div>
              {match.profile.isDemo && (
                <div className="mt-2">
                  <DemoBadge />
                </div>
              )}
              {match.sharedTags.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Matching skills">
                  {match.sharedTags.slice(0, 3).map((tag) => (
                    <li key={tag}>
                      <Tag>{humanizeTag(tag)}</Tag>
                    </li>
                  ))}
                </ul>
              )}
              {match.reciprocal && (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-coral-ink">
                  <Swap className="h-3.5 w-3.5 shrink-0" />
                  You can help each other
                </p>
              )}
              <p className="mt-2 line-clamp-2 text-[13px] text-muted">{match.reasons[0]}</p>
              <Link
                href={`/ask?meet=${encodeURIComponent(match.profile.id ?? '')}${need?.id ? `&need=${encodeURIComponent(need.id)}` : ''}`}
                className="mt-3 inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-forest hover:underline"
              >
                Meet {match.profile.displayName.split(' ')[0]}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function AuthedContinue({
  server,
  steps,
}: {
  server: AuthedDashboardData
  steps: RecommendedStep[]
}) {
  return (
    <section aria-labelledby="continue-journey">
      <h2 id="continue-journey" className="text-xl font-extrabold tracking-tight text-ink">
        Continue your journey
      </h2>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <div className="rounded-3xl border border-line/70 bg-white p-4 shadow-[var(--shadow-card)]">
          <h3 className="text-sm font-bold text-ink">Your direction</h3>
          {server.careerGoal ? (
            <p className="mt-2 text-sm text-ink">{server.careerGoal}</p>
          ) : (
            <p className="mt-2 text-sm text-muted">
              No goal yet.{' '}
              <Link href="/profile" className="font-semibold text-forest hover:underline">
                Set one on your profile
              </Link>
              .
            </p>
          )}
          {server.openNeeds.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {server.openNeeds.map((need) => (
                <li key={need.id ?? need.description} className="text-sm text-muted">
                  <span className="font-semibold text-forest-dark">Need: </span>
                  {need.description}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-3xl border border-line/70 bg-white p-4 shadow-[var(--shadow-card)]">
          <h3 className="text-sm font-bold text-ink">Recent activity</h3>
          {server.notifications.length === 0 ? (
            <p className="mt-2 text-sm text-muted">
              Nothing yet. Introductions and collaboration updates land here.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {server.notifications.slice(0, 4).map((item) => (
                <li key={item.id} className="text-sm">
                  <span className="font-semibold text-forest-dark">{item.title}</span>
                  <span className="block truncate text-muted">{item.body}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-3xl border border-line/70 bg-white p-4 shadow-[var(--shadow-card)]">
          <h3 className="text-sm font-bold text-ink">Recommended next steps</h3>
          <ul className="mt-2 space-y-1">
            {steps.map((step) => (
              <li key={step.id}>
                <Link href={step.href} className="group block rounded-2xl px-2 py-1.5 transition hover:bg-ivory">
                  <span className="flex items-center gap-1 text-sm font-semibold text-ink">
                    {step.title}
                    <ArrowRight className="h-3.5 w-3.5 text-muted transition group-hover:translate-x-0.5" />
                  </span>
                  <span className="block text-[13px] leading-snug text-muted">{step.detail}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

const INTERACTION_LABEL: Record<JourneyInteractionKind, string> = {
  'arko-chat': 'Asked Arko',
  'match-viewed': 'Viewed matches',
  'introduction-sent': 'Sent an introduction',
  'introduction-received': 'Received an introduction',
  'collaboration-updated': 'Updated a collaboration',
  'outcome-recorded': 'Recorded an outcome',
}

export function ContinueJourney({
  journey,
  steps,
}: {
  journey: JourneySnapshot
  steps: RecommendedStep[]
}) {
  return (
    <section aria-labelledby="continue-journey">
      <h2 id="continue-journey" className="text-xl font-extrabold tracking-tight text-ink">
        Continue your journey
      </h2>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <div className="rounded-3xl border border-line/70 bg-white p-4 shadow-[var(--shadow-card)]">
          <h3 className="text-sm font-bold text-ink">Your goals</h3>
          {journey.goals.length === 0 ? (
            <p className="mt-2 text-sm text-muted">
              No goals yet.{' '}
              <Link href="/ask" className="font-semibold text-forest hover:underline">
                State one with Arko
              </Link>
              .
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {journey.goals.slice(0, 4).map((goal) => (
                <li key={goal.id} className="flex items-start justify-between gap-2 text-sm text-ink">
                  <span className="min-w-0">{goal.text}</span>
                  <button
                    type="button"
                    onClick={() => removeJourneyGoal(goal.id)}
                    aria-label={`Remove goal: ${goal.text}`}
                    className="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold text-muted hover:bg-ivory hover:text-danger"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-3xl border border-line/70 bg-white p-4 shadow-[var(--shadow-card)]">
          <h3 className="text-sm font-bold text-ink">Recent interactions</h3>
          {journey.interactions.length === 0 ? (
            <p className="mt-2 text-sm text-muted">
              Nothing yet. Conversations, matches and introductions land here.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {journey.interactions.slice(0, 4).map((item) => (
                <li key={item.id} className="text-sm">
                  <span className="font-semibold text-forest-dark">{INTERACTION_LABEL[item.kind]}</span>
                  <span className="block truncate text-muted">{item.label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-3xl border border-line/70 bg-white p-4 shadow-[var(--shadow-card)]">
          <h3 className="text-sm font-bold text-ink">Recommended next steps</h3>
          {steps.length === 0 ? (
            <p className="mt-2 text-sm text-muted">
              All caught up.{' '}
              <Link href="/discover" className="font-semibold text-forest hover:underline">
                Browse the directory
              </Link>{' '}
              for someone new.
            </p>
          ) : (
            <ul className="mt-2 space-y-1">
              {steps.map((step) => (
                <li key={step.id}>
                  <Link href={step.href} className="group block rounded-2xl px-2 py-1.5 transition hover:bg-ivory">
                    <span className="flex items-center gap-1 text-sm font-semibold text-ink">
                      {step.title}
                      <ArrowRight className="h-3.5 w-3.5 text-muted transition group-hover:translate-x-0.5" />
                    </span>
                    <span className="block text-[13px] leading-snug text-muted">{step.detail}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
