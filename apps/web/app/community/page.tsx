import type { Metadata } from 'next'
import Link from 'next/link'
import { Arko } from '@/components/Arko'
import { LinkButton, Notice } from '@/components/ui'
import { ArrowRight } from '@/components/icons'
import { getPublicCommunity } from '@/lib/directory'
import { FICTIONAL_STORY_LABEL, listStories } from '@tulay/shared/stories'
import { ProfileCarousel } from './ProfileCarousel'

export const metadata: Metadata = {
  title: 'Community preview · Tulay',
  description:
    'Browse sample community profiles: skills, offers, needs, and the collaborations they seek. Fictional demo members.',
}

const STUDIO_LABEL: Record<string, string> = {
  career: 'Career Studio',
  freelance: 'Freelance Studio',
  company: 'Venture Studio',
}

/**
 * Public community preview: a browsable carousel of the sample demo profiles
 * (fixture data, illustrated avatars, Sample Profile labels) plus the
 * illustrative demo stories. No testimonials, no real-user claims, no
 * outcomes — real member content arrives only with accounts and consent.
 */
export default function CommunityPage() {
  const members = getPublicCommunity().filter((member) => member.profile.discoverable)
  const stories = listStories()
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-52 flex-1">
          <p className="text-sm text-muted">Community preview</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-ink">
            People you could meet here.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted">
            Every profile below is a fictional sample from the demo community: their skills,
            offers, needs, and the kind of collaboration they seek. Sign in one day to meet
            real members the same way.
          </p>
        </div>
        <Arko state="searching" size={72} label="Arko browsing the community" />
      </div>

      <div className="mt-6">
        <Notice tone="demo" title="Sample profiles, clearly labelled">
          Illustrated avatars and fictional details. No contact information is shown before
          mutual consent — not here, not anywhere on Tulay.
        </Notice>
      </div>

      <div className="mt-8">
        <ProfileCarousel members={members} />
      </div>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <LinkButton href="/start">
          Try the demo journey
          <ArrowRight className="h-4 w-4" />
        </LinkButton>
        <LinkButton href="/discover" variant="secondary">
          Browse the directory
        </LinkButton>
      </div>

      <section aria-labelledby="illustrative-stories" className="mt-14 border-t border-line/70 pt-10">
        <p className="text-sm text-muted">Illustrative stories</p>
        <h2 id="illustrative-stories" className="mt-2 text-3xl font-extrabold tracking-tight text-ink">
          Crossings people made together.
        </h2>
        <p className="mt-4 max-w-2xl text-muted">
          Challenge, connection, collaboration, outcome — the same four beats every time.
          These first stories are illustrative demo scenarios with fictional members.
        </p>
        <p className="mt-4 inline-flex items-center rounded-full border border-coral/60 bg-peach px-3 py-1 text-sm font-semibold text-coral-ink">
          {FICTIONAL_STORY_LABEL}
        </p>
        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          {stories.map((story) => (
            <li key={story.slug} className="rounded-[var(--radius-card)] border border-line/70 bg-white p-5 shadow-[var(--shadow-card)]">
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">
                {STUDIO_LABEL[story.studio] ?? story.studio}
              </p>
              <h3 className="mt-1 font-bold text-ink">{story.persona}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-muted">{story.context}</p>
              <Link
                href={`/stories/${story.slug}`}
                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-forest hover:underline"
              >
                Read the demo story
                <ArrowRight className="h-4 w-4" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
