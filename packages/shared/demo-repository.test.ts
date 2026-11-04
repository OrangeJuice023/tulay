import demoDirectory from '../../data/fixtures/demo-directory.json'
import { describe, expect, it } from 'vitest'
import { LocalDemoRepository } from './demo-repository'
import { DirectoryMemberSchema } from './members'

const DEMO_A = {
  profile: {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    displayName: 'Demo Ana',
    careerGoal: 'Move into UX design',
    discoverable: true,
    isDemo: true,
    primaryStudio: 'career',
    interests: ['ux-design'],
  },
  offers: [
    {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      profileId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      description: 'Interview practice sessions',
      tags: ['interview-practice'],
      status: 'active',
    },
  ],
  needs: [
    {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
      profileId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      description: 'Portfolio review from a designer',
      tags: ['portfolio-review'],
      status: 'open',
    },
  ],
}

const DEMO_B = {
  profile: {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    displayName: 'Demo Ben',
    careerGoal: 'Find freelance clients',
    discoverable: true,
    isDemo: true,
    primaryStudio: 'freelance',
    interests: ['pricing'],
  },
  offers: [
    {
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
      profileId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      description: 'Portfolio reviews for career changers',
      tags: ['portfolio-review'],
      status: 'active',
    },
  ],
  needs: [],
}

const REAL_MEMBER = {
  profile: {
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    displayName: 'Real Person',
    careerGoal: 'A real goal',
    discoverable: true,
    isDemo: false,
  },
  offers: [],
  needs: [],
}

const HIDDEN_DEMO = {
  profile: {
    id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    displayName: 'Hidden Demo',
    careerGoal: 'Staying private',
    discoverable: false,
    isDemo: true,
  },
  offers: [],
  needs: [],
}

describe('LocalDemoRepository', () => {
  it('lists only discoverable demo members and filters by studio, skill, and query', async () => {
    const repo = new LocalDemoRepository([DEMO_A, DEMO_B, HIDDEN_DEMO])
    expect((await repo.listMembers()).map((m) => m.profile.displayName).sort()).toEqual([
      'Demo Ana',
      'Demo Ben',
    ])
    expect((await repo.listMembers({ studio: 'career' })).map((m) => m.profile.displayName)).toEqual([
      'Demo Ana',
    ])
    expect(
      (await repo.listMembers({ skill: 'pricing' })).map((m) => m.profile.displayName),
    ).toEqual(['Demo Ben'])
    expect(
      (await repo.listMembers({ query: 'UX design' })).map((m) => m.profile.displayName),
    ).toEqual(['Demo Ana'])
    expect(await repo.listMembers({ query: 'no such person here' })).toEqual([])
  })

  it('resolves members by id and hides non-discoverable profiles', async () => {
    const repo = new LocalDemoRepository([DEMO_A, HIDDEN_DEMO])
    expect((await repo.getMember('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'))?.profile.displayName).toBe(
      'Demo Ana',
    )
    expect(await repo.getMember('dddddddd-dddd-4ddd-8ddd-dddddddddddd')).toBeNull()
    expect(await repo.getMember('00000000-0000-4000-8000-000000000000')).toBeNull()
  })

  it('refuses real (non-demo) rows at construction', () => {
    expect(() => new LocalDemoRepository([DEMO_A, REAL_MEMBER])).toThrow(/fictional demo data/)
  })

  it('matches deterministically inside the demo dataset only', async () => {
    const repo = new LocalDemoRepository([DEMO_A, DEMO_B])
    const matches = await repo.findMatches(
      {
        profileId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        description: 'Portfolio review from a designer',
        tags: ['portfolio-review'],
        status: 'open',
        aiSuggested: false,
      },
      [],
      5,
    )
    expect(matches.map((m) => m.profile.displayName)).toEqual(['Demo Ben'])
    expect(matches[0]?.sharedTags).toContain('portfolio-review')
    expect(matches[0]?.reasons.length).toBeGreaterThan(0)
  })

  it('validates the shipped demo-directory fixture: 12 members, 4 per studio', () => {
    const members = (demoDirectory as unknown as { members: unknown[] }).members
    expect(members).toHaveLength(12)
    const parsed = members.map((row) => DirectoryMemberSchema.parse(row))
    for (const studio of ['career', 'freelance', 'venture'] as const) {
      expect(parsed.filter((m) => m.profile.primaryStudio === studio)).toHaveLength(4)
    }
    expect(parsed.every((m) => m.profile.isDemo && m.profile.discoverable)).toBe(true)
    expect(new Set(parsed.map((m) => m.profile.id)).size).toBe(12)
  })
})
