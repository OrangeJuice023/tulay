import { NextResponse } from 'next/server'
import { handleVoiceTranscribe } from '@/lib/voice-transcribe'

/**
 * `POST /api/voice/transcribe` — Voice Transcribe for Ask Arko.
 *
 * Accepts one multipart/form-data request (`audio`, `durationSec`, optional
 * `languageBias`) and returns the transcript text for review in the
 * composer. All validation, provider selection, and error mapping live in
 * `@/lib/voice-transcribe` so the logic is unit-testable without Next.js.
 * Credentials never leave the server; audio is never persisted or logged.
 */
export async function POST(request: Request) {
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Send the recording as multipart/form-data.' },
      { status: 400 },
    )
  }
  const result = await handleVoiceTranscribe(formData)
  return NextResponse.json(result.body, { status: result.status })
}

export async function GET() {
  return NextResponse.json(
    { ok: false, error: 'Use POST with multipart/form-data.' },
    { status: 405 },
  )
}
