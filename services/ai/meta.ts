import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import {
  ArkoChatContextInput,
  ArkoChatContextSchema,
  ArkoChatReply,
  ArkoChatReplySchema,
  CollaborationSuggestions,
  CollaborationSuggestionsSchema,
  ConciergeCriteria,
  ConciergeCriteriaSchema,
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
  VOICE_MAX_DURATION_SEC,
  VOICE_TRANSCRIBE_MODEL,
  VoiceTranscript,
  VoiceTranscriptSchema,
} from '@tulay/shared'
import type { AIProvider } from './index'

/**
 * Real Meta Model API provider (Chat Completions + structured output).
 *
 * Wire-protocol provenance (all "Reported", retrieved 2026-10-29; Kilo's
 * primary-source confirmation in `docs/AI_AGENT_DESIGN.md` is still open):
 * base URL, Bearer `MODEL_API_KEY` auth, `POST /v1/chat/completions`, and
 * `response_format` with `type: "json_schema"` are corroborated across
 * independent public sources; `muse-spark-1.3` is the latest Standard
 * checkpoint (`muse-spark-1.2` previous) on the identical API surface.
 * Only this minimal, corroborated parameter surface is sent
 * (model, messages, response_format): no reasoning, temperature, or token
 * knobs are assumed. Live-verified 2026-11-04 with exactly one `extractGoal`
 * request (see `docs/AI_AGENT_DESIGN.md`); all other behaviour is verified
 * with mocked HTTP only.
 *
 * Safety rules: the key lives in a true private field (never serialized into
 * errors or JSON), prompts and user text never appear in errors or logs, every
 * model response is Zod-validated before return, chat replies additionally pass
 * a conservative integrity check (instruction leakage, repetition loops,
 * request echoes, schema directives, format leaks, phonetic degeneration)
 * that quarantines failures with code `integrity`, malformed assistant turns
 * are filtered from outbound history so one bad reply can never poison the
 * next request, each request has a timeout, and nothing is ever retried
 * (credit safety). Every failure — timeout, transport, protocol, contract, or
 * integrity — is logged once as metadata only (operation, code, latency, and
 * counts; never content) before the `MetaProviderError` throw, so latency,
 * errors, and rejection rates are observable without touching user data.
 * This provider never silently returns demo output.
 */

export const META_API_DEFAULT_BASE_URL = 'https://api.meta.ai/v1'
export const META_API_DEFAULT_MODEL = 'muse-spark-1.3'
export const META_API_TIMEOUT_MS = 30_000
export const META_API_MAX_INPUT_CHARS = 8000
export const META_ASR_TRANSCRIBE_PATH = '/asr/transcribe'

/**
 * Multipart shape for the file transcription endpoint, per the official Voice
 * API reference (`dev.meta.ai/docs/api-reference/voice/schemas`, retrieved
 * 2026-11-05): two parts, `request` (transcription settings as JSON) and
 * `audio` (the clip). Confirmed live 2026-11-05: the API rejects anything
 * else ("Both a request and an audio part are required").
 */
export const META_ASR_REQUEST_PART = 'request'
export const META_ASR_AUDIO_PART = 'audio'

export type MetaProviderErrorCode =
  | 'config'
  | 'http'
  | 'network'
  | 'timeout'
  | 'protocol'
  | 'validation'
  | 'integrity'

export class MetaProviderError extends Error {
  readonly code: MetaProviderErrorCode
  readonly operation: string
  readonly status?: number

  constructor(code: MetaProviderErrorCode, operation: string, detail: string, status?: number) {
    super(
      `Meta provider ${operation} failed (${code})${status ? ` [HTTP ${status}]` : ''}: ${detail}`,
    )
    this.name = 'MetaProviderError'
    this.code = code
    this.operation = operation
    this.status = status
  }
}

export interface MetaProviderOptions {
  apiKey?: string
  baseUrl?: string
  model?: string
  timeoutMs?: number
  fetchFn?: typeof fetch
}

const GoalInputSchema = z.string().trim().min(1).max(META_API_MAX_INPUT_CHARS)

function formatIssues(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`).join('; ')
}

function abortName(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'name' in error) {
    const name = (error as { name?: unknown }).name
    return typeof name === 'string' ? name : undefined
  }
  return undefined
}

const SYSTEM_EXTRACT =
  'Extract the career goal from the user text (English or Filipino/Taglish) into JSON matching the schema. goal: the direction they want, in their own words. needs: ONLY concrete obstacles or requests for help the text explicitly states — an empty array when none are stated; never derive needs from the goal. skills: ONLY abilities, tools, or experience the text explicitly states — an empty array when none are stated. offers: ONLY help they explicitly say they can give others — an empty array when none is stated. preferences: stated facts like language or availability only. Never invent people, credentials, or outcomes. Respond with JSON only.'
const SYSTEM_EXPLAIN =
  'Explain why the candidate fits the need using ONLY the provided facts. Never invent skills, credentials, availability, or outcomes. Respond with JSON only.'
const SYSTEM_DRAFT =
  'Draft one short, warm introduction message from the sender to the recipient using ONLY the provided facts. Never invent shared history or credentials. Respond with JSON only.'
const SYSTEM_STEPS =
  'Suggest 1 to 3 concrete, small next steps for the collaboration using ONLY the provided facts. Nothing is scheduled automatically; these are ideas for the users to choose from. Respond with JSON only.'
const SYSTEM_CRITERIA =
  'Extract who the user wants to meet from the user text (English or Filipino/Taglish) into JSON matching the schema: the relationship they look for, the skills or expertise that person should have (phrases from the text), and a one or two sentence description of that person. Use only facts stated in the text. Never invent people, skills, credentials, or outcomes. Respond with JSON only.'
const SYSTEM_TAGS =
  'Select the tags from the vocabulary list that describe the text. Return ONLY tags from the list, spelled exactly as listed. When nothing fits, return an empty list. Respond with JSON only.'
const SYSTEM_DECK =
  'Draft a presentation outline from ONLY the facts given (English or Filipino/Taglish): the title, purpose, audience, context, and template. Follow the provided slide structure in order, using its titles. Every bullet must come from those facts. Never invent market statistics, financial figures, customer traction, investor commitments, testimonials, team credentials, or timelines. When a slide needs facts not provided, write bracketed placeholders like [Add your monthly revenue] instead of guessing. 4 to 12 slides, 1 to 8 bullets each. Respond with JSON only.'
const SYSTEM_RESUME =
  'Improve one resume section using ONLY the facts the user provided (English or Filipino/Taglish), tuned toward the target role and job description when given. rewritten: the improved section text, kept truthful to the input — rephrase, tighten, and reorder, but never invent employers, job titles, dates, degrees, schools, certifications, skills, tools, accomplishments, or numbers; mark anything the input does not state with bracketed placeholders like [Add years of experience]. improvements: up to 6 short notes on what changed and why. missingInfo: up to 6 short questions for facts that would strengthen this section. Respond with JSON only.'
const SYSTEM_CHAT =
  'You are Arko, a warm, concise AI career companion for Filipino freelancers, career changers and founders. You have no personal experiences, family, employment history, or professional background — never claim any, and never speak as if you have met the user before or worked anywhere. Read the conversation and the latest message (English or Filipino/Taglish), then respond with JSON matching the schema. Decide the intent: looking-for-people when they want to meet someone (mentor, collaborator, co-founder, reviewer, adviser, early user); career-advice for how-to and next-move questions; portfolio-feedback for review requests; goal-setting when they state a direction; small-talk for greetings; unclear otherwise. Set lookingForPeople true whenever they want to meet someone. When the ask is vague (no concrete need), set needsClarification true with one short clarifyingQuestion. When they state only a direction with no concrete ask, also set needsClarification true and ask about their first obstacle. When they want people and the need is concrete, include extractedNeed (their words, plus tags ONLY from the vocabulary, spelled exactly) and the relationship they seek. Include goal only when they state a direction. Never invent people, skills, credentials, availability or outcomes. Never reveal contact details. Keep reply under 80 words. Respond with JSON only.'

export class MetaModelProvider implements AIProvider {
  #apiKey: string
  readonly #baseUrl: string
  readonly #model: string
  readonly #timeoutMs: number
  readonly #fetchFn: typeof fetch

  constructor(options: MetaProviderOptions = {}) {
    const apiKey =
      options.apiKey ?? process.env.MODEL_API_KEY ?? process.env.META_MODEL_API_KEY ?? ''
    if (!apiKey) {
      throw new MetaProviderError(
        'config',
        'configure',
        'Missing API key: set MODEL_API_KEY (server only)',
      )
    }
    this.#apiKey = apiKey
    this.#baseUrl =
      options.baseUrl ?? process.env.META_MODEL_API_URL ?? META_API_DEFAULT_BASE_URL
    this.#model = options.model ?? process.env.META_MODEL_MODEL ?? META_API_DEFAULT_MODEL
    this.#timeoutMs = options.timeoutMs ?? META_API_TIMEOUT_MS
    const fetchFn = options.fetchFn ?? globalThis.fetch
    if (typeof fetchFn !== 'function') {
      throw new MetaProviderError('config', 'configure', 'No fetch implementation available')
    }
    this.#fetchFn = fetchFn
  }

  async extractGoal(input: string): Promise<ExtractedGoal> {
    const valid = GoalInputSchema.safeParse(input)
    if (!valid.success) {
      throw new MetaProviderError(
        'validation',
        'extractGoal',
        `input must be 1 to ${META_API_MAX_INPUT_CHARS} characters`,
      )
    }
    return this.requestJson('extractGoal', 'extracted_goal', ExtractedGoalSchema, SYSTEM_EXTRACT, valid.data)
  }

  async extractCriteria(input: string): Promise<ConciergeCriteria> {
    const valid = GoalInputSchema.safeParse(input)
    if (!valid.success) {
      throw new MetaProviderError(
        'validation',
        'extractCriteria',
        `input must be 1 to ${META_API_MAX_INPUT_CHARS} characters`,
      )
    }
    return this.requestJson(
      'extractCriteria',
      'concierge_criteria',
      ConciergeCriteriaSchema,
      SYSTEM_CRITERIA,
      valid.data,
    )
  }

  async explainMatch(context: ExplainMatchContextInput): Promise<MatchExplanation> {
    const valid = ExplainMatchContextSchema.parse(context)
    return this.requestJson(
      'explainMatch',
      'match_explanation',
      MatchExplanationSchema,
      SYSTEM_EXPLAIN,
      JSON.stringify({
        seekerNeed: valid.seekerNeed,
        candidateName: valid.candidateName,
        candidateOffer: valid.candidateOffer,
        sharedLanguages: valid.sharedLanguages,
        candidateAvailability: valid.candidateAvailability ?? null,
        matchFactors: valid.matchFactors,
      }),
    )
  }

  async draftIntroduction(context: DraftIntroductionContextInput): Promise<IntroductionDraft> {
    const valid = DraftIntroductionContextSchema.parse(context)
    return this.requestJson(
      'draftIntroduction',
      'introduction_draft',
      IntroductionDraftSchema,
      SYSTEM_DRAFT,
      JSON.stringify({
        senderName: valid.senderName,
        recipientName: valid.recipientName,
        need: valid.need,
        offer: valid.offer ?? null,
        matchExplanation: valid.matchExplanation ?? null,
      }),
    )
  }

  async suggestCollaboration(
    context: SuggestCollaborationContextInput,
  ): Promise<CollaborationSuggestions> {
    const valid = SuggestCollaborationContextSchema.parse(context)
    return this.requestJson(
      'suggestCollaboration',
      'collaboration_suggestions',
      CollaborationSuggestionsSchema,
      SYSTEM_STEPS,
      JSON.stringify({ goal: valid.goal, need: valid.need, offer: valid.offer }),
    )
  }

  async suggestTags(context: SuggestTagsContextInput): Promise<SuggestedTags> {
    const valid = SuggestTagsContextSchema.parse(context)
    const vocabulary = [...new Set(valid.vocabulary)]
    const result = await this.requestJson(
      'suggestTags',
      'suggested_tags',
      SuggestedTagsSchema,
      SYSTEM_TAGS,
      JSON.stringify({ text: valid.text, vocabulary }),
    )
    return { tags: constrainTags(result.tags, vocabulary, 'suggestTags') }
  }

  async draftDeckOutline(context: DraftDeckOutlineContextInput): Promise<DeckOutline> {
    const valid = DraftDeckOutlineContextSchema.parse(context)
    return this.requestJson(
      'draftDeckOutline',
      'deck_outline',
      DeckOutlineSchema,
      SYSTEM_DECK,
      JSON.stringify({
        title: valid.title,
        purpose: valid.purpose,
        audience: valid.audience,
        context: valid.context,
        template: valid.template,
        structure: DECK_TEMPLATES[valid.template].slides,
      }),
    )
  }

  async improveResumeSection(context: ImproveResumeSectionContextInput): Promise<ResumeSuggestion> {
    const valid = ImproveResumeSectionContextSchema.parse(context)
    return this.requestJson(
      'improveResumeSection',
      'resume_suggestion',
      ResumeSuggestionSchema,
      SYSTEM_RESUME,
      JSON.stringify({
        section: valid.section,
        text: valid.text,
        targetRole: valid.targetRole || null,
        jobDescription: valid.jobDescription || null,
      }),
    )
  }

  async chat(context: ArkoChatContextInput): Promise<ArkoChatReply> {
    const valid = ArkoChatContextSchema.parse(context)
    const vocabulary = [...new Set(valid.vocabulary)]
    // History hygiene: a malformed assistant turn (pre-fix, or persisted by an
    // older client) must never be replayed into the next request. User turns
    // always pass through intact; only assistant turns that fail the integrity
    // check are dropped, and the drop is logged as metadata only.
    const cleanHistory = valid.history.filter(
      (turn) => turn.role === 'user' || detectChatIntegritySignals(turn.text).length === 0,
    )
    const droppedHistory = valid.history.length - cleanHistory.length
    if (droppedHistory > 0) {
      logIntegrityEvent({
        operation: 'chat.history',
        signals: ['history-filtered'],
        replyLength: 0,
        historyCount: valid.history.length,
        droppedHistory,
      })
    }
    const chatStart = Date.now()
    const result = await this.requestJson(
      'chat',
      'arko_chat_reply',
      ArkoChatReplySchema,
      SYSTEM_CHAT,
      JSON.stringify({
        displayName: valid.displayName ?? null,
        history: cleanHistory,
        message: valid.message,
        vocabulary,
      }),
    )
    const signals = detectChatIntegritySignals(result.reply)
    if (signals.length > 0) {
      logIntegrityEvent({
        operation: 'chat',
        signals,
        replyLength: result.reply.length,
        historyCount: cleanHistory.length,
        droppedHistory,
        latencyMs: Date.now() - chatStart,
      })
      throw new MetaProviderError('integrity', 'chat', `response failed integrity check (${signals.join(', ')})`)
    }
    return {
      ...result,
      extractedNeed: result.extractedNeed
        ? { ...result.extractedNeed, tags: constrainTags(result.extractedNeed.tags, vocabulary, 'chat.extractedNeed') }
        : undefined,
      extractedOffer: result.extractedOffer
        ? { ...result.extractedOffer, tags: constrainTags(result.extractedOffer.tags, vocabulary, 'chat.extractedOffer') }
        : undefined,
    }
  }

  /**
   * Push-to-talk transcription via the file endpoint (PUSH_TO_TALK default).
   * Audio travels as multipart form data; it is never logged, persisted, or
   * included in errors. The transcript is the user's own speech, so unlike
   * chat replies it is NOT integrity-checked — checking it could quarantine
   * the user's own words.
   */
  async transcribeAudio(input: TranscribeVoiceInputInput): Promise<VoiceTranscript> {
    const valid = TranscribeVoiceInputSchema.parse(input)
    const start = Date.now()
    const err = (code: MetaProviderErrorCode, detail: string, status?: number): MetaProviderError => {
      logProviderError({ operation: 'transcribeAudio', code, latencyMs: Date.now() - start, status })
      return new MetaProviderError(code, 'transcribeAudio', detail, status)
    }
    const audioBytes = Buffer.from(valid.audioBase64, 'base64')
    if (audioBytes.length === 0) {
      throw err('validation', 'audio payload decoded to zero bytes')
    }

    const form = new FormData()
    form.append(
      META_ASR_AUDIO_PART,
      new Blob([new Uint8Array(audioBytes)], { type: valid.mimeType }),
      'audio.wav',
    )
    form.append(
      META_ASR_REQUEST_PART,
      new Blob(
        [
          JSON.stringify({
            model: VOICE_TRANSCRIBE_MODEL,
            audioEncoding: 'WAV',
            mode: 'PUSH_TO_TALK',
            languageBias: valid.languageBias,
          }),
        ],
        { type: 'application/json' },
      ),
    )

    let response: Response
    try {
      response = await this.#fetchFn(`${this.#baseUrl}${META_ASR_TRANSCRIBE_PATH}`, {
        method: 'POST',
        // Buffered JSON response (docs: Accept selects JSON body vs SSE vs text).
        headers: { Authorization: `Bearer ${this.#apiKey}`, Accept: 'application/json' },
        body: form,
        signal: AbortSignal.timeout(this.#timeoutMs),
      })
    } catch (error) {
      const name = abortName(error)
      if (name === 'TimeoutError' || name === 'AbortError') {
        throw err('timeout', `request exceeded ${this.#timeoutMs}ms`)
      }
      throw err('network', 'request failed before a response arrived')
    }

    if (!response.ok) {
      let excerpt = response.statusText
      try {
        excerpt = (await response.text()).slice(0, 200) || response.statusText
      } catch {
        excerpt = response.statusText
      }
      throw err('http', excerpt, response.status)
    }

    let data: unknown
    try {
      data = await response.json()
    } catch {
      throw err('protocol', 'response body was not JSON')
    }

    // Buffered response shape per the official schema reference:
    // `transcript` (required) + `audioDurationMs` (authoritative duration).
    const record = data as { transcript?: unknown; audioDurationMs?: unknown }
    const serverSec =
      typeof record?.audioDurationMs === 'number' ? Math.floor(record.audioDurationMs / 100) / 10 : NaN
    const validated = VoiceTranscriptSchema.safeParse({
      transcript: record?.transcript,
      durationSec:
        Number.isFinite(serverSec) && serverSec > 0
          ? Math.min(serverSec, VOICE_MAX_DURATION_SEC)
          : valid.durationSec,
    })
    if (!validated.success) {
      throw err('validation', formatIssues(validated.error))
    }
    return validated.data
  }

  private async requestJson<Output>(
    operation: string,
    schemaName: string,
    schema: z.ZodType<Output, z.ZodTypeDef, unknown>,
    system: string,
    user: string,
  ): Promise<Output> {
    const start = Date.now()
    const err = (code: MetaProviderErrorCode, detail: string, status?: number): MetaProviderError => {
      logProviderError({ operation, code, latencyMs: Date.now() - start, status })
      return new MetaProviderError(code, operation, detail, status)
    }
    const body = {
      model: this.#model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: schemaName, schema: zodToJsonSchema(schema) },
      },
    }

    let response: Response
    try {
      response = await this.#fetchFn(`${this.#baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.#apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.#timeoutMs),
      })
    } catch (error) {
      const name = abortName(error)
      if (name === 'TimeoutError' || name === 'AbortError') {
        throw err('timeout', `request exceeded ${this.#timeoutMs}ms`)
      }
      throw err('network', 'request failed before a response arrived')
    }

    if (!response.ok) {
      let excerpt = response.statusText
      try {
        excerpt = (await response.text()).slice(0, 200) || response.statusText
      } catch {
        excerpt = response.statusText
      }
      throw err('http', excerpt, response.status)
    }

    let data: unknown
    try {
      data = await response.json()
    } catch {
      throw err('protocol', 'response body was not JSON')
    }

    const content = extractContent(data)
    if (typeof content !== 'string' || content.length === 0) {
      throw err('protocol', 'response had no message content')
    }

    let decoded: unknown
    try {
      decoded = JSON.parse(content)
    } catch {
      throw err('protocol', 'message content was not JSON')
    }

    const validated = schema.safeParse(decoded)
    if (!validated.success) {
      throw err('validation', formatIssues(validated.error))
    }
    return validated.data
  }
}

function constrainTags(tags: string[], vocabulary: string[], operation: string): string[] {
  const canonical = new Map(vocabulary.map((tag) => [tag.toLowerCase(), tag]))
  const mapped: string[] = []
  for (const tag of tags) {
    const hit = canonical.get(tag.toLowerCase())
    if (!hit) {
      throw new MetaProviderError(
        'validation',
        operation,
        `tag "${tag.slice(0, 40)}" is outside the vocabulary`,
      )
    }
    if (!mapped.includes(hit)) mapped.push(hit)
  }
  return mapped
}

/**
 * Known instruction text that has leaked into a live reply verbatim (first
 * phrase observed 2026-11-04; override phrases from the request-echo incident
 * later the same month). Lowercase; matched as a substring of the lowercased
 * reply.
 */
export const CHAT_INTEGRITY_LEAK_PHRASES = [
  'third-person to second-person pronouns must be consistent',
  'extra instructions from user',
  'system override attempt',
  'override developer instructions',
]

/**
 * Whole-word anchors for the gibberish check: common English function words
 * plus common Tagalog function words. Any natural reply of 25+ words in
 * English, Tagalog, or Taglish contains several of these; phonetic gibberish
 * contains (almost) none. Matching is whole-token, so substrings inside
 * longer words never count.
 */
export const CHAT_FUNCTION_WORD_ANCHORS: ReadonlySet<string> = new Set([
  // English.
  'a', 'an', 'the', 'and', 'or', 'but', 'so', 'if', 'then', 'than', 'that', 'this',
  'these', 'those', 'it', 'its', 'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he',
  'him', 'his', 'she', 'her', 'they', 'them', 'their', 'what', 'which', 'who',
  'when', 'where', 'how', 'why', 'is', 'am', 'are', 'was', 'were', 'be', 'been',
  'do', 'does', 'did', 'have', 'has', 'had', 'can', 'could', 'will', 'would',
  'should', 'may', 'might', 'must', 'shall', 'to', 'of', 'in', 'on', 'for',
  'with', 'from', 'by', 'about', 'into', 'over', 'after', 'before', 'between',
  'through', 'as', 'at', 'no', 'not', 'only', 'just', 'also', 'very', 'more',
  'most', 'one', 'all', 'some', 'any', 'each', 'every', 'other', 'same', 'too',
  'again', 'once', 'here', 'there', 'now', 'today', 'please', 'thanks', 'thank',
  'hello', 'hi', 'hey', 'yes', 'ok', 'okay', 'well', 'let', 'know', 'get',
  'give', 'take', 'make', 'like', 'want', 'need', 'help', 'find', 'search',
  'tell', 'ask', 'try', 'start', 'work', 'next', 'first', 'new', 'good',
  'great', 'best', 'right', 'sure', 'able', 'career', 'mentor', 'job', 'role', 'goal',
  // Tagalog (covers Taglish code-switching; never a separate API language).
  'ang', 'ng', 'nang', 'mga', 'sa', 'na', 'ay', 'at', 'o', 'pero', 'kasi',
  'habang', 'kapag', 'kung', 'para', 'dahil', 'upang', 'ni', 'kay', 'ako',
  'ikaw', 'ka', 'ko', 'kong', 'mo', 'kami', 'kayo', 'tayo', 'sila', 'niya',
  'nila', 'kaniya', 'kanila', 'kita', 'ito', 'iyan', 'iyon', 'yan', 'yun',
  'dito', 'diyan', 'doon', 'ganito', 'ganyan', 'ganoon', 'hindi', 'ba', 'pa',
  'man', 'din', 'rin', 'daw', 'raw', 'lang', 'lamang', 'muna', 'ulit',
  'naman', 'nga', 'pala', 'gusto', 'nais', 'pwede', 'puwede', 'puede',
  'maaari', 'kailangan', 'dapat', 'huwag', 'wag', 'salamat', 'oo', 'bakit',
  'paano', 'saan', 'sino', 'ano', 'kailan', 'ilan', 'gaano', 'kumusta',
  'kamusta', 'bago', 'trabaho', 'tulong', 'tao', 'araw', 'ngayon', 'bukas',
])

/**
 * Conservative response-integrity signals for free-form chat replies.
 * Returns signal names (empty = clean). Deliberately narrow: it flags only
 * known instruction leakage, obvious repetition loops, serialized internal
 * request echoes, embedded schema/output-format directives, JSON scaffolding,
 * and phonetic degeneration in the reply text. It never flags legitimate
 * first-person language ("I can help", "my suggestion") or prose mentions of
 * JSON, APIs, or programming — those match only spaced prose, never the wire
 * tokens and token pairs below — and the degeneration check exempts short
 * replies and anything with normal function words or vowel ratios.
 */
export function detectChatIntegritySignals(reply: string): string[] {
  const signals = new Set<string>()
  const lower = reply.toLowerCase()

  if (CHAT_INTEGRITY_LEAK_PHRASES.some((phrase) => lower.includes(phrase))) {
    signals.add('instruction-leak')
  }

  // Serialized internal request payload echoed into the reply. The outbound
  // chat request always serializes displayName and vocabulary together, a pair
  // that never co-occurs in legitimate career advice. Notes on precision:
  // spaceless "displayname" does not match prose "display name", and either
  // word alone (e.g. "technical vocabulary") does not fire.
  if (lower.includes('{') && lower.includes('displayname') && lower.includes('vocabulary')) {
    signals.add('request-echo')
  }

  // Embedded output-format override: API wire tokens, never prose. Spaced
  // "JSON schema" / "response format" in legitimate answers do not match.
  if (lower.includes('response_format') || lower.includes('json_schema')) {
    signals.add('schema-directive')
  }

  // Same long sentence three or more times.
  const sentences = lower
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 20)
  const sentenceCounts = new Map<string, number>()
  for (const sentence of sentences) {
    const count = (sentenceCounts.get(sentence) ?? 0) + 1
    sentenceCounts.set(sentence, count)
    if (count >= 3) signals.add('repetition-loop')
  }

  // Same 8-word run three or more times (catches loops without punctuation).
  const words = lower.split(/\s+/).filter(Boolean)
  if (words.length >= 24) {
    const shingles = new Map<string, number>()
    for (let index = 0; index + 8 <= words.length; index += 1) {
      const key = words.slice(index, index + 8).join(' ')
      const count = (shingles.get(key) ?? 0) + 1
      shingles.set(key, count)
      if (count >= 3) {
        signals.add('repetition-loop')
        break
      }
    }
  }

  // Degenerate output: many words but almost no vocabulary.
  if (words.length >= 20) {
    const unique = new Set(words).size
    if (unique <= Math.max(3, Math.floor(words.length / 10))) {
      signals.add('repetition-loop')
    }
  }

  // JSON scaffolding leaked into the reply text itself.
  if (lower.includes('{"') && lower.includes('"reply"')) {
    signals.add('format-leak')
  }

  // Phonetic degeneration: fluent but meaningless token streams. Repetition
  // checks miss these because every token is unique, and Zod only validates
  // shape — so a reply of 25+ letter-tokens with fewer than 2 function-word
  // anchors (English or Tagalog) is not natural language in any supported
  // tongue. The bar is <2 rather than 0 so one accidental collision cannot
  // rescue extensive gibberish; natural replies carry many anchors.
  const letterTokens = lower.split(/[^a-z]+/).filter((token) => token.length > 0)
  if (letterTokens.length >= 25) {
    const anchors = letterTokens.filter((token) => CHAT_FUNCTION_WORD_ANCHORS.has(token)).length
    if (anchors < 2) signals.add('gibberish')
  }

  // Backstop for consonant-mash degeneration that happens to contain a real
  // word or two: natural prose is 35–50% vowels, so under 20% across 100+
  // letters is decisively not prose.
  const lettersOnly = lower.replace(/[^a-z]/g, '')
  if (lettersOnly.length >= 100) {
    const vowels = lettersOnly.replace(/[^aeiou]/g, '').length
    if (vowels / lettersOnly.length < 0.2) signals.add('gibberish')
  }

  return [...signals]
}

function logIntegrityEvent(event: {
  operation: string
  signals: string[]
  replyLength: number
  historyCount: number
  droppedHistory: number
  latencyMs?: number
}): void {
  // Metadata only: lengths and counts, never keys, prompts, or message text.
  try {
    console.warn(`[tulay-ai-integrity] ${JSON.stringify({ ...event, at: new Date().toISOString() })}`)
  } catch {
    // Logging must never break the request path.
  }
}

/**
 * One metadata-only line per provider failure (timeout, transport, protocol,
 * contract). Successes stay silent; failures carry operation, code, latency,
 * and HTTP status so error and latency rates are observable. Never content.
 */
function logProviderError(event: {
  operation: string
  code: MetaProviderErrorCode
  latencyMs: number
  status?: number
}): void {
  try {
    console.warn(`[tulay-ai-error] ${JSON.stringify({ ...event, at: new Date().toISOString() })}`)
  } catch {
    // Logging must never break the request path.
  }
}

function extractContent(data: unknown): unknown {
  if (typeof data !== 'object' || data === null || !('choices' in data)) return undefined
  const choices = (data as { choices?: unknown }).choices
  if (!Array.isArray(choices) || choices.length === 0) return undefined
  const first = choices[0] as { message?: { content?: unknown } }
  return first?.message?.content
}
