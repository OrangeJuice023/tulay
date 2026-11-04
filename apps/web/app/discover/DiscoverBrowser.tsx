'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { memberMatchesFilters, type Studio } from '@tulay/shared'
import type { PublicDirectoryMember } from '@/lib/directory'
import {
  getSnapshot,
  getServerSnapshot,
  subscribe,
} from '@/lib/journey-store'
import { AppNav } from '@/components/AppNav'
import { Arko } from '@/components/Arko'
import { DemoBadge, EmptyState, Notice, Tag, humanizeTag } from '@/components/ui'
import { ArrowRight } from '@/components/icons'

const STUDIOS: Array<{ id: Studio | 'all'; label: string }> = [
  { id: 'all', label: 'Everyone' },
  { id: 'career', label: 'Career changers' },
  { id: 'freelance', label: 'Freelancers' },
  { id: 'venture', label: 'Founders' },
]

/**
 * Directory browsing over contact-stripped public rows. Filters run through
 * the shared `memberMatchesFilters` helper; counts are computed, never typed.
 */
export function DiscoverBrowser({
  members,
  allDemo,
}: {
  members: PublicDirectoryMember[]
  allDemo: boolean
}) {
  const journey = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const [query, setQuery] = useState('')
  const [studio, setStudio] = useState<Studio | 'all'>('all')
  const [skill, setSkill] = useState('')

  const skills = useMemo(() => {
    const tags = new Set<string>()
    for (const member of members) {
      for (const offer of member.offers) offer.tags.forEach((tag) => tags.add(tag))
    }
    return [...tags].sort()
  }, [members])

  const visible = useMemo(
    () =>
      members.filter((member) =>
        memberMatchesFilters(member, {
          query: query || undefined,
          studio: studio === 'all' ? undefined : studio,
          skill: skill || undefined,
        }),
      ),
    [members, query, studio, skill],
  )

  const pending = journey.introductions.filter((item) => item.request.status === 'pending').length

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 lg:flex-row lg:items-start">
      <AppNav pendingIntroductions={pending} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-52 flex-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-ink">Discover people</h1>
            <p className="mt-1 text-muted">
              {visible.length} of {members.length} members shown. Browse by path, skill or keyword —
              then ask Arko for an introduction.
            </p>
          </div>
          <Arko state="searching" size={72} label="Arko searching the directory" />
        </div>
        {allDemo && (
          <div className="mt-4">
            <Notice tone="demo" title="Demo community">
              Everyone here is a fictional demo member, clearly labelled. No contact details are shown
              before mutual consent.
            </Notice>
          </div>
        )}

        <form
          role="search"
          aria-label="Filter members"
          onSubmit={(event) => event.preventDefault()}
          className="mt-5 grid gap-3 rounded-[var(--radius-card)] border border-line/70 bg-white p-4 shadow-[var(--shadow-card)] sm:grid-cols-3"
        >
          <div>
            <label htmlFor="discover-q" className="block text-sm font-semibold text-ink">
              Search
            </label>
            <input
              id="discover-q"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="e.g. pricing, UX, co-founder"
              className="mt-1.5 w-full rounded-2xl border border-line bg-ivory px-4 py-2.5 text-[15px] focus:border-forest"
            />
          </div>
          <fieldset>
            <legend className="text-sm font-semibold text-ink">Path</legend>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {STUDIOS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={studio === option.id}
                  onClick={() => setStudio(option.id)}
                  className={`rounded-full px-3.5 py-2 text-sm font-medium transition ${
                    studio === option.id ? 'bg-forest text-white' : 'bg-ivory text-ink ring-1 ring-line hover:ring-forest/50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="discover-skill" className="block text-sm font-semibold text-ink">
              Skill offered
            </label>
            <select
              id="discover-skill"
              value={skill}
              onChange={(event) => setSkill(event.target.value)}
              className="mt-1.5 w-full rounded-2xl border border-line bg-ivory px-4 py-2.5 text-[15px] focus:border-forest"
            >
              <option value="">Any skill</option>
              {skills.map((tag) => (
                <option key={tag} value={tag}>
                  {humanizeTag(tag)}
                </option>
              ))}
            </select>
          </div>
        </form>

        {visible.length === 0 ? (
          <div className="mt-5">
            <EmptyState
              title="No members match those filters"
              action={
                <button
                  type="button"
                  onClick={() => {
                    setQuery('')
                    setStudio('all')
                    setSkill('')
                  }}
                  className="inline-flex min-h-11 items-center rounded-full bg-forest px-5 text-sm font-semibold text-white"
                >
                  Clear filters
                </button>
              }
            >
              Try fewer words, another path, or any skill.
            </EmptyState>
          </div>
        ) : (
          <ul className="mt-5 grid gap-3 md:grid-cols-2">
            {visible.map((member) => (
              <li
                key={member.profile.id}
                className="flex flex-col rounded-[var(--radius-card)] border border-line/70 bg-white p-5 shadow-[var(--shadow-card)]"
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-mist text-base font-bold text-forest"
                  >
                    {member.profile.displayName
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join('')
                      .toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-ink">{member.profile.displayName}</h2>
                      {member.profile.isDemo && <DemoBadge />}
                    </div>
                    {member.profile.headline && (
                      <p className="text-sm text-muted">{member.profile.headline}</p>
                    )}
                  </div>
                </div>
                {member.offers.length > 0 && (
                  <div className="mt-3 rounded-2xl bg-ivory p-3.5">
                    <p className="text-xs font-semibold tracking-wide text-muted uppercase">Offers</p>
                    <p className="mt-0.5 text-sm text-ink">{member.offers[0].description}</p>
                    {member.offers[0].capacity && (
                      <p className="mt-0.5 text-xs text-muted">Capacity: {member.offers[0].capacity}</p>
                    )}
                  </div>
                )}
                {member.offers[0]?.tags.length ? (
                  <ul className="mt-2.5 flex flex-wrap gap-1.5" aria-label="Skills offered">
                    {member.offers
                      .flatMap((offer) => offer.tags)
                      .slice(0, 4)
                      .map((tag) => (
                        <li key={tag}>
                          <Tag>{humanizeTag(tag)}</Tag>
                        </li>
                      ))}
                  </ul>
                ) : null}
                <Link
                  href={`/ask?meet=${encodeURIComponent(member.profile.id ?? '')}`}
                  className="mt-3 inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-forest hover:underline"
                >
                  Ask Arko about meeting {member.profile.displayName.split(' ')[0]}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
