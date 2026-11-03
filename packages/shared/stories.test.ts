import { describe, expect, it } from 'vitest'
import {
  CommunityStorySchema,
  FICTIONAL_STORY_LABEL,
  STORIES,
  getStory,
  listStories,
  listStorySlugs,
} from './stories'

describe('community stories (fictional demo scenarios)', () => {
  it('ships three to five scenarios, each a distinct slug', () => {
    expect(STORIES.length).toBeGreaterThanOrEqual(3)
    expect(STORIES.length).toBeLessThanOrEqual(5)
    expect(new Set(listStorySlugs()).size).toBe(STORIES.length)
  })

  it('labels every scenario as fictional demo content', () => {
    expect(FICTIONAL_STORY_LABEL).toMatch(/fictional/i)
    for (const story of STORIES) {
      expect(story.isFictional).toBe(true)
    }
  })

  it('gives every scenario a complete four-beat arc', () => {
    for (const story of STORIES) {
      expect(story.persona.trim().length).toBeGreaterThan(0)
      expect(story.context.trim().length).toBeGreaterThan(0)
      expect(story.challenge.trim().length).toBeGreaterThan(0)
      expect(story.connection.trim().length).toBeGreaterThan(0)
      expect(story.collaboration.trim().length).toBeGreaterThan(0)
      expect(story.outcome.trim().length).toBeGreaterThan(0)
      expect(['career', 'freelance', 'company']).toContain(story.studio)
      expect(['yes', 'partly', 'no']).toContain(story.helped)
    }
  })

  it('covers career, freelance and founder paths', () => {
    const studios = new Set(STORIES.map((story) => story.studio))
    expect(studios.has('career')).toBe(true)
    expect(studios.has('freelance')).toBe(true)
    expect(studios.has('company')).toBe(true)
  })

  it('resolves stories by slug and rejects unknown slugs', () => {
    for (const story of listStories()) {
      expect(getStory(story.slug)).toEqual(story)
    }
    expect(getStory('no-such-story')).toBeNull()
  })

  it('rejects non-fictional or beat-less stories at the schema boundary', () => {
    const base = STORIES[0]
    expect(() =>
      CommunityStorySchema.parse({ ...base, slug: 'ok-slug', isFictional: false }),
    ).toThrow()
    expect(() =>
      CommunityStorySchema.parse({ ...base, slug: 'Bad Slug', isFictional: true }),
    ).toThrow()
    expect(() =>
      CommunityStorySchema.parse({ ...base, slug: 'ok-slug-2', isFictional: true, outcome: '  ' }),
    ).toThrow()
  })
})
