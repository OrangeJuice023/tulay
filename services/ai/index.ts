import type {
  CollaborationSuggestions,
  ConciergeCriteria,
  DraftIntroductionContextInput,
  ExplainMatchContextInput,
  ExtractedGoal,
  IntroductionDraft,
  MatchExplanation,
  SuggestCollaborationContextInput,
  SuggestTagsContextInput,
  SuggestedTags,
} from '@tulay/shared'
import { DemoProvider } from './demo'
import { MetaModelProvider } from './meta'

export { DemoProvider } from './demo'
export {
  META_API_DEFAULT_BASE_URL,
  META_API_DEFAULT_MODEL,
  META_API_MAX_INPUT_CHARS,
  META_API_TIMEOUT_MS,
  MetaModelProvider,
  MetaProviderError,
  type MetaProviderErrorCode,
  type MetaProviderOptions,
} from './meta'

export interface AIProvider {
  extractGoal(input: string): Promise<ExtractedGoal>
  extractCriteria(input: string): Promise<ConciergeCriteria>
  explainMatch(context: ExplainMatchContextInput): Promise<MatchExplanation>
  draftIntroduction(context: DraftIntroductionContextInput): Promise<IntroductionDraft>
  suggestCollaboration(context: SuggestCollaborationContextInput): Promise<CollaborationSuggestions>
  suggestTags(context: SuggestTagsContextInput): Promise<SuggestedTags>
}

export function getAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER || 'demo'
  // MODEL_API_KEY is canonical; META_MODEL_API_KEY stays as a legacy fallback.
  const apiKey = process.env.MODEL_API_KEY || process.env.META_MODEL_API_KEY
  if (provider === 'meta' && apiKey) {
    return new MetaModelProvider()
  }
  return new DemoProvider()
}
