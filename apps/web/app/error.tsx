'use client'

import { Button } from '@/components/ui'

/** Last-resort error screen for the whole app. Demo state stays in the browser. */
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 text-center sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">Something went wrong</h1>
      <p className="mx-auto mt-2 max-w-md text-muted">
        Tulay hit an unexpected error. Your saved demo collaborations are safe in this browser.
      </p>
      <div className="mt-6">
        <Button onClick={() => reset()}>Try again</Button>
      </div>
    </div>
  )
}
