import { Skeleton } from '@/components/LoadingScreen'

// Mirrors the journey's first step (progress bar, heading, three path cards) to avoid layout jumps.
export default function Loading() {
  return (
    <div role="status" className="mx-auto w-full max-w-3xl px-4 pt-6 pb-16 sm:px-6 sm:pt-10">
      <span className="sr-only">Loading your journey…</span>
      <div className="mb-8 flex gap-1.5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-1.5 flex-1 rounded-full" />
        ))}
      </div>
      <Skeleton className="h-4 w-20" />
      <Skeleton className="mt-3 h-10 w-3/4" />
      <Skeleton className="mt-3 h-5 w-full max-w-lg" />
      <div className="mt-8 grid gap-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-[var(--radius-card)]" />
        ))}
      </div>
    </div>
  )
}
