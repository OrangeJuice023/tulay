import {
  ArkoChatContextInput,
  ArkoChatContextSchema,
  ArkoChatReply,
  ArkoChatReplySchema,
  ChatIntent,
  CollaborationSuggestions,
  CollaborationSuggestionsSchema,
  ConciergeCriteria,
  ConciergeCriteriaSchema,
  ConciergeRelationship,
  DECK_TEMPLATES,
  DeckOutline,
  DeckOutlineSchema,
  DraftDeckOutlineContextInput,
  DraftDeckOutlineContextSchema,
  DraftIntroductionContextInput,
  DraftIntroductionContextSchema,
  ExplainMatchContextInput,
  ExplainMatchContextSchema,
  ExtractedGoal,
  ExtractedGoalSchema,
  IntroductionDraft,
  IntroductionDraftSchema,
  ImproveResumeSectionContextInput,
  ImproveResumeSectionContextSchema,
  MatchExplanation,
  MatchExplanationSchema,
  SuggestCollaborationContextInput,
  SuggestCollaborationContextSchema,
  SuggestTagsContextInput,
  SuggestTagsContextSchema,
  SuggestedTags,
  SuggestedTagsSchema,
  ResumeSuggestion,
  ResumeSuggestionSchema,
  TranscribeVoiceInputInput,
  TranscribeVoiceInputSchema,
  VoiceTranscript,
  VoiceTranscriptSchema,
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
    return SuggestedTagsSchema.parse({ tags: scanTags(valid.text, valid.vocabulary) })
  }

  async transcribeAudio(input: TranscribeVoiceInputInput): Promise<VoiceTranscript> {
    const valid = TranscribeVoiceInputSchema.parse(input)
    return VoiceTranscriptSchema.parse({
      transcript:
        'Demo transcript — replace this with what you said, or connect a model key for live transcription.',
      durationSec: valid.durationSec,
    })
  }

  async draftDeckOutline(context: DraftDeckOutlineContextInput): Promise<DeckOutline> {
    const valid = DraftDeckOutlineContextSchema.parse(context)
    const template = DECK_TEMPLATES[valid.template]
    const facts = [valid.purpose, valid.audience, valid.context].map((fact) => fact.trim()).filter(Boolean)
    const firstFact = facts[0]?.split(/(?<=[.!?])\s/)[0]?.slice(0, 200) ?? valid.title
    const slides = template.slides.map((title, index) => ({
      title,
      bullets:
        index === 0
          ? [valid.title, ...(valid.audience.trim() ? [`For ${valid.audience.trim()}`] : [])]
          : [`${firstFact} (demo draft — edit me)`, `[Add supporting detail for ${title}]`],
    }))
    return DeckOutlineSchema.parse({ slides })
  }

  async improveResumeSection(context: ImproveResumeSectionContextInput): Promise<ResumeSuggestion> {
    const valid = ImproveResumeSectionContextSchema.parse(context)
    const sectionLabel =
      valid.section === 'summary'
        ? 'summary'
        : valid.section === 'experience'
          ? 'experience entry'
          : valid.section === 'skills'
            ? 'skills list'
            : 'project entry'
    const role = valid.targetRole.trim()
    return ResumeSuggestionSchema.parse({
      rewritten: `${valid.text.trim()} (demo suggestion — edit me)`,
      improvements: [
        `Demo rewrite of your ${sectionLabel}; connect a model key for a live rewrite${role ? ` tuned toward ${role}` : ''}.`,
        'Lead with the strongest fact first.',
      ],
      missingInfo: [
        'Which tools or skills did you use day to day? [Add tools]',
        'What changed because of your work? [Add one result]',
      ],
    })
  }

  async chat(context: ArkoChatContextInput): Promise<ArkoChatReply> {
    const valid = ArkoChatContextSchema.parse(context)
    const text = valid.message.trim()
    const lower = text.toLowerCase()
    const name = valid.displayName?.trim() ? ` ${valid.displayName.trim().split(/\s+/)[0]}` : ''

    const seekingPeople = PEOPLE_PATTERNS.some((pattern) => pattern.test(lower))
    const portfolioAsk = /portfolio|review my|feedback on|critique/.test(lower)
    const adviceAsk = /how do i|how can i|advice|career move|shift(ing)? careers?|transition|grow my|next step|stuck|figure out/.test(lower)
    const goalAsk = /\bi want to\b|\bmy goal is\b|\bi('m| am) (trying|learning|becoming)\b/.test(lower)
    const greeting = /^(hi|hello|hey|good (morning|afternoon|evening)|kumusta)\b/.test(lower) && text.length < 40

    let intent: ChatIntent = 'unclear'
    if (seekingPeople || portfolioAsk) intent = portfolioAsk && !seekingPeople ? 'portfolio-feedback' : 'looking-for-people'
    else if (goalAsk) intent = 'goal-setting'
    else if (adviceAsk) intent = 'career-advice'
    else if (greeting) intent = 'small-talk'

    const tags = scanTags(text, valid.vocabulary)
    const relationship =
      RELATIONSHIP_KEYWORDS.find(([, pattern]) => pattern.test(lower))?.[0] ??
      (portfolioAsk ? 'peer' : 'other')

    const meaningful = lower.split(/[^a-z0-9]+/).filter((token) => token.length >= 3).length
    const vaguePeopleAsk = intent === 'looking-for-people' && tags.length === 0 && meaningful < 6 && !portfolioAsk

    if (intent === 'small-talk') {
      return ArkoChatReplySchema.parse({
        reply: `Hi${name}! Tell me about your next career move in one sentence, and I'll help you find the right people for it.`,
        intent,
        needsClarification: false,
        lookingForPeople: false,
      })
    }

    if (intent === 'unclear') {
      return ArkoChatReplySchema.parse({
        reply: `I want to point you at the right help${name}. Are you looking for a person (a mentor, collaborator or co-founder), or for advice on your next move?`,
        intent,
        needsClarification: true,
        clarifyingQuestion: 'Are you looking for a person to meet, or for advice on your next career move?',
        lookingForPeople: false,
      })
    }

    if (vaguePeopleAsk) {
      return ArkoChatReplySchema.parse({
        reply: `I can search the community for you${name}. What exactly do you need help with — for example, portfolio feedback, pricing advice, or finding a co-founder?`,
        intent,
        needsClarification: true,
        clarifyingQuestion: 'What exactly do you need help with? One concrete thing works best.',
        lookingForPeople: true,
        relationship,
      })
    }

    if (intent === 'looking-for-people' || intent === 'portfolio-feedback') {
      const needText = portfolioAsk && tags.length === 0
        ? 'Someone to review my portfolio and give concrete feedback'
        : text
      return ArkoChatReplySchema.parse({
        reply: portfolioAsk
          ? `Got it${name} — you want fresh eyes on your portfolio. Let me search for people who offer that.`
          : `Got it${name} — let me search for people who can help with that.`,
        intent,
        needsClarification: false,
        lookingForPeople: true,
        relationship,
        extractedNeed: { description: needText.slice(0, 2000), tags: tags.slice(0, 10) },
      })
    }

    if (intent === 'goal-setting') {
      return ArkoChatReplySchema.parse({
        reply: `That's a solid direction${name}. What's the first obstacle between you and that goal? Tell me and I'll search the community for the right help.`,
        intent,
        needsClarification: true,
        clarifyingQuestion: 'What is the first obstacle between you and that goal?',
        lookingForPeople: false,
        goal: text.slice(0, 500),
      })
    }

    return ArkoChatReplySchema.parse({
      reply: `Here's how I'd think about that${name}: name one concrete obstacle, then meet one person who's beaten it. Tell me the obstacle and I'll search the community. For bigger picture thinking, the guided journey maps career moves step by step.`,
      intent,
      needsClarification: false,
      lookingForPeople: false,
    })
  }
}

function scanTags(text: string, vocabulary: string[]): string[] {
  const lower = text.toLowerCase()
  return vocabulary
    .filter((tag) =>
      tag
        .toLowerCase()
        .split(/[-_\s]+/)
        .every((part) => part.length > 0 && lower.includes(part)),
    )
    .slice(0, 10)
}

const PEOPLE_PATTERNS = [
  /\bmentor\b/,
  /\bco[\s-]?founder\b/,
  /\bcollaborat/,
  /\bpeer\b|\bfellow\b/,
  /\badvis[eo]r\b/,
  /\bearly[\s-]?user|\bbeta[\s-]?tester\b/,
  /\bfind me\b/,
  /\blooking for\b/,
  /\bsomeone who\b/,
  /\bsomebody who\b/,
  /\bmeet (someone|people|a|an)\b/,
  /\bconnect me\b/,
  /\bneed (a|an|some)\b/,
  /\breview my\b/,
  /\bfeedback on\b/,
  /\bhelp (me |us )?with\b/,
]
