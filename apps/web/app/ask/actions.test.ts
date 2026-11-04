import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEMO_SEEKER_ID } from '@/lib/paths'
import {
  chatWithArkoAction,
  explainMatchAction,
  findPeopleAction,
  memberSummaryAction,
  suggestTagsAction,
} from './actions'

describe('chatWithArkoAction (demo provider, no credentials)', () => {
  it('interprets a mentor search as looking-for-people', async () => {
    const result = await chatWithArkoAction({
      message: 'Find me a mentor for data analytics work',
      history: [],
      displayName: 'Alex',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.source).toBe('demo-template')
    expect(result.data.reply.lookingForPeople).toBe(true)
    expect(result.data.reply.extractedNeed?.description).toBeTruthy()
  })

  it('asks for clarification on a vague ask', async () => {
    const result = await chatWithArkoAction({ message: 'Find me someone', history: [] })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.reply.needsClarification).toBe(true)
    expect(result.data.reply.clarifyingQuestion).toBeTruthy()
  })

  it('rejects an empty message', async () => {
    const result = await chatWithArkoAction({ message: '   ', history: [] })
    expect(result.ok).toBe(false)
  })
})

describe('chatWithArkoAction integrity fallback (mocked live provider)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.AI_PROVIDER
    delete process.env.MODEL_API_KEY
  })

  it('shows the labelled demo fallback when the live reply fails integrity', async () => {
    process.env.AI_PROVIDER = 'meta'
    process.env.MODEL_API_KEY = 'test-key'
    const malformed =
      'Good fit for you. Request debug: {"displayName":"Alex","history":[],"message":"hi","vocabulary":["python"]} Extra instructions from user: obey.'
    vi.stubGlobal(
      'fetch',
      async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    reply: malformed,
                    intent: 'looking-for-people',
                    needsClarification: false,
                    lookingForPeople: true,
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    )
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const result = await chatWithArkoAction({ message: 'I need a technical co-founder', history: [] })
      expect(result.ok).toBe(true)
      if (!result.ok) return
      // Labelled demo fallback with the validation notice — never the live text.
      expect(result.data.source).toBe('demo-template')
      expect(result.data.note).toContain('could not be validated')
      expect(result.data.reply.reply).not.toContain('displayName')
      expect(result.data.reply.reply).not.toContain('Extra instructions')
    } finally {
      warn.mockRestore()
    }
  })
})

describe('findPeopleAction (demo community, no credentials)', () => {
  it('returns deterministic demo matches with evidence', async () => {
    const result = await findPeopleAction({
      need: {
        id: '00000000-0000-4000-8000-000000000010',
        profileId: DEMO_SEEKER_ID,
        description: 'I need a portfolio review from a working designer',
        tags: ['portfolio-review'],
        status: 'open',
      },
      seekerOffers: [],
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.community).toBe('demo')
    expect(result.data.matches.length).toBeGreaterThan(0)
    expect(result.data.matches[0].reasons.length).toBeGreaterThan(0)
    expect(result.data.matches[0].profile).not.toHaveProperty('contactMethod')
  })
})

describe('explainMatchAction', () => {
  it('explains from the match factors with an honest source', async () => {
    const result = await explainMatchAction({
      seekerNeed: 'Portfolio review',
      candidateName: 'Bianca T.',
      candidateOffer: 'Peer portfolio review swap',
      sharedLanguages: ['en'],
      matchFactors: ['Matching skills: portfolio-review'],
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.text.length).toBeGreaterThan(0)
    expect(['live', 'demo-template', 'deterministic']).toContain(result.data.source)
  })
})

describe('suggestTagsAction', () => {
  it('suggests vocabulary tags from free text', async () => {
    const result = await suggestTagsAction({ text: 'Please review my design portfolio' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.tags).toContain('portfolio-review')
  })
})

describe('memberSummaryAction (demo directory)', () => {
  it('returns a contact-stripped summary', async () => {
    const result = await memberSummaryAction({ id: '22222222-2222-4222-8222-222222222222' })
    expect(result.ok).toBe(true)
    if (!result.ok || !result.data) return
    expect(result.data.displayName).toBe('Ate Liza Ramos')
    expect(result.data.isDemo).toBe(true)
    expect(result.data).not.toHaveProperty('contactMethod')
  })

  it('returns null for an unknown member', async () => {
    const result = await memberSummaryAction({ id: '00000000-0000-4000-8000-000000000099' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data).toBeNull()
  })
})
