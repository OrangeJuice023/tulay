/**
 * The three starting journeys (user-facing term; this module keeps the historic
 * `Path` names internally so the /start demo stays stable). A journey only
 * changes copy, suggested tags and sample prompts; every journey uses the same
 * `findCandidates` matching. Sample tags must exist in
 * `data/fixtures/demo-community.json` (checked when the vocabulary is built).
 */
export type PathId = 'career' | 'freelance' | 'company'

export type PathConfig = {
  id: PathId
  title: string
  blurb: string
  goalPrompt: string
  suggestedNeedTags: string[]
  sample: { goal: string; need: string; needTags: string[]; offer: string; offerTags: string[] }
  dataNote?: string
}

export const PATHS: PathConfig[] = [
  {
    id: 'career',
    title: 'Change careers',
    blurb: 'Find people who made a similar move and can review your work or practise with you.',
    goalPrompt: 'What role are you moving toward?',
    suggestedNeedTags: ['portfolio-review', 'interview-practice', 'career-transition', 'mentoring'],
    sample: {
      goal: 'Move from customer support into a junior UX design role',
      need: 'A portfolio review from someone who has been through a career change',
      needTags: ['portfolio-review'],
      offer: 'English interview practice from years of taking customer calls',
      offerTags: ['interview-practice'],
    },
  },
  {
    id: 'freelance',
    title: 'Grow as a freelancer',
    blurb: 'Get help with pricing, proposals and skills, and trade what you are good at.',
    goalPrompt: 'What kind of clients or work do you want?',
    suggestedNeedTags: ['pricing', 'proposal-writing', 'freelancing', 'video-editing'],
    sample: {
      goal: 'Land steady clients for my short-form video editing',
      need: 'Advice on pricing my services and writing better proposals',
      needTags: ['pricing', 'proposal-writing'],
      offer: 'Short-form video editing for service businesses',
      offerTags: ['video-editing', 'short-form-video'],
    },
  },
  {
    id: 'company',
    title: 'Build a company',
    blurb: 'Find a co-founder, honest pitch feedback, early users and people who know your market.',
    goalPrompt: 'What are you building?',
    suggestedNeedTags: [
      'business-development',
      'customer-discovery',
      'sales',
      'pitch-feedback',
      'mobile-development',
      'mvp-building',
      'mentoring',
    ],
    sample: {
      goal: 'Launch an inventory app for small neighbourhood stores',
      need: 'A business-minded co-founder who can lead customer discovery and early sales',
      needTags: ['business-development', 'customer-discovery', 'sales'],
      offer: 'I can build a working mobile MVP',
      offerTags: ['mobile-development', 'mvp-building'],
    },
    dataNote:
      'Tulay does not list investors or arrange funding. Help with fundraising here means pitch feedback from experienced founders in the community. Verified, opt-in investor profiles may come later.',
  },
]

export function getPath(id: PathId): PathConfig {
  return PATHS.find((path) => path.id === id) ?? PATHS[0]
}

/** The demo visitor. Not in the fixture, so matching never returns them to themself. */
export const DEMO_SEEKER_ID = '00000000-0000-4000-8000-000000000001'
