'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Arko } from '@/components/Arko'
import { Button, Notice, TextField } from '@/components/ui'
import { resendVerificationAction, signInAction, signUpAction } from '@/lib/supabase/auth-actions'

/**
 * Shared email + password form for the login and signup pages. Until a
 * Supabase project is configured (`configured` false), the form is replaced
 * with an honest notice — never a dead form that pretends to work.
 *
 * After signup with email confirmation on, the form is replaced by an
 * explicit check-your-email state with a resend action.
 */
export function AuthForm({
  mode,
  configured,
  initialError = null,
}: {
  mode: 'login' | 'signup'
  configured: boolean
  initialError?: string | null
}) {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(initialError)
  const [pending, setPending] = useState(false)
  const [verifyEmail, setVerifyEmail] = useState<string | null>(null)
  const [resent, setResent] = useState(false)
  const [resending, setResending] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setPending(true)
    try {
      if (mode === 'login') {
        const result = await signInAction({ email, password })
        // A successful sign-in redirects (thrown), so reaching here means failure.
        if (!result.ok) setError(result.error)
      } else {
        const result = await signUpAction({ email, password, displayName })
        if (!result.ok) setError(result.error)
        else if (result.pending) {
          setVerifyEmail(email.trim())
          setResent(false)
        }
      }
    } catch (thrown) {
      // redirect() throws NEXT_REDIRECT to navigate away: let it through.
      if (thrown && typeof thrown === 'object' && 'digest' in thrown) throw thrown
      setError('Something went wrong. Please try again.')
    } finally {
      setPending(false)
    }
  }

  async function onResend(target: string | null) {
    if (!target || resending) return
    setError(null)
    setResending(true)
    try {
      const result = await resendVerificationAction({ email: target })
      if (!result.ok) setError(result.error)
      else setResent(true)
    } catch {
      setError('Could not resend the email. Please try again.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-12 sm:px-6">
      <div className="flex items-center gap-3">
        <Arko state={mode === 'login' ? 'greeting' : 'curious'} size={64} label="Arko welcoming you" />
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">
            {mode === 'login' ? 'Welcome back' : 'Join Tulay'}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {mode === 'login' ? 'Sign in to your account.' : 'One account, three studios, real people.'}
          </p>
        </div>
      </div>
      {!configured && (
        <div className="mt-6">
          <Notice tone="demo" title="Accounts aren't available in this preview yet.">
            {mode === 'login'
              ? 'Signing in needs a connected account backend, which this preview does not have yet. '
              : 'Registration needs a connected account backend, which this preview does not have yet. '}
            The full demo journey works without signing in — nothing leaves your browser.{' '}
            <Link href="/start" className="font-semibold text-forest hover:underline">
              Try the demo
            </Link>
            .
          </Notice>
        </div>
      )}
      {configured && verifyEmail && (
        <div className="mt-6 space-y-4">
          <Notice tone="info" title="Check your email to finish signing up.">
            We sent a confirmation link to <span className="font-semibold text-ink">{verifyEmail}</span>. Follow
            it to verify your address, then set up your profile.
          </Notice>
          {resent && (
            <p role="status" className="text-sm font-medium text-forest">
              Sent — check your inbox (and spam folder) for the new link.
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm font-medium text-danger">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" loading={resending} onClick={() => onResend(verifyEmail)}>
              Resend confirmation email
            </Button>
            <Button variant="quiet" onClick={() => setVerifyEmail(null)}>
              Use a different email
            </Button>
          </div>
        </div>
      )}
      {configured && !verifyEmail && (
      <form
        onSubmit={onSubmit}
        noValidate
        className="mt-6 space-y-4 rounded-[var(--radius-card)] border border-line/70 bg-white p-6 shadow-[var(--shadow-card)]"
      >
        {mode === 'signup' && (
          <TextField
            id="signup-name"
            label="What should the community call you?"
            type="text"
            autoComplete="nickname"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            maxLength={100}
            placeholder="e.g. Mara"
            required
          />
        )}
        <TextField
          id={`${mode}-email`}
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <TextField
          id={`${mode}-password`}
          label="Password"
          type="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          hint={mode === 'signup' ? 'At least 8 characters.' : undefined}
          required
        />
        {error && (
          <p role="alert" className="text-sm font-medium text-danger">
            {error}
          </p>
        )}
        <Button type="submit" loading={pending} className="w-full" size="lg">
          {mode === 'login' ? 'Sign in' : 'Create account'}
        </Button>
        {mode === 'login' && (
          <p className="text-center text-sm text-muted">
            {resent ? (
              <span role="status" className="font-medium text-forest">
                Sent — check your inbox for the new link.
              </span>
            ) : (
              <>
                Didn&apos;t get the confirmation email?{' '}
                <button
                  type="button"
                  onClick={() => onResend(email.trim() || null)}
                  disabled={resending || !email.trim()}
                  className="font-semibold text-forest hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {resending ? 'Sending…' : 'Resend it'}
                </button>
              </>
            )}
          </p>
        )}
        <p className="text-center text-sm text-muted">
          {mode === 'login' ? (
            <>
              New to Tulay?{' '}
              <Link href="/signup" className="font-semibold text-forest hover:underline">
                Create an account
              </Link>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-forest hover:underline">
                Sign in
              </Link>
            </>
          )}
        </p>
      </form>
      )}
      <div className="mt-4">
        <Notice tone="demo" title="No account? No problem.">
          The demo journey works without signing in — nothing leaves your browser.{' '}
          <Link href="/start" className="font-semibold text-forest hover:underline">
            Try it first
          </Link>
          .
        </Notice>
      </div>
    </div>
  )
}
