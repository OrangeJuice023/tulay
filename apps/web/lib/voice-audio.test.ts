import { describe, expect, it } from 'vitest'
import {
  VoiceAudioError,
  blobToWav16kMono,
  convertDecodedToWav,
  encodeWav16Mono,
  mixToMono,
  parseWavHeader,
  resampleTo16k,
} from './voice-audio'

function sineWave(seconds: number, sampleRate: number): Float32Array {
  const samples = new Float32Array(seconds * sampleRate)
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = Math.sin((index / sampleRate) * 440 * 2 * Math.PI) * 0.5
  }
  return samples
}

describe('encodeWav16Mono', () => {
  it('writes a mono 16-bit PCM header the endpoint accepts', () => {
    const bytes = encodeWav16Mono(sineWave(1, 16000), 16000)
    expect(bytes.length).toBe(44 + 16000 * 2)
    const view = new DataView(bytes.buffer)
    const ascii = (offset: number, length: number): string =>
      String.fromCharCode(...bytes.slice(offset, offset + length))
    expect(ascii(0, 4)).toBe('RIFF')
    expect(ascii(8, 4)).toBe('WAVE')
    expect(ascii(12, 4)).toBe('fmt ')
    expect(view.getUint16(20, true)).toBe(1) // PCM
    expect(view.getUint16(22, true)).toBe(1) // mono
    expect(view.getUint32(24, true)).toBe(16000)
    expect(view.getUint16(34, true)).toBe(16) // bits per sample
    expect(ascii(36, 4)).toBe('data')
    expect(view.getUint32(40, true)).toBe(16000 * 2)
  })

  it('clamps out-of-range samples instead of wrapping', () => {
    const bytes = encodeWav16Mono(new Float32Array([-2, -1, 0, 0.5, 1, 2]), 16000)
    const view = new DataView(bytes.buffer)
    const values = [0, 1, 2, 3, 4, 5].map((index) => view.getInt16(44 + index * 2, true))
    expect(values).toEqual([-32767, -32767, 0, 16384, 32767, 32767])
  })
})

describe('mixToMono', () => {
  it('averages channels and copies single-channel input', () => {
    expect(mixToMono([]).length).toBe(0)
    const single = new Float32Array([0.1, 0.2])
    const copied = mixToMono([single])
    expect(copied).toEqual(single)
    expect(copied).not.toBe(single)
    expect(mixToMono([new Float32Array([1, 0]), new Float32Array([0, 1])])).toEqual(
      new Float32Array([0.5, 0.5]),
    )
  })
})

describe('resampleTo16k', () => {
  it('downsamples 48 kHz and upsamples 8 kHz to 16 kHz', () => {
    expect(resampleTo16k(sineWave(1, 48000), 48000).length).toBe(16000)
    expect(resampleTo16k(sineWave(1, 8000), 8000).length).toBe(16000)
  })

  it('copies 16 kHz input and rejects unknown rates', () => {
    const samples = sineWave(1, 16000)
    const copied = resampleTo16k(samples, 16000)
    expect(copied).toEqual(samples)
    expect(copied).not.toBe(samples)
    expect(resampleTo16k(new Float32Array(0), 48000).length).toBe(0)
    expect(() => resampleTo16k(samples, 0)).toThrowError(VoiceAudioError)
  })
})

describe('convertDecodedToWav', () => {
  it('converts stereo 48 kHz decode output to mono 16 kHz WAV', () => {
    const left = sineWave(2, 48000)
    const { bytes, durationSec } = convertDecodedToWav([left, new Float32Array(left)], 48000)
    expect(durationSec).toBe(2)
    expect(bytes.length).toBe(44 + 2 * 16000 * 2)
    expect(parseWavHeader(bytes)).toMatchObject({ sampleRate: 16000, channels: 1, bitsPerSample: 16 })
  })

  it('truncates overlong recordings to the MVP cap', () => {
    const { bytes, durationSec } = convertDecodedToWav([new Float32Array(70 * 16000).fill(0.1)], 16000)
    expect(durationSec).toBe(60)
    expect(bytes.length).toBe(44 + 60 * 16000 * 2)
  })

  it('rejects empty decode output', () => {
    expect(() => convertDecodedToWav([], 48000)).toThrowError(VoiceAudioError)
    expect(() => convertDecodedToWav([new Float32Array(0)], 48000)).toThrowError(VoiceAudioError)
  })
})

describe('parseWavHeader', () => {
  it('round-trips encoder output with authoritative duration', () => {
    const header = parseWavHeader(encodeWav16Mono(sineWave(3, 16000), 16000))
    expect(header).toMatchObject({
      sampleRate: 16000,
      channels: 1,
      bitsPerSample: 16,
      dataBytes: 3 * 16000 * 2,
      durationSec: 3,
    })
  })

  it('rounds fractional durations up', () => {
    // 1.5 s of PCM: the billable duration is 2 s.
    const header = parseWavHeader(encodeWav16Mono(new Float32Array(24000).fill(0.1), 16000))
    expect(header?.durationSec).toBe(2)
  })

  it('rejects non-WAV and truncated input', () => {
    expect(parseWavHeader(new Uint8Array(0))).toBeNull()
    expect(parseWavHeader(new TextEncoder().encode('RIFFxxxxWAVE'))).toBeNull()
    const ogg = new Uint8Array(64).fill(0)
    ogg.set(new TextEncoder().encode('OggS'), 0)
    expect(parseWavHeader(ogg)).toBeNull()
  })

  it('reads format fields the server enforces', () => {
    const stereo = encodeWav16Mono(new Float32Array(16000).fill(0.1), 16000)
    new DataView(stereo.buffer).setUint16(22, 2, true) // channels: stereo
    expect(parseWavHeader(stereo)?.channels).toBe(2)
    const lowRate = encodeWav16Mono(new Float32Array(8000).fill(0.1), 8000)
    expect(parseWavHeader(lowRate)?.sampleRate).toBe(8000)
  })

  it('skips extra chunks before the data chunk', () => {
    const clean = encodeWav16Mono(sineWave(1, 16000), 16000)
    const junk = new Uint8Array([0x4a, 0x55, 0x4e, 0x4b, 4, 0, 0, 0, 0, 0, 0, 0]) // JUNK + 4 bytes
    const withJunk = new Uint8Array(clean.length + junk.length)
    withJunk.set(clean.slice(0, 12), 0)
    withJunk.set(junk, 12)
    withJunk.set(clean.slice(12), 12 + junk.length)
    expect(parseWavHeader(withJunk)).toMatchObject({ sampleRate: 16000, durationSec: 1 })
  })
})

describe('blobToWav16kMono', () => {
  it('refuses to run outside a browser', async () => {
    await expect(blobToWav16kMono(new Blob(['x']))).rejects.toThrowError(VoiceAudioError)
    await expect(blobToWav16kMono(new Blob(['x']))).rejects.toMatchObject({ code: 'unsupported' })
  })
})
