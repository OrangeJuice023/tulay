import { ExtractedGoal, ExtractedGoalSchema, MatchExplanation, MatchExplanationSchema } from '@tulay/shared'

export interface AIProvider {
  extractGoal(input: string): Promise<ExtractedGoal>
  explainMatch(context: any): Promise<MatchExplanation>
  draftIntroduction(context: any): Promise<{ message: string }>
  suggestCollaboration(context: any): Promise<{ suggestions: string[] }>
}

export class DemoProvider implements AIProvider {
  async extractGoal(input: string): Promise<ExtractedGoal> {
    const result = {
      goal: input,
      needs: ['guidance', 'feedback'],
      offers: ['experience sharing'],
      skills: ['communication'],
      preferences: {}
    }
    return ExtractedGoalSchema.parse(result)
  }

  async explainMatch(context: any): Promise<MatchExplanation> {
    const result = {
      explanation: 'This is a demo match based on complementary goals and skills.',
      compatibilityFactors: ['complementary needs', 'shared interests'],
      suggestedCollaboration: 'Start with a 30-minute conversation to share experiences.'
    }
    return MatchExplanationSchema.parse(result)
  }

  async draftIntroduction(context: any): Promise<{ message: string }> {
    return { message: 'Hi! I saw we might be able to help each other. Would you be open to a quick chat?' }
  }

  async suggestCollaboration(context: any): Promise<{ suggestions: string[] }> {
    return { suggestions: ['Share portfolio for review', 'Practice interview questions', 'Discuss career transition strategy'] }
  }
}

export class MetaModelProvider implements AIProvider {
  async extractGoal(input: string): Promise<ExtractedGoal> {
    // TODO: Implement actual Meta Model API call
    // For now, fall back to demo if not implemented
    return new DemoProvider().extractGoal(input)
  }

  async explainMatch(context: any): Promise<MatchExplanation> {
    return new DemoProvider().explainMatch(context)
  }

  async draftIntroduction(context: any): Promise<{ message: string }> {
    return new DemoProvider().draftIntroduction(context)
  }

  async suggestCollaboration(context: any): Promise<{ suggestions: string[] }> {
    return new DemoProvider().suggestCollaboration(context)
  }
}

export function getAIProvider(): AIProvider {
  const hasKey = process.env.META_MODEL_API_KEY
  const provider = process.env.AI_PROVIDER || 'demo'
  if (provider === 'meta' && hasKey) {
    return new MetaModelProvider()
  }
  return new DemoProvider()
}
