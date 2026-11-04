'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  DECK_TEMPLATES,
  Deck,
  DeckOutlineSchema,
  DeckTemplate,
  addSlide,
  applyDeckOutline,
  createDeck,
  deleteSlide,
  moveSlide,
  updateSlide,
} from '@tulay/shared'
import { Arko } from '@/components/Arko'
import { Button, LinkButton, Notice, TextAreaField, TextField } from '@/components/ui'
import { downloadDeckPptx } from '@/lib/deck-export'
import { loadLocalDecks, saveLocalDecks } from '@/lib/deck-store'
import { deleteDeckAction, saveDeckAction } from './actions'
import { draftOutlineAction } from './ai-actions'

type SaveState = { status: 'idle' | 'saving' | 'saved' | 'error'; at?: string; error?: string }

const TEMPLATE_IDS = Object.keys(DECK_TEMPLATES) as DeckTemplate[]

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  } catch {
    return iso
  }
}

export function DeckStudio({ mode, initial }: { mode: 'authed' | 'demo'; initial: Deck[] }) {
  const [decks, setDecks] = useState<Deck[]>(initial)
  const [activeId, setActiveId] = useState<string | null>(initial[0]?.id ?? null)
  const [dirty, setDirty] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>({ status: 'idle' })
  const [showNew, setShowNew] = useState(initial.length === 0)
  const [draft, setDraft] = useState({ title: '', template: 'startup' as DeckTemplate, purpose: '', audience: '', context: '' })
  const [drafting, setDrafting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [selectedSlide, setSelectedSlide] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [draftNote, setDraftNote] = useState<string | null>(null)

  // Guests hydrate from this browser's storage; the server sent nothing.
  // Mount-only external-store sync (reading localStorage during render would
  // mismatch SSR), so the set-state-in-effect rule does not apply here.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- mount-only localStorage hydration */
    if (mode !== 'demo') return
    const local = loadLocalDecks()
    if (local.length > 0) {
      setDecks(local)
      setActiveId(local[0]?.id ?? null)
      setShowNew(false)
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [mode])

  const active = decks.find((deck) => deck.id === activeId) ?? null
  const activeSlide = active?.slides.find((slide) => slide.id === (selectedSlide ?? active?.slides[0]?.id)) ?? active?.slides[0] ?? null

  function touch(next: Deck[]) {
    setDecks(next)
    setDirty(true)
  }

  function mutateActive(mutator: (deck: Deck) => Deck) {
    if (!active) return
    touch(decks.map((deck) => (deck.id === active.id ? mutator(deck) : deck)))
  }

  async function persist(next: Deck[], targetId: string): Promise<boolean> {
    const target = next.find((deck) => deck.id === targetId)
    if (!target) return false
    if (mode === 'demo') {
      saveLocalDecks(next)
      setSaveState({ status: 'saved', at: new Date().toISOString() })
      setDirty(false)
      return true
    }
    setSaveState({ status: 'saving' })
    try {
      const result = await saveDeckAction(target)
      if (!result.ok) {
        setSaveState({ status: 'error', error: result.error })
        return false
      }
      setDecks((current) => current.map((deck) => (deck.id === targetId ? result.data : deck)))
      setSaveState({ status: 'saved', at: result.data.updatedAt })
      setDirty(false)
      return true
    } catch {
      setSaveState({ status: 'error', error: 'Could not save this deck. Try again.' })
      return false
    }
  }

  async function saveActive() {
    if (!active || saveState.status === 'saving') return
    await persist(decks, active.id)
  }

  function createBlank() {
    if (!draft.title.trim()) {
      setError('Give the deck a title first.')
      return
    }
    setError(null)
    const deck = createDeck({
      id: crypto.randomUUID(),
      title: draft.title.trim(),
      template: draft.template,
      purpose: draft.purpose.trim(),
      audience: draft.audience.trim(),
      context: draft.context.trim(),
    })
    const next = [deck, ...decks]
    setDecks(next)
    setActiveId(deck.id)
    setSelectedSlide(deck.slides[0]?.id ?? null)
    setShowNew(false)
    setDraft({ title: '', template: 'startup', purpose: '', audience: '', context: '' })
    void persist(next, deck.id)
  }

  async function createWithDraft() {
    if (!draft.title.trim() || drafting) return
    setError(null)
    setDrafting(true)
    try {
      const result = await draftOutlineAction({
        title: draft.title.trim(),
        purpose: draft.purpose.trim(),
        audience: draft.audience.trim(),
        context: draft.context.trim(),
        template: draft.template,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      const outline = DeckOutlineSchema.parse(result.data.outline)
      setDraftNote(
        result.data.source === 'live'
          ? 'Drafted with live AI from your facts. Every slide is editable.'
          : 'Demo draft — connect a model key for live AI outlines. Every slide is editable.',
      )
      const blank = createDeck({
        id: crypto.randomUUID(),
        title: draft.title.trim(),
        template: draft.template,
        purpose: draft.purpose.trim(),
        audience: draft.audience.trim(),
        context: draft.context.trim(),
      })
      const deck = applyDeckOutline(blank, outline)
      const next = [deck, ...decks]
      setDecks(next)
      setActiveId(deck.id)
      setSelectedSlide(deck.slides[0]?.id ?? null)
      setShowNew(false)
      setDraft({ title: '', template: 'startup', purpose: '', audience: '', context: '' })
      await persist(next, deck.id)
    } catch {
      setError('The draft failed. Try again, or start from a blank deck.')
    } finally {
      setDrafting(false)
    }
  }

  async function removeDeck(id: string) {
    const deck = decks.find((entry) => entry.id === id)
    if (!deck) return
    if (!window.confirm(`Delete "${deck.title}"? This cannot be undone.`)) return
    if (mode === 'authed') {
      try {
        const result = await deleteDeckAction({ id })
        if (!result.ok) {
          setError(result.error)
          return
        }
      } catch {
        setError('Could not delete this deck. Try again.')
        return
      }
    }
    const next = decks.filter((entry) => entry.id !== id)
    setDecks(next)
    if (mode === 'demo') saveLocalDecks(next)
    if (activeId === id) {
      setActiveId(next[0]?.id ?? null)
      setSelectedSlide(null)
      setDirty(false)
    }
  }

  async function exportActive() {
    if (!active || exporting) return
    setError(null)
    setExporting(true)
    try {
      await downloadDeckPptx(active)
    } catch {
      setError('The export failed. Try again.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Arko state="thinking" size={64} label="Arko drafting" />
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-ink">Pitch Deck Studio</h1>
            <p className="mt-1 text-sm text-muted">Draft with AI, edit every slide, export to PowerPoint.</p>
          </div>
        </div>
        <Button variant={showNew ? 'quiet' : 'secondary'} onClick={() => setShowNew(!showNew)}>
          {showNew ? 'Close' : 'New deck'}
        </Button>
      </div>

      {mode === 'demo' ? (
        <div className="mt-4">
          <Notice tone="demo" title="Demo decks live in this browser only.">
            Everything works, but decks are saved to this browser, not your account.{' '}
            <Link href="/signup" className="font-semibold text-forest hover:underline">
              Create an account
            </Link>{' '}
            to keep them.
          </Notice>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted">
          Saved to your account · only you can see your decks until you share the file.
        </p>
      )}

      {showNew && (
        <section aria-label="Create a deck" className="mt-6 space-y-4 rounded-[var(--radius-card)] border border-line/70 bg-white p-6 shadow-[var(--shadow-card)]">
          <TextField
            id="deck-title"
            label="Deck title"
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            maxLength={160}
            placeholder="e.g. Acme pre-seed pitch"
            required
          />
          <fieldset>
            <legend className="text-sm font-semibold text-ink">Template</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {TEMPLATE_IDS.map((id) => (
                <label
                  key={id}
                  className={`cursor-pointer rounded-2xl border p-3 transition ${
                    draft.template === id ? 'border-forest bg-mist/60' : 'border-line hover:border-forest/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="deck-template"
                    value={id}
                    checked={draft.template === id}
                    onChange={() => setDraft({ ...draft, template: id })}
                    className="sr-only"
                  />
                  <span className="block text-[15px] font-bold text-ink">{DECK_TEMPLATES[id].label}</span>
                  <span className="block text-sm text-muted">{DECK_TEMPLATES[id].blurb}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-3">
            <TextAreaField id="deck-purpose" label="Purpose" value={draft.purpose} onChange={(event) => setDraft({ ...draft, purpose: event.target.value })} maxLength={2000} optional placeholder="e.g. Get feedback from founders" />
            <TextAreaField id="deck-audience" label="Audience" value={draft.audience} onChange={(event) => setDraft({ ...draft, audience: event.target.value })} maxLength={500} optional placeholder="e.g. Early-stage founders" />
            <TextAreaField id="deck-context" label="Context" value={draft.context} onChange={(event) => setDraft({ ...draft, context: event.target.value })} maxLength={4000} optional placeholder="e.g. Pre-launch task app for freelancers" />
          </div>
          <Notice tone="info" title="AI drafts from your facts only.">
            The outline uses only what you enter above. Unknowns come back as bracketed placeholders like
            [Add your monthly revenue] — never invented statistics.
          </Notice>
          <div className="flex flex-wrap gap-3">
            <Button onClick={createBlank} disabled={drafting}>
              Create blank deck
            </Button>
            <Button variant="secondary" loading={drafting} onClick={() => void createWithDraft()}>
              Draft with AI
            </Button>
          </div>
        </section>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm font-medium text-danger">
          {error}
        </p>
      )}

      {draftNote && !error && (
        <div className="mt-4">
          <Notice tone="info" title={draftNote} />
        </div>
      )}

      {decks.length === 0 && !showNew && (
        <div className="mt-6 rounded-[var(--radius-card)] border border-line/70 bg-white p-8 text-center shadow-[var(--shadow-card)]">
          <p className="text-lg font-bold text-ink">No decks yet.</p>
          <p className="mt-1 text-sm text-muted">Create one to start building your story.</p>
          <div className="mt-4 flex justify-center">
            <Button onClick={() => setShowNew(true)}>New deck</Button>
          </div>
        </div>
      )}

      {active && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside aria-label="Your decks" className="space-y-2">
            {decks.map((deck) => (
              <div
                key={deck.id}
                className={`rounded-2xl border p-3 transition ${
                  deck.id === active.id ? 'border-forest bg-mist/60' : 'border-line bg-white hover:border-forest/40'
                }`}
              >
                <button type="button" onClick={() => { setActiveId(deck.id); setSelectedSlide(deck.slides[0]?.id ?? null) }} className="block w-full text-left">
                  <span className="block truncate text-[15px] font-bold text-ink">{deck.title}</span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {deck.slides.length} slides · {DECK_TEMPLATES[deck.template].label}
                    {deck.source === 'ai-draft' ? ' · AI draft' : ''}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void removeDeck(deck.id)}
                  aria-label={`Delete ${deck.title}`}
                  className="mt-1 text-xs font-semibold text-danger hover:underline"
                >
                  Delete
                </button>
              </div>
            ))}
          </aside>

          <section aria-label="Deck editor" className="min-w-0 space-y-5">
            <div className="rounded-[var(--radius-card)] border border-line/70 bg-white p-5 shadow-[var(--shadow-card)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <label htmlFor="active-deck-title" className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Deck title
                  </label>
                  <input
                    id="active-deck-title"
                    value={active.title}
                    onChange={(event) => mutateActive((deck) => ({ ...deck, title: event.target.value.slice(0, 160) || deck.title }))}
                    maxLength={160}
                    className="mt-1 w-full rounded-xl border border-line bg-ivory px-3 py-2 text-lg font-bold text-ink focus:border-forest"
                  />
                  <p className="mt-1 text-xs text-muted">
                    {dirty ? 'Unsaved changes' : saveState.status === 'saved' && saveState.at ? `Saved ${formatTime(saveState.at)}` : 'No unsaved changes'}
                    {saveState.status === 'error' ? ` · ${saveState.error ?? 'Save failed'}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" loading={saveState.status === 'saving'} onClick={() => void saveActive()} disabled={!dirty}>
                    Save
                  </Button>
                  <Button loading={exporting} onClick={() => void exportActive()}>
                    Export .pptx
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
              <div className="space-y-3 rounded-[var(--radius-card)] border border-line/70 bg-white p-5 shadow-[var(--shadow-card)]">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-ink">Slides</h2>
                  <Button variant="quiet" onClick={() => mutateActive((deck) => addSlide(deck))}>
                    Add slide
                  </Button>
                </div>
                <ol className="space-y-2">
                  {active.slides.map((slide, index) => (
                    <li
                      key={slide.id}
                      className={`flex items-center gap-2 rounded-xl border p-2 ${
                        slide.id === activeSlide?.id ? 'border-forest bg-mist/60' : 'border-line'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedSlide(slide.id)}
                        className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-ink"
                        aria-current={slide.id === activeSlide?.id}
                      >
                        {index + 1}. {slide.title}
                      </button>
                      <button type="button" aria-label={`Move ${slide.title} up`} disabled={index === 0} onClick={() => mutateActive((deck) => moveSlide(deck, slide.id, -1))} className="rounded px-1.5 py-0.5 text-sm text-muted hover:bg-mist disabled:opacity-30">
                        ↑
                      </button>
                      <button type="button" aria-label={`Move ${slide.title} down`} disabled={index === active.slides.length - 1} onClick={() => mutateActive((deck) => moveSlide(deck, slide.id, 1))} className="rounded px-1.5 py-0.5 text-sm text-muted hover:bg-mist disabled:opacity-30">
                        ↓
                      </button>
                      <button type="button" aria-label={`Delete ${slide.title}`} disabled={active.slides.length <= 1} onClick={() => mutateActive((deck) => deleteSlide(deck, slide.id))} className="rounded px-1.5 py-0.5 text-sm text-danger hover:bg-red-50 disabled:opacity-30">
                        ✕
                      </button>
                    </li>
                  ))}
                </ol>
              </div>

              {activeSlide && (
                <div className="space-y-4">
                  <div className="space-y-3 rounded-[var(--radius-card)] border border-line/70 bg-white p-5 shadow-[var(--shadow-card)]">
                    <TextField
                      id="slide-title"
                      label="Slide title"
                      value={activeSlide.title}
                      onChange={(event) => mutateActive((deck) => updateSlide(deck, activeSlide.id, { title: event.target.value }))}
                      maxLength={160}
                      required
                    />
                    <TextAreaField
                      id="slide-bullets"
                      label="Bullets (one per line)"
                      value={activeSlide.bullets.join('\n')}
                      onChange={(event) =>
                        mutateActive((deck) =>
                          updateSlide(deck, activeSlide.id, {
                            bullets: event.target.value.split('\n').map((line) => line.trim()).filter(Boolean),
                          }),
                        )
                      }
                      hint="Bracketed lines like [Add your metric] are placeholders for you to fill in."
                      optional
                    />
                  </div>
                  <div aria-label="Slide preview" className="overflow-hidden rounded-[var(--radius-card)] border border-line/70 bg-white shadow-[var(--shadow-card)]">
                    <div className="border-b-4 border-forest bg-ink px-5 py-4">
                      <p className="text-xl font-extrabold text-white">{activeSlide.title}</p>
                    </div>
                    <ul className="space-y-2 px-5 py-4">
                      {activeSlide.bullets.length === 0 && (
                        <li className="text-[15px] italic text-muted">[Add content for this slide]</li>
                      )}
                      {activeSlide.bullets.map((bullet, index) => (
                        <li key={index} className="flex gap-2 text-[15px] text-ink">
                          <span aria-hidden="true" className="text-forest">•</span>
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="border-t border-line px-5 py-2 text-xs text-muted">
                      {active.title} · Built with Tulay
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      <p className="mt-8 text-center text-sm text-muted">
        Want human eyes on it?{' '}
        <LinkButton href="/ask?q=Who%20can%20review%20my%20pitch%20deck%3F" variant="secondary">
          Get pitch feedback
        </LinkButton>
      </p>
    </div>
  )
}
