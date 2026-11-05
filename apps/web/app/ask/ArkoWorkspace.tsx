'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { toChatHistory, type CandidateMatch, type Need, type Offer } from '@tulay/shared'
import {
  addJourneyGoal,
  getSnapshot,
  getServerSnapshot,
  logInteraction,
  saveThread,
  subscribe,
} from '@/lib/journey-store'
import { AppNav } from '@/components/AppNav'
import { Arko, type ArkoState } from '@/components/Arko'
import { GuestNotice } from '@/components/GuestNotice'
import { DemoBadge, Notice } from '@/components/ui'
import { ArrowRight } from '@/components/icons'
import { MatchFlow, type FlowNeed } from './MatchFlow'
import { VoiceInput } from './VoiceInput'
import { chatWithArkoAction, memberSummaryAction, type ChatSource, type MemberSummary } from './actions'

const QUICK_PROMPTS = [
  'I want to transition into data analytics.',
  'Find me a mentor who understands product design.',
  'I need a technical co-founder.',
  'Can someone review my portfolio?',
  'I want to grow my freelance business.',
  'Help me figure out my next career move.',
]

const MAX_IMAGE_BYTES = 500_000

type Message = {
  id: string
  role: 'user' | 'arko'
  text: string
  source?: ChatSource
  image?: string
  link?: { href: string; label: string }
  note?: string
}

function messageId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.floor(Math.random() * 1e9)}`
}

function sourceCaption(source: ChatSource): string {
  if (source === 'live') return 'Live AI reply'
  if (source === 'demo-template') return 'Demo reply'
  return 'Tulay matching'
}

/**
 * The Ask Arko conversational workspace. Arko interprets each message through
 * the configured provider; people-searches run through the deterministic
 * matcher and continue in the guided flow below the thread.
 */
export function ArkoWorkspace({
  demoMode,
  authed,
  serverName,
  ownNeeds,
  ownOffers,
  initialQ,
  meetId,
}: {
  demoMode: boolean
  authed: boolean
  serverName: string | null
  ownNeeds: Need[]
  ownOffers: Offer[]
  initialQ: string | null
  meetId: string | null
}) {
  const journey = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [flowNeed, setFlowNeed] = useState<FlowNeed | null>(null)
  const [flowKey, setFlowKey] = useState(0)
  const [member, setMember] = useState<MemberSummary | null>(null)
  const [memberLoading, setMemberLoading] = useState(meetId !== null)
  const [pickedNeedId, setPickedNeedId] = useState<string>('')
  const [newNeedText, setNewNeedText] = useState('')
  const started = useRef(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const bottom = useRef<HTMLDivElement>(null)

  // Guests pass no name to the model: the demo profile name stays in the
  // labelled GuestNotice and is never presented as the visitor's identity.
  const displayName = serverName ?? (authed ? journey.profile.displayName : undefined)
  const openNeeds = authed ? ownNeeds.filter((need) => need.status === 'open') : journey.needs.filter((need) => need.status === 'open')

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length, pending])

  // Deep links: a prefilled question, or a specific member to meet.
  useEffect(() => {
    if (started.current) return
    started.current = true
    if (meetId) {
      memberSummaryAction({ id: meetId })
        .then((result) => {
          if (result.ok && result.data) {
            setMember(result.data)
            appendArko(
              `You asked about ${result.data.displayName} — ${result.data.headline ?? result.data.careerGoal}. Pick which need this is about, and I'll help you ask for an introduction.`,
              'deterministic',
            )
          } else {
            appendArko('I could not find that member. Tell me what you need and I\'ll search instead.', 'deterministic')
          }
        })
        .finally(() => setMemberLoading(false))
    } else if (initialQ) {
      void send(initialQ)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist the committed thread after render. The store write must never run
  // inside a state updater: React can execute updaters during render, and the
  // store's synchronous event dispatch then schedules a setState mid-render.
  // Fingerprint of the last persisted thread. The store notifies subscribers
  // synchronously on write; without this guard, any re-render cycle that
  // re-fires this effect would write again, notify again, and cascade into a
  // render loop ("Maximum update depth exceeded"). Identical threads persist
  // exactly once; real changes (new ids/text) always go through.
  const lastPersistedRef = useRef<string>('')
  useEffect(() => {
    if (authed || messages.length === 0) return
    const fingerprint = JSON.stringify(messages.map((m) => [m.id, m.role, m.text, m.source, m.image ?? null]))
    if (fingerprint === lastPersistedRef.current) return
    lastPersistedRef.current = fingerprint
    persist(messages)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, authed])

  function appendArko(text: string, source: ChatSource, extra?: Partial<Message>): Message {
    const message: Message = { id: messageId(), role: 'arko', text, source, ...extra }
    setMessages((current) => [...current, message])
    return message
  }

  function persist(thread: Message[]) {
    if (authed) return // Authed threads stay in memory; no chat-text persistence yet.
    saveThread({
      id: 'ask-current',
      title: thread.find((message) => message.role === 'user')?.text.slice(0, 80) ?? 'Ask Arko',
      messages: thread.map((message) => ({
        role: message.role,
        text: message.image ? `${message.text} [image attached]` : message.text,
        at: new Date().toISOString(),
        source: message.source,
      })),
      updatedAt: new Date().toISOString(),
    })
  }

  async function send(raw: string, attachedImage?: string | null) {
    const text = raw.trim()
    if ((!text && !attachedImage) || pending) return
    setInput('')
    setImage(null)
    setError(null)
    setFlowNeed(null)
    const userMessage: Message = { id: messageId(), role: 'user', text: text || '(image)', image: attachedImage ?? undefined }
    const history = toChatHistory(messages)
    setMessages((current) => [...current, userMessage])
    if (!authed) logInteraction('arko-chat', text.slice(0, 120) || 'Sent an image')
    setPending(true)
    try {
      const result = await chatWithArkoAction({ message: text || 'I attached an image.', history, displayName })
      if (!result.ok) {
        setError(result.error)
        return
      }
      const { reply, source, note } = result.data
      let fullText = reply.reply
      if (attachedImage) {
        fullText += '\n\nI can\'t see images yet — describe what you\'d like feedback on and I\'ll take it from there.'
      }
      const extra: Partial<Message> = {}
      if (note) extra.note = note
      if (reply.goal && authed) extra.link = { href: '/profile', label: 'Save it on your profile' }
      if (reply.goal && !authed) extra.note = 'Saved to your demo goals.'
      appendArko(fullText, source, extra)
      if (reply.goal && !authed && reply.goal.trim()) addJourneyGoal(reply.goal)
      if (reply.lookingForPeople && !reply.needsClarification && reply.extractedNeed) {
        setFlowNeed({
          description: reply.extractedNeed.description,
          tags: reply.extractedNeed.tags,
        })
        setFlowKey((key) => key + 1)
      }
    } finally {
      setPending(false)
    }
  }

  function onImageFile(file: File | undefined) {
    if (!file) return
    setError(null)
    if (!file.type.startsWith('image/')) {
      setError('Please attach an image file.')
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError('That image is too large (max 500 KB).')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setImage(typeof reader.result === 'string' ? reader.result : null)
    reader.onerror = () => setError('Could not read that image.')
    reader.readAsDataURL(file)
  }

  function continueWithMember() {
    if (!member) return
    let need: FlowNeed | null = null
    if (pickedNeedId === '__new') {
      if (!newNeedText.trim()) {
        setError('Describe the need first, or pick an existing one.')
        return
      }
      need = { id: messageId(), description: newNeedText.trim().slice(0, 2000), tags: [] }
    } else if (pickedNeedId) {
      const found = openNeeds.find((item) => item.id === pickedNeedId)
      if (found) need = { id: found.id, description: found.description, tags: found.tags }
    } else {
      setError('Pick which need this introduction is about.')
      return
    }
    if (!need) return
    setError(null)
    const direct: CandidateMatch = {
      profile: {
        id: member.id,
        displayName: member.displayName,
        careerGoal: member.careerGoal,
        countryCode: 'PH',
        locale: 'en-PH',
        discoverable: true,
        isDemo: member.isDemo,
      },
      offer: {
        profileId: member.id,
        description: member.offerDescription || 'See their full offers in the directory.',
        tags: member.offerTags,
        status: 'active',
      },
      score: 0,
      sharedTags: member.offerTags.filter((tag) => need.tags.includes(tag)),
      sharedKeywords: [],
      reciprocal: false,
      reciprocalTags: [],
      reasons: ['You chose to meet them directly.'],
    }
    setDirectMatch(direct)
    setFlowNeed(need)
    setFlowKey((key) => key + 1)
    appendArko(`Let's ask ${member.displayName} for an introduction about: ${need.description.slice(0, 140)}.`, 'deterministic')
  }

  const [directMatch, setDirectMatch] = useState<CandidateMatch | null>(null)
  const pendingCount = authed ? 0 : journey.introductions.filter((item) => item.request.status === 'pending').length

  // The header mascot keeps the journey state; the thinking state lives only in
  // the pending bubble below, so Arko appears once while waiting.
  const arkoState: ArkoState = flowNeed ? 'match-found' : messages.length === 0 ? 'greeting' : 'idle'

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 lg:flex-row lg:items-start">
      <AppNav pendingIntroductions={pendingCount} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-52 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-extrabold tracking-tight text-ink">Ask Arko</h1>
              {demoMode ? <DemoBadge label="Demo replies" /> : <span className="inline-flex items-center rounded-full bg-mist px-2.5 py-0.5 text-xs font-semibold text-forest-dark">Live model</span>}
            </div>
            <p className="mt-1 text-muted">
              Describe your next move in your own words. Arko interprets; Tulay&apos;s matcher finds{' '}
              {authed ? 'members who can help.' : 'sample members from the demo community.'}
            </p>
            {!authed && <GuestNotice line="Guest preview — people and introductions here are samples." />}
          </div>
          <Arko state={arkoState} size={72} label="Arko, your career companion" />
        </div>

        {messages.length === 0 && !member && !memberLoading && (
          <div className="mt-5">
            <p className="text-sm font-semibold text-ink">Start with one of these, or write your own:</p>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {QUICK_PROMPTS.map((prompt) => (
                <li key={prompt}>
                  <button
                    type="button"
                    onClick={() => void send(prompt)}
                    disabled={pending}
                    className="w-full rounded-3xl border border-line/70 bg-white px-4 py-3 text-left text-sm font-medium text-ink shadow-[var(--shadow-card)] transition hover:border-forest/40 disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {(memberLoading || member) && (
          <div className="mt-5 rounded-[var(--radius-card)] border border-line/70 bg-white p-5 shadow-[var(--shadow-card)]">
            {memberLoading || !member ? (
              <p className="text-sm text-muted">Loading that member…</p>
            ) : (
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-ink">Meet {member.displayName}</p>
                  {member.isDemo && <DemoBadge />}
                </div>
                <p className="mt-1 text-sm text-muted">{member.headline ?? member.careerGoal}</p>
                {member.offerDescription && <p className="mt-2 text-sm text-ink">{member.offerDescription}</p>}
                <fieldset className="mt-3">
                  <legend className="text-sm font-semibold text-ink">Which need is this about?</legend>
                  <div className="mt-2 space-y-1.5">
                    {openNeeds.map((need) => (
                      <label key={need.id} className="flex items-start gap-2.5 rounded-2xl bg-ivory px-3 py-2 text-sm">
                        <input
                          type="radio"
                          name="meet-need"
                          checked={pickedNeedId === need.id}
                          onChange={() => setPickedNeedId(need.id as string)}
                          className="mt-0.5 h-4.5 w-4.5 accent-[#176B46]"
                        />
                        <span className="text-ink">{need.description}</span>
                      </label>
                    ))}
                    <label className="flex items-start gap-2.5 rounded-2xl bg-ivory px-3 py-2 text-sm">
                      <input
                        type="radio"
                        name="meet-need"
                        checked={pickedNeedId === '__new'}
                        onChange={() => setPickedNeedId('__new')}
                        className="mt-0.5 h-4.5 w-4.5 accent-[#176B46]"
                      />
                      <span className="flex-1 text-ink">
                        A new need
                        {pickedNeedId === '__new' && (
                          <input
                            value={newNeedText}
                            onChange={(event) => setNewNeedText(event.target.value)}
                            maxLength={2000}
                            placeholder="e.g. Portfolio review before Friday"
                            aria-label="Describe the new need"
                            className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm"
                          />
                        )}
                      </span>
                    </label>
                    {openNeeds.length === 0 && pickedNeedId !== '__new' && (
                      <p className="text-[13px] text-muted">No open needs yet — describe a new one above, or chat below and Arko will shape it.</p>
                    )}
                  </div>
                </fieldset>
                <button
                  type="button"
                  onClick={continueWithMember}
                  className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-forest px-6 text-sm font-semibold text-white shadow-[var(--shadow-press)] transition hover:bg-forest-dark active:translate-y-[3px] active:shadow-none"
                >
                  Continue to introduction
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {messages.length > 0 && (
          <ol aria-live="polite" className="mt-5 space-y-3">
            {messages.map((message) => (
              <li key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-3xl px-4 py-3 text-[15px] leading-relaxed sm:max-w-[75%] ${
                    message.role === 'user'
                      ? 'rounded-br-lg bg-forest text-white'
                      : 'rounded-bl-lg border border-line/70 bg-white text-ink shadow-[var(--shadow-card)]'
                  }`}
                >
                  {message.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={message.image} alt="Attached image" className="mb-2 max-h-48 rounded-2xl object-contain" />
                  )}
                  <p className="whitespace-pre-wrap">{message.text}</p>
                  {message.note && <p className="mt-1.5 text-[13px] opacity-80">{message.note}</p>}
                  {message.link && (
                    <Link href={message.link.href} className="mt-1.5 inline-block text-sm font-semibold underline">
                      {message.link.label}
                    </Link>
                  )}
                  {message.role === 'arko' && message.source && (
                    <p className={`mt-1.5 text-xs ${message.source === 'live' ? 'text-forest' : 'text-muted'}`}>{sourceCaption(message.source)}</p>
                  )}
                </div>
              </li>
            ))}
            {pending && (
              <li className="flex justify-start" aria-label="Arko is thinking">
                <span className="inline-flex max-w-[85%] items-end gap-2 sm:max-w-[75%]">
                  <Arko state="thinking" size={44} />
                  <span className="inline-flex items-center gap-2 rounded-3xl rounded-bl-lg border border-line/70 bg-white px-4 py-3 text-sm text-muted shadow-[var(--shadow-card)]">
                    <span aria-hidden="true" className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                    Arko is thinking…
                  </span>
                </span>
              </li>
            )}
            <div ref={bottom} />
          </ol>
        )}

        {flowNeed && (
          <div className="mt-5">
            <MatchFlow
              key={flowKey}
              authed={authed}
              displayName={displayName}
              initialNeed={flowNeed}
              initialMatch={directMatch}
              seekerOffers={authed ? ownOffers : journey.offers}
              onEvent={(text, source) => appendArko(text, source)}
            />
          </div>
        )}

        {error && <p role="alert" className="mt-3 text-sm font-medium text-danger">{error}</p>}

        <form
          onSubmit={(event) => {
            event.preventDefault()
            void send(input, image)
          }}
          className="sticky bottom-3 mt-5 rounded-[var(--radius-card)] border border-line/70 bg-white p-3 shadow-[var(--shadow-card)]"
        >
          <label htmlFor="ask-input" className="sr-only">Message Arko</label>
          <div className="flex flex-wrap items-end gap-2">
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="sr-only"
              aria-label="Attach an image"
              onChange={(event) => {
                onImageFile(event.target.files?.[0])
                event.target.value = ''
              }}
            />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              aria-label="Attach an image"
              title="Attach an image (Arko can't see images yet)"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-forest transition hover:bg-mist"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true" className="h-5 w-5">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
            <textarea
              id="ask-input"
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  void send(input, image)
                }
              }}
              rows={2}
              placeholder="e.g. Find me a mentor for data analytics…"
              className="max-h-36 min-h-11 flex-1 resize-y rounded-2xl border border-line bg-ivory px-4 py-2.5 text-[15px] focus:border-forest"
            />
            <VoiceInput
              disabled={pending}
              demoMode={demoMode}
              onTranscript={(text) => {
                // Review before send: the transcript becomes editable draft
                // text only. It reaches Arko when the user presses Send.
                setInput(text)
                inputRef.current?.focus()
              }}
            />
            <button
              type="submit"
              disabled={(!input.trim() && !image) || pending}
              aria-label="Send message"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-forest text-white shadow-[var(--shadow-press)] transition hover:bg-forest-dark active:translate-y-[3px] active:shadow-none disabled:opacity-50"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
          {image && (
            <div className="mt-2 flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="Attachment preview" className="h-12 w-12 rounded-xl object-cover" />
              <button type="button" onClick={() => setImage(null)} className="text-xs font-semibold text-muted hover:text-danger">
                Remove
              </button>
            </div>
          )}
        </form>
        {demoMode && (
          <div className="mt-3">
            <Notice tone="demo" title="Demo replies are templates, not model output">
              Set <code>AI_PROVIDER=meta</code> with <code>MODEL_API_KEY</code> for live Muse Spark replies.{' '}
              {authed
                ? 'Matching always searches discoverable member records.'
                : 'Matching always searches the demo community, so everyone shown is a sample member.'}
            </Notice>
          </div>
        )}
      </div>
    </div>
  )
}
