import { z } from 'zod'

/**
 * Voice transcription contracts (push-to-talk goal capture into Ask Arko).
 * Audio bytes cross the server only as an opaque base64 payload; nothing in
 * this package persists, logs, or replays audio. Endpoint, auth, model ID and
 * language biasing follow Kilo's brief
 * (`research/findings/meta-voice-and-image-api-brief.md`).
 */

/** Verified model ID for the file transcription endpoint. */
export const VOICE_TRANSCRIBE_MODEL = 'muse-voice-transcribe-1.0'

/**
 * Language bias as language names. Taglish is covered by the model's
 * code-switching — it is NOT a separate API language and must never be sent.
 */
export const VOICE_DEFAULT_LANGUAGE_BIAS: readonly [string, string] = ['English', 'Tagalog']

/** Goal-length utterances only (60 s MVP cap); the recorder auto-stops here. */
export const VOICE_MAX_DURATION_SEC = 60

/**
 * 60 s of mono 16-bit PCM at 16 kHz (1,920,000 bytes) plus the WAV header,
 * with headroom. The route handler rejects anything larger before calling
 * the provider.
 */
export const VOICE_MAX_AUDIO_BYTES = 2_000_000

/** The only container the file endpoint accepts. */
export const VOICE_WAV_MIME_TYPES = ['audio/wav', 'audio/x-wav', 'audio/wave'] as const
export type VoiceWavMimeType = (typeof VOICE_WAV_MIME_TYPES)[number]

/** Base64 ceiling matching VOICE_MAX_AUDIO_BYTES (4/3 expansion + padding). */
const MAX_BASE64_CHARS = 2_700_000

export const VoiceTranscriptSchema = z.object({
  transcript: z.string().trim().min(1).max(2000),
  language: z.string().trim().max(32).optional(),
  durationSec: z.number().min(0).max(VOICE_MAX_DURATION_SEC).optional(),
})
export type VoiceTranscript = z.infer<typeof VoiceTranscriptSchema>

export const TranscribeVoiceInputSchema = z.object({
  audioBase64: z.string().min(1).max(MAX_BASE64_CHARS),
  mimeType: z.enum(VOICE_WAV_MIME_TYPES),
  durationSec: z.number().min(1).max(VOICE_MAX_DURATION_SEC),
  languageBias: z.array(z.string().trim().min(1).max(32)).max(5).default([...VOICE_DEFAULT_LANGUAGE_BIAS]),
})
export type TranscribeVoiceInput = z.infer<typeof TranscribeVoiceInputSchema>
export type TranscribeVoiceInputInput = z.input<typeof TranscribeVoiceInputSchema>
