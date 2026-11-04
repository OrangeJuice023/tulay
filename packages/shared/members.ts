import { z } from 'zod'
import { CandidateMatch } from './matching'
import {
  Collaboration,
  CollaborationSchema,
  IntroductionRequest,
  IntroductionRequestSchema,
  Need,
  NeedSchema,
  Offer,
  OfferSchema,
  ProfileSchema,
} from './schemas'

/**
 * Community directory contracts. Demo and real datasets share these shapes but
 * never share rows: repositories below are strictly separated by construction.
 */

export const StudioSchema = z.enum(['career', 'freelance', 'venture'])
export type Studio = z.infer<typeof StudioSchema>

export const DirectoryProfileSchema = ProfileSchema.extend({
  headline: z.string().trim().max(160).optional(),
  primaryStudio: StudioSchema.optional(),
  interests: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
  location: z.string().trim().max(200).optional(),
  avatarFile: z.string().trim().max(200).optional(),
})
export type DirectoryProfile = z.infer<typeof DirectoryProfileSchema>

export const DirectoryMemberSchema = z.object({
  profile: DirectoryProfileSchema,
  offers: z.array(OfferSchema).default([]),
  needs: z.array(NeedSchema).default([]),
})
export type DirectoryMember = z.infer<typeof DirectoryMemberSchema>

export const MemberFiltersSchema = z.object({
  query: z.string().trim().max(200).optional(),
  studio: StudioSchema.optional(),
  skill: z.string().trim().max(50).optional(),
  availableOnly: z.boolean().optional(),
})
export type MemberFilters = z.infer<typeof MemberFiltersSchema>
export type MemberFiltersInput = z.input<typeof MemberFiltersSchema>

function haystackOf(member: DirectoryMember): string {
  const profile = member.profile
  const parts = [
    profile.displayName,
    profile.headline ?? '',
    profile.bio ?? '',
    profile.careerBackground ?? '',
    profile.currentSituation ?? '',
    profile.careerGoal,
    profile.location ?? '',
    ...profile.interests,
    ...member.offers.flatMap((offer) => [offer.description, ...offer.tags]),
    ...member.needs.flatMap((need) => [need.description, ...need.tags]),
  ]
  return parts.join('\n').toLowerCase()
}

/** Pure directory filtering shared by every repository implementation. */
export function memberMatchesFilters(member: DirectoryMember, filters: MemberFilters): boolean {
  if (member.profile.discoverable === false) return false
  if (filters.studio && member.profile.primaryStudio !== filters.studio) return false
  if (filters.availableOnly && !member.profile.availability?.trim()) return false
  if (filters.skill) {
    const wanted = filters.skill.trim().toLowerCase()
    const tags = [
      ...member.offers.flatMap((offer) => offer.tags),
      ...member.needs.flatMap((need) => need.tags),
      ...member.profile.interests,
    ].map((tag) => tag.toLowerCase())
    if (!tags.includes(wanted)) return false
  }
  if (filters.query) {
    const haystack = haystackOf(member)
    const words = filters.query.toLowerCase().split(/\s+/).filter(Boolean)
    if (!words.every((word) => haystack.includes(word))) return false
  }
  return true
}

export class RepositoryUnavailableError extends Error {
  readonly kind: 'demo' | 'real'
  constructor(kind: 'demo' | 'real', message: string) {
    super(message)
    this.name = 'RepositoryUnavailableError'
    this.kind = kind
  }
}

/** Read-only access to the fictional demo community. Never touches real tables. */
export interface DemoCommunityRepository {
  readonly kind: 'demo'
  listMembers(filters?: MemberFiltersInput): Promise<DirectoryMember[]>
  getMember(id: string): Promise<DirectoryMember | null>
  findMatches(need: Need, seekerOffers?: Offer[], limit?: number): Promise<CandidateMatch[]>
}

/**
 * Authenticated member data. Every method operates on real-member tables only
 * and assumes the caller enforces the current user. Never touches demo tables.
 */
export interface RealCommunityRepository {
  readonly kind: 'real'
  listDiscoverable(filters?: MemberFiltersInput): Promise<DirectoryMember[]>
  getMember(id: string): Promise<DirectoryMember | null>
  getOwnProfile(userId: string): Promise<DirectoryMember | null>
  saveOwnProfile(userId: string, profile: DirectoryProfile): Promise<DirectoryMember>
  addNeed(userId: string, need: Omit<Need, 'profileId'>): Promise<Need>
  addOffer(userId: string, offer: Omit<Offer, 'profileId'>): Promise<Offer>
  closeNeed(userId: string, needId: string): Promise<void>
  requestIntroduction(
    userId: string,
    request: Omit<IntroductionRequest, 'fromProfileId' | 'status'>,
  ): Promise<IntroductionRequest>
  listIntroductions(userId: string): Promise<IntroductionRequest[]>
  decideIntroduction(
    userId: string,
    requestId: string,
    decision: 'accepted' | 'declined',
  ): Promise<IntroductionRequest>
  withdrawIntroduction(userId: string, requestId: string): Promise<void>
  listCollaborations(userId: string): Promise<Collaboration[]>
}

export const RepositoryValidators = {
  DirectoryMemberSchema,
  MemberFiltersSchema,
  NeedSchema,
  IntroductionRequestSchema,
  CollaborationSchema,
}
