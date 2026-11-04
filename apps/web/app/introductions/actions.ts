'use server'

import { revalidatePath } from 'next/cache'
import { IntroductionRequestSchema } from '@tulay/shared'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient, getSessionUser } from '@/lib/supabase/server'
import { SupabaseCommunityRepository } from '@/lib/supabase/repository'
import { notifyIntroductionDecided, notifyIntroductionReceived } from '@/lib/email/notify'

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string }

async function repository() {
  const user = await getSessionUser()
  if (!user) return { user: null, repo: null as SupabaseCommunityRepository | null }
  const client = await createServerSupabaseClient()
  if (!client) return { user, repo: null as SupabaseCommunityRepository | null }
  return { user, repo: new SupabaseCommunityRepository(client, createAdminClient()) }
}

export type IntroductionView = {
  request: {
    id?: string
    fromProfileId: string
    toProfileId: string
    needId: string
    offerId?: string | null
    matchFactors: string[]
    explanation?: string
    message: string
    status: 'pending' | 'accepted' | 'declined' | 'withdrawn'
    respondedAt?: string | null
  }
  partnerName: string
  partnerOffer: string
  needDescription: string
  direction: 'sent' | 'received'
}

export async function listIntroductionsAction(): Promise<ActionResult<IntroductionView[]>> {
  const { user, repo } = await repository()
  if (!user || !repo) return { ok: false, error: 'Sign in to see your introductions.' }
  try {
    const [intros, own] = await Promise.all([repo.listIntroductions(user.id), repo.getOwnProfile(user.id)])
    const views: IntroductionView[] = []
    for (const request of intros) {
      const direction = request.fromProfileId === user.id ? 'sent' : 'received'
      const partnerId = direction === 'sent' ? request.toProfileId : request.fromProfileId
      const partner = await repo.getMember(partnerId)
      const partnerName = partner?.profile.displayName ?? 'A Tulay member'
      const partnerOffer =
        partner?.offers.find((offer) => offer.id === request.offerId)?.description ??
        partner?.offers[0]?.description ??
        ''
      const needDescription =
        direction === 'sent'
          ? (own?.needs.find((need) => need.id === request.needId)?.description ?? '')
          : (partner?.needs.find((need) => need.id === request.needId)?.description ?? '')
      views.push({ request, partnerName, partnerOffer, needDescription, direction })
    }
    return { ok: true, data: views }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not load introductions.' }
  }
}

export async function requestIntroductionAction(input: {
  toProfileId: unknown
  needId: unknown
  offerId?: unknown
  matchFactors?: unknown
  explanation?: unknown
  message: unknown
}): Promise<ActionResult<{ id?: string; emailed: string }>> {
  const { user, repo } = await repository()
  if (!user || !repo) return { ok: false, error: 'Sign in to request an introduction.' }
  const parsed = IntroductionRequestSchema.safeParse({
    fromProfileId: user.id,
    toProfileId: input.toProfileId,
    needId: input.needId,
    offerId: input.offerId ?? null,
    matchFactors: input.matchFactors ?? [],
    explanation: input.explanation,
    message: input.message,
    status: 'pending',
  })
  if (!parsed.success) return { ok: false, error: 'Check your introduction details and try again.' }
  try {
    const [own, partner] = await Promise.all([repo.getOwnProfile(user.id), repo.getMember(parsed.data.toProfileId)])
    if (!partner) return { ok: false, error: 'That person is not discoverable right now.' }
    const created = await repo.requestIntroduction(user.id, parsed.data)
    const needDescription =
      own?.needs.find((need) => need.id === created.needId)?.description ?? 'general career help'
    const delivery = await notifyIntroductionReceived(
      repo,
      created,
      own?.profile.displayName ?? 'A Tulay member',
      needDescription,
    )
    revalidatePath('/introductions')
    revalidatePath('/home')
    return { ok: true, data: { id: created.id, emailed: delivery.emailed } }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not send your request.' }
  }
}

export async function decideIntroductionAction(input: {
  requestId: unknown
  decision: unknown
}): Promise<ActionResult<{ status: string }>> {
  const { user, repo } = await repository()
  if (!user || !repo) return { ok: false, error: 'Sign in to answer introductions.' }
  if (typeof input.requestId !== 'string' || (input.decision !== 'accepted' && input.decision !== 'declined')) {
    return { ok: false, error: 'That answer was not valid.' }
  }
  try {
    const decided = await repo.decideIntroduction(user.id, input.requestId, input.decision)
    if (decided.status === 'accepted') {
      try {
        await repo.createCollaborationFrom(user.id, decided)
      } catch {
        // A duplicate collaboration means this was answered twice; keep the acceptance.
      }
    }
    const own = await repo.getOwnProfile(user.id)
    await notifyIntroductionDecided(repo, decided, own?.profile.displayName ?? 'A Tulay member')
    revalidatePath('/introductions')
    revalidatePath('/collaborations')
    revalidatePath('/home')
    return { ok: true, data: { status: decided.status } }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not record your answer.' }
  }
}

export async function withdrawIntroductionAction(input: {
  requestId: unknown
}): Promise<ActionResult<null>> {
  const { user, repo } = await repository()
  if (!user || !repo) return { ok: false, error: 'Sign in to manage introductions.' }
  if (typeof input.requestId !== 'string') return { ok: false, error: 'That request was not valid.' }
  try {
    await repo.withdrawIntroduction(user.id, input.requestId)
    revalidatePath('/introductions')
    revalidatePath('/home')
    return { ok: true, data: null }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not withdraw your request.' }
  }
}

export async function contactForIntroductionAction(input: {
  requestId: unknown
}): Promise<ActionResult<{ contact: string | null }>> {
  const { user, repo } = await repository()
  if (!user || !repo) return { ok: false, error: 'Sign in to see contact details.' }
  if (typeof input.requestId !== 'string') return { ok: false, error: 'That request was not valid.' }
  try {
    const intros = await repo.listIntroductions(user.id)
    const intro = intros.find((item) => item.id === input.requestId)
    if (!intro || intro.status !== 'accepted') return { ok: true, data: { contact: null } }
    const other = intro.fromProfileId === user.id ? intro.toProfileId : intro.fromProfileId
    const contact = await repo.getContactAfterAccept(intro.id as string, user.id, other)
    return { ok: true, data: { contact } }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not load contact details.' }
  }
}
