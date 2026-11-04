'use client'

import { useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { respondToIntroduction, withdrawIntroduction } from '@tulay/shared'
import {
  getSnapshot,
  getServerSnapshot,
  logInteraction,
  addNotification,
  subscribe,
  upsertIntroduction,
  type JourneyIntroduction,
} from '@/lib/journey-store'
import { AppNav } from '@/components/AppNav'
import { Arko } from '@/components/Arko'
import { DemoBadge, EmptyState, LinkButton, Notice, StatusPill } from '@/components/ui'
import { ArrowRight } from '@/components/icons'
import {
  contactForIntroductionAction,
  decideIntroductionAction,
  listIntroductionsAction,
  withdrawIntroductionAction,
  type IntroductionView,
} from './actions'

/**
 * Introduction inbox. Signed-in members answer real requests here; demo
 * visitors manage the requests they sent from this browser, with received
 * replies explicitly labelled as simulated previews.
 */
export function IntroductionsView({
  mode,
  initial,
  loadError,
}: {
  mode: 'authed' | 'demo'
  initial: IntroductionView[]
  loadError: string | null
}) {
  const journey = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const [views, setViews] = useState<IntroductionView[]>(initial)
  const [error, setError] = useState<string | null>(loadError)
  const [busy, setBusy] = useState<string | null>(null)
  const [contacts, setContacts] = useState<Record<string, string | null>>({})

  const demoViews: IntroductionView[] = journey.introductions.map((item) => ({
    request: {
      id: item.request.id,
      fromProfileId: item.request.fromProfileId,
      toProfileId: item.request.toProfileId,
      needId: item.request.needId,
      offerId: item.request.offerId,
      matchFactors: item.request.matchFactors,
      explanation: item.request.explanation,
      message: item.request.message,
      status: item.request.status,
      respondedAt: item.request.respondedAt,
    },
    partnerName: item.partnerName,
    partnerOffer: item.partnerOffer,
    needDescription: item.needDescription,
    direction: item.direction,
  }))
  const shown = mode === 'authed' ? views : demoViews
  const received = shown.filter((view) => view.direction === 'received')
  const sent = shown.filter((view) => view.direction === 'sent')
  const pending = shown.filter((view) => view.request.status === 'pending').length

  async function refresh() {
    const result = await listIntroductionsAction()
    if (result.ok) {
      setViews(result.data)
      setError(null)
    } else {
      setError(result.error)
    }
  }

  async function onDecide(view: IntroductionView, decision: 'accepted' | 'declined') {
    const id = view.request.id ?? `${view.partnerName}-${view.request.status}`
    setBusy(id)
    setError(null)
    try {
      if (mode === 'authed') {
        const result = await decideIntroductionAction({ requestId: view.request.id, decision })
        if (!result.ok) setError(result.error)
        else await refresh()
      } else {
        // Demo preview: the fictional member cannot reply, so the visitor
        // previews what an acceptance would unlock. Labelled, never presented
        // as a real second person.
        const original = journey.introductions.find(
          (item) => item.request.id === view.request.id || item.partnerName === view.partnerName,
        )
        if (original) {
          let decided: JourneyIntroduction['request']
          try {
            decided = respondToIntroduction(original.request, original.request.toProfileId, decision)
          } catch (error) {
            setError(error instanceof Error ? error.message : 'That reply was not valid.')
            return
          }
          upsertIntroduction({ ...original, request: decided, updatedAt: new Date().toISOString() })
          logInteraction('introduction-received', `Demo preview: ${decision} ${original.partnerName}`)
          addNotification({
            type: decision === 'accepted' ? 'intro-accepted' : 'intro-declined',
            title: decision === 'accepted' ? `Demo preview: ${original.partnerName} accepted` : `Demo preview: ${original.partnerName} declined`,
            body:
              decision === 'accepted'
                ? 'Simulated reply — no message was sent. In the real flow you would now agree on a next step.'
                : 'Simulated reply — no message was sent.',
            link: '/introductions',
          })
        }
      }
    } finally {
      setBusy(null)
    }
  }

  async function onWithdraw(view: IntroductionView) {
    const id = view.request.id ?? `${view.partnerName}-${view.request.status}`
    setBusy(id)
    setError(null)
    try {
      if (mode === 'authed') {
        const result = await withdrawIntroductionAction({ requestId: view.request.id })
        if (!result.ok) setError(result.error)
        else await refresh()
      } else {
        const original: JourneyIntroduction | undefined = journey.introductions.find(
          (item) => item.request.id === view.request.id || item.partnerName === view.partnerName,
        )
        if (original) {
          let withdrawn: JourneyIntroduction['request']
          try {
            withdrawn = withdrawIntroduction(original.request, original.request.fromProfileId)
          } catch (error) {
            setError(error instanceof Error ? error.message : 'That withdrawal was not valid.')
            return
          }
          upsertIntroduction({ ...original, request: withdrawn, updatedAt: new Date().toISOString() })
          logInteraction('introduction-sent', `Withdrew demo request to ${original.partnerName}`)
        }
      }
    } finally {
      setBusy(null)
    }
  }

  async function onShowContact(view: IntroductionView) {
    const id = view.request.id
    if (!id || mode !== 'authed') return
    setBusy(`contact-${id}`)
    try {
      const result = await contactForIntroductionAction({ requestId: id })
      if (result.ok) setContacts((current) => ({ ...current, [id]: result.data.contact }))
      else setError(result.error)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 lg:flex-row lg:items-start">
      <AppNav pendingIntroductions={pending} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-52 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-extrabold tracking-tight text-ink">Introductions</h1>
              {mode === 'demo' && <DemoBadge label="Demo inbox" />}
            </div>
            <p className="mt-1 text-muted">
              {received.filter((view) => view.request.status === 'pending').length > 0
                ? 'Someone is waiting for your answer. Take your time — declining is quiet.'
                : 'Requests you sent and received. Contact details appear only after both sides accept.'}
            </p>
          </div>
          <Arko
            state={pending > 0 ? 'pending' : 'connected'}
            size={72}
            label={pending > 0 ? 'Arko waiting on replies' : 'Arko with connected introductions'}
          />
        </div>

        {mode === 'demo' && (
          <div className="mt-4">
            <Notice tone="demo" title="Demo inbox: this browser only">
              Requests you send from Ask Arko or the guided journey appear here. Demo members are
              fictional and cannot reply — previews are labelled as simulated.{' '}
              <Link href="/signup" className="font-semibold text-forest hover:underline">
                Sign in
              </Link>{' '}
              for real two-sided introductions once a Supabase project is connected.
            </Notice>
          </div>
        )}
        {error && (
          <p role="alert" className="mt-4 text-sm font-medium text-danger">
            {error}
          </p>
        )}

        <section aria-labelledby="received" className="mt-6">
          <h2 id="received" className="text-xl font-extrabold text-ink">
            Received
          </h2>
          {received.length === 0 ? (
            <div className="mt-3">
              <EmptyState title="No requests waiting for you">
                When someone asks for an introduction, their message appears here first — nothing is
                shared until you accept.
              </EmptyState>
            </div>
          ) : (
            <ul className="mt-3 space-y-3">
              {received.map((view) => (
                <IntroductionCard
                  key={view.request.id ?? `${view.partnerName}-${view.request.message}`}
                  view={view}
                  mode={mode}
                  busy={busy}
                  contact={view.request.id ? contacts[view.request.id] : undefined}
                  onDecide={onDecide}
                  onWithdraw={onWithdraw}
                  onShowContact={onShowContact}
                />
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="sent" className="mt-8">
          <h2 id="sent" className="text-xl font-extrabold text-ink">
            Sent
          </h2>
          {sent.length === 0 ? (
            <div className="mt-3">
              <EmptyState
                title="You haven't asked anyone yet"
                action={
                  <LinkButton href="/ask">
                    Ask Arko for someone to meet
                    <ArrowRight className="h-4 w-4" />
                  </LinkButton>
                }
              >
                Find a mentor, collaborator or co-founder, then send your first introduction request.
              </EmptyState>
            </div>
          ) : (
            <ul className="mt-3 space-y-3">
              {sent.map((view) => (
                <IntroductionCard
                  key={view.request.id ?? `${view.partnerName}-${view.request.message}`}
                  view={view}
                  mode={mode}
                  busy={busy}
                  contact={view.request.id ? contacts[view.request.id] : undefined}
                  onDecide={onDecide}
                  onWithdraw={onWithdraw}
                  onShowContact={onShowContact}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

function IntroductionCard({
  view,
  mode,
  busy,
  contact,
  onDecide,
  onWithdraw,
  onShowContact,
}: {
  view: IntroductionView
  mode: 'authed' | 'demo'
  busy: string | null
  contact: string | null | undefined
  onDecide: (view: IntroductionView, decision: 'accepted' | 'declined') => void
  onWithdraw: (view: IntroductionView) => void
  onShowContact: (view: IntroductionView) => void
}) {
  const { request } = view
  const id = request.id ?? `${view.partnerName}-${request.status}`
  const isBusy = busy === id
  const pending = request.status === 'pending'
  return (
    <li className="rounded-[var(--radius-card)] border border-line/70 bg-white p-5 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-bold text-ink">
          {view.direction === 'received' ? view.partnerName : `To ${view.partnerName}`}
        </h3>
        <StatusPill status={request.status} />
        {mode === 'demo' && view.direction === 'received' && pending && <DemoBadge label="Simulated reply" />}
      </div>
      {view.needDescription && (
        <p className="mt-1 text-sm text-muted">
          About: <span className="text-ink">{view.needDescription}</span>
        </p>
      )}
      <blockquote className="mt-3 rounded-2xl bg-ivory px-4 py-3 text-[15px] text-ink">
        “{request.message}”
      </blockquote>
      {request.matchFactors.length > 0 && (
        <p className="mt-2 text-[13px] text-muted">Why they matched: {request.matchFactors.join(' · ')}</p>
      )}
      {request.status === 'accepted' && (
        <div className="mt-3 rounded-2xl bg-mist px-4 py-3 text-sm">
          {mode === 'demo' ? (
            <p className="text-forest-dark">
              Demo members have no real contact details. In the real flow, {view.partnerName}&apos;s
              chosen contact method would appear here, after this mutual acceptance.
            </p>
          ) : contact === undefined ? (
            <button
              type="button"
              onClick={() => onShowContact(view)}
              disabled={busy === `contact-${request.id}`}
              className="font-semibold text-forest hover:underline disabled:opacity-50"
            >
              {busy === `contact-${request.id}` ? 'Loading…' : `Show ${view.partnerName.split(' ')[0]}'s contact method`}
            </button>
          ) : contact ? (
            <p className="text-forest-dark">
              <span className="font-semibold">Contact:</span> {contact}
            </p>
          ) : (
            <p className="text-forest-dark">They haven&apos;t shared a contact method yet.</p>
          )}
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {view.direction === 'received' && pending && (
          <>
            <button
              type="button"
              onClick={() => onDecide(view, 'accepted')}
              disabled={isBusy}
              className="inline-flex min-h-11 items-center rounded-full bg-forest px-5 text-sm font-semibold text-white shadow-[var(--shadow-press)] transition hover:bg-forest-dark active:translate-y-[3px] active:shadow-none disabled:opacity-50"
            >
              {isBusy ? 'Saving…' : mode === 'demo' ? 'Preview: accept' : 'Accept introduction'}
            </button>
            <button
              type="button"
              onClick={() => onDecide(view, 'declined')}
              disabled={isBusy}
              className="inline-flex min-h-11 items-center rounded-full bg-white px-5 text-sm font-semibold text-forest ring-1 ring-line transition hover:ring-forest/50 disabled:opacity-50"
            >
              {mode === 'demo' ? 'Preview: decline' : 'Decline quietly'}
            </button>
          </>
        )}
        {view.direction === 'sent' && pending && (
          <>
            <button
              type="button"
              onClick={() => onWithdraw(view)}
              disabled={isBusy}
              className="inline-flex min-h-11 items-center rounded-full bg-white px-5 text-sm font-semibold text-ink ring-1 ring-line transition hover:ring-forest/50 disabled:opacity-50"
            >
              {isBusy ? 'Saving…' : 'Withdraw request'}
            </button>
            {mode === 'demo' && (
              <>
                <button
                  type="button"
                  onClick={() => onDecide(view, 'accepted')}
                  disabled={isBusy}
                  className="inline-flex min-h-11 items-center rounded-full bg-mist px-5 text-sm font-semibold text-forest-dark transition hover:bg-mist/70 disabled:opacity-50"
                >
                  Preview: they accept
                </button>
                <button
                  type="button"
                  onClick={() => onDecide(view, 'declined')}
                  disabled={isBusy}
                  className="inline-flex min-h-11 items-center rounded-full bg-white px-5 text-sm font-semibold text-muted ring-1 ring-line transition hover:ring-forest/50 disabled:opacity-50"
                >
                  Preview: they decline
                </button>
              </>
            )}
          </>
        )}
        {request.status === 'accepted' && (
          <Link
            href="/collaborations"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white px-5 text-sm font-semibold text-forest ring-1 ring-line transition hover:ring-forest/50"
          >
            Open collaboration
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </li>
  )
}
