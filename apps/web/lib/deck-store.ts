import { Deck, DeckSchema } from '@tulay/shared'

/**
 * Guest deck storage: localStorage only, honestly labelled in the UI as
 * "saved in this browser only". Signed-in users persist to Supabase instead.
 */

const KEY = 'tulay.decks.v1'

export function loadLocalDecks(): Deck[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const decks: Deck[] = []
    for (const entry of parsed) {
      const valid = DeckSchema.safeParse(entry)
      if (valid.success) decks.push(valid.data)
    }
    return decks.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
  } catch {
    return []
  }
}

export function saveLocalDecks(decks: Deck[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(decks.slice(0, 20)))
  } catch {
    // Private-mode quota: the editor keeps working in memory.
  }
}
