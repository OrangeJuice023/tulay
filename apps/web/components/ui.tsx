import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'
import { Info } from './icons'
import { LinkPending } from './LinkPending'

// ---------------------------------------------------------------------------
// Buttons: primary (one per screen), accent (sparing), secondary, quiet.
// ---------------------------------------------------------------------------

type Variant = 'primary' | 'accent' | 'secondary' | 'quiet'
type Size = 'md' | 'lg'

const base =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full font-semibold transition duration-150 select-none disabled:cursor-not-allowed disabled:opacity-50'
const variants: Record<Variant, string> = {
  primary:
    'bg-forest text-white shadow-[var(--shadow-press)] hover:bg-forest-dark active:translate-y-[3px] active:shadow-none disabled:active:translate-y-0',
  accent: 'bg-coral text-ink shadow-[0_3px_0_0_#d9573a] hover:brightness-105 active:translate-y-[3px] active:shadow-none',
  secondary: 'bg-white text-forest ring-1 ring-line hover:ring-forest/50',
  quiet: 'text-forest hover:bg-mist',
}
const sizes: Record<Size, string> = {
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3.5 text-base',
}

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra = '') {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  children,
  disabled,
  ...props
}: ComponentProps<'button'> & { variant?: Variant; size?: Size; loading?: boolean }) {
  return (
    <button
      type="button"
      className={buttonClass(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
}

export function LinkButton({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return (
    <Link className={buttonClass(variant, size, className)} {...props}>
      {children}
      <LinkPending />
    </Link>
  )
}

export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block animate-spin rounded-full border-2 border-current border-r-transparent ${className}`}
    />
  )
}

// ---------------------------------------------------------------------------
// Form fields: visible label, optional hint, error announced to screen readers.
// ---------------------------------------------------------------------------

type FieldProps = { id: string; label: string; hint?: string; error?: string; optional?: boolean }

function describedBy(id: string, hint?: string, error?: string) {
  return [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
}

function FieldFrame({ id, label, hint, error, optional, children }: FieldProps & { children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-ink">
        {label}
        {optional && <span className="ml-1 font-normal text-muted">(optional)</span>}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

const inputClass = (error?: string) =>
  `w-full rounded-2xl border bg-white px-4 py-3 text-base text-ink placeholder:text-muted/70 transition focus:border-forest ${
    error ? 'border-danger' : 'border-line'
  }`

export function TextField({ id, label, hint, error, optional, ...props }: FieldProps & ComponentProps<'input'>) {
  return (
    <FieldFrame id={id} label={label} hint={hint} error={error} optional={optional}>
      <input
        id={id}
        className={inputClass(error)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...props}
      />
    </FieldFrame>
  )
}

export function TextAreaField({ id, label, hint, error, optional, ...props }: FieldProps & ComponentProps<'textarea'>) {
  return (
    <FieldFrame id={id} label={label} hint={hint} error={error} optional={optional}>
      <textarea
        id={id}
        rows={3}
        className={`${inputClass(error)} resize-y`}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...props}
      />
    </FieldFrame>
  )
}

// ---------------------------------------------------------------------------
// Chips, badges, status
// ---------------------------------------------------------------------------

export function humanizeTag(tag: string) {
  const text = tag.replace(/-/g, ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function ToggleChip({ selected, onToggle, children }: { selected: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition ${
        selected ? 'bg-forest text-white' : 'bg-white text-ink ring-1 ring-line hover:ring-forest/50'
      }`}
    >
      {selected && <span aria-hidden="true">✓</span>}
      {children}
    </button>
  )
}

export function Tag({ children, tone = 'mist' }: { children: ReactNode; tone?: 'mist' | 'peach' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
        tone === 'mist' ? 'bg-mist text-forest-dark' : 'bg-peach text-coral-ink'
      }`}
    >
      {children}
    </span>
  )
}

export function DemoBadge({ label = 'Demo member' }: { label?: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-coral/60 bg-peach px-2.5 py-0.5 text-xs font-semibold tracking-wide text-coral-ink uppercase">
      {label}
    </span>
  )
}

const statusStyles: Record<string, { label: string; className: string }> = {
  pending: { label: 'Waiting for reply', className: 'bg-peach text-coral-ink' },
  accepted: { label: 'Accepted', className: 'bg-mist text-forest-dark' },
  declined: { label: 'Not now', className: 'bg-stone-100 text-muted' },
  withdrawn: { label: 'Withdrawn', className: 'bg-stone-100 text-muted' },
  agreed: { label: 'Next step agreed', className: 'bg-mist text-forest-dark' },
  in_progress: { label: 'In progress', className: 'bg-peach text-coral-ink' },
  completed: { label: 'Completed', className: 'bg-forest text-white' },
  cancelled: { label: 'Cancelled', className: 'bg-stone-100 text-muted' },
}

export function StatusPill({ status }: { status: string }) {
  const style = statusStyles[status] ?? { label: status, className: 'bg-stone-100 text-muted' }
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${style.className}`}>
      {style.label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Notices: demo labels, empty, loading and error states.
// ---------------------------------------------------------------------------

type Tone = 'demo' | 'info' | 'error'

export function Notice({ tone = 'info', title, children }: { tone?: Tone; title?: string; children?: ReactNode }) {
  const styles: Record<Tone, string> = {
    demo: 'border-coral/50 bg-peach/70 text-ink',
    info: 'border-line bg-white text-ink',
    error: 'border-danger/40 bg-red-50 text-ink',
  }
  return (
    <div role={tone === 'error' ? 'alert' : 'note'} className={`flex gap-3 rounded-2xl border p-4 text-sm ${styles[tone]}`}>
      <Info className={`mt-0.5 h-5 w-5 shrink-0 ${tone === 'error' ? 'text-danger' : tone === 'demo' ? 'text-coral-ink' : 'text-forest'}`} />
      <div className="space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="text-muted">{children}</div>}
      </div>
    </div>
  )
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-line bg-white/60 px-6 py-10 text-center">
      <p className="text-lg font-semibold text-ink">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-md text-sm text-muted">{children}</div>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  )
}

export function LoadingState({ label }: { label: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 rounded-[var(--radius-card)] bg-white/60 py-12 text-muted">
      <Spinner className="h-5 w-5 text-forest" />
      <span>{label}</span>
    </div>
  )
}

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`rounded-[var(--radius-card)] border border-line/70 bg-white p-5 shadow-[var(--shadow-card)] sm:p-6 ${className}`}>
      {children}
    </div>
  )
}
