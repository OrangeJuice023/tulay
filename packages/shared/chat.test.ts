import { describe, expect, it } from 'vitest'
import { ArkoChatContextSchema, ArkoChatReplySchema, ChatIntentSchema, toChatHistory } from './chat'

describe('ChatIntentSchema', () => {
  it('accepts the six known intents', () => {
    for (const intent of ['looking-for-people', 'career-advice', 'portfolio-feedback', 'goal-setting', 'small-talk', 'unclear']) {
      expect(ChatIntentSchema.safeParse(intent).success).toBe(true)
    }
    expect(ChatIntentSchema.safeParse('send-email').success).toBe(false)
  })
})

describe('ArkoChatContextSchema', () => {
  it('caps history and vocabulary', () => {
    const history = Array.from({ length: 11 }, (_, index) => ({ role: 'user' as const, text: `message ${index}` }))
    expect(ArkoChatContextSchema.safeParse({ message: 'Hi', history }).success).toBe(false)
    expect(
      ArkoChatContextSchema.safeParse({ message: 'Hi', vocabulary: Array.from({ length: 101 }, (_, i) => `tag-${i}`) }).success,
    ).toBe(false)
  })

  it('accepts a minimal turn', () => {
    const parsed = ArkoChatContextSchema.safeParse({ message: 'Find me a mentor' })
    expect(parsed.success).toBe(true)
    expect(parsed.success && parsed.data.history).toEqual([])
  })
})

describe('toChatHistory', () => {
  it('passes prior turns through verbatim, newest last', () => {
    const messages = [
      { role: 'user' as const, text: 'I need a technical co-founder' },
      { role: 'arko' as const, text: 'What exactly does the role cover?' },
    ]
    expect(toChatHistory(messages)).toEqual(messages)
  })

  it('keeps only the last 10 turns on reload of a long thread', () => {
    const stored = Array.from({ length: 14 }, (_, index) => ({
      role: (index % 2 === 0 ? 'user' : 'arko') as 'user' | 'arko',
      text: `turn ${index}`,
    }))
    const history = toChatHistory(stored)
    expect(history).toHaveLength(10)
    expect(history[0].text).toBe('turn 4')
    expect(history[9].text).toBe('turn 13')
  })

  it('caps overlong texts without touching anything else', () => {
    const history = toChatHistory([{ role: 'user', text: 'x'.repeat(5000) }])
    expect(history[0].text).toHaveLength(2000)
  })

  it('never adds messages from elsewhere', () => {
    expect(toChatHistory([])).toEqual([])
  })
})

describe('ArkoChatReplySchema', () => {
  it('requires the decision fields the UI branches on', () => {
    expect(ArkoChatReplySchema.safeParse({ reply: 'Hi', intent: 'small-talk' }).success).toBe(false)
    const parsed = ArkoChatReplySchema.safeParse({
      reply: 'Tell me more.',
      intent: 'unclear',
      needsClarification: true,
      clarifyingQuestion: 'What kind of help do you need?',
      lookingForPeople: false,
    })
    expect(parsed.success).toBe(true)
  })
})
