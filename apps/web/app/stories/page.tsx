import type { Metadata } from 'next'
import { Arko } from '@/components/Arko'
import { LinkButton, Tag } from '@/components/ui'
import { ArrowRight } from '@/components/icons'
import { FICTIONAL_STORY_LABEL, listStories } from '@tulay/shared/stories'
import { LogoMark } from '@/components/Logo'

export const metadata: Metadata = {
  title: 'Community stories',
  description:
    'Illustrative demo stories of career moves, freelance collaborations and founder connections: challenge, connection, collaboration, outcome.',
}

const STUDIO_LABEL: Record<string, string> = {
  career: 'Career Studio',
  freelance: 'Freelance Studio',
  company: 'Venture Studio',
}

export default function StoriesPage() {
  const stories = listStories()
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <p className="text-sm text-muted">Community stories</p>
      <h1 className="mt-2 max-w-2xl text-4xl font-extrabold tracking-tight text-ink">
        Crossings people made together.
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted">
        Every story here follows the same four beats: the challenge, the connection, the
        collaboration, and the outcome. These first stories are illustrative demo scenarios with
        fictional members. Real member stories can be added later, with explicit permission, and
        will reuse this exact shape.
      </p>
      <p className="mt-4 inline-flex items-center rounded-full border border-coral/60 bg-peach px-3 py-1 text-sm font-semibold text-coral-ink">
        {FICTIONAL_STORY_LABEL}
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {stories.map((story) => (
          <article
            key={story.slug}
            className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line/70 bg-white p-6 shadow-[var(--shadow-card)]"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Tag>{STUDIO_LABEL[story.studio]}</Tag>
              <span className="text-xs font-semibold tracking-wide text-coral-ink uppercase">
                {FICTIONAL_STORY_LABEL}
              </span>
            </div>
            <h2 className="text-xl font-bold text-ink">
              {story.persona}, {story.context}
            </h2>
            <p className="text-sm text-muted">
              <span className="font-semibold text-ink">The challenge: </span>
              {story.challenge}
            </p>
            <p className="text-sm text-muted">
              <span className="font-semibold text-ink">The outcome: </span>
              {story.outcome}
            </p>
            <LinkButton href={`/stories/${story.slug}`} className="mt-auto self-start">
              Read the full story
              <ArrowRight className="h-4 w-4" />
            </LinkButton>
          </article>
        ))}
      </div>

      <div className="mt-10 flex items-center gap-4 rounded-[var(--radius-card)] border border-line/70 bg-white p-6 shadow-[var(--shadow-card)]">
        <Arko state="empty" size={64} />
        <div>
          <p className="font-semibold text-ink">Stories begin with a first collaboration.</p>
          <p className="mt-1 text-sm text-muted">
            Try the demo journey: get matched, agree a next step, and record what happened.
          </p>
          <LinkButton href="/start" className="mt-3">
            Start the demo journey
            <ArrowRight className="h-4 w-4" />
          </LinkButton>
        </div>
      </div>

      <p className="mt-8 flex items-center gap-2 text-sm text-muted">
        <LogoMark className="h-5 w-5" />
        Real stories from the community will appear here only with explicit permission.
      </p>
    </div>
  )
}
