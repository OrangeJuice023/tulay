'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Resume,
  ResumeCertification,
  ResumeEducation,
  ResumeExperience,
  ResumeProject,
  ResumeSection,
  ResumeSuggestion,
  ResumeSuggestionSchema,
  blankCertification,
  blankEducation,
  blankExperience,
  blankProject,
  createResume,
  moveEntry,
  touchResume,
} from '@tulay/shared'
import { Arko } from '@/components/Arko'
import { Button, LinkButton, Notice, TextAreaField, TextField } from '@/components/ui'
import { downloadResumePdf } from '@/lib/resume-pdf'
import { loadLocalResumes, saveLocalResumes } from '@/lib/resume-store'
import { deleteResumeAction, saveResumeAction } from './actions'
import { improveSectionAction } from './ai-actions'

type SaveState = { status: 'idle' | 'saving' | 'saved' | 'error'; at?: string; error?: string }
type AiTarget = { section: ResumeSection; entryId?: string }
type ProfileSeed = { displayName: string; headline: string; situation: string; goal: string }

const SECTION_LABELS: Record<ResumeSection, string> = {
  summary: 'summary',
  experience: 'experience bullets',
  skills: 'skills list',
  projects: 'project description',
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  } catch {
    return iso
  }
}

export function ResumeStudio({
  mode,
  initial,
  profileSeed,
}: {
  mode: 'authed' | 'demo'
  initial: Resume[]
  profileSeed: ProfileSeed | null
}) {
  const [resumes, setResumes] = useState<Resume[]>(initial)
  const [activeId, setActiveId] = useState<string | null>(initial[0]?.id ?? null)
  const [dirty, setDirty] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>({ status: 'idle' })
  const [showNew, setShowNew] = useState(initial.length === 0)
  const [newName, setNewName] = useState('')
  const [seedFromProfile, setSeedFromProfile] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aiNote, setAiNote] = useState<string | null>(null)
  const [aiWorking, setAiWorking] = useState(false)
  const [suggestion, setSuggestion] = useState<{
    target: AiTarget
    text: ResumeSuggestion
    source: 'live' | 'demo'
  } | null>(null)
  const [skillDraft, setSkillDraft] = useState('')

  // Guests hydrate from this browser's storage; the server sent nothing.
  // Mount-only external-store sync (reading localStorage during render would
  // mismatch SSR), so the set-state-in-effect rule does not apply here.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- mount-only localStorage hydration */
    if (mode !== 'demo') return
    const local = loadLocalResumes()
    if (local.length > 0) {
      setResumes(local)
      setActiveId(local[0]?.id ?? null)
      setShowNew(false)
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [mode])

  const active = resumes.find((resume) => resume.id === activeId) ?? null

  function touch(next: Resume[]) {
    setResumes(next)
    setDirty(true)
  }

  function mutateActive(mutator: (resume: Resume) => Resume) {
    if (!active) return
    touch(resumes.map((resume) => (resume.id === active.id ? touchResume(mutator(resume)) : resume)))
  }

  async function persist(next: Resume[], targetId: string): Promise<boolean> {
    const target = next.find((resume) => resume.id === targetId)
    if (!target) return false
    if (mode === 'demo') {
      saveLocalResumes(next)
      setSaveState({ status: 'saved', at: new Date().toISOString() })
      setDirty(false)
      return true
    }
    setSaveState({ status: 'saving' })
    try {
      const result = await saveResumeAction(target)
      if (!result.ok) {
        setSaveState({ status: 'error', error: result.error })
        return false
      }
      setResumes((current) => current.map((resume) => (resume.id === targetId ? result.data : resume)))
      setSaveState({ status: 'saved', at: result.data.updatedAt })
      setDirty(false)
      return true
    } catch {
      setSaveState({ status: 'error', error: 'Could not save this resume. Try again.' })
      return false
    }
  }

  async function saveActive() {
    if (!active || saveState.status === 'saving') return
    await persist(resumes, active.id)
  }

  function createResumeFromForm() {
    const name = newName.trim() || (mode === 'authed' && seedFromProfile && profileSeed ? profileSeed.displayName : '')
    if (!name) {
      setError('Give the resume a name first.')
      return
    }
    setError(null)
    const base = createResume({ id: crypto.randomUUID(), fullName: name.slice(0, 160) })
    const seeded =
      mode === 'authed' && seedFromProfile && profileSeed
        ? {
            ...base,
            headline: profileSeed.headline.slice(0, 200),
            summary: [profileSeed.situation.trim(), profileSeed.goal.trim()].filter(Boolean).join(' '),
          }
        : base
    const next = [seeded, ...resumes]
    setResumes(next)
    setActiveId(seeded.id)
    setShowNew(false)
    setNewName('')
    setSuggestion(null)
    setAiNote(
      mode === 'authed' && seedFromProfile && profileSeed
        ? 'Prefilled from your profile — everything is editable.'
        : null,
    )
    void persist(next, seeded.id)
  }

  async function removeResume(id: string) {
    const resume = resumes.find((entry) => entry.id === id)
    if (!resume) return
    if (!window.confirm(`Delete "${resume.fullName}"? This cannot be undone.`)) return
    if (mode === 'authed') {
      try {
        const result = await deleteResumeAction({ id })
        if (!result.ok) {
          setError(result.error)
          return
        }
      } catch {
        setError('Could not delete this resume. Try again.')
        return
      }
    }
    const next = resumes.filter((entry) => entry.id !== id)
    setResumes(next)
    if (mode === 'demo') saveLocalResumes(next)
    if (activeId === id) {
      setActiveId(next[0]?.id ?? null)
      setDirty(false)
      setSuggestion(null)
    }
  }

  function exportActive() {
    if (!active || exporting) return
    setError(null)
    setExporting(true)
    try {
      downloadResumePdf(active)
    } catch {
      setError('The export failed. Try again.')
    } finally {
      setExporting(false)
    }
  }

  function sourceTextFor(target: AiTarget): string {
    if (!active) return ''
    if (target.section === 'summary') return active.summary
    if (target.section === 'skills') return active.skills.join(', ')
    if (target.section === 'experience') {
      const entry = active.experience.find((item) => item.id === target.entryId)
      return entry ? entry.bullets.join('\n') : ''
    }
    const project = active.projects.find((item) => item.id === target.entryId)
    return project ? project.description : ''
  }

  async function requestSuggestion(target: AiTarget) {
    if (!active || aiWorking) return
    const text = sourceTextFor(target)
    if (!text.trim()) {
      setError(
        target.section === 'experience'
          ? 'Add at least one bullet to this role first — AI can only improve what you wrote.'
          : target.section === 'projects'
            ? 'Write a few words about this project first — AI can only improve what you wrote.'
            : `Write your ${SECTION_LABELS[target.section]} first — AI can only improve what you wrote.`,
      )
      return
    }
    setError(null)
    setAiWorking(true)
    try {
      const result = await improveSectionAction({
        section: target.section,
        text: text.trim(),
        targetRole: active.targetRole,
        jobDescription: active.targetJobDescription,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      const parsed = ResumeSuggestionSchema.parse(result.data.suggestion)
      setSuggestion({ target, text: parsed, source: result.data.source })
      setAiNote(
        result.data.source === 'live'
          ? 'Live AI suggestion from your own words. Review it — nothing is applied until you choose.'
          : 'Demo suggestion — connect a model key for live rewrites. Review it before using.',
      )
    } catch {
      setError('The suggestion failed. Try again.')
    } finally {
      setAiWorking(false)
    }
  }

  function applySuggestion() {
    if (!active || !suggestion) return
    const rewritten = suggestion.text.rewritten.trim()
    mutateActive((resume) => {
      if (suggestion.target.section === 'summary') return { ...resume, summary: rewritten, source: 'ai-assisted' }
      if (suggestion.target.section === 'skills') {
        const skills = rewritten.split(/[,\n]/).map((skill) => skill.trim()).filter(Boolean).slice(0, 30)
        return { ...resume, skills, source: 'ai-assisted' }
      }
      if (suggestion.target.section === 'experience') {
        const bullets = rewritten.split('\n').map((line) => line.replace(/^[-•\d.)\s]+/, '').trim()).filter(Boolean).slice(0, 8)
        return {
          ...resume,
          experience: resume.experience.map((entry) =>
            entry.id === suggestion.target.entryId ? { ...entry, bullets } : entry,
          ),
          source: 'ai-assisted',
        }
      }
      return {
        ...resume,
        projects: resume.projects.map((project) =>
          project.id === suggestion.target.entryId ? { ...project, description: rewritten } : project,
        ),
        source: 'ai-assisted',
      }
    })
    setSuggestion(null)
    setAiNote('Suggestion applied — edit it freely. AI never adds facts you did not provide.')
  }

  function addSkill() {
    const skill = skillDraft.trim()
    if (!active || !skill) return
    if (active.skills.length >= 30) {
      setError('Keep the skills list to 30 items.')
      return
    }
    setError(null)
    setSkillDraft('')
    mutateActive((resume) => ({ ...resume, skills: [...resume.skills, skill.slice(0, 80)] }))
  }

  const card = 'rounded-[var(--radius-card)] border border-line/70 bg-white p-5 shadow-[var(--shadow-card)]'

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Arko state="thinking" size={64} label="Arko reviewing" />
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-ink">Resume Studio</h1>
            <p className="mt-1 text-sm text-muted">Your experience, clearly told — AI-assisted, always editable, PDF export.</p>
          </div>
        </div>
        <Button variant={showNew ? 'quiet' : 'secondary'} onClick={() => setShowNew(!showNew)}>
          {showNew ? 'Close' : 'New resume'}
        </Button>
      </div>

      {mode === 'demo' ? (
        <div className="mt-4">
          <Notice tone="demo" title="Demo resumes live in this browser only.">
            Everything works, but resumes are saved to this browser, not your account.{' '}
            <Link href="/signup" className="font-semibold text-forest hover:underline">
              Create an account
            </Link>{' '}
            to keep them.
          </Notice>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted">
          Saved to your account · only you can see your resumes until you share the file.
        </p>
      )}

      {showNew && (
        <section aria-label="Create a resume" className={`mt-6 space-y-4 ${card}`}>
          <TextField
            id="resume-name"
            label="Full name on the resume"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            maxLength={160}
            placeholder={profileSeed ? profileSeed.displayName : 'e.g. Maria Santos'}
            required
          />
          {mode === 'authed' && profileSeed && (
            <label className="flex cursor-pointer items-start gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={seedFromProfile}
                onChange={(event) => setSeedFromProfile(event.target.checked)}
                className="mt-1"
              />
              <span>
                Start from my Tulay profile
                <span className="block text-sm text-muted">Uses your display name, headline, situation, and goal as an editable starting point.</span>
              </span>
            </label>
          )}
          <div className="flex flex-wrap gap-3">
            <Button onClick={createResumeFromForm}>Create resume</Button>
          </div>
        </section>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm font-medium text-danger">
          {error}
        </p>
      )}

      {aiNote && !error && (
        <div className="mt-4">
          <Notice tone="info" title={aiNote} />
        </div>
      )}

      {suggestion && active && (
        <section aria-label="AI suggestion" className={`mt-6 space-y-3 ${card}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold text-ink">
              Suggested {SECTION_LABELS[suggestion.target.section]}{' '}
              <span className="ml-1 rounded-full bg-mist px-2 py-0.5 text-xs font-semibold text-forest">
                {suggestion.source === 'live' ? 'Live AI' : 'Demo'}
              </span>
            </h2>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={applySuggestion}>
                Use this rewrite
              </Button>
              <Button variant="quiet" onClick={() => setSuggestion(null)}>
                Dismiss
              </Button>
            </div>
          </div>
          <p className="whitespace-pre-wrap rounded-xl bg-ivory p-3 text-[15px] text-ink">{suggestion.text.rewritten}</p>
          {suggestion.text.improvements.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-ink">What changed and why</h3>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted">
                {suggestion.text.improvements.map((note, index) => (
                  <li key={index}>{note}</li>
                ))}
              </ul>
            </div>
          )}
          {suggestion.text.missingInfo.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-ink">Missing information — answer by editing the section</h3>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted">
                {suggestion.text.missingInfo.map((note, index) => (
                  <li key={index}>{note}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {resumes.length === 0 && !showNew && (
        <div className={`mt-6 p-8 text-center ${card}`}>
          <p className="text-lg font-bold text-ink">No resumes yet.</p>
          <p className="mt-1 text-sm text-muted">Create one to turn your experience into a clear resume.</p>
          <div className="mt-4 flex justify-center">
            <Button onClick={() => setShowNew(true)}>New resume</Button>
          </div>
        </div>
      )}

      {active && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside aria-label="Your resumes" className="space-y-2">
            {resumes.map((resume) => (
              <div
                key={resume.id}
                className={`rounded-2xl border p-3 transition ${
                  resume.id === active.id ? 'border-forest bg-mist/60' : 'border-line bg-white hover:border-forest/40'
                }`}
              >
                <button type="button" onClick={() => { setActiveId(resume.id); setSuggestion(null) }} className="block w-full text-left">
                  <span className="block truncate text-[15px] font-bold text-ink">{resume.fullName}</span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {resume.headline || 'No headline yet'}
                    {resume.source === 'ai-assisted' ? ' · AI-assisted' : ''}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void removeResume(resume.id)}
                  aria-label={`Delete ${resume.fullName}`}
                  className="mt-1 text-xs font-semibold text-danger hover:underline"
                >
                  Delete
                </button>
              </div>
            ))}
          </aside>

          <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section aria-label="Resume editor" className="min-w-0 space-y-5">
              <div className={card}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <label htmlFor="active-resume-name" className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Full name
                    </label>
                    <input
                      id="active-resume-name"
                      value={active.fullName}
                      onChange={(event) => mutateActive((resume) => ({ ...resume, fullName: event.target.value.slice(0, 160) || resume.fullName }))}
                      maxLength={160}
                      className="mt-1 w-full rounded-xl border border-line bg-ivory px-3 py-2 text-lg font-bold text-ink focus:border-forest"
                    />
                    <p className="mt-1 text-xs text-muted">
                      {dirty ? 'Unsaved changes' : saveState.status === 'saved' && saveState.at ? `Saved ${formatTime(saveState.at)}` : 'No unsaved changes'}
                      {saveState.status === 'error' ? ` · ${saveState.error ?? 'Save failed'}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" loading={saveState.status === 'saving'} onClick={() => void saveActive()} disabled={!dirty}>
                      Save
                    </Button>
                    <Button loading={exporting} onClick={exportActive}>
                      Export PDF
                    </Button>
                  </div>
                </div>
              </div>

              <div className={`space-y-4 ${card}`}>
                <h2 className="text-base font-bold text-ink">Contact</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField id="resume-headline" label="Headline" value={active.headline} onChange={(event) => mutateActive((resume) => ({ ...resume, headline: event.target.value }))} maxLength={200} optional placeholder="e.g. Customer support specialist" />
                  <TextField id="resume-email" label="Email" value={active.email} onChange={(event) => mutateActive((resume) => ({ ...resume, email: event.target.value }))} maxLength={320} optional placeholder="you@example.com" />
                  <TextField id="resume-phone" label="Phone" value={active.phone} onChange={(event) => mutateActive((resume) => ({ ...resume, phone: event.target.value }))} maxLength={60} optional placeholder="+63 ..." />
                  <TextField id="resume-location" label="Location" value={active.location} onChange={(event) => mutateActive((resume) => ({ ...resume, location: event.target.value }))} maxLength={200} optional placeholder="e.g. Manila, Philippines" />
                </div>
              </div>

              <div className={`space-y-4 ${card}`}>
                <h2 className="text-base font-bold text-ink">Target role</h2>
                <TextField id="resume-target-role" label="Role you want" value={active.targetRole} onChange={(event) => mutateActive((resume) => ({ ...resume, targetRole: event.target.value }))} maxLength={200} optional placeholder="e.g. Customer success associate" />
                <TextAreaField id="resume-target-jd" label="Job description (optional)" value={active.targetJobDescription} onChange={(event) => mutateActive((resume) => ({ ...resume, targetJobDescription: event.target.value }))} maxLength={8000} optional placeholder="Paste the posting to tune AI suggestions toward it." />
                <p className="text-xs text-muted">AI suggestions use this to tune rewrites. It never appears in the exported PDF.</p>
              </div>

              <div className={`space-y-3 ${card}`}>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-bold text-ink">Professional summary</h2>
                  <Button variant="quiet" loading={aiWorking} onClick={() => void requestSuggestion({ section: 'summary' })}>
                    Improve with AI
                  </Button>
                </div>
                <TextAreaField id="resume-summary" label="Summary" value={active.summary} onChange={(event) => mutateActive((resume) => ({ ...resume, summary: event.target.value }))} maxLength={2000} optional placeholder="Two or three sentences about your experience and direction." />
              </div>

              <div className={`space-y-3 ${card}`}>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-bold text-ink">Work experience</h2>
                  <Button variant="quiet" onClick={() => mutateActive((resume) => ({ ...resume, experience: [...resume.experience, blankExperience()] }))}>
                    Add role
                  </Button>
                </div>
                {active.experience.length === 0 && (
                  <p className="text-sm text-muted">No roles yet. Add the work you actually did — AI only rephrases your facts.</p>
                )}
                {active.experience.map((entry, index) => (
                  <ExperienceEditor
                    key={entry.id}
                    entry={entry}
                    index={index}
                    isFirst={index === 0}
                    isLast={index === active.experience.length - 1}
                    aiWorking={aiWorking}
                    onChange={(next) => mutateActive((resume) => ({ ...resume, experience: resume.experience.map((item) => (item.id === entry.id ? next : item)) }))}
                    onMove={(direction) => mutateActive((resume) => ({ ...resume, experience: moveEntry(resume.experience, entry.id, direction) }))}
                    onDelete={() => mutateActive((resume) => ({ ...resume, experience: resume.experience.filter((item) => item.id !== entry.id) }))}
                    onImprove={() => void requestSuggestion({ section: 'experience', entryId: entry.id })}
                  />
                ))}
              </div>

              <div className={`space-y-3 ${card}`}>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-bold text-ink">Projects</h2>
                  <Button variant="quiet" onClick={() => mutateActive((resume) => ({ ...resume, projects: [...resume.projects, blankProject()] }))}>
                    Add project
                  </Button>
                </div>
                {active.projects.length === 0 && (
                  <p className="text-sm text-muted">No projects yet. Side work, volunteer work, and learning projects all count.</p>
                )}
                {active.projects.map((project, index) => (
                  <ProjectEditor
                    key={project.id}
                    project={project}
                    index={index}
                    isFirst={index === 0}
                    isLast={index === active.projects.length - 1}
                    aiWorking={aiWorking}
                    onChange={(next) => mutateActive((resume) => ({ ...resume, projects: resume.projects.map((item) => (item.id === project.id ? next : item)) }))}
                    onMove={(direction) => mutateActive((resume) => ({ ...resume, projects: moveEntry(resume.projects, project.id, direction) }))}
                    onDelete={() => mutateActive((resume) => ({ ...resume, projects: resume.projects.filter((item) => item.id !== project.id) }))}
                    onImprove={() => void requestSuggestion({ section: 'projects', entryId: project.id })}
                  />
                ))}
              </div>

              <div className={`space-y-3 ${card}`}>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-bold text-ink">Skills</h2>
                  <Button variant="quiet" loading={aiWorking} onClick={() => void requestSuggestion({ section: 'skills' })}>
                    Improve with AI
                  </Button>
                </div>
                <div className="flex gap-2">
                  <input
                    id="resume-skill-add"
                    value={skillDraft}
                    onChange={(event) => setSkillDraft(event.target.value)}
                    onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addSkill() } }}
                    maxLength={80}
                    placeholder="e.g. Email support"
                    aria-label="Add a skill"
                    className="min-w-0 flex-1 rounded-xl border border-line bg-ivory px-3 py-2 text-[15px] text-ink focus:border-forest"
                  />
                  <Button variant="secondary" onClick={addSkill}>
                    Add
                  </Button>
                </div>
                {active.skills.length === 0 && (
                  <p className="text-sm text-muted">No skills yet. List only skills you actually have.</p>
                )}
                <ul className="flex flex-wrap gap-2">
                  {active.skills.map((skill, index) => (
                    <li key={`${skill}-${index}`} className="flex items-center gap-1 rounded-full bg-mist px-3 py-1 text-sm font-medium text-ink">
                      <span>{skill}</span>
                      <button
                        type="button"
                        aria-label={`Remove ${skill}`}
                        onClick={() => mutateActive((resume) => ({ ...resume, skills: resume.skills.filter((_, i) => i !== index) }))}
                        className="rounded-full px-1 text-muted hover:text-danger"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className={`space-y-3 ${card}`}>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-bold text-ink">Education</h2>
                  <Button variant="quiet" onClick={() => mutateActive((resume) => ({ ...resume, education: [...resume.education, blankEducation()] }))}>
                    Add school
                  </Button>
                </div>
                {active.education.length === 0 && <p className="text-sm text-muted">No education entries yet.</p>}
                {active.education.map((entry) => (
                  <EducationEditor
                    key={entry.id}
                    entry={entry}
                    onChange={(next) => mutateActive((resume) => ({ ...resume, education: resume.education.map((item) => (item.id === entry.id ? next : item)) }))}
                    onDelete={() => mutateActive((resume) => ({ ...resume, education: resume.education.filter((item) => item.id !== entry.id) }))}
                  />
                ))}
              </div>

              <div className={`space-y-3 ${card}`}>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-bold text-ink">Certifications</h2>
                  <Button variant="quiet" onClick={() => mutateActive((resume) => ({ ...resume, certifications: [...resume.certifications, blankCertification()] }))}>
                    Add certification
                  </Button>
                </div>
                {active.certifications.length === 0 && <p className="text-sm text-muted">No certifications yet. Only list ones you hold.</p>}
                {active.certifications.map((entry) => (
                  <CertificationEditor
                    key={entry.id}
                    entry={entry}
                    onChange={(next) => mutateActive((resume) => ({ ...resume, certifications: resume.certifications.map((item) => (item.id === entry.id ? next : item)) }))}
                    onDelete={() => mutateActive((resume) => ({ ...resume, certifications: resume.certifications.filter((item) => item.id !== entry.id) }))}
                  />
                ))}
              </div>
            </section>

            <ResumePreview resume={active} />
          </div>
        </div>
      )}

      <p className="mt-8 text-center text-sm text-muted">
        Want human eyes on it?{' '}
        <LinkButton href="/ask?q=Who%20can%20review%20my%20resume%3F" variant="secondary">
          Get resume feedback
        </LinkButton>
      </p>
    </div>
  )
}

function EntryControls({
  label,
  isFirst,
  isLast,
  onMove,
  onDelete,
}: {
  label: string
  isFirst: boolean
  isLast: boolean
  onMove: (direction: -1 | 1) => void
  onDelete: () => void
}) {
  return (
    <div className="flex gap-1">
      <button type="button" aria-label={`Move ${label} up`} disabled={isFirst} onClick={() => onMove(-1)} className="rounded px-1.5 py-0.5 text-sm text-muted hover:bg-mist disabled:opacity-30">
        ↑
      </button>
      <button type="button" aria-label={`Move ${label} down`} disabled={isLast} onClick={() => onMove(1)} className="rounded px-1.5 py-0.5 text-sm text-muted hover:bg-mist disabled:opacity-30">
        ↓
      </button>
      <button type="button" aria-label={`Delete ${label}`} onClick={onDelete} className="rounded px-1.5 py-0.5 text-sm text-danger hover:bg-red-50">
        ✕
      </button>
    </div>
  )
}

function ExperienceEditor({
  entry,
  index,
  isFirst,
  isLast,
  aiWorking,
  onChange,
  onMove,
  onDelete,
  onImprove,
}: {
  entry: ResumeExperience
  index: number
  isFirst: boolean
  isLast: boolean
  aiWorking: boolean
  onChange: (next: ResumeExperience) => void
  onMove: (direction: -1 | 1) => void
  onDelete: () => void
  onImprove: () => void
}) {
  const prefix = `exp-${entry.id}`
  return (
    <div className="space-y-3 rounded-2xl border border-line p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-ink">Role {index + 1}</h3>
        <EntryControls label={entry.title} isFirst={isFirst} isLast={isLast} onMove={onMove} onDelete={onDelete} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField id={`${prefix}-title`} label="Job title" value={entry.title} onChange={(event) => onChange({ ...entry, title: event.target.value })} maxLength={160} required />
        <TextField id={`${prefix}-company`} label="Company" value={entry.company} onChange={(event) => onChange({ ...entry, company: event.target.value })} maxLength={160} required />
        <TextField id={`${prefix}-location`} label="Location" value={entry.location} onChange={(event) => onChange({ ...entry, location: event.target.value })} maxLength={200} optional />
        <div className="grid grid-cols-2 gap-3">
          <TextField id={`${prefix}-start`} label="Start" value={entry.startDate} onChange={(event) => onChange({ ...entry, startDate: event.target.value })} maxLength={40} optional placeholder="2023" />
          <TextField id={`${prefix}-end`} label="End" value={entry.current ? 'Present' : entry.endDate} onChange={(event) => onChange({ ...entry, endDate: event.target.value })} maxLength={40} optional placeholder="2025" />
        </div>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
        <input type="checkbox" checked={entry.current} onChange={(event) => onChange({ ...entry, current: event.target.checked })} />
        I currently work here
      </label>
      <TextAreaField
        id={`${prefix}-bullets`}
        label="Accomplishments (one per line)"
        value={entry.bullets.join('\n')}
        onChange={(event) => onChange({ ...entry, bullets: event.target.value.split('\n').map((line) => line.trim()).filter(Boolean) })}
        hint="What you actually did. AI rephrases these — it never adds results you did not state."
        optional
      />
      <div>
        <Button variant="quiet" loading={aiWorking} onClick={onImprove}>
          Improve bullets with AI
        </Button>
      </div>
    </div>
  )
}

function ProjectEditor({
  project,
  index,
  isFirst,
  isLast,
  aiWorking,
  onChange,
  onMove,
  onDelete,
  onImprove,
}: {
  project: ResumeProject
  index: number
  isFirst: boolean
  isLast: boolean
  aiWorking: boolean
  onChange: (next: ResumeProject) => void
  onMove: (direction: -1 | 1) => void
  onDelete: () => void
  onImprove: () => void
}) {
  const prefix = `proj-${project.id}`
  return (
    <div className="space-y-3 rounded-2xl border border-line p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-ink">Project {index + 1}</h3>
        <EntryControls label={project.name} isFirst={isFirst} isLast={isLast} onMove={onMove} onDelete={onDelete} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField id={`${prefix}-name`} label="Project name" value={project.name} onChange={(event) => onChange({ ...project, name: event.target.value })} maxLength={160} required />
        <TextField id={`${prefix}-link`} label="Link" value={project.link} onChange={(event) => onChange({ ...project, link: event.target.value })} maxLength={500} optional placeholder="https://…" />
      </div>
      <TextAreaField id={`${prefix}-description`} label="Description" value={project.description} onChange={(event) => onChange({ ...project, description: event.target.value })} maxLength={2000} optional placeholder="What you built and your part in it." />
      <TextAreaField
        id={`${prefix}-bullets`}
        label="Highlights (one per line)"
        value={project.bullets.join('\n')}
        onChange={(event) => onChange({ ...project, bullets: event.target.value.split('\n').map((line) => line.trim()).filter(Boolean) })}
        optional
      />
      <div>
        <Button variant="quiet" loading={aiWorking} onClick={onImprove}>
          Improve description with AI
        </Button>
      </div>
    </div>
  )
}

function EducationEditor({
  entry,
  onChange,
  onDelete,
}: {
  entry: ResumeEducation
  onChange: (next: ResumeEducation) => void
  onDelete: () => void
}) {
  const prefix = `edu-${entry.id}`
  return (
    <div className="space-y-3 rounded-2xl border border-line p-4">
      <div className="flex justify-end">
        <button type="button" aria-label={`Delete ${entry.school}`} onClick={onDelete} className="rounded px-1.5 py-0.5 text-sm text-danger hover:bg-red-50">
          ✕
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField id={`${prefix}-school`} label="School" value={entry.school} onChange={(event) => onChange({ ...entry, school: event.target.value })} maxLength={200} required />
        <TextField id={`${prefix}-degree`} label="Degree" value={entry.degree} onChange={(event) => onChange({ ...entry, degree: event.target.value })} maxLength={200} optional placeholder="e.g. BS" />
        <TextField id={`${prefix}-field`} label="Field of study" value={entry.field} onChange={(event) => onChange({ ...entry, field: event.target.value })} maxLength={200} optional />
        <TextField id={`${prefix}-year`} label="Year" value={entry.year} onChange={(event) => onChange({ ...entry, year: event.target.value })} maxLength={40} optional placeholder="2022" />
      </div>
    </div>
  )
}

function CertificationEditor({
  entry,
  onChange,
  onDelete,
}: {
  entry: ResumeCertification
  onChange: (next: ResumeCertification) => void
  onDelete: () => void
}) {
  const prefix = `cert-${entry.id}`
  return (
    <div className="space-y-3 rounded-2xl border border-line p-4">
      <div className="flex justify-end">
        <button type="button" aria-label={`Delete ${entry.name}`} onClick={onDelete} className="rounded px-1.5 py-0.5 text-sm text-danger hover:bg-red-50">
          ✕
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField id={`${prefix}-name`} label="Certification" value={entry.name} onChange={(event) => onChange({ ...entry, name: event.target.value })} maxLength={200} required />
        <TextField id={`${prefix}-issuer`} label="Issuer" value={entry.issuer} onChange={(event) => onChange({ ...entry, issuer: event.target.value })} maxLength={200} optional />
        <TextField id={`${prefix}-year`} label="Year" value={entry.year} onChange={(event) => onChange({ ...entry, year: event.target.value })} maxLength={40} optional placeholder="2024" />
      </div>
    </div>
  )
}

function entryDates(startDate: string, endDate: string, current: boolean): string {
  const start = startDate.trim()
  const end = current ? 'Present' : endDate.trim()
  if (start && end) return `${start} – ${end}`
  return start || end
}

function ResumePreview({ resume }: { resume: Resume }) {
  const contact = [resume.email.trim(), resume.phone.trim(), resume.location.trim()].filter(Boolean)
  return (
    <div aria-label="Resume preview" className="overflow-hidden rounded-[var(--radius-card)] border border-line/70 bg-white shadow-[var(--shadow-card)] xl:sticky xl:top-6">
      <div className="space-y-4 px-6 py-6">
        <div>
          <p className="text-2xl font-extrabold text-ink">{resume.fullName}</p>
          {resume.headline.trim() && <p className="mt-0.5 font-medium text-forest">{resume.headline.trim()}</p>}
          {contact.length > 0 && <p className="mt-1 text-sm text-muted">{contact.join('  ·  ')}</p>}
        </div>
        {resume.summary.trim() && (
          <div>
            <PreviewHeading text="Summary" />
            <p className="mt-1 text-sm text-ink">{resume.summary.trim()}</p>
          </div>
        )}
        {resume.experience.length > 0 && (
          <div>
            <PreviewHeading text="Experience" />
            <div className="mt-1 space-y-3">
              {resume.experience.map((entry) => (
                <div key={entry.id}>
                  <p className="text-sm font-bold text-ink">{entry.title} — {entry.company}</p>
                  {(() => {
                    const meta = [entry.location.trim(), entryDates(entry.startDate, entry.endDate, entry.current)].filter(Boolean)
                    return meta.length > 0 ? <p className="text-xs text-muted">{meta.join('  ·  ')}</p> : null
                  })()}
                  <ul className="mt-1 space-y-0.5">
                    {entry.bullets.map((bullet, index) => (
                      <li key={index} className="flex gap-2 text-sm text-ink">
                        <span aria-hidden="true" className="text-forest">•</span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
        {resume.projects.length > 0 && (
          <div>
            <PreviewHeading text="Projects" />
            <div className="mt-1 space-y-3">
              {resume.projects.map((project) => (
                <div key={project.id}>
                  <p className="text-sm font-bold text-ink">{project.name}</p>
                  {project.description.trim() && <p className="text-sm text-ink">{project.description.trim()}</p>}
                  <ul className="mt-1 space-y-0.5">
                    {project.bullets.map((bullet, index) => (
                      <li key={index} className="flex gap-2 text-sm text-ink">
                        <span aria-hidden="true" className="text-forest">•</span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                  {project.link.trim() && <p className="text-xs text-muted">{project.link.trim()}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
        {resume.skills.length > 0 && (
          <div>
            <PreviewHeading text="Skills" />
            <p className="mt-1 text-sm text-ink">{resume.skills.join(', ')}</p>
          </div>
        )}
        {resume.education.length > 0 && (
          <div>
            <PreviewHeading text="Education" />
            <div className="mt-1 space-y-1">
              {resume.education.map((entry) => (
                <div key={entry.id}>
                  <p className="text-sm font-bold text-ink">
                    {entry.school}
                    {(() => {
                      const degree = [entry.degree.trim(), entry.field.trim()].filter(Boolean).join(', ')
                      return degree ? ` — ${degree}` : ''
                    })()}
                  </p>
                  {entry.year.trim() && <p className="text-xs text-muted">{entry.year.trim()}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
        {resume.certifications.length > 0 && (
          <div>
            <PreviewHeading text="Certifications" />
            <div className="mt-1 space-y-1">
              {resume.certifications.map((cert) => (
                <p key={cert.id} className="text-sm text-ink">
                  {cert.name}
                  {(() => {
                    const detail = [cert.issuer.trim(), cert.year.trim()].filter(Boolean).join(', ')
                    return detail ? ` — ${detail}` : ''
                  })()}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
      <p className="border-t border-line px-6 py-2 text-xs text-muted">Built with Tulay · Preview matches the PDF layout</p>
    </div>
  )
}

function PreviewHeading({ text }: { text: string }) {
  return (
    <p className="border-b border-forest/40 pb-1 text-xs font-bold uppercase tracking-wide text-forest">
      {text}
    </p>
  )
}
