import { describe, expect, it } from 'vitest'
import JSZip from 'jszip'
import { createDeck, updateSlide } from '@tulay/shared'
import { deckToPptxBuffer, safeFileName } from './deck-export'

describe('deck pptx export', () => {
  it('produces a valid pptx containing the edited slide content', async () => {
    let deck = createDeck({ id: crypto.randomUUID(), title: 'Acme Verification Deck', template: 'startup' })
    const problem = deck.slides.find((slide) => slide.title === 'Problem')!
    deck = updateSlide(deck, problem.id, {
      bullets: ['Freelancers lose track of client work', '[Add your churn statistic]'],
    })
    const buffer = await deckToPptxBuffer(deck)
    expect(buffer.subarray(0, 2).toString('utf8')).toBe('PK')

    const zip = await JSZip.loadAsync(buffer)
    const slideFiles = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    expect(slideFiles).toHaveLength(deck.slides.length)

    const problemXml = await zip.file('ppt/slides/slide2.xml')!.async('string')
    expect(problemXml).toContain('Problem')
    expect(problemXml).toContain('Freelancers lose track of client work')
    expect(problemXml).toContain('[Add your churn statistic]')
    const coverXml = await zip.file('ppt/slides/slide1.xml')!.async('string')
    expect(coverXml).toContain('Acme Verification Deck')
  })

  it('exports placeholder copy for empty slides instead of blank pages', async () => {
    const deck = createDeck({ id: crypto.randomUUID(), title: 'Empty Deck', template: 'proposal' })
    const buffer = await deckToPptxBuffer(deck)
    const zip = await JSZip.loadAsync(buffer)
    const coverXml = await zip.file('ppt/slides/slide1.xml')!.async('string')
    expect(coverXml).toContain('[Add content for this slide]')
  })

  it('sanitizes filenames', () => {
    expect(safeFileName('Acme Pitch: Q3/26!')).toBe('acme-pitch-q3-26')
    expect(safeFileName('   ')).toBe('tulay-deck')
  })
})
