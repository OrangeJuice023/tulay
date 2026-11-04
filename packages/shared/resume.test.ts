import { describe, expect, it } from 'vitest'
import {
  blankCertification,
  blankEducation,
  blankExperience,
  blankProject,
  createResume,
  ImproveResumeSectionContextSchema,
  moveEntry,
  ResumeSchema,
  ResumeSectionSchema,
  ResumeSuggestionSchema,
  touchResume,
} from './resume'

describe('resume contracts', () => {
  it('creates a minimal manual resume', () => {
    const resume = createResume({ id: 'r-1', fullName: 'Maria Santos' })
    expect(resume.fullName).toBe('Maria Santos')
    expect(resume.source).toBe('manual')
    expect(resume.experience).toEqual([])
    expect(resume.skills).toEqual([])
  })

  it('rejects an empty name', () => {
    expect(() => createResume({ id: 'r-1', fullName: '  ' })).toThrow()
  })

  it('caps skills and bullets', () => {
    const tooMany = { id: 'r-1', fullName: 'A', skills: Array.from({ length: 31 }, (_, i) => `s${i}`), updatedAt: new Date().toISOString() }
    expect(ResumeSchema.safeParse(tooMany).success).toBe(false)
    const bullets = { ...blankExperience(), bullets: Array.from({ length: 9 }, () => 'b') }
    expect(ResumeSchema.safeParse({ id: 'r-1', fullName: 'A', experience: [bullets], updatedAt: new Date().toISOString() }).success).toBe(false)
  })

  it('builds blank entries that validate', () => {
    const resume = createResume({ id: 'r-1', fullName: 'A' })
    const full = {
      ...resume,
      experience: [blankExperience()],
      education: [blankEducation()],
      projects: [blankProject()],
      certifications: [blankCertification()],
    }
    expect(ResumeSchema.safeParse(full).success).toBe(true)
  })

  it('reorders entries safely', () => {
    const entries = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    expect(moveEntry(entries, 'b', -1).map((e) => e.id)).toEqual(['b', 'a', 'c'])
    expect(moveEntry(entries, 'a', -1)).toEqual(entries)
    expect(moveEntry(entries, 'c', 1)).toEqual(entries)
    expect(moveEntry(entries, 'zzz', 1)).toEqual(entries)
  })

  it('touches updatedAt without changing content', () => {
    const resume = createResume({ id: 'r-1', fullName: 'A' })
    const before = resume.updatedAt
    const touched = touchResume({ ...resume, updatedAt: '2000-01-01T00:00:00.000Z' })
    expect(touched.fullName).toBe('A')
    expect(touched.updatedAt).not.toBe('2000-01-01T00:00:00.000Z')
    expect(Date.parse(touched.updatedAt)).toBeGreaterThanOrEqual(Date.parse(before))
  })
})

describe('resume AI contracts', () => {
  it('accepts the four improvable sections', () => {
    for (const section of ['summary', 'experience', 'skills', 'projects']) {
      expect(ResumeSectionSchema.safeParse(section).success).toBe(true)
    }
  })

  it('requires section text', () => {
    const parsed = ImproveResumeSectionContextSchema.safeParse({ section: 'summary', text: '  ' })
    expect(parsed.success).toBe(false)
  })

  it('requires a non-empty rewrite', () => {
    expect(ResumeSuggestionSchema.safeParse({ rewritten: '  ' }).success).toBe(false)
    const ok = ResumeSuggestionSchema.safeParse({
      rewritten: 'Support specialist with 3 years of client-facing experience.',
      improvements: ['Lead with years of experience.'],
      missingInfo: ['Which tools did you use day to day?'],
    })
    expect(ok.success).toBe(true)
  })
})
