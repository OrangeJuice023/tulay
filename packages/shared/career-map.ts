import { z } from 'zod'

/**
 * Landas-inspired career intelligence, scoped to what the Change-careers demo
 * needs. This is a curated adaptation, not the Landas catalog: 8 roles whose
 * skill lists were read from the Landas seed dataset
 * (`D:/Landas-AI/src/data/industryData.ts` teams: Customer Service
 * Representative, Back Office Associate, Junior Software Developer, Mobile App
 * Developer, Data Analyst, Data Engineer, Content Creator, Graphic Designer).
 * Skill-name normalization follows Landas `src/domain/skills.ts` alias rules
 * for the variants that appear here. No salaries, employers, probabilities or
 * hiring signals are carried over; every fact in this module is `curated`.
 *
 * Provenance discipline: role/skill facts are `curated`; anything the visitor
 * types is `user-provided` until they explicitly confirm it, when it becomes
 * `user-confirmed`. Nothing here is `source-backed` or `ai-generated`.
 */

export const CareerFactSourceSchema = z.enum([
  'user-provided',
  'curated',
  'user-confirmed',
  'ai-generated',
])
export type CareerFactSource = z.infer<typeof CareerFactSourceSchema>

export const CareerSkillKindSchema = z.enum(['hard', 'soft'])
export type CareerSkillKind = z.infer<typeof CareerSkillKindSchema>

export const CareerSkillSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: CareerSkillKindSchema,
})
export type CareerSkill = z.infer<typeof CareerSkillSchema>

export const CareerRoleSchema = z.object({
  id: z.string(),
  title: z.string(),
  blurb: z.string(),
  /** Landas industry this role belongs to (drives same-industry adjacency). */
  industry: z.string(),
  /** Landas department this role belongs to (drives same-field adjacency). */
  department: z.string(),
  skillIds: z.array(z.string()),
  /** Landas seed progression titles, for context only (not links). */
  progression: z.array(z.string()),
})
export type CareerRole = z.infer<typeof CareerRoleSchema>

export const CareerMapInputSchema = z.object({
  currentRoleLabel: z.string().trim().max(200).optional().default(''),
  targetLabel: z.string().trim().min(1).max(200),
  userSkillNames: z.array(z.string().trim().min(1).max(100)).max(30).default([]),
})
export type CareerMapInput = z.infer<typeof CareerMapInputSchema>

// ---------------------------------------------------------------------------
// Skill normalization (adapted subset of Landas alias/split rules)
// ---------------------------------------------------------------------------

const SKILL_ALIASES: Record<string, string> = {
  'excel (advanced)': 'Excel',
  'advanced excel': 'Excel',
  'ms excel': 'Excel',
  'english fluency': 'English communication',
  'analytical mindset': 'Analytical thinking',
  'practical problem-solving': 'Problem-solving',
  'problem solving': 'Problem-solving',
  'seo content': 'SEO',
  'seo (ahrefs)': 'SEO',
  'facebook ads': 'Meta Ads',
  'meta ads manager': 'Meta Ads',
  'premiere pro': 'Adobe Premiere',
  'video editing (adobe premiere)': 'Adobe Premiere',
  photoshop: 'Adobe Photoshop',
  illustrator: 'Adobe Illustrator',
  indesign: 'Adobe InDesign',
  'erp (sap/oracle)': 'ERP systems',
  'sap/oracle erp': 'ERP systems',
  'sap/oracle': 'ERP systems',
  erp: 'ERP systems',
  ga4: 'Google Analytics',
  postgres: 'SQL',
  mysql: 'SQL',
  js: 'JavaScript',
  ts: 'TypeScript',
}

const SKILL_SPLITS: Record<string, string[]> = {
  'aws/gcp/azure': ['AWS', 'GCP', 'Azure'],
  'rest/graphql': ['REST APIs', 'GraphQL'],
}

function slugifySkill(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function skillIdFor(name: string): string {
  return `cskill.${slugifySkill(name)}`
}

/** Canonical display names for one raw skill string (aliases + splits applied). */
export function canonicalSkillNames(raw: string): string[] {
  const key = raw.trim().toLowerCase()
  if (!key) return []
  const split = SKILL_SPLITS[key]
  if (split) return split
  return [SKILL_ALIASES[key] ?? raw.trim()]
}

// ---------------------------------------------------------------------------
// Curated roles (adapted from the Landas seed entries named above)
// ---------------------------------------------------------------------------

type RoleSeed = {
  id: string
  title: string
  blurb: string
  industry: string
  department: string
  hard: string[]
  soft: string[]
  progression: string[]
}

const ROLE_SEEDS: RoleSeed[] = [
  {
    id: 'landas.csr',
    title: 'Customer Service Representative',
    blurb: 'Voice, chat or email support for global accounts.',
    industry: 'BPO & Business Services',
    department: 'Customer Experience and Contact Center',
    hard: ['CRM tools', 'Ticketing systems', 'Typing speed', 'Product knowledge', 'Call handling'],
    soft: ['English communication', 'Empathy', 'Patience', 'Active listening'],
    progression: ['Senior CSR', 'Subject Matter Expert', 'Team Leader', 'Operations Manager'],
  },
  {
    id: 'landas.back-office-associate',
    title: 'Back Office Associate',
    blurb: 'Finance, HR or data operations for offshore clients.',
    industry: 'BPO & Business Services',
    department: 'Knowledge Process and Back Office',
    hard: ['ERP systems', 'Excel', 'Process documentation', 'Data analysis', 'Reconciliation'],
    soft: ['Analytical thinking', 'Accuracy', 'Adaptability', 'Cross-cultural communication'],
    progression: ['Senior Associate', 'Subject Matter Expert', 'Team Lead', 'Process Manager'],
  },
  {
    id: 'landas.junior-software-developer',
    title: 'Junior Software Developer',
    blurb: 'Writes, tests and debugs code with senior guidance.',
    industry: 'Technology',
    department: 'Software Development',
    hard: ['JavaScript', 'Python', 'Java', 'Git', 'REST APIs', 'SQL', 'React', 'Laravel'],
    soft: ['Problem-solving', 'Collaboration', 'Attention to detail', 'Continuous learning'],
    progression: ['Developer', 'Senior Developer', 'Tech Lead', 'Engineering Manager'],
  },
  {
    id: 'landas.mobile-app-developer',
    title: 'Mobile App Developer',
    blurb: 'Builds Android and iOS apps for consumers and banks.',
    industry: 'Technology',
    department: 'Software Development',
    hard: ['Flutter', 'React Native', 'Swift', 'Kotlin', 'REST APIs', 'GraphQL'],
    soft: ['UX awareness', 'Problem-solving', 'Adaptability', 'Communication'],
    progression: ['Senior Mobile Dev', 'Lead Mobile Engineer'],
  },
  {
    id: 'landas.data-analyst',
    title: 'Data Analyst',
    blurb: 'Turns datasets into business insights across industries.',
    industry: 'Technology',
    department: 'Data and Analytics',
    hard: ['Excel', 'SQL', 'Python', 'R', 'Tableau', 'Power BI', 'Google Analytics'],
    soft: ['Critical thinking', 'Storytelling', 'Communication', 'Attention to detail'],
    progression: ['Senior Analyst', 'Analytics Manager', 'Head of Data'],
  },
  {
    id: 'landas.data-engineer',
    title: 'Data Engineer',
    blurb: 'Builds the pipelines that analytics and AI run on.',
    industry: 'Technology',
    department: 'Data and Analytics',
    hard: ['Python', 'SQL', 'Apache Spark', 'Airflow', 'AWS', 'GCP', 'Azure', 'Kafka', 'dbt'],
    soft: ['Systems thinking', 'Collaboration', 'Documentation', 'Time management'],
    progression: ['Senior Data Engineer', 'Data Architect'],
  },
  {
    id: 'landas.graphic-designer',
    title: 'Graphic Designer',
    blurb: 'Visual assets for advertising, packaging and social.',
    industry: 'Media',
    department: 'Content Creation and Digital Media',
    hard: ['Adobe Photoshop', 'Adobe Illustrator', 'InDesign', 'Figma', 'Typography'],
    soft: ['Creativity', 'Attention to detail', 'Feedback receptiveness', 'Time management'],
    progression: ['Senior Designer', 'Art Director', 'Creative Director'],
  },
  {
    id: 'landas.content-creator',
    title: 'Content Creator',
    blurb: 'Video and graphic content for brand pages and campaigns.',
    industry: 'Media',
    department: 'Content Creation and Digital Media',
    hard: ['Canva', 'CapCut', 'Adobe Premiere', 'Meta Ads', 'SEO'],
    soft: ['Creativity', 'Trend awareness', 'Audience empathy', 'Consistency'],
    progression: ['Content Strategist', 'Social Media Manager', 'Digital Content Director'],
  },
]

const skillsById = new Map<string, CareerSkill>()
const rolesById = new Map<string, CareerRole>()

for (const seed of ROLE_SEEDS) {
  const skillIds: string[] = []
  const add = (name: string, kind: CareerSkillKind) => {
    const id = skillIdFor(name)
    if (!skillsById.has(id)) skillsById.set(id, { id, name, kind })
    if (!skillIds.includes(id)) skillIds.push(id)
  }
  for (const hard of seed.hard.flatMap(canonicalSkillNames)) add(hard, 'hard')
  for (const soft of seed.soft.flatMap(canonicalSkillNames)) add(soft, 'soft')
  rolesById.set(seed.id, {
    id: seed.id,
    title: seed.title,
    blurb: seed.blurb,
    industry: seed.industry,
    department: seed.department,
    skillIds,
    progression: seed.progression,
  })
}

export function listCareerRoles(): CareerRole[] {
  return [...rolesById.values()]
}

export function getCareerRole(id: string): CareerRole | null {
  return rolesById.get(id) ?? null
}

export function getCareerSkill(id: string): CareerSkill | null {
  return skillsById.get(id) ?? null
}

/** Best catalog role for a free-text title, or null when nothing fits. */
export function resolveCareerRole(label: string): CareerRole | null {
  const q = label.trim().toLowerCase()
  if (!q) return null
  const slug = slugifySkill(label)
  for (const role of rolesById.values()) {
    if (role.title.toLowerCase() === q || role.id === `landas.${slug}`) return role
  }
  let best: { role: CareerRole; score: number } | null = null
  for (const role of rolesById.values()) {
    const title = role.title.toLowerCase()
    let score = 0
    if (title.includes(q) && q.length >= 4) score = 0.8
    else {
      const qt = new Set(slug.split('-').filter((t) => t.length > 2))
      const tt = slugifySkill(title).split('-').filter((t) => t.length > 2)
      const hits = tt.filter((t) => qt.has(t)).length
      if (hits > 0 && qt.size > 0) score = 0.6 * (hits / Math.max(qt.size, tt.length))
    }
    if (score > (best?.score ?? 0)) best = { role, score }
  }
  return best && best.score >= 0.35 ? best.role : null
}

export function sharedSkillIds(a: CareerRole, b: CareerRole): string[] {
  const inB = new Set(b.skillIds)
  return a.skillIds.filter((id) => inB.has(id))
}

export type AdjacencyBasis = 'same-field' | 'same-industry' | 'shared-skills'

export function adjacencyBasis(a: CareerRole, b: CareerRole): AdjacencyBasis | null {
  if (a.id !== b.id && a.department === b.department) return 'same-field'
  if (a.industry === b.industry) return 'same-industry'
  if (sharedSkillIds(a, b).length >= 3) return 'shared-skills'
  return null
}

export function adjacentCareerRoles(id: string): Array<{
  role: CareerRole
  sharedSkillIds: string[]
  basis: AdjacencyBasis
}> {
  const role = getCareerRole(id)
  if (!role) return []
  return listCareerRoles()
    .filter((other) => other.id !== id)
    .map((other) => ({ role: other, sharedSkillIds: sharedSkillIds(role, other), basis: adjacencyBasis(role, other) }))
    .filter((entry): entry is { role: CareerRole; sharedSkillIds: string[]; basis: AdjacencyBasis } => entry.basis !== null)
    .sort((x, y) => y.sharedSkillIds.length - x.sharedSkillIds.length || (x.role.title < y.role.title ? -1 : 1))
}

export type SuggestedSkill = {
  skillId: string | null
  name: string
  kind: CareerSkillKind | null
  /** Where the suggestion came from; never `user-confirmed` until confirmed. */
  origin: 'current-role' | 'you-wrote'
  source: CareerFactSource
}

/**
 * Skills for the target role the visitor may already have: the overlap of the
 * target's catalog skills with the current role's skills plus recognized
 * user-typed skills. Suggested only; confirmation happens in the UI.
 */
export function transferableSkills(input: {
  currentRoleId: string | null
  targetRoleId: string
  userSkillNames: string[]
}): SuggestedSkill[] {
  const target = getCareerRole(input.targetRoleId)
  if (!target) return []
  const current = input.currentRoleId ? getCareerRole(input.currentRoleId) : null
  const currentIds = new Set(current?.skillIds ?? [])

  const userIds = new Map<string, string>()
  for (const raw of input.userSkillNames) {
    for (const canonical of canonicalSkillNames(raw)) {
      const id = skillIdFor(canonical)
      if (skillsById.has(id) && !userIds.has(id)) userIds.set(id, raw.trim())
    }
  }

  const out: SuggestedSkill[] = []
  for (const id of target.skillIds) {
    const skill = skillsById.get(id)
    if (!skill) continue
    if (currentIds.has(id)) {
      out.push({ skillId: id, name: skill.name, kind: skill.kind, origin: 'current-role', source: 'curated' })
    } else if (userIds.has(id)) {
      out.push({ skillId: id, name: skill.name, kind: skill.kind, origin: 'you-wrote', source: 'user-provided' })
    }
  }
  return out
}

/**
 * Target-role skills the visitor has not confirmed yet. Presented as
 * potential development areas, never as verified gaps.
 */
export function skillsToDevelop(input: { targetRoleId: string; confirmedSkillNames: string[] }): CareerSkill[] {
  const target = getCareerRole(input.targetRoleId)
  if (!target) return []
  const confirmed = new Set<string>()
  for (const raw of input.confirmedSkillNames) {
    for (const canonical of canonicalSkillNames(raw)) confirmed.add(skillIdFor(canonical))
  }
  return target.skillIds.flatMap((id) => (confirmed.has(id) ? [] : [skillsById.get(id)!])).filter(Boolean)
}

export const CareerDirectionSchema = z.object({
  roleId: z.string(),
  /** Skill display names the visitor confirmed they have. */
  confirmedSkills: z.array(z.string().trim().min(1).max(100)).max(40).default([]),
  /** Skill display names the visitor wants to develop. */
  developingSkills: z.array(z.string().trim().min(1).max(100)).max(40).default([]),
})
export type CareerDirection = z.infer<typeof CareerDirectionSchema>

export const CareerMapResultSchema = z.object({
  currentRole: CareerRoleSchema.nullable(),
  targetRole: CareerRoleSchema,
  adjacent: z.array(
    z.object({
      role: CareerRoleSchema,
      sharedSkillNames: z.array(z.string()),
      basis: z.enum(['same-field', 'same-industry', 'shared-skills']),
    }),
  ),
  transferable: z.array(
    z.object({
      skillId: z.string().nullable(),
      name: z.string(),
      kind: CareerSkillKindSchema.nullable(),
      origin: z.enum(['current-role', 'you-wrote']),
      source: CareerFactSourceSchema,
    }),
  ),
  toDevelop: z.array(CareerSkillSchema),
})
export type CareerMapResult = z.infer<typeof CareerMapResultSchema>
