import Link from 'next/link'
import { Arko } from '@/components/Arko'
import { LogoMark } from '@/components/Logo'
import { ArrowRight, Briefcase, Leaf, Rocket } from '@/components/icons'
import { LinkButton } from '@/components/ui'
import { getCommunityStats } from '@/lib/community'

const STEPS = [
  { title: 'Name your next move', body: 'Say what you are working toward and the one thing that would help right now.' },
  { title: 'Meet people who can help', body: 'Tulay finds members whose offers fit your need, and shows when you can help each other.' },
  { title: 'Ask, with consent', body: 'You review every message. Nothing is shared until the other person says yes.' },
  { title: 'Take one step together', body: 'Agree on a small next step, follow through, and record whether it helped.' },
]

const JOURNEYS = [
  { Icon: Leaf, title: 'Change careers', body: 'Reviews, practice and advice from people who made the move.', tile: 'bg-mist', studio: 'career' },
  { Icon: Briefcase, title: 'Grow as a freelancer', body: 'Pricing, proposals and skill swaps with fellow freelancers.', tile: 'bg-peach/70', studio: 'freelance' },
  { Icon: Rocket, title: 'Build a company', body: 'A co-founder, pitch feedback and early users from people who know your market.', tile: 'bg-[#e9eef8]', studio: 'venture' },
]

export default function Home() {
  const stats = getCommunityStats()
  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-10 pb-16 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-20 lg:pb-24">
        <div>
          <p className="inline-flex rounded-full border border-forest/30 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-forest uppercase">
            People · Opportunities · Progress
          </p>
          <h1 className="mt-5 text-4xl leading-[1.05] font-extrabold tracking-tight text-ink sm:text-5xl lg:text-6xl">
            Your next career move shouldn&apos;t be a solo mission.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted">
            Tulay helps freelancers, career changers and independent workers find people who can help them move
            forward, while finding ways to help others in return.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <LinkButton href="/start" size="lg">
              Find my people
              <ArrowRight className="h-5 w-5" />
            </LinkButton>
            <LinkButton href="#how-it-works" variant="quiet" size="lg">
              How it works
            </LinkButton>
          </div>
          <p className="mt-4 text-sm text-muted">
            Demo: {stats.members} fictional community members. No sign-up, nothing leaves your browser.
          </p>
        </div>
        <div className="relative">
          <BridgeScene />
          <Arko state="idle" size={72} className="pointer-events-none absolute right-4 bottom-3 sm:right-8" />
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-20 border-y border-line/70 bg-white/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-3xl font-extrabold tracking-tight text-ink">From a goal to real help</h2>
          <p className="mt-2 max-w-2xl text-muted">
            AI helps with the words. Real people do the helping, and you decide who you talk to.
          </p>
          <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <li key={step.title} className="relative">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-forest text-sm font-bold text-white">{index + 1}</span>
                <h3 className="mt-4 text-lg font-bold text-ink">{step.title}</h3>
                <p className="mt-1 text-sm text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-3xl font-extrabold tracking-tight text-ink">What&apos;s your next move?</h2>
        <p className="mt-2 text-muted">Pick your journey. Every journey leads to people, not a chatbot.</p>
        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {JOURNEYS.map(({ Icon, title, body, tile, studio }) => (
            <li key={title} className={`rounded-[var(--radius-card)] p-6 transition hover:ring-2 hover:ring-forest/40 ${tile}`}>
              <Link href={`/studios/${studio}`} aria-label={`${title}: open the studio`} className="block rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-forest">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-forest shadow-sm">
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-lg font-bold text-ink">{title}</h3>
                <p className="mt-1 text-sm text-muted">{body}</p>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-10 flex flex-col items-start gap-6 rounded-[var(--radius-card)] bg-forest p-8 text-ivory sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <LogoMark className="h-12 w-12 shrink-0 text-ivory" />
            <p className="max-w-lg text-lg font-semibold">
              Consent before contact. Real people only. Success means someone actually got help.
            </p>
          </div>
          <LinkButton href="/signup" variant="accent" size="lg">
            Get started
          </LinkButton>
        </div>
      </section>
    </>
  )
}

/** Decorative: two people meeting on a bridge. Hidden from assistive tech. */
function BridgeScene() {
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-lg overflow-hidden rounded-b-[2.5rem]">
      <svg viewBox="0 0 400 300" className="w-full">
        <circle cx="300" cy="80" r="44" fill="#FF7A59" opacity="0.85" />
        <path d="M0 230 C70 170 130 190 200 200 C270 210 330 160 400 190 V300 H0Z" fill="#EBF3EA" />
        <path d="M0 260 C90 230 170 250 240 245 C310 240 350 225 400 235 V300 H0Z" fill="#4CAF7A" opacity="0.35" />
        <path d="M60 250 C60 175 120 140 200 140 C280 140 340 175 340 250" fill="none" stroke="#176B46" strokeWidth="18" strokeLinecap="round" />
        <rect x="40" y="128" width="320" height="14" rx="7" fill="#176B46" />
        <g>
          <circle cx="150" cy="86" r="14" fill="#176B46" />
          <rect x="136" y="102" width="28" height="26" rx="12" fill="#176B46" />
        </g>
        <g>
          <circle cx="250" cy="86" r="14" fill="#FF7A59" />
          <rect x="236" y="102" width="28" height="26" rx="12" fill="#FF7A59" />
        </g>
        <path d="M172 100 Q200 82 228 100" fill="none" stroke="#1F2937" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 7" />
      </svg>
    </div>
  )
}
