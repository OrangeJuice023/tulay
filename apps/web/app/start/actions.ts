'use server'

import {
  CandidateMatchSchema,
  CareerDirectionSchema,
  CareerMapInputSchema,
  CareerMapResultSchema,
  ConciergeCriteriaSchema,
  ConciergeSessionSchema,
  DraftIntroductionContextSchema,
  NeedSchema,
  OfferSchema,
  SuggestCollaborationContextSchema,
  acceptCandidate,
  adjacentCareerRoles,
  findCandidates,
  getCareerRole,
  getCareerSkill,
  resolveCareerRole,
  skillsToDevelop,
  skipCandidate,
  startConciergeSession,
  transferableSkills,
  type CandidateMatch,
  type CareerMapResult,
  type ConciergeSession,
  type DraftIntroductionContextInput,
  type ExtractedGoal,
  type Offer,
  type SuggestCollaborationContextInput,
} from '@tulay/shared'
import { DemoProvider, getAIProvider } from '@tulay/ai'
import { getCommunity } from '@/lib/community'

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string }

/**
 * Where the AI wording came from. `DemoProvider` is deterministic;
 * `MetaModelProvider` is a real Chat-Completions client (mock-verified, no live
 * request yet - see docs/AI_AGENT_DESIGN.md). `textSource()` reflects the active
 * provider: `live` only when a real model call happens. The UI must label
 * `demo-template` output as such.
 */
export type AiTextSource = 'demo-template' | 'live'

function textSource(): AiTextSource {
  return getAIProvider() instanceof DemoProvider ? 'demo-template' : 'live'
}

export async function findMatchesAction(input: {
  need: unknown
  seekerOffers: unknown[]
}): Promise<ActionResult<CandidateMatch[]>> {
  const need = NeedSchema.safeParse(input.need)
  if (!need.success) return { ok: false, error: 'Describe the help you need before searching.' }

  const seekerOffers: Offer[] = []
  for (const raw of input.seekerOffers) {
    const offer = OfferSchema.safeParse(raw)
    if (offer.success) seekerOffers.push(offer.data)
  }

  try {
    return { ok: true, data: findCandidates(need.data, getCommunity(), { seekerOffers }) }
  } catch {
    return { ok: false, error: 'Matching failed. Please try again.' }
  }
}

export async function draftIntroductionAction(
  context: DraftIntroductionContextInput,
): Promise<ActionResult<{ message: string; source: AiTextSource }>> {
  const parsed = DraftIntroductionContextSchema.safeParse(context)
  if (!parsed.success) return { ok: false, error: 'Missing details for the introduction draft.' }
  try {
    const provider = getAIProvider()
    const draft = await provider.draftIntroduction(parsed.data)
    return { ok: true, data: { message: draft.message, source: textSource() } }
  } catch {
    return { ok: false, error: 'Could not draft a message. You can write your own.' }
  }
}

export async function suggestNextStepsAction(
  context: SuggestCollaborationContextInput,
): Promise<ActionResult<{ suggestions: string[]; source: AiTextSource }>> {
  const parsed = SuggestCollaborationContextSchema.safeParse(context)
  if (!parsed.success) return { ok: false, error: 'Missing details for next-step ideas.' }
  try {
    const provider = getAIProvider()
    const result = await provider.suggestCollaboration(parsed.data)
    return { ok: true, data: { suggestions: result.suggestions, source: textSource() } }
  } catch {
    return { ok: false, error: 'Could not suggest next steps. You can write your own.' }
  }
}

export async function startConciergeSessionAction(input: {
  criteria: unknown
  need: unknown
  seekerOffers: unknown[]
}): Promise<ActionResult<ConciergeSession>> {
  const need = NeedSchema.safeParse(input.need)
  if (!need.success) return { ok: false, error: 'Describe the help you need before searching.' }
  const seekerOffers: Offer[] = []
  for (const raw of input.seekerOffers) {
    const offer = OfferSchema.safeParse(raw)
    if (offer.success) seekerOffers.push(offer.data)
  }
  const candidates = findCandidates(need.data, getCommunity(), { seekerOffers })
  const criteria = ConciergeCriteriaSchema.safeParse(input.criteria)
  if (!criteria.success) return { ok: false, error: 'Describe the relationship you are looking for.' }
  try {
    const session = startConciergeSession({ criteria: criteria.data, need: need.data, candidates })
    return { ok: true, data: session }
  } catch {
    return { ok: false, error: 'Could not start concierge session.' }
  }
}

export async function extractGoalAction(input: {
  text: unknown
}): Promise<ActionResult<{ goal: ExtractedGoal; source: AiTextSource }>> {
  const text = typeof input.text === 'string' ? input.text.trim() : ''
  if (text.length < 10) return { ok: false, error: 'Write a sentence or two about your situation first.' }
  try {
    const provider = getAIProvider()
    const goal = await provider.extractGoal(text)
    return { ok: true, data: { goal, source: textSource() } }
  } catch {
    return { ok: false, error: 'Could not structure that yet. Fill in the fields below instead.' }
  }
}

export async function mapCareerAction(input: {
  currentRoleLabel: unknown
  targetLabel: unknown
  userSkillNames: unknown
}): Promise<ActionResult<CareerMapResult>> {
  const parsed = CareerMapInputSchema.safeParse({
    currentRoleLabel: typeof input.currentRoleLabel === 'string' ? input.currentRoleLabel : '',
    targetLabel: typeof input.targetLabel === 'string' ? input.targetLabel : '',
    userSkillNames:
      typeof input.userSkillNames === 'string'
        ? input.userSkillNames.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
  })
  if (!parsed.success) return { ok: false, error: 'Tell us the role you are moving toward.' }
  const target = resolveCareerRole(parsed.data.targetLabel)
  if (!target) {
    return {
      ok: false,
      error: `"${parsed.data.targetLabel}" is not in the career catalog yet. Keep your original target and describe your need below.`,
    }
  }
  const current = parsed.data.currentRoleLabel ? resolveCareerRole(parsed.data.currentRoleLabel) : null
  const transferable = transferableSkills({
    currentRoleId: current?.id ?? null,
    targetRoleId: target.id,
    userSkillNames: parsed.data.userSkillNames,
  })
  const toDevelop = skillsToDevelop({
    targetRoleId: target.id,
    confirmedSkillNames: transferable.map((t) => t.name),
  })
  const result = CareerMapResultSchema.safeParse({
    currentRole: current,
    targetRole: target,
    adjacent: adjacentCareerRoles(target.id)
      .slice(0, 4)
      .map((entry) => ({
        role: entry.role,
        sharedSkillNames: entry.sharedSkillIds.map((id) => getCareerSkill(id)?.name ?? id),
        basis: entry.basis,
      })),
    transferable,
    toDevelop,
  })
  if (!result.success) return { ok: false, error: 'Could not map that career direction. Try again.' }
  return { ok: true, data: result.data }
}

export async function startBrowsingAction(input: {
  criteriaText: unknown
  need: unknown
  seekerOffers: unknown[]
  careerDirection?: unknown
}): Promise<ActionResult<{ session: ConciergeSession; criteriaSource: 'ai' | 'demo' | 'as-written' }>> {
  const need = NeedSchema.safeParse(input.need)
  if (!need.success) return { ok: false, error: 'Describe the help you need before searching.' }
  const seekerOffers: Offer[] = []
  for (const raw of input.seekerOffers) {
    const offer = OfferSchema.safeParse(raw)
    if (offer.success) seekerOffers.push(offer.data)
  }

  const career = CareerDirectionSchema.safeParse(input.careerDirection)
  const directionRole = career.success ? getCareerRole(career.data.roleId) : null
  const developing = career.success ? career.data.developingSkills : []
  let searchNeed = need.data
  if (directionRole) {
    searchNeed = {
      ...need.data,
      description: `${need.data.description} Moving toward ${directionRole.title}.${developing.length > 0 ? ` Developing: ${developing.join(', ')}.` : ''}`.slice(0, 2000),
      tags: [...need.data.tags, ...developing.map((d) => d.toLowerCase().slice(0, 50))].slice(0, 20),
    }
  }
  const candidates = findCandidates(searchNeed, getCommunity(), { seekerOffers })
  const withCareerReason = directionRole
    ? candidates.map((match) => {
        const evidence = [...match.sharedTags, ...match.sharedKeywords].slice(0, 3).join(', ')
        const parsed = CandidateMatchSchema.safeParse({
          ...match,
          reasons: [...match.reasons, `Relevant to your move toward ${directionRole.title} (matched: ${evidence}).`],
        })
        return parsed.success ? parsed.data : match
      })
    : candidates

  const rawText = typeof input.criteriaText === 'string' && input.criteriaText.trim() ? input.criteriaText : need.data.description
  let criteria = ConciergeCriteriaSchema.safeParse({
    relationship: 'other',
    skills: [],
    description: rawText.slice(0, 2000),
  })
  let criteriaSource: 'ai' | 'demo' | 'as-written' = 'as-written'
  if (rawText.trim().length >= 10) {
    try {
      const provider = getAIProvider()
      const extracted = await provider.extractCriteria(rawText)
      const parsed = ConciergeCriteriaSchema.safeParse(extracted)
      if (parsed.success) {
        criteria = parsed
        // DemoProvider only echoes with deterministic rules - never label that as AI.
        criteriaSource = provider instanceof DemoProvider ? 'demo' : 'ai'
      }
    } catch {
      // Fall through to the as-written criteria above; the UI says so.
    }
  }
  if (!criteria.success) return { ok: false, error: 'Describe the relationship you are looking for.' }
  try {
    const session = startConciergeSession({ criteria: criteria.data, need: searchNeed, candidates: withCareerReason })
    return { ok: true, data: { session, criteriaSource } }
  } catch {
    return { ok: false, error: 'Matching failed. Please try again.' }
  }
}

export async function skipCandidateAction(input: {
  session: unknown
}): Promise<ActionResult<ConciergeSession>> {
  const parsed = ConciergeSessionSchema.safeParse(input.session)
  if (!parsed.success) return { ok: false, error: 'Your browsing session expired. Search again.' }
  try {
    return { ok: true, data: skipCandidate(parsed.data) }
  } catch {
    return { ok: false, error: 'No one left to skip to.' }
  }
}

export async function acceptCandidateAction(input: {
  session: unknown
}): Promise<ActionResult<{ session: ConciergeSession; candidate: CandidateMatch }>> {
  const parsed = ConciergeSessionSchema.safeParse(input.session)
  if (!parsed.success) return { ok: false, error: 'Your browsing session expired. Search again.' }
  try {
    return { ok: true, data: acceptCandidate(parsed.data) }
  } catch {
    return { ok: false, error: 'No candidate to introduce right now.' }
  }
}
