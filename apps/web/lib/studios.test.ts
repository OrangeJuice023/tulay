import { describe, expect, it } from 'vitest'
import { JOURNEY_TO_STUDIO, STUDIOS, getStudio } from './studios'

describe('studio configuration', () => {
  it('defines exactly the three approved studios', () => {
    expect(STUDIOS.map((studio) => studio.id)).toEqual(['career', 'freelance', 'venture'])
    expect(getStudio('career')?.name).toBe('Career Studio')
    expect(getStudio('freelance')?.name).toBe('Freelance Studio')
    expect(getStudio('venture')?.name).toBe('Venture Studio')
    expect(getStudio('nope')).toBeNull()
  })

  it('maps every journey to its studio, including the historic company id', () => {
    expect(JOURNEY_TO_STUDIO).toMatchObject({ career: 'career', freelance: 'freelance', venture: 'venture' })
    expect(JOURNEY_TO_STUDIO.company).toBe('venture')
  })

  it('gives every studio five tools with the approved titles', () => {
    const titles = new Map(STUDIOS.map((studio) => [studio.id, studio.tools.map((tool) => tool.title)]))
    expect(titles.get('career')).toEqual([
      'Mentors & Matches',
      'Career Map',
      'Resume Studio',
      'Portfolio Review',
      'Skill Gap Analysis',
    ])
    expect(titles.get('freelance')).toEqual([
      'Opportunity Board',
      'My Services',
      'Proposal Studio',
      'Pricing',
      'Skill Exchange',
    ])
    expect(titles.get('venture')).toEqual([
      'Build Your Team',
      'Idea Workshop',
      'Pitch Deck Studio',
      'Customer Research',
      'Launch Planner',
    ])
  })

  it('marks only genuinely working tools live, each with a working href', () => {
    for (const studio of STUDIOS) {
      for (const tool of studio.tools) {
        expect(['live', 'preview']).toContain(tool.status)
        expect(tool.href.startsWith('/')).toBe(true)
        expect(tool.ctaLabel.length).toBeGreaterThan(0)
      }
      const live = studio.tools.filter((tool) => tool.status === 'live')
      expect(live.length).toBeGreaterThanOrEqual(1)
    }
    expect(STUDIOS.flatMap((s) => s.tools.filter((t) => t.status === 'live')).map((t) => t.title).sort()).toEqual(
      ['Build Your Team', 'Mentors & Matches', 'Opportunity Board', 'Pitch Deck Studio'].sort(),
    )
  })
})
