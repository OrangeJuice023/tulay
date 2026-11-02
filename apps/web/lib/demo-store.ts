'use client'

import type { CollaborationStatus, Helped } from '@tulay/shared'

/**
 * Browser-only record of the visitor's demo collaborations, so "My collaborations" can show
 * them. Local to this browser; nothing is sent anywhere. Replaced by Supabase later.
 */
export type DemoCollaboration = {
  id: string
  partnerName: string
  partnerOffer: string
  need: string
  reciprocal: boolean
  nextStep?: string
  status: CollaborationStatus
  helped?: Helped
  note?: string
  updatedAt: string
}

const KEY = 'tulay.demo.collaborations.v1'
const EVENT = 'tulay-demo-store'
const EMPTY: DemoCollaboration[] = []

let cachedRaw: string | null = null
let cachedValue: DemoCollaboration[] = EMPTY

function read(): DemoCollaboration[] {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (raw !== cachedRaw) {
      cachedRaw = raw
      cachedValue = raw ? (JSON.parse(raw) as DemoCollaboration[]) : EMPTY
    }
    return cachedValue
  } catch {
    return EMPTY
  }
}

export function saveCollaboration(record: DemoCollaboration) {
  try {
    const others = read().filter((item) => item.id !== record.id)
    window.localStorage.setItem(KEY, JSON.stringify([record, ...others]))
    window.dispatchEvent(new Event(EVENT))
  } catch {
    // Storage unavailable (private mode): the flow still works, the list just won't persist.
  }
}

export function clearCollaborations() {
  try {
    window.localStorage.removeItem(KEY)
    window.dispatchEvent(new Event(EVENT))
  } catch {}
}

export function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}

export const getSnapshot = read
export const getServerSnapshot = () => EMPTY
