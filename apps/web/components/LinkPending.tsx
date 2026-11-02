'use client'

import { useLinkStatus } from 'next/link'

/**
 * Place inside a <Link>: shows a spinner on the clicked link while its route loads, so every
 * navigation gives immediate feedback even before the route's loading screen appears.
 */
export function LinkPending() {
  const { pending } = useLinkStatus()
  if (!pending) return null
  return (
    <>
      <span
        aria-hidden="true"
        className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
      />
      <span className="sr-only">Loading</span>
    </>
  )
}
