import type { CandidateMatch } from '@tulay/shared'
import { Button, DemoBadge, Tag, humanizeTag } from './ui'
import { ArrowRight, Swap } from './icons'

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

/** One candidate from `findCandidates`. Everything shown here comes from the match itself. */
export function MatchCard({ match, onRequest }: { match: CandidateMatch; onRequest: () => void }) {
  const { profile, offer } = match
  const headingId = `match-${offer.id ?? profile.displayName}`
  return (
    <article
      aria-labelledby={headingId}
      className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-line/70 bg-white p-5 shadow-[var(--shadow-card)] sm:p-6"
    >
      <header className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-mist text-base font-bold text-forest"
        >
          {initials(profile.displayName)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 id={headingId} className="text-lg font-bold text-ink">
              {profile.displayName}
            </h3>
            {profile.isDemo && <DemoBadge />}
          </div>
          {profile.careerGoal && <p className="text-sm text-muted">Working toward: {profile.careerGoal}</p>}
        </div>
      </header>

      <div className="rounded-2xl bg-ivory p-4">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">How they could help you</p>
        <p className="mt-1 text-ink">{offer.description}</p>
        {offer.capacity && <p className="mt-1 text-sm text-muted">Capacity: {offer.capacity}</p>}
      </div>

      {match.sharedTags.length > 0 && (
        <div>
          <p className="sr-only">Matching skills</p>
          <ul className="flex flex-wrap gap-2">
            {match.sharedTags.map((tag) => (
              <li key={tag}>
                <Tag>{humanizeTag(tag)}</Tag>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="text-sm font-semibold text-ink">Why Tulay suggested them</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-muted">
          {match.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </div>

      {match.reciprocal ? (
        <p className="flex items-center gap-2 rounded-2xl bg-peach/70 px-4 py-3 text-sm font-medium text-coral-ink">
          <Swap className="h-4 w-4 shrink-0" />
          You can help each other: they need {match.reciprocalTags.map(humanizeTag).join(', ').toLowerCase()}.
        </p>
      ) : (
        <p className="text-sm text-muted">They are not asking for anything you listed. You can still offer later.</p>
      )}

      <Button className="mt-auto w-full sm:w-auto sm:self-start" onClick={onRequest}>
        Ask {profile.displayName.split(' ')[0]} for an introduction
        <ArrowRight className="h-4 w-4" />
      </Button>
    </article>
  )
}
