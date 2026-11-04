import { afterEach, describe, expect, it } from 'vitest'
import { draftOutlineAction } from './ai-actions'

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

describe('draftOutlineAction', () => {
  it('returns a labelled demo outline without credentials', async () => {
    forceDemoProvider()
    const result = await draftOutlineAction({
      title: 'Acme pitch',
      purpose: 'Raise feedback',
      audience: 'Founders',
      context: 'Pre-launch',
      template: 'startup',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.source).toBe('demo')
      expect((result.data.outline as { slides: unknown[] }).slides.length).toBeGreaterThanOrEqual(4)
    }
  })

  it('rejects invalid deck details without calling any provider', async () => {
    forceDemoProvider()
    const result = await draftOutlineAction({ title: '', template: 'keynote' })
    expect(result.ok).toBe(false)
  })
})
