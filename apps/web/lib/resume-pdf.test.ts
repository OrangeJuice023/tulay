import { describe, expect, it } from 'vitest'
import { createResume } from '@tulay/shared'
import { resumeToPdfBuffer, safeResumeFileName } from './resume-pdf'

function verificationResume() {
  return {
    ...createResume({ id: crypto.randomUUID(), fullName: 'Maria Santos' }),
    headline: 'Customer support specialist',
    email: 'maria@example.com',
    location: 'Manila',
    summary: 'Three years of client-facing support work.',
    experience: [
      {
        id: 'e1',
        title: 'Support agent',
        company: 'Acme Corp',
        location: '',
        startDate: '2023',
        endDate: '',
        current: true,
        bullets: ['Resolved tickets across email and chat'],
      },
    ],
    skills: ['email support', 'chat support'],
    education: [{ id: 'd1', school: 'State University', degree: 'BS', field: 'Psychology', year: '2022' }],
    certifications: [{ id: 'c1', name: 'Support Fundamentals', issuer: 'Acme Academy', year: '2024' }],
  }
}

describe('resume pdf export', () => {
  it('produces a valid PDF containing the edited resume content', async () => {
    const buffer = await resumeToPdfBuffer(verificationResume())
    expect(buffer.subarray(0, 4).toString('utf8')).toBe('%PDF')
    const text = buffer.toString('latin1')
    expect(text).toContain('Maria Santos')
    expect(text).toContain('Customer support specialist')
    expect(text).toContain('Three years of client-facing support work.')
    expect(text).toContain('Support agent')
    expect(text).toContain('Acme Corp')
    expect(text).toContain('Resolved tickets across email and chat')
    expect(text).toContain('email support')
    expect(text).toContain('State University')
    expect(text).toContain('Support Fundamentals')
    expect(text).toContain('EXPERIENCE')
    expect(text).toContain('Built with Tulay')
  })

  it('exports a minimal resume without empty sections', async () => {
    const buffer = await resumeToPdfBuffer(createResume({ id: crypto.randomUUID(), fullName: 'Alex Reyes' }))
    expect(buffer.subarray(0, 4).toString('utf8')).toBe('%PDF')
    const text = buffer.toString('latin1')
    expect(text).toContain('Alex Reyes')
    expect(text).not.toContain('EXPERIENCE')
    expect(text).not.toContain('SKILLS')
  })

  it('sanitizes filenames', () => {
    expect(safeResumeFileName('Maria Santos-Jr.')).toBe('maria-santos-jr')
    expect(safeResumeFileName('   ')).toBe('tulay-resume')
  })
})
