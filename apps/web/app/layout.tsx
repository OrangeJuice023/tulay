import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import { Wordmark } from '@/components/Logo'
import { buttonClass } from '@/components/ui'
import { LinkPending } from '@/components/LinkPending'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

export const metadata: Metadata = {
  title: "Tulay · Your next career move shouldn't be a solo mission",
  description:
    'Tulay helps freelancers, career changers and independent workers find people who can help them move forward, and ways to help others in return.',
}

export const viewport: Viewport = {
  themeColor: '#FFF9F2',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only z-50 rounded-full bg-forest px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <header className="sticky top-0 z-30 border-b border-line/70 bg-ivory/90 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
            <Link href="/" aria-label="Tulay home" className="rounded-full">
              <Wordmark />
            </Link>
            <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
              <Link href="/#how-it-works" className="hidden min-h-11 items-center rounded-full px-3 text-sm font-medium text-ink hover:bg-mist sm:inline-flex">
                How it works
              </Link>
              <Link href="/collaborations" className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-medium whitespace-nowrap text-ink hover:bg-mist">
                My collaborations
                <LinkPending />
              </Link>
              {/* Wrapper hides it on phones: buttonClass's inline-flex would override `hidden`. */}
              <span className="hidden sm:block">
                <Link href="/start" className={buttonClass('primary', 'md')}>
                  Get started
                  <LinkPending />
                </Link>
              </span>
            </nav>
          </div>
        </header>
        <main id="main" className="flex-1">
          {children}
        </main>
        <footer className="border-t border-line/70">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-6 text-sm text-muted sm:flex-row sm:justify-between sm:px-6">
            <p>Tulay · Hackathon prototype. Community members shown are fictional demo data.</p>
            <p>People · Opportunities · Progress</p>
          </div>
        </footer>
      </body>
    </html>
  )
}
