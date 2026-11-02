import { LogoMark } from './Logo'

/** Branded route-level loading screen. Announced once to screen readers via role="status". */
export function LoadingScreen({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className="grid min-h-[60vh] place-items-center px-4">
      <div className="flex flex-col items-center gap-4 text-muted">
        <LogoMark className="h-14 w-14 text-forest motion-safe:animate-pulse" />
        <span className="text-sm font-medium">{label}</span>
      </div>
    </div>
  )
}

/** Grey placeholder block for skeleton layouts. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={`block rounded-2xl bg-line/60 motion-safe:animate-pulse ${className}`} />
}
