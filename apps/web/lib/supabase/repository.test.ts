import { describe, expect, it } from 'vitest'
import {
  isDuplicatePendingError,
  mapCollaborationRow,
  mapDeckRow,
  mapIntroductionRow,
  mapNeedRow,
  mapNotificationRow,
  mapOfferRow,
  mapProfileRow,
  mapResumeRow,
} from './repository'

describe('mapProfileRow', () => {
  it('maps a full row and marks it real', () => {
    const mapped = mapProfileRow({
      id: '00000000-0000-4000-8000-000000000001',
      display_name: 'Mara S.',
      career_goal: 'Become a UX designer',
      discoverable: true,
    })
    expect(mapped?.displayName).toBe('Mara S.')
    expect(mapped?.isDemo).toBe(false)
  })

  it('accepts an unfinished onboarding row with an empty goal', () => {
    const mapped = mapProfileRow({
      id: '00000000-0000-4000-8000-000000000001',
      display_name: 'New User',
      career_goal: null,
    })
    expect(mapped?.careerGoal).toBe('')
  })

  it('rejects a row without a name', () => {
    expect(
      mapProfileRow({ id: '00000000-0000-4000-8000-000000000001', display_name: '' }),
    ).toBeNull()
  })

  it('ignores contact_method on profiles rows (contacts live in profile_contacts)', () => {
    const mapped = mapProfileRow({
      id: '00000000-0000-4000-8000-000000000001',
      display_name: 'Mara S.',
      career_goal: 'Become a UX designer',
      contact_method: 'should-never-map@example.com',
    } as Parameters<typeof mapProfileRow>[0])
    expect(mapped?.contactMethod).toBeUndefined()
  })
})

describe('mapNeedRow / mapOfferRow', () => {
  it('maps need and offer rows with defaults', () => {
    const need = mapNeedRow({
      id: '00000000-0000-4000-8000-000000000010',
      profile_id: '00000000-0000-4000-8000-000000000001',
      description: 'Portfolio review',
    })
    expect(need?.status).toBe('open')
    expect(need?.tags).toEqual([])
    const offer = mapOfferRow({
      id: '00000000-0000-4000-8000-000000000011',
      profile_id: '00000000-0000-4000-8000-000000000001',
      description: 'Interview practice',
      tags: ['interview-practice'],
    })
    expect(offer?.status).toBe('active')
    expect(offer?.tags).toEqual(['interview-practice'])
  })

  it('rejects an empty description', () => {
    expect(
      mapNeedRow({
        id: '00000000-0000-4000-8000-000000000010',
        profile_id: '00000000-0000-4000-8000-000000000001',
        description: '  ',
      }),
    ).toBeNull()
  })
})

describe('mapIntroductionRow', () => {
  it('maps a pending row and rejects self-requests', () => {
    const mapped = mapIntroductionRow({
      id: '00000000-0000-4000-8000-000000000020',
      from_profile_id: '00000000-0000-4000-8000-000000000001',
      to_profile_id: '00000000-0000-4000-8000-000000000002',
      need_id: '00000000-0000-4000-8000-000000000010',
      message: 'Hi, can we talk?',
    })
    expect(mapped?.status).toBe('pending')
    expect(mapped?.matchFactors).toEqual([])
    expect(
      mapIntroductionRow({
        id: '00000000-0000-4000-8000-000000000021',
        from_profile_id: '00000000-0000-4000-8000-000000000001',
        to_profile_id: '00000000-0000-4000-8000-000000000001',
        need_id: '00000000-0000-4000-8000-000000000010',
        message: 'Hi',
      }),
    ).toBeNull()
  })
})

describe('mapCollaborationRow', () => {
  it('orders milestones by position', () => {
    const mapped = mapCollaborationRow(
      {
        id: '00000000-0000-4000-8000-000000000030',
        introduction_request_id: '00000000-0000-4000-8000-000000000020',
        requester_id: '00000000-0000-4000-8000-000000000001',
        helper_id: '00000000-0000-4000-8000-000000000002',
      },
      [
        { collaboration_id: '00000000-0000-4000-8000-000000000030', text: 'Second', position: 1 },
        { collaboration_id: '00000000-0000-4000-8000-000000000030', text: 'First', done: true, position: 0 },
        { collaboration_id: 'other', text: 'Ignored', position: 0 },
      ],
    )
    expect(mapped?.nextSteps.map((step) => step.text)).toEqual(['First', 'Second'])
    expect(mapped?.nextSteps[0].done).toBe(true)
  })
})

describe('mapNotificationRow', () => {
  it('maps a notification row', () => {
    const mapped = mapNotificationRow({
      id: '00000000-0000-4000-8000-000000000040',
      recipient_profile_id: '00000000-0000-4000-8000-000000000001',
      type: 'intro_received',
      title: 'New introduction request',
      body: 'Bianca would like to meet you.',
      link: '/introductions',
    })
    expect(mapped?.read).toBe(false)
  })

  it('rejects unknown types', () => {
    expect(
      mapNotificationRow({
        id: '00000000-0000-4000-8000-000000000040',
        recipient_profile_id: '00000000-0000-4000-8000-000000000001',
        type: 'spam',
        title: 'x',
        body: 'y',
      }),
    ).toBeNull()
  })
})

describe('isDuplicatePendingError', () => {
  it('detects unique violations by code or message', () => {
    expect(isDuplicatePendingError({ code: '23505', message: 'x' })).toBe(true)
    expect(isDuplicatePendingError({ message: 'duplicate key value violates "intro_pending_unique"' })).toBe(true)
    expect(isDuplicatePendingError({ message: 'connection reset' })).toBe(false)
  })
})

describe('mapDeckRow', () => {
  const ROW = {
    id: '00000000-0000-4000-8000-000000000001',
    owner_id: '00000000-0000-4000-8000-000000000002',
    title: 'Acme pitch',
    purpose: 'Feedback',
    audience: 'Founders',
    context: 'Pre-launch',
    template: 'startup',
    slides: [{ id: 's1', title: 'Cover', bullets: ['Acme'] }],
    source: 'manual',
    updated_at: '2026-11-05T00:00:00.000Z',
  }

  it('maps a full deck row', () => {
    const mapped = mapDeckRow(ROW)
    expect(mapped?.title).toBe('Acme pitch')
    expect(mapped?.slides).toHaveLength(1)
    expect(mapped?.template).toBe('startup')
  })

  it('rejects rows with bad slides, template, or timestamp', () => {
    expect(mapDeckRow({ ...ROW, slides: [] })).toBeNull()
    expect(mapDeckRow({ ...ROW, slides: 'nope' })).toBeNull()
    expect(mapDeckRow({ ...ROW, template: 'keynote' })).toBeNull()
    expect(mapDeckRow({ ...ROW, updated_at: 'yesterday' })).toBeNull()
  })
})

describe('mapResumeRow', () => {
  const ROW = {
    id: '00000000-0000-4000-8000-000000000001',
    owner_id: '00000000-0000-4000-8000-000000000002',
    full_name: 'Maria Santos',
    headline: 'Support specialist',
    email: 'maria@example.com',
    phone: '',
    location: 'Manila',
    summary: 'Three years of client-facing support.',
    experience: [
      { id: 'e1', title: 'Support agent', company: 'Acme', bullets: ['Helped customers'] },
    ],
    education: [{ id: 'd1', school: 'State University' }],
    skills: ['email support', 'chat support'],
    projects: [],
    certifications: [],
    target_role: 'Customer success associate',
    target_job_description: '',
    source: 'manual',
    updated_at: '2026-11-05T00:00:00.000Z',
  }

  it('maps a full resume row', () => {
    const mapped = mapResumeRow(ROW)
    expect(mapped?.fullName).toBe('Maria Santos')
    expect(mapped?.experience).toHaveLength(1)
    expect(mapped?.skills).toEqual(['email support', 'chat support'])
    expect(mapped?.targetRole).toBe('Customer success associate')
  })

  it('defaults missing sections to empty values', () => {
    const mapped = mapResumeRow({ ...ROW, summary: null, experience: 'nope', skills: null })
    expect(mapped?.summary).toBe('')
    expect(mapped?.experience).toEqual([])
    expect(mapped?.skills).toEqual([])
  })

  it('rejects rows with a bad name or timestamp', () => {
    expect(mapResumeRow({ ...ROW, full_name: '' })).toBeNull()
    expect(mapResumeRow({ ...ROW, updated_at: 'yesterday' })).toBeNull()
  })
})
