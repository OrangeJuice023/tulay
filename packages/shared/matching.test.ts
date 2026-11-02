import { describe, expect, it } from 'vitest'
import {
  CandidateMatchSchema,
  CommunityMember,
  findCandidates,
  Need,
  NeedSchema,
  Offer,
  OfferSchema,
  ProfileSchema,
} from './index'

const SEEKER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const CANDIDATE_A_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const CANDIDATE_B_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const CANDIDATE_C_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'

function makeNeed(overrides: Partial<Need> = {}): Need {
  return NeedSchema.parse({
    profileId: SEEKER_ID,
    description: 'Portfolio review for my UX case studies',
    tags: ['portfolio-review', 'ux-design'],
    ...overrides,
  })
}

function makeOffer(profileId: string, overrides: Partial<Offer> = {}): Offer {
  return OfferSchema.parse({
    profileId,
    description: 'Design portfolio feedback sessions',
    tags: ['portfolio-review'],
    ...overrides,
  })
}

function makeMember(
  profileId: string,
  displayName: string,
  offers: Offer[],
  extras: { needs?: Need[]; discoverable?: boolean; contactMethod?: string } = {},
): CommunityMember {
  return {
    profile: ProfileSchema.parse({
      id: profileId,
      displayName,
      careerGoal: 'Grow my career with other people',
      discoverable: extras.discoverable ?? true,
      contactMethod: extras.contactMethod,
    }),
    offers,
    needs: extras.needs ?? [],
  }
}

describe('findCandidates relevance', () => {
  it('returns a candidate whose offer shares a tag with the need', () => {
    const matches = findCandidates(makeNeed(), [
      makeMember(CANDIDATE_A_ID, 'Helper Ana', [makeOffer(CANDIDATE_A_ID)]),
    ])
    expect(matches).toHaveLength(1)
    expect(matches[0]?.profile.displayName).toBe('Helper Ana')
    expect(matches[0]?.sharedTags).toContain('portfolio-review')
    expect(matches[0]?.score).toBeGreaterThanOrEqual(10)
    expect(CandidateMatchSchema.safeParse(matches[0]).success).toBe(true)
  })

  it('excludes a candidate with no shared tags or keywords', () => {
    const matches = findCandidates(makeNeed(), [
      makeMember(CANDIDATE_A_ID, 'Baker Ben', [
        makeOffer(CANDIDATE_A_ID, {
          description: 'Sourdough starter coaching and bread scoring',
          tags: ['baking'],
        }),
      ]),
    ])
    expect(matches).toEqual([])
  })

  it('matches on keywords when tags do not overlap', () => {
    const need = makeNeed({ tags: [], description: 'Someone to review my portfolio' })
    const matches = findCandidates(need, [
      makeMember(CANDIDATE_A_ID, 'Helper Ana', [
        makeOffer(CANDIDATE_A_ID, {
          description: 'Portfolio walkthroughs for juniors',
          tags: ['design'],
        }),
      ]),
    ])
    expect(matches).toHaveLength(1)
    expect(matches[0]?.sharedTags).toEqual([])
    expect(matches[0]?.sharedKeywords).toContain('portfolio')
  })
})

describe('findCandidates eligibility', () => {
  it('excludes the seeker themself', () => {
    const matches = findCandidates(makeNeed(), [
      makeMember(SEEKER_ID, 'Seeker Sam', [makeOffer(SEEKER_ID)]),
    ])
    expect(matches).toEqual([])
  })

  it('excludes members who opted out of discovery', () => {
    const matches = findCandidates(makeNeed(), [
      makeMember(CANDIDATE_A_ID, 'Private Pam', [makeOffer(CANDIDATE_A_ID)], {
        discoverable: false,
      }),
    ])
    expect(matches).toEqual([])
  })

  it('excludes paused offers', () => {
    const matches = findCandidates(makeNeed(), [
      makeMember(CANDIDATE_A_ID, 'Helper Ana', [
        makeOffer(CANDIDATE_A_ID, { status: 'paused' }),
      ]),
    ])
    expect(matches).toEqual([])
  })

  it('strips contact details from matches', () => {
    const matches = findCandidates(makeNeed(), [
      makeMember(CANDIDATE_A_ID, 'Helper Ana', [makeOffer(CANDIDATE_A_ID)], {
        contactMethod: 'ana@example.com',
      }),
    ])
    expect(matches).toHaveLength(1)
    expect('contactMethod' in (matches[0]?.profile ?? {})).toBe(false)
  })
})

describe('findCandidates ranking', () => {
  it('orders by score descending', () => {
    const need = makeNeed({ description: 'Quantum portfolio qux review' })
    const strong = makeMember(CANDIDATE_A_ID, 'Strong Sam', [
      makeOffer(CANDIDATE_A_ID, {
        description: 'Portfolio review sessions',
        tags: ['portfolio-review', 'ux-design'],
      }),
    ])
    const weak = makeMember(CANDIDATE_B_ID, 'Weak Wally', [
      makeOffer(CANDIDATE_B_ID, {
        description: 'Career mentoring chats',
        tags: ['portfolio-review'],
      }),
    ])
    const matches = findCandidates(need, [weak, strong])
    expect(matches.map((match) => match.profile.displayName)).toEqual([
      'Strong Sam',
      'Weak Wally',
    ])
    expect(matches[0]?.score).toBeGreaterThan(matches[1]?.score ?? 0)
  })

  it('breaks score ties by display name, case-insensitive', () => {
    const need = makeNeed({ tags: ['mentoring'], description: 'Zqxj wvfm mentoring' })
    const zed = makeMember(CANDIDATE_A_ID, 'Zed', [
      makeOffer(CANDIDATE_A_ID, {
        description: 'Alpha bravo charlie sessions',
        tags: ['mentoring'],
      }),
    ])
    const ana = makeMember(CANDIDATE_B_ID, 'ana', [
      makeOffer(CANDIDATE_B_ID, {
        description: 'Delta echo foxtrot sessions',
        tags: ['mentoring'],
      }),
    ])
    const matches = findCandidates(need, [zed, ana])
    expect(matches).toHaveLength(2)
    expect(matches[0]?.score).toBe(matches[1]?.score)
    expect(matches.map((match) => match.profile.displayName)).toEqual(['ana', 'Zed'])
  })

  it('breaks name ties by profile id', () => {
    const need = makeNeed({ tags: ['mentoring'], description: 'Zqxj wvfm mentoring' })
    const later = makeMember(CANDIDATE_C_ID, 'Same Name', [
      makeOffer(CANDIDATE_C_ID, {
        description: 'Alpha bravo charlie sessions',
        tags: ['mentoring'],
      }),
    ])
    const earlier = makeMember(CANDIDATE_B_ID, 'Same Name', [
      makeOffer(CANDIDATE_B_ID, {
        description: 'Delta echo foxtrot sessions',
        tags: ['mentoring'],
      }),
    ])
    const matches = findCandidates(need, [later, earlier])
    expect(matches.map((match) => match.profile.id)).toEqual([CANDIDATE_B_ID, CANDIDATE_C_ID])
  })

  it('returns identical results across repeated calls and input orders', () => {
    const need = makeNeed({ description: 'Quantum portfolio qux review' })
    const community = [
      makeMember(CANDIDATE_A_ID, 'Strong Sam', [
        makeOffer(CANDIDATE_A_ID, {
          description: 'Portfolio review sessions',
          tags: ['portfolio-review', 'ux-design'],
        }),
      ]),
      makeMember(CANDIDATE_B_ID, 'Weak Wally', [
        makeOffer(CANDIDATE_B_ID, {
          description: 'Career mentoring chats',
          tags: ['portfolio-review'],
        }),
      ]),
    ]
    const first = findCandidates(need, community)
    const second = findCandidates(need, community)
    const reversed = findCandidates(need, [...community].reverse())
    expect(second).toEqual(first)
    expect(reversed).toEqual(first)
  })

  it('respects the limit option', () => {
    const community = [CANDIDATE_A_ID, CANDIDATE_B_ID, CANDIDATE_C_ID].map((id, index) =>
      makeMember(id, `Helper ${index}`, [makeOffer(id)]),
    )
    const matches = findCandidates(makeNeed(), community, { limit: 2 })
    expect(matches).toHaveLength(2)
  })
})

describe('findCandidates reciprocity', () => {
  function reciprocalSetup() {
    const need = makeNeed()
    const seekerOffers = [
      OfferSchema.parse({
        profileId: SEEKER_ID,
        description: 'Short-form video editing',
        tags: ['video-editing'],
      }),
    ]
    const candidateNeed = NeedSchema.parse({
      profileId: CANDIDATE_A_ID,
      description: 'Help editing short-form video',
      tags: ['video-editing'],
    })
    return { need, seekerOffers, candidateNeed }
  }

  it('flags and boosts candidates the seeker can help in return', () => {
    const { need, seekerOffers, candidateNeed } = reciprocalSetup()
    const community = [
      makeMember(CANDIDATE_A_ID, 'Helper Ana', [makeOffer(CANDIDATE_A_ID)], {
        needs: [candidateNeed],
      }),
    ]
    const withOffers = findCandidates(need, community, { seekerOffers })
    const withoutOffers = findCandidates(need, community)
    expect(withOffers[0]?.reciprocal).toBe(true)
    expect(withOffers[0]?.reciprocalTags).toEqual(['video-editing'])
    expect(withOffers[0]?.reasons.join(' ')).toContain('help each other')
    expect(withOffers[0]?.score).toBe((withoutOffers[0]?.score ?? 0) + 5)
  })

  it('ignores fulfilled needs when detecting reciprocity', () => {
    const { need, seekerOffers, candidateNeed } = reciprocalSetup()
    const community = [
      makeMember(CANDIDATE_A_ID, 'Helper Ana', [makeOffer(CANDIDATE_A_ID)], {
        needs: [{ ...candidateNeed, status: 'fulfilled' }],
      }),
    ]
    const matches = findCandidates(need, community, { seekerOffers })
    expect(matches[0]?.reciprocal).toBe(false)
  })

  it('never matches on reciprocity alone without topical relevance', () => {
    const { seekerOffers, candidateNeed } = reciprocalSetup()
    const unrelated = makeMember(CANDIDATE_A_ID, 'Helper Ana', [
      makeOffer(CANDIDATE_A_ID, {
        description: 'Sourdough starter coaching and bread scoring',
        tags: ['baking'],
      }),
    ], { needs: [candidateNeed] })
    expect(findCandidates(makeNeed(), [unrelated], { seekerOffers })).toEqual([])
  })
})

describe('findCandidates edge cases', () => {
  it('returns an empty list for an empty community', () => {
    expect(findCandidates(makeNeed(), [])).toEqual([])
  })

  it('returns an empty list when nobody is eligible', () => {
    const community = [
      makeMember(SEEKER_ID, 'Seeker Sam', [makeOffer(SEEKER_ID)]),
      makeMember(CANDIDATE_A_ID, 'Private Pam', [makeOffer(CANDIDATE_A_ID)], {
        discoverable: false,
      }),
    ]
    expect(findCandidates(makeNeed(), community)).toEqual([])
  })

  it('throws on a missing or malformed need', () => {
    const community = [makeMember(CANDIDATE_A_ID, 'Helper Ana', [makeOffer(CANDIDATE_A_ID)])]
    expect(() => findCandidates(null as never, community)).toThrow()
    expect(() => findCandidates({} as never, community)).toThrow()
  })

  it('throws on a non-array community', () => {
    expect(() => findCandidates(makeNeed(), null as never)).toThrow()
    expect(() => findCandidates(makeNeed(), 'nope' as never)).toThrow()
  })

  it('skips malformed members instead of failing the whole call', () => {
    const community = [
      {} as unknown as CommunityMember,
      makeMember(CANDIDATE_A_ID, 'Helper Ana', [makeOffer(CANDIDATE_A_ID)]),
    ]
    const matches = findCandidates(makeNeed(), community)
    expect(matches).toHaveLength(1)
  })
})

describe('findCandidates grounding', () => {
  it('grounds shared tags and reasons in the actual need and offer', () => {
    const need = makeNeed()
    const offer = makeOffer(CANDIDATE_A_ID)
    const matches = findCandidates(need, [
      makeMember(CANDIDATE_A_ID, 'Helper Ana', [offer]),
    ])
    const match = matches[0]
    expect(match).toBeDefined()
    if (!match) return
    const needTags = need.tags.map((tag) => tag.toLowerCase())
    const offerTags = offer.tags.map((tag) => tag.toLowerCase())
    for (const tag of match.sharedTags) {
      expect(needTags).toContain(tag)
      expect(offerTags).toContain(tag)
    }
    expect(match.reasons.length).toBeGreaterThanOrEqual(1)
    expect(match.reasons.join(' ')).toContain(match.sharedTags[0] ?? '')
  })
})
