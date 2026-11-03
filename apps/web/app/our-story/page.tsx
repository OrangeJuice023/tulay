import type { Metadata } from 'next'
import { Arko } from '@/components/Arko'
import { LinkButton } from '@/components/ui'
import { ArrowRight } from '@/components/icons'

export const metadata: Metadata = {
  title: 'Our story',
  description:
    'Why Tulay exists: people do not grow in isolation, and communities create opportunities that individuals cannot create alone. The bridge metaphor, the philosophy, and the three studios on one connection engine.',
}

const PHILOSOPHY = [
  {
    title: 'Relationships are the goal',
    body: 'A match is not a lead, and a collaboration is not a transaction. The connection between two people is the point. Everything Tulay builds serves it.',
  },
  {
    title: 'Grounded recommendations',
    body: 'Suggestions come from stated needs, offers, and skills. Never from scraped data, hidden scores, or paid placement.',
  },
  {
    title: 'Reciprocity without pressure',
    body: 'The best help flows both ways. Tulay surfaces what each person can offer, so asking never feels like taking. Declining is always easy and explicit.',
  },
  {
    title: 'Consent before outreach',
    body: 'Nobody is contacted on your behalf. Every introduction is drafted, reviewed, and explicitly approved. Contact details are shared only after both sides say yes.',
  },
  {
    title: 'No unproven claims',
    body: 'Tulay makes no promises about outcomes, salaries, or success rates. Progress is whatever the collaborators themselves record: yes, partly, or not yet.',
  },
]

export default function OurStoryPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="text-sm text-muted">Our story</p>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
        People do not grow in isolation.
      </h1>
      <p className="mt-4 text-lg text-muted">
        Communities create opportunities that individuals cannot always create alone. Tulay
        exists to make those meetings happen: between people whose needs, skills, offers, and
        goals fit together, with consent on every side.
      </p>

      <div className="mt-8 flex items-center gap-4 rounded-[var(--radius-card)] border border-line/70 bg-white p-6 shadow-[var(--shadow-card)]">
        <Arko state="idle" size={72} />
        <p className="text-ink">
          <span className="font-bold">Tulay</span> means{' '}
          <span className="font-bold">bridge</span> in Filipino. The product is the span.
          Members do the crossing, together.
        </p>
      </div>

      <h2 className="mt-12 text-2xl font-bold text-ink">The world of work is changing</h2>
      <div className="mt-4 space-y-4 text-ink">
        <p>
          Work is changing faster than most people can plan for. Industries restructure, job
          requirements shift, and technology redraws whole roles. Many people face
          unemployment, underemployment, or the quiet pressure of work that no longer leads
          anywhere. Access to decent work and opportunity is uneven, and the people with the
          fewest connections usually feel it first.
        </p>
        <p>
          Tulay was conceived as a response to these pressures: global employment insecurity,
          changing work requirements, technological disruption, and unequal access to
          opportunity. The problem is not a lack of effort. It is that navigating all of this
          alone is more than effort can fix.
        </p>
      </div>

      <h2 className="mt-12 text-2xl font-bold text-ink">
        Why effort alone is sometimes not enough
      </h2>
      <div className="mt-4 space-y-4 text-ink">
        <p>
          A customer support representative studying UX design after shifts has no one to
          review her portfolio. A video editor sends proposals into silence because nobody
          ever taught him pricing. An aspiring founder can build an app but has never done a
          customer interview. Each of them is one conversation away from momentum, and each of
          them is stuck because that conversation never happens.
        </p>
        <p>
          Existing platforms answer with content: more courses, more listings, more feeds.
          What is missing is a way for two people with complementary needs to find each
          other, agree on one concrete step, and follow through, with consent at every point.
        </p>
      </div>

      <h2 className="mt-12 text-2xl font-bold text-ink">Why community works</h2>
      <div className="mt-4 space-y-4 text-ink">
        <p>
          One person rarely holds everything another person needs. But across a community,
          the pieces exist: a skill here, an introduction there, an hour of practice, a
          hard-won lesson. Reciprocal relationships turn those scattered pieces into
          opportunities neither side could have created alone.
        </p>
        <p>
          This belief sits close to Meta&apos;s emphasis on building connection and community
          and promoting economic opportunity. Tulay is an independent project, and nothing
          here claims Meta&apos;s endorsement. The alignment is philosophical: people move
          forward together.
        </p>
      </div>

      <h2 className="mt-12 text-2xl font-bold text-ink">Why Tulay exists</h2>
      <div className="mt-4 space-y-4 text-ink">
        <p>
          Tulay connects complementary needs, skills, offers, and goals. You state what you
          need and what you can give. Tulay finds someone whose giving matches your needing,
          and whose needing matches your giving. Then it helps the two of you agree on one
          concrete next step and record what happened.
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
          Career paths, freelance work, and founding a venture need different tools: maps and
          simulators, services and proposals, workshops and research. So Tulay grows three
          studios: <strong>Career Studio</strong> for moves between roles,{' '}
          <strong>Freelance Studio</strong> for services and clients, and{' '}
          <strong>Venture Studio</strong> for ideas becoming ventures.
        </p>
        <p>
          Underneath, there is exactly one engine: reciprocal people-matching, introduction
          requests with consent, agreed next steps, and recorded outcomes. A career mentoring
          session, a freelancer skill swap, and a co-founder conversation are the same human
          mechanism. The studios simply speak the language of each journey.
        </p>
      </div>

      <h2 className="mt-12 text-2xl font-bold text-ink">AI assists, people connect</h2>
      <p className="mt-4 text-ink">
        AI can draft an introduction, suggest a next step, or map adjacent careers. It cannot
        vouch for you, practice with you, or introduce you to its network. Tulay uses AI for
        words and structure, and reserves the human parts for humans. Success is not
        engagement or matches made. It is a recorded answer to one question: did somebody
        actually move forward?
      </p>

      <h2 className="mt-12 text-2xl font-bold text-ink">
        An honest note on where Tulay is today
      </h2>
      <div className="mt-4 space-y-4 text-ink">
        <p>
          Tulay began as a hackathon-built minimum viable product, created to test whether AI
          can help people help each other. The demo you can try today uses fictional members,
          simulated recipient replies, and records stored only in your browser. It
          demonstrates the mechanism. It is not yet a live community.
        </p>
        <p>
          The intended platform keeps the same engine and adds what a prototype cannot: real
          accounts, persistent records, genuine matching between real members, and real
          collaborations. That work is deliberately scheduled after the hackathon so the
          current build stays stable. We publish no founder biographies, no testimonials, no
          impact statistics, and no guarantees. Only the mechanism, the demo, and whatever
          collaborators honestly record.
        </p>
      </div>

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
