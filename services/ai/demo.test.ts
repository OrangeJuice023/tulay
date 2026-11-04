import { describe, expect, it } from 'vitest'
import { DemoProvider } from './demo'

const VOCABULARY = ['portfolio-review', 'mentoring', 'pricing', 'co-founding', 'data-analytics']

describe('DemoProvider.chat', () => {
  const provider = new DemoProvider()

  it('greets briefly and invites a goal', async () => {
    const reply = await provider.chat({ message: 'Hi!', vocabulary: VOCABULARY })
    expect(reply.intent).toBe('small-talk')
    expect(reply.needsClarification).toBe(false)
    expect(reply.lookingForPeople).toBe(false)
    expect(reply.reply).toContain('next career move')
  })

  it('asks a clarifying question when the ask is unclear', async () => {
    const reply = await provider.chat({ message: 'Blah blah zmorp?', vocabulary: VOCABULARY })
    expect(reply.intent).toBe('unclear')
    expect(reply.needsClarification).toBe(true)
    expect(reply.clarifyingQuestion).toBeTruthy()
    expect(reply.lookingForPeople).toBe(false)
  })

  it('extracts a concrete people-search with vocabulary tags', async () => {
    const reply = await provider.chat({
      message: 'Find me a mentor: I need mentoring and a portfolio review',
      vocabulary: VOCABULARY,
    })
    expect(reply.intent).toBe('looking-for-people')
    expect(reply.lookingForPeople).toBe(true)
    expect(reply.needsClarification).toBe(false)
    expect(reply.relationship).toBe('mentor')
    expect(reply.extractedNeed?.tags).toContain('portfolio-review')
    expect(reply.extractedNeed?.tags).toContain('mentoring')
  })

  it('handles a portfolio review ask as people-search', async () => {
    const reply = await provider.chat({ message: 'Can someone review my portfolio?', vocabulary: VOCABULARY })
    expect(reply.lookingForPeople).toBe(true)
    expect(reply.extractedNeed?.description).toBeTruthy()
  })

  it('asks for specifics on a vague people-search', async () => {
    const reply = await provider.chat({ message: 'Find me someone', vocabulary: VOCABULARY })
    expect(reply.intent).toBe('looking-for-people')
    expect(reply.needsClarification).toBe(true)
    expect(reply.clarifyingQuestion).toMatch(/exactly/)
    expect(reply.extractedNeed).toBeUndefined()
  })

  it('answers a stated goal with a follow-up instead of inventing a need', async () => {
    const reply = await provider.chat({
      message: 'I want to transition into data analytics',
      vocabulary: VOCABULARY,
    })
    expect(reply.intent).toBe('goal-setting')
    expect(reply.goal).toContain('data analytics')
    expect(reply.lookingForPeople).toBe(false)
    expect(reply.extractedNeed).toBeUndefined()
    expect(reply.needsClarification).toBe(true)
    expect(reply.clarifyingQuestion).toMatch(/obstacle/)
  })

  it('answers career advice without inventing people', async () => {
    const reply = await provider.chat({
      message: 'How do I shift careers from support into design?',
      vocabulary: VOCABULARY,
    })
    expect(reply.intent).toBe('career-advice')
    expect(reply.lookingForPeople).toBe(false)
    expect(reply.reply).not.toMatch(/Bianca|Mara|Jun|Diego|Liza/)
  })
})

describe('DemoProvider.transcribeAudio', () => {
  const provider = new DemoProvider()
  const input = {
    audioBase64: Buffer.from('RIFFfake-wav-bytes').toString('base64'),
    mimeType: 'audio/wav' as const,
    durationSec: 7,
  }

  it('returns a labelled demo transcript echoing the input duration', async () => {
    const result = await provider.transcribeAudio(input)
    expect(result.durationSec).toBe(7)
    expect(result.transcript).toContain('Demo transcript')
  })

  it('is deterministic and needs no credentials', async () => {
    const first = await provider.transcribeAudio(input)
    const second = await provider.transcribeAudio(input)
    expect(second).toEqual(first)
  })

  it('validates input with the shared contract', async () => {
    await expect(
      provider.transcribeAudio({ ...input, mimeType: 'audio/webm' as 'audio/wav' }),
    ).rejects.toThrow()
    await expect(provider.transcribeAudio({ ...input, durationSec: 61 })).rejects.toThrow()
  })
})

describe('DemoProvider.draftDeckOutline', () => {
  const provider = new DemoProvider()
  const input = {
    title: 'Acme pitch',
    purpose: 'Raise pre-seed feedback from founders.',
    audience: 'Early-stage founders',
    context: 'Pre-launch task app for freelancers',
    template: 'startup' as const,
  }

  it('drafts the template structure deterministically from user facts', async () => {
    const first = await provider.draftDeckOutline(input)
    const second = await provider.draftDeckOutline(input)
    expect(first).toEqual(second)
    expect(first.slides.map((slide) => slide.title)).toEqual([
      'Cover',
      'Problem',
      'Solution',
      'Product',
      'Market',
      'Business model',
      'Traction',
      'Team',
      'The ask',
    ])
    expect(first.slides[0]?.bullets).toContain('Acme pitch')
  })

  it('marks demo content and placeholders instead of inventing facts', async () => {
    const outline = await provider.draftDeckOutline(input)
    expect(outline.slides[1]?.bullets.join(' ')).toContain('demo draft')
    expect(outline.slides[1]?.bullets.join(' ')).toMatch(/\[Add supporting detail/)
  })
})

describe('DemoProvider.improveResumeSection', () => {
  const provider = new DemoProvider()

  it('returns a deterministic labelled suggestion from user text', async () => {
    const input = { section: 'summary' as const, text: 'I did customer support for 3 years.' }
    const first = await provider.improveResumeSection(input)
    const second = await provider.improveResumeSection(input)
    expect(first).toEqual(second)
    expect(first.rewritten).toContain('I did customer support for 3 years.')
    expect(first.rewritten).toContain('demo suggestion')
    expect(first.missingInfo.join(' ')).toMatch(/\[Add/)
  })

  it('names the target role when given', async () => {
    const suggestion = await provider.improveResumeSection({
      section: 'skills' as const,
      text: 'email, chat support',
      targetRole: 'Customer success associate',
    })
    expect(suggestion.improvements.join(' ')).toContain('Customer success associate')
  })
})
