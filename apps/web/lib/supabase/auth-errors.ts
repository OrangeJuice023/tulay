/**
 * User-facing auth error copy. Supabase messages stay server-side; the UI
 * only ever sees these friendly strings. Pure module (no Next imports) so
 * the mapping stays unit-testable.
 */
export function friendlyAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'That email and password did not match.'
  if (/already registered|already exists/i.test(message)) return 'That email is already registered. Try signing in.'
  if (/email not confirmed/i.test(message)) return 'Please confirm your email first, then sign in.'
  if (/expired|invalid.*(token|link|code)|token.*invalid/i.test(message))
    return 'That confirmation link expired or was already used. Request a new one below.'
  if (/rate limit|too many/i.test(message)) return 'Too many attempts. Wait a minute, then try again.'
  if (/email address .* invalid/i.test(message)) return 'That email address was rejected. Use a different address.'
  return 'Sign-in failed. Please try again.'
}
