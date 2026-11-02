import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import demoCommunity from '../../data/fixtures/demo-community.json'
import { CommunityMember, CommunityMemberSchema, findCandidates } from './index'

const DemoCommunitySchema = z.object({
  members: z.array(CommunityMemberSchema).min(8),
})

function loadMembers(): CommunityMember[] {
  return DemoCommunitySchema.parse(demoCommunity).members
}

function memberNamed(members: CommunityMember[], displayName: string): CommunityMember {
  const found = members.find((member) => member.profile.displayName === displayName)
  if (!found) throw new Error(`Fixture member missing: ${displayName}`)
  return found
}

describe('demo-community.json', () => {
  it('parses as at least eight valid community members', () => {
    const members = loadMembers()
    expect(members.length).toBeGreaterThanOrEqual(8)
  })

  it('holds fourteen members including the founder path', () => {
    expect(loadMembers()).toHaveLength(14)
  })

  it('marks every member as synthetic demo data', () => {
    for (const member of loadMembers()) {
      expect(member.profile.isDemo).toBe(true)
      if (member.profile.contactMethod) {
        expect(member.profile.contactMethod).toContain('example.com')
      }
    }
  })

  it('keeps every need and offer owned by its own member', () => {
    for (const member of loadMembers()) {
      for (const need of member.needs) {
        expect(need.profileId).toBe(member.profile.id)
      }
      for (const offer of member.offers) {
        expect(offer.profileId).toBe(member.profile.id)
      }
    }
  })
})

describe('demo dataset example matches', () => {
  it('matches an analytics portfolio need with an analytics freelancer', () => {
    const members = loadMembers()
    const bianca = memberNamed(members, 'Bianca Torres')
    const analyticsNeed = bianca.needs.find((need) => need.tags.includes('data-analytics'))
    if (!analyticsNeed) throw new Error('Bianca analytics need missing')
    const matches = findCandidates(analyticsNeed, members, { seekerOffers: bianca.offers })
    expect(matches.length).toBeGreaterThan(0)
    expect(matches[0]?.profile.displayName).toBe('Rafael Aquino')
    expect(matches[0]?.sharedTags).toContain('data-analytics')
    expect(matches[0]?.sharedTags).toContain('python')
    expect(matches[0]?.reciprocal).toBe(true)
  })

  it('never returns the seeker themself or non-discoverable members', () => {
    const members = loadMembers()
    const bianca = memberNamed(members, 'Bianca Torres')
    const analyticsNeed = bianca.needs.find((need) => need.tags.includes('data-analytics'))
    if (!analyticsNeed) throw new Error('Bianca analytics need missing')
    const matches = findCandidates(analyticsNeed, members, { seekerOffers: bianca.offers })
    const names = matches.map((match) => match.profile.displayName)
    expect(names).not.toContain('Bianca Torres')
    expect(names).not.toContain('Nadia Cruz')
  })

  it('flags the Liza/Paolo reciprocal pair both ways', () => {
    const members = loadMembers()
    const liza = memberNamed(members, 'Ate Liza Ramos')
    const paolo = memberNamed(members, 'Paolo Gutierrez')
    const lizaVideoNeed = liza.needs.find((need) => need.tags.includes('video-editing'))
    const paoloPricingNeed = paolo.needs.find((need) => need.tags.includes('pricing'))
    if (!lizaVideoNeed || !paoloPricingNeed) throw new Error('Reciprocal needs missing')

    const forLiza = findCandidates(lizaVideoNeed, members, { seekerOffers: liza.offers })
    const paoloMatch = forLiza.find((match) => match.profile.displayName === 'Paolo Gutierrez')
    expect(paoloMatch?.reciprocal).toBe(true)

    const forPaolo = findCandidates(paoloPricingNeed, members, { seekerOffers: paolo.offers })
    const lizaMatch = forPaolo.find((match) => match.profile.displayName === 'Ate Liza Ramos')
    expect(lizaMatch?.reciprocal).toBe(true)
  })

  it('flags the Sofia/Marco reciprocal pair', () => {
    const members = loadMembers()
    const sofia = memberNamed(members, 'Sofia Lim')
    const mentorshipNeed = sofia.needs.find((need) => need.tags.includes('mentoring'))
    if (!mentorshipNeed) throw new Error('Sofia mentorship need missing')
    const matches = findCandidates(mentorshipNeed, members, { seekerOffers: sofia.offers })
    expect(matches[0]?.profile.displayName).toBe('Marco Reyes')
    expect(matches[0]?.reciprocal).toBe(true)
  })

  it('still matches a career shifter with a peer portfolio review', () => {
    const members = loadMembers()
    const mara = memberNamed(members, 'Mara Santos')
    const portfolioNeed = mara.needs.find((need) => need.tags.includes('portfolio-review'))
    if (!portfolioNeed) throw new Error('Mara portfolio need missing')
    const matches = findCandidates(portfolioNeed, members, { seekerOffers: mara.offers })
    expect(matches[0]?.profile.displayName).toBe('Bianca Torres')
  })
})

describe('demo dataset founder path', () => {
  it('matches a builder seeking a co-founder with a sales co-founder, reciprocally', () => {
    const members = loadMembers()
    const diego = memberNamed(members, 'Diego Fernandez')
    const katrina = memberNamed(members, 'Katrina Uy')
    const cofounderNeed = diego.needs.find((need) => need.tags.includes('sales'))
    const technicalNeed = katrina.needs.find((need) => need.tags.includes('mvp-building'))
    if (!cofounderNeed || !technicalNeed) throw new Error('Co-founder needs missing')

    const forDiego = findCandidates(cofounderNeed, members, { seekerOffers: diego.offers })
    expect(forDiego[0]?.profile.displayName).toBe('Katrina Uy')
    expect(forDiego[0]?.reciprocal).toBe(true)

    const forKatrina = findCandidates(technicalNeed, members, { seekerOffers: katrina.offers })
    expect(forKatrina[0]?.profile.displayName).toBe('Diego Fernandez')
    expect(forKatrina[0]?.reciprocal).toBe(true)
  })

  it('matches a pitch-feedback need with an experienced founder, one way', () => {
    const members = loadMembers()
    const diego = memberNamed(members, 'Diego Fernandez')
    const pitchNeed = diego.needs.find((need) => need.tags.includes('pitch-feedback'))
    if (!pitchNeed) throw new Error('Diego pitch need missing')
    const matches = findCandidates(pitchNeed, members, { seekerOffers: diego.offers })
    expect(matches[0]?.profile.displayName).toBe('Enrico Salazar')
    expect(matches[0]?.reciprocal).toBe(false)
  })

  it('matches an early-users need with a domain expert', () => {
    const members = loadMembers()
    const diego = memberNamed(members, 'Diego Fernandez')
    const usersNeed = diego.needs.find((need) => need.tags.includes('user-interviews'))
    if (!usersNeed) throw new Error('Diego early-users need missing')
    const matches = findCandidates(usersNeed, members)
    expect(matches[0]?.profile.displayName).toBe('Grace Ocampo')
  })

  it('connects the founder path with the existing community', () => {
    const members = loadMembers()
    const grace = memberNamed(members, 'Grace Ocampo')
    const bookkeepingNeed = grace.needs.find((need) => need.tags.includes('bookkeeping'))
    if (!bookkeepingNeed) throw new Error('Grace bookkeeping need missing')
    const matches = findCandidates(bookkeepingNeed, members, { seekerOffers: grace.offers })
    expect(matches[0]?.profile.displayName).toBe('Bianca Torres')
  })

  it('returns an honest empty result when nobody can help yet', () => {
    const members = loadMembers()
    const enrico = memberNamed(members, 'Enrico Salazar')
    const advisorNeed = enrico.needs.find((need) => need.tags.includes('technical-advisor'))
    if (!advisorNeed) throw new Error('Enrico advisor need missing')
    expect(findCandidates(advisorNeed, members, { seekerOffers: enrico.offers })).toEqual([])
  })

  it('excludes the seeker and non-discoverable members from founder matches', () => {
    const members = loadMembers()
    const diego = memberNamed(members, 'Diego Fernandez')
    const cofounderNeed = diego.needs.find((need) => need.tags.includes('sales'))
    if (!cofounderNeed) throw new Error('Diego co-founder need missing')
    const matches = findCandidates(cofounderNeed, members, { seekerOffers: diego.offers })
    const names = matches.map((match) => match.profile.displayName)
    expect(names).not.toContain('Diego Fernandez')
    expect(names).not.toContain('Nadia Cruz')
  })
})
