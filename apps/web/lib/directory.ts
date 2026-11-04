import {
  CommunityMemberSchema,
  DirectoryMemberSchema,
  memberMatchesFilters,
  type CommunityMember,
  type DirectoryMember,
  type MemberFiltersInput,
} from '@tulay/shared'
import communityFixture from '../../../data/fixtures/demo-community.json'
import directoryFixture from '../../../data/fixtures/demo-directory.json'

/**
 * Server-only access to the synthetic demo community. Directory rows may carry
 * (fictional) contact details, so anything returned to the browser must go
 * through `toPublicMember` / `toPublicCommunity`, which strip them. Never
 * import this module from a client component. Replaced by Supabase queries
 * (real members) once sign-in exists.
 */

export type PublicDirectoryMember = Omit<DirectoryMember, 'profile'> & {
  profile: Omit<DirectoryMember['profile'], 'contactMethod'>
}

export type PublicCommunityMember = Omit<CommunityMember, 'profile'> & {
  profile: Omit<CommunityMember['profile'], 'contactMethod'>
}

const directoryMembers: DirectoryMember[] = (
  directoryFixture as { members: unknown[] }
).members.flatMap((raw) => {
  const parsed = DirectoryMemberSchema.safeParse(raw)
  return parsed.success ? [parsed.data] : []
})

const communityMembers: CommunityMember[] = (
  communityFixture as { members: unknown[] }
).members.flatMap((raw) => {
  const parsed = CommunityMemberSchema.safeParse(raw)
  return parsed.success ? [parsed.data] : []
})

function stripContact<T extends { contactMethod?: unknown }>(profile: T): Omit<T, 'contactMethod'> {
  const { contactMethod: _omitted, ...rest } = profile
  void _omitted
  return rest
}

export function toPublicMember(member: DirectoryMember): PublicDirectoryMember {
  return { ...member, profile: stripContact(member.profile) }
}

export function toPublicCommunityMember(member: CommunityMember): PublicCommunityMember {
  return { ...member, profile: stripContact(member.profile) }
}

/** Contact-stripped directory rows for the Discover page and dashboard previews. */
export function getPublicDirectory(filters?: MemberFiltersInput): PublicDirectoryMember[] {
  const valid = filters ?? {}
  return directoryMembers
    .filter((member) => memberMatchesFilters(member, valid))
    .map(toPublicMember)
}

/** Contact-stripped matching community for client-side dashboard previews. */
export function getPublicCommunity(): PublicCommunityMember[] {
  return communityMembers.map(toPublicCommunityMember)
}

export function getDirectoryStats() {
  const discoverable = directoryMembers.filter((member) => member.profile.discoverable)
  const studios = new Set(discoverable.map((member) => member.profile.primaryStudio).filter(Boolean))
  return {
    members: discoverable.length,
    studios: studios.size,
    allDemo: directoryMembers.every((member) => member.profile.isDemo),
  }
}

/** Full rows for server-side matching only. Never serialize to the browser. */
export function getDirectoryRows(): DirectoryMember[] {
  return directoryMembers
}
