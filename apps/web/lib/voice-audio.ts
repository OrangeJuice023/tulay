import { VOICE_MAX_DURATION_SEC } from '@tulay/shared'

/**
 * Browser audio → WAV conversion for Voice Transcribe.
 *
 * The Meta file endpoint accepts only WAV (RIFF/WAVE), mono, 16-bit integer
 * PCM at 16 or 24 kHz, while `MediaRecorder` emits container types the
 * endpoint cannot read (webm/opus, mp4/aac). This module decodes the
 * recording in the browser and re-encodes it as 16 kHz mono 16-bit PCM WAV,
 * so the server only ever forwards spec-shaped audio.
 *
 * Privacy: conversion runs in memory in the browser. Nothing here writes to
 * localStorage, Supabase, or chat history; callers must drop the returned
 * bytes after the transcription round-trip.
 */

/** Target sample rate: the endpoint's native 16 kHz file rate. */
export const VOICE_WAV_SAMPLE_RATE = 16000

export class VoiceAudioError extends Error {
  readonly code: 'unsupported' | 'decode' | 'empty' | 'too-long'

  constructor(code: VoiceAudioError['code'], message: string) {
    super(message)
    this.name = 'VoiceAudioError'
    this.code = code
  }
}

/**
 * Average multi-channel samples down to mono. Pure. Returns a copy even for
 * a single channel so callers can always mutate the result.
 */
export function mixToMono(channels: Float32Array[]): Float32Array {
  if (channels.length === 0) return new Float32Array(0)
  const first = channels[0]
  if (!first) return new Float32Array(0)
  if (channels.length === 1) return new Float32Array(first)
  const length = Math.min(...channels.map((channel) => channel.length))
  const mono = new Float32Array(length)
  for (let index = 0; index < length; index += 1) {
    let sum = 0
    for (const channel of channels) sum += channel[index] ?? 0
    mono[index] = sum / channels.length
  }
  return mono
}

/**
 * Linear-interpolation resample of mono samples to 16 kHz. Pure. Adequate
 * for speech transcription; keeps the pipeline dependency-free.
 */
export function resampleTo16k(samples: Float32Array, fromRate: number): Float32Array {
  if (!Number.isFinite(fromRate) || fromRate <= 0) {
    throw new VoiceAudioError('decode', 'Cannot resample audio with an unknown sample rate.')
  }
  if (samples.length === 0) return new Float32Array(0)
  if (fromRate === VOICE_WAV_SAMPLE_RATE) return new Float32Array(samples)
  const targetLength = Math.max(1, Math.round((samples.length * VOICE_WAV_SAMPLE_RATE) / fromRate))
  const out = new Float32Array(targetLength)
  const ratio = samples.length / targetLength
  for (let index = 0; index < targetLength; index += 1) {
    const position = index * ratio
    const low = Math.floor(position)
    const high = Math.min(low + 1, samples.length - 1)
    const fraction = position - low
    out[index] = (samples[low] ?? 0) * (1 - fraction) + (samples[high] ?? 0) * fraction
  }
  return out
}

/**
 * Encode mono float samples (-1..1) at `sampleRate` as 16-bit PCM WAV bytes.
 * Pure. Out-of-range samples are clamped, never wrapped.
 */
export function encodeWav16Mono(samples: Float32Array, sampleRate: number): Uint8Array {
  const dataBytes = samples.length * 2
  const buffer = new ArrayBuffer(44 + dataBytes)
  const view = new DataView(buffer)
  const writeAscii = (offset: number, text: string): void => {
    for (let index = 0; index < text.length; index += 1) {
      view.setUint8(offset + index, text.charCodeAt(index))
    }
  }
  writeAscii(0, 'RIFF')
  view.setUint32(4, 36 + dataBytes, true)
  writeAscii(8, 'WAVE')
  writeAscii(12, 'fmt ')
  view.setUint32(16, 16, true) // PCM chunk size
  view.setUint16(20, 1, true) // audio format: PCM
  view.setUint16(22, 1, true) // channels: mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true) // byte rate
  view.setUint16(32, 2, true) // block align
  view.setUint16(34, 16, true) // bits per sample
  writeAscii(36, 'data')
  view.setUint32(40, dataBytes, true)
  for (let index = 0; index < samples.length; index += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[index] ?? 0))
    view.setInt16(44 + index * 2, Math.round(clamped * 32767), true)
  }
  return new Uint8Array(buffer)
}

/**
 * Mix, resample, truncate to the MVP cap, and encode decoded audio as WAV.
 * Pure: takes the channel data `decodeAudioData` produced. Returns the WAV
 * bytes and the authoritative duration (rounded up, minimum 1 s).
 */
export function convertDecodedToWav(
  channelData: Float32Array[],
  fromRate: number,
  maxSec: number = VOICE_MAX_DURATION_SEC,
): { bytes: Uint8Array; durationSec: number } {
  const mono = mixToMono(channelData)
  if (mono.length === 0) {
    throw new VoiceAudioError('empty', 'The recording was empty — try speaking closer to the microphone.')
  }
  const resampled = resampleTo16k(mono, fromRate)
  const capped = resampled.slice(0, maxSec * VOICE_WAV_SAMPLE_RATE)
  if (capped.length === 0) {
    throw new VoiceAudioError('empty', 'The recording was empty — try speaking closer to the microphone.')
  }
  return {
    bytes: encodeWav16Mono(capped, VOICE_WAV_SAMPLE_RATE),
    durationSec: Math.max(1, Math.ceil(capped.length / VOICE_WAV_SAMPLE_RATE)),
  }
}

export interface ParsedWavHeader {
  sampleRate: number
  channels: number
  bitsPerSample: number
  dataBytes: number
  /** Whole seconds, rounded up. */
  durationSec: number
}

/**
 * Validate a WAV header and read its format. Pure. Returns null for anything
 * that is not RIFF/WAVE with a PCM fmt chunk, so the server can reject
 * non-conforming uploads before they reach the paid endpoint. Handles the
 * standard 44-byte header plus extra chunks (fmt extensions, fact, LIST).
 */
export function parseWavHeader(bytes: Uint8Array): ParsedWavHeader | null {
  if (bytes.length < 44) return null
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const ascii = (offset: number, length: number): string => {
    let text = ''
    for (let index = 0; index < length; index += 1) {
      text += String.fromCharCode(view.getUint8(offset + index))
    }
    return text
  }
  if (ascii(0, 4) !== 'RIFF' || ascii(8, 4) !== 'WAVE') return null

  let offset = 12
  let sampleRate = 0
  let channels = 0
  let bitsPerSample = 0
  let dataBytes = -1
  let audioFormat = 0
  while (offset + 8 <= bytes.length) {
    const chunkId = ascii(offset, 4)
    const chunkSize = view.getUint32(offset + 4, true)
    if (chunkId === 'fmt ') {
      if (chunkSize < 16 || offset + 8 + chunkSize > bytes.length) return null
      audioFormat = view.getUint16(offset + 8, true)
      channels = view.getUint16(offset + 10, true)
      sampleRate = view.getUint32(offset + 12, true)
      bitsPerSample = view.getUint16(offset + 22, true)
    } else if (chunkId === 'data') {
      dataBytes = chunkSize
      break
    }
    offset += 8 + chunkSize + (chunkSize % 2)
  }
  if (audioFormat !== 1 || dataBytes < 0 || sampleRate <= 0) return null
  const bytesPerSecond = (sampleRate * channels * bitsPerSample) / 8
  if (!Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) return null
  return {
    sampleRate,
    channels,
    bitsPerSample,
    dataBytes,
    durationSec: Math.max(1, Math.ceil(dataBytes / bytesPerSecond)),
  }
}

/**
 * Decode a `MediaRecorder` blob and convert it to 16 kHz mono 16-bit PCM
 * WAV. Browser only (`AudioContext.decodeAudioData`). Throws
 * `VoiceAudioError` with a user-safe message on every failure; never throws
 * the raw DOM exception (its text can name devices or codecs).
 */
export async function blobToWav16kMono(blob: Blob): Promise<{ wav: Blob; durationSec: number }> {
  if (typeof window === 'undefined' || typeof window.AudioContext === 'undefined') {
    throw new VoiceAudioError('unsupported', 'Voice input needs a browser that can decode audio.')
  }
  let raw: ArrayBuffer
  try {
    raw = await blob.arrayBuffer()
  } catch {
    throw new VoiceAudioError('decode', 'Could not read that recording. Please try again.')
  }
  if (raw.byteLength === 0) {
    throw new VoiceAudioError('empty', 'The recording was empty — try again and speak for a second or two.')
  }
  const context = new window.AudioContext()
  try {
    let decoded: AudioBuffer
    try {
      // decodeAudioData detaches `raw`; copy first so a retry stays possible.
      decoded = await context.decodeAudioData(raw.slice(0))
    } catch {
      throw new VoiceAudioError(
        'decode',
        'That recording could not be decoded on this device. Typing still works.',
      )
    }
    const channels: Float32Array[] = []
    for (let index = 0; index < decoded.numberOfChannels; index += 1) {
      channels.push(decoded.getChannelData(index))
    }
    const { bytes, durationSec } = convertDecodedToWav(channels, decoded.sampleRate)
    // Copy out of the WAV ArrayBuffer so the large decoded buffers can be GC'd.
    const wav = new Blob([new Uint8Array(bytes)], { type: 'audio/wav' })
    return { wav, durationSec }
  } finally {
    await context.close().catch(() => undefined)
  }
}
