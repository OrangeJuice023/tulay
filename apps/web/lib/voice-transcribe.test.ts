import { afterEach, describe, expect, it, vi } from 'vitest'
import { DemoProvider, MetaProviderError, type AIProvider } from '@tulay/ai'
import { VOICE_MAX_AUDIO_BYTES } from '@tulay/shared'
import { handleVoiceTranscribe } from './voice-transcribe'
import { encodeWav16Mono } from './voice-audio'

function wavBytes(durationSec: number, sampleRate = 16000): Uint8Array {
  return encodeWav16Mono(new Float32Array(durationSec * sampleRate).fill(0.2), sampleRate)
}

function wavFile(durationSec: number, mimeType = 'audio/wav', sampleRate = 16000): File {
  const bytes = wavBytes(durationSec, sampleRate)
  return new File([new Uint8Array(bytes)], 'recording.wav', { type: mimeType })
}

function voiceForm(file: File, durationSec: string | null = '5', languageBias?: string): FormData {
  const form = new FormData()
  form.append('audio', file)
  if (durationSec !== null) form.append('durationSec', durationSec)
  if (languageBias !== undefined) form.append('languageBias', languageBias)
  return form
}

function stubProvider(transcribeAudio: (input: never) => Promise<unknown>): AIProvider {
  return { transcribeAudio } as unknown as AIProvider
}

class BrokenDemo extends DemoProvider {
  constructor(private readonly failure: MetaProviderError) {
    super()
  }

  override async transcribeAudio(): Promise<never> {
    throw this.failure
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('handleVoiceTranscribe (valid)', () => {
  it('transcribes a WAV upload and returns the transcript for review', async () => {
    const transcribeAudio = vi.fn<(input: unknown) => Promise<{ transcript: string; durationSec: number }>>(
      async () => ({ transcript: 'Gusto kong maging designer', durationSec: 5 }),
    )
    const result = await handleVoiceTranscribe(voiceForm(wavFile(5)), {
      provider: stubProvider(transcribeAudio as (input: never) => Promise<unknown>),
    })
    expect(result.status).toBe(200)
    expect(result.body).toEqual({
      ok: true,
      data: {
        transcript: 'Gusto kong maging designer',
        durationSec: 5,
        source: 'live',
      },
    })
    expect(transcribeAudio).toHaveBeenCalledTimes(1)
    const sent = transcribeAudio.mock.calls[0]?.[0] as Record<string, unknown>
    expect(sent.mimeType).toBe('audio/wav')
    expect(sent.durationSec).toBe(5)
    expect(sent.languageBias).toEqual(['English', 'Tagalog'])
    // The payload round-trips the uploaded bytes.
    const decoded = Buffer.from(sent.audioBase64 as string, 'base64')
    expect(decoded.equals(Buffer.from(wavBytes(5)))).toBe(true)
  })

  it('accepts every WAV mime spelling the encoders emit', async () => {
    for (const mimeType of ['audio/wav', 'audio/x-wav', 'audio/wave']) {
      const transcribeAudio = vi.fn(async () => ({ transcript: 'hi', durationSec: 5 }))
      const result = await handleVoiceTranscribe(voiceForm(wavFile(5, mimeType)), {
        provider: stubProvider(transcribeAudio as (input: never) => Promise<unknown>),
      })
      expect(result.status).toBe(200)
    }
  })

  it('reports demo-template source with no note for the demo provider', async () => {
    const result = await handleVoiceTranscribe(voiceForm(wavFile(3)), { provider: new DemoProvider() })
    expect(result.status).toBe(200)
    expect(result.body).toEqual({
      ok: true,
      data: {
        transcript:
          'Demo transcript — replace this with what you said, or connect a model key for live transcription.',
        durationSec: 3,
        source: 'demo-template',
      },
    })
  })

  it('uses the WAV header duration as authoritative', async () => {
    // Client claims 5 s; the header proves 8 s. The header wins.
    const transcribeAudio = vi.fn(async (input: { durationSec: number }) => ({
      transcript: 'longer than claimed',
      durationSec: input.durationSec,
    }))
    const result = await handleVoiceTranscribe(voiceForm(wavFile(8), '5'), {
      provider: stubProvider(transcribeAudio as unknown as (input: never) => Promise<unknown>),
    })
    expect(result.status).toBe(200)
    if (!result.body.ok) return
    expect(result.body.data.durationSec).toBe(8)
  })

  it('passes language bias through and never sends Taglish', async () => {
    const transcribeAudio = vi.fn<(input: unknown) => Promise<{ transcript: string; durationSec: number }>>(
      async () => ({ transcript: 'hi', durationSec: 5 }),
    )
    const provider = stubProvider(transcribeAudio as (input: never) => Promise<unknown>)
    await handleVoiceTranscribe(
      voiceForm(wavFile(5), '5', JSON.stringify(['English', 'Tagalog', 'Taglish'])),
      { provider },
    )
    expect((transcribeAudio.mock.calls[0]?.[0] as { languageBias: string[] }).languageBias).toEqual([
      'English',
      'Tagalog',
    ])
    transcribeAudio.mockClear()
    await handleVoiceTranscribe(voiceForm(wavFile(5), '5', 'not-json'), { provider })
    expect((transcribeAudio.mock.calls[0]?.[0] as { languageBias: string[] }).languageBias).toEqual([
      'English',
      'Tagalog',
    ])
  })
})

describe('handleVoiceTranscribe (rejected uploads)', () => {
  it('requires an audio file', async () => {
    const empty = new FormData()
    empty.append('durationSec', '5')
    const transcribeAudio = vi.fn()
    expect(
      (await handleVoiceTranscribe(empty, { provider: stubProvider(transcribeAudio) })).status,
    ).toBe(400)
    const text = new FormData()
    text.append('audio', 'not-a-file')
    text.append('durationSec', '5')
    expect(
      (await handleVoiceTranscribe(text, { provider: stubProvider(transcribeAudio) })).status,
    ).toBe(400)
    expect(transcribeAudio).not.toHaveBeenCalled()
  })

  it('rejects container types the endpoint cannot read', async () => {
    // Includes the empty MIME string some recorders emit.
    for (const mimeType of ['audio/webm', 'audio/mp4', 'audio/mpeg', '']) {
      const transcribeAudio = vi.fn()
      const result = await handleVoiceTranscribe(voiceForm(wavFile(2, mimeType)), {
        provider: stubProvider(transcribeAudio),
      })
      expect(result.status).toBe(415)
      expect(result.body).toEqual({
        ok: false,
        error: 'Unsupported audio type. Voice input sends 16 kHz mono WAV.',
      })
      expect(transcribeAudio).not.toHaveBeenCalled()
    }
  })

  it('rejects oversized files before touching the provider', async () => {
    const big = new File([new Uint8Array(VOICE_MAX_AUDIO_BYTES + 1)], 'big.wav', { type: 'audio/wav' })
    const transcribeAudio = vi.fn()
    const result = await handleVoiceTranscribe(voiceForm(big, '60'), {
      provider: stubProvider(transcribeAudio),
    })
    expect(result.status).toBe(413)
    expect(result.body).toEqual({ ok: false, error: 'That recording is too large. Keep it under 60 seconds.' })
    expect(transcribeAudio).not.toHaveBeenCalled()
  })

  it('rejects missing, non-numeric, and out-of-range durations', async () => {
    const transcribeAudio = vi.fn()
    const provider = stubProvider(transcribeAudio)
    for (const durationSec of [null, '', 'abc', '0', '61']) {
      const result = await handleVoiceTranscribe(voiceForm(wavFile(2), durationSec), { provider })
      expect(result.status).toBe(400)
    }
    expect(transcribeAudio).not.toHaveBeenCalled()
  })

  it('rejects bytes that are not WAV', async () => {
    const fake = new File([new TextEncoder().encode('OggS-not-a-wav'.padEnd(64, '.'))], 'f.wav', {
      type: 'audio/wav',
    })
    const transcribeAudio = vi.fn()
    const result = await handleVoiceTranscribe(voiceForm(fake, '5'), {
      provider: stubProvider(transcribeAudio),
    })
    expect(result.status).toBe(400)
    expect(transcribeAudio).not.toHaveBeenCalled()
  })

  it('rejects WAV that is not mono 16-bit PCM at 16 or 24 kHz', async () => {
    const transcribeAudio = vi.fn()
    const provider = stubProvider(transcribeAudio)
    const stereo = wavBytes(2)
    new DataView(stereo.buffer).setUint16(22, 2, true)
    const stereoFile = new File([new Uint8Array(stereo)], 's.wav', { type: 'audio/wav' })
    expect((await handleVoiceTranscribe(voiceForm(stereoFile, '5'), { provider })).body).toEqual({
      ok: false,
      error: 'WAV must be mono 16-bit PCM.',
    })
    const lowRate = await handleVoiceTranscribe(voiceForm(wavFile(2, 'audio/wav', 8000), '5'), {
      provider,
    })
    expect(lowRate.body).toEqual({ ok: false, error: 'WAV must be 16 or 24 kHz.' })
    expect(transcribeAudio).not.toHaveBeenCalled()
  })

  it('accepts 24 kHz WAV and caps header duration at 60 s', async () => {
    const transcribeAudio = vi.fn(async () => ({ transcript: 'ok', durationSec: 2 }))
    const ok = await handleVoiceTranscribe(voiceForm(wavFile(2, 'audio/wav', 24000), '5'), {
      provider: stubProvider(transcribeAudio as (input: never) => Promise<unknown>),
    })
    expect(ok.status).toBe(200)

    const tooLong = await handleVoiceTranscribe(voiceForm(wavFile(61), '60'), {
      provider: stubProvider(transcribeAudio as (input: never) => Promise<unknown>),
    })
    expect(tooLong.status).toBe(400)
    expect(tooLong.body).toEqual({ ok: false, error: 'Recordings are capped at 60 seconds.' })
  })
})

describe('handleVoiceTranscribe (demo fallback)', () => {
  it('falls back to a labelled demo transcript when live fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const failing = stubProvider(async () => {
        throw new MetaProviderError('network', 'transcribeAudio', 'boom')
      })
      const result = await handleVoiceTranscribe(voiceForm(wavFile(4)), { provider: failing })
      expect(result.status).toBe(200)
      expect(result.body.ok).toBe(true)
      if (!result.body.ok) return
      expect(result.body.data.source).toBe('demo-template')
      expect(result.body.data.transcript).toContain('Demo transcript')
      expect(result.body.data.note).toContain('unreachable')
      expect(result.body.data.durationSec).toBe(4)
    } finally {
      warn.mockRestore()
    }
  })

  it('falls back with a validation note when the live transcript is malformed', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      // Empty-after-trim transcript fails VoiceTranscriptSchema.
      const malformed = stubProvider(async () => ({ transcript: '   ', durationSec: 4 }))
      const result = await handleVoiceTranscribe(voiceForm(wavFile(4)), { provider: malformed })
      expect(result.status).toBe(200)
      if (!result.body.ok) return
      expect(result.body.data.source).toBe('demo-template')
      expect(result.body.data.note).toContain('could not be validated')
    } finally {
      warn.mockRestore()
    }
  })
})

describe('handleVoiceTranscribe (error mapping)', () => {
  it('maps timeouts to 504', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const result = await handleVoiceTranscribe(voiceForm(wavFile(2)), {
        provider: new BrokenDemo(new MetaProviderError('timeout', 'transcribeAudio', 'slow')),
      })
      expect(result.status).toBe(504)
      expect(result.body).toEqual({ ok: false, error: 'Transcription timed out. Try a shorter recording.' })
    } finally {
      warn.mockRestore()
    }
  })

  it('maps transport failures to 502 without echoing provider detail', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      for (const code of ['http', 'network'] as const) {
        const result = await handleVoiceTranscribe(voiceForm(wavFile(2)), {
          provider: new BrokenDemo(
            new MetaProviderError(code, 'transcribeAudio', 'SECRET-UPSTREAM-BODY', 500),
          ),
        })
        expect(result.status).toBe(502)
        expect(result.body).toEqual({
          ok: false,
          error: 'The transcription service is unreachable right now. Please try again.',
        })
        expect(JSON.stringify(result.body)).not.toContain('SECRET-UPSTREAM-BODY')
      }
    } finally {
      warn.mockRestore()
    }
  })

  it('maps unreadable replies to 502 and config failures to 500', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      for (const code of ['protocol', 'validation'] as const) {
        const result = await handleVoiceTranscribe(voiceForm(wavFile(2)), {
          provider: new BrokenDemo(new MetaProviderError(code, 'transcribeAudio', 'bad shape')),
        })
        expect(result.status).toBe(502)
      }
      const config = await handleVoiceTranscribe(voiceForm(wavFile(2)), {
        provider: new BrokenDemo(new MetaProviderError('config', 'transcribeAudio', 'no key')),
      })
      expect(config.status).toBe(500)
    } finally {
      warn.mockRestore()
    }
  })

  it('logs failures as metadata only', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const failing = stubProvider(async () => {
        throw new MetaProviderError('network', 'transcribeAudio', 'boom')
      })
      await handleVoiceTranscribe(voiceForm(wavFile(4)), { provider: failing })
      const logged = warn.mock.calls.map((call) => String(call[0])).join('\n')
      expect(logged).toContain('[tulay-voice]')
      expect(logged).toContain('"outcome":"fallback"')
      expect(logged).toContain('"code":"network"')
      // No transcript text, no audio payload, no key material.
      expect(logged).not.toContain('Demo transcript')
      expect(logged).not.toContain('MODEL_API_KEY')
    } finally {
      warn.mockRestore()
    }
  })
})

describe('handleVoiceTranscribe (review before send)', () => {
  it('never sends a chat message and returns transcript fields only', async () => {
    const chat = vi.fn(async () => {
      throw new Error('must not be called')
    })
    const provider = { transcribeAudio: async () => ({ transcript: 'Find me a mentor', durationSec: 3 }), chat }
    const result = await handleVoiceTranscribe(voiceForm(wavFile(3)), {
      provider: provider as unknown as AIProvider,
    })
    expect(result.status).toBe(200)
    expect(chat).not.toHaveBeenCalled()
    expect(result.body).toEqual({
      ok: true,
      data: { transcript: 'Find me a mentor', durationSec: 3, source: 'live' },
    })
    // No chat-reply shape leaks into the response: the text only becomes a
    // message when the user explicitly presses Send in the composer.
    expect(JSON.stringify(result.body)).not.toContain('reply')
    expect(JSON.stringify(result.body)).not.toContain('intent')
  })
})
