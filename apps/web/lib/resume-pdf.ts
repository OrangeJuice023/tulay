import { jsPDF } from 'jspdf'
import type { Resume } from '@tulay/shared'

/**
 * Real PDF export for Resume Studio. Single-column, standard-font layout with
 * real selectable text (no images, no tables) so it stays friendly to
 * applicant-tracking parsers. The UI must not claim guaranteed ATS
 * compatibility.
 */

const INK: [number, number, number] = [31, 42, 36]
const FOREST: [number, number, number] = [23, 107, 70]
const MUTED: [number, number, number] = [91, 107, 98]
const PAGE_WIDTH = 210
const MARGIN = 18
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const BOTTOM = 278

export function safeResumeFileName(fullName: string): string {
  const cleaned = fullName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return cleaned || 'tulay-resume'
}

function dateRange(startDate: string, endDate: string, current: boolean): string {
  const start = startDate.trim()
  const end = current ? 'Present' : endDate.trim()
  if (start && end) return `${start} – ${end}`
  return start || end
}

export function buildResumePdf(resume: Resume): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = 22

  const ensureSpace = (needed: number): void => {
    if (y + needed > BOTTOM) {
      doc.addPage()
      y = 22
    }
  }

  const heading = (text: string): void => {
    ensureSpace(16)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...FOREST)
    doc.text(text.toUpperCase(), MARGIN, y)
    y += 2.5
    doc.setDrawColor(...FOREST)
    doc.setLineWidth(0.5)
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y)
    y += 6
  }

  const paragraph = (text: string, opts: { size?: number; bold?: boolean; muted?: boolean; indent?: number } = {}): void => {
    const lines = doc.splitTextToSize(text, CONTENT_WIDTH - (opts.indent ?? 0)) as string[]
    ensureSpace(lines.length * 5 + 1)
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
    doc.setFontSize(opts.size ?? 10)
    doc.setTextColor(...(opts.muted ? MUTED : INK))
    doc.text(lines, MARGIN + (opts.indent ?? 0), y)
    y += lines.length * 5 + 1
  }

  // Header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(...INK)
  doc.text(resume.fullName, MARGIN, y)
  y += 7
  if (resume.headline.trim()) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(12)
    doc.setTextColor(...FOREST)
    doc.text(resume.headline.trim(), MARGIN, y)
    y += 6
  }
  const contact = [resume.email.trim(), resume.phone.trim(), resume.location.trim()].filter(Boolean)
  if (contact.length > 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...MUTED)
    doc.text(contact.join('  ·  '), MARGIN, y)
    y += 8
  }

  // Summary
  if (resume.summary.trim()) {
    heading('Summary')
    paragraph(resume.summary.trim())
    y += 3
  }

  // Experience
  if (resume.experience.length > 0) {
    heading('Experience')
    for (const entry of resume.experience) {
      const titleLine = `${entry.title} — ${entry.company}`
      paragraph(titleLine, { bold: true })
      const meta = [entry.location.trim(), dateRange(entry.startDate, entry.endDate, entry.current)].filter(Boolean)
      if (meta.length > 0) paragraph(meta.join('  ·  '), { muted: true })
      for (const bullet of entry.bullets) paragraph(`•  ${bullet}`, { indent: 4 })
      y += 2
    }
    y += 1
  }

  // Projects
  if (resume.projects.length > 0) {
    heading('Projects')
    for (const project of resume.projects) {
      paragraph(project.name, { bold: true })
      if (project.description.trim()) paragraph(project.description.trim())
      for (const bullet of project.bullets) paragraph(`•  ${bullet}`, { indent: 4 })
      if (project.link.trim()) paragraph(project.link.trim(), { muted: true })
      y += 2
    }
    y += 1
  }

  // Skills
  if (resume.skills.length > 0) {
    heading('Skills')
    paragraph(resume.skills.join(', '))
    y += 3
  }

  // Education
  if (resume.education.length > 0) {
    heading('Education')
    for (const entry of resume.education) {
      const degree = [entry.degree.trim(), entry.field.trim()].filter(Boolean).join(', ')
      paragraph(degree ? `${entry.school} — ${degree}` : entry.school, { bold: true })
      if (entry.year.trim()) paragraph(entry.year.trim(), { muted: true })
      y += 1
    }
    y += 2
  }

  // Certifications
  if (resume.certifications.length > 0) {
    heading('Certifications')
    for (const cert of resume.certifications) {
      const detail = [cert.issuer.trim(), cert.year.trim()].filter(Boolean).join(', ')
      paragraph(detail ? `${cert.name} — ${detail}` : cert.name)
    }
    y += 2
  }

  const pages = doc.getNumberOfPages()
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    doc.text('Built with Tulay', MARGIN, 292)
  }
  return doc
}

/** Node/edge buffer for tests and server use. */
export async function resumeToPdfBuffer(resume: Resume): Promise<Buffer> {
  const doc = buildResumePdf(resume)
  const output = doc.output('arraybuffer') as ArrayBuffer
  return Buffer.from(output)
}

/** Browser download of the current resume. */
export function downloadResumePdf(resume: Resume): void {
  const doc = buildResumePdf(resume)
  doc.save(`${safeResumeFileName(resume.fullName)}-resume.pdf`)
}
