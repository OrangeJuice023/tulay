import { describe, expect, it } from 'vitest'
import {
  CareerGoalSchema,
  CollaborationFeedbackSchema,
  CollaborationSchema,
  CollaborationSuggestionsSchema,
  DraftIntroductionContextSchema,
  ExplainMatchContextSchema,
  ExtractedGoalSchema,
  IntroductionDraftSchema,
  IntroductionRequestSchema,
  MatchExplanationSchema,
  NeedSchema,
  NextStepSchema,
  OfferSchema,
  ProfileSchema,
  SuggestCollaborationContextSchema,
  SuggestTagsContextSchema,
  SuggestedTagsSchema,
} from './index'

const UUID_A = '11111111-1111-4111-8111-111111111111'
const UUID_B = '22222222-2222-4222-8222-222222222222'

describe('ProfileSchema', () => {
  it('accepts a minimal profile and applies defaults', () => {
    const result = ProfileSchema.safeParse({
      displayName: 'Mara',
      careerGoal: 'Move from call-centre work into UX design',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.isDemo).toBe(false)
      expect(result.data.discoverable).toBe(true)
      expect(result.data.countryCode).toBe('PH')
      expect(result.data.locale).toBe('en-PH')
    }
  })

  it('rejects an empty or whitespace-only display name', () => {
    expect(ProfileSchema.safeParse({ displayName: '', careerGoal: 'x' }).success).toBe(false)
    expect(ProfileSchema.safeParse({ displayName: '   ', careerGoal: 'x' }).success).toBe(false)
  })

  it('rejects a display name longer than 100 chars', () => {
    expect(
      ProfileSchema.safeParse({ displayName: 'a'.repeat(101), careerGoal: 'x' }).success,
    ).toBe(false)
  })

  it('rejects a missing career goal', () => {
    expect(ProfileSchema.safeParse({ displayName: 'Mara' }).success).toBe(false)
  })

  it('rejects a country code that is not 2 chars', () => {
    const base = { displayName: 'Mara', careerGoal: 'x' }
    expect(ProfileSchema.safeParse({ ...base, countryCode: 'PHI' }).success).toBe(false)
    expect(ProfileSchema.safeParse({ ...base, countryCode: 'PH' }).success).toBe(true)
  })
})

describe('CareerGoalSchema', () => {
  it('accepts goal text and trims it', () => {
    const result = CareerGoalSchema.safeParse({ goal: '  Land my first client  ' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.goal).toBe('Land my first client')
    }
  })

  it('rejects an empty goal', () => {
    expect(CareerGoalSchema.safeParse({ goal: '' }).success).toBe(false)
    expect(CareerGoalSchema.safeParse({ goal: '   ' }).success).toBe(false)
    expect(CareerGoalSchema.safeParse({}).success).toBe(false)
  })

  it('rejects a goal longer than 2000 chars', () => {
    expect(CareerGoalSchema.safeParse({ goal: 'a'.repeat(2001) }).success).toBe(false)
  })
})

describe('NeedSchema', () => {
  const base = { profileId: UUID_A, description: 'Portfolio review from a working designer' }

  it('accepts a minimal need and applies defaults', () => {
    const result = NeedSchema.safeParse(base)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('open')
      expect(result.data.tags).toEqual([])
      expect(result.data.aiSuggested).toBe(false)
    }
  })

  it('rejects an empty description', () => {
    expect(NeedSchema.safeParse({ ...base, description: '  ' }).success).toBe(false)
  })

  it('rejects an unknown status', () => {
    expect(NeedSchema.safeParse({ ...base, status: 'draft' }).success).toBe(false)
    for (const status of ['open', 'fulfilled', 'closed'] as const) {
      expect(NeedSchema.safeParse({ ...base, status }).success).toBe(true)
    }
  })

  it('rejects a non-uuid profile id', () => {
    expect(NeedSchema.safeParse({ ...base, profileId: 'not-a-uuid' }).success).toBe(false)
  })

  it('bounds tags at 20 items of at most 50 chars', () => {
    expect(NeedSchema.safeParse({ ...base, tags: ['a'.repeat(51)] }).success).toBe(false)
    expect(NeedSchema.safeParse({ ...base, tags: Array(21).fill('design') }).success).toBe(false)
    expect(
      NeedSchema.safeParse({ ...base, tags: ['portfolio', 'ux-design'] }).success,
    ).toBe(true)
  })
})

describe('OfferSchema', () => {
  const base = { profileId: UUID_A, description: 'English interview practice' }

  it('accepts a minimal offer and defaults status to active', () => {
    const result = OfferSchema.safeParse(base)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('active')
      expect(result.data.tags).toEqual([])
    }
  })

  it('accepts paused and rejects unknown statuses', () => {
    expect(OfferSchema.safeParse({ ...base, status: 'paused' }).success).toBe(true)
    expect(OfferSchema.safeParse({ ...base, status: 'open' }).success).toBe(false)
  })

  it('rejects a negative rate and accepts a null rate (MVP: unpaid)', () => {
    expect(OfferSchema.safeParse({ ...base, rateAmount: -1 }).success).toBe(false)
    expect(
      OfferSchema.safeParse({ ...base, rateAmount: null, currencyCode: null }).success,
    ).toBe(true)
  })

  it('rejects a currency code that is not 3 chars', () => {
    expect(OfferSchema.safeParse({ ...base, currencyCode: 'PHPX' }).success).toBe(false)
    expect(OfferSchema.safeParse({ ...base, currencyCode: 'PHP' }).success).toBe(true)
  })
})

describe('IntroductionRequestSchema', () => {
  const base = {
    fromProfileId: UUID_A,
    toProfileId: UUID_B,
    needId: UUID_A,
    message: 'Hi, could you review my portfolio?',
  }

  it('accepts a minimal request and defaults status to pending', () => {
    const result = IntroductionRequestSchema.safeParse(base)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('pending')
      expect(result.data.matchFactors).toEqual([])
    }
  })

  it('rejects an introduction to yourself', () => {
    const result = IntroductionRequestSchema.safeParse({ ...base, toProfileId: UUID_A })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['toProfileId'])
    }
  })

  it('rejects an empty message', () => {
    expect(IntroductionRequestSchema.safeParse({ ...base, message: '' }).success).toBe(false)
    expect(IntroductionRequestSchema.safeParse({ ...base, message: '  ' }).success).toBe(false)
  })

  it('accepts a missing or null offer id (need-only request)', () => {
    expect(IntroductionRequestSchema.safeParse(base).success).toBe(true)
    expect(
      IntroductionRequestSchema.safeParse({ ...base, offerId: null }).success,
    ).toBe(true)
    expect(
      IntroductionRequestSchema.safeParse({ ...base, offerId: UUID_B }).success,
    ).toBe(true)
  })

  it('accepts a responded-at timestamp with a PH offset', () => {
    expect(
      IntroductionRequestSchema.safeParse({
        ...base,
        status: 'accepted',
        respondedAt: '2026-10-28T10:00:00+08:00',
      }).success,
    ).toBe(true)
    expect(
      IntroductionRequestSchema.safeParse({ ...base, respondedAt: 'tomorrow' }).success,
    ).toBe(false)
  })
})

describe('CollaborationSchema', () => {
  const base = {
    introductionRequestId: UUID_A,
    requesterId: UUID_A,
    helperId: UUID_B,
  }

  it('accepts a minimal collaboration and defaults status to agreed', () => {
    const result = CollaborationSchema.safeParse(base)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('agreed')
      expect(result.data.nextSteps).toEqual([])
    }
  })

  it('rejects a collaboration with yourself', () => {
    const result = CollaborationSchema.safeParse({ ...base, helperId: UUID_A })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['helperId'])
    }
  })

  it('accepts next steps and rejects empty step text', () => {
    expect(
      CollaborationSchema.safeParse({
        ...base,
        nextSteps: [{ text: '30-minute portfolio review call by Friday' }],
      }).success,
    ).toBe(true)
    expect(NextStepSchema.safeParse({ text: '  ' }).success).toBe(false)
  })

  it('rejects an unknown status', () => {
    expect(CollaborationSchema.safeParse({ ...base, status: 'pending' }).success).toBe(false)
    for (const status of ['agreed', 'in_progress', 'completed', 'cancelled'] as const) {
      expect(CollaborationSchema.safeParse({ ...base, status }).success).toBe(true)
    }
  })
})

describe('CollaborationFeedbackSchema', () => {
  const base = { collaborationId: UUID_A, profileId: UUID_B }

  it('accepts yes, partly and no', () => {
    for (const helped of ['yes', 'partly', 'no'] as const) {
      expect(CollaborationFeedbackSchema.safeParse({ ...base, helped }).success).toBe(true)
    }
  })

  it('rejects anything else', () => {
    expect(
      CollaborationFeedbackSchema.safeParse({ ...base, helped: 'maybe' }).success,
    ).toBe(false)
    expect(CollaborationFeedbackSchema.safeParse(base).success).toBe(false)
  })
})

describe('ExtractedGoalSchema', () => {
  const demo = {
    goal: 'Move into UX design',
    needs: ['guidance', 'feedback'],
    offers: ['experience sharing'],
    skills: ['communication'],
    preferences: {},
  }

  it('accepts demo-shaped extraction output', () => {
    expect(ExtractedGoalSchema.safeParse(demo).success).toBe(true)
  })

  it('rejects an empty goal but permits genuinely absent needs', () => {
    expect(ExtractedGoalSchema.safeParse({ ...demo, goal: '' }).success).toBe(false)
    // Goal-only input: extraction stays honest with no invented needs.
    const parsed = ExtractedGoalSchema.safeParse({ ...demo, needs: [] })
    expect(parsed.success).toBe(true)
    expect(parsed.success && parsed.data.needs).toEqual([])
  })

  it('bounds the number of needs', () => {
    expect(
      ExtractedGoalSchema.safeParse({ ...demo, needs: Array(11).fill('x') }).success,
    ).toBe(false)
  })
})

describe('MatchExplanationSchema', () => {
  const demo = {
    explanation: 'This is a demo match based on complementary goals and skills.',
    compatibilityFactors: ['complementary needs', 'shared interests'],
    suggestedCollaboration: 'Start with a 30-minute conversation to share experiences.',
  }

  it('accepts demo-shaped output', () => {
    expect(MatchExplanationSchema.safeParse(demo).success).toBe(true)
  })

  it('rejects an empty explanation or empty factors', () => {
    expect(MatchExplanationSchema.safeParse({ ...demo, explanation: '' }).success).toBe(false)
    expect(
      MatchExplanationSchema.safeParse({ ...demo, compatibilityFactors: [] }).success,
    ).toBe(false)
  })
})

describe('AI provider contracts', () => {
  it('requires at least one match factor to explain a match', () => {
    const base = {
      seekerNeed: 'Portfolio review',
      candidateName: 'Ate Liza',
      candidateOffer: 'Design mentoring',
      matchFactors: ['shared language: English'],
    }
    expect(ExplainMatchContextSchema.safeParse(base).success).toBe(true)
    expect(
      ExplainMatchContextSchema.safeParse({ ...base, matchFactors: [] }).success,
    ).toBe(false)
  })

  it('requires sender, recipient and need to draft an introduction', () => {
    const base = { senderName: 'Mara', recipientName: 'Ate Liza', need: 'Portfolio review' }
    expect(DraftIntroductionContextSchema.safeParse(base).success).toBe(true)
    expect(
      DraftIntroductionContextSchema.safeParse({ ...base, senderName: '' }).success,
    ).toBe(false)
    expect(IntroductionDraftSchema.safeParse({ message: '' }).success).toBe(false)
  })

  it('requires goal, need and offer to suggest collaboration, and 1 to 5 suggestions', () => {
    const context = { goal: 'Move into UX design', need: 'Portfolio review', offer: 'Mentoring' }
    expect(SuggestCollaborationContextSchema.safeParse(context).success).toBe(true)
    expect(
      SuggestCollaborationContextSchema.safeParse({ ...context, offer: '' }).success,
    ).toBe(false)
    expect(CollaborationSuggestionsSchema.safeParse({ suggestions: [] }).success).toBe(false)
    expect(
      CollaborationSuggestionsSchema.safeParse({ suggestions: Array(6).fill('x') }).success,
    ).toBe(false)
  })
})

describe('SuggestTags contracts', () => {
  const base = { text: 'Review my portfolio', vocabulary: ['portfolio-review', 'python'] }

  it('requires text and a non-empty vocabulary', () => {
    expect(SuggestTagsContextSchema.safeParse(base).success).toBe(true)
    expect(SuggestTagsContextSchema.safeParse({ ...base, text: '' }).success).toBe(false)
    expect(SuggestTagsContextSchema.safeParse({ ...base, vocabulary: [] }).success).toBe(false)
    expect(
      SuggestTagsContextSchema.safeParse({ ...base, text: 'x'.repeat(8001) }).success,
    ).toBe(false)
  })

  it('defaults suggested tags to an empty list and bounds them at 20', () => {
    const result = SuggestedTagsSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({ tags: [] })
    }
    expect(
      SuggestedTagsSchema.safeParse({ tags: Array(21).fill('x') }).success,
    ).toBe(false)
  })
})
