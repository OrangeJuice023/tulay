import { z } from 'zod'
import { CandidateMatchSchema } from './matching'
import { NeedSchema, IntroductionRequestSchema, CollaborationSchema } from './schemas'

export const ConciergeRelationshipSchema = z.enum(['co-founder', 'mentor', 'peer', 'advisor', 'early-user', 'collaborator', 'other'])
export type ConciergeRelationship = z.infer<typeof ConciergeRelationshipSchema>

export const ConciergeCriteriaSchema = z.object({
  relationship: ConciergeRelationshipSchema,
  skills: z.array(z.string().trim().min(1).max(100)).max(20).default([]),
  description: z.string().trim().min(1).max(2000),
})
export type ConciergeCriteria = z.infer<typeof ConciergeCriteriaSchema>

export const ConciergeSessionStatusSchema = z.enum(['browsing', 'accepted', 'exhausted'])

export const ConciergeSessionSchema = z.object({
  status: ConciergeSessionStatusSchema,
  criteria: ConciergeCriteriaSchema,
  need: NeedSchema,
  candidates: z.array(CandidateMatchSchema),
  currentIndex: z.number().int().min(0),
  skippedProfileIds: z.array(z.string().uuid()).default([]),
})
export type ConciergeSession = z.infer<typeof ConciergeSessionSchema>

type StartInput = {
  criteria: ConciergeCriteria
  need: z.infer<typeof NeedSchema>
  candidates: z.infer<typeof CandidateMatchSchema>[]
}

export function startConciergeSession(input: StartInput): ConciergeSession {
  const criteria = ConciergeCriteriaSchema.parse(input.criteria)
  const need = NeedSchema.parse(input.need)
  const candidates = input.candidates.map((c) => {
    const parsed = CandidateMatchSchema.parse(c)
    const { contactMethod: _omitted, ...publicProfile } = parsed.profile as typeof parsed.profile & {
      contactMethod?: string
    }
    void _omitted
    return { ...parsed, profile: publicProfile }
  })
  const status = candidates.length === 0 ? 'exhausted' : 'browsing'
  return {
    status,
    criteria,
    need,
    candidates,
    currentIndex: 0,
    skippedProfileIds: [],
  }
}

export function currentCandidate(session: ConciergeSession): z.infer<typeof CandidateMatchSchema> | null {
  const parsed = ConciergeSessionSchema.parse(session)
  if (parsed.status !== 'browsing') return null
  if (parsed.currentIndex >= parsed.candidates.length) return null
  return parsed.candidates[parsed.currentIndex]
}

export function remainingCandidates(session: ConciergeSession): number {
  const parsed = ConciergeSessionSchema.parse(session)
  if (parsed.status !== 'browsing') return 0
  return Math.max(0, parsed.candidates.length - parsed.currentIndex)
}

export function skipCandidate(session: ConciergeSession): ConciergeSession {
  const parsed = ConciergeSessionSchema.parse(session)
  if (parsed.status !== 'browsing' || parsed.currentIndex >= parsed.candidates.length) {
    throw new Error('No current candidate to skip')
  }
  const current = parsed.candidates[parsed.currentIndex]
  const skipped = [...parsed.skippedProfileIds, current.profile.id as string]
  const nextIndex = parsed.currentIndex + 1
  const status = nextIndex >= parsed.candidates.length ? 'exhausted' : 'browsing'
  return { ...parsed, currentIndex: nextIndex, skippedProfileIds: skipped, status }
}

export function acceptCandidate(session: ConciergeSession): {
  session: ConciergeSession
  candidate: z.infer<typeof CandidateMatchSchema>
} {
  const parsed = ConciergeSessionSchema.parse(session)
  if (parsed.status !== 'browsing' || parsed.currentIndex >= parsed.candidates.length) {
    throw new Error('No current candidate to accept')
  }
  const candidate = parsed.candidates[parsed.currentIndex]
  const resolved: ConciergeSession = {
    ...parsed,
    status: 'accepted',
    currentIndex: parsed.candidates.length,
  }
  return { session: resolved, candidate }
}

export function refineConciergeSession(
  session: ConciergeSession,
  update: StartInput,
): ConciergeSession {
  const parsed = ConciergeSessionSchema.parse(session)
  const next = startConciergeSession(update)
  const filtered = next.candidates.filter(
    (c) => !parsed.skippedProfileIds.includes(c.profile.id as string),
  )
  return {
    ...next,
    candidates: filtered,
    skippedProfileIds: [...parsed.skippedProfileIds],
    status: filtered.length === 0 ? 'exhausted' : 'browsing',
    currentIndex: 0,
  }
}

export function buildIntroductionRequest(input: {
  id?: string
  fromProfileId: string
  toProfileId: string
  needId: string
  offerId?: string | null
  matchFactors?: string[]
  explanation?: string
  message: string
}): z.infer<typeof IntroductionRequestSchema> {
  return IntroductionRequestSchema.parse({
    id: input.id,
    fromProfileId: input.fromProfileId,
    toProfileId: input.toProfileId,
    needId: input.needId,
    offerId: input.offerId ?? null,
    matchFactors: input.matchFactors ?? [],
    explanation: input.explanation,
    message: input.message,
    status: 'pending',
    respondedAt: null,
  })
}

export function respondToIntroduction(
  request: z.infer<typeof IntroductionRequestSchema>,
  responderProfileId: string,
  decision: 'accepted' | 'declined',
): z.infer<typeof IntroductionRequestSchema> {
  const parsed = IntroductionRequestSchema.parse(request)
  if (parsed.toProfileId !== responderProfileId) {
    throw new Error('Only the recipient can respond to an introduction')
  }
  if (parsed.status !== 'pending') {
    throw new Error(`Introduction is already ${parsed.status}`)
  }
  return IntroductionRequestSchema.parse({
    ...parsed,
    status: decision,
    respondedAt: new Date().toISOString(),
  })
}

export function withdrawIntroduction(
  request: z.infer<typeof IntroductionRequestSchema>,
  senderProfileId: string,
): z.infer<typeof IntroductionRequestSchema> {
  const parsed = IntroductionRequestSchema.parse(request)
  if (parsed.fromProfileId !== senderProfileId) {
    throw new Error('Only the sender can withdraw an introduction')
  }
  if (parsed.status !== 'pending') {
    throw new Error('Only pending introductions can be withdrawn')
  }
  return IntroductionRequestSchema.parse({
    ...parsed,
    status: 'withdrawn',
    respondedAt: new Date().toISOString(),
  })
}

export function contactVisibleTo(
  request: z.infer<typeof IntroductionRequestSchema>,
  profileId: string,
): boolean {
  const parsed = IntroductionRequestSchema.parse(request)
  if (parsed.status !== 'accepted') return false
  return profileId === parsed.fromProfileId || profileId === parsed.toProfileId
}

export function createCollaborationFromIntroduction(
  request: z.infer<typeof IntroductionRequestSchema>,
  input: {
    requesterId: string
    helperId: string
    intendedOutcome?: string
    nextSteps?: { text: string; done?: boolean }[]
  },
): z.infer<typeof CollaborationSchema> {
  const parsed = IntroductionRequestSchema.parse(request)
  if (parsed.status !== 'accepted') {
    throw new Error('A collaboration needs an accepted introduction')
  }
  if (!parsed.id) {
    throw new Error('Introduction needs an id')
  }
  if (
    !(
      (parsed.fromProfileId === input.requesterId && parsed.toProfileId === input.helperId) ||
      (parsed.fromProfileId === input.helperId && parsed.toProfileId === input.requesterId)
    )
  ) {
    throw new Error('Collaboration must be between the introduction sender and recipient')
  }
  return CollaborationSchema.parse({
    introductionRequestId: parsed.id,
    requesterId: input.requesterId,
    helperId: input.helperId,
    intendedOutcome: input.intendedOutcome,
    nextSteps: input.nextSteps ?? [],
    status: 'agreed',
  })
}