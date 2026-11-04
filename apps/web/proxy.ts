import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseEnv } from './lib/supabase/config'

/**
 * Session refresh + auth gates at the network boundary (Next 16 `proxy.ts`
 * convention; `middleware.ts` is deprecated). Without Supabase credentials
 * this is a pure passthrough, so demo mode is unaffected.
 *
 * Gates (real HTTP redirects, mirrored by the page-level gates):
 * - Guests on /onboarding → /signup (onboarding needs an account).
 * - Finished users on /onboarding → /home (never repeat onboarding).
 * - Signed-in users with incomplete onboarding on /home → /onboarding.
 * Fail-open: a profile-read error leaves the request alone and the page
 * gates decide.
 */
export async function proxy(request: NextRequest) {
  const env = getSupabaseEnv()
  if (!env) return NextResponse.next({ request })

  let sessionCookies: { name: string; value: string; options: CookieOptions }[] = []
  const supabase = createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        sessionCookies = cookiesToSet
      },
    },
  })

  // Signature-verified read; also refreshes expiring tokens.
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims.sub

  const finish = (response: NextResponse) => {
    sessionCookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
    return response
  }

  const path = request.nextUrl.pathname
  if (path === '/onboarding' || path.startsWith('/onboarding/')) {
    if (typeof userId !== 'string' || !userId) {
      return finish(NextResponse.redirect(new URL('/signup', request.url)))
    }
    const completed = await readOnboardingCompleted(supabase, userId)
    if (completed === true) return finish(NextResponse.redirect(new URL('/home', request.url)))
    return finish(NextResponse.next({ request }))
  }

  if (path === '/home' && typeof userId === 'string' && userId) {
    const completed = await readOnboardingCompleted(supabase, userId)
    if (completed === false) return finish(NextResponse.redirect(new URL('/onboarding', request.url)))
    return finish(NextResponse.next({ request }))
  }

  return finish(NextResponse.next({ request }))
}

/** Onboarding flag, or null when the read itself failed (fail-open). */
async function readOnboardingCompleted(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', userId)
      .maybeSingle()
    if (error) return null
    if (!data) return false
    return (data as { onboarding_completed?: boolean | null }).onboarding_completed === true
  } catch {
    return null
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|brand/|.*\\.(?:svg|png|jpg|ico)).*)'],
}
