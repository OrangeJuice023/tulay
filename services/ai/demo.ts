import {
  CollaborationSuggestions,
  CollaborationSuggestionsSchema,
  ConciergeCriteria,
  ConciergeCriteriaSchema,
  ConciergeRelationship,
  DraftIntroductionContextInput,
  DraftIntroductionContextSchema,
  ExplainMatchContextInput,
  ExplainMatchContextSchema,
  ExtractedGoal,
  ExtractedGoalSchema,
  IntroductionDraft,
  IntroductionDraftSchema,
  MatchExplanation,
  MatchExplanationSchema,
  SuggestCollaborationContextInput,
  SuggestCollaborationContextSchema,
  SuggestTagsContextInput,
  SuggestTagsContextSchema,
  SuggestedTags,
  SuggestedTagsSchema,
} from '@tulay/shared'
import type { AIProvider } from './index'

/**
 * Deterministic demo provider. `extractGoal` returns fixed needs regardless of
 * input; acceptable for demo mode, but the UI must label it (product rule 4).
 * `extractCriteria` echoes the input as the description with a keyword-scanned
 * relationship guess; skills stay empty for the grounding step to fill.
 * Makes no network calls and needs no credentials.
 */
const RELATIONSHIP_KEYWORDS: Array<[ConciergeRelationship, RegExp]> = [
  ['co-founder', /\bco[\s-]?founder\b/],
  ['mentor', /\bmentor/],
  ['advisor', /\badvis[eo]r/],
  ['early-user', /\bearly[\s-]?user|\bbeta[\s-]?tester|\bfirst (customer|client|user)/],
  ['peer', /\bpeer\b|\bfellow\b|\blike[\s-]?minded\b/],
  ['collaborator', /\bcollaborat/],
]

export class DemoProvider implements AIProvider {
  async extractGoal(input: string): Promise<ExtractedGoal> {
    const result = {
      goal: input,
      needs: ['guidance', 'feedback'],
      offers: ['experience sharing'],
      skills: ['communication'],
      preferences: {},
    }
    return ExtractedGoalSchema.parse(result)
  }

  async extractCriteria(input: string): Promise<ConciergeCriteria> {
    const text = input.trim()
    const relationship =
      RELATIONSHIP_KEYWORDS.find(([, pattern]) => pattern.test(text.toLowerCase()))?.[0] ?? 'other'
    return ConciergeCriteriaSchema.parse({ relationship, skills: [], description: text })
  }

  async explainMatch(context: ExplainMatchContextInput): Promise<MatchExplanation> {
    ExplainMatchContextSchema.parse(context)
    const result = {
      explanation: 'This is a demo match based on complementary goals and skills.',
      compatibilityFactors: ['complementary needs', 'shared interests'],
      suggestedCollaboration: 'Start with a 30-minute conversation to share experiences.',
    }
    return MatchExplanationSchema.parse(result)
  }

  async draftIntroduction(context: DraftIntroductionContextInput): Promise<IntroductionDraft> {
    DraftIntroductionContextSchema.parse(context)
    return IntroductionDraftSchema.parse({
      message:
        'Hi! I saw we might be able to help each other. Would you be open to a quick chat?',
    })
  }

  async suggestCollaboration(
    context: SuggestCollaborationContextInput,
  ): Promise<CollaborationSuggestions> {
    SuggestCollaborationContextSchema.parse(context)
    return CollaborationSuggestionsSchema.parse({
      suggestions: [
        'Share portfolio for review',
        'Practice interview questions',
        'Discuss career transition strategy',
      ],
    })
  }

  async suggestTags(context: SuggestTagsContextInput): Promise<SuggestedTags> {
    const valid = SuggestTagsContextSchema.parse(context)
    const text = valid.text.toLowerCase()
    const tags = valid.vocabulary
      .filter((tag) =>
        tag
          .toLowerCase()
          .split(/[-_\s]+/)
          .every((part) => part.length > 0 && text.includes(part)),
      )
      .slice(0, 10)
    return SuggestedTagsSchema.parse({ tags })
  }
}
