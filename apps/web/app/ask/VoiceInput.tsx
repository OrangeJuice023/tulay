'use client'

import { useEffect, useReducer, useRef, useSyncExternalStore } from 'react'
import { VOICE_DEFAULT_LANGUAGE_BIAS, VOICE_MAX_DURATION_SEC } from '@tulay/shared'
import { VoiceAudioError, blobToWav16kMono } from '@/lib/voice-audio'
import {
  formatVoiceElapsed,
  initialVoiceState,
  voiceReducer,
} from '@/lib/voice-machine'
import { Mic, Stop } from '@/components/icons'

const UPLOAD_TIMEOUT_MS = 60_000

function subscribeVoiceSupport(): () => void {
  return () => {}
}

function snapshotVoiceSupport(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined'
  )
}

function serverSnapshotVoiceSupport(): boolean {
  return false
}

/**
 * Voice input for the Ask Arko composer. Renders a microphone button that
 * lives in the composer row plus a full-width status panel above it (the
 * parent row must allow wrapping; the panel takes the first line).
 *
 * Flow: record (60 s cap, auto-stop) → convert to 16 kHz mono WAV →
 * review + explicit consent → upload for transcription → the transcript is
 * handed to `onTranscript`, which places it in the composer as editable
 * draft text. Nothing here can send: the user reviews the text and presses
 * the composer's own Send button.
 *
 * Privacy: the recording is converted in memory, transmitted only after the
 * user taps Transcribe, and every temporary buffer is dropped afterwards.
 * Audio never touches localStorage, Supabase, or chat history.
 */
export function VoiceInput({
  disabled,
  demoMode,
  onTranscript,
}: {
  disabled: boolean
  demoMode: boolean
  onTranscript: (text: string) => void
}) {
  const [state, dispatch] = useReducer(voiceReducer, initialVoiceState)
  const supported = useSyncExternalStore(
    subscribeVoiceSupport,
    snapshotVoiceSupport,
    serverSnapshotVoiceSupport,
  )
  const recorder = useRef<MediaRecorder | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const chunks = useRef<Blob[]>([])
  const wav = useRef<Blob | null>(null)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const ticks = useRef(0)
  const cancelled = useRef(false)
  const stopRef = useRef(() => {})

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current)
      stream.current?.getTracks().forEach((track) => track.stop())
      stream.current = null
      recorder.current = null
      chunks.current = []
      wav.current = null
    }
  }, [])

  // Latest-ref for the recording timer, refreshed every render.
  useEffect(() => {
    stopRef.current = stop
  })

  function clearTimer(): void {
    if (timer.current) {
      clearInterval(timer.current)
      timer.current = null
    }
  }

  function stopTracks(): void {
    stream.current?.getTracks().forEach((track) => track.stop())
    stream.current = null
  }

  function dropAudio(): void {
    chunks.current = []
    wav.current = null
  }

  async function start(): Promise<void> {
    if (disabled || !supported) return
    dispatch({ type: 'START' })
    cancelled.current = false
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.current = media
      const next = new MediaRecorder(media)
      chunks.current = []
      next.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) chunks.current.push(event.data)
      }
      next.onstop = () => {
        void handleStopped()
      }
      recorder.current = next
      next.start()
      ticks.current = 0
      dispatch({ type: 'PERMISSION_GRANTED' })
      clearTimer()
      // Tick-counted clock (4 Hz): no wall clock needed, and the converted
      // WAV header remains the authoritative duration.
      timer.current = setInterval(() => {
        ticks.current += 1
        const elapsed = ticks.current / 4
        dispatch({ type: 'TICK', elapsedSec: elapsed })
        if (elapsed >= VOICE_MAX_DURATION_SEC) stopRef.current()
      }, 250)
    } catch (error) {
      stopTracks()
      const name = typeof error === 'object' && error !== null && 'name' in error ? String(error.name) : ''
      if (name === 'NotAllowedError') {
        dispatch({
          type: 'PERMISSION_DENIED',
          error: 'Microphone access was denied. Allow it in your browser to use voice input — typing still works.',
        })
      } else if (name === 'NotFoundError') {
        dispatch({
          type: 'PERMISSION_DENIED',
          error: 'No microphone was found on this device. Typing still works.',
        })
      } else {
        dispatch({
          type: 'PERMISSION_DENIED',
          error: 'Could not start the microphone. Typing still works.',
        })
      }
    }
  }

  function stop(): void {
    clearTimer()
    dispatch({ type: 'STOP_REQUESTED' })
    if (recorder.current && recorder.current.state !== 'inactive') {
      recorder.current.stop()
    } else {
      dispatch({ type: 'CONVERT_FAILED', error: 'The recording ended before it began. Please try again.' })
    }
  }

  function cancel(): void {
    cancelled.current = true
    clearTimer()
    if (recorder.current && recorder.current.state !== 'inactive') {
      recorder.current.stop()
    } else {
      stopTracks()
    }
    recorder.current = null
    dropAudio()
    dispatch({ type: 'CANCEL' })
  }

  async function handleStopped(): Promise<void> {
    const wasCancelled = cancelled.current
    cancelled.current = false
    stopTracks()
    recorder.current = null
    if (wasCancelled) {
      dropAudio()
      return
    }
    const blob = new Blob(chunks.current, { type: 'audio/webm' })
    chunks.current = []
    if (blob.size === 0) {
      dispatch({ type: 'CONVERT_FAILED', error: 'The recording was empty — try speaking for a second or two.' })
      return
    }
    try {
      const { wav: converted, durationSec } = await blobToWav16kMono(blob)
      wav.current = converted
      dispatch({ type: 'CONVERTED', durationSec })
    } catch (error) {
      dropAudio()
      dispatch({
        type: 'CONVERT_FAILED',
        error:
          error instanceof VoiceAudioError
            ? error.message
            : 'That recording could not be prepared. Typing still works.',
      })
    }
  }

  function discard(): void {
    dropAudio()
    dispatch({ type: 'DISCARD' })
  }

  async function transcribe(): Promise<void> {
    const audio = wav.current
    if (!audio || disabled) return
    dispatch({ type: 'TRANSCRIBE_APPROVED' })
    const form = new FormData()
    form.append('audio', audio, 'recording.wav')
    form.append('durationSec', String(state.durationSec ?? VOICE_MAX_DURATION_SEC))
    form.append('languageBias', JSON.stringify([...VOICE_DEFAULT_LANGUAGE_BIAS]))
    try {
      const response = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: form,
        signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
      })
      const body = (await response.json().catch(() => null)) as
        | { ok: true; data: { transcript: string; note?: string } }
        | { ok: false; error: string }
        | null
      dropAudio()
      if (body?.ok) {
        dispatch({ type: 'TRANSCRIPT_RECEIVED', transcript: body.data.transcript, note: body.data.note })
        onTranscript(body.data.transcript)
      } else {
        dispatch({
          type: 'UPLOAD_FAILED',
          error: body && !body.ok && body.error ? body.error : 'Transcription failed. Please try again.',
        })
      }
    } catch (error) {
      dropAudio()
      const name = typeof error === 'object' && error !== null && 'name' in error ? String(error.name) : ''
      dispatch({
        type: 'UPLOAD_FAILED',
        error:
          name === 'TimeoutError'
            ? 'Transcription timed out. Try a shorter recording.'
            : 'Could not reach the transcription service. Check your connection and try again.',
      })
    }
  }

  const busy = disabled && state.phase !== 'uploading'
  const showPanel = state.phase !== 'idle'

  return (
    <>
      {showPanel && (
        <div className="order-first w-full" role="status" aria-live="polite">
          <div className="rounded-2xl border border-line bg-ivory px-4 py-3 text-sm text-ink">
            {state.phase === 'requesting' && (
              <div className="flex items-center justify-between gap-3">
                <p>Waiting for microphone permission…</p>
                <button
                  type="button"
                  onClick={cancel}
                  className="shrink-0 rounded-full px-3 py-1.5 text-[13px] font-semibold text-muted hover:text-danger"
                >
                  Cancel
                </button>
              </div>
            )}
            {state.phase === 'recording' && (
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 font-semibold">
                  <span aria-hidden="true" className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-danger" />
                  Recording
                  <span className="font-mono tabular-nums" aria-label={`${Math.floor(state.elapsedSec)} seconds recorded`}>
                    {formatVoiceElapsed(state.elapsedSec)}
                  </span>
                  <span className="font-normal text-muted">/ {formatVoiceElapsed(VOICE_MAX_DURATION_SEC)} max</span>
                </p>
                <button
                  type="button"
                  onClick={cancel}
                  className="shrink-0 rounded-full px-3 py-1.5 text-[13px] font-semibold text-muted hover:text-danger"
                >
                  Cancel
                </button>
              </div>
            )}
            {state.phase === 'converting' && (
              <p className="flex items-center gap-2">
                <span aria-hidden="true" className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                Preparing your recording…
              </p>
            )}
            {state.phase === 'review' && (
              <div className="space-y-2.5">
                <p className="font-semibold">
                  {formatVoiceElapsed(state.durationSec ?? 0)} recorded. Send it for transcription?
                </p>
                <p className="text-[13px] text-muted">
                  {demoMode
                    ? 'Demo mode: no audio reaches a real transcription service — you get a sample transcript to try the flow. '
                    : 'Your audio is sent to Meta for transcription (English and Tagalog, including Taglish). '}
                  Audio is never stored — only the text comes back for you to review.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void transcribe()}
                    disabled={busy}
                    className="inline-flex min-h-11 items-center rounded-full bg-forest px-6 text-sm font-semibold text-white shadow-[var(--shadow-press)] transition hover:bg-forest-dark active:translate-y-[3px] active:shadow-none disabled:opacity-50"
                  >
                    Transcribe
                  </button>
                  <button
                    type="button"
                    onClick={discard}
                    className="inline-flex min-h-11 items-center rounded-full bg-white px-5 text-sm font-semibold text-forest ring-1 ring-line transition hover:ring-forest/50"
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}
            {state.phase === 'uploading' && (
              <p className="flex items-center gap-2">
                <span aria-hidden="true" className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                Transcribing…
              </p>
            )}
            {state.phase === 'ready' && (
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-semibold text-forest-dark">
                    Transcript added — review it in your message, then press Send.
                  </p>
                  {state.note && <p className="text-[13px] text-muted">{state.note}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'DISMISS' })}
                  className="shrink-0 rounded-full px-3 py-1.5 text-[13px] font-semibold text-muted hover:text-ink"
                >
                  Dismiss
                </button>
              </div>
            )}
            {state.phase === 'error' && (
              <div className="flex items-start justify-between gap-3">
                <p role="alert" className="font-medium text-danger">{state.error}</p>
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'DISMISS' })}
                  className="shrink-0 rounded-full px-3 py-1.5 text-[13px] font-semibold text-muted hover:text-ink"
                >
                  Try again
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {state.phase === 'recording' || state.phase === 'converting' ? (
        <button
          type="button"
          onClick={stop}
          disabled={state.phase !== 'recording'}
          aria-label="Stop recording"
          title="Stop recording"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-danger text-white shadow-[var(--shadow-press)] transition hover:brightness-105 active:translate-y-[3px] active:shadow-none disabled:opacity-50"
        >
          <Stop className="h-5 w-5" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => void start()}
          disabled={busy || !supported || state.phase === 'requesting' || state.phase === 'review' || state.phase === 'uploading'}
          aria-label={supported ? 'Record a voice message' : 'Voice input is not supported in this browser'}
          title={supported ? 'Record a voice message' : 'Voice input is not supported in this browser'}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-forest transition hover:bg-mist disabled:opacity-40"
        >
          {state.phase === 'requesting' || state.phase === 'uploading' ? (
            <span aria-hidden="true" className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
        </button>
      )}
    </>
  )
}
