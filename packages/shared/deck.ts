import { z } from 'zod'

/**
 * Pitch Deck Studio contracts. Decks are founder-authored presentations;
 * AI may only draft outlines from user-provided facts, never invent market
 * statistics, traction, or testimonials. Unknowns stay as bracketed
 * placeholders the owner fills in.
 */

export const DeckTemplateSchema = z.enum(['startup', 'proposal', 'portfolio'])
export type DeckTemplate = z.infer<typeof DeckTemplateSchema>

export const DeckSlideSchema = z.object({
  id: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(160),
  bullets: z.array(z.string().trim().min(1).max(500)).max(8).default([]),
})
export type DeckSlide = z.infer<typeof DeckSlideSchema>

export const DeckSourceSchema = z.enum(['manual', 'ai-draft'])
export type DeckSource = z.infer<typeof DeckSourceSchema>

export const DeckSchema = z.object({
  id: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(160),
  purpose: z.string().trim().max(2000).default(''),
  audience: z.string().trim().max(500).default(''),
  context: z.string().trim().max(4000).default(''),
  template: DeckTemplateSchema,
  slides: z.array(DeckSlideSchema).min(1).max(30),
  source: DeckSourceSchema.default('manual'),
  updatedAt: z.string().datetime({ offset: true }),
})
export type Deck = z.infer<typeof DeckSchema>

export const DeckOutlineSlideSchema = z.object({
  title: z.string().trim().min(1).max(160),
  bullets: z.array(z.string().trim().min(1).max(500)).min(1).max(8),
})
export type DeckOutlineSlide = z.infer<typeof DeckOutlineSlideSchema>

export const DeckOutlineSchema = z.object({
  slides: z.array(DeckOutlineSlideSchema).min(4).max(12),
})
export type DeckOutline = z.infer<typeof DeckOutlineSchema>

export const DraftDeckOutlineContextSchema = z.object({
  title: z.string().trim().min(1).max(160),
  purpose: z.string().trim().max(2000).default(''),
  audience: z.string().trim().max(500).default(''),
  context: z.string().trim().max(4000).default(''),
  template: DeckTemplateSchema,
})
export type DraftDeckOutlineContext = z.infer<typeof DraftDeckOutlineContextSchema>
export type DraftDeckOutlineContextInput = z.input<typeof DraftDeckOutlineContextSchema>

export type DeckTemplateInfo = {
  label: string
  blurb: string
  slides: string[]
}

/** Deterministic slide structure per template; content always comes from the user or AI draft. */
export const DECK_TEMPLATES: Record<DeckTemplate, DeckTemplateInfo> = {
  startup: {
    label: 'Startup pitch deck',
    blurb: 'Problem, solution, and traction story for founders seeking feedback or funding.',
    slides: ['Cover', 'Problem', 'Solution', 'Product', 'Market', 'Business model', 'Traction', 'Team', 'The ask'],
  },
  proposal: {
    label: 'Project proposal',
    blurb: 'Context, approach, and next steps for client or stakeholder buy-in.',
    slides: ['Cover', 'Context', 'Goals', 'Approach', 'Timeline', 'Budget', 'Risks', 'Next steps'],
  },
  portfolio: {
    label: 'Personal portfolio',
    blurb: 'Selected work and credibility for career changers and freelancers.',
    slides: ['Cover', 'About me', 'Selected work', 'Case study', 'Skills', 'Kind words', 'Contact'],
  },
}

function slideId(): string {
  return `slide-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`
}

export function createDeck(input: {
  id: string
  title: string
  template: DeckTemplate
  purpose?: string
  audience?: string
  context?: string
  source?: DeckSource
}): Deck {
  const template = DECK_TEMPLATES[input.template]
  return DeckSchema.parse({
    id: input.id,
    title: input.title,
    purpose: input.purpose ?? '',
    audience: input.audience ?? '',
    context: input.context ?? '',
    template: input.template,
    slides: template.slides.map((title) => ({ id: slideId(), title, bullets: [] })),
    source: input.source ?? 'manual',
    updatedAt: new Date().toISOString(),
  })
}

/** Applies an AI outline to a deck, replacing slides wholesale. Fully editable afterwards. */
export function applyDeckOutline(deck: Deck, outline: DeckOutline): Deck {
  return DeckSchema.parse({
    ...deck,
    slides: outline.slides.map((slide) => ({ id: slideId(), title: slide.title, bullets: slide.bullets })),
    source: 'ai-draft',
    updatedAt: new Date().toISOString(),
  })
}

export function addSlide(deck: Deck, title = 'New slide', index?: number): Deck {
  if (deck.slides.length >= 30) return deck
  const slides = [...deck.slides]
  const at = index === undefined ? slides.length : Math.max(0, Math.min(index, slides.length))
  slides.splice(at, 0, { id: slideId(), title, bullets: [] })
  return { ...deck, slides, updatedAt: new Date().toISOString() }
}

export function updateSlide(
  deck: Deck,
  slideIdValue: string,
  patch: { title?: string; bullets?: string[] },
): Deck {
  const slides = deck.slides.map((slide) =>
    slide.id === slideIdValue
      ? {
          ...slide,
          title: (patch.title ?? slide.title).slice(0, 160) || slide.title,
          bullets: (patch.bullets ?? slide.bullets).map((bullet) => bullet.slice(0, 500)).slice(0, 8),
        }
      : slide,
  )
  return { ...deck, slides, updatedAt: new Date().toISOString() }
}

export function deleteSlide(deck: Deck, slideIdValue: string): Deck {
  if (deck.slides.length <= 1) return deck
  return {
    ...deck,
    slides: deck.slides.filter((slide) => slide.id !== slideIdValue),
    updatedAt: new Date().toISOString(),
  }
}

export function moveSlide(deck: Deck, slideIdValue: string, direction: -1 | 1): Deck {
  const from = deck.slides.findIndex((slide) => slide.id === slideIdValue)
  const to = from + direction
  if (from < 0 || to < 0 || to >= deck.slides.length) return deck
  const slides = [...deck.slides]
  const [moved] = slides.splice(from, 1)
  if (!moved) return deck
  slides.splice(to, 0, moved)
  return { ...deck, slides, updatedAt: new Date().toISOString() }
}
