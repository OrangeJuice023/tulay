import { describe, expect, it } from 'vitest'
import { EMPTY_JOURNEY, type JourneySnapshot } from './journey-store'
import {
  connectionsThisWeek,
  firstNameOf,
  greetingForHour,
  recommendNextSteps,
  summarizeJourney,
} from './dashboard'

describe('greetingForHour', () => {
  it('greets by time of day', () => {
    expect(greetingForHour(0)).toBe('Good evening')
    expect(greetingForHour(8)).toBe('Good morning')
    expect(greetingForHour(13)).toBe('Good afternoon')
    expect(greetingForHour(21)).toBe('Good evening')
  })
})

describe('firstNameOf', () => {
  it('takes the first word and falls back gracefully', () => {
    expect(firstNameOf('Gervi Malinao')).toBe('Gervi')
    expect(firstNameOf('  ')).toBe('there')
  })
})

function snapshotWith(overrides: Partial<JourneySnapshot>): JourneySnapshot {
  return { ...EMPTY_JOURNEY, ...overrides }
}

describe('summarizeJourney', () => {
  it('counts zeros honestly on a fresh snapshot', () => {
    const summary = summarizeJourney(snapshotWith({}), [], 12)
    expect(summary).toEqual({
      directoryMembers: 12,
      pendingIntroductions: 0,
      activeCollaborations: 0,
      completedCollaborations: 0,
      helpedCount: 0,
      goalsCount: 0,
      unreadNotifications: 0,
      actionsDue: 0,
    })
  })

  it('combines journey and legacy collaboration records', () => {
    const summary = summarizeJourney(
      snapshotWith({
        introductions: [
          {
            request: {
              fromProfileId: '00000000-0000-4000-8000-000000000001',
              toProfileId: '00000000-0000-4000-8000-000000000002',
              needId: '00000000-0000-4000-8000-000000000003',
              matchFactors: [],
              message: 'Hi',
              status: 'pending',
            },
            partnerName: 'Bianca T.',
            partnerOffer: 'Portfolio review',
            needDescription: 'Review my portfolio',
            direction: 'received',
            updatedAt: new Date().toISOString(),
          },
        ],
        collaborations: [
          {
            introductionRequestId: '00000000-0000-4000-8000-000000000010',
            requesterId: '00000000-0000-4000-8000-000000000001',
            helperId: '00000000-0000-4000-8000-000000000002',
            status: 'completed',
            nextSteps: [],
            partnerName: 'Bianca T.',
            partnerOffer: 'Portfolio review',
            helped: 'yes',
            updatedAt: new Date().toISOString(),
          },
        ],
      }),
      [
        {
          id: 'legacy-1',
          partnerName: 'Jun D.',
          partnerOffer: 'Proposal feedback',
          need: 'Pricing help',
          reciprocal: false,
          status: 'in_progress',
          updatedAt: new Date().toISOString(),
        },
      ],
      12,
    )
    expect(summary.pendingIntroductions).toBe(1)
    expect(summary.activeCollaborations).toBe(1)
    expect(summary.completedCollaborations).toBe(1)
    expect(summary.helpedCount).toBe(1)
    expect(summary.actionsDue).toBe(2)
  })
})

describe('recommendNextSteps', () => {
  it('starts a fresh visitor with their goal', () => {
    const steps = recommendNextSteps(snapshotWith({}), [])
    expect(steps[0].id).toBe('state-goal')
    expect(steps[0].href).toBe('/ask')
  })

  it('puts a received introduction first', () => {
    const steps = recommendNextSteps(
      snapshotWith({
        introductions: [
          {
            request: {
              fromProfileId: '00000000-0000-4000-8000-000000000001',
              toProfileId: '00000000-0000-4000-8000-000000000002',
              needId: '00000000-0000-4000-8000-000000000003',
              matchFactors: [],
              message: 'Hi',
              status: 'pending',
            },
            partnerName: 'Bianca T.',
            partnerOffer: 'Portfolio review',
            needDescription: 'Review my portfolio',
            direction: 'received',
            updatedAt: new Date().toISOString(),
          },
        ],
      }),
      [],
    )
    expect(steps[0].title).toContain('Bianca T.')
    expect(steps[0].href).toBe('/introductions')
  })
})

describe('connectionsThisWeek', () => {
  it('counts only recent acceptances', () => {
    const now = Date.now()
    const count = connectionsThisWeek(
      snapshotWith({
        introductions: [
          {
            request: {
              fromProfileId: '00000000-0000-4000-8000-000000000001',
              toProfileId: '00000000-0000-4000-8000-000000000002',
              needId: '00000000-0000-4000-8000-000000000003',
              matchFactors: [],
              message: 'Hi',
              status: 'accepted',
              respondedAt: new Date(now - 1000).toISOString(),
            },
            partnerName: 'Bianca T.',
            partnerOffer: 'Portfolio review',
            needDescription: 'Review my portfolio',
            direction: 'sent',
            updatedAt: new Date(now).toISOString(),
          },
          {
            request: {
              fromProfileId: '00000000-0000-4000-8000-000000000001',
              toProfileId: '00000000-0000-4000-8000-000000000004',
              needId: '00000000-0000-4000-8000-000000000003',
              matchFactors: [],
              message: 'Hi',
              status: 'accepted',
              respondedAt: new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString(),
            },
            partnerName: 'Jun D.',
            partnerOffer: 'Proposal feedback',
            needDescription: 'Pricing help',
            direction: 'sent',
            updatedAt: new Date(now).toISOString(),
          },
        ],
      }),
      now,
    )
    expect(count).toBe(1)
  })
})
