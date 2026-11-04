import { describe, expect, it } from 'vitest'
import { OnboardingInputSchema } from './schema'

const VALID = {
  displayName: 'Mara',
  currentSituation: 'Call-centre agent learning UX design.',
  careerGoal: 'Become a UX designer with a reviewed portfolio.',
  needs: [{ description: 'Portfolio review from a designer', tags: ['portfolio-review'] }],
  offers: [{ description: 'English interview practice', tags: ['interview-practice'] }],
  primaryStudio: 'career',
}

describe('OnboardingInputSchema', () => {
  it('accepts a complete answers object', () => {
    expect(OnboardingInputSchema.safeParse(VALID).success).toBe(true)
  })

  it('accepts zero offers (reciprocity without pressure)', () => {
    const parsed = OnboardingInputSchema.safeParse({ ...VALID, offers: [] })
    expect(parsed.success).toBe(true)
  })

  it('rejects a missing name, goal, or pathway', () => {
    expect(OnboardingInputSchema.safeParse({ ...VALID, displayName: '  ' }).success).toBe(false)
    expect(OnboardingInputSchema.safeParse({ ...VALID, careerGoal: '' }).success).toBe(false)
    expect(OnboardingInputSchema.safeParse({ ...VALID, primaryStudio: 'casting' }).success).toBe(false)
  })

  it('requires at least one need and caps needs/offers at three', () => {
    expect(OnboardingInputSchema.safeParse({ ...VALID, needs: [] }).success).toBe(false)
    const four = [0, 1, 2, 3].map((n) => ({ description: `Need ${n}`, tags: [] }))
    expect(OnboardingInputSchema.safeParse({ ...VALID, needs: four }).success).toBe(false)
    expect(OnboardingInputSchema.safeParse({ ...VALID, offers: four }).success).toBe(false)
  })

  it('trims descriptions and drops empty optional situation', () => {
    const parsed = OnboardingInputSchema.safeParse({
      ...VALID,
      displayName: '  Mara  ',
      currentSituation: '   ',
      needs: [{ description: '  Portfolio review  ', tags: [] }],
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.displayName).toBe('Mara')
      expect(parsed.data.currentSituation).toBe('')
      expect(parsed.data.needs[0]?.description).toBe('Portfolio review')
    }
  })
})
