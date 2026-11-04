import { afterEach, describe, expect, it } from 'vitest'
import { improveSectionAction } from './ai-actions'

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

describe('improveSectionAction', () => {
  it('returns a labelled demo suggestion without credentials', async () => {
    forceDemoProvider()
    const result = await improveSectionAction({
      section: 'summary',
      text: 'I did customer support for 3 years.',
      targetRole: 'Customer success associate',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.source).toBe('demo')
      const suggestion = result.data.suggestion as { rewritten: string; missingInfo: string[] }
      expect(suggestion.rewritten).toContain('I did customer support for 3 years.')
      expect(suggestion.missingInfo.length).toBeGreaterThan(0)
    }
  })

  it('rejects empty text without calling any provider', async () => {
    forceDemoProvider()
    const result = await improveSectionAction({ section: 'summary', text: '  ' })
    expect(result.ok).toBe(false)
  })
})
