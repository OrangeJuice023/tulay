import type {
  ArkoChatContextInput,
  ArkoChatReply,
  CollaborationSuggestions,
  ConciergeCriteria,
  DeckOutline,
  DraftDeckOutlineContextInput,
  DraftIntroductionContextInput,
  ExplainMatchContextInput,
  ExtractedGoal,
  ImproveResumeSectionContextInput,
  IntroductionDraft,
  ResumeSuggestion,
  MatchExplanation,
  SuggestCollaborationContextInput,
  SuggestTagsContextInput,
  SuggestedTags,
  TranscribeVoiceInputInput,
  VoiceTranscript,
} from '@tulay/shared'
import { DemoProvider } from './demo'
import { MetaModelProvider } from './meta'

export { DemoProvider } from './demo'
export {
  CHAT_FUNCTION_WORD_ANCHORS,
  CHAT_INTEGRITY_LEAK_PHRASES,
  META_API_DEFAULT_BASE_URL,
  META_API_DEFAULT_MODEL,
  META_API_MAX_INPUT_CHARS,
  META_API_TIMEOUT_MS,
  META_ASR_AUDIO_PART,
  META_ASR_REQUEST_PART,
  META_ASR_TRANSCRIBE_PATH,
  MetaModelProvider,
  MetaProviderError,
  detectChatIntegritySignals,
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
  chat(context: ArkoChatContextInput): Promise<ArkoChatReply>
  transcribeAudio(input: TranscribeVoiceInputInput): Promise<VoiceTranscript>
  draftDeckOutline(context: DraftDeckOutlineContextInput): Promise<DeckOutline>
  improveResumeSection(context: ImproveResumeSectionContextInput): Promise<ResumeSuggestion>
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
