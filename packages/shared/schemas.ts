import { z } from 'zod'

/**
 * Shared contract between UI, server and AI (see `docs/DATA_MODEL.md`).
 * Postgres uses snake_case; these schemas use camelCase. No I/O in this module.
 */

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

export const ProfileSchema = z.object({
  id: z.string().uuid().optional(),
  displayName: z.string().trim().min(1).max(100),
  bio: z.string().max(2000).optional(),
  careerBackground: z.string().max(2000).optional(),
  currentSituation: z.string().max(2000).optional(),
  careerGoal: z.string().trim().min(1).max(2000),
  availability: z.string().max(200).optional(),
  preferredLanguage: z.string().max(20).optional(),
  languages: z.array(z.string().trim().min(2).max(10)).max(10).optional(),
  countryCode: z.string().length(2).default('PH'),
  locale: z.string().max(20).default('en-PH'),
  discoverable: z.boolean().default(true),
  visibilitySettings: z.record(z.boolean()).optional(),
  contactMethod: z.string().trim().max(500).optional(),
  isDemo: z.boolean().default(false),
})

export type Profile = z.infer<typeof ProfileSchema>

// ---------------------------------------------------------------------------
// Career goals (Journey 1 input; persisted as `profiles.career_goal`)
// ---------------------------------------------------------------------------

export const CareerGoalSchema = z.object({
  goal: z.string().trim().min(1, 'Goal is required').max(2000),
  currentSituation: z.string().trim().max(2000).optional(),
  careerBackground: z.string().trim().max(2000).optional(),
})

export type CareerGoal = z.infer<typeof CareerGoalSchema>

// ---------------------------------------------------------------------------
// Needs (help requests)
// ---------------------------------------------------------------------------

export const NeedStatusSchema = z.enum(['open', 'fulfilled', 'closed'])
export type NeedStatus = z.infer<typeof NeedStatusSchema>

export const SkillTagSchema = z.string().trim().min(1).max(50)

export const NeedSchema = z.object({
  id: z.string().uuid().optional(),
  profileId: z.string().uuid(),
  description: z.string().trim().min(1).max(2000),
  tags: z.array(SkillTagSchema).max(20).default([]),
  goalContext: z.string().trim().max(2000).optional(),
  status: NeedStatusSchema.default('open'),
  aiSuggested: z.boolean().default(false),
})

export type Need = z.infer<typeof NeedSchema>

// ---------------------------------------------------------------------------
// Offers (skill offers)
// ---------------------------------------------------------------------------

export const OfferStatusSchema = z.enum(['active', 'paused'])
export type OfferStatus = z.infer<typeof OfferStatusSchema>

export const OfferSchema = z.object({
  id: z.string().uuid().optional(),
  profileId: z.string().uuid(),
  description: z.string().trim().min(1).max(2000),
  tags: z.array(SkillTagSchema).max(20).default([]),
  capacity: z.string().trim().max(200).optional(),
  status: OfferStatusSchema.default('active'),
  rateAmount: z.number().nonnegative().nullable().optional(),
  currencyCode: z.string().trim().length(3).nullable().optional(),
})

export type Offer = z.infer<typeof OfferSchema>

// ---------------------------------------------------------------------------
// Introduction requests (consent lives here; see `docs/DATA_MODEL.md`)
// ---------------------------------------------------------------------------

export const IntroductionStatusSchema = z.enum(['pending', 'accepted', 'declined', 'withdrawn'])
export type IntroductionStatus = z.infer<typeof IntroductionStatusSchema>

export const IntroductionRequestSchema = z
  .object({
    id: z.string().uuid().optional(),
    fromProfileId: z.string().uuid(),
    toProfileId: z.string().uuid(),
    needId: z.string().uuid(),
    offerId: z.string().uuid().nullable().optional(),
    matchFactors: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
    explanation: z.string().trim().max(2000).optional(),
    message: z.string().trim().min(1, 'Message is required').max(2000),
    status: IntroductionStatusSchema.default('pending'),
    respondedAt: z.string().datetime({ offset: true }).nullable().optional(),
  })
  .refine((value) => value.fromProfileId !== value.toProfileId, {
    message: 'Cannot request an introduction to yourself',
    path: ['toProfileId'],
  })

export type IntroductionRequest = z.infer<typeof IntroductionRequestSchema>

// ---------------------------------------------------------------------------
// Collaborations (created only from an accepted introduction)
// ---------------------------------------------------------------------------

export const NextStepSchema = z.object({
  text: z.string().trim().min(1).max(500),
  done: z.boolean().default(false),
})
export type NextStep = z.infer<typeof NextStepSchema>

export const CollaborationStatusSchema = z.enum(['agreed', 'in_progress', 'completed', 'cancelled'])
export type CollaborationStatus = z.infer<typeof CollaborationStatusSchema>

export const CollaborationSchema = z
  .object({
    id: z.string().uuid().optional(),
    introductionRequestId: z.string().uuid(),
    requesterId: z.string().uuid(),
    helperId: z.string().uuid(),
    intendedOutcome: z.string().trim().max(2000).optional(),
    nextSteps: z.array(NextStepSchema).max(20).default([]),
    status: CollaborationStatusSchema.default('agreed'),
  })
  .refine((value) => value.requesterId !== value.helperId, {
    message: 'Requester and helper must be different people',
    path: ['helperId'],
  })

export type Collaboration = z.infer<typeof CollaborationSchema>

// ---------------------------------------------------------------------------
// Collaboration feedback (Journey 5: "did this help?")
// ---------------------------------------------------------------------------

export const HelpedSchema = z.enum(['yes', 'partly', 'no'])
export type Helped = z.infer<typeof HelpedSchema>

export const CollaborationFeedbackSchema = z.object({
  collaborationId: z.string().uuid(),
  profileId: z.string().uuid(),
  helped: HelpedSchema,
  note: z.string().trim().max(2000).optional(),
})

export type CollaborationFeedback = z.infer<typeof CollaborationFeedbackSchema>

// ---------------------------------------------------------------------------
// AI contracts: every model response is validated with these before use.
// Contexts carry the minimum fields; never contact details.
// ---------------------------------------------------------------------------

export const ExtractedGoalSchema = z.object({
  goal: z.string().trim().min(1).max(2000),
  needs: z.array(z.string().trim().min(1).max(500)).min(1).max(10),
  offers: z.array(z.string().trim().min(1).max(500)).max(10).default([]),
  skills: z.array(z.string().trim().min(1).max(100)).max(20).default([]),
  preferences: z.record(z.unknown()).optional(),
})

export type ExtractedGoal = z.infer<typeof ExtractedGoalSchema>

export const MatchExplanationSchema = z.object({
  explanation: z.string().trim().min(1).max(2000),
  compatibilityFactors: z.array(z.string().trim().min(1).max(200)).min(1).max(20),
  suggestedCollaboration: z.string().trim().min(1).max(1000),
})

export type MatchExplanation = z.infer<typeof MatchExplanationSchema>

export const ExplainMatchContextSchema = z.object({
  seekerNeed: z.string().trim().min(1).max(2000),
  candidateName: z.string().trim().min(1).max(100),
  candidateOffer: z.string().trim().min(1).max(2000),
  sharedLanguages: z.array(z.string().trim().min(2).max(10)).max(10).default([]),
  candidateAvailability: z.string().trim().max(200).optional(),
  matchFactors: z.array(z.string().trim().min(1).max(200)).min(1).max(20),
})

export type ExplainMatchContext = z.infer<typeof ExplainMatchContextSchema>
export type ExplainMatchContextInput = z.input<typeof ExplainMatchContextSchema>

export const DraftIntroductionContextSchema = z.object({
  senderName: z.string().trim().min(1).max(100),
  recipientName: z.string().trim().min(1).max(100),
  need: z.string().trim().min(1).max(2000),
  offer: z.string().trim().max(2000).optional(),
  matchExplanation: z.string().trim().max(2000).optional(),
})

export type DraftIntroductionContext = z.infer<typeof DraftIntroductionContextSchema>
export type DraftIntroductionContextInput = z.input<typeof DraftIntroductionContextSchema>

export const SuggestCollaborationContextSchema = z.object({
  goal: z.string().trim().min(1).max(2000),
  need: z.string().trim().min(1).max(2000),
  offer: z.string().trim().min(1).max(2000),
})

export type SuggestCollaborationContext = z.infer<typeof SuggestCollaborationContextSchema>
export type SuggestCollaborationContextInput = z.input<typeof SuggestCollaborationContextSchema>

export const IntroductionDraftSchema = z.object({
  message: z.string().trim().min(1).max(2000),
})

export type IntroductionDraft = z.infer<typeof IntroductionDraftSchema>

export const CollaborationSuggestionsSchema = z.object({
  suggestions: z.array(z.string().trim().min(1).max(500)).min(1).max(5),
})

export type CollaborationSuggestions = z.infer<typeof CollaborationSuggestionsSchema>

// ---------------------------------------------------------------------------
// Skill tag suggestion (output must stay inside the caller's vocabulary)
// ---------------------------------------------------------------------------

export const SuggestTagsContextSchema = z.object({
  text: z.string().trim().min(1).max(8000),
  vocabulary: z.array(SkillTagSchema).min(1).max(100),
})

export type SuggestTagsContext = z.infer<typeof SuggestTagsContextSchema>
export type SuggestTagsContextInput = z.input<typeof SuggestTagsContextSchema>

export const SuggestedTagsSchema = z.object({
  tags: z.array(SkillTagSchema).max(20).default([]),
})

export type SuggestedTags = z.infer<typeof SuggestedTagsSchema>
