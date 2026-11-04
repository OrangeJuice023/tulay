import { describe, expect, it } from 'vitest'
import {
  TranscribeVoiceInputSchema,
  VOICE_DEFAULT_LANGUAGE_BIAS,
  VOICE_MAX_AUDIO_BYTES,
  VoiceTranscriptSchema,
} from './voice'

function validInput(): Record<string, unknown> {
  return {
    audioBase64: Buffer.from('RIFFfake-wav-bytes').toString('base64'),
    mimeType: 'audio/wav',
    durationSec: 12,
  }
}

describe('TranscribeVoiceInputSchema', () => {
  it('defaults language bias to English + Tagalog, never Taglish', () => {
    const parsed = TranscribeVoiceInputSchema.parse(validInput())
    expect(parsed.languageBias).toEqual(['English', 'Tagalog'])
    expect(VOICE_DEFAULT_LANGUAGE_BIAS).not.toContain('Taglish')
  })

  it('accepts every WAV mime spelling the encoders emit', () => {
    for (const mimeType of ['audio/wav', 'audio/x-wav', 'audio/wave']) {
      expect(TranscribeVoiceInputSchema.safeParse({ ...validInput(), mimeType }).success).toBe(true)
    }
  })

  it('rejects browser container types the endpoint cannot read', () => {
    for (const mimeType of ['audio/webm', 'audio/mp4', 'audio/mpeg', '']) {
      expect(TranscribeVoiceInputSchema.safeParse({ ...validInput(), mimeType }).success).toBe(false)
    }
  })

  it('rejects empty audio, overlong utterances, and oversized payloads', () => {
    expect(TranscribeVoiceInputSchema.safeParse({ ...validInput(), audioBase64: '' }).success).toBe(false)
    expect(TranscribeVoiceInputSchema.safeParse({ ...validInput(), durationSec: 0 }).success).toBe(false)
    expect(TranscribeVoiceInputSchema.safeParse({ ...validInput(), durationSec: 60 }).success).toBe(true)
    expect(TranscribeVoiceInputSchema.safeParse({ ...validInput(), durationSec: 61 }).success).toBe(false)
    expect(
      TranscribeVoiceInputSchema.safeParse({
        ...validInput(),
        audioBase64: 'a'.repeat(Math.ceil(VOICE_MAX_AUDIO_BYTES * 1.5)),
      }).success,
    ).toBe(false)
  })
})

describe('VoiceTranscriptSchema', () => {
  it('requires a non-empty transcript that fits the composer', () => {
    expect(VoiceTranscriptSchema.safeParse({ transcript: '  ' }).success).toBe(false)
    expect(VoiceTranscriptSchema.safeParse({ transcript: 'x'.repeat(2001) }).success).toBe(false)
    const parsed = VoiceTranscriptSchema.safeParse({ transcript: 'Gusto kong maging designer', language: 'Tagalog' })
    expect(parsed.success).toBe(true)
  })
})
