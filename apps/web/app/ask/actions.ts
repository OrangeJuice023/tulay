'use server'

import {
  ArkoChatContextSchema,
  CandidateMatch,
  DraftIntroductionContextSchema,
  ExplainMatchContextSchema,
  NeedSchema,
  OfferSchema,
  SuggestTagsContextSchema,
  type ArkoChatReply,
  type Offer,
} from '@tulay/shared'
import { DemoProvider, MetaProviderError, getAIProvider } from '@tulay/ai'
import { getCommunity, getTagVocabulary } from '@/lib/community'
import { getPublicDirectory } from '@/lib/directory'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient, getSessionUser } from '@/lib/supabase/server'
import { SupabaseCommunityRepository } from '@/lib/supabase/repository'

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string }

/** Where the wording came from: live model, demo template, or deterministic rules. */
export type ChatSource = 'live' | 'demo-template' | 'deterministic'

function sourceOf(provider: unknown): ChatSource {
  return provider instanceof DemoProvider ? 'demo-template' : 'live'
}

export type ChatTurn = {
  reply: ArkoChatReply
  source: ChatSource
  note?: string
}

/**
 * One Ask Arko turn. The provider interprets the message; candidate retrieval
 * always happens separately through `findPeopleAction` (deterministic).
 * When the live model fails, the deterministic demo provider answers instead
 * and says so — never a silent substitution. Rejected live replies
 * (integrity/contract) are never returned, rendered, or persisted, so they
 * cannot contaminate the next turn's history.
 */
export async function chatWithArkoAction(input: {
  message: unknown
  history: unknown
  displayName?: unknown
}): Promise<ActionResult<ChatTurn>> {
  const vocabulary = [...getTagVocabulary().offered, ...getTagVocabulary().needed].slice(0, 100)
  const parsed = ArkoChatContextSchema.safeParse({
    message: input.message,
    history: Array.isArray(input.history) ? input.history.slice(-10) : [],
    vocabulary,
    displayName: typeof input.displayName === 'string' ? input.displayName : undefined,
  })
  if (!parsed.success) return { ok: false, error: 'Write a message first.' }
  try {
    const provider = getAIProvider()
    const reply = await provider.chat(parsed.data)
    return { ok: true, data: { reply, source: sourceOf(provider) } }
  } catch (error) {
    if (error instanceof MetaProviderError) {
      // Integrity/contract failures mean the live reply arrived but could not
      // be trusted — say exactly that. Transport failures mean unreachable.
      // Either way the fallback is a labelled demo reply, never a rewrite.
      const unvalidated = error.code === 'integrity' || error.code === 'validation'
      const note = unvalidated
        ? 'The live reply could not be validated, so this is a labelled demo reply instead. Nothing unvalidated was kept.'
        : 'The live model was unreachable, so this is a demo reply. Your search still uses real records.'
      try {
        const reply = await new DemoProvider().chat(parsed.data)
        return {
          ok: true,
          data: {
            reply,
            source: 'demo-template',
            note,
          },
        }
      } catch {
        return { ok: false, error: 'Arko is unavailable right now. Please try again.' }
      }
    }
    return { ok: false, error: 'Arko is unavailable right now. Please try again.' }
  }
}

export type PeopleResult = {
  matches: CandidateMatch[]
  community: 'demo' | 'members'
  communitySize: number
}

/**
 * Deterministic candidate retrieval for an Ask Arko need. Signed-in members
 * search real discoverable profiles; everyone else searches the labelled demo
 * community. The model is never involved in who is returned.
 */
export async function findPeopleAction(input: {
  need: unknown
  seekerOffers: unknown[]
}): Promise<ActionResult<PeopleResult>> {
  const need = NeedSchema.safeParse(input.need)
  if (!need.success) return { ok: false, error: 'Describe the help you need before searching.' }
  const seekerOffers: Offer[] = []
  for (const raw of input.seekerOffers) {
    const offer = OfferSchema.safeParse(raw)
    if (offer.success) seekerOffers.push(offer.data)
  }

  const user = await getSessionUser()
  const client = user ? await createServerSupabaseClient() : null
  if (user && client) {
    try {
      const repo = new SupabaseCommunityRepository(client, createAdminClient())
      const matches = await repo.findMatchesFor(need.data, seekerOffers, 5)
      const members = await repo.listDiscoverable()
      return { ok: true, data: { matches, community: 'members', communitySize: members.length } }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Matching failed. Please try again.' }
    }
  }

  const { findCandidates } = await import('@tulay/shared')
  try {
    const community = getCommunity()
    const matches = findCandidates(need.data, community, { seekerOffers, limit: 5 })
    return {
      ok: true,
      data: {
        matches,
        community: 'demo',
        communitySize: community.filter((member) => member.profile.discoverable).length,
      },
    }
  } catch {
    return { ok: false, error: 'Matching failed. Please try again.' }
  }
}

export type ExplanationResult = { text: string; factors: string[]; source: ChatSource }

/**
 * Why one candidate fits. The model may phrase it, but only from the match's
 * own factors; on any failure the deterministic factors are shown instead.
 */
export async function explainMatchAction(input: {
  seekerNeed: unknown
  candidateName: unknown
  candidateOffer: unknown
  sharedLanguages: unknown
  candidateAvailability?: unknown
  matchFactors: unknown
}): Promise<ActionResult<ExplanationResult>> {
  const parsed = ExplainMatchContextSchema.safeParse({
    seekerNeed: input.seekerNeed,
    candidateName: input.candidateName,
    candidateOffer: input.candidateOffer,
    sharedLanguages: Array.isArray(input.sharedLanguages) ? input.sharedLanguages : [],
    candidateAvailability: input.candidateAvailability,
    matchFactors: input.matchFactors,
  })
  if (!parsed.success) return { ok: false, error: 'Missing details for the explanation.' }
  const fallback = {
    text: parsed.data.matchFactors.join('. ') + '.',
    factors: parsed.data.matchFactors,
    source: 'deterministic' as ChatSource,
  }
  try {
    const provider = getAIProvider()
    const result = await provider.explainMatch(parsed.data)
    return {
      ok: true,
      data: { text: result.explanation, factors: result.compatibilityFactors, source: sourceOf(provider) },
    }
  } catch {
    return { ok: true, data: fallback }
  }
}

export async function suggestTagsAction(input: {
  text: unknown
}): Promise<ActionResult<{ tags: string[]; source: ChatSource }>> {
  const text = typeof input.text === 'string' ? input.text.trim() : ''
  if (!text) return { ok: false, error: 'Write some text first.' }
  const vocabulary = [...getTagVocabulary().offered, ...getTagVocabulary().needed].slice(0, 100)
  const parsed = SuggestTagsContextSchema.safeParse({ text, vocabulary })
  if (!parsed.success) return { ok: false, error: 'Write some text first.' }
  try {
    const provider = getAIProvider()
    const result = await provider.suggestTags(parsed.data)
    return { ok: true, data: { tags: result.tags, source: sourceOf(provider) } }
  } catch {
    return { ok: false, error: 'Could not suggest tags. Pick them yourself below.' }
  }
}

export async function draftIntroAction(input: {
  senderName: unknown
  recipientName: unknown
  need: unknown
  offer?: unknown
  matchExplanation?: unknown
}): Promise<ActionResult<{ message: string; source: ChatSource }>> {
  const parsed = DraftIntroductionContextSchema.safeParse({
    senderName: input.senderName,
    recipientName: input.recipientName,
    need: input.need,
    offer: input.offer,
    matchExplanation: input.matchExplanation,
  })
  if (!parsed.success) return { ok: false, error: 'Missing details for the introduction draft.' }
  try {
    const provider = getAIProvider()
    const draft = await provider.draftIntroduction(parsed.data)
    return { ok: true, data: { message: draft.message, source: sourceOf(provider) } }
  } catch {
    // Live model failures (timeout, rate limit, key trouble) fall back to a
    // labelled demo draft so the consent flow stays usable. Same pattern as chat.
    try {
      const fallback = await new DemoProvider().draftIntroduction(parsed.data)
      return { ok: true, data: { message: fallback.message, source: 'demo-template' } }
    } catch {
      return { ok: false, error: 'Could not draft a message. You can write your own.' }
    }
  }
}

export type MemberSummary = {
  id: string
  displayName: string
  headline?: string
  careerGoal: string
  offerDescription: string
  offerTags: string[]
  isDemo: boolean
}

/** Contact-stripped summary of one member, for the "meet this person" flow. */
export async function memberSummaryAction(input: {
  id: unknown
}): Promise<ActionResult<MemberSummary | null>> {
  if (typeof input.id !== 'string' || !input.id) return { ok: false, error: 'That member was not valid.' }
  const user = await getSessionUser()
  const client = user ? await createServerSupabaseClient() : null
  if (user && client) {
    try {
      const repo = new SupabaseCommunityRepository(client, createAdminClient())
      const member = await repo.getMember(input.id)
      if (!member) return { ok: true, data: null }
      return {
        ok: true,
        data: {
          id: member.profile.id as string,
          displayName: member.profile.displayName,
          headline: member.profile.headline,
          careerGoal: member.profile.careerGoal,
          offerDescription: member.offers[0]?.description ?? '',
          offerTags: member.offers[0]?.tags ?? [],
          isDemo: false,
        },
      }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Could not load that member.' }
    }
  }
  const member = getPublicDirectory().find((entry) => entry.profile.id === input.id)
  if (!member) return { ok: true, data: null }
  return {
    ok: true,
    data: {
      id: member.profile.id as string,
      displayName: member.profile.displayName,
      headline: member.profile.headline,
      careerGoal: member.profile.careerGoal,
      offerDescription: member.offers[0]?.description ?? '',
      offerTags: member.offers[0]?.tags ?? [],
      isDemo: true,
    },
  }
}
