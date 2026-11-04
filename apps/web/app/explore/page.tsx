import type { Metadata } from 'next'
import { Arko } from '@/components/Arko'
import { LinkButton } from '@/components/ui'
import { ArrowRight, Briefcase, Leaf, Rocket } from '@/components/icons'

export const metadata: Metadata = {
  title: 'Explore studios',
  description:
    'Meet Career Studio, Freelance Studio and Venture Studio: three doors into one shared human-connection engine.',
}

const STUDIOS = [
  {
    id: 'career',
    name: 'Career Studio',
    audience: 'For career changers, job seekers and the quietly restless.',
    purpose:
      'Map where you are to where you could go, then meet people who fit the direction.',
    capabilities: [
      'Explore industries and the roles inside them',
      'Career Map: your role, adjacent roles, and the skills between them',
      'Simulator: ranked options with shared and to-develop skills',
      'Transition Planner: checkable milestones that lead to people',
    ],
    engine:
      'Every direction ends the same way: a reciprocal match with someone who can help you, and who you can help in return.',
    status: 'mixed' as const,
    statusNote:
      'Matching and introductions are live in the demo journey today. Career Map, Simulator and Transition Planner are in design.',
    cta: { href: '/studios/career', label: 'Open Career Studio' },
    Icon: Leaf,
  },
  {
    id: 'freelance',
    name: 'Freelance Studio',
    audience: 'For freelancers and independents finding steadier work.',
    purpose:
      'Turn what you can do into services, proposals and clients, or trade skills peer to peer.',
    capabilities: [
      'My Services: structured offers of what you do best',
      'Proposal Studio: draft and improve real proposals',
      'Opportunity Board: needs looking for your skills',
      'Skill Exchange: one-at-a-time browsing for peer trades',
    ],
    engine:
      'Every service, proposal and board post resolves to the same engine: a reciprocal introduction between two people.',
    status: 'preview' as const,
    statusNote:
      'Freelance tools are in design. This is a preview of what is planned. The matching underneath already works in the demo journey.',
    cta: { href: '/studios/freelance', label: 'Open Freelance Studio' },
    Icon: Briefcase,
  },
  {
    id: 'company',
    name: 'Venture Studio',
    audience: 'For aspiring founders testing an idea before building it.',
    purpose: 'Take an idea from workshop to research to team to launch plan.',
    capabilities: [
      'Idea Workshop: problem, customer, solution and edge',
      'Customer research from sources you provide, quoted and dated',
      'Build Your Team: role needs that convert to reciprocal matches',
      'Launch Planner: milestones from first interview to first pilot',
    ],
    engine:
      'Research informs the idea, but people build the venture. Team needs become reciprocal matches in the same engine.',
    status: 'preview' as const,
    statusNote:
      'Venture tools are in design. This is a preview of what is planned. The matching underneath already works in the demo journey.',
    cta: { href: '/studios/venture', label: 'Open Venture Studio' },
    Icon: Rocket,
  },
]

export default function ExplorePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <p className="text-sm text-muted">Explore Tulay</p>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-ink">
        Three studios, one bridge.
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted">
        Career, freelance and venture work look different, but nobody should navigate them alone.
        Each studio has its own tools and workflow. All three share Tulay&apos;s reciprocal
        people-matching and collaboration engine: introductions with consent, agreed next steps,
        and recorded outcomes.
      </p>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {STUDIOS.map((studio) => (
          <article
            key={studio.id}
            className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-line/70 bg-white p-6 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-mist text-forest">
                <studio.Icon className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-ink">{studio.name}</h2>
                <p
                  className={`text-xs font-semibold tracking-wide uppercase ${
                    studio.status === 'mixed' ? 'text-forest' : 'text-coral-ink'
                  }`}
                >
                  {studio.status === 'mixed' ? 'Partly live' : 'Preview: in design'}
                </p>
              </div>
            </div>
            <p className="text-sm font-medium text-ink">{studio.audience}</p>
            <p className="text-sm text-muted">{studio.purpose}</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
              {studio.capabilities.map((capability) => (
                <li key={capability}>{capability}</li>
              ))}
            </ul>
            <p className="rounded-2xl bg-ivory p-3 text-sm text-muted">{studio.engine}</p>
            <p className="text-sm text-muted">{studio.statusNote}</p>
            <LinkButton href={studio.cta.href} className="mt-auto self-start">
              {studio.cta.label}
              <ArrowRight className="h-4 w-4" />
            </LinkButton>
          </article>
        ))}
      </div>

      <div className="mt-10 flex items-center gap-4 rounded-[var(--radius-card)] border border-line/70 bg-white p-6 shadow-[var(--shadow-card)]">
        <Arko state="idle" size={56} />
        <div>
          <p className="font-semibold text-ink">Not sure where to start?</p>
          <p className="mt-1 text-sm text-muted">
            Tell Tulay your goal once. The demo journey matches you reciprocally, whatever journey
            you are on. No account needed.
          </p>
          <LinkButton href="/start" className="mt-3">
            Start the demo journey
            <ArrowRight className="h-4 w-4" />
          </LinkButton>
        </div>
      </div>
    </div>
  )
}
