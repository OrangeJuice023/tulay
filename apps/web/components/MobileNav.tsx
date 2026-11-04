'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { LinkPending } from './LinkPending'
import { buttonClass } from './ui'

/**
 * Public navigation. Ask Arko is linked here as the guest entry point (it
 * also appears in the workspace sidebar for signed-in users). The remaining
 * workspace pages (Home, Discover, Introductions, Collaborations, Profile)
 * are reached through the in-app sidebar (AppNav).
 */
const LINKS = [
  { href: '/ask', label: 'Ask Arko' },
  { href: '/explore', label: 'Explore Studios' },
  { href: '/community', label: 'Community' },
  { href: '/our-story', label: 'Our Story' },
  { href: '/#how-it-works', label: 'How it works' },
]

/** Mobile navigation: menu button + panel. Desktop links live in the header. */
export function MobileNav() {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open ])

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-3 text-sm font-semibold text-ink hover:bg-mist focus-visible:ring-2 focus-visible:ring-forest focus-visible:outline-none"
      >
        {open ? 'Close' : 'Menu'}
      </button>
      {open && (
        <div
          ref={panelRef}
          id="mobile-nav-panel"
          className="absolute inset-x-0 top-full border-b border-line bg-ivory px-4 pt-2 pb-4 shadow-[var(--shadow-card)]"
        >
          <nav aria-label="Mobile">
            <ul className="flex flex-col gap-1">
              {LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="block min-h-11 rounded-2xl px-3 py-2.5 text-base font-medium text-ink hover:bg-mist focus-visible:ring-2 focus-visible:ring-forest focus-visible:outline-none"
                  >
                    {link.label}
                    <LinkPending />
                  </Link>
                </li>
              ))}
              <li className="flex flex-col gap-2 pt-2">
                <Link href="/signup" onClick={() => setOpen(false)} className={buttonClass('primary', 'md')}>
                  Get started
                  <LinkPending />
                </Link>
                <span className="flex gap-2">
                  <Link href="/start" onClick={() => setOpen(false)} className={buttonClass('secondary', 'md')}>
                    Try the demo
                    <LinkPending />
                  </Link>
                  <Link href="/login" onClick={() => setOpen(false)} className={buttonClass('quiet', 'md')}>
                    Sign in
                    <LinkPending />
                  </Link>
                </span>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </div>
  )
}

/** Desktop navigation links. Hidden on phones (see MobileNav). */
export function DesktopNav() {
  return (
    <nav aria-label="Primary" className="hidden items-center gap-0.5 md:flex">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="rounded-full px-2.5 py-2 text-sm font-medium whitespace-nowrap text-ink hover:bg-mist focus-visible:ring-2 focus-visible:ring-forest focus-visible:outline-none"
        >
          {link.label}
          <LinkPending />
        </Link>
      ))}
    </nav>
  )
}
