import { z } from 'zod'
import { HelpedSchema } from './schemas'

/**
 * Community Stories: fictional demonstration scenarios rendered in the
 * challenge → connection → collaboration → outcome shape of a recorded
 * collaboration. Every story on record is fictional and must say so on the
 * card itself (see `FICTIONAL_STORY_LABEL`). Real member stories may be added
 * later with explicit permission; until then this module stays fictional-only
 * by type (`isFictional` is a literal).
 */

export const StoryStudioSchema = z.enum(['career', 'freelance', 'company'])
export type StoryStudio = z.infer<typeof StoryStudioSchema>

export const STORY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const CommunityStorySchema = z.object({
  slug: z.string().regex(STORY_SLUG_PATTERN),
  persona: z.string().trim().min(1).max(100),
  context: z.string().trim().min(1).max(200),
  studio: StoryStudioSchema,
  challenge: z.string().trim().min(1).max(2000),
  connection: z.string().trim().min(1).max(2000),
  collaboration: z.string().trim().min(1).max(2000),
  outcome: z.string().trim().min(1).max(2000),
  helped: HelpedSchema,
  isFictional: z.literal(true),
})
export type CommunityStory = z.infer<typeof CommunityStorySchema>

/** Shown on every fictional story card. Never present these as testimonials. */
export const FICTIONAL_STORY_LABEL = 'Illustrative demo story — fictional members'

const stories = [
  {
    slug: 'portfolio-review-career-move',
    persona: 'Jessa R.',
    context: 'Customer support representative moving into UX design',
    studio: 'career',
    challenge:
      'Jessa had five years of call-center work and a first draft portfolio that read like a résumé. She needed someone who had made the same move to tell her what to cut and what to keep.',
    connection:
      'Tulay matched her with Lena M., a product designer who moved from support into design two years earlier, on portfolio review and career transition — and flagged that Jessa could offer interview practice in return.',
    collaboration:
      'They agreed on one concrete next step: a 30-minute portfolio review call before Friday, with Jessa sending two case-study drafts the night before.',
    outcome:
      'Jessa rebuilt one case study around a single support story and sent two junior design applications the following week.',
    helped: 'yes',
    isFictional: true,
  },
  {
    slug: 'pricing-swap-freelancers',
    persona: 'Miguel D.',
    context: 'Short-form video editor looking for steadier clients',
    studio: 'freelance',
    challenge:
      'Miguel could edit, but every proposal he sent either underpriced the work or went unanswered. He needed pricing confidence and better proposal openers, not more tutorials.',
    connection:
      'Tulay paired him with Ari T., a fellow freelancer who needed editing feedback and offered proposal writing in return — a genuine two-way trade, matched on pricing and proposal-writing.',
    collaboration:
      'They swapped work: Ari reviewed Miguel’s pricing worksheet line by line, and Miguel cut a 20-second sample edit for Ari’s showreel.',
    outcome:
      'Miguel raised his project minimum, rewrote his three proposal openers, and landed a two-video trial with a new client.',
    helped: 'yes',
    isFictional: true,
  },
  {
    slug: 'cofounder-customer-discovery',
    persona: 'Ramon V.',
    context: 'Building an inventory app for small neighbourhood stores',
    studio: 'company',
    challenge:
      'Ramon could build the mobile MVP himself, but he had never done customer discovery and did not want to build for stores that would never buy. He needed a business-minded partner, not funding.',
    connection:
      'Tulay matched him with Dana K., a former FMCG sales lead exploring co-founding, on business development and customer discovery — with mobile development and MVP building flowing the other way.',
    collaboration:
      'They agreed on five store interviews in one week: Dana led the conversations, Ramon took notes and demoed a paper prototype.',
    outcome:
      'Three interviews completed and a clear pattern in stock-out complaints — but the co-founder fit is still an open question, honestly recorded as partly there.',
    helped: 'partly',
    isFictional: true,
  },
  {
    slug: 'practice-partner-data-analysis',
    persona: 'Grace L.',
    context: 'Public-school teacher moving into data analysis',
    studio: 'career',
    challenge:
      'Grace was studying spreadsheets after class hours but kept stalling before mock interviews. She needed a practice partner at the same stage, not another course.',
    connection:
      'Tulay matched her with Jon P., a fellow career shifter preparing for analyst interviews, on interview practice — peers who could hold each other to a schedule.',
    collaboration:
      'They set a weekly 45-minute practice set every Sunday: thirty minutes of SQL questions, fifteen minutes of feedback, alternating who goes first.',
    outcome:
      'Six Sundays in a row kept, and Grace walked into her first real screening call with answers she had already said out loud.',
    helped: 'yes',
    isFictional: true,
  },
] as const

export const STORIES: CommunityStory[] = stories.map((story) => CommunityStorySchema.parse(story))

export function listStories(): CommunityStory[] {
  return STORIES
}

export function getStory(slug: string): CommunityStory | null {
  return STORIES.find((story) => story.slug === slug) ?? null
}

export function listStorySlugs(): string[] {
  return STORIES.map((story) => story.slug)
}
