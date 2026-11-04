import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  CandidateMatch,
  Collaboration,
  CollaborationSchema,
  CollaborationStatusSchema,
  Deck,
  DeckSchema,
  DirectoryMember,
  DirectoryProfile,
  DirectoryProfileSchema,
  IntroductionRequest,
  IntroductionRequestSchema,
  MemberFiltersInput,
  MemberFiltersSchema,
  memberMatchesFilters,
  Need,
  NeedSchema,
  Notification,
  NotificationSchema,
  Offer,
  OfferSchema,
  RealCommunityRepository,
  Resume,
  ResumeSchema,
  findCandidates,
} from '@tulay/shared'

/**
 * Supabase-backed real-community repository (server-only). Reads discovery
 * lists through the contact-stripped `public_profiles` view; `contact_method`
 * is selected only for the row owner or an accepted collaborator after an
 * explicit introduction-state check. Every row is Zod-validated on the way
 * out; malformed discovery rows are skipped so one bad row cannot break the
 * directory.
 *
 * Live-verified 2026-11-05 against the provisioned project (anon discovery
 * reads, migrations 0001-0006 applied). Mappers are unit-tested.
 */

// ---------------------------------------------------------------------------
// Row types (snake_case, as stored) + mappers
// ---------------------------------------------------------------------------

export type ProfileRow = {
  id: string
  display_name: string
  headline?: string | null
  bio?: string | null
  career_background?: string | null
  current_situation?: string | null
  career_goal?: string | null
  availability?: string | null
  languages?: string[] | null
  country_code?: string | null
  locale?: string | null
  discoverable?: boolean | null
  visibility_settings?: Record<string, boolean> | null
  primary_studio?: string | null
  interests?: string[] | null
  location?: string | null
  avatar_path?: string | null
}

// Stored profiles may predate a finished onboarding (nullable career_goal);
// discovery still requires the strict contract.
export const StoredDirectoryProfileSchema = DirectoryProfileSchema.extend({
  careerGoal: z.string().max(2000),
})
export type StoredDirectoryProfile = z.infer<typeof StoredDirectoryProfileSchema>

export function mapProfileRow(row: ProfileRow): StoredDirectoryProfile | null {
  const parsed = StoredDirectoryProfileSchema.safeParse({
    id: row.id,
    displayName: row.display_name,
    headline: row.headline ?? undefined,
    bio: row.bio ?? undefined,
    careerBackground: row.career_background ?? undefined,
    currentSituation: row.current_situation ?? undefined,
    careerGoal: row.career_goal ?? '',
    availability: row.availability ?? undefined,
    languages: row.languages ?? undefined,
    countryCode: row.country_code ?? 'PH',
    locale: row.locale ?? 'en-PH',
    discoverable: row.discoverable ?? true,
    visibilitySettings: row.visibility_settings ?? undefined,
    primaryStudio: row.primary_studio ?? undefined,
    interests: row.interests ?? [],
    location: row.location ?? undefined,
    avatarFile: row.avatar_path ?? undefined,
    isDemo: false,
  })
  return parsed.success ? parsed.data : null
}

export type NeedRow = {
  id: string
  profile_id: string
  description: string
  tags?: string[] | null
  goal_context?: string | null
  status?: string | null
  ai_suggested?: boolean | null
}

export function mapNeedRow(row: NeedRow): Need | null {
  const parsed = NeedSchema.safeParse({
    id: row.id,
    profileId: row.profile_id,
    description: row.description,
    tags: row.tags ?? [],
    goalContext: row.goal_context ?? undefined,
    status: row.status ?? 'open',
    aiSuggested: row.ai_suggested ?? false,
  })
  return parsed.success ? parsed.data : null
}

export type OfferRow = {
  id: string
  profile_id: string
  description: string
  tags?: string[] | null
  capacity?: string | null
  status?: string | null
  rate_amount?: number | null
  currency_code?: string | null
}

export function mapOfferRow(row: OfferRow): Offer | null {
  const parsed = OfferSchema.safeParse({
    id: row.id,
    profileId: row.profile_id,
    description: row.description,
    tags: row.tags ?? [],
    capacity: row.capacity ?? undefined,
    status: row.status ?? 'active',
    rateAmount: row.rate_amount ?? null,
    currencyCode: row.currency_code ?? null,
  })
  return parsed.success ? parsed.data : null
}

export type IntroductionRow = {
  id: string
  from_profile_id: string
  to_profile_id: string
  need_id: string
  offer_id?: string | null
  match_factors?: string[] | null
  explanation?: string | null
  message: string
  status?: string | null
  responded_at?: string | null
}

export function mapIntroductionRow(row: IntroductionRow): IntroductionRequest | null {
  const parsed = IntroductionRequestSchema.safeParse({
    id: row.id,
    fromProfileId: row.from_profile_id,
    toProfileId: row.to_profile_id,
    needId: row.need_id,
    offerId: row.offer_id ?? null,
    matchFactors: row.match_factors ?? [],
    explanation: row.explanation ?? undefined,
    message: row.message,
    status: row.status ?? 'pending',
    respondedAt: row.responded_at ?? null,
  })
  return parsed.success ? parsed.data : null
}

export type CollaborationRow = {
  id: string
  introduction_request_id: string
  requester_id: string
  helper_id: string
  intended_outcome?: string | null
  status?: string | null
}

export type MilestoneRow = {
  collaboration_id: string
  text: string
  done?: boolean | null
  position?: number | null
}

export function mapCollaborationRow(row: CollaborationRow, milestones: MilestoneRow[]): Collaboration | null {
  const steps = milestones
    .filter((milestone) => milestone.collaboration_id === row.id)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((milestone) => ({ text: milestone.text, done: milestone.done ?? false }))
  const parsed = CollaborationSchema.safeParse({
    id: row.id,
    introductionRequestId: row.introduction_request_id,
    requesterId: row.requester_id,
    helperId: row.helper_id,
    intendedOutcome: row.intended_outcome ?? undefined,
    nextSteps: steps,
    status: row.status ?? 'agreed',
  })
  return parsed.success ? parsed.data : null
}

export type NotificationRow = {
  id: string
  recipient_profile_id: string
  type: string
  title: string
  body: string
  link?: string | null
  read?: boolean | null
  created_at?: string | null
}

export function mapNotificationRow(row: NotificationRow): Notification | null {
  const parsed = NotificationSchema.safeParse({
    id: row.id,
    recipientProfileId: row.recipient_profile_id,
    type: row.type,
    title: row.title,
    body: row.body,
    link: row.link ?? undefined,
    read: row.read ?? false,
    createdAt: row.created_at ?? undefined,
  })
  return parsed.success ? parsed.data : null
}

export type DeckRow = {
  id: string
  owner_id: string
  title: string
  purpose?: string | null
  audience?: string | null
  context?: string | null
  template: string
  slides: unknown
  source?: string | null
  updated_at: string
}

export function mapDeckRow(row: DeckRow): Deck | null {
  const parsed = DeckSchema.safeParse({
    id: row.id,
    title: row.title,
    purpose: row.purpose ?? '',
    audience: row.audience ?? '',
    context: row.context ?? '',
    template: row.template,
    slides: Array.isArray(row.slides) ? row.slides : [],
    source: row.source ?? 'manual',
    updatedAt: row.updated_at,
  })
  return parsed.success ? parsed.data : null
}

export type ResumeRow = {
  id: string
  owner_id: string
  full_name: string
  headline?: string | null
  email?: string | null
  phone?: string | null
  location?: string | null
  summary?: string | null
  experience: unknown
  education: unknown
  skills: unknown
  projects: unknown
  certifications: unknown
  target_role?: string | null
  target_job_description?: string | null
  source?: string | null
  updated_at: string
}

export function mapResumeRow(row: ResumeRow): Resume | null {
  const parsed = ResumeSchema.safeParse({
    id: row.id,
    fullName: row.full_name,
    headline: row.headline ?? '',
    email: row.email ?? '',
    phone: row.phone ?? '',
    location: row.location ?? '',
    summary: row.summary ?? '',
    experience: Array.isArray(row.experience) ? row.experience : [],
    education: Array.isArray(row.education) ? row.education : [],
    skills: Array.isArray(row.skills) ? row.skills : [],
    projects: Array.isArray(row.projects) ? row.projects : [],
    certifications: Array.isArray(row.certifications) ? row.certifications : [],
    targetRole: row.target_role ?? '',
    targetJobDescription: row.target_job_description ?? '',
    source: row.source ?? 'manual',
    updatedAt: row.updated_at,
  })
  return parsed.success ? parsed.data : null
}

export function isDuplicatePendingError(error: { code?: string; message?: string }): boolean {
  return error.code === '23505' || /duplicate key|intro_pending_unique/i.test(error.message ?? '')
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

const DISCOVERY_PROFILE_COLUMNS =
  'id, display_name, headline, bio, career_background, current_situation, career_goal, availability, languages, country_code, locale, discoverable, visibility_settings, primary_studio, interests, location, avatar_path'

export class SupabaseCommunityRepository implements RealCommunityRepository {
  readonly kind = 'real' as const
  private readonly db: SupabaseClient
  private readonly admin: SupabaseClient | null

  constructor(sessionClient: SupabaseClient, adminClient: SupabaseClient | null = null) {
    this.db = sessionClient
    this.admin = adminClient
  }

  async listDiscoverable(filters?: MemberFiltersInput): Promise<DirectoryMember[]> {
    const valid = MemberFiltersSchema.parse(filters ?? {})
    const { data: profiles, error } = await this.db
      .from('public_profiles')
      .select(DISCOVERY_PROFILE_COLUMNS)
      .eq('discoverable', true)
    if (error) throw new Error(`Directory unavailable: ${error.message}`)
    const ids = (profiles as ProfileRow[]).map((row) => row.id)
    if (ids.length === 0) return []
    const [{ data: needs }, { data: offers }] = await Promise.all([
      this.db.from('needs').select('*').in('profile_id', ids).eq('status', 'open'),
      this.db.from('offers').select('*').in('profile_id', ids).eq('status', 'active'),
    ])
    const needsByProfile = groupByProfile((needs as NeedRow[] | null) ?? [], mapNeedRow)
    const offersByProfile = groupByProfile((offers as OfferRow[] | null) ?? [], mapOfferRow)
    const members: DirectoryMember[] = []
    for (const row of profiles as ProfileRow[]) {
      const profile = mapProfileRow(row)
      // Discovery requires the strict contract (finished onboarding).
      const strict = profile ? DirectoryProfileSchema.safeParse(profile) : null
      if (!strict?.success) continue
      const member: DirectoryMember = {
        profile: strict.data,
        offers: offersByProfile.get(row.id) ?? [],
        needs: needsByProfile.get(row.id) ?? [],
      }
      if (memberMatchesFilters(member, valid)) members.push(member)
    }
    return members
  }

  async getMember(id: string): Promise<DirectoryMember | null> {
    const { data, error } = await this.db
      .from('public_profiles')
      .select(DISCOVERY_PROFILE_COLUMNS)
      .eq('id', id)
      .eq('discoverable', true)
      .maybeSingle()
    if (error) throw new Error(`Member unavailable: ${error.message}`)
    if (!data) return null
    const profile = mapProfileRow(data as ProfileRow)
    const strict = profile ? DirectoryProfileSchema.safeParse(profile) : null
    if (!strict?.success) return null
    const [{ data: needs }, { data: offers }] = await Promise.all([
      this.db.from('needs').select('*').eq('profile_id', id).eq('status', 'open'),
      this.db.from('offers').select('*').eq('profile_id', id).eq('status', 'active'),
    ])
    return {
      profile: strict.data,
      offers: (((offers as OfferRow[] | null) ?? []).map(mapOfferRow).filter(Boolean) as Offer[]),
      needs: (((needs as NeedRow[] | null) ?? []).map(mapNeedRow).filter(Boolean) as Need[]),
    }
  }

  async getOwnProfile(userId: string): Promise<DirectoryMember | null> {
    const { data, error } = await this.db.from('profiles').select('*').eq('id', userId).maybeSingle()
    if (error) throw new Error(`Profile unavailable: ${error.message}`)
    if (!data) return null
    const profile = mapProfileRow(data as ProfileRow)
    if (!profile) return null
    const { data: contactRow } = await this.db.from('profile_contacts').select('contact_method').eq('profile_id', userId).maybeSingle()
    const contactMethod = (contactRow as { contact_method?: string | null } | null)?.contact_method
    if (contactMethod) (profile as { contactMethod?: string }).contactMethod = contactMethod
    const [{ data: needs }, { data: offers }] = await Promise.all([
      this.db.from('needs').select('*').eq('profile_id', userId),
      this.db.from('offers').select('*').eq('profile_id', userId),
    ])
    return {
      profile: profile as DirectoryProfile,
      offers: (((offers as OfferRow[] | null) ?? []).map(mapOfferRow).filter(Boolean) as Offer[]),
      needs: (((needs as NeedRow[] | null) ?? []).map(mapNeedRow).filter(Boolean) as Need[]),
    }
  }

  /**
   * Idempotent minimal profile for a freshly confirmed user. Safe to call on
   * every callback: existing rows are left untouched. New rows start
   * undiscoverable with onboarding incomplete, so nothing half-filled can
   * appear in the directory.
   */
  async ensureOwnProfile(userId: string, displayName: string): Promise<void> {
    const name = displayName.trim().slice(0, 100) || 'Tulay member'
    const { error } = await this.db
      .from('profiles')
      .upsert(
        { id: userId, display_name: name, discoverable: false, onboarding_completed: false },
        { onConflict: 'id', ignoreDuplicates: true },
      )
    if (error) throw new Error(`Profile unavailable: ${error.message}`)
  }

  /** True once the owner finished onboarding. A missing row counts as false. */
  async getOnboardingCompleted(userId: string): Promise<boolean> {
    const { data, error } = await this.db
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', userId)
      .maybeSingle()
    if (error) throw new Error(`Profile unavailable: ${error.message}`)
    return (data as { onboarding_completed?: boolean | null } | null)?.onboarding_completed === true
  }

  async setOnboardingCompleted(userId: string, completed: boolean): Promise<void> {
    const { error } = await this.db
      .from('profiles')
      .update({ onboarding_completed: completed })
      .eq('id', userId)
    if (error) throw new Error(`Could not save onboarding progress: ${error.message}`)
  }

  async saveOwnProfile(userId: string, profile: DirectoryProfile): Promise<DirectoryMember> {
    const { data, error } = await this.db
      .from('profiles')
      .upsert({
        id: userId,
        display_name: profile.displayName,
        headline: profile.headline ?? null,
        bio: profile.bio ?? null,
        career_background: profile.careerBackground ?? null,
        current_situation: profile.currentSituation ?? null,
        career_goal: profile.careerGoal || null,
        availability: profile.availability ?? null,
        languages: profile.languages ?? [],
        country_code: profile.countryCode ?? 'PH',
        locale: profile.locale ?? 'en-PH',
        discoverable: profile.discoverable ?? true,
        visibility_settings: profile.visibilitySettings ?? {},
        primary_studio: profile.primaryStudio ?? null,
        interests: profile.interests ?? [],
        location: profile.location ?? null,
        avatar_path: profile.avatarFile ?? null,
      })
      .select('*')
      .single()
    if (error) throw new Error(`Could not save your profile: ${error.message}`)
    if (profile.contactMethod) {
      const { error: contactError } = await this.db
        .from('profile_contacts')
        .upsert({ profile_id: userId, contact_method: profile.contactMethod }, { onConflict: 'profile_id' })
      if (contactError) throw new Error(`Could not save your contact method: ${contactError.message}`)
    }
    const saved = await this.getOwnProfile(userId)
    if (!saved) throw new Error('Profile saved but could not be read back.')
    void data
    return saved
  }

  async addNeed(userId: string, need: Omit<Need, 'profileId'>): Promise<Need> {
    const valid = NeedSchema.parse({ ...need, profileId: userId })
    const { data, error } = await this.db
      .from('needs')
      .insert({
        profile_id: userId,
        description: valid.description,
        tags: valid.tags,
        goal_context: valid.goalContext ?? null,
        status: valid.status,
        ai_suggested: valid.aiSuggested,
      })
      .select('*')
      .single()
    if (error) throw new Error(`Could not save your need: ${error.message}`)
    const mapped = mapNeedRow(data as NeedRow)
    if (!mapped) throw new Error('Need saved but failed validation.')
    return mapped
  }

  async addOffer(userId: string, offer: Omit<Offer, 'profileId'>): Promise<Offer> {
    const valid = OfferSchema.parse({ ...offer, profileId: userId })
    const { data, error } = await this.db
      .from('offers')
      .insert({
        profile_id: userId,
        description: valid.description,
        tags: valid.tags,
        capacity: valid.capacity ?? null,
        status: valid.status,
        rate_amount: valid.rateAmount ?? null,
        currency_code: valid.currencyCode ?? null,
      })
      .select('*')
      .single()
    if (error) throw new Error(`Could not save your offer: ${error.message}`)
    const mapped = mapOfferRow(data as OfferRow)
    if (!mapped) throw new Error('Offer saved but failed validation.')
    return mapped
  }

  async closeNeed(userId: string, needId: string): Promise<void> {
    const { error } = await this.db
      .from('needs')
      .update({ status: 'closed' })
      .eq('id', needId)
      .eq('profile_id', userId)
    if (error) throw new Error(`Could not close that need: ${error.message}`)
  }

  async requestIntroduction(
    userId: string,
    request: Omit<IntroductionRequest, 'fromProfileId' | 'status'>,
  ): Promise<IntroductionRequest> {
    const valid = IntroductionRequestSchema.parse({ ...request, fromProfileId: userId, status: 'pending' })
    if (valid.toProfileId === userId) throw new Error('You cannot request an introduction to yourself.')
    const { data, error } = await this.db
      .from('introduction_requests')
      .insert({
        from_profile_id: userId,
        to_profile_id: valid.toProfileId,
        need_id: valid.needId,
        offer_id: valid.offerId ?? null,
        match_factors: valid.matchFactors,
        explanation: valid.explanation ?? null,
        message: valid.message,
        status: 'pending',
      })
      .select('*')
      .single()
    if (error) {
      if (isDuplicatePendingError(error)) {
        throw new Error('You already have a pending request with this person for that need.')
      }
      throw new Error(`Could not send your request: ${error.message}`)
    }
    const mapped = mapIntroductionRow(data as IntroductionRow)
    if (!mapped) throw new Error('Request sent but failed validation.')
    return mapped
  }

  async listIntroductions(userId: string): Promise<IntroductionRequest[]> {
    const { data, error } = await this.db
      .from('introduction_requests')
      .select('*')
      .or(`from_profile_id.eq.${userId},to_profile_id.eq.${userId}`)
      .order('created_at', { ascending: false })
    if (error) throw new Error(`Introductions unavailable: ${error.message}`)
    return ((data as IntroductionRow[] | null) ?? []).map(mapIntroductionRow).filter(Boolean) as IntroductionRequest[]
  }

  async decideIntroduction(
    userId: string,
    requestId: string,
    decision: 'accepted' | 'declined',
  ): Promise<IntroductionRequest> {
    const { data, error } = await this.db
      .from('introduction_requests')
      .update({ status: decision, responded_at: new Date().toISOString() })
      .eq('id', requestId)
      .eq('to_profile_id', userId)
      .eq('status', 'pending')
      .select('*')
      .maybeSingle()
    if (error) throw new Error(`Could not record your decision: ${error.message}`)
    if (!data) throw new Error('That request is no longer pending, or it is not yours to answer.')
    const mapped = mapIntroductionRow(data as IntroductionRow)
    if (!mapped) throw new Error('Decision recorded but failed validation.')
    return mapped
  }

  async withdrawIntroduction(userId: string, requestId: string): Promise<void> {
    const { data, error } = await this.db
      .from('introduction_requests')
      .update({ status: 'withdrawn', responded_at: new Date().toISOString() })
      .eq('id', requestId)
      .eq('from_profile_id', userId)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle()
    if (error) throw new Error(`Could not withdraw your request: ${error.message}`)
    if (!data) throw new Error('That request is no longer pending, or it is not yours.')
  }

  async listCollaborations(userId: string): Promise<Collaboration[]> {
    const { data, error } = await this.db
      .from('collaborations')
      .select('*')
      .or(`requester_id.eq.${userId},helper_id.eq.${userId}`)
      .order('created_at', { ascending: false })
    if (error) throw new Error(`Collaborations unavailable: ${error.message}`)
    const rows = (data as CollaborationRow[] | null) ?? []
    if (rows.length === 0) return []
    const { data: milestones } = await this.db
      .from('collaboration_milestones')
      .select('*')
      .in(
        'collaboration_id',
        rows.map((row) => row.id),
      )
    const milestoneRows = (milestones as MilestoneRow[] | null) ?? []
    return rows.map((row) => mapCollaborationRow(row, milestoneRows)).filter(Boolean) as Collaboration[]
  }

  /** Create the collaboration for an accepted introduction (one per intro). */
  async createCollaborationFrom(userId: string, request: IntroductionRequest): Promise<Collaboration> {
    if (request.status !== 'accepted' || !request.id) {
      throw new Error('A collaboration needs an accepted introduction.')
    }
    if (request.fromProfileId !== userId && request.toProfileId !== userId) {
      throw new Error('Only the introduction parties can start this collaboration.')
    }
    const { data, error } = await this.db
      .from('collaborations')
      .insert({
        introduction_request_id: request.id,
        requester_id: request.fromProfileId,
        helper_id: request.toProfileId,
      })
      .select('*')
      .single()
    if (error) {
      if (isDuplicatePendingError(error)) throw new Error('A collaboration already exists for this introduction.')
      throw new Error(`Could not start the collaboration: ${error.message}`)
    }
    const mapped = mapCollaborationRow(data as CollaborationRow, [])
    if (!mapped) throw new Error('Collaboration started but failed validation.')
    return mapped
  }

  async updateCollaborationStatus(
    userId: string,
    collaborationId: string,
    status: Collaboration['status'],
  ): Promise<Collaboration> {
    const validStatus = CollaborationStatusSchema.parse(status)
    const existing = await this.getCollaboration(collaborationId)
    if (!existing || (existing.requesterId !== userId && existing.helperId !== userId)) {
      throw new Error('You are not part of that collaboration.')
    }
    const { data, error } = await this.db
      .from('collaborations')
      .update({ status: validStatus })
      .eq('id', collaborationId)
      .select('*')
      .single()
    if (error) throw new Error(`Could not update the collaboration: ${error.message}`)
    const mapped = mapCollaborationRow(data as CollaborationRow, toMilestoneRows(existing))
    if (!mapped) throw new Error('Collaboration updated but failed validation.')
    return mapped
  }

  async setNextSteps(userId: string, collaborationId: string, steps: { text: string; done?: boolean }[]): Promise<void> {
    const existing = await this.getCollaboration(collaborationId)
    if (!existing || (existing.requesterId !== userId && existing.helperId !== userId)) {
      throw new Error('You are not part of that collaboration.')
    }
    const valid = z.array(z.object({ text: z.string().trim().min(1).max(500), done: z.boolean().default(false) })).max(20).parse(steps)
    const { error: deleteError } = await this.db.from('collaboration_milestones').delete().eq('collaboration_id', collaborationId)
    if (deleteError) throw new Error(`Could not save next steps: ${deleteError.message}`)
    if (valid.length === 0) return
    const { error } = await this.db.from('collaboration_milestones').insert(
      valid.map((step, index) => ({ collaboration_id: collaborationId, text: step.text, done: step.done, position: index })),
    )
    if (error) throw new Error(`Could not save next steps: ${error.message}`)
  }

  async recordOutcome(
    userId: string,
    collaborationId: string,
    helped: 'yes' | 'partly' | 'no',
    note?: string,
  ): Promise<void> {
    const existing = await this.getCollaboration(collaborationId)
    if (!existing || (existing.requesterId !== userId && existing.helperId !== userId)) {
      throw new Error('You are not part of that collaboration.')
    }
    if (existing.status !== 'completed') throw new Error('Outcomes are recorded once the collaboration is completed.')
    const { error } = await this.db.from('collaboration_outcomes').upsert(
      {
        collaboration_id: collaborationId,
        profile_id: userId,
        helped,
        note: note?.slice(0, 2000) ?? null,
      },
      { onConflict: 'collaboration_id,profile_id' },
    )
    if (error) throw new Error(`Could not record the outcome: ${error.message}`)
  }

  /**
   * Contact method for an accepted introduction party only. The introduction
   * state is checked first; without an accepted row this returns null even
   * though RLS alone would permit the read.
   */
  async getContactAfterAccept(introductionId: string, userId: string, otherProfileId: string): Promise<string | null> {
    const { data, error } = await this.db
      .from('introduction_requests')
      .select('status, from_profile_id, to_profile_id')
      .eq('id', introductionId)
      .maybeSingle()
    if (error || !data) return null
    const row = data as { status: string; from_profile_id: string; to_profile_id: string }
    if (row.status !== 'accepted') return null
    const parties = [row.from_profile_id, row.to_profile_id]
    if (!parties.includes(userId) || !parties.includes(otherProfileId)) return null
    const { data: profile } = await this.db.from('profile_contacts').select('contact_method').eq('profile_id', otherProfileId).maybeSingle()
    const contact = (profile as { contact_method?: string | null } | null)?.contact_method
    return contact?.trim() ? contact : null
  }

  async findMatchesFor(need: Need, seekerOffers: Offer[] = [], limit = 5): Promise<CandidateMatch[]> {
    const members = await this.listDiscoverable()
    return findCandidates(need, members, { seekerOffers, limit })
  }

  // -- Notifications (reads on the session client, writes on service role) --

  async listNotifications(userId: string): Promise<Notification[]> {
    const { data, error } = await this.db
      .from('notifications')
      .select('*')
      .eq('recipient_profile_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw new Error(`Notifications unavailable: ${error.message}`)
    return ((data as NotificationRow[] | null) ?? []).map(mapNotificationRow).filter(Boolean) as Notification[]
  }

  async markNotificationRead(userId: string, notificationId: string): Promise<void> {
    const { error } = await this.db
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .eq('recipient_profile_id', userId)
    if (error) throw new Error(`Could not update the notification: ${error.message}`)
  }

  async insertNotification(input: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification | null> {
    if (!this.admin) return null
    const valid = NotificationSchema.parse(input)
    const { data, error } = await this.admin
      .from('notifications')
      .insert({
        recipient_profile_id: valid.recipientProfileId,
        type: valid.type,
        title: valid.title,
        body: valid.body,
        link: valid.link ?? null,
      })
      .select('*')
      .single()
    if (error) throw new Error(`Could not notify: ${error.message}`)
    return mapNotificationRow(data as NotificationRow)
  }

  /** Recipient email for transactional mail. Service role only, never exposed. */
  async getRecipientEmail(profileId: string): Promise<string | null> {
    if (!this.admin) return null
    const { data, error } = await this.admin.auth.admin.getUserById(profileId)
    if (error || !data?.user?.email) return null
    return data.user.email
  }

  async listOwnDecks(userId: string): Promise<Deck[]> {
    const { data, error } = await this.db
      .from('decks')
      .select('*')
      .eq('owner_id', userId)
      .order('updated_at', { ascending: false })
    if (error) throw new Error(`Decks unavailable: ${error.message}`)
    return ((data as DeckRow[] | null) ?? [])
      .map(mapDeckRow)
      .filter((deck): deck is Deck => deck !== null)
  }

  async saveDeck(userId: string, deck: Deck): Promise<Deck> {
    const valid = DeckSchema.parse(deck)
    const { data, error } = await this.db
      .from('decks')
      .upsert(
        {
          id: valid.id,
          owner_id: userId,
          title: valid.title,
          purpose: valid.purpose,
          audience: valid.audience,
          context: valid.context,
          template: valid.template,
          slides: valid.slides,
          source: valid.source,
        },
        { onConflict: 'id' },
      )
      .select('*')
      .single()
    if (error || !data) throw new Error(`Could not save this deck: ${error?.message ?? 'unknown error'}`)
    const mapped = mapDeckRow(data as DeckRow)
    if (!mapped) throw new Error('Could not save this deck: the saved row failed validation.')
    return mapped
  }

  async deleteDeck(userId: string, deckId: string): Promise<void> {
    const { error } = await this.db.from('decks').delete().eq('id', deckId).eq('owner_id', userId)
    if (error) throw new Error(`Could not delete this deck: ${error.message}`)
  }

  async listOwnResumes(userId: string): Promise<Resume[]> {
    const { data, error } = await this.db
      .from('resumes')
      .select('*')
      .eq('owner_id', userId)
      .order('updated_at', { ascending: false })
    if (error) throw new Error(`Resumes unavailable: ${error.message}`)
    return ((data as ResumeRow[] | null) ?? [])
      .map(mapResumeRow)
      .filter((resume): resume is Resume => resume !== null)
  }

  async saveResume(userId: string, resume: Resume): Promise<Resume> {
    const valid = ResumeSchema.parse(resume)
    const { data, error } = await this.db
      .from('resumes')
      .upsert(
        {
          id: valid.id,
          owner_id: userId,
          full_name: valid.fullName,
          headline: valid.headline,
          email: valid.email,
          phone: valid.phone,
          location: valid.location,
          summary: valid.summary,
          experience: valid.experience,
          education: valid.education,
          skills: valid.skills,
          projects: valid.projects,
          certifications: valid.certifications,
          target_role: valid.targetRole,
          target_job_description: valid.targetJobDescription,
          source: valid.source,
        },
        { onConflict: 'id' },
      )
      .select('*')
      .single()
    if (error || !data) throw new Error(`Could not save this resume: ${error?.message ?? 'unknown error'}`)
    const mapped = mapResumeRow(data as ResumeRow)
    if (!mapped) throw new Error('Could not save this resume: the saved row failed validation.')
    return mapped
  }

  async deleteResume(userId: string, resumeId: string): Promise<void> {
    const { error } = await this.db.from('resumes').delete().eq('id', resumeId).eq('owner_id', userId)
    if (error) throw new Error(`Could not delete this resume: ${error.message}`)
  }

  private async getCollaboration(collaborationId: string): Promise<Collaboration | null> {
    const { data, error } = await this.db.from('collaborations').select('*').eq('id', collaborationId).maybeSingle()
    if (error || !data) return null
    const { data: milestones } = await this.db.from('collaboration_milestones').select('*').eq('collaboration_id', collaborationId)
    return mapCollaborationRow(data as CollaborationRow, (milestones as MilestoneRow[] | null) ?? [])
  }
}

function groupByProfile<Row extends { profile_id: string }, Mapped>(
  rows: Row[],
  map: (row: Row) => Mapped | null,
): Map<string, Mapped[]> {
  const grouped = new Map<string, Mapped[]>()
  for (const row of rows) {
    const mapped = map(row)
    if (!mapped) continue
    const list = grouped.get(row.profile_id) ?? []
    list.push(mapped)
    grouped.set(row.profile_id, list)
  }
  return grouped
}

function toMilestoneRows(collaboration: Collaboration): MilestoneRow[] {
  return collaboration.nextSteps.map((step, index) => ({
    collaboration_id: collaboration.id ?? '',
    text: step.text,
    done: step.done,
    position: index,
  }))
}
