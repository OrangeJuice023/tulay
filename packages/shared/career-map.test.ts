import { describe, expect, it } from 'vitest'
import {
  adjacentCareerRoles,
  canonicalSkillNames,
  getCareerRole,
  listCareerRoles,
  resolveCareerRole,
  sharedSkillIds,
  skillsToDevelop,
  transferableSkills,
} from './career-map'

describe('career catalog', () => {
  it('lists curated roles grounded in the Landas seed entries', () => {
    const roles = listCareerRoles()
    expect(roles.length).toBeGreaterThanOrEqual(8)
    expect(roles.map((r) => r.title)).toContain('Data Analyst')
    expect(roles.map((r) => r.title)).toContain('Customer Service Representative')
  })

  it('resolves exact and fuzzy role titles, and null for unknown work', () => {
    expect(resolveCareerRole('Data Analyst')?.id).toBe('landas.data-analyst')
    expect(resolveCareerRole('data analyst')?.id).toBe('landas.data-analyst')
    expect(resolveCareerRole('software developer')?.id).toBe('landas.junior-software-developer')
    expect(resolveCareerRole('astronaut') ?? null).toBeNull()
  })

  it('derives shared skills from catalog data, e.g. developer to analyst', () => {
    const dev = getCareerRole('landas.junior-software-developer')!
    const analyst = getCareerRole('landas.data-analyst')!
    const shared = sharedSkillIds(dev, analyst).map((id) => id.replace(/^cskill\./, ''))
    expect(shared).toContain('python')
    expect(shared).toContain('sql')
  })
})

describe('adjacent roles', () => {
  it('suggests the data engineer next to the data analyst (same Landas field)', () => {
    const adjacent = adjacentCareerRoles('landas.data-analyst')
    const engineer = adjacent.find((a) => a.role.id === 'landas.data-engineer')
    expect(engineer?.basis).toBe('same-field')
    expect(engineer!.sharedSkillIds.length).toBeGreaterThanOrEqual(2)
  })

  it('connects BPO roles by industry but not to unrelated tech roles', () => {
    const adjacent = adjacentCareerRoles('landas.csr')
    expect(adjacent.some((a) => a.role.id === 'landas.back-office-associate')).toBe(true)
    expect(adjacent.some((a) => a.role.id === 'landas.data-analyst')).toBe(false)
  })
})

describe('transferable and to-develop skills', () => {
  it('recognizes user-typed skills via Landas alias rules', () => {
    expect(canonicalSkillNames('Advanced Excel')).toEqual(['Excel'])
    expect(canonicalSkillNames('AWS/GCP/Azure')).toEqual(['AWS', 'GCP', 'Azure'])
  })

  it('suggests target skills the visitor already has, marked by origin', () => {
    const result = transferableSkills({
      currentRoleId: 'landas.csr',
      targetRoleId: 'landas.data-analyst',
      userSkillNames: ['Excel', 'SQL', 'communication'],
    })
    const names = result.map((s) => s.name)
    expect(names).toContain('Excel')
    expect(names).toContain('SQL')
    expect(result.every((s) => s.origin === 'you-wrote' && s.source === 'user-provided')).toBe(true)
  })

  it('credits current-role skills as curated transferable skills', () => {
    const result = transferableSkills({
      currentRoleId: 'landas.back-office-associate',
      targetRoleId: 'landas.data-analyst',
      userSkillNames: [],
    })
    const excel = result.find((s) => s.name === 'Excel')
    expect(excel?.origin).toBe('current-role')
    expect(excel?.source).toBe('curated')
  })

  it('lists unconfirmed target skills as development areas, never as gaps', () => {
    const remaining = skillsToDevelop({ targetRoleId: 'landas.data-analyst', confirmedSkillNames: ['Excel', 'SQL'] })
    const names = remaining.map((s) => s.name)
    expect(names).not.toContain('Excel')
    expect(names).not.toContain('SQL')
    expect(names).toContain('Python')
  })
})
