'use client'

import { useState, useSyncExternalStore } from 'react'
import {
  clearJourney,
  getSnapshot,
  getServerSnapshot,
  logInteraction,
  subscribe,
  upsertCollaboration,
} from '@/lib/journey-store'
import { Button, DemoBadge, LinkButton, Notice, StatusPill } from '@/components/ui'

const HELPED_LABEL = { yes: 'Yes, it helped', partly: 'Partly helped', no: 'Did not help' } as const

/**
 * Demo collaborations from Ask Arko, stored in this browser. Records missing
 * an outcome can still be finished here; nothing is sent anywhere.
 */
export function JourneyCollaborations() {
  const journey = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const [helped, setHelped] = useState<Record<string, 'yes' | 'partly' | 'no'>>({})
  const items = journey.collaborations

  if (items.length === 0) return null

  return (
    <section aria-label="Ask Arko collaborations" className="space-y-4">
      <Notice tone="demo" title="Ask Arko collaborations, saved in this browser only">
        Created with fictional demo members. Nothing was sent to anyone.
      </Notice>
      <ul className="space-y-4">
        {items.map((item) => {
          const key = item.introductionRequestId
          return (
            <li key={key} className="rounded-[var(--radius-card)] border border-line/70 bg-white p-5 shadow-[var(--shadow-card)]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex flex-wrap items-center gap-2 font-bold text-ink">
                  With {item.partnerName} <DemoBadge />
                </p>
                <StatusPill status={item.status} />
              </div>
              {item.intendedOutcome && <p className="mt-2 text-ink">{item.intendedOutcome}</p>}
              {item.nextSteps.length > 0 && (
                <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-muted">
                  {item.nextSteps.map((step, index) => (
                    <li key={`${step.text}-${index}`}>
                      {step.done ? '✓ ' : ''}{step.text}
                    </li>
                  ))}
                </ul>
              )}
              {item.helped ? (
                <p className="mt-3 text-sm text-ink">
                  <span className="font-semibold text-muted">Outcome: </span>
                  {HELPED_LABEL[item.helped]}
                </p>
              ) : (
                <div className="mt-3 rounded-2xl bg-ivory p-4">
                  <p className="text-sm font-semibold text-ink">Did this help you move forward?</p>
                  <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Did this help?">
                    {(['yes', 'partly', 'no'] as const).map((value) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={helped[key] === value}
                        onClick={() => setHelped((current) => ({ ...current, [key]: value }))}
                        className={`min-h-10 rounded-full px-4 text-sm font-semibold ${helped[key] === value ? 'bg-forest text-white' : 'bg-white text-ink ring-1 ring-line'}`}
                      >
                        {value === 'yes' ? 'Yes' : value === 'partly' ? 'Partly' : 'No'}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    disabled={!helped[key]}
                    onClick={() => {
                      if (!helped[key]) return
                      upsertCollaboration({ ...item, status: 'completed', helped: helped[key], updatedAt: new Date().toISOString() })
                      logInteraction('outcome-recorded', `Outcome with ${item.partnerName}: ${helped[key]}`)
                    }}
                    className="mt-2 inline-flex min-h-10 items-center rounded-full bg-forest px-4 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Record outcome
                  </button>
                </div>
              )}
              {item.note && <p className="mt-3 rounded-2xl bg-ivory p-3 text-sm text-ink">“{item.note}”</p>}
            </li>
          )
        })}
      </ul>
      <div className="flex flex-col gap-2 pt-2 sm:flex-row">
        <LinkButton href="/ask">Meet someone else</LinkButton>
        <Button variant="quiet" onClick={clearJourney}>
          Clear demo journey
        </Button>
      </div>
    </section>
  )
}
