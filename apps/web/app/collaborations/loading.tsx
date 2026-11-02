import { Skeleton } from '@/components/LoadingScreen'

export default function Loading() {
  return (
    <div role="status" className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <span className="sr-only">Loading your collaborations…</span>
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="mt-3 h-5 w-full max-w-md" />
      <div className="mt-8 space-y-4">
        {Array.from({ length: 2 }, (_, i) => (
          <Skeleton key={i} className="h-40 rounded-[var(--radius-card)]" />
        ))}
      </div>
    </div>
  )
}
