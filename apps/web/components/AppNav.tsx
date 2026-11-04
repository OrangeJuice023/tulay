'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Arko } from './Arko'
import {
  Briefcase,
  Chat,
  Compass,
  Home,
  Mail,
  Rocket,
  Leaf,
  User,
  Users,
} from './icons'

const ITEMS = [
  { href: '/home', label: 'Home', Icon: Home },
  { href: '/ask', label: 'Ask Arko', Icon: Chat },
  { href: '/discover', label: 'Discover', Icon: Compass },
  { href: '/introductions', label: 'Introductions', Icon: Mail, badgeKey: 'introductions' as const },
  { href: '/collaborations', label: 'Collaborations', Icon: Users },
  { href: '/profile', label: 'My Profile', Icon: User },
]

const STUDIOS = [
  { href: '/studios/career', label: 'Career Studio', Icon: Leaf },
  { href: '/studios/freelance', label: 'Freelance Studio', Icon: Briefcase },
  { href: '/studios/venture', label: 'Venture Studio', Icon: Rocket },
]

/**
 * In-app sidebar for Home, Ask Arko, Discover, Introductions, Collaborations
 * and Profile. Vertical on desktop; a horizontal scroll strip on phones.
 * The Introductions badge shows the real pending count (hidden at zero).
 */
export function AppNav({ pendingIntroductions = 0 }: { pendingIntroductions?: number }) {
  const pathname = usePathname()
  return (
    <nav
      aria-label="Workspace"
      className="w-full shrink-0 lg:sticky lg:top-20 lg:w-60 lg:self-start"
    >
      <div className="lg:rounded-[var(--radius-card)] lg:border lg:border-line/70 lg:bg-white lg:p-3 lg:shadow-[var(--shadow-card)]">
        <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
          {ITEMS.map(({ href, label, Icon, badgeKey }) => {
            const active = pathname === href || (href !== '/home' && pathname.startsWith(href))
            const badge = badgeKey === 'introductions' ? pendingIntroductions : 0
            return (
              <li key={href} className="shrink-0">
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-11 items-center gap-2.5 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition lg:rounded-2xl ${
                    active ? 'bg-mist text-forest-dark' : 'text-ink hover:bg-mist/60'
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {label}
                  {badge > 0 && (
                    <span
                      aria-label={`${badge} pending`}
                      className="ml-auto grid h-6 min-w-6 place-items-center rounded-full bg-forest px-1.5 text-xs font-bold text-white"
                    >
                      {badge}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
        <div className="mt-4 hidden border-t border-line/70 pt-3 lg:block">
          <p className="px-3 text-[13px] font-semibold text-muted">Studios</p>
          <ul className="mt-1 space-y-0.5">
            {STUDIOS.map(({ href, label, Icon }) => {
              const active = pathname === href
              return (
                <li key={label}>
                  <Link
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={`flex min-h-10 items-center gap-2.5 rounded-2xl px-3 py-1.5 text-sm font-medium transition ${
                      active ? 'bg-mist font-semibold text-forest-dark' : 'text-ink hover:bg-mist/60'
                    }`}
                  >
                    <Icon className="h-4.5 w-4.5 shrink-0 text-forest" />
                    {label}
                  </Link>
                </li>
              )
            })}
          </ul>
          <div className="mt-3 flex items-center gap-2 rounded-2xl bg-ivory px-3 py-2.5">
            <Arko state="idle" size={40} />
            <p className="text-xs leading-snug text-muted">
              One journey per studio. Switch anytime — your work stays where you left it.
            </p>
          </div>
        </div>
      </div>
    </nav>
  )
}
