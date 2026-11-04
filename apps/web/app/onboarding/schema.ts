import { z } from 'zod'
import { StudioSchema } from '@tulay/shared'

/**
 * Onboarding answers contract. Lives outside `actions.ts` because `use
 * server` modules may only export async functions.
 */
export const OnboardingNeedSchema = z.object({
  description: z.string().trim().min(1, 'Describe the help you need.').max(2000),
  tags: z.array(z.string().trim().min(1).max(50)).max(10).default([]),
})

export const OnboardingInputSchema = z.object({
  displayName: z.string().trim().min(1, 'Tell us what to call you.').max(100),
  currentSituation: z.string().trim().max(2000).optional(),
  careerGoal: z.string().trim().min(1, 'Tell us what you are trying to accomplish.').max(2000),
  needs: z.array(OnboardingNeedSchema).min(1, 'Add at least one thing you need help with.').max(3),
  offers: z.array(OnboardingNeedSchema).max(3).default([]),
  primaryStudio: StudioSchema,
})

export type OnboardingInput = z.infer<typeof OnboardingInputSchema>
