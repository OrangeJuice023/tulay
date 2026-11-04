'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check } from '@/components/icons'
import { EmptyState, LinkButton, StatusPill } from '@/components/ui'
import {
  listCollaborationsAction,
  recordOutcomeAction,
  setNextStepsAction,
  updateCollaborationStatusAction,
  type CollaborationView,
} from './actions'

/**
 * Signed-in collaborations: status moves, next-step lists and outcome
 * recording against real rows. Unverifiable without a provisioned project.
 */
export function AuthedCollaborations({
  initial,
  loadError,
}: {
  initial: CollaborationView[]
  loadError: string | null
}) {
  const [views, setViews] = useState(initial)
  const [error, setError] = useState<string | null>(loadError)
  const [busy, setBusy] = useState<string | null>(null)
  const [stepsDraft, setStepsDraft] = useState<Record<string, string>>({})
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({})
  const [helpedDraft, setHelpedDraft] = useState<Record<string, 'yes' | 'partly' | 'no'>>({})

  async function refresh() {
    const result = await listCollaborationsAction()
    if (result.ok) {
      setViews(result.data)
      setError(null)
    } else {
      setError(result.error)
    }
  }

  async function run(key: string, action: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(key)
    setError(null)
    try {
      const result = await action()
      if (result.ok) await refresh()
      else setError(result.error ?? 'Something went wrong.')
    } finally {
      setBusy(null)
    }
  }

  if (views.length === 0 && !error) {
    return (
      <EmptyState title="No collaborations yet" action={<LinkButton href="/ask">Ask Arko for someone to meet</LinkButton>}>
        When someone accepts your introduction, your collaboration starts here with one agreed next step.
      </EmptyState>
    )
  }

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}
      <ul className="space-y-4">
        {views.map((view) => {
          const id = view.id ?? view.introductionRequestId
          return (
            <li key={id} className="rounded-[var(--radius-card)] border border-line/70 bg-white p-5 shadow-[var(--shadow-card)]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold text-ink">With {view.partnerName}</p>
                <StatusPill status={view.status} />
              </div>
              {view.intendedOutcome && <p className="mt-2 text-ink">{view.intendedOutcome}</p>}

              <div className="mt-3">
                <p className="text-sm font-semibold text-ink">Next steps</p>
                {view.nextSteps.length === 0 ? (
                  <p className="mt-1 text-sm text-muted">No steps agreed yet.</p>
                ) : (
                  <ul className="mt-1 space-y-1">
                    {view.nextSteps.map((step, index) => (
                      <li key={`${step.text}-${index}`}>
                        <label className="flex items-start gap-2.5 text-sm text-ink">
                          <input
                            type="checkbox"
                            checked={step.done}
                            disabled={busy !== null}
                            onChange={() => {
                              const steps = view.nextSteps.map((item, position) =>
                                position === index ? { ...item, done: !item.done } : item,
                              )
                              void run(`steps-${id}`, () => setNextStepsAction({ collaborationId: view.id, steps }))
                            }}
                            className="mt-0.5 h-4.5 w-4.5 accent-[#176B46]"
                          />
                          <span className={step.done ? 'text-muted line-through' : ''}>{step.text}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
                {(view.status === 'agreed' || view.status === 'in_progress') && (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault()
                      const text = (stepsDraft[id] ?? '').trim()
                      if (!text) return
                      const steps = [...view.nextSteps, { text, done: false }]
                      void run(`steps-${id}`, () => setNextStepsAction({ collaborationId: view.id, steps })).then(() =>
                        setStepsDraft((current) => ({ ...current, [id]: '' })),
                      )
                    }}
                    className="mt-2 flex gap-2"
                  >
                    <input
                      value={stepsDraft[id] ?? ''}
                      onChange={(event) => setStepsDraft((current) => ({ ...current, [id]: event.target.value }))}
                      maxLength={500}
                      placeholder="Add a next step"
                      aria-label="Add a next step"
                      className="min-w-0 flex-1 rounded-2xl border border-line bg-ivory px-4 py-2.5 text-sm focus:border-forest"
                    />
                    <button type="submit" disabled={busy !== null} className="shrink-0 rounded-full bg-mist px-4 text-sm font-semibold text-forest-dark disabled:opacity-50">
                      Add
                    </button>
                  </form>
                )}
              </div>

              {(view.status === 'agreed' || view.status === 'in_progress') && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {view.status === 'agreed' && (
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void run(`status-${id}`, () => updateCollaborationStatusAction({ collaborationId: view.id, status: 'in_progress' }))}
                      className="inline-flex min-h-10 items-center rounded-full bg-forest px-4 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      Start working
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void run(`status-${id}`, () => updateCollaborationStatusAction({ collaborationId: view.id, status: 'completed' }))}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-semibold text-forest ring-1 ring-line disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" />
                    Mark completed
                  </button>
                </div>
              )}

              {view.status === 'completed' && (
                <div className="mt-4 rounded-2xl bg-ivory p-4">
                  <p className="text-sm font-semibold text-ink">Did this help you move forward?</p>
                  <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Did this help?">
                    {(['yes', 'partly', 'no'] as const).map((value) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={helpedDraft[id] === value}
                        onClick={() => setHelpedDraft((current) => ({ ...current, [id]: value }))}
                        className={`min-h-10 rounded-full px-4 text-sm font-semibold ${helpedDraft[id] === value ? 'bg-forest text-white' : 'bg-white text-ink ring-1 ring-line'}`}
                      >
                        {value === 'yes' ? 'Yes' : value === 'partly' ? 'Partly' : 'No'}
                      </button>
                    ))}
                  </div>
                  <input
                    value={noteDraft[id] ?? ''}
                    onChange={(event) => setNoteDraft((current) => ({ ...current, [id]: event.target.value }))}
                    maxLength={2000}
                    placeholder="Optional note"
                    aria-label="Optional outcome note"
                    className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-2.5 text-sm focus:border-forest"
                  />
                  <button
                    type="button"
                    disabled={busy !== null || !helpedDraft[id]}
                    onClick={() =>
                      void run(`outcome-${id}`, () =>
                        recordOutcomeAction({ collaborationId: view.id, helped: helpedDraft[id], note: noteDraft[id] }),
                      )
                    }
                    className="mt-2 inline-flex min-h-10 items-center rounded-full bg-forest px-4 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {busy === `outcome-${id}` ? 'Saving…' : 'Record outcome'}
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
      <p className="text-sm text-muted">
        Replies and updates arrive as notifications on your <Link href="/home" className="font-semibold text-forest hover:underline">home dashboard</Link>.
      </p>
    </div>
  )
}
