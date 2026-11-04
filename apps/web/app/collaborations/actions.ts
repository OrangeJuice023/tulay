'use server'

import { revalidatePath } from 'next/cache'
import { CollaborationStatusSchema } from '@tulay/shared'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient, getSessionUser } from '@/lib/supabase/server'
import { SupabaseCommunityRepository } from '@/lib/supabase/repository'
import { notifyCollaborationUpdate, notifyOutcomeSubmitted } from '@/lib/email/notify'

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string }

async function repository() {
  const user = await getSessionUser()
  if (!user) return { user: null, repo: null as SupabaseCommunityRepository | null }
  const client = await createServerSupabaseClient()
  if (!client) return { user, repo: null as SupabaseCommunityRepository | null }
  return { user, repo: new SupabaseCommunityRepository(client, createAdminClient()) }
}

export type CollaborationView = {
  id?: string
  status: 'agreed' | 'in_progress' | 'completed' | 'cancelled'
  intendedOutcome?: string
  nextSteps: { text: string; done: boolean }[]
  partnerName: string
  partnerId: string
  introductionRequestId: string
}

export async function listCollaborationsAction(): Promise<ActionResult<CollaborationView[]>> {
  const { user, repo } = await repository()
  if (!user || !repo) return { ok: false, error: 'Sign in to see your collaborations.' }
  try {
    const collabs = await repo.listCollaborations(user.id)
    const views: CollaborationView[] = []
    for (const collab of collabs) {
      const partnerId = collab.requesterId === user.id ? collab.helperId : collab.requesterId
      const partner = await repo.getMember(partnerId)
      views.push({
        id: collab.id,
        status: collab.status,
        intendedOutcome: collab.intendedOutcome,
        nextSteps: collab.nextSteps,
        partnerName: partner?.profile.displayName ?? 'A Tulay member',
        partnerId,
        introductionRequestId: collab.introductionRequestId,
      })
    }
    return { ok: true, data: views }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not load collaborations.' }
  }
}

export async function updateCollaborationStatusAction(input: {
  collaborationId: unknown
  status: unknown
}): Promise<ActionResult<null>> {
  const { user, repo } = await repository()
  if (!user || !repo) return { ok: false, error: 'Sign in to update collaborations.' }
  const status = CollaborationStatusSchema.safeParse(input.status)
  if (typeof input.collaborationId !== 'string' || !status.success) {
    return { ok: false, error: 'That update was not valid.' }
  }
  try {
    const updated = await repo.updateCollaborationStatus(user.id, input.collaborationId, status.data)
    const other = updated.requesterId === user.id ? updated.helperId : updated.requesterId
    const own = await repo.getOwnProfile(user.id)
    await notifyCollaborationUpdate(
      repo,
      other,
      updated.id ?? input.collaborationId,
      own?.profile.displayName ?? 'Your collaborator',
      `Status is now ${status.data.replace('_', ' ')}.`,
    )
    revalidatePath('/collaborations')
    revalidatePath('/home')
    return { ok: true, data: null }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not update the collaboration.' }
  }
}

export async function setNextStepsAction(input: {
  collaborationId: unknown
  steps: unknown
}): Promise<ActionResult<null>> {
  const { user, repo } = await repository()
  if (!user || !repo) return { ok: false, error: 'Sign in to update collaborations.' }
  if (typeof input.collaborationId !== 'string' || !Array.isArray(input.steps)) {
    return { ok: false, error: 'Those next steps were not valid.' }
  }
  try {
    await repo.setNextSteps(user.id, input.collaborationId, input.steps as { text: string; done?: boolean }[])
    revalidatePath('/collaborations')
    return { ok: true, data: null }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not save next steps.' }
  }
}

export async function recordOutcomeAction(input: {
  collaborationId: unknown
  helped: unknown
  note?: unknown
}): Promise<ActionResult<null>> {
  const { user, repo } = await repository()
  if (!user || !repo) return { ok: false, error: 'Sign in to record outcomes.' }
  if (
    typeof input.collaborationId !== 'string' ||
    (input.helped !== 'yes' && input.helped !== 'partly' && input.helped !== 'no')
  ) {
    return { ok: false, error: 'That outcome was not valid.' }
  }
  try {
    await repo.recordOutcome(
      user.id,
      input.collaborationId,
      input.helped,
      typeof input.note === 'string' ? input.note : undefined,
    )
    const collabs = await repo.listCollaborations(user.id)
    const collab = collabs.find((item) => item.id === input.collaborationId)
    if (collab) {
      const other = collab.requesterId === user.id ? collab.helperId : collab.requesterId
      const own = await repo.getOwnProfile(user.id)
      await notifyOutcomeSubmitted(
        repo,
        other,
        input.collaborationId,
        own?.profile.displayName ?? 'Your collaborator',
        input.helped,
      )
    }
    revalidatePath('/collaborations')
    revalidatePath('/home')
    return { ok: true, data: null }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not record the outcome.' }
  }
}

export async function listNotificationsAction() {
  const { user, repo } = await repository()
  if (!user || !repo) return { ok: false as const, error: 'Sign in to see notifications.' }
  try {
    return { ok: true as const, data: await repo.listNotifications(user.id) }
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'Could not load notifications.' }
  }
}

export async function markNotificationReadAction(input: { notificationId: unknown }) {
  const { user, repo } = await repository()
  if (!user || !repo) return { ok: false as const, error: 'Sign in to update notifications.' }
  if (typeof input.notificationId !== 'string') return { ok: false as const, error: 'That notification was not valid.' }
  try {
    await repo.markNotificationRead(user.id, input.notificationId)
    revalidatePath('/home')
    return { ok: true as const, data: null }
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'Could not update the notification.' }
  }
}
