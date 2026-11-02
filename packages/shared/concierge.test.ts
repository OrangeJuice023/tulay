import { describe, expect, it } from 'vitest'
import {
  ConciergeCriteriaSchema,
  ConciergeSessionSchema,
  acceptCandidate,
  buildIntroductionRequest,
  contactVisibleTo,
  createCollaborationFromIntroduction,
  currentCandidate,
  refineConciergeSession,
  remainingCandidates,
  respondToIntroduction,
  skipCandidate,
  startConciergeSession,
  withdrawIntroduction,
  type ConciergeCriteria,
} from './concierge'
import type { CandidateMatch } from './matching'
import type { Need } from './schemas'

const SEEKER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const ALICE_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const BEN_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const STRANGER_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
const NEED_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
const INTRO_ID = 'ffffffff-ffff-4fff-8fff-ffffffffffff'

function makeCandidate(id: string, displayName: string, tags: string[]): CandidateMatch {
  return {
    profile: {
      id,
      displayName,
      careerGoal: `${displayName} wants to keep growing`,
      countryCode: 'PH',
      locale: 'en-PH',
      discoverable: true,
      isDemo: true,
    },
    offer: {
      profileId: id,
      description: `${displayName} offers help with ${tags.join(', ') || 'general topics'}`,
      tags,
      status: 'active',
    },
    score: 10,
    sharedTags: tags,
    sharedKeywords: [],
    reciprocal: false,
    reciprocalTags: [],
    reasons: [`Matching skills: ${tags.join(', ') || 'general'}`],
  }
}

const CRITERIA: ConciergeCriteria = {
  relationship: 'co-founder',
  skills: ['payments'],
  description: 'A technical co-founder who understands payments',
}

const NEED: Need = {
  id: NEED_ID,
  profileId: SEEKER_ID,
  description: 'Looking for a technical co-founder who understands payments',
  tags: ['payments'],
  status: 'open',
  aiSuggested: true,
}

function twoCandidates(): CandidateMatch[] {
  return [makeCandidate(ALICE_ID, 'Alice', ['payments']), makeCandidate(BEN_ID, 'Ben', ['payments'])]
}

describe('ConciergeCriteriaSchema', () => {
  it('accepts relationship, skills and description', () => {
    expect(ConciergeCriteriaSchema.safeParse(CRITERIA).success).toBe(true)
  })

  it('defaults skills to an empty list', () => {
    const parsed = ConciergeCriteriaSchema.parse({
      relationship: 'mentor',
      description: 'An experienced mentor',
    })
    expect(parsed.skills).toEqual([])
  })

  it('rejects an empty description', () => {
    expect(
      ConciergeCriteriaSchema.safeParse({ relationship: 'peer', skills: [], description: '  ' })
        .success,
    ).toBe(false)
  })

  it('rejects an unknown relationship', () => {
    expect(
      ConciergeCriteriaSchema.safeParse({
        relationship: 'investor',
        skills: [],
        description: 'Someone with money',
      }).success,
    ).toBe(false)
  })
})

describe('concierge session', () => {
  it('starts browsing with the first ranked candidate current', () => {
    const session = startConciergeSession({ criteria: CRITERIA, need: NEED, candidates: twoCandidates() })
    expect(session.status).toBe('browsing')
    expect(currentCandidate(session)?.profile.displayName).toBe('Alice')
    expect(remainingCandidates(session)).toBe(2)
    expect(ConciergeSessionSchema.safeParse(session).success).toBe(true)
  })

  it('starts exhausted when nothing matches', () => {
    const session = startConciergeSession({ criteria: CRITERIA, need: NEED, candidates: [] })
    expect(session.status).toBe('exhausted')
    expect(currentCandidate(session)).toBeNull()
    expect(remainingCandidates(session)).toBe(0)
  })

  it('skip advances to the next candidate and records the skipped profile', () => {
    const first = startConciergeSession({ criteria: CRITERIA, need: NEED, candidates: twoCandidates() })
    const second = skipCandidate(first)
    expect(second.status).toBe('browsing')
    expect(currentCandidate(second)?.profile.displayName).toBe('Ben')
    expect(second.skippedProfileIds).toEqual([ALICE_ID])
    expect(remainingCandidates(second)).toBe(1)
  })

  it('skip past the last candidate exhausts the session', () => {
    let session = startConciergeSession({ criteria: CRITERIA, need: NEED, candidates: twoCandidates() })
    session = skipCandidate(session)
    session = skipCandidate(session)
    expect(session.status).toBe('exhausted')
    expect(currentCandidate(session)).toBeNull()
    expect(session.skippedProfileIds).toEqual([ALICE_ID, BEN_ID])
  })

  it('skip throws with no current candidate', () => {
    const exhausted = startConciergeSession({ criteria: CRITERIA, need: NEED, candidates: [] })
    expect(() => skipCandidate(exhausted)).toThrow('No current candidate to skip')
    const accepted = acceptCandidate(
      startConciergeSession({ criteria: CRITERIA, need: NEED, candidates: twoCandidates() }),
    ).session
    expect(() => skipCandidate(accepted)).toThrow('No current candidate to skip')
  })

  it('accept resolves the session with the current candidate', () => {
    const session = startConciergeSession({ criteria: CRITERIA, need: NEED, candidates: twoCandidates() })
    const { session: resolved, candidate } = acceptCandidate(skipCandidate(session))
    expect(candidate.profile.displayName).toBe('Ben')
    expect(resolved.status).toBe('accepted')
    expect(currentCandidate(resolved)).toBeNull()
    expect(remainingCandidates(resolved)).toBe(0)
  })

  it('accept throws with no current candidate', () => {
    const exhausted = startConciergeSession({ criteria: CRITERIA, need: NEED, candidates: [] })
    expect(() => acceptCandidate(exhausted)).toThrow('No current candidate to accept')
  })

  it('refine swaps the query and restarts at the first unskipped candidate', () => {
    const session = skipCandidate(
      startConciergeSession({ criteria: CRITERIA, need: NEED, candidates: twoCandidates() }),
    )
    const refined = refineConciergeSession(session, {
      criteria: { relationship: 'mentor', skills: ['pricing'], description: 'A mentor for pricing' },
      need: { ...NEED, description: 'Need pricing help', tags: ['pricing'] },
      candidates: [makeCandidate(BEN_ID, 'Ben', ['pricing'])],
    })
    expect(refined.status).toBe('browsing')
    expect(refined.criteria.relationship).toBe('mentor')
    expect(currentCandidate(refined)?.profile.displayName).toBe('Ben')
    expect(refined.skippedProfileIds).toEqual([ALICE_ID])
  })

  it('refine never resurfaces a skipped profile', () => {
    const session = skipCandidate(
      startConciergeSession({ criteria: CRITERIA, need: NEED, candidates: twoCandidates() }),
    )
    const refined = refineConciergeSession(session, {
      criteria: CRITERIA,
      need: NEED,
      candidates: twoCandidates(),
    })
    expect(refined.candidates.map((candidate) => candidate.profile.displayName)).toEqual(['Ben'])
  })

  it('session candidates never carry contact details', () => {
    const candidate = makeCandidate(ALICE_ID, 'Alice', ['payments'])
    const smuggled = {
      ...candidate,
      profile: { ...candidate.profile, contactMethod: 'alice@example.com' },
    } as CandidateMatch
    const session = startConciergeSession({ criteria: CRITERIA, need: NEED, candidates: [smuggled] })
    expect('contactMethod' in session.candidates[0].profile).toBe(false)
  })
})

describe('introduction lifecycle', () => {
  function pendingRequest() {
    return buildIntroductionRequest({
      id: INTRO_ID,
      fromProfileId: SEEKER_ID,
      toProfileId: ALICE_ID,
      needId: NEED_ID,
      matchFactors: ['Matching skills: payments'],
      message: 'Hi Alice, would you be open to a quick chat?',
    })
  }

  it('build creates a pending request', () => {
    const request = pendingRequest()
    expect(request.status).toBe('pending')
    expect(request.respondedAt).toBeNull()
  })

  it('build rejects self-introductions and empty messages', () => {
    expect(() =>
      buildIntroductionRequest({
        fromProfileId: SEEKER_ID,
        toProfileId: SEEKER_ID,
        needId: NEED_ID,
        message: 'Hello me',
      }),
    ).toThrow('Cannot request an introduction to yourself')
    expect(() =>
      buildIntroductionRequest({
        fromProfileId: SEEKER_ID,
        toProfileId: ALICE_ID,
        needId: NEED_ID,
        message: '   ',
      }),
    ).toThrow()
  })

  it('the recipient can accept, which timestamps the response', () => {
    const accepted = respondToIntroduction(pendingRequest(), ALICE_ID, 'accepted')
    expect(accepted.status).toBe('accepted')
    expect(typeof accepted.respondedAt).toBe('string')
  })

  it('the recipient can decline quietly', () => {
    const declined = respondToIntroduction(pendingRequest(), ALICE_ID, 'declined')
    expect(declined.status).toBe('declined')
    expect(typeof declined.respondedAt).toBe('string')
  })

  it('anyone besides the recipient cannot respond', () => {
    expect(() => respondToIntroduction(pendingRequest(), SEEKER_ID, 'accepted')).toThrow(
      'Only the recipient can respond to an introduction',
    )
    expect(() => respondToIntroduction(pendingRequest(), STRANGER_ID, 'declined')).toThrow(
      'Only the recipient can respond to an introduction',
    )
  })

  it('a request that already resolved cannot be answered again', () => {
    const accepted = respondToIntroduction(pendingRequest(), ALICE_ID, 'accepted')
    expect(() => respondToIntroduction(accepted, ALICE_ID, 'declined')).toThrow(
      'Introduction is already accepted',
    )
  })

  it('the sender can withdraw a pending request, and nobody else can', () => {
    const withdrawn = withdrawIntroduction(pendingRequest(), SEEKER_ID)
    expect(withdrawn.status).toBe('withdrawn')
    expect(() => withdrawIntroduction(pendingRequest(), ALICE_ID)).toThrow(
      'Only the sender can withdraw an introduction',
    )
  })

  it('contact is visible only to both parties after acceptance', () => {
    const pending = pendingRequest()
    expect(contactVisibleTo(pending, SEEKER_ID)).toBe(false)
    expect(contactVisibleTo(pending, ALICE_ID)).toBe(false)
    const accepted = respondToIntroduction(pending, ALICE_ID, 'accepted')
    expect(contactVisibleTo(accepted, SEEKER_ID)).toBe(true)
    expect(contactVisibleTo(accepted, ALICE_ID)).toBe(true)
    expect(contactVisibleTo(accepted, STRANGER_ID)).toBe(false)
    const declined = respondToIntroduction(pendingRequest(), ALICE_ID, 'declined')
    expect(contactVisibleTo(declined, SEEKER_ID)).toBe(false)
  })

  it('a collaboration needs an accepted introduction with an id between the same parties', () => {
    expect(() =>
      createCollaborationFromIntroduction(pendingRequest(), {
        requesterId: SEEKER_ID,
        helperId: ALICE_ID,
      }),
    ).toThrow('A collaboration needs an accepted introduction')
    const noId = buildIntroductionRequest({
      fromProfileId: SEEKER_ID,
      toProfileId: ALICE_ID,
      needId: NEED_ID,
      message: 'Hi',
    })
    const acceptedNoId = respondToIntroduction(noId, ALICE_ID, 'accepted')
    expect(() =>
      createCollaborationFromIntroduction(acceptedNoId, {
        requesterId: SEEKER_ID,
        helperId: ALICE_ID,
      }),
    ).toThrow('needs an id')
    const accepted = respondToIntroduction(pendingRequest(), ALICE_ID, 'accepted')
    expect(() =>
      createCollaborationFromIntroduction(accepted, {
        requesterId: SEEKER_ID,
        helperId: STRANGER_ID,
      }),
    ).toThrow('must be between the introduction sender and recipient')
  })

  it('an accepted introduction starts a collaboration', () => {
    const accepted = respondToIntroduction(pendingRequest(), ALICE_ID, 'accepted')
    const collaboration = createCollaborationFromIntroduction(accepted, {
      requesterId: SEEKER_ID,
      helperId: ALICE_ID,
      intendedOutcome: 'Decide whether to build together',
      nextSteps: [{ text: '30-minute call by Friday' }],
    })
    expect(collaboration.introductionRequestId).toBe(INTRO_ID)
    expect(collaboration.status).toBe('agreed')
  })
})
