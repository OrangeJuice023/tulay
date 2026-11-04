'use client'

import { useState } from 'react'
import { Arko } from '@/components/Arko'
import { Button, LinkButton, Notice, TextAreaField, TextField } from '@/components/ui'
import { saveOnboardingAction } from './actions'

type StudioChoice = '' | 'career' | 'freelance' | 'venture'
type NeedDraft = { description: string; tags: string }

const STUDIOS: { value: Exclude<StudioChoice, ''>; title: string; blurb: string }[] = [
  { value: 'career', title: 'Change careers', blurb: 'Move into a new role with people who have done it.' },
  { value: 'freelance', title: 'Grow as a freelancer', blurb: 'Win better clients and sharpen your craft.' },
  { value: 'venture', title: 'Build a company', blurb: 'Find co-founders and early believers.' },
]

const STEPS = ['You', 'Goal and needs', 'Offers and path', 'Review'] as const

function splitTags(value: string): string[] {
  return value.split(',').map((tag) => tag.trim().toLowerCase().slice(0, 50)).filter(Boolean).slice(0, 10)
}

export function OnboardingForm({
  initial,
}: {
  initial: { displayName: string; currentSituation: string; careerGoal: string }
}) {
  const [step, setStep] = useState(0)
  const [displayName, setDisplayName] = useState(initial.displayName)
  const [currentSituation, setCurrentSituation] = useState(initial.currentSituation)
  const [careerGoal, setCareerGoal] = useState(initial.careerGoal)
  const [needs, setNeeds] = useState<NeedDraft[]>([{ description: '', tags: '' }])
  const [offers, setOffers] = useState<NeedDraft[]>([{ description: '', tags: '' }])
  const [studio, setStudio] = useState<StudioChoice>('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const filledNeeds = needs.filter((need) => need.description.trim())
  const filledOffers = offers.filter((offer) => offer.description.trim())

  function stepError(target: number): string | null {
    if (target === 0 && !displayName.trim()) return 'Tell us what to call you.'
    if (target === 1) {
      if (!careerGoal.trim()) return 'Tell us what you are trying to accomplish.'
      if (filledNeeds.length === 0) return 'Add at least one thing you need help with.'
    }
    if (target === 2 && !studio) return 'Choose the path that fits you best.'
    return null
  }

  function go(target: number) {
    if (target > step) {
      const blocking = stepError(step)
      if (blocking) {
        setError(blocking)
        return
      }
    }
    setError(null)
    setStep(target)
  }

  function updateDraft(list: NeedDraft[], index: number, patch: Partial<NeedDraft>): NeedDraft[] {
    return list.map((item, at) => (at === index ? { ...item, ...patch } : item))
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    for (let at = 0; at < 3; at += 1) {
      const blocking = stepError(at)
      if (blocking) {
        setStep(at)
        setError(blocking)
        return
      }
    }
    setError(null)
    setSaving(true)
    try {
      const result = await saveOnboardingAction({
        displayName: displayName.trim(),
        currentSituation: currentSituation.trim() || undefined,
        careerGoal: careerGoal.trim(),
        needs: filledNeeds.map((need) => ({ description: need.description.trim(), tags: splitTags(need.tags) })),
        offers: filledOffers.map((offer) => ({ description: offer.description.trim(), tags: splitTags(offer.tags) })),
        primaryStudio: studio,
      })
      if (!result.ok) setError(result.error)
      else setDone(true)
    } catch {
      setError('Could not save your profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-12 text-center sm:px-6">
        <div className="flex justify-center">
          <Arko state="celebration" size={96} label="Arko celebrating" />
        </div>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-ink">You&apos;re in. Welcome to Tulay.</h1>
        <p className="mt-2 text-[15px] text-muted">
          Your profile is live. Your next career move shouldn&apos;t be a solo mission — let&apos;s meet the people
          who can help.
        </p>
        <div className="mt-6 flex justify-center">
          <LinkButton href="/home" size="lg">
            Go to my home
          </LinkButton>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-10 sm:px-6">
      <div className="flex items-center gap-3">
        <Arko state="curious" size={64} label="Arko getting to know you" />
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">Set up your profile</h1>
          <p className="mt-1 text-sm text-muted">
            Step {step + 1} of {STEPS.length}: {STEPS[step]}
          </p>
        </div>
      </div>
      <div aria-hidden="true" className="mt-4 h-2 overflow-hidden rounded-full bg-mist">
        <div className="h-full rounded-full bg-forest transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </div>

      <form
        onSubmit={onSubmit}
        noValidate
        className="mt-6 space-y-5 rounded-[var(--radius-card)] border border-line/70 bg-white p-6 shadow-[var(--shadow-card)]"
      >
        {step === 0 && (
          <>
            <TextField
              id="onboarding-name"
              label="What should the community call you?"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              maxLength={100}
              autoComplete="nickname"
              placeholder="e.g. Mara"
              required
            />
            <TextAreaField
              id="onboarding-situation"
              label="What best describes your current situation?"
              value={currentSituation}
              onChange={(event) => setCurrentSituation(event.target.value)}
              maxLength={2000}
              optional
              placeholder="e.g. Call-centre agent learning UX design on weekends"
            />
          </>
        )}

        {step === 1 && (
          <>
            <TextAreaField
              id="onboarding-goal"
              label="What are you trying to accomplish?"
              value={careerGoal}
              onChange={(event) => setCareerGoal(event.target.value)}
              maxLength={2000}
              required
              placeholder="e.g. Land my first UX design role with a portfolio that proves it"
            />
            <DraftList
              title="What help do you need? (up to 3)"
              drafts={needs}
              onChange={setNeeds}
              update={updateDraft}
              descriptionPlaceholder="e.g. Portfolio review before I apply"
              idPrefix="need"
            />
          </>
        )}

        {step === 2 && (
          <>
            <DraftList
              title="What can you offer other people?"
              drafts={offers}
              onChange={setOffers}
              update={updateDraft}
              descriptionPlaceholder="e.g. English interview practice"
              idPrefix="offer"
              optionalNote="Optional — no pressure. You can add offers later from your profile."
            />
            <fieldset>
              <legend className="text-sm font-semibold text-ink">Which path interests you most?</legend>
              <div className="mt-2 grid gap-2">
                {STUDIOS.map((option) => (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                      studio === option.value ? 'border-forest bg-mist/60' : 'border-line hover:border-forest/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="primaryStudio"
                      value={option.value}
                      checked={studio === option.value}
                      onChange={() => setStudio(option.value)}
                      className="mt-1 h-4 w-4 accent-[#176B46]"
                    />
                    <span>
                      <span className="block text-[15px] font-bold text-ink">{option.title}</span>
                      <span className="block text-sm text-muted">{option.blurb}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </>
        )}

        {step === 3 && (
          <div className="space-y-3 text-[15px]">
            <ReviewRow label="Name" value={displayName.trim() || '—'} />
            {currentSituation.trim() && <ReviewRow label="Situation" value={currentSituation.trim()} />}
            <ReviewRow label="Goal" value={careerGoal.trim() || '—'} />
            <ReviewRow label="Needs" value={filledNeeds.map((need) => need.description.trim()).join(' · ') || '—'} />
            {filledOffers.length > 0 && (
              <ReviewRow label="Offers" value={filledOffers.map((offer) => offer.description.trim()).join(' · ')} />
            )}
            <ReviewRow label="Path" value={STUDIOS.find((option) => option.value === studio)?.title ?? '—'} />
            <Notice tone="info" title="Visible to the community.">
              Your name, goal, needs, and offers appear in the member directory so complementary people can find
              you. Contact details stay private until you both accept an introduction.
            </Notice>
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm font-medium text-danger">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-3">
          <Button variant="quiet" onClick={() => go(step - 1)} disabled={step === 0 || saving}>
            Back
          </Button>
          {/* Both buttons stay mounted (visibility toggles via inline style):
              unmounting Continue mid-click lets the click's default
              activation retarget onto a fresh submit in the same slot and
              fire a phantom submit; flipping type on one node has the same
              effect. preventDefault is belt and suspenders. */}
          <Button
            type="button"
            onClick={(event) => {
              event.preventDefault()
              go(step + 1)
            }}
            disabled={saving}
            style={step === STEPS.length - 1 ? { display: 'none' } : undefined}
          >
            Continue
          </Button>
          <Button
            type="submit"
            loading={saving}
            size="lg"
            style={step === STEPS.length - 1 ? undefined : { display: 'none' } }
          >
            Finish setup
          </Button>
        </div>
      </form>
    </div>
  )
}

function DraftList({
  title,
  drafts,
  onChange,
  update,
  descriptionPlaceholder,
  idPrefix,
  optionalNote,
}: {
  title: string
  drafts: NeedDraft[]
  onChange: (drafts: NeedDraft[]) => void
  update: (list: NeedDraft[], index: number, patch: Partial<NeedDraft>) => NeedDraft[]
  descriptionPlaceholder: string
  idPrefix: string
  optionalNote?: string
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-ink">{title}</p>
      {optionalNote && <p className="-mt-2 text-sm text-muted">{optionalNote}</p>}
      {drafts.map((draft, index) => (
        <div key={index} className="space-y-2 rounded-2xl border border-line/70 p-3">
          <TextField
            id={`${idPrefix}-${index}-description`}
            label={`${idPrefix === 'need' ? 'Need' : 'Offer'} ${index + 1}`}
            value={draft.description}
            onChange={(event) => onChange(update(drafts, index, { description: event.target.value }))}
            maxLength={2000}
            placeholder={descriptionPlaceholder}
            required={idPrefix === 'need' && index === 0}
            optional={!(idPrefix === 'need' && index === 0)}
          />
          <TextField
            id={`${idPrefix}-${index}-tags`}
            label="Skill tags"
            value={draft.tags}
            onChange={(event) => onChange(update(drafts, index, { tags: event.target.value }))}
            placeholder="portfolio-review, ux-design"
            optional
          />
          {drafts.length > 1 && (
            <Button variant="quiet" onClick={() => onChange(drafts.filter((_, at) => at !== index))}>
              Remove
            </Button>
          )}
        </div>
      ))}
      {drafts.length < 3 && (
        <Button variant="secondary" onClick={() => onChange([...drafts, { description: '', tags: '' }])}>
          Add another
        </Button>
      )}
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-24 shrink-0 font-semibold text-muted">{label}</dt>
      <dd className="min-w-0 flex-1 text-ink">{value}</dd>
    </div>
  )
}
