import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  CollaborationSuggestionsSchema,
  ConciergeCriteriaSchema,
  ExtractedGoalSchema,
  IntroductionDraftSchema,
  MatchExplanationSchema,
  SuggestedTagsSchema,
} from '@tulay/shared'
import { DemoProvider, getAIProvider, MetaModelProvider, MetaProviderError } from './index'

const MATCH_CONTEXT = {
  seekerNeed: 'Portfolio review',
  candidateName: 'Ate Liza',
  candidateOffer: 'Design mentoring',
  matchFactors: ['shared language: English'],
}

const DRAFT_CONTEXT = {
  senderName: 'Mara',
  recipientName: 'Ate Liza',
  need: 'Portfolio review',
}

const SUGGEST_CONTEXT = {
  goal: 'Move into UX design',
  need: 'Portfolio review',
  offer: 'Design mentoring',
}

describe('DemoProvider', () => {
  it('echoes the input goal and returns schema-valid extraction', async () => {
    const provider = new DemoProvider()
    const result = await provider.extractGoal('Land my first freelance client')
    expect(result.goal).toBe('Land my first freelance client')
    expect(ExtractedGoalSchema.safeParse(result).success).toBe(true)
  })

  it('returns schema-valid explanations, drafts and suggestions', async () => {
    const provider = new DemoProvider()
    const explanation = await provider.explainMatch(MATCH_CONTEXT)
    expect(MatchExplanationSchema.safeParse(explanation).success).toBe(true)

    const draft = await provider.draftIntroduction(DRAFT_CONTEXT)
    expect(IntroductionDraftSchema.safeParse(draft).success).toBe(true)
    expect(draft.message.length).toBeGreaterThan(0)

    const suggestions = await provider.suggestCollaboration(SUGGEST_CONTEXT)
    expect(CollaborationSuggestionsSchema.safeParse(suggestions).success).toBe(true)
  })

  it('rejects invalid contexts instead of answering anyway', async () => {
    const provider = new DemoProvider()
    await expect(provider.explainMatch({} as never)).rejects.toThrow()
    await expect(provider.draftIntroduction({} as never)).rejects.toThrow()
    await expect(provider.suggestCollaboration({} as never)).rejects.toThrow()
  })
})

describe('MetaModelProvider (real integration)', () => {
  it('requires an API key instead of silently returning demo output', () => {
    const savedModelKey = process.env.MODEL_API_KEY
    const savedLegacyKey = process.env.META_MODEL_API_KEY
    delete process.env.MODEL_API_KEY
    delete process.env.META_MODEL_API_KEY
    try {
      expect(() => new MetaModelProvider()).toThrowError(MetaProviderError)
    } finally {
      if (savedModelKey !== undefined) process.env.MODEL_API_KEY = savedModelKey
      if (savedLegacyKey !== undefined) process.env.META_MODEL_API_KEY = savedLegacyKey
    }
  })
})

describe('getAIProvider', () => {
  const savedEnv = { ...process.env }

  beforeEach(() => {
    delete process.env.AI_PROVIDER
    delete process.env.META_MODEL_API_KEY
  })

  afterEach(() => {
    process.env.AI_PROVIDER = savedEnv.AI_PROVIDER
    process.env.META_MODEL_API_KEY = savedEnv.META_MODEL_API_KEY
    if (savedEnv.AI_PROVIDER === undefined) delete process.env.AI_PROVIDER
    if (savedEnv.META_MODEL_API_KEY === undefined) delete process.env.META_MODEL_API_KEY
  })

  it('returns the demo provider by default', () => {
    expect(getAIProvider()).toBeInstanceOf(DemoProvider)
  })

  it('returns the demo provider when meta is requested without a key', () => {
    process.env.AI_PROVIDER = 'meta'
    expect(getAIProvider()).toBeInstanceOf(DemoProvider)
  })

  it('returns the meta provider only when requested with a key', () => {
    process.env.AI_PROVIDER = 'meta'
    process.env.META_MODEL_API_KEY = 'test-key'
    expect(getAIProvider()).toBeInstanceOf(MetaModelProvider)
  })
})

describe('DemoProvider suggestTags', () => {
  const context = {
    text: 'Please review my design portfolio',
    vocabulary: ['portfolio-review', 'python'],
  }

  it('returns deterministic vocabulary-grounded tags', async () => {
    const provider = new DemoProvider()
    const first = await provider.suggestTags(context)
    const second = await provider.suggestTags(context)
    expect(first).toEqual(second)
    expect(SuggestedTagsSchema.safeParse(first).success).toBe(true)
    for (const tag of first.tags) {
      expect(context.vocabulary).toContain(tag)
    }
  })

  it('matches vocabulary terms mentioned in the text', async () => {
    const provider = new DemoProvider()
    const result = await provider.suggestTags(context)
    expect(result.tags).toContain('portfolio-review')
    expect(result.tags).not.toContain('python')
  })

  it('rejects invalid contexts instead of answering anyway', async () => {
    const provider = new DemoProvider()
    await expect(provider.suggestTags({} as never)).rejects.toThrow()
  })
})

describe('DemoProvider extractCriteria', () => {
  it('echoes the input as the description with schema-valid criteria', async () => {
    const provider = new DemoProvider()
    const result = await provider.extractCriteria(
      'Looking for a technical co-founder who understands payments',
    )
    expect(ConciergeCriteriaSchema.safeParse(result).success).toBe(true)
    expect(result.description).toBe('Looking for a technical co-founder who understands payments')
  })

  it('returns the same criteria for the same input', async () => {
    const provider = new DemoProvider()
    const first = await provider.extractCriteria('Looking for a mentor in design')
    const second = await provider.extractCriteria('Looking for a mentor in design')
    expect(first).toEqual(second)
  })

  it('guesses the relationship from keywords and defaults to other', async () => {
    const provider = new DemoProvider()
    const cofounder = await provider.extractCriteria('Need a co-founder for my fintech startup')
    expect(cofounder.relationship).toBe('co-founder')
    const mentor = await provider.extractCriteria('Searching for a mentor in UX design')
    expect(mentor.relationship).toBe('mentor')
    const other = await provider.extractCriteria('Someone to chat with about freelancing')
    expect(other.relationship).toBe('other')
  })

  it('rejects empty input instead of answering anyway', async () => {
    const provider = new DemoProvider()
    await expect(provider.extractCriteria('   ')).rejects.toThrow()
  })
})
