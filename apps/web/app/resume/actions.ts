'use server'

import { z } from 'zod'
import { ResumeSchema } from '@tulay/shared'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient, getSessionUser } from '@/lib/supabase/server'
import { SupabaseCommunityRepository } from '@/lib/supabase/repository'

const ResumeIdSchema = z.string().uuid('That resume link is invalid.')

async function authedRepo() {
  const user = await getSessionUser()
  if (!user) return { user: null, repo: null }
  const client = await createServerSupabaseClient()
  if (!client) return { user: null, repo: null }
  return { user, repo: new SupabaseCommunityRepository(client, createAdminClient()) }
}

export async function listResumesAction() {
  const { user, repo } = await authedRepo()
  if (!user || !repo) return { ok: false as const, error: 'Sign in to see your saved resumes.' }
  try {
    return { ok: true as const, data: await repo.listOwnResumes(user.id) }
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'Resumes unavailable.' }
  }
}

export async function saveResumeAction(input: unknown) {
  const { user, repo } = await authedRepo()
  if (!user || !repo) return { ok: false as const, error: 'Sign in to save resumes to your account.' }
  const parsed = ResumeSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'That resume has invalid content.' }
  if (!ResumeIdSchema.safeParse(parsed.data.id).success)
    return { ok: false as const, error: 'That resume link is invalid.' }
  try {
    return { ok: true as const, data: await repo.saveResume(user.id, parsed.data) }
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'Could not save this resume.' }
  }
}

export async function deleteResumeAction(input: unknown) {
  const { user, repo } = await authedRepo()
  if (!user || !repo) return { ok: false as const, error: 'Sign in to manage saved resumes.' }
  const parsed = z.object({ id: ResumeIdSchema }).safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'That resume link is invalid.' }
  try {
    await repo.deleteResume(user.id, parsed.data.id)
    return { ok: true as const }
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'Could not delete this resume.' }
  }
}
