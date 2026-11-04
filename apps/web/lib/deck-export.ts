import PptxGenJS from 'pptxgenjs'
import type { Deck } from '@tulay/shared'

/**
 * Real PowerPoint export for Pitch Deck Studio. The file contains the current
 * edited slide content in Tulay's visual language; nothing is faked.
 */

const INK = '1F2A24'
const FOREST = '176B46'
const MUTED = '5B6B62'

export function safeFileName(title: string): string {
  const cleaned = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return cleaned || 'tulay-deck'
}

export function buildDeckPptx(deck: Deck): PptxGenJS {
  const pptx = new PptxGenJS()
  pptx.defineLayout({ name: 'TULAY_WIDE', width: 13.33, height: 7.5 })
  pptx.layout = 'TULAY_WIDE'
  pptx.title = deck.title

  for (const slide of deck.slides) {
    const page = pptx.addSlide()
    page.addText(slide.title, {
      x: 0.7,
      y: 0.4,
      w: 11.9,
      h: 1.0,
      fontSize: 32,
      bold: true,
      color: INK,
    })
    if (slide.bullets.length > 0) {
      page.addText(
        slide.bullets.map((bullet, index) => ({
          text: bullet,
          options: { bullet: true, breakLine: index < slide.bullets.length - 1 },
        })),
        { x: 0.9, y: 1.7, w: 11.5, h: 4.8, valign: 'top', fontSize: 18, color: INK },
      )
    } else {
      page.addText('[Add content for this slide]', {
        x: 0.9,
        y: 1.7,
        w: 11.5,
        h: 1,
        fontSize: 18,
        italic: true,
        color: MUTED,
      })
    }
    page.addShape('line', {
      x: 0.7,
      y: 6.9,
      w: 11.9,
      h: 0,
      line: { color: FOREST, width: 2 },
    })
    page.addText(`${deck.title} · Built with Tulay`, {
      x: 0.7,
      y: 7.0,
      w: 11.9,
      h: 0.4,
      fontSize: 10,
      color: MUTED,
    })
  }
  return pptx
}

/** Node/edge buffer for tests and server use. */
export async function deckToPptxBuffer(deck: Deck): Promise<Buffer> {
  const pptx = buildDeckPptx(deck)
  const output = await pptx.write({ outputType: 'nodebuffer' })
  return output as Buffer
}

/** Browser download of the current deck. */
export async function downloadDeckPptx(deck: Deck): Promise<void> {
  const pptx = buildDeckPptx(deck)
  await pptx.writeFile({ fileName: `${safeFileName(deck.title)}.pptx` })
}
