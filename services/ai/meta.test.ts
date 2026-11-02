import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DemoProvider,
  getAIProvider,
  META_API_DEFAULT_BASE_URL,
  META_API_DEFAULT_MODEL,
  MetaModelProvider,
  MetaProviderError,
} from './index'

const API_KEY = 'test-key-123'
const OTHER_KEY = 'other-key-456'

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function chatCompletion(content: string): unknown {
  return { choices: [{ message: { role: 'assistant', content } }] }
}

function mockFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const calls: Array<{ url: string; init?: RequestInit }> = []
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init })
    return handler(url, init)
  })
  return { fn: fn as unknown as typeof fetch, calls }
}

function validPayloads(): Record<string, unknown> {
  return {
    extractGoal: { goal: 'Move into UX design', needs: ['portfolio review'], offers: [], skills: [] },
    explainMatch: {
      explanation: 'Ana offers exactly what Sam needs.',
      compatibilityFactors: ['shared tag: portfolio-review'],
      suggestedCollaboration: 'Start with one review session.',
    },
    draftIntroduction: { message: 'Hi Ana, Sam would love a portfolio review.' },
    suggestCollaboration: { suggestions: ['Share the portfolio by Friday'] },
    suggestTags: { tags: ['portfolio-review'] },
    extractCriteria: {
      relationship: 'co-founder',
      skills: ['payments'],
      description: 'A technical co-founder who understands payments',
    },
  }
}

const MATCH_CONTEXT = {
  seekerNeed: 'Portfolio review',
  candidateName: 'Ate Liza',
  candidateOffer: 'Design mentoring',
  matchFactors: ['shared language: English'],
}
const DRAFT_CONTEXT = { senderName: 'Mara', recipientName: 'Ate Liza', need: 'Portfolio review' }
const SUGGEST_CONTEXT = { goal: 'Move into UX design', need: 'Portfolio review', offer: 'Mentoring' }
const TAGS_CONTEXT = { text: 'Please review my design portfolio', vocabulary: ['portfolio-review', 'python'] }

describe('MetaModelProvider request construction', () => {
  it('posts Chat Completions with Bearer auth and a JSON-schema response format', async () => {
    const { fn, calls } = mockFetch(() =>
      jsonResponse(chatCompletion(JSON.stringify(validPayloads().extractGoal))),
    )
    const provider = new MetaModelProvider({ apiKey: API_KEY, fetchFn: fn })
    await provider.extractGoal('Become a designer')

    expect(calls).toHaveLength(1)
    expect(calls[0]?.url).toBe(`${META_API_DEFAULT_BASE_URL}/chat/completions`)
    expect(calls[0]?.init?.method).toBe('POST')
    const headers = new Headers(calls[0]?.init?.headers)
    expect(headers.get('Authorization')).toBe(`Bearer ${API_KEY}`)
    expect(headers.get('Content-Type')).toBe('application/json')
    const body = JSON.parse(calls[0]?.init?.body as string) as {
      model: string
      messages: unknown[]
      response_format: { type: string; json_schema: { name: string; schema: unknown } }
    }
    expect(body.model).toBe(META_API_DEFAULT_MODEL)
    expect(body.messages).toHaveLength(2)
    expect(body.response_format.type).toBe('json_schema')
    expect(body.response_format.json_schema.name).toBe('extracted_goal')
    expect(typeof body.response_format.json_schema.schema).toBe('object')
  })

  it('honors custom base URL and model', async () => {
    const { fn, calls } = mockFetch(() =>
      jsonResponse(chatCompletion(JSON.stringify(validPayloads().extractGoal))),
    )
    const provider = new MetaModelProvider({
      apiKey: API_KEY,
      fetchFn: fn,
      baseUrl: 'https://example.test/v9',
      model: 'custom-model',
    })
    await provider.extractGoal('goal')
    expect(calls[0]?.url).toBe('https://example.test/v9/chat/completions')
    const body = JSON.parse(calls[0]?.init?.body as string) as { model: string }
    expect(body.model).toBe('custom-model')
  })
})

describe('MetaModelProvider operations', () => {
  it.each([
    ['extractGoal', 'Become a designer'],
    ['explainMatch', MATCH_CONTEXT],
    ['draftIntroduction', DRAFT_CONTEXT],
    ['suggestCollaboration', SUGGEST_CONTEXT],
    ['suggestTags', TAGS_CONTEXT],
    ['extractCriteria', 'Looking for a technical co-founder who understands payments'],
  ] as const)('%s returns Zod-valid output', async (method, input) => {
    const payloads = validPayloads()
    const { fn } = mockFetch(() => jsonResponse(chatCompletion(JSON.stringify(payloads[method]))))
    const provider = new MetaModelProvider({ apiKey: API_KEY, fetchFn: fn })
    const result = await (provider[method] as (arg: never) => Promise<unknown>)(input as never)
    expect(result).toEqual(payloads[method])
  })

  it('maps suggested tags to canonical vocabulary spelling', async () => {
    const { fn } = mockFetch(() => jsonResponse(chatCompletion(JSON.stringify({ tags: ['Portfolio-Review'] }))))
    const provider = new MetaModelProvider({ apiKey: API_KEY, fetchFn: fn })
    const result = await provider.suggestTags(TAGS_CONTEXT)
    expect(result).toEqual({ tags: ['portfolio-review'] })
  })

  it('sends concierge criteria under its own schema name', async () => {
    const { fn, calls } = mockFetch(() =>
      jsonResponse(chatCompletion(JSON.stringify(validPayloads().extractCriteria))),
    )
    const provider = new MetaModelProvider({ apiKey: API_KEY, fetchFn: fn })
    await provider.extractCriteria('Looking for a mentor')
    const body = JSON.parse(calls[0]?.init?.body as string) as {
      response_format: { json_schema: { name: string } }
    }
    expect(body.response_format.json_schema.name).toBe('concierge_criteria')
  })
})

describe('MetaModelProvider failures', () => {
  it('rejects non-JSON message content', async () => {
    const { fn } = mockFetch(() => jsonResponse(chatCompletion('not json {')))
    const provider = new MetaModelProvider({ apiKey: API_KEY, fetchFn: fn })
    await expect(provider.extractGoal('goal')).rejects.toMatchObject({ code: 'protocol' })
  })

  it('rejects responses with no choices or empty content', async () => {
    for (const payload of [{ choices: [] }, {}, chatCompletion('')]) {
      const { fn } = mockFetch(() => jsonResponse(payload))
      const provider = new MetaModelProvider({ apiKey: API_KEY, fetchFn: fn })
      await expect(provider.extractGoal('goal')).rejects.toMatchObject({ code: 'protocol' })
    }
  })

  it('rejects a non-JSON response body', async () => {
    const { fn } = mockFetch(
      () => new Response('<html>nope</html>', { status: 200, headers: { 'Content-Type': 'text/html' } }),
    )
    const provider = new MetaModelProvider({ apiKey: API_KEY, fetchFn: fn })
    await expect(provider.extractGoal('goal')).rejects.toMatchObject({ code: 'protocol' })
  })

  it('rejects content that fails the Zod contract', async () => {
    const { fn } = mockFetch(() =>
      jsonResponse(chatCompletion(JSON.stringify({ goal: 'g', needs: [], offers: [], skills: [] }))),
    )
    const provider = new MetaModelProvider({ apiKey: API_KEY, fetchFn: fn })
    await expect(provider.extractGoal('goal')).rejects.toMatchObject({ code: 'validation' })
  })

  it('rejects suggested tags outside the vocabulary', async () => {
    const { fn } = mockFetch(() => jsonResponse(chatCompletion(JSON.stringify({ tags: ['hacking'] }))))
    const provider = new MetaModelProvider({ apiKey: API_KEY, fetchFn: fn })
    await expect(provider.suggestTags(TAGS_CONTEXT)).rejects.toMatchObject({ code: 'validation' })
  })

  it('surfaces HTTP errors with status and no key material', async () => {
    for (const status of [401, 500]) {
      const { fn } = mockFetch(() => new Response('bad things', { status }))
      const provider = new MetaModelProvider({ apiKey: API_KEY, fetchFn: fn })
      const error = await provider.extractGoal('goal').catch((e: unknown) => e)
      expect(error).toBeInstanceOf(MetaProviderError)
      expect(error).toMatchObject({ code: 'http', status })
      expect(String(error)).toContain(String(status))
      expect(String(error)).not.toContain(API_KEY)
    }
  })

  it('maps network failures without retrying', async () => {
    const { fn, calls } = mockFetch(() => {
      throw new TypeError('fetch failed')
    })
    const provider = new MetaModelProvider({ apiKey: API_KEY, fetchFn: fn })
    await expect(provider.extractGoal('goal')).rejects.toMatchObject({ code: 'network' })
    expect(calls).toHaveLength(1)
  })

  it('times out a hanging request', async () => {
    const hanging = ((_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('Timeout', 'TimeoutError')))
      })) as typeof fetch
    const provider = new MetaModelProvider({ apiKey: API_KEY, fetchFn: hanging, timeoutMs: 10 })
    await expect(provider.extractGoal('goal')).rejects.toMatchObject({ code: 'timeout' })
  })

  it('rejects empty and overlong input without calling the API', async () => {
    const { fn, calls } = mockFetch(() => jsonResponse(chatCompletion('{}')))
    const provider = new MetaModelProvider({ apiKey: API_KEY, fetchFn: fn })
    await expect(provider.extractGoal('')).rejects.toMatchObject({ code: 'validation' })
    await expect(provider.extractGoal('x'.repeat(8001))).rejects.toMatchObject({ code: 'validation' })
    expect(calls).toHaveLength(0)
  })
})

describe('MetaModelProvider configuration', () => {
  const savedEnv = { ...process.env }

  beforeEach(() => {
    delete process.env.AI_PROVIDER
    delete process.env.MODEL_API_KEY
    delete process.env.META_MODEL_API_KEY
    delete process.env.META_MODEL_API_URL
    delete process.env.META_MODEL_MODEL
  })

  afterEach(() => {
    for (const key of ['AI_PROVIDER', 'MODEL_API_KEY', 'META_MODEL_API_KEY', 'META_MODEL_API_URL', 'META_MODEL_MODEL'] as const) {
      const saved = savedEnv[key]
      if (saved === undefined) delete process.env[key]
      else process.env[key] = saved
    }
  })

  it('throws a config error without an API key', () => {
    expect(() => new MetaModelProvider()).toThrowError(MetaProviderError)
    expect(() => new MetaModelProvider()).toThrow(/MODEL_API_KEY/)
  })

  it('reads MODEL_API_KEY from the environment', async () => {
    process.env.MODEL_API_KEY = OTHER_KEY
    const { fn, calls } = mockFetch(() =>
      jsonResponse(chatCompletion(JSON.stringify(validPayloads().extractGoal))),
    )
    const provider = new MetaModelProvider({ fetchFn: fn })
    await provider.extractGoal('goal')
    expect(new Headers(calls[0]?.init?.headers).get('Authorization')).toBe(`Bearer ${OTHER_KEY}`)
  })

  it('accepts the legacy META_MODEL_API_KEY', () => {
    process.env.META_MODEL_API_KEY = OTHER_KEY
    expect(() => new MetaModelProvider()).not.toThrow()
  })

  it('selects demo by default and meta only when requested with a key', () => {
    expect(getAIProvider()).toBeInstanceOf(DemoProvider)

    process.env.AI_PROVIDER = 'meta'
    expect(getAIProvider()).toBeInstanceOf(DemoProvider)

    process.env.MODEL_API_KEY = API_KEY
    const meta = getAIProvider()
    expect(meta).toBeInstanceOf(MetaModelProvider)
    expect(meta).not.toBeInstanceOf(DemoProvider)

    delete process.env.MODEL_API_KEY
    process.env.META_MODEL_API_KEY = API_KEY
    expect(getAIProvider()).toBeInstanceOf(MetaModelProvider)
  })

  it('falls back to demo for unknown provider names', () => {
    process.env.AI_PROVIDER = 'bogus'
    process.env.MODEL_API_KEY = API_KEY
    expect(getAIProvider()).toBeInstanceOf(DemoProvider)
  })
})

describe('credential safety', () => {
  it('never serializes the key from a provider instance', () => {
    const provider = new MetaModelProvider({ apiKey: API_KEY })
    expect(JSON.stringify(provider)).not.toContain(API_KEY)
    expect(Object.keys(provider)).not.toContain('apiKey')
  })
})
