'use server'

import { getAIProvider } from '@tulay/ai'
import { DeckOutlineSchema, DraftDeckOutlineContextSchema } from '@tulay/shared'

export type DraftOutlineResult =
  | { ok: true; data: { outline: unknown; source: 'live' | 'demo' } }
  | { ok: false; error: string }

/**
 * Drafts a deck outline from user-provided facts. Uses the live model when
 * configured, otherwise the deterministic demo provider. The source is
 * returned so the UI can label AI vs demo drafts honestly.
 */
export async function draftOutlineAction(input: unknown): Promise<DraftOutlineResult> {
  const parsed = DraftDeckOutlineContextSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the deck details.' }
  const provider = getAIProvider()
  const source = provider.constructor.name === 'MetaModelProvider' ? 'live' : 'demo'
  try {
    const outline = await provider.draftDeckOutline(parsed.data)
    const validated = DeckOutlineSchema.safeParse(outline)
    if (!validated.success) return { ok: false, error: 'The draft came back malformed. Try again.' }
    return { ok: true, data: { outline: validated.data, source } }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'The draft failed. Try again.' }
  }
}
