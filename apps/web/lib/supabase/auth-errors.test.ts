import { describe, expect, it } from 'vitest'
import { friendlyAuthError } from './auth-errors'

describe('friendlyAuthError', () => {
  it('maps wrong credentials and duplicate registration', () => {
    expect(friendlyAuthError('Invalid login credentials')).toBe('That email and password did not match.')
    expect(friendlyAuthError('User already registered')).toBe('That email is already registered. Try signing in.')
  })

  it('keeps the email-confirmation requirement explicit', () => {
    expect(friendlyAuthError('Email not confirmed')).toBe('Please confirm your email first, then sign in.')
  })

  it('maps expired links to the resend path, never a dead end', () => {
    expect(friendlyAuthError('Token has expired or is invalid')).toContain('Request a new one below.')
    expect(friendlyAuthError('invalid verification code')).toContain('Request a new one below.')
  })

  it('maps rate limits and rejected addresses without leaking internals', () => {
    expect(friendlyAuthError('rate limit exceeded')).toContain('Wait a minute')
    expect(friendlyAuthError('Email address "x@example.com" is invalid')).toContain('rejected')
    expect(friendlyAuthError('something entirely new')).toBe('Sign-in failed. Please try again.')
  })
})
