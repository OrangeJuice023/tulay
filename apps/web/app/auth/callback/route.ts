import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { getSupabaseEnv } from '@/lib/supabase/config'
import { safeNextPath } from '@/lib/supabase/redirects'
import { SupabaseCommunityRepository } from '@/lib/supabase/repository'

/**
 * PKCE code exchange for email-confirmation and recovery links. Password
 * sign-in never touches this route; it exists so Supabase emails land
 * somewhere real instead of a dead link.
 *
 * After a successful exchange the user's profile row is ensured
 * idempotently, and users who have not finished onboarding go there first.
 * The `next` parameter is allowlisted to in-app paths (no open redirects).
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const tokenHash = url.searchParams.get('token_hash')
  const linkType = url.searchParams.get('type')
  const next = safeNextPath(url.searchParams.get('next'))
  const env = getSupabaseEnv()
  const failed = () => NextResponse.redirect(new URL('/login?error=link', url.origin))

  if ((!code && !tokenHash) || !env) return failed()

  let sessionCookies: { name: string; value: string; options: CookieOptions }[] = []
  const supabase = createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        sessionCookies = cookiesToSet
      },
    },
  })
  // PKCE links carry `code`; legacy/OTP links carry `token_hash` + `type`.
  // Either one establishes the session; anything else is a dead link.
  const verified = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({
        token_hash: tokenHash ?? '',
        type: (['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email'] as const).includes(
          (linkType ?? '') as 'signup',
        )
          ? (linkType as 'signup')
          : 'signup',
      })
  if (verified.error) return failed()

  let destination = next
  try {
    const { data: claimsData } = await supabase.auth.getClaims()
    const userId = claimsData?.claims.sub
    if (typeof userId === 'string' && userId) {
      const repo = new SupabaseCommunityRepository(supabase, null)
      const claims = claimsData?.claims as { email?: unknown; user_metadata?: unknown }
      const email = typeof claims?.email === 'string' ? claims.email : ''
      const metadata = (claims?.user_metadata ?? {}) as { display_name?: unknown }
      const displayName =
        typeof metadata.display_name === 'string' && metadata.display_name.trim()
          ? metadata.display_name
          : (email.split('@')[0] ?? 'Tulay member')
      await repo.ensureOwnProfile(userId, displayName)
      const completed = await repo.getOnboardingCompleted(userId)
      if (!completed) destination = '/onboarding'
    }
  } catch {
    // Profile reads must never strand a fresh session: fall through to the
    // requested page, where the same gates apply.
  }

  const response = NextResponse.redirect(new URL(destination, url.origin))
  sessionCookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
  return response
}
