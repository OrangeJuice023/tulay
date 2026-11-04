import { describe, expect, it } from 'vitest'
import {
  DECK_TEMPLATES,
  DeckOutlineSchema,
  DeckSchema,
  DraftDeckOutlineContextSchema,
  addSlide,
  applyDeckOutline,
  createDeck,
  deleteSlide,
  moveSlide,
  updateSlide,
} from './deck'

const DECK_ID = 'deck-1'

describe('deck templates', () => {
  it('offers the three approved templates with honest structure', () => {
    expect(Object.keys(DECK_TEMPLATES).sort()).toEqual(['portfolio', 'proposal', 'startup'])
    expect(DECK_TEMPLATES.startup.slides).toContain('Problem')
    expect(DECK_TEMPLATES.proposal.slides).toContain('Approach')
    expect(DECK_TEMPLATES.portfolio.slides).toContain('Case study')
  })
})

describe('deck lifecycle', () => {
  it('creates a deck from a template with empty editable slides', () => {
    const deck = createDeck({ id: DECK_ID, title: 'My pitch', template: 'startup' })
    expect(deck.slides).toHaveLength(DECK_TEMPLATES.startup.slides.length)
    expect(deck.slides[0]).toMatchObject({ title: 'Cover', bullets: [] })
    expect(deck.source).toBe('manual')
    expect(DeckSchema.safeParse(deck).success).toBe(true)
  })

  it('applies an AI outline wholesale and marks the source', () => {
    const deck = createDeck({ id: DECK_ID, title: 'My pitch', template: 'proposal' })
    const outlined = applyDeckOutline(deck, {
      slides: [
        { title: 'Cover', bullets: ['Acme proposal'] },
        { title: 'Context', bullets: ['Client needs X', '[Add the stakeholder name]'] },
        { title: 'Goals', bullets: ['Ship by June'] },
        { title: 'Next steps', bullets: ['Sign off'] },
      ],
    })
    expect(outlined.slides).toHaveLength(4)
    expect(outlined.slides[1]?.bullets).toContain('[Add the stakeholder name]')
    expect(outlined.source).toBe('ai-draft')
  })

  it('rejects decks without slides and outlines with too few slides', () => {
    const deck = createDeck({ id: DECK_ID, title: 'My pitch', template: 'startup' })
    expect(DeckSchema.safeParse({ ...deck, slides: [] }).success).toBe(false)
    expect(DeckOutlineSchema.safeParse({ slides: [{ title: 'Only', bullets: ['one'] }] }).success).toBe(false)
    expect(
      DraftDeckOutlineContextSchema.safeParse({ title: '', template: 'startup' }).success,
    ).toBe(false)
  })
})

describe('slide operations', () => {
  it('adds, edits, reorders, and deletes slides within bounds', () => {
    let deck = createDeck({ id: DECK_ID, title: 'My pitch', template: 'portfolio' })
    deck = addSlide(deck, 'Extra', 1)
    expect(deck.slides[1]?.title).toBe('Extra')

    const target = deck.slides[1]!
    deck = updateSlide(deck, target.id, { title: 'Renamed', bullets: ['a', 'b'] })
    expect(deck.slides[1]).toMatchObject({ title: 'Renamed', bullets: ['a', 'b'] })

    deck = moveSlide(deck, target.id, -1)
    expect(deck.slides[0]?.title).toBe('Renamed')
    deck = moveSlide(deck, target.id, -1)
    expect(deck.slides[0]?.title).toBe('Renamed')

    const count = deck.slides.length
    deck = deleteSlide(deck, target.id)
    expect(deck.slides).toHaveLength(count - 1)
  })

  it('never deletes the last slide or exceeds thirty', () => {
    let deck = createDeck({ id: DECK_ID, title: 'Tiny', template: 'proposal' })
    while (deck.slides.length > 1) deck = deleteSlide(deck, deck.slides[0]!.id)
    expect(deck.slides).toHaveLength(1)
    deck = deleteSlide(deck, deck.slides[0]!.id)
    expect(deck.slides).toHaveLength(1)

    for (let i = 0; i < 40; i += 1) deck = addSlide(deck, `Slide ${i}`)
    expect(deck.slides.length).toBeLessThanOrEqual(30)
  })

  it('ignores unknown slide ids', () => {
    const deck = createDeck({ id: DECK_ID, title: 'My pitch', template: 'startup' })
    expect(moveSlide(deck, 'missing', 1).slides).toHaveLength(deck.slides.length)
    expect(deleteSlide(deck, 'missing').slides).toHaveLength(deck.slides.length)
  })
})
