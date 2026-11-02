import { CommunityMemberSchema, type CommunityMember } from '@tulay/shared'
import fixture from '../../../data/fixtures/demo-community.json'

/**
 * Server-side access to the synthetic demo community. Import only from server components and
 * server actions: the fixture contains (fictional) contact details that must not reach the
 * browser before consent. Replaced by Supabase queries later.
 */
const members: CommunityMember[] = fixture.members.flatMap((raw) => {
  const parsed = CommunityMemberSchema.safeParse(raw)
  return parsed.success ? [parsed.data] : []
})

export function getCommunity(): CommunityMember[] {
  return members
}

/** Tags the community can help with (active offers) and needs help with (open needs). */
export function getTagVocabulary(): { offered: string[]; needed: string[] } {
  const offered = new Set<string>()
  const needed = new Set<string>()
  for (const member of members) {
    if (!member.profile.discoverable) continue
    for (const offer of member.offers) if (offer.status === 'active') offer.tags.forEach((t) => offered.add(t))
    for (const need of member.needs) if (need.status === 'open') need.tags.forEach((t) => needed.add(t))
  }
  return { offered: [...offered].sort(), needed: [...needed].sort() }
}

export function getCommunityStats() {
  const discoverable = members.filter((member) => member.profile.discoverable)
  return { members: discoverable.length, allDemo: members.every((member) => member.profile.isDemo) }
}
