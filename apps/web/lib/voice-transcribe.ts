import { DemoProvider, MetaProviderError, getAIProvider, type AIProvider } from '@tulay/ai'
import {
  VOICE_DEFAULT_LANGUAGE_BIAS,
  VOICE_MAX_AUDIO_BYTES,
  VOICE_MAX_DURATION_SEC,
  VOICE_WAV_MIME_TYPES,
  VoiceTranscriptSchema,
} from '@tulay/shared'
import { parseWavHeader } from './voice-audio'

/**
 * Server-side Voice Transcribe for Ask Arko (`POST /api/voice/transcribe`).
 *
 * The browser uploads one multipart/form-data request with `audio` (WAV —
 * converted client-side, because the Meta file endpoint reads nothing else),
 * `durationSec`, and optional `languageBias` (JSON array of language names).
 * This handler validates shape, size, and WAV format, forwards the bytes to
 * the configured `AIProvider.transcribeAudio`, re-validates the transcript
 * with `VoiceTranscriptSchema`, and returns the text for the user to review
 * and edit in the composer. It never sends a chat message: transcription
 * output only becomes input when the user explicitly presses Send.
 *
 * Safeguards (same posture as `chatWithArkoAction`): Meta credentials stay
 * server-side, audio is an in-memory buffer that is never persisted, logged,
 * or echoed in errors, and a live failure falls back to the deterministic
 * demo provider with a visible note — never a silent substitution.
 */

export type VoiceTranscribeSource = 'live' | 'demo-template'

export interface VoiceTranscribeData {
  transcript: string
  durationSec: number
  source: VoiceTranscribeSource
  note?: string
}

export type VoiceTranscribeBody =
  | { ok: true; data: VoiceTranscribeData }
  | { ok: false; error: string }

export interface VoiceTranscribeResult {
  status: number
  body: VoiceTranscribeBody
}

function fail(status: number, error: string): VoiceTranscribeResult {
  return { status, body: { ok: false, error } }
}

function logVoiceEvent(event: {
  outcome: 'rejected' | 'fallback' | 'failed'
  code: string
  status: number
  audioBytes?: number
  durationSec?: number
}): void {
  // Metadata only: sizes and codes, never transcripts, audio, or keys.
  try {
    console.warn(`[tulay-voice] ${JSON.stringify({ ...event, at: new Date().toISOString() })}`)
  } catch {
    // Logging must never break the request path.
  }
}

/**
 * Parse the optional `languageBias` field. Unknown shapes fall back to the
 * default English + Tagalog bias; `Taglish` is dropped (never a valid API
 * language — the model's code-switching covers it).
 */
function parseLanguageBias(raw: unknown): string[] {
  const fallback = [...VOICE_DEFAULT_LANGUAGE_BIAS]
  if (raw === null || raw === undefined || raw === '') return fallback
  if (typeof raw !== 'string') return fallback
  let decoded: unknown
  try {
    decoded = JSON.parse(raw)
  } catch {
    return fallback
  }
  if (!Array.isArray(decoded)) return fallback
  const cleaned = decoded
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0 && entry.length <= 32)
    .filter((entry) => entry.toLowerCase() !== 'taglish')
    .slice(0, 5)
  return cleaned.length > 0 ? cleaned : fallback
}

function providerErrorStatus(code: MetaProviderError['code']): number {
  if (code === 'timeout') return 504
  if (code === 'config') return 500
  return 502
}

function providerErrorMessage(code: MetaProviderError['code']): string {
  if (code === 'timeout') return 'Transcription timed out. Try a shorter recording.'
  if (code === 'config') return 'Transcription is not configured right now. Please try again later.'
  if (code === 'http' || code === 'network') {
    return 'The transcription service is unreachable right now. Please try again.'
  }
  return 'The transcription reply could not be read. Please try again.'
}

export async function handleVoiceTranscribe(
  formData: FormData,
  deps: { provider?: AIProvider } = {},
): Promise<VoiceTranscribeResult> {
  const audio = formData.get('audio')
  // File extends Blob, so one check covers both; strings and nulls fall out.
  if (!(audio instanceof Blob)) {
    return fail(400, 'Attach a recording first.')
  }
  const file = audio as Blob & { type?: string; size: number }
  const mimeType = typeof file.type === 'string' ? file.type : ''
  if (!(VOICE_WAV_MIME_TYPES as readonly string[]).includes(mimeType)) {
    logVoiceEvent({ outcome: 'rejected', code: 'mime', status: 415 })
    return fail(415, 'Unsupported audio type. Voice input sends 16 kHz mono WAV.')
  }
  if (file.size === 0) {
    return fail(400, 'That recording was empty. Please try again.')
  }
  if (file.size > VOICE_MAX_AUDIO_BYTES) {
    logVoiceEvent({ outcome: 'rejected', code: 'oversize', status: 413, audioBytes: file.size })
    return fail(413, 'That recording is too large. Keep it under 60 seconds.')
  }

  const durationRaw = formData.get('durationSec')
  const durationSec = typeof durationRaw === 'string' ? Number(durationRaw) : NaN
  if (!Number.isFinite(durationSec) || durationSec < 1 || durationSec > VOICE_MAX_DURATION_SEC) {
    return fail(400, `Recording length must be between 1 and ${VOICE_MAX_DURATION_SEC} seconds.`)
  }

  let bytes: Uint8Array
  try {
    bytes = new Uint8Array(await audio.arrayBuffer())
  } catch {
    return fail(400, 'Could not read that recording. Please try again.')
  }
  // The WAV header is authoritative: it proves the payload is the mono PCM
  // the endpoint requires and bounds the billable duration server-side.
  const header = parseWavHeader(bytes)
  if (!header) {
    logVoiceEvent({ outcome: 'rejected', code: 'format', status: 400, audioBytes: bytes.length })
    return fail(400, 'That file is not a valid WAV recording.')
  }
  if (header.channels !== 1 || header.bitsPerSample !== 16) {
    logVoiceEvent({ outcome: 'rejected', code: 'format', status: 400, audioBytes: bytes.length })
    return fail(400, 'WAV must be mono 16-bit PCM.')
  }
  if (header.sampleRate !== 16000 && header.sampleRate !== 24000) {
    logVoiceEvent({ outcome: 'rejected', code: 'format', status: 400, audioBytes: bytes.length })
    return fail(400, 'WAV must be 16 or 24 kHz.')
  }
  if (header.durationSec > VOICE_MAX_DURATION_SEC) {
    logVoiceEvent({
      outcome: 'rejected',
      code: 'too-long',
      status: 400,
      audioBytes: bytes.length,
      durationSec: header.durationSec,
    })
    return fail(400, `Recordings are capped at ${VOICE_MAX_DURATION_SEC} seconds.`)
  }

  const languageBias = parseLanguageBias(formData.get('languageBias'))
  const audioBase64 = Buffer.from(bytes).toString('base64')
  // Release the raw PCM as soon as the payload string exists.
  bytes = new Uint8Array(0)

  const provider = deps.provider ?? getAIProvider()
  const source: VoiceTranscribeSource = provider instanceof DemoProvider ? 'demo-template' : 'live'
  try {
    const result = await provider.transcribeAudio({
      audioBase64,
      mimeType: 'audio/wav',
      durationSec: header.durationSec,
      languageBias,
    })
    const validated = VoiceTranscriptSchema.safeParse(result)
    if (!validated.success) {
      throw new MetaProviderError('validation', 'transcribeAudio', 'transcript failed contract validation')
    }
    return {
      status: 200,
      body: {
        ok: true,
        data: { transcript: validated.data.transcript, durationSec: header.durationSec, source },
      },
    }
  } catch (error) {
    if (error instanceof MetaProviderError && !(provider instanceof DemoProvider)) {
      const unvalidated = error.code === 'validation' || error.code === 'protocol'
      logVoiceEvent({
        outcome: 'fallback',
        code: error.code,
        status: providerErrorStatus(error.code),
        audioBytes: file.size,
        durationSec: header.durationSec,
      })
      try {
        // Labelled demo fallback, mirroring Ask Arko chat: the note says
        // exactly what happened, and nothing unvalidated is kept.
        const fallback = await new DemoProvider().transcribeAudio({
          audioBase64,
          mimeType: 'audio/wav',
          durationSec: header.durationSec,
          languageBias,
        })
        return {
          status: 200,
          body: {
            ok: true,
            data: {
              transcript: fallback.transcript,
              durationSec: header.durationSec,
              source: 'demo-template',
              note: unvalidated
                ? 'The live transcript could not be validated, so this is a sample transcript instead. Review it before sending.'
                : 'The live transcription service was unreachable, so this is a sample transcript instead. Review it before sending.',
            },
          },
        }
      } catch {
        // Fall through to the mapped error below.
      }
      return fail(providerErrorStatus(error.code), providerErrorMessage(error.code))
    }
    if (error instanceof MetaProviderError) {
      logVoiceEvent({
        outcome: 'failed',
        code: error.code,
        status: providerErrorStatus(error.code),
        audioBytes: file.size,
        durationSec: header.durationSec,
      })
      return fail(providerErrorStatus(error.code), providerErrorMessage(error.code))
    }
    logVoiceEvent({ outcome: 'failed', code: 'internal', status: 500, audioBytes: file.size })
    return fail(500, 'Transcription failed. Please try again.')
  }
}
