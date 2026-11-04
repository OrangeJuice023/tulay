'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { PublicCommunityMember } from '@/lib/directory'
import { DemoBadge, LinkButton, Tag, humanizeTag } from '@/components/ui'
import { avatarFor } from './avatars'

/** Reduced-motion preference as external state (no setState-in-effect). */
function subscribeReduceMotion(callback: () => void): () => void {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)')
  query.addEventListener('change', callback)
  return () => query.removeEventListener('change', callback)
}

function readReduceMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Horizontally browsable sample-profile carousel. Button + arrow-key driven,
 * no autoplay, and instant (non-smooth) scrolling when the visitor prefers
 * reduced motion. Every card is fixture data with a Sample Profile label —
 * no testimonials, no real-user claims, no outcomes.
 */
export function ProfileCarousel({ members }: { members: PublicCommunityMember[] }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState(0)
  const reduceMotion = useSyncExternalStore(subscribeReduceMotion, readReduceMotion, () => false)

  const updatePosition = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const card = track.querySelector<HTMLElement>('[data-carousel-card]')
    const step = card ? card.offsetWidth + 12 : 320
    setPosition(Math.round(track.scrollLeft / step))
  }, [])

  useEffect(() => {
    updatePosition()
  }, [updatePosition, members.length])

  function scrollByCard(direction: 1 | -1) {
    const track = trackRef.current
    if (!track) return
    const card = track.querySelector<HTMLElement>('[data-carousel-card]')
    const step = card ? card.offsetWidth + 12 : 320
    track.scrollBy({ left: direction * step, behavior: reduceMotion ? 'auto' : 'smooth' })
  }

  const maxPosition = Math.max(0, members.length - 1)

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted" aria-live="polite">
          Profile {Math.min(position + 1, members.length)} of {members.length}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => scrollByCard(-1)}
            disabled={position <= 0}
            aria-label="Previous profile"
            className="grid h-11 w-11 place-items-center rounded-full border border-line/70 bg-white text-ink shadow-[var(--shadow-card)] transition hover:border-forest/40 disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true" className="h-5 w-5">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => scrollByCard(1)}
            disabled={position >= maxPosition}
            aria-label="Next profile"
            className="grid h-11 w-11 place-items-center rounded-full border border-line/70 bg-white text-ink shadow-[var(--shadow-card)] transition hover:border-forest/40 disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true" className="h-5 w-5">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
      <div
        ref={trackRef}
        role="region"
        aria-roledescription="carousel"
        aria-label="Sample community profiles"
        tabIndex={0}
        onScroll={updatePosition}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') {
            event.preventDefault()
            scrollByCard(1)
          } else if (event.key === 'ArrowLeft') {
            event.preventDefault()
            scrollByCard(-1)
          }
        }}
        className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2"
      >
        {members.map((member, index) => {
          const id = member.profile.id as string
          const avatar = avatarFor(id)
          const offer = member.offers[0]
          const need = member.needs.find((item) => item.status === 'open') ?? member.needs[0]
          return (
            <article
              key={id}
              data-carousel-card=""
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${members.length}: ${member.profile.displayName}`}
              className="w-72 shrink-0 snap-start rounded-[var(--radius-card)] border border-line/70 bg-white p-5 shadow-[var(--shadow-card)] sm:w-80"
            >
              <div className="flex items-center gap-3">
                {avatar ? (
                  <Image
                    src={avatar}
                    alt=""
                    width={64}
                    height={64}
                    className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-mist"
                  />
                ) : (
                  <span aria-hidden="true" className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-mist text-lg font-bold text-forest">
                    {member.profile.displayName
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join('')
                      .toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-bold text-ink">{member.profile.displayName}</h3>
                  <div className="mt-1">
                    <DemoBadge label="Sample Profile" />
                  </div>
                </div>
              </div>
              <p className="mt-3 line-clamp-2 text-sm text-muted">{member.profile.careerGoal}</p>
              {offer && (
                <div className="mt-3">
                  <p className="text-[13px] font-semibold text-ink">Offers</p>
                  <p className="mt-0.5 line-clamp-2 text-sm text-muted">{offer.description}</p>
                  {offer.tags.length > 0 && (
                    <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label="Offer skills">
                      {offer.tags.slice(0, 3).map((tag) => (
                        <li key={tag}>
                          <Tag>{humanizeTag(tag)}</Tag>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {need && (
                <div className="mt-3">
                  <p className="text-[13px] font-semibold text-ink">Looking for</p>
                  <p className="mt-0.5 line-clamp-2 text-sm text-muted">{need.description}</p>
                </div>
              )}
              <div className="mt-4">
                <LinkButton href={`/ask?meet=${id}`} variant="secondary" size="md">
                  Ask for an intro
                </LinkButton>
              </div>
              <p className="mt-2 text-xs text-muted">
                <Link href="/discover" className="font-semibold text-forest hover:underline">
                  See all in the directory
                </Link>
              </p>
            </article>
          )
        })}
      </div>
    </div>
  )
}
