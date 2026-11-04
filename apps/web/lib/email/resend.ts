import { z } from 'zod'

/**
 * Minimal Resend client for transactional mail (server-only).
 *
 * Wire details verified against the official Resend API reference
 * (`resend.com/docs/api-reference/emails/send-email`, fetched 2026-11-04):
 * POST `https://api.resend.com/emails`, `Authorization: Bearer <key>`,
 * JSON body with `from` / `to` / `subject` / `html` / `text`, optional
 * `Idempotency-Key` header (24h window), success shape `{ id }`. Error
 * bodies are treated as opaque text: no shape is assumed.
 *
 * Safety rules mirror the Meta provider: the key never appears in errors or
 * logs, recipient addresses never appear in errors or logs, each request has
 * a timeout, and nothing is retried (credit safety). Never call this for
 * demo members: callers must check `isDemo` / real-profile ownership first.
 */

export const RESEND_API_URL = 'https://api.resend.com/emails'
export const RESEND_TIMEOUT_MS = 15_000

export const SendEmailInputSchema = z.object({
  to: z.string().trim().email('Recipient must be a valid email address.').max(320),
  subject: z.string().trim().min(1).max(200),
  text: z.string().trim().min(1).max(20_000),
  html: z.string().trim().max(100_000).optional(),
  idempotencyKey: z.string().trim().min(1).max(256).optional(),
})
export type SendEmailInput = z.infer<typeof SendEmailInputSchema>

export type SendEmailResult = { sent: true; id: string } | { sent: false; reason: string }

export class ResendError extends Error {
  readonly status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ResendError'
    this.status = status
  }
}

export function buildResendRequest(from: string, input: SendEmailInput): { url: string; body: Record<string, unknown>; idempotencyKey?: string } {
  const valid = SendEmailInputSchema.parse(input)
  return {
    url: RESEND_API_URL,
    body: {
      from,
      to: valid.to,
      subject: valid.subject,
      text: valid.text,
      ...(valid.html ? { html: valid.html } : {}),
    },
    idempotencyKey: valid.idempotencyKey,
  }
}

/** Send one transactional email. Throws ResendError (no secrets, no addresses). */
export async function sendEmail(
  apiKey: string,
  from: string,
  input: SendEmailInput,
  fetchFn: typeof fetch = globalThis.fetch,
): Promise<string> {
  if (!apiKey) throw new ResendError('Missing Resend API key.')
  const { url, body, idempotencyKey } = buildResendRequest(from, input)
  let response: Response
  try {
    response = await fetchFn(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
    })
  } catch (error) {
    const name = error && typeof error === 'object' && 'name' in error ? String(error.name) : ''
    if (name === 'TimeoutError' || name === 'AbortError') {
      throw new ResendError(`Email request exceeded ${RESEND_TIMEOUT_MS}ms.`)
    }
    throw new ResendError('Email request failed before a response arrived.')
  }

  if (!response.ok) {
    let excerpt = response.statusText
    try {
      excerpt = (await response.text()).slice(0, 200) || response.statusText
    } catch {
      excerpt = response.statusText
    }
    // Never echo the body: it could contain the recipient address.
    throw new ResendError(`Resend rejected the email (HTTP ${response.status}): ${excerpt}`.slice(0, 300), response.status)
  }

  let data: unknown
  try {
    data = await response.json()
  } catch {
    throw new ResendError('Resend response body was not JSON.')
  }
  const id = typeof data === 'object' && data !== null && 'id' in data ? String((data as { id: unknown }).id) : ''
  if (!id) throw new ResendError('Resend response had no email id.')
  return id
}
