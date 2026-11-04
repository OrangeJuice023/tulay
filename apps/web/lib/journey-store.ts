'use client'

import type {
  Collaboration,
  Helped,
  IntroductionRequest,
  Need,
  Offer,
} from '@tulay/shared'

/**
 * Demo-mode record of the visitor's own journey: profile, goals, introductions,
 * notifications and Ask Arko threads. Browser-local only; nothing is sent
 * anywhere. The dashboard, Ask Arko workspace and introductions pages all read
 * from here, so every count shown is computed from actual local state — never
 * hardcoded. Replaced by Supabase rows once sign-in exists.
 */

export type JourneyProfile = {
  displayName: string
  headline?: string
  careerGoal?: string
  availability?: string
  coverPhoto?: string | null
  avatarPhoto?: string | null
  updatedAt: string
}

export type JourneyGoal = { id: string; text: string; createdAt: string }

export type JourneyInteractionKind =
  | 'arko-chat'
  | 'match-viewed'
  | 'introduction-sent'
  | 'introduction-received'
  | 'collaboration-updated'
  | 'outcome-recorded'

export type JourneyInteraction = {
  id: string
  kind: JourneyInteractionKind
  label: string
  detail?: string
  at: string
}

export type JourneyIntroduction = {
  request: IntroductionRequest
  partnerName: string
  partnerOffer: string
  needDescription: string
  direction: 'sent' | 'received'
  updatedAt: string
}

export type JourneyNotificationType =
  | 'intro-received'
  | 'intro-accepted'
  | 'intro-declined'
  | 'check-in'
  | 'outcome'
  | 'opportunity'

export type JourneyNotification = {
  id: string
  type: JourneyNotificationType
  title: string
  body: string
  at: string
  read: boolean
  link?: string
}

export type ArkoMessageSource = 'live' | 'demo-template' | 'deterministic'

export type ChatMessage = {
  role: 'user' | 'arko'
  text: string
  at: string
  source?: ArkoMessageSource
}

export type ChatThread = {
  id: string
  title: string
  messages: ChatMessage[]
  updatedAt: string
}

export type JourneyCollaboration = Collaboration & {
  partnerName: string
  partnerOffer: string
  helped?: Helped
  note?: string
  updatedAt: string
}

export type JourneySnapshot = {
  profile: JourneyProfile
  goals: JourneyGoal[]
  needs: Need[]
  offers: Offer[]
  interactions: JourneyInteraction[]
  introductions: JourneyIntroduction[]
  collaborations: JourneyCollaboration[]
  notifications: JourneyNotification[]
  threads: ChatThread[]
}

const KEY = 'tulay.demo.journey.v1'
const EVENT = 'tulay-journey-store'

const EMPTY: JourneySnapshot = {
  profile: { displayName: 'Alex', updatedAt: new Date(0).toISOString() },
  goals: [],
  needs: [],
  offers: [],
  interactions: [],
  introductions: [],
  collaborations: [],
  notifications: [],
  threads: [],
}

let cachedRaw: string | null = null
let cachedValue: JourneySnapshot = EMPTY

function freshId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e9)}`
}

export function newId(prefix: string): string {
  return freshId(prefix)
}

function normalize(raw: unknown): JourneySnapshot {
  if (!raw || typeof raw !== 'object') return EMPTY
  const value = raw as Partial<JourneySnapshot>
  return {
    profile:
      value.profile && typeof value.profile.displayName === 'string'
        ? { ...EMPTY.profile, ...value.profile }
        : EMPTY.profile,
    goals: Array.isArray(value.goals) ? value.goals : [],
    needs: Array.isArray(value.needs) ? value.needs : [],
    offers: Array.isArray(value.offers) ? value.offers : [],
    interactions: Array.isArray(value.interactions) ? value.interactions : [],
    introductions: Array.isArray(value.introductions) ? value.introductions : [],
    collaborations: Array.isArray(value.collaborations) ? value.collaborations : [],
    notifications: Array.isArray(value.notifications) ? value.notifications : [],
    threads: Array.isArray(value.threads) ? value.threads : [],
  }
}

function read(): JourneySnapshot {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (raw !== cachedRaw) {
      cachedRaw = raw
      cachedValue = raw ? normalize(JSON.parse(raw)) : EMPTY
    }
    return cachedValue
  } catch {
    return EMPTY
  }
}

function write(next: JourneySnapshot) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next))
    cachedRaw = null
    window.dispatchEvent(new Event(EVENT))
  } catch {
    // Storage unavailable (private mode): the flow still works in memory only.
  }
}

function update(fn: (current: JourneySnapshot) => JourneySnapshot) {
  write(fn(read()))
}

export function setJourneyProfile(profile: Partial<JourneyProfile>) {
  update((current) => ({
    ...current,
    profile: { ...current.profile, ...profile, updatedAt: new Date().toISOString() },
  }))
}

export function addJourneyGoal(text: string): JourneyGoal {
  const goal = { id: freshId('goal'), text: text.trim().slice(0, 500), createdAt: new Date().toISOString() }
  if (!goal.text) return goal
  update((current) => {
    if (current.goals.some((existing) => existing.text.toLowerCase() === goal.text.toLowerCase())) {
      return current
    }
    return { ...current, goals: [goal, ...current.goals].slice(0, 20) }
  })
  return goal
}

export function removeJourneyGoal(id: string) {
  update((current) => ({ ...current, goals: current.goals.filter((goal) => goal.id !== id) }))
}

export function addJourneyNeed(need: Need) {
  update((current) => {
    if (current.needs.some((existing) => existing.id && existing.id === need.id)) return current
    return { ...current, needs: [need, ...current.needs].slice(0, 20) }
  })
}

export function addJourneyOffer(offer: Offer) {
  update((current) => {
    if (current.offers.some((existing) => existing.id && existing.id === offer.id)) return current
    return { ...current, offers: [offer, ...current.offers].slice(0, 20) }
  })
}

export function logInteraction(kind: JourneyInteractionKind, label: string, detail?: string) {
  const entry: JourneyInteraction = {
    id: freshId('interaction'),
    kind,
    label: label.slice(0, 200),
    detail: detail?.slice(0, 300),
    at: new Date().toISOString(),
  }
  update((current) => ({ ...current, interactions: [entry, ...current.interactions].slice(0, 50) }))
}

export function upsertIntroduction(introduction: JourneyIntroduction) {
  update((current) => ({
    ...current,
    introductions: [
      introduction,
      ...current.introductions.filter(
        (item) => item.request.id !== introduction.request.id || !introduction.request.id,
      ),
    ].slice(0, 50),
  }))
}

export function upsertCollaboration(collaboration: JourneyCollaboration) {
  update((current) => ({
    ...current,
    collaborations: [
      collaboration,
      ...current.collaborations.filter(
        (item) => item.introductionRequestId !== collaboration.introductionRequestId,
      ),
    ].slice(0, 50),
  }))
}

export function addNotification(input: {
  type: JourneyNotificationType
  title: string
  body: string
  link?: string
}): JourneyNotification {
  const notification: JourneyNotification = {
    id: freshId('notification'),
    type: input.type,
    title: input.title.slice(0, 160),
    body: input.body.slice(0, 500),
    at: new Date().toISOString(),
    read: false,
    link: input.link,
  }
  update((current) => ({ ...current, notifications: [notification, ...current.notifications].slice(0, 50) }))
  return notification
}

export function markNotificationRead(id: string) {
  update((current) => ({
    ...current,
    notifications: current.notifications.map((item) => (item.id === id ? { ...item, read: true } : item)),
  }))
}

export function markAllNotificationsRead() {
  update((current) => ({
    ...current,
    notifications: current.notifications.map((item) => ({ ...item, read: true })),
  }))
}

export function saveThread(thread: ChatThread) {
  update((current) => ({
    ...current,
    threads: [thread, ...current.threads.filter((item) => item.id !== thread.id)].slice(0, 20),
  }))
}

export function clearJourney() {
  try {
    window.localStorage.removeItem(KEY)
    cachedRaw = null
    cachedValue = EMPTY
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
export const EMPTY_JOURNEY: JourneySnapshot = EMPTY
