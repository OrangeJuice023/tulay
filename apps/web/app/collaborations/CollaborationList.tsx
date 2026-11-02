'use client'

import { useSyncExternalStore } from 'react'
import { clearCollaborations, getServerSnapshot, getSnapshot, subscribe } from '@/lib/demo-store'
import { Button, DemoBadge, EmptyState, LinkButton, Notice, StatusPill } from '@/components/ui'
import { Swap } from '@/components/icons'

const HELPED_LABEL = { yes: 'Yes, it helped', partly: 'Partly helped', no: 'Did not help' } as const

export function CollaborationList() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  if (items.length === 0) {
    return (
      <EmptyState title="No collaborations yet" action={<LinkButton href="/start">Find my people</LinkButton>}>
        When someone accepts your introduction and you agree on a next step, it shows up here.
      </EmptyState>
    )
  }

  return (
    <div className="space-y-4">
      <Notice tone="demo" title="Demo collaborations, saved in this browser only">
        These were created in the demo with fictional members. Nothing was sent to anyone.
      </Notice>
      <ul className="space-y-4">
        {items.map((item) => (
          <li key={item.id} className="rounded-[var(--radius-card)] border border-line/70 bg-white p-5 shadow-[var(--shadow-card)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex flex-wrap items-center gap-2 font-bold text-ink">
                With {item.partnerName} <DemoBadge />
              </p>
              <StatusPill status={item.status} />
            </div>
            <p className="mt-2 text-ink">{item.need}</p>
            <p className="mt-1 text-sm text-muted">They offer: {item.partnerOffer}</p>
            {item.reciprocal && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-coral-ink">
                <Swap className="h-4 w-4" /> You can help each other
              </p>
            )}
            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="font-semibold text-muted">Next step</dt>
                <dd className="text-ink">{item.nextStep ?? 'Not agreed yet'}</dd>
              </div>
              <div>
                <dt className="font-semibold text-muted">Outcome</dt>
                <dd className="text-ink">{item.helped ? HELPED_LABEL[item.helped] : 'Not recorded yet'}</dd>
              </div>
            </dl>
            {item.note && <p className="mt-3 rounded-2xl bg-ivory p-3 text-sm text-ink">“{item.note}”</p>}
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2 pt-2 sm:flex-row">
        <LinkButton href="/start">Find someone else</LinkButton>
        <Button variant="quiet" onClick={clearCollaborations}>
          Clear demo data
        </Button>
      </div>
    </div>
  )
}
