import { findCandidates, type CandidateMatch } from './matching'
import { type Need, type Offer } from './schemas'
import {
  DirectoryMemberSchema,
  MemberFiltersSchema,
  memberMatchesFilters,
  type DemoCommunityRepository,
  type DirectoryMember,
  type MemberFiltersInput,
} from './members'

/**
 * In-memory demo repository. Accepts only rows explicitly marked as demo and
 * discoverable; anything else is rejected at construction so real records can
 * never leak into the guest experience through this path.
 */
export class LocalDemoRepository implements DemoCommunityRepository {
  readonly kind = 'demo' as const
  private readonly members: DirectoryMember[]

  constructor(rows: unknown[]) {
    if (!Array.isArray(rows)) throw new Error('Demo rows must be an array')
    this.members = rows.map((row, index) => {
      const parsed = DirectoryMemberSchema.safeParse(row)
      if (!parsed.success) {
        throw new Error(`Demo row ${index} failed validation: ${parsed.error.issues[0]?.message}`)
      }
      if (parsed.data.profile.isDemo !== true) {
        throw new Error(`Demo row ${index} is not marked as fictional demo data`)
      }
      return parsed.data
    })
  }

  async listMembers(filters?: MemberFiltersInput): Promise<DirectoryMember[]> {
    const valid = MemberFiltersSchema.parse(filters ?? {})
    return this.members.filter((member) => memberMatchesFilters(member, valid))
  }

  async getMember(id: string): Promise<DirectoryMember | null> {
    const found = this.members.find((member) => member.profile.id === id)
    if (!found || found.profile.discoverable === false) return null
    return found
  }

  async findMatches(need: Need, seekerOffers: Offer[] = [], limit = 5): Promise<CandidateMatch[]> {
    const eligible = this.members.filter((member) => member.profile.discoverable !== false)
    return findCandidates(need, eligible, { seekerOffers, limit })
  }
}
