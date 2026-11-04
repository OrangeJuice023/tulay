'use client'

import { useState, useSyncExternalStore } from 'react'
import type { DirectoryMember } from '@tulay/shared'
import {
  addJourneyNeed,
  addJourneyOffer,
  addJourneyGoal,
  getSnapshot,
  getServerSnapshot,
  setJourneyProfile,
  subscribe,
} from '@/lib/journey-store'
import { DEMO_SEEKER_ID } from '@/lib/paths'
import { signOutAction } from '@/lib/supabase/auth-actions'
import { AppNav } from '@/components/AppNav'
import { Arko } from '@/components/Arko'
import { DemoBadge, Notice, Tag, TextAreaField, TextField } from '@/components/ui'
import { addNeedAction, addOfferAction, closeNeedAction, saveProfileAction } from './actions'

function Shell({ children, pending }: { children: React.ReactNode; pending: number }) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 lg:flex-row lg:items-start">
      <AppNav pendingIntroductions={pending} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

function splitTags(value: string): string[] {
  return value.split(',').map((tag) => tag.trim().toLowerCase().slice(0, 50)).filter(Boolean).slice(0, 10)
}

/** Signed-in profile: real rows, RLS-enforced. Unverifiable without a project. */
export function AuthedProfileEditor({
  email,
  member,
}: {
  email: string | null
  member: DirectoryMember | null
}) {
  const profile = member?.profile
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '')
  const [headline, setHeadline] = useState(profile?.headline ?? '')
  const [careerGoal, setCareerGoal] = useState(profile?.careerGoal ?? '')
  const [availability, setAvailability] = useState(profile?.availability ?? '')
  const [contactMethod, setContactMethod] = useState(profile?.contactMethod ?? '')
  const [location, setLocation] = useState(profile?.location ?? '')
  const [discoverable, setDiscoverable] = useState(profile?.discoverable ?? true)
  const [needText, setNeedText] = useState('')
  const [needTags, setNeedTags] = useState('')
  const [offerText, setOfferText] = useState('')
  const [offerTags, setOfferTags] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function run(action: () => Promise<{ ok: boolean; error?: string }>, done: string) {
    setPending(true)
    setError(null)
    setMessage(null)
    try {
      const result = await action()
      if (result.ok) setMessage(done)
      else setError(result.error ?? 'Something went wrong.')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <Shell pending={0}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-52 flex-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">My profile</h1>
          <p className="mt-1 text-muted">
            {email ? `Signed in as ${email}.` : 'Signed in.'} Only discoverable fields are visible to others.
          </p>
        </div>
        <Arko state="curious" size={72} label="Arko looking at your profile" />
      </div>
      {message && <p role="status" className="mt-4 text-sm font-semibold text-forest">{message}</p>}
      {error && <p role="alert" className="mt-4 text-sm font-medium text-danger">{error}</p>}

      <form
        onSubmit={(event) => {
          event.preventDefault()
          void run(
            () =>
              saveProfileAction({
                profile: {
                  displayName, headline, careerGoal, availability, contactMethod, location, discoverable,
                  bio: profile?.bio, careerBackground: profile?.careerBackground,
                  currentSituation: profile?.currentSituation, languages: profile?.languages ?? ['en'],
                },
              }),
            'Profile saved.',
          )
        }}
        className="mt-5 space-y-4 rounded-[var(--radius-card)] border border-line/70 bg-white p-5 shadow-[var(--shadow-card)] sm:p-6"
      >
        <TextField id="profile-name" label="Display name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} required maxLength={100} />
        <TextField id="profile-headline" label="Headline" value={headline} onChange={(event) => setHeadline(event.target.value)} optional maxLength={160} placeholder="e.g. Support lead becoming a UX designer" />
        <TextAreaField id="profile-goal" label="Career goal" value={careerGoal} onChange={(event) => setCareerGoal(event.target.value)} required maxLength={2000} hint="The move you are making. Matching starts here." />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField id="profile-availability" label="Availability" value={availability} onChange={(event) => setAvailability(event.target.value)} optional maxLength={200} placeholder="e.g. weekday evenings" />
          <TextField id="profile-location" label="Location" value={location} onChange={(event) => setLocation(event.target.value)} optional maxLength={200} placeholder="e.g. Manila" />
        </div>
        <TextField id="profile-contact" label="Contact method" value={contactMethod} onChange={(event) => setContactMethod(event.target.value)} optional maxLength={500} hint="Shown only to people you mutually accept. Never shown in discovery." />
        <label className="flex items-center gap-3 text-sm font-medium text-ink">
          <input type="checkbox" checked={discoverable} onChange={(event) => setDiscoverable(event.target.checked)} className="h-5 w-5 accent-[#176B46]" />
          Let others discover me
        </label>
        <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center rounded-full bg-forest px-6 text-sm font-semibold text-white shadow-[var(--shadow-press)] transition hover:bg-forest-dark active:translate-y-[3px] active:shadow-none disabled:opacity-50">
          {pending ? 'Saving…' : 'Save profile'}
        </button>
      </form>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section aria-labelledby="needs" className="rounded-[var(--radius-card)] border border-line/70 bg-white p-5 shadow-[var(--shadow-card)]">
          <h2 id="needs" className="text-lg font-extrabold text-ink">Needs</h2>
          {(member?.needs ?? []).length === 0 ? (
            <p className="mt-2 text-sm text-muted">No needs yet. Name one specific thing that would help.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {(member?.needs ?? []).map((need) => (
                <li key={need.id} className="flex items-start justify-between gap-2 text-sm">
                  <span>
                    <span className="text-ink">{need.description}</span>
                    <span className="ml-2 text-xs text-muted">({need.status})</span>
                  </span>
                  {need.status === 'open' && (
                    <button
                      type="button"
                      onClick={() => void run(() => closeNeedAction({ needId: need.id }), 'Need closed.')}
                      className="shrink-0 rounded-full px-2 py-1 text-xs font-semibold text-muted hover:bg-ivory"
                    >
                      Close
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void run(() => addNeedAction({ description: needText, tags: splitTags(needTags) }), 'Need added.').then(() => {
                setNeedText('')
                setNeedTags('')
              })
            }}
            className="mt-3 space-y-2 border-t border-line/70 pt-3"
          >
            <TextField id="need-text" label="New need" value={needText} onChange={(event) => setNeedText(event.target.value)} required maxLength={2000} placeholder="e.g. Portfolio review before I apply" />
            <TextField id="need-tags" label="Skill tags" value={needTags} onChange={(event) => setNeedTags(event.target.value)} optional placeholder="portfolio-review, ux-design" />
            <button type="submit" disabled={pending} className="inline-flex min-h-10 items-center rounded-full bg-mist px-4 text-sm font-semibold text-forest-dark transition hover:bg-mist/70 disabled:opacity-50">
              Add need
            </button>
          </form>
        </section>
        <section aria-labelledby="offers" className="rounded-[var(--radius-card)] border border-line/70 bg-white p-5 shadow-[var(--shadow-card)]">
          <h2 id="offers" className="text-lg font-extrabold text-ink">Offers</h2>
          {(member?.offers ?? []).length === 0 ? (
            <p className="mt-2 text-sm text-muted">No offers yet. What could you help someone with?</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {(member?.offers ?? []).map((offer) => (
                <li key={offer.id} className="text-sm text-ink">
                  {offer.description}
                  <span className="ml-2 text-xs text-muted">({offer.status})</span>
                </li>
              ))}
            </ul>
          )}
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void run(() => addOfferAction({ description: offerText, tags: splitTags(offerTags) }), 'Offer added.').then(() => {
                setOfferText('')
                setOfferTags('')
              })
            }}
            className="mt-3 space-y-2 border-t border-line/70 pt-3"
          >
            <TextField id="offer-text" label="New offer" value={offerText} onChange={(event) => setOfferText(event.target.value)} required maxLength={2000} placeholder="e.g. English interview practice" />
            <TextField id="offer-tags" label="Skill tags" value={offerTags} onChange={(event) => setOfferTags(event.target.value)} optional placeholder="interview-practice, english" />
            <button type="submit" disabled={pending} className="inline-flex min-h-10 items-center rounded-full bg-mist px-4 text-sm font-semibold text-forest-dark transition hover:bg-mist/70 disabled:opacity-50">
              Add offer
            </button>
          </form>
        </section>
      </div>

      <form action={signOutAction} className="mt-5">
        <button type="submit" className="inline-flex min-h-11 items-center rounded-full bg-white px-5 text-sm font-semibold text-ink ring-1 ring-line transition hover:ring-forest/50">
          Sign out
        </button>
      </form>
    </Shell>
  )
}

/** Demo profile: lives in this browser only, clearly labelled. */
export function DemoProfileEditor() {
  const journey = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [goal, setGoal] = useState<string | null>(null)
  const [availability, setAvailability] = useState<string | null>(null)
  const [needText, setNeedText] = useState('')
  const [offerText, setOfferText] = useState('')
  const [saved, setSaved] = useState(false)
  const pending = journey.introductions.filter((item) => item.request.status === 'pending').length

  function save(event: React.FormEvent) {
    event.preventDefault()
    setJourneyProfile({
      displayName: (displayName ?? journey.profile.displayName).trim() || 'Alex',
      careerGoal: (goal ?? journey.profile.careerGoal ?? '').trim() || undefined,
      availability: (availability ?? journey.profile.availability ?? '').trim() || undefined,
    })
    const goalText = (goal ?? journey.profile.careerGoal ?? '').trim()
    if (goalText) addJourneyGoal(goalText)
    setSaved(true)
  }

  function newUuid(): string {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : '00000000-0000-4000-8000-000000000000'
  }

  return (
    <Shell pending={pending}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-52 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-ink">My profile</h1>
            <DemoBadge label="Demo profile" />
          </div>
          <p className="mt-1 text-muted">Stored in this browser only. Sign in to keep a real profile.</p>
        </div>
        <Arko state="curious" size={72} label="Arko looking at your demo profile" />
      </div>
      <div className="mt-4">
        <Notice tone="demo" title="Demo mode">
          Everything here stays on this device. Ask Arko and the dashboard read from this profile.
        </Notice>
      </div>
      {saved && <p role="status" className="mt-4 text-sm font-semibold text-forest">Saved in this browser.</p>}

      <form onSubmit={save} className="mt-5 space-y-4 rounded-[var(--radius-card)] border border-line/70 bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
        <TextField id="demo-name" label="Display name" value={displayName ?? journey.profile.displayName} onChange={(event) => { setDisplayName(event.target.value); setSaved(false) }} required maxLength={100} />
        <TextAreaField id="demo-goal" label="Career goal" value={goal ?? journey.profile.careerGoal ?? ''} onChange={(event) => { setGoal(event.target.value); setSaved(false) }} optional maxLength={2000} />
        <TextField id="demo-availability" label="Availability" value={availability ?? journey.profile.availability ?? ''} onChange={(event) => { setAvailability(event.target.value); setSaved(false) }} optional maxLength={200} placeholder="e.g. weekday evenings" />
        <button type="submit" className="inline-flex min-h-11 items-center rounded-full bg-forest px-6 text-sm font-semibold text-white shadow-[var(--shadow-press)] transition hover:bg-forest-dark active:translate-y-[3px] active:shadow-none">
          Save demo profile
        </button>
      </form>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section aria-labelledby="demo-needs" className="rounded-[var(--radius-card)] border border-line/70 bg-white p-5 shadow-[var(--shadow-card)]">
          <h2 id="demo-needs" className="text-lg font-extrabold text-ink">Needs</h2>
          {journey.needs.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No needs yet — Ask Arko can create them from your words.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {journey.needs.map((need) => (
                <li key={need.id} className="text-sm text-ink">
                  {need.description}
                  <span className="ml-2 inline-flex flex-wrap gap-1">
                    {need.tags.map((tag) => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (!needText.trim()) return
              addJourneyNeed({ id: newUuid(), profileId: DEMO_SEEKER_ID, description: needText.trim(), tags: [], status: 'open', aiSuggested: false })
              setNeedText('')
            }}
            className="mt-3 border-t border-line/70 pt-3"
          >
            <TextField id="demo-need" label="New need" value={needText} onChange={(event) => setNeedText(event.target.value)} maxLength={2000} placeholder="e.g. Portfolio review" />
            <button type="submit" className="mt-2 inline-flex min-h-10 items-center rounded-full bg-mist px-4 text-sm font-semibold text-forest-dark">
              Add need
            </button>
          </form>
        </section>
        <section aria-labelledby="demo-offers" className="rounded-[var(--radius-card)] border border-line/70 bg-white p-5 shadow-[var(--shadow-card)]">
          <h2 id="demo-offers" className="text-lg font-extrabold text-ink">Offers</h2>
          {journey.offers.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No offers yet — reciprocity starts here.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {journey.offers.map((offer) => (
                <li key={offer.id} className="text-sm text-ink">{offer.description}</li>
              ))}
            </ul>
          )}
          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (!offerText.trim()) return
              addJourneyOffer({ id: newUuid(), profileId: DEMO_SEEKER_ID, description: offerText.trim(), tags: [], status: 'active' })
              setOfferText('')
            }}
            className="mt-3 border-t border-line/70 pt-3"
          >
            <TextField id="demo-offer" label="New offer" value={offerText} onChange={(event) => setOfferText(event.target.value)} maxLength={2000} placeholder="e.g. English interview practice" />
            <button type="submit" className="mt-2 inline-flex min-h-10 items-center rounded-full bg-mist px-4 text-sm font-semibold text-forest-dark">
              Add offer
            </button>
          </form>
        </section>
      </div>
    </Shell>
  )
}
