import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import {
  CollaborationSuggestions,
  CollaborationSuggestionsSchema,
  ConciergeCriteria,
  ConciergeCriteriaSchema,
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
 * knobs are assumed. No live request has been performed yet: behaviour is
 * verified with mocked HTTP only.
 *
 * Safety rules: the key lives in a true private field (never serialized into
 * errors or JSON), prompts and user text never appear in errors or logs, every
 * model response is Zod-validated before return, each request has a timeout,
 * and nothing is ever retried (credit safety). On any failure this provider
 * throws `MetaProviderError`; it never silently returns demo output.
 */

export const META_API_DEFAULT_BASE_URL = 'https://api.meta.ai/v1'
export const META_API_DEFAULT_MODEL = 'muse-spark-1.3'
export const META_API_TIMEOUT_MS = 30_000
export const META_API_MAX_INPUT_CHARS = 8000

export type MetaProviderErrorCode =
  | 'config'
  | 'http'
  | 'network'
  | 'timeout'
  | 'protocol'
  | 'validation'

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
  'Extract the career goal from the user text (English or Filipino/Taglish) into JSON matching the schema. Use only facts stated in the text. Never invent people, skills, credentials, or outcomes. Respond with JSON only.'
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
    const canonical = new Map(vocabulary.map((tag) => [tag.toLowerCase(), tag]))
    const mapped: string[] = []
    for (const tag of result.tags) {
      const hit = canonical.get(tag.toLowerCase())
      if (!hit) {
        throw new MetaProviderError(
          'validation',
          'suggestTags',
          `tag "${tag.slice(0, 40)}" is outside the vocabulary`,
        )
      }
      if (!mapped.includes(hit)) mapped.push(hit)
    }
    return { tags: mapped }
  }

  private async requestJson<Output>(
    operation: string,
    schemaName: string,
    schema: z.ZodType<Output, z.ZodTypeDef, unknown>,
    system: string,
    user: string,
  ): Promise<Output> {
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
        throw new MetaProviderError(
          'timeout',
          operation,
          `request exceeded ${this.#timeoutMs}ms`,
        )
      }
      throw new MetaProviderError('network', operation, 'request failed before a response arrived')
    }

    if (!response.ok) {
      let excerpt = response.statusText
      try {
        excerpt = (await response.text()).slice(0, 200) || response.statusText
      } catch {
        excerpt = response.statusText
      }
      throw new MetaProviderError('http', operation, excerpt, response.status)
    }

    let data: unknown
    try {
      data = await response.json()
    } catch {
      throw new MetaProviderError('protocol', operation, 'response body was not JSON')
    }

    const content = extractContent(data)
    if (typeof content !== 'string' || content.length === 0) {
      throw new MetaProviderError('protocol', operation, 'response had no message content')
    }

    let decoded: unknown
    try {
      decoded = JSON.parse(content)
    } catch {
      throw new MetaProviderError('protocol', operation, 'message content was not JSON')
    }

    const validated = schema.safeParse(decoded)
    if (!validated.success) {
      throw new MetaProviderError('validation', operation, formatIssues(validated.error))
    }
    return validated.data
  }
}

function extractContent(data: unknown): unknown {
  if (typeof data !== 'object' || data === null || !('choices' in data)) return undefined
  const choices = (data as { choices?: unknown }).choices
  if (!Array.isArray(choices) || choices.length === 0) return undefined
  const first = choices[0] as { message?: { content?: unknown } }
  return first?.message?.content
}
