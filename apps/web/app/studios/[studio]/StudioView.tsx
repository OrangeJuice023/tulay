import Link from 'next/link'
import type { CandidateMatch } from '@tulay/shared'
import { STUDIOS, type StudioConfig, type StudioMemberLike, type StudioOpportunity } from '@/lib/studios'
import { AppNav } from '@/components/AppNav'
import { Arko } from '@/components/Arko'
import { GuestNotice } from '@/components/GuestNotice'
import { DemoBadge, LinkButton, Tag, humanizeTag } from '@/components/ui'
import { ArrowRight, Briefcase, Leaf, Rocket } from '@/components/icons'

const STUDIO_ICON = { career: Leaf, freelance: Briefcase, venture: Rocket } as const

/**
 * One studio workspace: purpose header, a live panel that is genuinely
 * different per studio (mentors, opportunity board, team needs), the five
 * tools with honest Live / In-design statuses, and links to the other
 * studios. Guests see labelled sample data; signed-in members see their own
 * matches. Never another generic selector.
 */
export function StudioView({
  studio,
  authed,
  shortlist,
  opportunities,
  matches,
  matchNeed,
}: {
  studio: StudioConfig
  authed: boolean
  shortlist: StudioMemberLike[]
  opportunities: StudioOpportunity[]
  matches: CandidateMatch[]
  matchNeed: string | null
}) {
  const Icon = STUDIO_ICON[studio.id]
  const others = STUDIOS.filter((entry) => entry.id !== studio.id)
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 lg:flex-row lg:items-start">
      <AppNav />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid h-14 w-14 place-items-center rounded-3xl bg-mist text-forest">
            <Icon className="h-7 w-7" />
          </span>
          <div className="min-w-52 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-extrabold tracking-tight text-ink">{studio.name}</h1>
              {!authed && <DemoBadge label="Studio preview" />}
            </div>
            <p className="mt-1 text-muted">{studio.audience}</p>
            {!authed && (
              <GuestNotice line="Guest preview — people and opportunities here are sample demo data." />
            )}
          </div>
          <Arko state="searching" size={72} label={`Arko in the ${studio.name}`} />
        </div>

        <p className="mt-4 max-w-2xl text-[15px] text-ink">{studio.purpose}</p>

        {studio.id === 'career' && (
          <MentorPanel authed={authed} shortlist={shortlist} matches={matches} matchNeed={matchNeed} />
        )}
        {studio.id === 'freelance' && <OpportunityPanel authed={authed} opportunities={opportunities} />}
        {studio.id === 'venture' && (
          <TeamPanel authed={authed} shortlist={shortlist} opportunities={opportunities} matches={matches} matchNeed={matchNeed} />
        )}

        <section aria-labelledby="studio-tools" className="mt-8">
          <h2 id="studio-tools" className="text-xl font-extrabold tracking-tight text-ink">
            {studio.name} tools
          </h2>
          <ul className="mt-3 grid gap-3 md:grid-cols-2">
            {studio.tools.map((tool) => (
              <li
                key={tool.id}
                className="flex flex-col rounded-[var(--radius-card)] border border-line/70 bg-white p-5 shadow-[var(--shadow-card)]"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-ink">{tool.title}</h3>
                  {tool.status === 'live' ? (
                    <span className="inline-flex shrink-0 items-center rounded-full bg-mist px-2.5 py-0.5 text-xs font-semibold text-forest-dark">
                      Live
                    </span>
                  ) : (
                    <span className="inline-flex shrink-0 items-center rounded-full bg-peach px-2.5 py-0.5 text-xs font-semibold text-coral-ink">
                      Preview
                    </span>
                  )}
                </div>
                <p className="mt-1 flex-1 text-sm text-muted">{tool.body}</p>
                {tool.status === 'preview' && (
                  <p className="mt-2 text-[13px] text-muted">
                    Preview only — this tool is not built yet.
                  </p>
                )}
                <div className="mt-3">
                  <LinkButton href={tool.href} variant={tool.status === 'live' ? 'primary' : 'secondary'} size="md">
                    {tool.ctaLabel}
                    <ArrowRight className="h-4 w-4" />
                  </LinkButton>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <nav aria-label="Other studios" className="mt-8 flex flex-wrap gap-2">
          {others.map((other) => (
            <Link
              key={other.id}
              href={`/studios/${other.id}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line/70 bg-white px-5 text-sm font-semibold text-ink shadow-[var(--shadow-card)] transition hover:border-forest/40"
            >
              {other.name}
              <ArrowRight className="h-4 w-4 text-muted" />
            </Link>
          ))}
        </nav>
      </div>
    </div>
  )
}

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || '?'
  )
}

function MentorPanel({
  authed,
  shortlist,
  matches,
  matchNeed,
}: {
  authed: boolean
  shortlist: StudioMemberLike[]
  matches: CandidateMatch[]
  matchNeed: string | null
}) {
  return (
    <section aria-labelledby="mentor-panel" className="mt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="mentor-panel" className="text-xl font-extrabold tracking-tight text-ink">
          Mentors & matches
        </h2>
        <Link href="/discover" className="inline-flex items-center gap-1 text-sm font-semibold text-forest hover:underline">
          Browse directory
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      {!authed && shortlist.length > 0 && (
        <ul className="mt-3 grid gap-3 md:grid-cols-3">
          {shortlist.map((member) => (
            <li key={member.profile.id as string} className="flex flex-col rounded-3xl border border-line/70 bg-white p-4 shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-mist text-sm font-bold text-forest">
                  {initialsOf(member.profile.displayName)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-bold text-ink">{member.profile.displayName}</p>
                  <p className="truncate text-xs text-muted">{member.offers[0]?.description.slice(0, 60)}</p>
                </div>
              </div>
              <div className="mt-2">
                <DemoBadge />
              </div>
              <div className="mt-3">
                <LinkButton href={`/ask?meet=${member.profile.id}`} variant="secondary" size="md">
                  Ask for an intro
                </LinkButton>
              </div>
            </li>
          ))}
        </ul>
      )}
      {authed && matches.length > 0 && (
        <div className="mt-3">
          <p className="text-sm text-muted">
            For your need: “{matchNeed?.slice(0, 90)}”
          </p>
          <ul className="mt-2 grid gap-3 md:grid-cols-3">
            {matches.slice(0, 3).map((match) => (
              <li key={match.profile.id as string} className="rounded-3xl border border-line/70 bg-white p-4 shadow-[var(--shadow-card)]">
                <p className="font-bold text-ink">{match.profile.displayName}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted">{match.offer.description}</p>
                <div className="mt-3">
                  <LinkButton href={`/ask?meet=${match.profile.id}`} variant="secondary" size="md">
                    Ask for an intro
                  </LinkButton>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {((authed && matches.length === 0) || (!authed && shortlist.length === 0)) && (
        <div className="mt-3 rounded-[var(--radius-card)] border border-dashed border-line bg-white/60 p-5">
          <p className="font-bold text-ink">No matches here yet</p>
          <p className="mt-1 text-sm text-muted">Describe your need and Arko will search for mentors.</p>
          <div className="mt-3">
            <LinkButton href="/ask" size="md">Ask Arko</LinkButton>
          </div>
        </div>
      )}
    </section>
  )
}

function OpportunityPanel({
  authed,
  opportunities,
}: {
  authed: boolean
  opportunities: StudioOpportunity[]
}) {
  return (
    <section aria-labelledby="opportunity-panel" className="mt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="opportunity-panel" className="text-xl font-extrabold tracking-tight text-ink">
          Opportunity board
        </h2>
        <Link href="/discover" className="inline-flex items-center gap-1 text-sm font-semibold text-forest hover:underline">
          Browse directory
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <p className="mt-1 text-sm text-muted">
        {authed
          ? 'Open needs from discoverable members. Offer help through an introduction.'
          : 'Open needs from the sample community. Guests preview introductions; nothing is sent.'}
      </p>
      {opportunities.length === 0 ? (
        <div className="mt-3 rounded-[var(--radius-card)] border border-dashed border-line bg-white/60 p-5">
          <p className="font-bold text-ink">No open needs right now</p>
          <p className="mt-1 text-sm text-muted">Check the directory or describe what you offer in Ask Arko.</p>
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {opportunities.map((item) => (
            <li
              key={`${item.seekerId}-${item.description.slice(0, 24)}`}
              className="flex flex-wrap items-center gap-3 rounded-3xl border border-line/70 bg-white px-4 py-3 shadow-[var(--shadow-card)]"
            >
              <div className="min-w-52 flex-1">
                <p className="text-[15px] font-semibold text-ink">{item.description}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[13px] text-muted">
                  <span>Posted by {item.seekerName}</span>
                  {item.isDemo && <DemoBadge />}
                </p>
                {item.tags.length > 0 && (
                  <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label="Needed skills">
                    {item.tags.slice(0, 4).map((tag) => (
                      <li key={tag}>
                        <Tag>{humanizeTag(tag)}</Tag>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <LinkButton href={`/ask?meet=${item.seekerId}`} variant="secondary" size="md">
                Offer help
              </LinkButton>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

const VENTURE_ROLES = [
  { label: 'Co-founder', prompt: 'I need a technical co-founder' },
  { label: 'Early users', prompt: 'Find me early users for customer discovery interviews' },
  { label: 'Domain expert', prompt: 'Find me an advisor who knows my market' },
]

function TeamPanel({
  authed,
  shortlist,
  opportunities,
  matches,
  matchNeed,
}: {
  authed: boolean
  shortlist: StudioMemberLike[]
  opportunities: StudioOpportunity[]
  matches: CandidateMatch[]
  matchNeed: string | null
}) {
  return (
    <section aria-labelledby="team-panel" className="mt-6">
      <h2 id="team-panel" className="text-xl font-extrabold tracking-tight text-ink">
        Build your team
      </h2>
      <p className="mt-1 text-sm text-muted">
        Name the role you need. Matching finds people whose offers fit — introductions stay consent-gated.
      </p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-3">
        {VENTURE_ROLES.map((role) => (
          <li key={role.label}>
            <Link
              href={`/ask?q=${encodeURIComponent(role.prompt)}`}
              className="flex min-h-14 items-center justify-between gap-2 rounded-3xl border border-line/70 bg-white px-4 py-3 shadow-[var(--shadow-card)] transition hover:border-forest/40"
            >
              <span className="text-sm font-semibold text-ink">{role.label}</span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted" />
            </Link>
          </li>
        ))}
      </ul>
      <h3 className="mt-5 font-bold text-ink">
        {authed ? 'Your current shortlist' : 'Team needs people are posting'}
      </h3>
      {authed ? (
        matches.length > 0 ? (
          <div className="mt-2">
            <p className="text-sm text-muted">For your need: “{matchNeed?.slice(0, 90)}”</p>
            <ul className="mt-2 grid gap-3 md:grid-cols-3">
              {matches.slice(0, 3).map((match) => (
                <li key={match.profile.id as string} className="rounded-3xl border border-line/70 bg-white p-4 shadow-[var(--shadow-card)]">
                  <p className="font-bold text-ink">{match.profile.displayName}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{match.offer.description}</p>
                  <div className="mt-3">
                    <LinkButton href={`/ask?meet=${match.profile.id}`} variant="secondary" size="md">
                      Ask for an intro
                    </LinkButton>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">
            No shortlist yet — pick a role above and Arko will search.
          </p>
        )
      ) : shortlist.length > 0 ? (
        <ul className="mt-2 grid gap-3 md:grid-cols-3">
          {shortlist.map((member) => (
            <li key={member.profile.id as string} className="rounded-3xl border border-line/70 bg-white p-4 shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-mist text-sm font-bold text-forest">
                  {initialsOf(member.profile.displayName)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-bold text-ink">{member.profile.displayName}</p>
                  <p className="truncate text-xs text-muted">{member.offers[0]?.description.slice(0, 60)}</p>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <DemoBadge />
              </div>
              <div className="mt-3">
                <LinkButton href={`/ask?meet=${member.profile.id}`} variant="secondary" size="md">
                  Ask for an intro
                </LinkButton>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted">No team needs posted right now.</p>
      )}
      {!authed && opportunities.length > 0 && (
        <ul className="mt-3 space-y-2">
          {opportunities.slice(0, 3).map((item) => (
            <li
              key={`${item.seekerId}-${item.description.slice(0, 24)}`}
              className="rounded-3xl border border-line/70 bg-white px-4 py-3 text-sm shadow-[var(--shadow-card)]"
            >
              <span className="font-semibold text-ink">{item.seekerName}</span>
              <span className="text-muted"> seeks: {item.description}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
