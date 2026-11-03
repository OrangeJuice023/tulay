import type { Metadata } from 'next'
import { Arko } from '@/components/Arko'
import { LinkButton } from '@/components/ui'
import { ArrowRight } from '@/components/icons'

export const metadata: Metadata = {
  title: 'Our story',
  description:
    'Why Tulay exists: careers are navigated alone, and nobody should have to. The bridge metaphor, the philosophy, and the three studios on one connection engine.',
}

const PHILOSOPHY = [
  {
    title: 'Relationships are the goal',
    body: 'A match is not a lead and a collaboration is not a transaction. The connection between two people is the point — everything Tulay builds serves it.',
  },
  {
    title: 'Grounded recommendations',
    body: 'Suggestions come from stated needs, offers and skills — never from scraped data, hidden scores or paid placement.',
  },
  {
    title: 'Reciprocity without pressure',
    body: 'The best help flows both ways. Tulay surfaces what each person can offer, so asking never feels like taking — and declining is always easy and explicit.',
  },
  {
    title: 'Consent before outreach',
    body: 'Nobody is contacted on your behalf. Every introduction is drafted, reviewed and explicitly approved — and contact details are shared only after both sides say yes.',
  },
  {
    title: 'No unproven claims',
    body: 'Tulay makes no promises about outcomes, salaries or success rates. Progress is whatever the collaborators themselves record: yes, partly, or not yet.',
  },
]

export default function OurStoryPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="text-sm text-muted">Our story</p>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
        Careers shouldn&apos;t be solo missions.
      </h1>
      <p className="mt-4 text-lg text-muted">
        Changing careers, finding steadier freelance work, testing a business idea — these are
        navigated mostly alone, even though the way through almost always involves another person.
        Asking for help feels hard. Tulay exists to make it easy, mutual, and safe.
      </p>

      <div className="mt-8 flex items-center gap-4 rounded-[var(--radius-card)] border border-line/70 bg-white p-6 shadow-[var(--shadow-card)]">
        <Arko state="idle" size={72} />
        <p className="text-ink">
          <span className="font-bold">Tulay</span> means{' '}
          <span className="font-bold">bridge</span> in Filipino. The product is the span; members
          do the crossing — together.
        </p>
      </div>

      <h2 className="mt-12 text-2xl font-bold text-ink">The problem we address</h2>
      <div className="mt-4 space-y-4 text-ink">
        <p>
          A customer support representative studying UX design after shifts has no one to review
          her portfolio. A video editor sends proposals into silence because nobody ever taught
          him pricing. An aspiring founder can build an app but has never done a customer
          interview. Each of them is one conversation away from momentum — and each of them is
          stuck because that conversation never happens.
        </p>
        <p>
          Existing platforms answer with content: more courses, more listings, more feeds. What is
          missing is a way for two people with complementary needs to find each other, agree on
          one concrete step, and follow through — with consent at every point.
        </p>
      </div>

      <h2 className="mt-12 text-2xl font-bold text-ink">What we believe</h2>
      <div className="mt-4 space-y-4">
        {PHILOSOPHY.map((item) => (
          <section
            key={item.title}
            className="rounded-[var(--radius-card)] border border-line/70 bg-white p-6 shadow-[var(--shadow-card)]"
          >
            <h3 className="font-bold text-ink">{item.title}</h3>
            <p className="mt-1 text-sm text-muted">{item.body}</p>
          </section>
        ))}
      </div>

      <h2 className="mt-12 text-2xl font-bold text-ink">Three studios, one engine</h2>
      <div className="mt-4 space-y-4 text-ink">
        <p>
          Career paths, freelance work and founding a venture need different tools — maps and
          simulators, services and proposals, workshops and research. So Tulay grows three
          studios: <strong>Career Studio</strong> for moves between roles,{' '}
          <strong>Freelance Studio</strong> for services and clients, and{' '}
          <strong>Venture Studio</strong> for ideas becoming ventures.
        </p>
        <p>
          Underneath, there is exactly one engine: reciprocal people-matching, introduction
          requests with consent, agreed next steps, and recorded outcomes. A career mentoring
          session, a freelancer skill swap and a co-founder conversation are the same human
          mechanism — the studios just speak the language of each journey.
        </p>
      </div>

      <h2 className="mt-12 text-2xl font-bold text-ink">Why human connection is the differentiator</h2>
      <p className="mt-4 text-ink">
        AI can draft an introduction, suggest a next step, or map adjacent careers. It cannot vouch
        for you, practice with you, or introduce you to its network. Tulay uses AI for words and
        structure — and reserves the human parts for humans. Success is not engagement or matches
        made; it is a recorded answer to one question: did somebody actually move forward?
      </p>

      <h2 className="mt-12 text-2xl font-bold text-ink">What we don&apos;t claim</h2>
      <p className="mt-4 text-ink">
        Tulay began as a hackathon-born minimum viable product, built to test whether AI can help
        people help each other. We publish no founder biographies, no testimonials, no impact
        statistics and no guarantees — only the mechanism, the demo, and whatever collaborators
        honestly record.
      </p>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <LinkButton href="/start">
          Try the demo journey
          <ArrowRight className="h-4 w-4" />
        </LinkButton>
        <LinkButton href="/explore" variant="secondary">
          Explore the studios
        </LinkButton>
        <LinkButton href="/stories" variant="secondary">
          Read community stories
        </LinkButton>
      </div>
    </div>
  )
}
