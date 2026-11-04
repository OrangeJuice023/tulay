import { Resume, ResumeSchema } from '@tulay/shared'

/**
 * Guest resume storage: localStorage only, honestly labelled in the UI as
 * "saved in this browser only". Signed-in users persist to Supabase instead.
 */

const KEY = 'tulay.resumes.v1'

export function loadLocalResumes(): Resume[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const resumes: Resume[] = []
    for (const entry of parsed) {
      const valid = ResumeSchema.safeParse(entry)
      if (valid.success) resumes.push(valid.data)
    }
    return resumes.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
  } catch {
    return []
  }
}

export function saveLocalResumes(resumes: Resume[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(resumes.slice(0, 20)))
  } catch {
    // Private-mode quota: the editor keeps working in memory.
  }
}
