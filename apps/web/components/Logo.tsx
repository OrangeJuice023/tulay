/**
 * Tulay mark: two people joined by a bridge (deck + pier read as a T, the arch carries them).
 * Green parts use `currentColor` so the mark works on dark surfaces (set `text-ivory`).
 * Static copies for non-React use: `public/brand/tulay-mark.svg`, `tulay-wordmark.svg`.
 */
export function LogoMark({ className = 'h-8 w-8', title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <circle cx="10" cy="9" r="5" fill="currentColor" />
      <circle cx="38" cy="9" r="5" fill="#FF7A59" />
      <rect x="3" y="17" width="42" height="6" rx="3" fill="currentColor" />
      <rect x="21" y="17" width="6" height="25" rx="3" fill="currentColor" />
      <path
        d="M8 42 C8 30 15 23 24 23 C33 23 40 30 40 42"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark className="h-8 w-8 text-forest" />
      <span className="text-2xl font-extrabold tracking-tight text-ink">Tulay</span>
    </span>
  )
}
