/**
 * Minimal member shape for studio shortlists: satisfied by both the demo
 * fixture rows and contact-stripped Supabase directory rows.
 */
export type StudioMemberLike = {
  profile: { id?: unknown; displayName: string; discoverable: boolean; isDemo: boolean }
  offers: { description: string; tags: string[] }[]
  needs: { status: string; description: string; tags: string[] }[]
}

/**
 * Studio workspace configuration. A studio is the workspace for one journey:
 * Change careers → Career Studio, Grow as a freelancer → Freelance Studio,
 * Build a company → Venture Studio. Tool statuses are honesty-critical: `live`
 * means the capability works today (demo data for guests, member data when
 * signed in); `preview` means in design. Never mark a preview live.
 */

export type StudioId = 'career' | 'freelance' | 'venture'
export type ToolStatus = 'live' | 'preview'

export type StudioTool = {
  id: string
  title: string
  body: string
  status: ToolStatus
  /** Live tools link to the working surface. Previews link to the demo journey. */
  href: string
  ctaLabel: string
}

export type StudioConfig = {
  id: StudioId
  name: string
  journey: string
  audience: string
  purpose: string
  tools: StudioTool[]
  /** Tags used to shortlist relevant demo members for this studio. */
  matchTags: string[]
}

export const STUDIOS: StudioConfig[] = [
  {
    id: 'career',
    name: 'Career Studio',
    journey: 'Change careers',
    audience: 'For career changers, job seekers and the quietly restless.',
    purpose: 'Map where you are to where you could go, then meet people who fit the direction.',
    matchTags: ['portfolio-review', 'interview-practice', 'career-transition', 'mentoring'],
    tools: [
      {
        id: 'mentors-matches',
        title: 'Mentors & Matches',
        body: 'Meet mentors, reviewers and peers matched to your need, with consent before contact.',
        status: 'live',
        href: '/ask?q=Find%20me%20a%20mentor%20for%20my%20career%20move',
        ctaLabel: 'Find mentors',
      },
      {
        id: 'career-map',
        title: 'Career Map',
        body: 'Your role, adjacent roles, and the skills between them — drawn from your profile.',
        status: 'preview',
        href: '/start',
        ctaLabel: 'Try the matching demo',
      },
      {
        id: 'resume-studio',
        title: 'Resume Studio',
        body: 'Shape a resume around the role you want, then get human review on it.',
        status: 'preview',
        href: '/start',
        ctaLabel: 'Try the matching demo',
      },
      {
        id: 'portfolio-review',
        title: 'Portfolio Review',
        body: 'Structured feedback on your work samples from people who hire or mentor.',
        status: 'preview',
        href: '/start',
        ctaLabel: 'Try the matching demo',
      },
      {
        id: 'skill-gap',
        title: 'Skill Gap Analysis',
        body: 'See which skills your target roles ask for and who can help you build them.',
        status: 'preview',
        href: '/start',
        ctaLabel: 'Try the matching demo',
      },
    ],
  },
  {
    id: 'freelance',
    name: 'Freelance Studio',
    journey: 'Grow as a freelancer',
    audience: 'For freelancers and independents finding steadier work.',
    purpose: 'Turn what you can do into services, proposals and clients, or trade skills peer to peer.',
    matchTags: ['pricing', 'proposal-writing', 'freelancing', 'video-editing', 'short-form-video'],
    tools: [
      {
        id: 'opportunity-board',
        title: 'Opportunity Board',
        body: 'Open needs from the community that match working skills — reply with an introduction.',
        status: 'live',
        href: '/discover',
        ctaLabel: 'Browse the directory',
      },
      {
        id: 'my-services',
        title: 'My Services',
        body: 'Structured offers of what you do best, ready to share with clients and peers.',
        status: 'preview',
        href: '/start',
        ctaLabel: 'Try the matching demo',
      },
      {
        id: 'proposal-studio',
        title: 'Proposal Studio',
        body: 'Draft and improve real proposals with feedback from experienced freelancers.',
        status: 'preview',
        href: '/start',
        ctaLabel: 'Try the matching demo',
      },
      {
        id: 'pricing',
        title: 'Pricing',
        body: 'Price with confidence from peer benchmarks and honest feedback.',
        status: 'preview',
        href: '/start',
        ctaLabel: 'Try the matching demo',
      },
      {
        id: 'skill-exchange',
        title: 'Skill Exchange',
        body: 'Trade skills peer to peer, one exchange at a time.',
        status: 'preview',
        href: '/start',
        ctaLabel: 'Try the matching demo',
      },
    ],
  },
  {
    id: 'venture',
    name: 'Venture Studio',
    journey: 'Build a company',
    audience: 'For aspiring founders testing an idea before building it.',
    purpose: 'Take an idea from workshop to research to team to launch plan.',
    matchTags: [
      'business-development',
      'customer-discovery',
      'sales',
      'pitch-feedback',
      'mobile-development',
      'mvp-building',
    ],
    tools: [
      {
        id: 'build-team',
        title: 'Build Your Team',
        body: 'Find co-founders, early users and domain experts through reciprocal matching.',
        status: 'live',
        href: '/ask?q=I%20need%20a%20technical%20co-founder',
        ctaLabel: 'Find team members',
      },
      {
        id: 'idea-workshop',
        title: 'Idea Workshop',
        body: 'Sharpen problem, customer, solution and edge before you build.',
        status: 'preview',
        href: '/start',
        ctaLabel: 'Try the matching demo',
      },
      {
        id: 'pitch-deck',
        title: 'Pitch Deck Studio',
        body: 'Draft a deck with AI, edit every slide, and export to PowerPoint.',
        status: 'live',
        href: '/deck',
        ctaLabel: 'Build a deck',
      },
      {
        id: 'customer-research',
        title: 'Customer Research',
        body: 'Interview guides and insight capture from sources you provide.',
        status: 'preview',
        href: '/start',
        ctaLabel: 'Try the matching demo',
      },
      {
        id: 'launch-planner',
        title: 'Launch Planner',
        body: 'Milestones from first interview to first pilot.',
        status: 'preview',
        href: '/start',
        ctaLabel: 'Try the matching demo',
      },
    ],
  },
]

export function getStudio(id: string): StudioConfig | null {
  return STUDIOS.find((studio) => studio.id === id) ?? null
}

/** Journey (what the user wants) → studio (where they work on it). */
export const JOURNEY_TO_STUDIO: Record<string, StudioId> = {
  career: 'career',
  freelance: 'freelance',
  venture: 'venture',
  // Historic /start path id for the founding journey.
  company: 'venture',
}

/**
 * Shortlist demo members relevant to a studio by shared offer tags.
 * Deterministic; ties keep fixture order. Guests see sample members.
 */
export function studioShortlist<T extends StudioMemberLike>(
  community: T[],
  studio: StudioConfig,
  limit = 3,
): T[] {
  const tags = new Set(studio.matchTags)
  return community
    .filter((member) => member.profile.discoverable)
    .map((member) => ({
      member,
      shared: member.offers.flatMap((offer) => offer.tags).filter((tag) => tags.has(tag)).length,
    }))
    .filter((entry) => entry.shared > 0)
    .sort((a, b) => b.shared - a.shared)
    .slice(0, limit)
    .map((entry) => entry.member)
}

export type StudioOpportunity = {
  seekerName: string
  seekerId: string
  description: string
  tags: string[]
  isDemo: boolean
}

/**
 * Open needs across the community, newest relevant first — the raw material
 * for the Freelance opportunity board. Sample data for guests.
 */
export function studioOpportunities(
  community: StudioMemberLike[],
  studio: StudioConfig,
  limit = 6,
): StudioOpportunity[] {
  const tags = new Set(studio.matchTags)
  const relevant = community
    .filter((member) => member.profile.discoverable)
    .flatMap((member) =>
      member.needs
      .filter((need) => need.status === 'open')
      .map((need) => ({
        seekerName: member.profile.displayName,
        seekerId: member.profile.id as string,
        description: need.description,
        tags: need.tags,
        isDemo: member.profile.isDemo,
        shared: need.tags.filter((tag) => tags.has(tag)).length,
      })),
  )
  return relevant
    .sort((a, b) => b.shared - a.shared)
    .slice(0, limit)
    .map((item) => ({
      seekerName: item.seekerName,
      seekerId: item.seekerId,
      description: item.description,
      tags: item.tags,
      isDemo: item.isDemo,
    }))
}
