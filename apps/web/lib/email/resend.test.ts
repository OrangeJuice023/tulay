import { describe, expect, it, vi } from 'vitest'
import { buildResendRequest, ResendError, sendEmail } from './resend'

const FROM = 'Tulay <hello@example.com>'

describe('buildResendRequest', () => {
  it('builds the documented Resend payload', () => {
    const request = buildResendRequest(FROM, {
      to: 'member@example.com',
      subject: 'Bianca would like to meet you',
      text: 'Hello from Tulay.',
      idempotencyKey: 'tulay/intro/123',
    })
    expect(request.url).toBe('https://api.resend.com/emails')
    expect(request.body).toEqual({
      from: FROM,
      to: 'member@example.com',
      subject: 'Bianca would like to meet you',
      text: 'Hello from Tulay.',
    })
    expect(request.idempotencyKey).toBe('tulay/intro/123')
  })

  it('rejects invalid recipients without sending', () => {
    expect(() => buildResendRequest(FROM, { to: 'not-an-email', subject: 'Hi', text: 'x' })).toThrow()
  })
})

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('sendEmail', () => {
  it('returns the provider id on success', async () => {
    const fetchFn = vi.fn(async () => jsonResponse(200, { id: 'email-123' }))
    const id = await sendEmail('key', FROM, { to: 'member@example.com', subject: 'Hi', text: 'Hello.' }, fetchFn as unknown as typeof fetch)
    expect(id).toBe('email-123')
    const [, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit]
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer key')
  })

  it('throws ResendError without leaking the address on rejection', async () => {
    const fetchFn = vi.fn(async () => jsonResponse(403, { message: 'Forbidden' }))
    const error = await sendEmail('key', FROM, { to: 'member@example.com', subject: 'Hi', text: 'Hello.' }, fetchFn as unknown as typeof fetch).catch(
      (thrown: unknown) => thrown,
    )
    expect(error).toBeInstanceOf(ResendError)
    expect(String((error as Error).message)).toContain('HTTP 403')
    expect(String((error as Error).message)).not.toContain('member@example.com')
    expect(String((error as Error).message)).not.toContain('key')
  })

  it('throws ResendError when the key is missing', async () => {
    await expect(
      sendEmail('', FROM, { to: 'member@example.com', subject: 'Hi', text: 'Hello.' }),
    ).rejects.toThrow(ResendError)
  })
})
