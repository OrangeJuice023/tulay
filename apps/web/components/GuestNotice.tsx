import Link from 'next/link'

/**
 * One-line guest disclosure shared by Home, Ask Arko and the studio
 * dashboards: names the sample context, states what is simulated, and links
 * Sign in / Get started without interrupting the demo.
 */
export function GuestNotice({ line }: { line: string }) {
  return (
    <p className="mt-1.5 text-[13px] leading-snug text-muted">
      {line}{' '}
      <Link href="/login" className="font-semibold text-forest hover:underline">
        Sign in
      </Link>
      {' · '}
      <Link href="/signup" className="font-semibold text-forest hover:underline">
        Get started
      </Link>
    </p>
  )
}
