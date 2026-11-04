/**
 * Pure state machine for the Ask Arko voice-input flow.
 *
 * The machine walks: idle → requesting → recording → converting → review
 * (explicit consent) → uploading → ready. A received transcript lands in
 * `draftTranscript` for the user to review and edit in the composer.
 *
 * Review-before-send is structural, not conventional: `submitted` starts
 * false and no event in `VoiceEvent` can set it true — the machine has no
 * send transition at all. Text reaches Arko only through the composer's own
 * explicit Send button, which lives outside this machine.
 */

export type VoicePhase =
  | 'idle'
  | 'requesting'
  | 'recording'
  | 'converting'
  | 'review'
  | 'uploading'
  | 'ready'
  | 'error'

export interface VoiceMachineState {
  phase: VoicePhase
  /** Live recording clock in whole seconds. */
  elapsedSec: number
  /** Converted WAV length, known from the review step on. */
  durationSec: number | null
  /** Transcript waiting for review in the composer. Never auto-sent. */
  draftTranscript: string | null
  /** Labelling for a demo-fallback transcript, if the live service failed. */
  note: string | null
  /** Always false: this machine cannot submit. The composer Send button can. */
  submitted: boolean
  error: string | null
}

export type VoiceEvent =
  | { type: 'START' }
  | { type: 'PERMISSION_GRANTED' }
  | { type: 'PERMISSION_DENIED'; error: string }
  | { type: 'TICK'; elapsedSec: number }
  | { type: 'STOP_REQUESTED' }
  | { type: 'CANCEL' }
  | { type: 'CONVERTED'; durationSec: number }
  | { type: 'CONVERT_FAILED'; error: string }
  | { type: 'TRANSCRIBE_APPROVED' }
  | { type: 'DISCARD' }
  | { type: 'TRANSCRIPT_RECEIVED'; transcript: string; note?: string }
  | { type: 'UPLOAD_FAILED'; error: string }
  | { type: 'DISMISS' }
  | { type: 'RESET' }

export const initialVoiceState: VoiceMachineState = {
  phase: 'idle',
  elapsedSec: 0,
  durationSec: null,
  draftTranscript: null,
  note: null,
  submitted: false,
  error: null,
}

function failed(error: string): VoiceMachineState {
  return { ...initialVoiceState, phase: 'error', error }
}

export function voiceReducer(state: VoiceMachineState, event: VoiceEvent): VoiceMachineState {
  switch (event.type) {
    case 'START':
      if (state.phase !== 'idle' && state.phase !== 'error' && state.phase !== 'ready') return state
      return { ...initialVoiceState, phase: 'requesting' }
    case 'PERMISSION_GRANTED':
      if (state.phase !== 'requesting') return state
      return { ...state, phase: 'recording', elapsedSec: 0 }
    case 'PERMISSION_DENIED':
      if (state.phase !== 'requesting') return state
      return failed(event.error)
    case 'TICK':
      if (state.phase !== 'recording') return state
      return { ...state, elapsedSec: Math.max(0, Math.floor(event.elapsedSec)) }
    case 'STOP_REQUESTED':
      if (state.phase !== 'recording') return state
      return { ...state, phase: 'converting' }
    case 'CANCEL':
      if (
        state.phase !== 'requesting' &&
        state.phase !== 'recording' &&
        state.phase !== 'converting'
      ) {
        return state
      }
      return { ...initialVoiceState }
    case 'CONVERTED':
      if (state.phase !== 'converting') return state
      return { ...state, phase: 'review', durationSec: event.durationSec }
    case 'CONVERT_FAILED':
      if (state.phase !== 'converting') return state
      return failed(event.error)
    case 'TRANSCRIBE_APPROVED':
      // The explicit consent gate: nothing is transmitted before this event.
      if (state.phase !== 'review') return state
      return { ...state, phase: 'uploading', error: null }
    case 'DISCARD':
      if (state.phase !== 'review') return state
      return { ...initialVoiceState }
    case 'TRANSCRIPT_RECEIVED':
      if (state.phase !== 'uploading') return state
      return {
        ...state,
        phase: 'ready',
        draftTranscript: event.transcript,
        note: event.note ?? null,
        submitted: false,
      }
    case 'UPLOAD_FAILED':
      if (state.phase !== 'uploading') return state
      return { ...failed(event.error), durationSec: state.durationSec }
    case 'DISMISS':
      if (state.phase !== 'error' && state.phase !== 'ready') return state
      return { ...initialVoiceState }
    case 'RESET':
      return { ...initialVoiceState }
    default:
      return state
  }
}

/** Whole seconds → `m:ss` for the recording timer. */
export function formatVoiceElapsed(totalSec: number): string {
  const clamped = Math.max(0, Math.floor(totalSec))
  const minutes = Math.floor(clamped / 60)
  const seconds = String(clamped % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}
