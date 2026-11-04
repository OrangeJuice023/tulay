import { afterEach, describe, expect, it } from 'vitest'
import { draftIntroductionAction, startBrowsingAction } from './actions'

const ENV_KEYS = ['AI_PROVIDER', 'MODEL_API_KEY', 'META_MODEL_API_KEY'] as const
const savedEnv = new Map<string, string | undefined>()

function forceDemoProvider() {
  for (const key of ENV_KEYS) {
    if (!savedEnv.has(key)) savedEnv.set(key, process.env[key])
    delete process.env[key]
  }
}

afterEach(() => {
  for (const [key, value] of savedEnv) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  savedEnv.clear()
})

const NEED = {
  profileId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  description: 'Portfolio review from a designer',
  tags: ['portfolio-review'],
}

describe('demo attribution', () => {
  it('labels demo-provider criteria as demo, never ai', async () => {
    forceDemoProvider()
    const result = await startBrowsingAction({
      criteriaText: 'a designer who can review my portfolio',
      need: NEED,
      seekerOffers: [],
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.criteriaSource).toBe('demo')
  })

  it('reports demo-template source for drafts in demo mode', async () => {
    forceDemoProvider()
    const result = await draftIntroductionAction({
      senderName: 'Alex',
      recipientName: 'Bianca',
      need: 'portfolio review',
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.source).toBe('demo-template')
  })
})
