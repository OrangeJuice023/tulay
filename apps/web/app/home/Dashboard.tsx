'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { CandidateMatch } from '@tulay/shared'
import type { PublicCommunityMember } from '@/lib/directory'
import { markNotificationReadAction } from '../collaborations/actions'
import {
  getSnapshot as getJourney,
  getServerSnapshot as getJourneyServer,
  markAllNotificationsRead,
  markNotificationRead,
  setJourneyProfile,
  subscribe as subscribeJourney,
  type JourneySnapshot,
} from '@/lib/journey-store'
import {
  getSnapshot as getLegacy,
  getServerSnapshot as getLegacyServer,
  subscribe as subscribeLegacy,
  type DemoCollaboration,
} from '@/lib/demo-store'
import {
  connectionsThisWeek,
  firstNameOf,
  greetingForHour,
  recommendNextSteps,
  recommendServerSteps,
  summarizeJourney,
  type AuthedDashboardData,
} from '@/lib/dashboard'
import { AppNav } from '@/components/AppNav'
import { Arko } from '@/components/Arko'
import { GuestNotice } from '@/components/GuestNotice'
import { DemoBadge } from '@/components/ui'
import {
  ArrowRight,
  Bell,
  Briefcase,
  Chat,
  Check,
  Leaf,
  Swap,
  Users,
} from '@/components/icons'
import { AuthedContinue, ContinueJourney, PotentialMatches } from './JourneySections'

const MAX_COVER_BYTES = 800_000
const MAX_AVATAR_BYTES = 200_000

const QUICK_ACTIONS = [
  { label: 'Find a mentor', prompt: 'Find me a mentor who can guide my next career move.', Icon: Users },
  { label: 'Look for a collaborator', prompt: 'I am looking for a collaborator to work with.', Icon: Swap },
  { label: 'Get career advice', prompt: 'Help me figure out my next career move.', Icon: Chat },
  { label: 'Review my portfolio', prompt: 'Can someone review my portfolio?', Icon: Briefcase },
]

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

function readImageFile(file: File, maxBytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please choose an image file.'))
      return
    }
    if (file.size > maxBytes) {
      reject(new Error(`That image is too large (max ${Math.round(maxBytes / 1000)} KB).`))
      return
    }
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(new Error('Could not read that image.'))
    reader.readAsDataURL(file)
  })
}

export function Dashboard({
  demoMode,
  server,
  serverMatches,
  serverMatchNeed,
  directoryMembers,
  community,
}: {
  demoMode: boolean
  server: AuthedDashboardData | null
  serverMatches: CandidateMatch[]
  serverMatchNeed: string | null
  directoryMembers: number
  community: PublicCommunityMember[]
}) {
  const router = useRouter()
  const journey = useSyncExternalStore(subscribeJourney, getJourney, getJourneyServer)
  const legacy = useSyncExternalStore(subscribeLegacy, getLegacy, getLegacyServer)
  const [hour, setHour] = useState<number | null>(null)
  const [composer, setComposer] = useState('')
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [bellOpen, setBellOpen] = useState(false)
  const coverInput = useRef<HTMLInputElement>(null)
  const avatarInput = useRef<HTMLInputElement>(null)

  // Client-local hour after mount: the greeting must use the visitor's clock,
  // and reading it during render would split server and client output.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHour(new Date().getHours())
  }, [])

  useEffect(() => {
    if (!bellOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setBellOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [bellOpen])

  const localOverview = summarizeJourney(journey, legacy, directoryMembers)
  const overview = server?.overview ?? localOverview
  const steps = server ? recommendServerSteps(server) : recommendNextSteps(journey, legacy)
  // Guests are greeted without a name: "Alex" is only ever named as the
  // labelled sample profile in the GuestNotice below, never assumed.
  const firstName = server ? firstNameOf(server.displayName) : null
  const greeting = firstName ? `${greetingForHour(hour ?? 9)}, ${firstName}.` : `${greetingForHour(hour ?? 9)}!`
  const [serverNotifications, setServerNotifications] = useState(server?.notifications ?? [])
  const unreadCount = server ? serverNotifications.filter((item) => !item.read).length : journey.notifications.filter((item) => !item.read).length
  const newConnections = server ? 0 : connectionsThisWeek(journey)

  const upcoming = server?.upcoming ?? buildUpcoming(journey, legacy)
  const activeCollab = server ? server.active : latestActiveCollab(journey, legacy)

  async function onCoverChange(file: File | undefined) {
    if (!file) return
    setPhotoError(null)
    try {
      setJourneyProfile({ coverPhoto: await readImageFile(file, MAX_COVER_BYTES) })
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : 'Could not use that image.')
    }
  }

  async function onAvatarChange(file: File | undefined) {
    if (!file) return
    setPhotoError(null)
    try {
      setJourneyProfile({ avatarPhoto: await readImageFile(file, MAX_AVATAR_BYTES) })
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : 'Could not use that image.')
    }
  }

  function submitComposer(event: React.FormEvent) {
    event.preventDefault()
    const text = composer.trim()
    if (!text) return
    router.push(`/ask?q=${encodeURIComponent(text)}`)
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 lg:flex-row lg:items-start">
      <AppNav pendingIntroductions={overview.pendingIntroductions} />
      <div className="min-w-0 flex-1">
        <h1 className="sr-only">Home</h1>

        {/* Cover + utility row */}
        <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-line/70 bg-forest-dark">
          {!server && journey.profile.coverPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={journey.profile.coverPhoto}
              alt=""
              className="h-40 w-full object-cover sm:h-48"
            />
          ) : (
            <div aria-hidden="true" className="h-40 w-full bg-forest-dark sm:h-48">
              <svg viewBox="0 0 800 160" preserveAspectRatio="xMidYMax slice" className="h-full w-full">
                <circle cx="640" cy="44" r="26" fill="#FDEBD7" opacity="0.9" />
                <rect x="0" y="96" width="800" height="64" fill="#0F4D32" />
                <path
                  d="M0 128 Q 80 100 170 120 T 360 118 T 560 122 T 800 112 V160 H0 Z"
                  fill="#176B46"
                />
                <g stroke="#F6F2E6" strokeWidth="3" fill="none" opacity="0.8">
                  <path d="M300 128 Q 360 84 420 128" />
                  <path d="M420 128 Q 480 84 540 128" />
                </g>
                <line x1="280" y1="128" x2="560" y2="128" stroke="#F6F2E6" strokeWidth="4" opacity="0.8" />
              </svg>
            </div>
          )}
          <div className="absolute top-3 right-3 flex items-center gap-2">
            {!server && (
              <>
                <input
                  ref={coverInput}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  aria-label="Upload a cover photo"
                  onChange={(event) => {
                    void onCoverChange(event.target.files?.[0])
                    event.target.value = ''
                  }}
                />
                <button
                  type="button"
                  onClick={() => coverInput.current?.click()}
                  className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white/95 px-4 text-sm font-semibold text-ink shadow-sm transition hover:bg-white"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true" className="h-4 w-4">
                    <path d="M4 8h3l2-3h6l2 3h3v11H4V8Z" />
                    <circle cx="12" cy="13" r="3.5" />
                  </svg>
                  {journey.profile.coverPhoto ? 'Replace cover photo' : 'Change cover photo'}
                </button>
              </>
            )}
            <div className="relative">
              <button
                type="button"
                onClick={() => setBellOpen((value) => !value)}
                aria-expanded={bellOpen}
                aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
                className="relative grid h-10 w-10 place-items-center rounded-full bg-white/95 text-ink shadow-sm transition hover:bg-white"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span aria-hidden="true" className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-coral" />
                )}
              </button>
              {bellOpen && (
                <div className="absolute right-0 z-40 mt-2 w-80 rounded-3xl border border-line bg-white p-2 shadow-[var(--shadow-card)]">
                  <div className="flex items-center justify-between px-3 pt-2 pb-1">
                    <p className="text-sm font-bold text-ink">Notifications</p>
                    {!server && unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={() => markAllNotificationsRead()}
                        className="rounded-full px-2 py-1 text-xs font-semibold text-forest hover:bg-mist"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <NotificationList
                    items={(server ? serverNotifications : journey.notifications).map((item) => ({
                      id: item.id,
                      title: item.title,
                      body: item.body,
                      read: item.read,
                      link: item.link,
                    }))}
                    onRead={(id) => {
                      if (server) {
                        void markNotificationReadAction({ notificationId: id })
                        setServerNotifications((current) =>
                          current.map((item) => (item.id === id ? { ...item, read: true } : item)),
                        )
                      } else {
                        markNotificationRead(id)
                      }
                    }}
                    onNavigate={() => setBellOpen(false)}
                  />
                </div>
              )}
            </div>
            <Link
              href="/profile"
              aria-label="Open my profile"
              className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-mist text-sm font-bold text-forest-dark ring-2 ring-white/80"
            >
              {!server && journey.profile.avatarPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={journey.profile.avatarPhoto} alt="" className="h-full w-full object-cover" />
              ) : (
                initialsOf(server?.displayName ?? journey.profile.displayName)
              )}
            </Link>
          </div>
        </div>
        {photoError && (
          <p role="alert" className="mt-2 text-sm font-medium text-danger">
            {photoError}
          </p>
        )}

        {/* Greeting band */}
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <div className="relative -mt-14 shrink-0 sm:-mt-16">
            <span className="grid h-24 w-24 place-items-center overflow-hidden rounded-full bg-mist text-2xl font-bold text-forest-dark ring-4 ring-ivory sm:h-28 sm:w-28">
              {!server && journey.profile.avatarPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={journey.profile.avatarPhoto} alt="" className="h-full w-full object-cover" />
              ) : (
                initialsOf(server?.displayName ?? journey.profile.displayName)
              )}
            </span>
            {!server && (
              <>
                <input
                  ref={avatarInput}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  aria-label="Upload a profile photo"
                  onChange={(event) => {
                    void onAvatarChange(event.target.files?.[0])
                    event.target.value = ''
                  }}
                />
                <button
                  type="button"
                  onClick={() => avatarInput.current?.click()}
                  aria-label="Change profile photo"
                  className="absolute right-0 bottom-0 grid h-9 w-9 place-items-center rounded-full bg-white text-forest shadow-sm ring-1 ring-line transition hover:bg-mist"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true" className="h-4 w-4">
                    <path d="M4 8h3l2-3h6l2 3h3v11H4V8Z" />
                    <circle cx="12" cy="13" r="3.5" />
                  </svg>
                </button>
              </>
            )}
          </div>
          <div className="min-w-52 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-2xl font-extrabold tracking-tight text-forest-dark sm:text-3xl">{greeting}</p>
              {!server && <DemoBadge label="Demo home" />}
            </div>
            <p className="mt-1 text-[15px] text-muted">Your next career move shouldn&apos;t be a solo mission.</p>
            {!server && (
              <GuestNotice
                line={`Guest preview as “${journey.profile.displayName}” — a sample profile, not an account. People shown are demo samples, and anything you add stays in this browser.`}
              />
            )}
          </div>
          <div className="flex items-center gap-3">
            <Arko state="greeting" size={88} label="Arko, your Tulay companion" />
            <p className="max-w-48 rounded-3xl rounded-bl-lg border border-line bg-white px-4 py-3 text-sm leading-snug text-ink shadow-[var(--shadow-card)]">
              Hi! I&apos;m Arko, your Tulay companion. How can I help you today?
            </p>
          </div>
        </div>

        <div className="mt-6 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-8">
            {/* Composer */}
            <form onSubmit={submitComposer} className="rounded-[var(--radius-card)] border border-line/70 bg-white p-4 shadow-[var(--shadow-card)] sm:p-5">
              <label htmlFor="dashboard-ask" className="flex items-center gap-2 text-base font-bold text-ink">
                <Chat className="h-5 w-5 text-forest" />
                Ask Arko anything…
              </label>
              <textarea
                id="dashboard-ask"
                value={composer}
                onChange={(event) => setComposer(event.target.value)}
                rows={2}
                placeholder="e.g. “Find me a mentor for data analytics,” “I need a co-founder,” or “How do I shift careers?”"
                className="mt-2 w-full resize-y rounded-2xl border border-line bg-ivory px-4 py-3 text-[15px] text-ink placeholder:text-muted/70 focus:border-forest"
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xs text-muted">
                  {demoMode ? 'Demo replies until a model key is set.' : 'Answered with live model help.'}{' '}
                  {server ? 'People shown are discoverable members.' : 'People shown are sample members from the demo community.'}
                </p>
                <button type="submit" disabled={!composer.trim()} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-forest px-5 text-sm font-semibold text-white shadow-[var(--shadow-press)] transition hover:bg-forest-dark active:translate-y-[3px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-50">
                  Ask Arko
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>

            {/* Quick actions */}
            <div>
              <h2 className="sr-only">Quick career actions</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {QUICK_ACTIONS.map(({ label, prompt, Icon }) => (
                  <li key={label}>
                    <Link
                      href={`/ask?q=${encodeURIComponent(prompt)}`}
                      className="flex min-h-14 items-center gap-3 rounded-3xl border border-line/70 bg-white px-4 py-3 shadow-[var(--shadow-card)] transition hover:border-forest/40"
                    >
                      <Icon className="h-5 w-5 shrink-0 text-forest" />
                      <span className="flex-1 text-sm font-semibold text-ink">{label}</span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Career journey stats */}
            <section aria-labelledby="career-journey">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="career-journey" className="text-xl font-extrabold tracking-tight text-ink">Your career journey</h2>
                <Link href="/collaborations" className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-forest hover:underline">
                  View full journey
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-3 xl:grid-cols-4">
                <StatCard
                  icon={<Users className="h-5 w-5" />}
                  value={String(overview.directoryMembers)}
                  label="People to meet"
                  sub={server ? 'Discoverable members' : 'In the demo community'}
                  tone="bg-mist"
                />
                <StatCard
                  icon={<Swap className="h-5 w-5" />}
                  value={String(overview.activeCollaborations)}
                  label="Active collaborations"
                  sub="Ongoing work together"
                  tone="bg-peach/70"
                />
                <StatCard
                  icon={<Check className="h-5 w-5" />}
                  value={String(overview.completedCollaborations)}
                  label="Completed"
                  sub={overview.helpedCount > 0 ? `${overview.helpedCount} said it helped` : 'Collaborations done'}
                  tone="bg-white"
                />
                <StatCard
                  icon={<Leaf className="h-5 w-5" />}
                  value={String(overview.goalsCount)}
                  label="Goals in progress"
                  sub="Keep the momentum!"
                  tone="bg-mist"
                />
              </dl>
            </section>

            <PotentialMatches
              community={community}
              journey={journey}
              serverMode={server !== null}
              serverMatches={serverMatches}
              serverMatchNeed={serverMatchNeed}
            />
            {server ? (
              <AuthedContinue server={server} steps={steps} />
            ) : (
              <ContinueJourney journey={journey} steps={steps} />
            )}
          </div>

          {/* Right rail */}
          <div className="space-y-5">
            <section aria-labelledby="upcoming" className="rounded-[var(--radius-card)] border border-line/70 bg-white p-5 shadow-[var(--shadow-card)]">
              <h2 id="upcoming" className="text-base font-extrabold text-ink">Upcoming actions</h2>
              {upcoming.length === 0 ? (
                <p className="mt-2 text-sm text-muted">
                  Nothing waiting. When someone replies or a next step is due, it shows up here.
                </p>
              ) : (
                <ul className="mt-3 space-y-1">
                  {upcoming.map((item) => (
                    <li key={item.id}>
                      <Link href={item.href} className="flex items-center gap-3 rounded-2xl px-2 py-2 transition hover:bg-ivory">
                        <span aria-hidden="true" className="grid h-5 w-5 shrink-0 place-items-center rounded-md border border-line bg-white" />
                        <span className="min-w-0 flex-1 text-sm font-medium text-ink">{item.label}</span>
                        <span className="shrink-0 text-xs font-semibold text-forest">{item.when}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="active-collab" className="rounded-[var(--radius-card)] border border-line/70 bg-white p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between gap-2">
                <h2 id="active-collab" className="text-base font-extrabold text-ink">Active collaboration</h2>
                <Link href="/collaborations" aria-label="Open collaborations" className="grid h-9 w-9 place-items-center rounded-full transition hover:bg-mist">
                  <ArrowRight className="h-4 w-4 text-muted" />
                </Link>
              </div>
              {!activeCollab ? (
                <p className="mt-2 text-sm text-muted">
                  No active collaboration yet. Meet someone, agree on one next step, and it will live here.
                </p>
              ) : (
                <div className="mt-3">
                  <div className="flex items-center gap-3">
                    <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-mist text-sm font-bold text-forest">
                      {initialsOf(activeCollab.partnerName)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-ink">{activeCollab.title}</p>
                      <p className="truncate text-xs text-muted">with {activeCollab.partnerName}</p>
                    </div>
                    <span className="ml-auto shrink-0 rounded-full bg-mist px-2.5 py-1 text-[11px] font-bold text-forest-dark">
                      In progress
                    </span>
                  </div>
                  {activeCollab.next && (
                    <p className="mt-3 text-sm text-ink">
                      <span className="font-semibold">Next:</span> {activeCollab.next}
                    </p>
                  )}
                  {activeCollab.progress !== null && (
                    <div
                      className="mt-2 h-2 overflow-hidden rounded-full bg-mist"
                      role="progressbar"
                      aria-valuenow={activeCollab.progress.done}
                      aria-valuemin={0}
                      aria-valuemax={activeCollab.progress.total}
                      aria-label="Next steps done"
                    >
                      <div
                        className="h-full rounded-full bg-forest"
                        style={{ width: `${(100 * activeCollab.progress.done) / activeCollab.progress.total}%` }}
                      />
                    </div>
                  )}
                </div>
              )}
            </section>

            <section aria-labelledby="bridges" className="overflow-hidden rounded-[var(--radius-card)] border border-line/70 bg-mist p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id="bridges" className="text-base font-extrabold text-ink">Keep building bridges!</h2>
                  <p className="mt-1 text-sm text-muted">
                    {newConnections > 0
                      ? `You've made ${newConnections} new connection${newConnections === 1 ? '' : 's'} this week. That's progress!`
                      : 'Your first bridge starts with one hello. Tell Arko what you need.'}
                  </p>
                </div>
                <Arko state={newConnections > 0 ? 'celebration' : 'greeting'} size={72} label="Arko cheering you on" />
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  value,
  label,
  sub,
  tone,
}: {
  icon: React.ReactNode
  value: string
  label: string
  sub: string
  tone: string
}) {
  return (
    <div className={`rounded-3xl border border-line/60 p-4 ${tone}`}>
      <div className="flex items-center gap-2 text-forest-dark">
        {icon}
        <dd className="text-2xl font-extrabold tabular-nums">{value}</dd>
      </div>
      <dt className="mt-1 text-sm font-bold text-ink">{label}</dt>
      <dd className="text-xs text-muted">{sub}</dd>
    </div>
  )
}

function NotificationList({
  items,
  onRead,
  onNavigate,
}: {
  items: { id: string; title: string; body: string; read: boolean; link?: string }[]
  onRead: (id: string) => void
  onNavigate: () => void
}) {
  if (items.length === 0) {
    return (
      <p className="px-3 py-4 text-sm text-muted">
        Nothing yet. Introductions and collaboration updates will appear here.
      </p>
    )
  }
  return (
    <ul className="max-h-80 space-y-1 overflow-y-auto">
      {items.map((item) => (
        <li key={item.id}>
          {item.link ? (
            <Link
              href={item.link}
              onClick={() => {
                onRead(item.id)
                onNavigate()
              }}
              className="block rounded-2xl px-3 py-2 transition hover:bg-ivory"
            >
              <NotificationBody title={item.title} body={item.body} read={item.read} />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => onRead(item.id)}
              className="block w-full rounded-2xl px-3 py-2 text-left transition hover:bg-ivory"
            >
              <NotificationBody title={item.title} body={item.body} read={item.read} />
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}

function NotificationBody({ title, body, read }: { title: string; body: string; read: boolean }) {
  return (
    <span className="block">
      <span className="flex items-center gap-2 text-sm font-semibold text-ink">
        {!read && <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-coral" />}
        {title}
      </span>
      <span className="mt-0.5 block text-[13px] leading-snug text-muted">{body}</span>
    </span>
  )
}

type UpcomingItem = { id: string; label: string; when: string; href: string }

function buildUpcoming(journey: JourneySnapshot, legacy: DemoCollaboration[]): UpcomingItem[] {
  const items: UpcomingItem[] = []
  for (const intro of journey.introductions.filter(
    (item) => item.request.status === 'pending' && item.direction === 'received',
  )) {
    items.push({
      id: `up-${intro.request.id ?? intro.partnerName}`,
      label: `Reply to ${intro.partnerName}'s intro request`,
      when: 'Today',
      href: '/introductions',
    })
  }
  for (const collab of journey.collaborations.filter((item) => item.status === 'agreed')) {
    const next = collab.nextSteps.find((step) => !step.done)
    items.push({
      id: `up-${collab.introductionRequestId}`,
      label: next ? `Next with ${collab.partnerName}: ${next.text}` : `Set next step with ${collab.partnerName}`,
      when: 'This week',
      href: '/collaborations',
    })
  }
  for (const collab of legacy.filter((item) => item.status === 'agreed' || item.status === 'in_progress')) {
    items.push({
      id: `up-legacy-${collab.id}`,
      label: collab.nextStep ? `Next with ${collab.partnerName}: ${collab.nextStep}` : `Continue with ${collab.partnerName}`,
      when: 'This week',
      href: '/collaborations',
    })
  }
  if (journey.offers.length === 0 && items.length < 4) {
    items.push({
      id: 'up-profile',
      label: 'Update your skills and portfolio',
      when: 'This week',
      href: '/profile',
    })
  }
  return items.slice(0, 5)
}

function latestActiveCollab(journey: JourneySnapshot, legacy: DemoCollaboration[]) {
  const fromJourney = [...journey.collaborations]
    .filter((item) => item.status === 'agreed' || item.status === 'in_progress')
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))[0]
  if (fromJourney) {
    const total = fromJourney.nextSteps.length
    return {
      partnerName: fromJourney.partnerName,
      title: fromJourney.intendedOutcome || fromJourney.partnerOffer,
      next: fromJourney.nextSteps.find((step) => !step.done)?.text ?? null,
      progress: total > 0 ? { done: fromJourney.nextSteps.filter((step) => step.done).length, total } : null,
    }
  }
  const fromLegacy = [...legacy]
    .filter((item) => item.status === 'agreed' || item.status === 'in_progress')
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))[0]
  if (fromLegacy) {
    return {
      partnerName: fromLegacy.partnerName,
      title: fromLegacy.need,
      next: fromLegacy.nextStep ?? null,
      progress: null,
    }
  }
  return null
}
