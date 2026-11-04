'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, useTransition, type ReactNode } from 'react'
import {
  CareerGoalSchema,
  CollaborationFeedbackSchema,
  CollaborationSchema,
  IntroductionRequestSchema,
  NeedSchema,
  OfferSchema,
  ProfileSchema,
  currentCandidate,
  remainingCandidates,
  type CandidateMatch,
  type Collaboration,
  type ConciergeSession,
  type ExtractedGoal,
  type Helped,
  type IntroductionRequest,
  type Need,
  type Offer,
  listCareerRoles,
  type CareerDirection,
  type CareerMapResult,
} from '@tulay/shared'
import { DEMO_SEEKER_ID, PATHS, getPath, type PathId } from '@/lib/paths'
import { saveCollaboration } from '@/lib/demo-store'
import { LinkPending } from '@/components/LinkPending'
import { Arko } from '@/components/Arko'
import { MatchCard } from '@/components/MatchCard'
import { PathCard } from '@/components/PathCard'
import { ArrowLeft, ArrowRight, Check } from '@/components/icons'
import {
  Button,
  Card,
  DemoBadge,
  EmptyState,
  LoadingState,
  Notice,
  StatusPill,
  Tag,
  TextAreaField,
  TextField,
  ToggleChip,
  buttonClass,
  humanizeTag,
} from '@/components/ui'
import {
  acceptCandidateAction,
  draftIntroductionAction,
  extractGoalAction,
  mapCareerAction,
  skipCandidateAction,
  startBrowsingAction,
  suggestNextStepsAction,
  type AiTextSource,
} from './actions'

type Step = 'path' | 'intake' | 'matches' | 'introduce' | 'waiting' | 'collaborate' | 'outcome' | 'done'

const STAGES = ['Path', 'Your goal', 'People', 'Introduction', 'Follow-through'] as const
const STAGE_OF: Record<Step, number> = {
  path: 0,
  intake: 1,
  matches: 2,
  introduce: 3,
  waiting: 3,
  collaborate: 4,
  outcome: 4,
  done: 4,
}

type Form = {
  displayName: string
  goal: string
  needText: string
  needTags: string[]
  offerText: string
  offerTags: string[]
}

const EMPTY_FORM: Form = { displayName: '', goal: '', needText: '', needTags: [], offerText: '', offerTags: [] }

const DEMO_TEXT_NOTE =
  'Demo template: the Meta Model API is not connected yet, so this text is a fixed example. Edit it freely.'

const LIVE_TEXT_NOTE =
  'Drafted by Muse Spark from your details. Edit it freely.'

function firstName(name: string) {
  return name.split(' ')[0]
}

function toggle(list: string[], tag: string) {
  return list.includes(tag) ? list.filter((item) => item !== tag) : [...list, tag]
}

export function Journey({ offeredTags, neededTags }: { offeredTags: string[]; neededTags: string[] }) {
  const [step, setStep] = useState<Step>('path')
  const [pathId, setPathId] = useState<PathId | null>(null)
  const [form, setForm] = useState<Form>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({})

  const [need, setNeed] = useState<Need | null>(null)
  const [seekerOffers, setSeekerOffers] = useState<Offer[]>([])
  const [session, setSession] = useState<ConciergeSession | null>(null)
  const [criteriaSource, setCriteriaSource] = useState<'ai' | 'demo' | 'as-written' | null>(null)
  const [assistText, setAssistText] = useState('')
  const [assist, setAssist] = useState<ExtractedGoal | null>(null)
  const [assistSource, setAssistSource] = useState<AiTextSource>('demo-template')
  const [assistError, setAssistError] = useState<string | null>(null)
  const [currentRole, setCurrentRole] = useState('')
  const [userSkillsText, setUserSkillsText] = useState('')
  const [careerMap, setCareerMap] = useState<CareerMapResult | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)
  const [mapping, setMapping] = useState(false)
  const [typing, setTyping] = useState(false)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [directionId, setDirectionId] = useState<string | null>(null)
  const [transferableKept, setTransferableKept] = useState<string[]>([])
  const [developingKept, setDevelopingKept] = useState<string[]>([])
  const [careerConfirmed, setCareerConfirmed] = useState<CareerDirection | null>(null)
  const [matchError, setMatchError] = useState<string | null>(null)

  const [selected, setSelected] = useState<CandidateMatch | null>(null)
  const [draft, setDraft] = useState('')
  const [draftNote, setDraftNote] = useState<string | null>(null)
  const [draftError, setDraftError] = useState<string | null>(null)
  const [consent, setConsent] = useState(false)
  const [introduction, setIntroduction] = useState<IntroductionRequest | null>(null)

  const [collaboration, setCollaboration] = useState<Collaboration | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [suggestionsSource, setSuggestionsSource] = useState<AiTextSource>('demo-template')
  const [customStep, setCustomStep] = useState('')
  const [stepError, setStepError] = useState<string | null>(null)

  const [helped, setHelped] = useState<Helped | null>(null)
  const [feedbackNote, setFeedbackNote] = useState('')
  const [feedbackError, setFeedbackError] = useState<string | null>(null)

  const [pending, startTransition] = useTransition()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const firstRender = useRef(true)

  // Move focus to the new step's heading so keyboard and screen-reader users follow along.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    headingRef.current?.focus()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step])

  const path = pathId ? getPath(pathId) : null
  const current = session ? currentCandidate(session) : null
  const totalCandidates = session?.candidates.length ?? 0
  const remaining = session ? remainingCandidates(session) : 0
  const position = totalCandidates - remaining + 1
  const confirmedRole =
    careerConfirmed && careerMap
      ? [careerMap.targetRole, ...careerMap.adjacent.map((a) => a.role)].find((r) => r.id === careerConfirmed.roleId) ?? null
      : null
  const developingPool = careerMap
    ? [...careerMap.toDevelop.map((s) => s.name), ...careerMap.transferable.map((t) => t.name)]
    : []
  const dismissedDeveloping = developingPool.filter((name) => !developingKept.includes(name))

  // ---------------------------------------------------------------------------
  // Step transitions
  // ---------------------------------------------------------------------------

  function choosePath(id: PathId) {
    setPathId(id)
    setStep('intake')
  }

  function fillSample() {
    if (!path) return
    setForm((current) => ({
      ...current,
      displayName: current.displayName || 'Alex',
      goal: path.sample.goal,
      needText: path.sample.need,
      needTags: path.sample.needTags.filter((tag) => offeredTags.includes(tag)),
      offerText: path.sample.offer,
      offerTags: path.sample.offerTags,
    }))
    setErrors({})
  }

  function search(nextNeed: Need, offers: Offer[]) {
    setSession(null)
    setCriteriaSource(null)
    setMatchError(null)
    setStep('matches')
    startTransition(async () => {
      const result = await startBrowsingAction({
        criteriaText: `${form.goal} ${form.needText}`.trim(),
        need: nextNeed,
        seekerOffers: offers,
        careerDirection: careerConfirmed ?? undefined,
      })
      if (result.ok) {
        setSession(result.data.session)
        setCriteriaSource(result.data.criteriaSource)
      } else setMatchError(result.error)
    })
  }

  function skip() {
    if (!session) return
    startTransition(async () => {
      const result = await skipCandidateAction({ session })
      if (result.ok) setSession(result.data)
      else setMatchError(result.error)
    })
  }

  function askForIntro() {
    if (!session) return
    startTransition(async () => {
      const result = await acceptCandidateAction({ session })
      if (result.ok) {
        setSession(result.data.session)
        requestIntroduction(result.data.candidate)
      } else setMatchError(result.error)
    })
  }

  function noteTyping() {
    setTyping(true)
    if (typingTimer.current) clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => setTyping(false), 1500)
  }

  useEffect(() => () => {
    if (typingTimer.current) clearTimeout(typingTimer.current)
  }, [])

  function runAssist() {
    setAssist(null)
    setAssistError(null)
    startTransition(async () => {
      const result = await extractGoalAction({ text: assistText })
      if (result.ok) {
        setAssist(result.data.goal)
        setAssistSource(result.data.source)
      } else setAssistError(result.error)
    })
  }

  function applyAssist() {
    if (!assist) return
    setForm((current) => ({
      ...current,
      goal: assist.goal,
      needText: assist.needs.join('; '),
      needTags: assist.needs.filter((tag) => offeredTags.includes(tag)),
      offerText: assist.offers.join('; ') || current.offerText,
      offerTags: assist.offers.filter((tag) => neededTags.includes(tag)),
    }))
    setAssist(null)
    setAssistText('')
    setErrors({})
  }

  function runMap() {
    setCareerMap(null)
    setMapError(null)
    setMapping(true)
    startTransition(async () => {
      const result = await mapCareerAction({
        currentRoleLabel: currentRole,
        targetLabel: form.goal,
        userSkillNames: userSkillsText,
      })
      if (result.ok) {
        setCareerMap(result.data)
        setDirectionId(result.data.targetRole.id)
        setTransferableKept(result.data.transferable.map((t) => t.name))
        setDevelopingKept(result.data.toDevelop.map((s) => s.name))
      } else setMapError(result.error)
      setMapping(false)
    })
  }

  function selectDirection(roleId: string, title: string) {
    if (!careerMap || roleId === careerMap.targetRole.id) {
      setDirectionId(roleId)
      return
    }
    setMapError(null)
    setMapping(true)
    startTransition(async () => {
      const result = await mapCareerAction({ currentRoleLabel: currentRole, targetLabel: title, userSkillNames: userSkillsText })
      if (result.ok) {
        setCareerMap(result.data)
        setDirectionId(result.data.targetRole.id)
        setTransferableKept(result.data.transferable.map((t) => t.name))
        setDevelopingKept(result.data.toDevelop.map((s) => s.name))
      } else setMapError(result.error)
      setMapping(false)
    })
  }

  function removeTransferable(name: string) {
    setTransferableKept((kept) => kept.filter((skill) => skill !== name))
    setDevelopingKept((kept) => (kept.includes(name) ? kept : [...kept, name]))
  }

  function dismissDeveloping(name: string) {
    setDevelopingKept((kept) => kept.filter((skill) => skill !== name))
  }

  function readdDeveloping(name: string) {
    setDevelopingKept((kept) => (kept.includes(name) ? kept : [...kept, name]))
  }

  function confirmDirection() {
    if (!careerMap || !directionId) return
    const role =
      directionId === careerMap.targetRole.id
        ? careerMap.targetRole
        : careerMap.adjacent.find((a) => a.role.id === directionId)?.role
    if (!role) return
    setCareerConfirmed({ roleId: role.id, confirmedSkills: transferableKept, developingSkills: developingKept })
  }

  function clearCareer() {
    setCareerMap(null)
    setMapError(null)
    setDirectionId(null)
    setTransferableKept([])
    setDevelopingKept([])
    setCareerConfirmed(null)
  }

  function submitIntake() {
    const nextErrors: Partial<Record<keyof Form, string>> = {}
    const name = ProfileSchema.shape.displayName.safeParse(form.displayName)
    if (!name.success) nextErrors.displayName = 'Add the name you want others to see.'
    const goal = CareerGoalSchema.safeParse({ goal: form.goal })
    if (!goal.success) nextErrors.goal = 'Tell us what you are working toward.'
    const parsedNeed = NeedSchema.safeParse({
      id: crypto.randomUUID(),
      profileId: DEMO_SEEKER_ID,
      description: form.needText,
      tags: form.needTags,
      goalContext: form.goal || undefined,
    })
    if (!parsedNeed.success) nextErrors.needText = 'Describe one specific thing you need help with.'

    // Offering is optional: Tulay shows reciprocity but never pressures anyone to offer.
    const offers: Offer[] = []
    if (form.offerText.trim()) {
      const parsedOffer = OfferSchema.safeParse({
        id: crypto.randomUUID(),
        profileId: DEMO_SEEKER_ID,
        description: form.offerText,
        tags: form.offerTags,
      })
      if (parsedOffer.success) offers.push(parsedOffer.data)
      else nextErrors.offerText = 'Keep your offer under 2,000 characters.'
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0 || !parsedNeed.success) {
      const firstField = Object.keys(nextErrors)[0]
      document.getElementById(`field-${firstField}`)?.focus()
      return
    }
    setNeed(parsedNeed.data)
    setSeekerOffers(offers)
    search(parsedNeed.data, offers)
  }

  function requestIntroduction(match: CandidateMatch) {
    if (!need) return
    setSelected(match)
    setConsent(false)
    setDraft('')
    setDraftNote(null)
    setDraftError(null)
    setStep('introduce')
    startTransition(async () => {
      const result = await draftIntroductionAction({
        senderName: form.displayName,
        recipientName: match.profile.displayName,
        need: need.description,
        offer: seekerOffers[0]?.description,
        matchExplanation: match.reasons.join('. '),
      })
      if (result.ok) {
        setDraft(result.data.message)
        setDraftNote(result.data.source === 'live' ? LIVE_TEXT_NOTE : DEMO_TEXT_NOTE)
      } else {
        setDraftError(result.error)
      }
    })
  }

  function sendIntroduction() {
    if (!need || !selected?.profile.id) return
    const parsed = IntroductionRequestSchema.safeParse({
      id: crypto.randomUUID(),
      fromProfileId: DEMO_SEEKER_ID,
      toProfileId: selected.profile.id,
      needId: need.id,
      offerId: selected.offer.id ?? null,
      matchFactors: selected.reasons,
      message: draft,
      status: 'pending',
    })
    if (!parsed.success) {
      setDraftError('Write a short message before sending (up to 2,000 characters).')
      return
    }
    setIntroduction(parsed.data)
    setStep('waiting')
  }

  function respond(status: 'accepted' | 'declined' | 'withdrawn') {
    if (!introduction || !selected || !need) return
    const updated = IntroductionRequestSchema.parse({
      ...introduction,
      status,
      respondedAt: new Date().toISOString(),
    })
    setIntroduction(updated)
    if (status !== 'accepted') return

    const created = CollaborationSchema.parse({
      id: crypto.randomUUID(),
      introductionRequestId: updated.id,
      requesterId: DEMO_SEEKER_ID,
      helperId: selected.profile.id,
      intendedOutcome: need.description,
      nextSteps: [],
      status: 'agreed',
    })
    setCollaboration(created)
    setSuggestions([])
    setSuggestionsSource('demo-template')
    setCustomStep('')
    setStepError(null)
    persist(created)
    setStep('collaborate')
    startTransition(async () => {
      const result = await suggestNextStepsAction({
        goal: form.goal,
        need: need.description,
        offer: selected.offer.description,
      })
      if (result.ok) {
        setSuggestions(result.data.suggestions)
        setSuggestionsSource(result.data.source)
      }
    })
  }

  function persist(record: Collaboration, extra: { helped?: Helped; note?: string } = {}) {
    if (!selected || !need || !record.id) return
    saveCollaboration({
      id: record.id,
      partnerName: selected.profile.displayName,
      partnerOffer: selected.offer.description,
      need: need.description,
      reciprocal: selected.reciprocal,
      nextStep: record.nextSteps[0]?.text,
      status: record.status,
      updatedAt: new Date().toISOString(),
      ...extra,
    })
  }

  function updateCollaboration(patch: Partial<Collaboration>) {
    if (!collaboration) return
    const parsed = CollaborationSchema.safeParse({ ...collaboration, ...patch })
    if (!parsed.success) {
      setStepError('Keep the next step short (up to 500 characters).')
      return
    }
    setStepError(null)
    setCollaboration(parsed.data)
    persist(parsed.data)
    if (parsed.data.status === 'completed') setStep('outcome')
  }

  function agreeOnStep(text: string) {
    if (!text.trim()) {
      setStepError('Pick a suggestion or write your own next step.')
      return
    }
    updateCollaboration({ nextSteps: [{ text, done: false }] })
  }

  function recordOutcome() {
    if (!collaboration?.id) return
    const parsed = CollaborationFeedbackSchema.safeParse({
      collaborationId: collaboration.id,
      profileId: DEMO_SEEKER_ID,
      helped,
      note: feedbackNote || undefined,
    })
    if (!parsed.success) {
      setFeedbackError('Choose whether this helped you move forward.')
      return
    }
    setFeedbackError(null)
    persist(collaboration, { helped: parsed.data.helped, note: parsed.data.note })
    setStep('done')
  }

  function findMorePeople() {
    if (!need) return
    setSession(null)
    setCriteriaSource(null)
    setSelected(null)
    setIntroduction(null)
    setCollaboration(null)
    setHelped(null)
    setFeedbackNote('')
    search(need, seekerOffers)
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  const partner = selected ? firstName(selected.profile.displayName) : ''
  const nextStepText = collaboration?.nextSteps[0]?.text

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-6 pb-32 sm:px-6 sm:pt-10 sm:pb-16">
      <Progress current={STAGE_OF[step]} />

      {step === 'path' && (
        <Section
          headingRef={headingRef}
          eyebrow="Step 1"
          title="What's your next move?"
          lead="Choose a starting point. It only shapes the questions and suggestions; you can change it later."
        >
          <div className="flex justify-center">
          <Arko state="curious" size={64} />
        </div>
        <div className="grid gap-3">
            {PATHS.map((option) => (
              <PathCard key={option.id} path={option} selected={pathId === option.id} onSelect={() => choosePath(option.id)} />
            ))}
          </div>
        </Section>
      )}

      {step === 'intake' && path && (
        <Section
          headingRef={headingRef}
          eyebrow={path.title}
          title="Tell Tulay what would help"
          lead="Be specific. One concrete need finds better people than a big goal."
          back={() => setStep('path')}
        >
          {path.dataNote && <Notice tone="demo" title="About this demo path">{path.dataNote}</Notice>}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-mist px-4 py-3">
            <p className="text-sm text-forest-dark">Short on time? Load a sample answer for this path.</p>
            <Button variant="secondary" onClick={fillSample}>
              Use a sample
            </Button>
          </div>
          <div className="rounded-[var(--radius-card)] border border-line bg-white/70 p-5">
            <TextAreaField
              id="field-assist"
              label="Describe your situation in your own words"
              hint="Muse Spark structures it into a goal, needs and offers. You review everything before it is used."
              optional
              placeholder="e.g. I spent six years in customer support and I want to move into UX design…"
              value={assistText}
              error={assistError ?? undefined}
              onChange={(e) => {
                setAssistText(e.target.value)
                setAssist(null)
              }}
            />
            <div className="mt-3">
              <Button variant="secondary" onClick={runAssist} disabled={pending || assistText.trim().length < 10}>
                Structure it with Muse
              </Button>
            </div>
            {assist && (
              <div className="mt-4 space-y-3 rounded-2xl bg-ivory p-4">
                <p className="text-sm text-muted">
                  {assistSource === 'live'
                    ? 'Structured by Muse Spark from your words. Review before using.'
                    : 'Demo template: Muse Spark is not connected, so this is a fixed example. Edit freely.'}
                </p>
                <SummaryRow label="Goal">{assist.goal}</SummaryRow>
                <SummaryRow label="Needs">{assist.needs.join('; ')}</SummaryRow>
                {assist.offers.length > 0 && <SummaryRow label="Offers">{assist.offers.join('; ')}</SummaryRow>}
                {assist.skills.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-muted uppercase">Skills</p>
                    <ul className="mt-1 flex flex-wrap gap-2">
                      {assist.skills.map((skill) => (
                        <li key={skill}>
                          <Tag>{humanizeTag(skill)}</Tag>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div>
                  <Button variant="secondary" onClick={applyAssist}>
                    Use these details
                  </Button>
                </div>
              </div>
            )}
          </div>

          <form
            noValidate
            className="space-y-6"
            onSubmit={(event) => {
              event.preventDefault()
              submitIntake()
            }}
          >
            <TextField
              id="field-displayName"
              label="Your first name"
              hint="This is how people you contact will see you."
              autoComplete="given-name"
              value={form.displayName}
              error={errors.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            />
            <div className="flex h-12 items-center gap-2" aria-hidden="true">
              {typing && (
                <>
                  <Arko state="curious" size={44} />
                  <p className="text-sm text-muted">Arko is thinking with you…</p>
                </>
              )}
            </div>
            <TextAreaField
              id="field-goal"
              label={path.goalPrompt}
              placeholder={path.sample.goal}
              value={form.goal}
              error={errors.goal}
              onChange={(e) => { setForm({ ...form, goal: e.target.value }); noteTyping() }}
            />
            {pathId === 'career' && (
              <div className="rounded-[var(--radius-card)] border border-line bg-white/70 p-5">
                <TextField
                  id="field-currentRole"
                  label="Your current role or background"
                  hint="Optional. Helps map which of your skills transfer."
                  optional
                  placeholder="e.g. Customer service representative"
                  value={currentRole}
                  onChange={(e) => setCurrentRole(e.target.value)}
                  list="career-role-options"
                />
                <datalist id="career-role-options">
                  {listCareerRoles().map((role) => (
                    <option key={role.id} value={role.title} />
                  ))}
                </datalist>
                <div className="mt-5">
                  <TextField
                    id="field-userSkills"
                    label="Skills you already have"
                    hint="Optional. Comma-separated; recognized skills are matched against the catalog."
                    optional
                    placeholder="e.g. Excel, SQL, communication"
                    value={userSkillsText}
                    onChange={(e) => setUserSkillsText(e.target.value)}
                  />
                </div>
                <div className="mt-3">
                  <Button variant="secondary" onClick={runMap} disabled={mapping || pending || !form.goal.trim()}>
                    Map my career options
                  </Button>
                </div>
                {mapError && (
                  <p role="alert" className="mt-3 text-sm font-medium text-danger">
                    {mapError}
                  </p>
                )}
                {mapping && <div className="mt-3 flex items-center gap-3"><Arko state="searching" size={56} /><LoadingState label="Mapping career options…" /></div>}
                {careerMap && directionId && !mapping && !careerConfirmed && (
                  <div className="mt-4 space-y-4 rounded-2xl bg-ivory p-4">
                    <p className="text-sm text-muted">
                      {careerMap.currentRole
                        ? `From ${careerMap.currentRole.title} toward ${careerMap.targetRole.title}.`
                        : `Toward ${careerMap.targetRole.title}.`}
                    </p>
                    <fieldset className="space-y-2">
                      <legend className="text-sm font-semibold text-ink">Choose a direction, or keep your target</legend>
                      {[careerMap.targetRole, ...careerMap.adjacent.map((a) => a.role)].map((role) => {
                        const adj = careerMap.adjacent.find((a) => a.role.id === role.id)
                        return (
                          <label
                            key={role.id}
                            className={`flex cursor-pointer items-start gap-3 rounded-2xl px-4 py-3 ring-1 transition ${
                              directionId === role.id ? 'bg-mist ring-forest' : 'bg-white ring-line hover:ring-forest/50'
                            }`}
                          >
                            <input
                              type="radio"
                              name="career-direction"
                              value={role.id}
                              checked={directionId === role.id}
                              onChange={() => selectDirection(role.id, role.title)}
                              className="mt-1 h-5 w-5 shrink-0 accent-forest"
                            />
                            <span>
                              <span className="font-medium text-ink">{role.title}</span>
                              <span className="text-sm text-muted">, {role.blurb}</span>
                              <span className="block text-sm text-muted">
                                {adj
                                  ? adj.basis === 'shared-skills'
                                    ? `Shares: ${adj.sharedSkillNames.join(', ')}`
                                    : adj.basis === 'same-field'
                                      ? 'Same field in the catalog'
                                      : 'Same industry in the catalog'
                                  : 'Your stated target'}
                              </span>
                            </span>
                          </label>
                        )
                      })}
                    </fieldset>
                    <div>
                      <p className="text-sm font-semibold text-ink">Skills you may already have</p>
                      <p className="text-sm text-muted">Suggested from the catalog and what you wrote. Remove any that don&apos;t fit.</p>
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {careerMap.transferable
                          .filter((t) => transferableKept.includes(t.name))
                          .map((t) => (
                            <li
                              key={t.name}
                              className="inline-flex items-center gap-2 rounded-full bg-white py-1 pr-2 pl-3 ring-1 ring-line"
                            >
                              <Tag>{humanizeTag(t.name)}</Tag>
                              <span className="text-xs text-muted">
                                {t.origin === 'current-role' ? 'current role' : 'you wrote'}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeTransferable(t.name)}
                                aria-label={`Remove ${t.name}`}
                                className="grid h-7 w-7 place-items-center rounded-full text-sm font-bold text-muted hover:bg-mist hover:text-ink"
                              >
                                ×
                              </button>
                            </li>
                          ))}
                      </ul>
                      {transferableKept.length === 0 && (
                        <p className="mt-2 text-sm text-muted">No transferable skills kept. The direction still works.</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink">Potential areas to develop</p>
                      <p className="text-sm text-muted">Ideas from the catalog, not verified gaps. Dismiss any that don&apos;t fit.</p>
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {developingKept.map((name) => (
                          <li
                            key={name}
                            className="inline-flex items-center gap-2 rounded-full bg-white py-1 pr-2 pl-3 ring-1 ring-line"
                          >
                            <Tag>{humanizeTag(name)}</Tag>
                            <button
                              type="button"
                              onClick={() => dismissDeveloping(name)}
                              aria-label={`Dismiss ${name}`}
                              className="grid h-7 w-7 place-items-center rounded-full text-sm font-bold text-muted hover:bg-mist hover:text-ink"
                            >
                              ×
                            </button>
                          </li>
                        ))}
                      </ul>
                      {dismissedDeveloping.length > 0 && (
                        <p className="mt-2 text-sm text-muted">
                          Dismissed:{' '}
                          {dismissedDeveloping.map((name) => (
                            <button
                              key={name}
                              type="button"
                              onClick={() => readdDeveloping(name)}
                              className="mr-2 font-semibold text-forest underline"
                            >
                              {name} +
                            </button>
                          ))}
                        </p>
                      )}
                    </div>
                    <p className="text-sm text-muted">
                      Role and skill facts: curated career catalog adapted from Landas. Confirmed skills are
                      yours; nothing here is a verified qualification.
                    </p>
                    <div>
                      <Button onClick={confirmDirection}>Use this direction</Button>
                    </div>
                  </div>
                )}
                {careerConfirmed && (
                  <div className="mt-4 rounded-2xl bg-mist p-4">
                    <p className="text-sm font-semibold text-forest-dark">
                      Direction confirmed: {confirmedRole?.title ?? careerConfirmed.roleId}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {careerConfirmed.confirmedSkills.length} skills confirmed ·{' '}
                      {careerConfirmed.developingSkills.length} to develop. This shapes who you&apos;ll meet.
                    </p>
                    <span className="mt-2 inline-flex gap-4">
                      <button type="button" onClick={() => setCareerConfirmed(null)} className="text-sm font-semibold text-forest underline">
                        Adjust mapping
                      </button>
                      <button type="button" onClick={clearCareer} className="text-sm font-semibold text-forest underline">
                        Remove direction
                      </button>
                    </span>
                  </div>
                )}
              </div>
            )}
            <TextAreaField
              id="field-needText"
              label="What specific help do you need right now?"
              placeholder={path.sample.need}
              value={form.needText}
              error={errors.needText}
              onChange={(e) => { setForm({ ...form, needText: e.target.value }); noteTyping() }}
            />
            <TagPicker
              legend="Which skills would help with that?"
              hint="Tags come from what demo members actually offer. Suggested ones for your path are first."
              tags={orderTags(offeredTags, path.suggestedNeedTags)}
              selected={form.needTags}
              onToggle={(tag) => setForm({ ...form, needTags: toggle(form.needTags, tag) })}
            />
            <div className="rounded-[var(--radius-card)] border border-line bg-white/70 p-5">
              <TextAreaField
                id="field-offerText"
                label="What could you offer someone in return?"
                hint="Optional. Many people find it easier to ask when they can also give."
                optional
                placeholder={path.sample.offer}
                value={form.offerText}
                error={errors.offerText}
                onChange={(e) => setForm({ ...form, offerText: e.target.value })}
              />
              <div className="mt-5">
                <TagPicker
                  legend="Skills you could share"
                  hint="These are things demo members are asking for."
                  tags={neededTags}
                  selected={form.offerTags}
                  onToggle={(tag) => setForm({ ...form, offerTags: toggle(form.offerTags, tag) })}
                />
              </div>
            </div>
            <ActionBar>
              <Button type="submit" size="lg" className="w-full sm:w-auto">
                Find my people
                <ArrowRight className="h-5 w-5" />
              </Button>
            </ActionBar>
          </form>
        </Section>
      )}

      {step === 'matches' && need && (
        <Section
          headingRef={headingRef}
          eyebrow="People who can help"
          title={
            pending || !session
              ? 'Looking for your people…'
              : current
                ? `Person ${position} of ${totalCandidates}`
                : 'No more people for this need'
          }
          lead={`For: “${need.description}”`}
          back={() => setStep('intake')}
        >
          <Notice tone="demo" title="Everyone here is a fictional demo member">
            Matches come from Tulay&apos;s matching rules over a synthetic community. No one is contacted
            until you send a request, and in this demo nothing leaves your browser.
          </Notice>
          {criteriaSource === 'ai' && (
            <p className="text-sm text-muted">Muse structured your search from your description.</p>
          )}
          {criteriaSource === 'demo' && (
            <p className="text-sm text-muted">Demo rules structured your search from your description (no model call).</p>
          )}
          {criteriaSource === 'as-written' && (
            <p className="text-sm text-muted">Muse couldn&apos;t be reached, so we&apos;re using your words as-is.</p>
          )}
          {careerConfirmed && confirmedRole && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-mist px-4 py-3">
              <p className="text-sm text-forest-dark">
                Searching for your move toward <strong>{confirmedRole.title}</strong>.
              </p>
              <span className="ml-auto inline-flex gap-3">
                <button type="button" onClick={() => setStep('intake')} className="text-sm font-semibold text-forest underline">
                  Adjust
                </button>
                <button type="button" onClick={clearCareer} className="text-sm font-semibold text-forest underline">
                  Remove
                </button>
              </span>
            </div>
          )}
          {matchError && (
            <Notice tone="error" title="Something went wrong">
              {matchError}{' '}
              <button className="font-semibold text-forest underline" onClick={() => search(need, seekerOffers)}>
                Try again
              </button>
            </Notice>
          )}
          {!matchError && (pending || !session) && <LoadingState label="Matching your need with what members offer…" />}
          {!matchError && (pending || !session) && (
            <div className="flex justify-center">
              <Arko state="searching" size={72} />
            </div>
          )}
          {session && !pending && !current && (
            <EmptyState
              title="No more people for this need"
              action={
                <Button variant="secondary" onClick={() => setStep('intake')}>
                  Broaden your need
                </Button>
              }
            >
              <div className="flex flex-col items-center gap-3 text-center">
                <Arko state="empty" size={72} />
                <p>
                  Tulay never fills this list with invented people. Try different skills, or describe your need
                  in broader words.
                </p>
              </div>
            </EmptyState>
          )}
          {session && !pending && current && (
            <>
              <div className="flex items-center gap-3">
                <Arko state="idle" size={48} />
                <p className="text-sm text-muted" aria-live="polite">
                  Showing {remaining} {remaining === 1 ? 'person' : 'people'} who can help, one at a time.
                  {remaining > 1 && ' Skip to meet the next person.'}
                </p>
              </div>
              <MatchCard match={current} onRequest={askForIntro} />
              <div>
                <Button variant="quiet" onClick={skip} disabled={pending}>
                  Skip this person
                </Button>
              </div>
            </>
          )}
        </Section>
      )}

      {step === 'introduce' && selected && (
        <Section
          headingRef={headingRef}
          eyebrow="Introduction"
          title={`Ask ${partner} for help`}
          lead="Review the message. Nothing is sent until you confirm."
          back={() => setStep('matches')}
        >
          <Card className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-ink">To: {selected.profile.displayName}</p>
              {selected.profile.isDemo && <DemoBadge />}
            </div>
            {pending && !draft ? (
              <LoadingState label="Drafting a starting message…" />
            ) : (
              <TextAreaField
                id="field-message"
                label="Your message"
                hint={draftNote ?? undefined}
                rows={6}
                value={draft}
                error={draftError ?? undefined}
                onChange={(e) => setDraft(e.target.value)}
              />
            )}
            <div className="rounded-2xl bg-ivory p-4 text-sm text-muted">
              <p className="font-semibold text-ink">What {partner} will see</p>
              <p className="mt-1">
                Your first name, your need, and this message. Your contact details stay private unless {partner}{' '}
                accepts.
              </p>
            </div>
            <label className="flex cursor-pointer items-start gap-3 text-sm text-ink">
              <input
                type="checkbox"
                className="mt-0.5 h-5 w-5 shrink-0 accent-forest"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span>I want Tulay to send this request to {partner}, and only to {partner}.</span>
            </label>
          </Card>
          <ActionBar>
            <Button size="lg" className="w-full sm:w-auto" disabled={!consent || !draft.trim() || pending} onClick={sendIntroduction}>
              Send introduction request
              <ArrowRight className="h-5 w-5" />
            </Button>
          </ActionBar>
        </Section>
      )}

      {step === 'waiting' && selected && introduction && (
        <Section
          headingRef={headingRef}
          eyebrow="Introduction"
          title={introduction.status === 'pending' ? `Waiting for ${partner}` : introduction.status === 'declined' ? `${partner} said not now` : 'Request withdrawn'}
          lead={
            introduction.status === 'pending'
              ? `${partner} decides whether to connect. You'll both see each other's contact details only if they accept.`
              : 'That is okay. Asking is how help starts. Try someone else who can help.'
          }
        >
          <Card className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">Request to {selected.profile.displayName}</p>
              <StatusPill status={introduction.status} />
            </div>
            <blockquote className="rounded-2xl bg-ivory p-4 text-sm whitespace-pre-line text-ink">{introduction.message}</blockquote>
          </Card>
          {introduction.status === 'pending' ? (
            <>
              <div className="flex justify-center">
            <Arko state="pending" size={72} />
          </div>
          <Notice tone="demo" title={`${partner} is a fictional demo member, so no message was sent`}>
                To continue the demo, choose how {partner} would respond. In the live product, this step happens
                when the real person replies.
              </Notice>
              <ActionBar>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button size="lg" onClick={() => respond('accepted')}>
                    <Check className="h-5 w-5" />
                    Demo: {partner} accepts
                  </Button>
                  <Button variant="secondary" size="lg" onClick={() => respond('declined')}>
                    Demo: {partner} declines
                  </Button>
                  <Button variant="quiet" size="lg" onClick={() => respond('withdrawn')}>
                    Withdraw my request
                  </Button>
                </div>
              </ActionBar>
            </>
          ) : (
            <ActionBar>
              <Button size="lg" className="w-full sm:w-auto" onClick={() => setStep('matches')}>
                <ArrowLeft className="h-5 w-5" />
                Back to people who can help
              </Button>
            </ActionBar>
          )}
        </Section>
      )}

      {step === 'collaborate' && selected && collaboration && (
        <Section
          headingRef={headingRef}
          eyebrow={`You and ${partner}`}
          title={nextStepText ? 'Your collaboration' : 'Agree on one next step'}
          lead={nextStepText ? 'Keep it small. Mark progress as it happens.' : `${partner} accepted (demo). One concrete step turns an introduction into progress.`}
        >
          <Card className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">{need?.description}</p>
              <StatusPill status={collaboration.status} />
            </div>
            <p className="text-sm text-muted">
              {partner} offers: {selected.offer.description}
              {selected.reciprocal && ' · You can help each other.'}
            </p>
            <p className="rounded-2xl bg-ivory p-3 text-sm text-muted">
              Contact details: in the live product you would now see {partner}&apos;s chosen contact method. Demo
              members have none, so nothing is shown.
            </p>
          </Card>

          {!nextStepText ? (
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-ink">Pick a next step, or write your own</legend>
              <p className="text-sm text-muted">{suggestionsSource === 'live' ? LIVE_TEXT_NOTE : DEMO_TEXT_NOTE}</p>
              {pending && suggestions.length === 0 && <LoadingState label="Suggesting next steps…" />}
              <div className="grid gap-2">
                {suggestions.map((text) => (
                  <button
                    key={text}
                    type="button"
                    onClick={() => setCustomStep(text)}
                    aria-pressed={customStep === text}
                    className={`min-h-11 rounded-2xl px-4 py-3 text-left text-sm transition ${
                      customStep === text ? 'bg-forest text-white' : 'bg-white ring-1 ring-line hover:ring-forest/50'
                    }`}
                  >
                    {text}
                  </button>
                ))}
              </div>
              <TextField
                id="field-nextStep"
                label="Next step"
                placeholder="e.g. 30-minute portfolio call by Friday"
                value={customStep}
                error={stepError ?? undefined}
                onChange={(e) => setCustomStep(e.target.value)}
              />
              <ActionBar>
                <Button size="lg" className="w-full sm:w-auto" onClick={() => agreeOnStep(customStep)}>
                  Agree on this next step
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </ActionBar>
            </fieldset>
          ) : (
            <>
              <Card className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-mist text-forest">
                  <Check className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold tracking-wide text-muted uppercase">Next step</p>
                  <p className="font-medium text-ink">{nextStepText}</p>
                </div>
              </Card>
              {stepError && <Notice tone="error">{stepError}</Notice>}
              <ActionBar>
                {collaboration.status === 'agreed' ? (
                  <Button size="lg" className="w-full sm:w-auto" onClick={() => updateCollaboration({ status: 'in_progress' })}>
                    We&apos;ve started
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    className="w-full sm:w-auto"
                    onClick={() =>
                      updateCollaboration({
                        status: 'completed',
                        nextSteps: collaboration.nextSteps.map((item) => ({ ...item, done: true })),
                      })
                    }
                  >
                    <Check className="h-5 w-5" />
                    Mark next step as done
                  </Button>
                )}
              </ActionBar>
            </>
          )}
        </Section>
      )}

      {step === 'outcome' && selected && (
        <Section headingRef={headingRef} eyebrow="Follow-through" title="Did this help you move forward?" lead={`Your answer is how Tulay learns which introductions lead to real progress.`}>
          <fieldset className="space-y-3">
            <legend className="sr-only">Did working with {partner} help?</legend>
            {(
              [
                ['yes', 'Yes, I moved forward'],
                ['partly', 'Partly'],
                ['no', 'Not really'],
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 ring-1 transition ${
                  helped === value ? 'bg-mist ring-forest' : 'bg-white ring-line hover:ring-forest/50'
                }`}
              >
                <input type="radio" name="helped" value={value} checked={helped === value} onChange={() => setHelped(value)} className="h-5 w-5 accent-forest" />
                <span className="font-medium">{label}</span>
              </label>
            ))}
            {feedbackError && (
              <p role="alert" className="text-sm font-medium text-danger">
                {feedbackError}
              </p>
            )}
          </fieldset>
          <TextAreaField
            id="field-feedbackNote"
            label="What changed?"
            optional
            placeholder="e.g. I rewrote my case study and sent two applications"
            value={feedbackNote}
            onChange={(e) => setFeedbackNote(e.target.value)}
          />
          <ActionBar>
            <Button size="lg" className="w-full sm:w-auto" onClick={recordOutcome}>
              Record what happened
              <ArrowRight className="h-5 w-5" />
            </Button>
          </ActionBar>
        </Section>
      )}

      {step === 'done' && selected && (
        <Section headingRef={headingRef} eyebrow="Completed" title="You didn't do this alone." lead="One act of help, completed and recorded.">
          <div className="flex justify-center">
            <Arko state="celebration" size={88} label="Arko celebrates your completed collaboration" />
          </div>
          <Card className="space-y-3">
            <SummaryRow label="You asked for">{need?.description}</SummaryRow>
            <SummaryRow label="Helped by">
              {selected.profile.displayName} <DemoBadge />
            </SummaryRow>
            <SummaryRow label="Next step completed">{nextStepText}</SummaryRow>
            <SummaryRow label="Your answer">{helped === 'yes' ? 'Yes, I moved forward' : helped === 'partly' ? 'Partly' : 'Not really'}</SummaryRow>
            <SummaryRow label={`${partner}'s answer`}>Not recorded: demo members cannot respond.</SummaryRow>
          </Card>
          <Notice tone="demo" title="Saved in this browser only">
            Demo collaborations are stored on this device so you can see them under My collaborations. Nothing was sent to anyone.
          </Notice>
          <ActionBar>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button size="lg" onClick={findMorePeople}>
                Find someone else to work with
              </Button>
              <Link href="/collaborations" className={buttonClass('secondary', 'lg')}>
                See my collaborations
                <LinkPending />
              </Link>
            </div>
          </ActionBar>
        </Section>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Layout pieces
// ---------------------------------------------------------------------------

function orderTags(all: string[], suggested: string[]) {
  const first = suggested.filter((tag) => all.includes(tag))
  return [...first, ...all.filter((tag) => !first.includes(tag))]
}

function Progress({ current }: { current: number }) {
  return (
    <nav aria-label="Progress" className="mb-8">
      <p className="sr-only">
        Step {current + 1} of {STAGES.length}: {STAGES[current]}
      </p>
      <ol className="flex gap-1.5" aria-hidden="true">
        {STAGES.map((stage, index) => (
          <li key={stage} className="flex-1">
            <span className={`block h-1.5 rounded-full transition-colors ${index <= current ? 'bg-forest' : 'bg-line'}`} />
            <span className={`mt-2 hidden text-xs sm:block ${index === current ? 'font-semibold text-forest' : 'text-muted'}`}>{stage}</span>
          </li>
        ))}
      </ol>
      <p aria-hidden="true" className="mt-2 text-xs font-semibold text-forest sm:hidden">
        Step {current + 1} of {STAGES.length}: {STAGES[current]}
      </p>
    </nav>
  )
}

function Section({
  headingRef,
  eyebrow,
  title,
  lead,
  back,
  children,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>
  eyebrow: string
  title: string
  lead?: string
  back?: () => void
  children: ReactNode
}) {
  return (
    <section className="step-enter space-y-6">
      {back && (
        <button type="button" onClick={back} className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-sm font-medium text-forest hover:bg-mist">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      )}
      <header>
        <p className="text-sm font-semibold tracking-wide text-coral-ink uppercase">{eyebrow}</p>
        <h1 ref={headingRef} tabIndex={-1} className="mt-1 text-3xl font-extrabold tracking-tight text-ink outline-none sm:text-4xl">
          {title}
        </h1>
        {lead && <p className="mt-2 text-base text-muted sm:text-lg">{lead}</p>}
      </header>
      {children}
    </section>
  )
}

/** The screen's primary action: pinned to the thumb zone on phones, inline on larger screens. */
function ActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-ivory/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:static sm:z-auto sm:border-0 sm:bg-transparent sm:p-0 sm:pt-2 sm:backdrop-blur-none">
      {children}
    </div>
  )
}

function TagPicker({
  legend,
  hint,
  tags,
  selected,
  onToggle,
}: {
  legend: string
  hint: string
  tags: string[]
  selected: string[]
  onToggle: (tag: string) => void
}) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-ink">{legend}</legend>
      <p className="mt-1 text-sm text-muted">{hint}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <ToggleChip key={tag} selected={selected.includes(tag)} onToggle={() => onToggle(tag)}>
            {humanizeTag(tag)}
          </ToggleChip>
        ))}
      </div>
    </fieldset>
  )
}

function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-line/70 pb-3 last:border-0 last:pb-0 sm:grid-cols-[11rem_1fr]">
      <p className="text-sm font-semibold text-muted">{label}</p>
      <div className="flex flex-wrap items-center gap-2 text-ink">{children}</div>
    </div>
  )
}
