import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Arko } from '@/components/Arko'
import { LinkButton, Tag } from '@/components/ui'
import { ArrowLeft, ArrowRight } from '@/components/icons'
import { FICTIONAL_STORY_LABEL, getStory, listStorySlugs } from '@tulay/shared/stories'

export function generateStaticParams() {
  return listStorySlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const story = getStory(slug)
  return {
    title: story ? `${story.persona} — community story` : 'Community story',
    description: story
      ? `An illustrative demo story: ${story.context}. Challenge, connection, collaboration, outcome.`
      : 'An illustrative demo story from the Tulay community.',
  }
}

const STUDIO_LABEL: Record<string, string> = {
  career: 'Career Studio',
  freelance: 'Freelance Studio',
  company: 'Venture Studio',
}

const HELPED_LABEL: Record<string, string> = {
  yes: 'Recorded outcome: yes, they moved forward',
  partly: 'Recorded outcome: partly there',
  no: 'Recorded outcome: not yet',
}

export default async function StoryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const story = getStory(slug)
  if (!story) notFound()
  const beats = [
    { heading: 'The challenge', body: story.challenge },
    { heading: 'The connection', body: story.connection },
    { heading: 'The collaboration', body: story.collaboration },
    { heading: 'The outcome', body: story.outcome },
  ]
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <LinkButton href="/stories" variant="secondary">
        <ArrowLeft className="h-4 w-4" />
        All stories
      </LinkButton>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Tag>{STUDIO_LABEL[story.studio]}</Tag>
        <span className="text-xs font-semibold tracking-wide text-coral-ink uppercase">
          {FICTIONAL_STORY_LABEL}
        </span>
      </div>
      <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-ink">{story.persona}</h1>
      <p className="mt-2 text-lg text-muted">{story.context}</p>

      <div className="mt-8 space-y-4">
        {beats.map((beat) => (
          <section
            key={beat.heading}
            className="rounded-[var(--radius-card)] border border-line/70 bg-white p-6 shadow-[var(--shadow-card)]"
          >
            <h2 className="text-sm font-bold tracking-wide text-forest uppercase">
              {beat.heading}
            </h2>
            <p className="mt-2 text-ink">{beat.body}</p>
          </section>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-4 rounded-[var(--radius-card)] border border-line/70 bg-white p-6 shadow-[var(--shadow-card)]">
        <Arko
          state={story.helped === 'yes' ? 'celebration' : story.helped === 'partly' ? 'pending' : 'empty'}
          size={64}
        />
        <div>
          <p className="font-semibold text-ink">{HELPED_LABEL[story.helped]}</p>
          <p className="mt-1 text-sm text-muted">
            Outcomes are recorded by the collaborators themselves — yes, partly, or not yet. No
            outcome is ever invented or embellished.
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <LinkButton href="/start">
          Try the demo journey
          <ArrowRight className="h-4 w-4" />
        </LinkButton>
        <LinkButton href="/explore" variant="secondary">
          Explore the studios
        </LinkButton>
      </div>
    </div>
  )
}
