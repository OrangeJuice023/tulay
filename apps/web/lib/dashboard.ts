import type { DemoCollaboration } from './demo-store'
import type { JourneySnapshot } from './journey-store'

/**
 * Pure dashboard helpers. Every figure is computed from the snapshot passed
 * in, so tests can pin the arithmetic and the UI can never show a hardcoded
 * statistic. Server data (directory size) is passed in the same way.
 */

export function greetingForHour(hour: number): string {
  if (hour < 5) return 'Good evening'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function firstNameOf(displayName: string): string {
  return displayName.trim().split(/\s+/)[0] || 'there'
}

export type CareerOverview = {
  directoryMembers: number
  pendingIntroductions: number
  activeCollaborations: number
  completedCollaborations: number
  helpedCount: number
  goalsCount: number
  unreadNotifications: number
  actionsDue: number
}

export function summarizeJourney(
  snapshot: JourneySnapshot,
  legacy: DemoCollaboration[],
  directoryMembers: number,
): CareerOverview {
  const pendingIntroductions = snapshot.introductions.filter(
    (item) => item.request.status === 'pending',
  ).length
  const journeyActive = snapshot.collaborations.filter(
    (item) => item.status === 'agreed' || item.status === 'in_progress',
  ).length
  const journeyCompleted = snapshot.collaborations.filter((item) => item.status === 'completed')
  const legacyActive = legacy.filter(
    (item) => item.status === 'agreed' || item.status === 'in_progress',
  ).length
  const legacyCompleted = legacy.filter((item) => item.status === 'completed')
  const helpedCount =
    journeyCompleted.filter((item) => item.helped === 'yes').length +
    legacyCompleted.filter((item) => item.helped === 'yes').length
  return {
    directoryMembers,
    pendingIntroductions,
    activeCollaborations: journeyActive + legacyActive,
    completedCollaborations: journeyCompleted.length + legacyCompleted.length,
    helpedCount,
    goalsCount: snapshot.goals.length,
    unreadNotifications: snapshot.notifications.filter((item) => !item.read).length,
    actionsDue: pendingIntroductions + journeyActive + legacyActive,
  }
}

export type RecommendedStep = {
  id: string
  title: string
  detail: string
  href: string
}

/**
 * Next steps derived from actual state. The first item is always the most
 * time-sensitive real action; the list is empty only when there is genuinely
 * nothing to do.
 */
export function recommendNextSteps(
  snapshot: JourneySnapshot,
  legacy: DemoCollaboration[],
): RecommendedStep[] {
  const steps: RecommendedStep[] = []

  const received = snapshot.introductions.filter(
    (item) => item.direction === 'received' && item.request.status === 'pending',
  )
  for (const item of received.slice(0, 2)) {
    steps.push({
      id: `reply-${item.request.id ?? item.partnerName}`,
      title: `Reply to ${item.partnerName}`,
      detail: 'They asked for an introduction. Accept or decline when you are ready.',
      href: '/introductions',
    })
  }

  const active = [
    ...snapshot.collaborations.filter((item) => item.status === 'agreed' || item.status === 'in_progress'),
    ...legacy.filter((item) => item.status === 'agreed' || item.status === 'in_progress'),
  ]
  const awaitingOutcome = active.find((item) => item.status === 'in_progress' && !item.helped)
  if (awaitingOutcome) {
    const name = awaitingOutcome.partnerName
    steps.push({
      id: 'record-outcome',
      title: 'Record how it went',
      detail: `Your collaboration with ${name} is in progress. Say whether it helped.`,
      href: '/collaborations',
    })
  }
  const noNextStep = snapshot.collaborations.find(
    (item) => item.status === 'agreed' && item.nextSteps.length === 0,
  )
  if (noNextStep) {
    steps.push({
      id: 'agree-next-step',
      title: 'Agree on one next step',
      detail: `You and ${noNextStep.partnerName} connected. Decide the first small step together.`,
      href: '/collaborations',
    })
  }

  const openNeeds = snapshot.needs.filter((need) => need.status === 'open')
  if (openNeeds.length > 0 && steps.length < 3) {
    steps.push({
      id: 'review-matches',
      title: 'Review your matches',
      detail: `You asked for: ${openNeeds[0].description.slice(0, 80)}. See who can help.`,
      href: '/ask',
    })
  }

  if (snapshot.goals.length === 0 && snapshot.threads.length === 0) {
    steps.push({
      id: 'state-goal',
      title: 'Tell Arko your goal',
      detail: 'One sentence about your next career move is enough to start.',
      href: '/ask',
    })
  }

  if (!snapshot.profile.careerGoal && steps.length < 4) {
    steps.push({
      id: 'complete-profile',
      title: 'Shape your profile',
      detail: 'Add your goal and availability so the right people can find you.',
      href: '/profile',
    })
  }

  return steps.slice(0, 4)
}

export type ServerNotificationView = {
  id: string
  title: string
  body: string
  read: boolean
  link?: string
}

export type ServerUpcomingItem = { id: string; label: string; when: string; href: string }

export type ServerActiveCollab = {
  partnerName: string
  title: string
  next: string | null
  progress: { done: number; total: number } | null
} | null

export type AuthedDashboardData = {
  displayName: string
  overview: CareerOverview
  notifications: ServerNotificationView[]
  upcoming: ServerUpcomingItem[]
  active: ServerActiveCollab
  careerGoal: string | null
  openNeeds: { id?: string; description: string }[]
}

/** Recommended steps from real server rows (same honesty rules as demo). */
export function recommendServerSteps(data: AuthedDashboardData): RecommendedStep[] {
  const steps: RecommendedStep[] = []
  for (const item of data.upcoming.filter((entry) => entry.when === 'Today').slice(0, 2)) {
    steps.push({ id: item.id, title: item.label, detail: 'Someone is waiting for your answer.', href: item.href })
  }
  if (!data.careerGoal) {
    steps.push({
      id: 'server-profile',
      title: 'Shape your profile',
      detail: 'Add your goal so the right people can find you.',
      href: '/profile',
    })
  } else if (data.openNeeds.length === 0) {
    steps.push({
      id: 'server-need',
      title: 'Name one thing you need',
      detail: 'One concrete ask is enough for Tulay to search.',
      href: '/ask',
    })
  }
  if (data.overview.activeCollaborations > 0 && steps.length < 4) {
    steps.push({
      id: 'server-collab',
      title: 'Move a collaboration forward',
      detail: 'Finish a next step, then record whether it helped.',
      href: '/collaborations',
    })
  }
  if (steps.length === 0) {
    steps.push({
      id: 'server-discover',
      title: 'Meet someone new',
      detail: 'Browse the directory or ask Arko for a shortlist.',
      href: '/discover',
    })
  }
  return steps.slice(0, 4)
}

export function connectionsThisWeek(snapshot: JourneySnapshot, now = Date.now()): number {
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000
  const accepted = snapshot.introductions.filter(
    (item) =>
      item.request.status === 'accepted' &&
      item.request.respondedAt &&
      Date.parse(item.request.respondedAt) >= weekAgo,
  ).length
  return accepted
}
