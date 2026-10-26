import { z } from 'zod'

export const ProfileSchema = z.object({
  id: z.string().uuid().optional(),
  displayName: z.string().min(1).max(100),
  bio: z.string().optional(),
  careerBackground: z.string().optional(),
  currentSituation: z.string().optional(),
  careerGoal: z.string().min(1),
  availability: z.string().optional(),
  preferredLanguage: z.string().optional(),
  visibilitySettings: z.record(z.boolean()).optional(),
  isDemo: z.boolean().default(false),
})

export type Profile = z.infer<typeof ProfileSchema>

export const ExtractedGoalSchema = z.object({
  goal: z.string(),
  needs: z.array(z.string()),
  offers: z.array(z.string()),
  skills: z.array(z.string()),
  preferences: z.record(z.any()).optional(),
})

export type ExtractedGoal = z.infer<typeof ExtractedGoalSchema>

export const MatchExplanationSchema = z.object({
  explanation: z.string(),
  compatibilityFactors: z.array(z.string()),
  suggestedCollaboration: z.string(),
})

export type MatchExplanation = z.infer<typeof MatchExplanationSchema>
