import { z } from 'zod'

/**
 * Resume Studio contracts. Resumes are built from user-provided facts only;
 * AI may rephrase and suggest, but never invents employers, degrees,
 * certifications, skills, accomplishments, or numbers. Unknowns stay as
 * bracketed placeholders the owner fills in.
 */

export const ResumeExperienceSchema = z.object({
  id: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(160),
  company: z.string().trim().min(1).max(160),
  location: z.string().trim().max(200).default(''),
  startDate: z.string().trim().max(40).default(''),
  endDate: z.string().trim().max(40).default(''),
  current: z.boolean().default(false),
  bullets: z.array(z.string().trim().min(1).max(500)).max(8).default([]),
})
export type ResumeExperience = z.infer<typeof ResumeExperienceSchema>

export const ResumeEducationSchema = z.object({
  id: z.string().trim().min(1).max(100),
  school: z.string().trim().min(1).max(200),
  degree: z.string().trim().max(200).default(''),
  field: z.string().trim().max(200).default(''),
  year: z.string().trim().max(40).default(''),
})
export type ResumeEducation = z.infer<typeof ResumeEducationSchema>

export const ResumeProjectSchema = z.object({
  id: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).default(''),
  link: z.string().trim().max(500).default(''),
  bullets: z.array(z.string().trim().min(1).max(500)).max(8).default([]),
})
export type ResumeProject = z.infer<typeof ResumeProjectSchema>

export const ResumeCertificationSchema = z.object({
  id: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(200),
  issuer: z.string().trim().max(200).default(''),
  year: z.string().trim().max(40).default(''),
})
export type ResumeCertification = z.infer<typeof ResumeCertificationSchema>

export const ResumeSourceSchema = z.enum(['manual', 'ai-assisted'])
export type ResumeSource = z.infer<typeof ResumeSourceSchema>

export const ResumeSchema = z.object({
  id: z.string().trim().min(1).max(100),
  fullName: z.string().trim().min(1).max(160),
  headline: z.string().trim().max(200).default(''),
  email: z.string().trim().max(320).default(''),
  phone: z.string().trim().max(60).default(''),
  location: z.string().trim().max(200).default(''),
  summary: z.string().trim().max(2000).default(''),
  experience: z.array(ResumeExperienceSchema).max(15).default([]),
  education: z.array(ResumeEducationSchema).max(10).default([]),
  skills: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  projects: z.array(ResumeProjectSchema).max(12).default([]),
  certifications: z.array(ResumeCertificationSchema).max(12).default([]),
  targetRole: z.string().trim().max(200).default(''),
  targetJobDescription: z.string().trim().max(8000).default(''),
  source: ResumeSourceSchema.default('manual'),
  updatedAt: z.string().datetime({ offset: true }),
})
export type Resume = z.infer<typeof ResumeSchema>

export const ResumeSectionSchema = z.enum(['summary', 'experience', 'skills', 'projects'])
export type ResumeSection = z.infer<typeof ResumeSectionSchema>

export const ImproveResumeSectionContextSchema = z.object({
  section: ResumeSectionSchema,
  text: z.string().trim().min(1).max(4000),
  targetRole: z.string().trim().max(200).default(''),
  jobDescription: z.string().trim().max(8000).default(''),
})
export type ImproveResumeSectionContext = z.infer<typeof ImproveResumeSectionContextSchema>
export type ImproveResumeSectionContextInput = z.input<typeof ImproveResumeSectionContextSchema>

export const ResumeSuggestionSchema = z.object({
  rewritten: z.string().trim().min(1).max(4000),
  improvements: z.array(z.string().trim().min(1).max(500)).max(6).default([]),
  missingInfo: z.array(z.string().trim().min(1).max(500)).max(6).default([]),
})
export type ResumeSuggestion = z.infer<typeof ResumeSuggestionSchema>

function entryId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`
}

export function createResume(input: { id: string; fullName: string }): Resume {
  return ResumeSchema.parse({
    id: input.id,
    fullName: input.fullName,
    headline: '',
    email: '',
    phone: '',
    location: '',
    summary: '',
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
    targetRole: '',
    targetJobDescription: '',
    source: 'manual',
    updatedAt: new Date().toISOString(),
  })
}

export function blankExperience(): ResumeExperience {
  return ResumeExperienceSchema.parse({
    id: entryId('exp'),
    title: 'Role title',
    company: 'Company',
    location: '',
    startDate: '',
    endDate: '',
    current: false,
    bullets: [],
  })
}

export function blankEducation(): ResumeEducation {
  return ResumeEducationSchema.parse({
    id: entryId('edu'),
    school: 'School or university',
    degree: '',
    field: '',
    year: '',
  })
}

export function blankProject(): ResumeProject {
  return ResumeProjectSchema.parse({
    id: entryId('proj'),
    name: 'Project name',
    description: '',
    link: '',
    bullets: [],
  })
}

export function blankCertification(): ResumeCertification {
  return ResumeCertificationSchema.parse({
    id: entryId('cert'),
    name: 'Certification name',
    issuer: '',
    year: '',
  })
}

function moveEntry<T extends { id: string }>(entries: T[], entryIdValue: string, direction: -1 | 1): T[] {
  const from = entries.findIndex((entry) => entry.id === entryIdValue)
  const to = from + direction
  if (from < 0 || to < 0 || to >= entries.length) return entries
  const next = [...entries]
  const [moved] = next.splice(from, 1)
  if (!moved) return entries
  next.splice(to, 0, moved)
  return next
}

export function touchResume(resume: Resume): Resume {
  return { ...resume, updatedAt: new Date().toISOString() }
}

export { moveEntry }
