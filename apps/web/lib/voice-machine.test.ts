import { describe, expect, it } from 'vitest'
import {
  formatVoiceElapsed,
  initialVoiceState,
  voiceReducer,
  type VoiceEvent,
  type VoiceMachineState,
} from './voice-machine'

function run(events: VoiceEvent[]): VoiceMachineState {
  return events.reduce(voiceReducer, initialVoiceState)
}

function happyPath(note?: string): VoiceMachineState {
  return run([
    { type: 'START' },
    { type: 'PERMISSION_GRANTED' },
    { type: 'TICK', elapsedSec: 12 },
    { type: 'STOP_REQUESTED' },
    { type: 'CONVERTED', durationSec: 12 },
    { type: 'TRANSCRIBE_APPROVED' },
    { type: 'TRANSCRIPT_RECEIVED', transcript: 'Gusto kong maging designer', note },
  ])
}

describe('voiceReducer happy path', () => {
  it('walks record → review → consent → transcript ready', () => {
    const state = happyPath()
    expect(state.phase).toBe('ready')
    expect(state.draftTranscript).toBe('Gusto kong maging designer')
    expect(state.durationSec).toBe(12)
    expect(state.error).toBeNull()
  })

  it('carries a demo-fallback note to the review panel', () => {
    const state = happyPath('The live service was unreachable, so this is a sample.')
    expect(state.note).toContain('sample')
  })
})

describe('review before send (structural)', () => {
  const everyEvent: VoiceEvent[] = [
    { type: 'START' },
    { type: 'PERMISSION_GRANTED' },
    { type: 'PERMISSION_DENIED', error: 'denied' },
    { type: 'TICK', elapsedSec: 3 },
    { type: 'STOP_REQUESTED' },
    { type: 'CANCEL' },
    { type: 'CONVERTED', durationSec: 3 },
    { type: 'CONVERT_FAILED', error: 'nope' },
    { type: 'TRANSCRIBE_APPROVED' },
    { type: 'DISCARD' },
    { type: 'TRANSCRIPT_RECEIVED', transcript: 'sneaky' },
    { type: 'UPLOAD_FAILED', error: 'nope' },
    { type: 'DISMISS' },
    { type: 'RESET' },
  ]

  it('never sets submitted, on any event from any reachable phase', () => {
    // From the initial state and from every phase the happy path reaches.
    const states: VoiceMachineState[] = [initialVoiceState]
    let cursor = initialVoiceState
    for (const event of [
      { type: 'START' },
      { type: 'PERMISSION_GRANTED' },
      { type: 'STOP_REQUESTED' },
      { type: 'CONVERTED', durationSec: 5 },
      { type: 'TRANSCRIBE_APPROVED' },
      { type: 'TRANSCRIPT_RECEIVED', transcript: 'draft' },
    ] as VoiceEvent[]) {
      cursor = voiceReducer(cursor, event)
      states.push(cursor)
    }
    for (const state of states) {
      for (const event of everyEvent) {
        expect(voiceReducer(state, event).submitted).toBe(false)
      }
    }
    expect(happyPath().submitted).toBe(false)
  })

  it('has no send transition: unknown events leave state untouched', () => {
    const ready = happyPath()
    const forged = voiceReducer(ready, { type: 'SEND' } as unknown as VoiceEvent)
    expect(forged).toBe(ready)
    expect(forged.draftTranscript).toBe('Gusto kong maging designer')
    expect(forged.submitted).toBe(false)
  })

  it('ignores transcripts that arrive outside the uploading phase', () => {
    // A transcript can only land after explicit consent (review → approved).
    expect(
      run([{ type: 'TRANSCRIPT_RECEIVED', transcript: 'sneaky' }]).draftTranscript,
    ).toBeNull()
    expect(
      run([
        { type: 'START' },
        { type: 'PERMISSION_GRANTED' },
        { type: 'STOP_REQUESTED' },
        { type: 'CONVERTED', durationSec: 5 },
        { type: 'TRANSCRIPT_RECEIVED', transcript: 'sneaky' },
      ]).draftTranscript,
    ).toBeNull()
  })

  it('requires explicit consent before transmitting', () => {
    // Approving from any phase but review is a no-op.
    expect(run([{ type: 'TRANSCRIBE_APPROVED' }]).phase).toBe('idle')
    expect(
      run([
        { type: 'START' },
        { type: 'PERMISSION_GRANTED' },
        { type: 'TRANSCRIBE_APPROVED' },
      ]).phase,
    ).toBe('recording')
  })

  it('cancel and discard return to idle with no draft', () => {
    const cancelled = run([
      { type: 'START' },
      { type: 'PERMISSION_GRANTED' },
      { type: 'TICK', elapsedSec: 4 },
      { type: 'CANCEL' },
    ])
    expect(cancelled).toEqual(initialVoiceState)
    const discarded = run([
      { type: 'START' },
      { type: 'PERMISSION_GRANTED' },
      { type: 'STOP_REQUESTED' },
      { type: 'CONVERTED', durationSec: 4 },
      { type: 'DISCARD' },
    ])
    expect(discarded).toEqual(initialVoiceState)
  })
})

describe('voiceReducer guards', () => {
  it('keeps timer ticks inside the recording phase', () => {
    expect(run([{ type: 'TICK', elapsedSec: 9 }]).elapsedSec).toBe(0)
    const recording = run([{ type: 'START' }, { type: 'PERMISSION_GRANTED' }, { type: 'TICK', elapsedSec: 9 }])
    expect(recording.elapsedSec).toBe(9)
  })

  it('surfaces permission, conversion, and upload failures as errors', () => {
    expect(run([{ type: 'START' }, { type: 'PERMISSION_DENIED', error: 'denied' }])).toMatchObject({
      phase: 'error',
      error: 'denied',
    })
    const converting = run([
      { type: 'START' },
      { type: 'PERMISSION_GRANTED' },
      { type: 'STOP_REQUESTED' },
    ])
    expect(voiceReducer(converting, { type: 'CONVERT_FAILED', error: 'bad audio' })).toMatchObject({
      phase: 'error',
      error: 'bad audio',
    })
    const uploading = run([
      { type: 'START' },
      { type: 'PERMISSION_GRANTED' },
      { type: 'STOP_REQUESTED' },
      { type: 'CONVERTED', durationSec: 5 },
      { type: 'TRANSCRIBE_APPROVED' },
    ])
    const failed = voiceReducer(uploading, { type: 'UPLOAD_FAILED', error: 'timeout' })
    expect(failed).toMatchObject({ phase: 'error', error: 'timeout', durationSec: 5 })
    expect(voiceReducer(failed, { type: 'DISMISS' })).toEqual(initialVoiceState)
  })

  it('RESET returns to idle from anywhere', () => {
    expect(voiceReducer(happyPath(), { type: 'RESET' })).toEqual(initialVoiceState)
  })
})

describe('formatVoiceElapsed', () => {
  it('formats the recording timer as m:ss', () => {
    expect(formatVoiceElapsed(0)).toBe('0:00')
    expect(formatVoiceElapsed(5)).toBe('0:05')
    expect(formatVoiceElapsed(59)).toBe('0:59')
    expect(formatVoiceElapsed(60)).toBe('1:00')
    expect(formatVoiceElapsed(61)).toBe('1:01')
    expect(formatVoiceElapsed(-3)).toBe('0:00')
  })
})
