# Supabase Readiness Audit — Tulay

Research/assessment only. No code, migrations, env vars, or external connections touched.

Sources: official Supabase docs (Next.js SSR, RLS, storage, realtime), repository files listed below.

## 1. Project readiness

Existing client architecture:
- `apps/web/lib/supabase/config.ts` resolves env: `NEXT_PUBLIC_SUPABASE_URL` + publishable/anon key (publishable wins). Server-only `SUPABASE_SERVICE_ROLE_KEY`. Email `RESEND_API_KEY`/`RESEND_FROM_EMAIL`. Demo mode when Supabase unset.
- `client.ts`: browser client via `createBrowserClient` (throws if unconfigured).
- `server.ts`: server client via `createServerClient` with cookies; `getSessionUser()` uses `auth.getClaims()` (signature-verified). No `getSession()` trust.
- `admin.ts`: service-role client, `persistSession: false`, server-only.
- `auth-actions.ts`: email/password signUp/signIn/signOut server actions; redirect to `/home` after auth.
- `repository.ts`: `SupabaseCommunityRepository` implementing RealCommunityRepository; reads discovery via `public_profiles` view; contact_method fetched only after accepted intro.

Env var names:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY` fallback)
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`

Auth configuration: email/password (no magic link/OAuth). PKCE default in @supabase/ssr. No proxy.ts/middleware.ts present in repo (session refresh on navigation may be missing — check). No email confirmation handling beyond error message.

Migrations: 0001_real_members, 0002_demo_dataset, 0003_storage, 0004_notifications. Order 0001→0004.

## 2. Database and security audit

Schemas: profiles, needs, offers, introduction_requests, collaborations, collaboration_milestones, collaboration_outcomes, demo_* tables, notifications, public_profiles view, storage buckets.

RLS: enabled on all tables. Policies ownership-enforced via auth.uid(). Good. Contact_method: protected only by application discipline + view; underlying `profiles` row readable by anyone when discoverable, so anon key holder can `select contact_method from profiles` directly. Documented follow-up: separate `profile_contacts` table (not built). This is a real gap vs. product rule 5.

Potential cross-user access:
- `profiles_discoverable_read` allows select of entire row including contact_method for discoverable profiles. RLS permits column read; view is the only guard. Flag.
- `collaboration_outcomes` insert policy allows any participant to insert with profile_id = self; OK. But update/delete not defined → defaults deny (fine).
- Storage `member-avatars` read to all authenticated (acceptable; not contact info).
- `getRecipientEmail` uses service role auth.admin.getUserById — server-only, OK.
- `insertNotification` uses admin client — server-only, OK.
- `updateCollaborationStatus` doesn't re-check participant in the update query (relies on prior getCollaboration check) — TOCTOU-ish but low risk; RLS still gates.

Service-role access must remain server-only: admin.ts, repository insertNotification/getRecipientEmail. Ensure no client import (grep verified none in client components).

## 3. Authentication

- Email/password signup/login: implemented server actions. Works without email delivery (Supabase default may require confirmation depending on project settings — dashboard must disable confirm email for MVP or implement callback).
- PKCE callback: not implemented (no `/auth/callback` route). Email confirmation/OAuth would break. For email/password with confirmation disabled, OK; but "email not confirmed" path exists in friendlyAuthError.
- Session persistence/logout: cookie-based via @supabase/ssr; signOutAction calls signOut + redirect. Missing proxy.ts for token refresh → users may be signed out on navigation (official docs require proxy/middleware for refresh).
- Redirect configuration: hardcoded `/home` and `/`. No `NEXT_PUBLIC_APP_URL`-based redirect or Supabase redirect URL config. Dashboard must set Site URL + redirect URLs.
- Guest vs authenticated: demo mode when unconfigured; when configured, guest browsing? `listDiscoverable` works for anon (RLS allows discoverable reads). Auth required for mutations. OK pattern.

## 4. Setup guide (official)

1. Create Supabase project (dashboard). Choose region (founder decision). Note project URL + anon/publishable key + service role key.
2. Dashboard settings: Auth → Providers → Email enabled; disable "Confirm email" for MVP (or implement callback). Auth → URL Configuration: Site URL = app URL, add redirect URLs. Storage buckets created by migration. Enable Realtime publication on notifications if using Postgres Changes (optional; Broadcast recommended).
3. Local env: copy `.env.example` → `apps/web/.env.local`; fill `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or anon), `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`. Never commit.
4. Apply migrations in order 0001→0004 via Supabase CLI (`supabase db push`) or SQL editor. Run `seed.sql` if needed via service role.
5. Local verification: `npm run lint`, `npx tsc --noEmit`, `npm run build`; sign up test user; verify RLS by querying as anon; check contact_method not in discovery response.

## 5. Readiness report

Ready:
- Client/server/admin client factories with env gating and demo mode.
- RLS policies for all core tables.
- public_profiles contact-stripped view + security_invoker.
- Notifications recipient-scoped with service-role-only inserts.
- Storage buckets + owner-scoped policies.
- Repository with Zod validation and contact-after-accept check.
- Intro duplicate-prevention unique index.

Needs changes:
- Add `proxy.ts` (Next 16) for session refresh (official requirement).
- Add `/auth/callback` route if email confirmation or OAuth enabled.
- Harden contact_method: move to separate `profile_contacts` table or column-level protection; current RLS allows direct select.
- Reconcile `.env.example` naming (publishable vs anon) — code already supports both.
- Add Realtime authorization RLS on `realtime.messages` if notifications use Realtime.

Not implemented:
- Live Supabase connection tested (no project provisioned).
- Email confirmation flow / password reset.
- Realtime subscription client code.
- Migrations applied to any project.
- Tests against live DB.

Critical security blockers:
1. `contact_method` readable directly from `profiles` by anon key for discoverable rows (bypasses view). Fix before launch.
2. Missing proxy.ts → session refresh failure → random sign-outs (official warning).
3. Service role key must never ship to client; verify build/import graph (currently OK but must be guarded in CI).

## Recommended implementation sequence for Muse Code
1. Add proxy.ts + auth callback route; verify session refresh.
2. Provision Supabase project + apply migrations 0001→0004 + seed.
3. Implement contact_method isolation (profile_contacts table or column revoke).
4. Wire Realtime (Broadcast) for notifications with authorization RLS.
5. Run lint/typecheck/build + manual RLS tests (anon reads, cross-user writes denied).
6. Configure Vercel env vars + Supabase redirect URLs.
7. End-to-end demo flow test with two real accounts.
