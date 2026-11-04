import { afterEach, describe, expect, it } from 'vitest'
import { getAdminKey, getSupabaseEnv, isSupabaseConfigured } from './config'

const KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SECRET_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const

const saved = new Map<string, string | undefined>()

function setEnv(values: Partial<Record<(typeof KEYS)[number], string | undefined>>) {
  for (const key of KEYS) {
    if (!saved.has(key)) saved.set(key, process.env[key])
    const value = values[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
}

afterEach(() => {
  for (const [key, value] of saved) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  saved.clear()
})

describe('getSupabaseEnv', () => {
  it('prefers the publishable key when both names are set', () => {
    setEnv({
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_key',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'legacy-anon-key',
    })
    expect(getSupabaseEnv()).toEqual({
      url: 'https://example.supabase.co',
      publishableKey: 'sb_publishable_key',
    })
    expect(isSupabaseConfigured()).toBe(true)
  })

  it('falls back to the anon key', () => {
    setEnv({
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'legacy-anon-key',
    })
    expect(getSupabaseEnv()?.publishableKey).toBe('legacy-anon-key')
  })

  it('returns null when the url or key is missing', () => {
    setEnv({ NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co' })
    expect(getSupabaseEnv()).toBeNull()
    expect(isSupabaseConfigured()).toBe(false)
    setEnv({ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_key' })
    expect(getSupabaseEnv()).toBeNull()
  })
})

describe('getAdminKey', () => {
  it('prefers the modern secret key over the legacy service-role key', () => {
    setEnv({ SUPABASE_SECRET_KEY: 'sb_secret_key', SUPABASE_SERVICE_ROLE_KEY: 'legacy-service-key' })
    expect(getAdminKey()).toBe('sb_secret_key')
  })

  it('falls back to the service-role key', () => {
    setEnv({ SUPABASE_SERVICE_ROLE_KEY: 'legacy-service-key' })
    expect(getAdminKey()).toBe('legacy-service-key')
  })

  it('returns null when neither key is set', () => {
    setEnv({})
    expect(getAdminKey()).toBeNull()
  })

  it('treats blank values as missing', () => {
    setEnv({ SUPABASE_SECRET_KEY: '   ', SUPABASE_SERVICE_ROLE_KEY: '' })
    expect(getAdminKey()).toBeNull()
  })
})
