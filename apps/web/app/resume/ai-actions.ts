'use server'

import { DemoProvider, getAIProvider } from '@tulay/ai'
import { ImproveResumeSectionContextSchema, ResumeSuggestionSchema } from '@tulay/shared'

export type ImproveSectionResult =
  | { ok: true; data: { suggestion: unknown; source: 'live' | 'demo' } }
  | { ok: false; error: string }

/**
 * Suggests an improved resume section from user-provided text. Uses the live
 * model when configured, otherwise the deterministic demo provider. The source
 * is returned so the UI can label AI vs demo suggestions honestly. The
 * suggestion is a draft the user reviews — nothing is applied automatically.
 */
export async function improveSectionAction(input: unknown): Promise<ImproveSectionResult> {
  const parsed = ImproveResumeSectionContextSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Add some text first.' }
  const provider = getAIProvider()
  const source = provider.constructor.name === 'MetaModelProvider' ? 'live' : 'demo'
  try {
    const suggestion = await provider.improveResumeSection(parsed.data)
    const validated = ResumeSuggestionSchema.safeParse(suggestion)
    if (!validated.success) return { ok: false, error: 'The suggestion came back malformed. Try again.' }
    return { ok: true, data: { suggestion: validated.data, source } }
  } catch {
    // Live model failures (timeout, rate limit, key trouble) fall back to a
    // labelled demo suggestion so the review flow stays usable. Same pattern
    // as Ask Arko chat and introduction drafts.
    try {
      const fallback = await new DemoProvider().improveResumeSection(parsed.data)
      return { ok: true, data: { suggestion: fallback, source: 'demo' } }
    } catch {
      return { ok: false, error: 'The suggestion failed. Try again.' }
    }
  }
}
