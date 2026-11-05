# Next Steps

Prioritized. Each item is a task card (format in `docs/AGENT_WORKFLOW.md`). Updated 2026-11-05.

North star (canonical): `docs/PROJECT_DIRECTION.md` — "Your next career move shouldn't be a solo
mission." Every item below serves a complete journey toward mutual help.

## Done (2026-10-28)
- Operating docs: `AGENTS.md` (canonical), `CLAUDE.md`, `docs/AGENT_WORKFLOW.md`, tech stack,
  product spec, research protocol, commit conventions, ADR 0001, `research/` workspace, data
  conventions. Fixed corrupted text in several docs.
- Web lint fixed (`next/link` in `layout.tsx`).
- Monorepo + data contract (was item 1): root `package.json` with npm workspaces
  (`apps/*`, `packages/*`, `services/*`); `apps/web` imports `@tulay/shared` and `@tulay/ai`
  (proven by the `/api/health` route in the production build); `CareerGoal`, `Need`, `Offer`,
  `IntroductionRequest`, `Collaboration`, `CollaborationFeedback` Zod schemas matching
  `docs/DATA_MODEL.md`; typed AI contexts replacing the `any` params in `services/ai`;
  Vitest with 43 passing tests. Verified: root `npm install`, `npm run typecheck`
  (all 3 workspaces), `npm test` (43 pass), `npm run lint`, `npm run build`.
  Note: verification used the workspace-aware `npm run typecheck` instead of a bare
  `npx tsc --noEmit`. The root `package-lock.json` is generated but needs a human commit.
- Demo fixtures + deterministic matching (was item 1): `data/fixtures/demo-community.json`
  with 10 synthetic members (all `isDemo`, reciprocal pairs, one non-discoverable member);
  pure `findCandidates(need, community, options?)` in `packages/shared/matching.ts`
  (tag + keyword scoring, reciprocity bonus, stable ranking, contact details stripped);
  28 new tests. Verified: `npm test` (71 pass), `npm run typecheck`, `npm run lint`,
  `npm run build`.
- Founder path in the demo community: 4 new synthetic members (builder, sales co-founder,
  experienced founder, domain expert); co-founder reciprocal pair plus pitch-feedback,
  early-user, and founder-to-community matches proven with the unchanged `findCandidates`
  engine; 8 new tests. Verified: `npm test` (79 pass), `npm run typecheck`, `npm run lint`,
  `npm run build`. No schema or matching changes were needed: every founder scenario fits
  the existing needs/offers contract. Remaining limitation: engine-level only; founder
  journeys still need UI in items 2 and 5. No investor network is claimed or planned.

- Visual identity + web demo journey (was item 2, plus the UI half of item 5), Claude Code,
  2026-10-29: bridge/T logo (`public/brand/`, `app/icon.svg`), design tokens in
  `app/globals.css`, component set in `apps/web/components/`; landing page with the tagline;
  `/start` journey: path (career / freelance / company) → goal, need, optional offer →
  matches from the real `findCandidates` over the fixture (server action, contact details never
  sent to the browser) → editable introduction with explicit consent → simulated reply
  (labelled demo) → one agreed next step with status → "Did this help?" → `/collaborations`
  (browser-local demo records). Route loading screens, per-link pending spinners, async loading,
  empty and error states. Verified: `npm test` (79), typecheck, lint, build, and the full flow
  driven in Edge at 375px and 1280px (no console errors, no horizontal overflow, keyboard skip
  link, validation focus, consent gating, empty state, cold-navigation loading UI).
- Honest health check (was item 2), Muse Code, 2026-10-29: `/api/health` is dynamic
  (`connection()`) and reports the live provider selection; accurate now that the Meta
  provider is real.
- Real Meta provider (was item 4), Muse Code, 2026-10-29: `MetaModelProvider` calls
  `POST /v1/chat/completions` with `json_schema` structured output for all five operations
  (extraction, explanation, draft, next steps, tag grounding); Zod validation, typed errors,
  30s timeout, zero retries, server-only key; `MODEL_API_KEY` canonical with legacy fallback.
  Note: Kilo's report had not landed, so wire details are corroborated from public sources
  (provenance in `docs/AI_AGENT_DESIGN.md`), mock-verified only, no live request yet.
  Verified: `npm test` (107 pass), `npm run typecheck`, `npm run lint`, `npm run build`.
- Meta provider final verification, Muse Code, 2026-10-29: default model moved to
  `muse-spark-1.3` (verified latest Standard checkpoint, 1.2 previous, identical API);
  request/`json_schema`/error handling re-confirmed against current public docs; live
  smoke-test runbook added to `docs/AI_AGENT_DESIGN.md` (mechanics validated without a key;
  the live request itself is still for a human with a key to run).

## Done (2026-11-04)
- Final stabilization, Muse Code: authoritative repo confirmed as `D:\Tulay`
  (HEAD `4951bf3`); production build fixed (wrong import sources in uncommitted
  `members.ts` / `demo-repository.ts` — the only build failure, no architecture
  change); 3 AI/demo attribution bugs fixed (`criteriaSource` `demo` state,
  `LIVE_TEXT_NOTE` vs `DEMO_TEXT_NOTE` by server source, stale stub comment);
  new `apps/web/app/start/actions.test.ts` regression test (2 tests);
  `packages/shared` typecheck fixed (`@types/node` declared, JSON-import
  fixture load, `aiSuggested` literal, `zz-debug` schema imports).
  Verified: `npm test` (160 pass, 11 files), `npm run typecheck` (all 3
  workspaces), `npm run lint`, `npm run build` (19/19 pages). Nothing committed.

## Done (2026-11-04, integrated implementation sprint)

Muse Code, same branch, uncommitted. All verified: `npm test` (205 pass,
17 files), `npm run typecheck` (3 workspaces), `npm run lint`, `npm run build`
(all routes + proxy green).

- Dashboard `/home` from the approved reference (recreated as components, not
  the screenshot): sidebar nav, cover/avatar upload (demo), greeting + Arko
  greeting state, Ask Arko composer, quick actions, computed journey stats,
  potential matches from the visitor's own open needs (no numeric match
  scores, per product language), right rail (upcoming, active collaboration,
  encouragement). Arko gains `greeting`/`thinking` states reusing approved
  crops (no new art); `docs/brand/mascot.md` updated.
- Discover `/discover`: directory browsing over contact-stripped rows with
  query/path/skill filters through shared `memberMatchesFilters`.
- Ask Arko `/ask`: real conversational workspace. New `chat` op on
  `AIProvider` (shared `ArkoChatReply` Zod contract, Demo + Meta
  implementations, tag-vocabulary enforcement) with honest live/demo/
  deterministic labels; deterministic `findCandidates` retrieval; `explainMatch`
  and `suggestTags` wired into the UI for the first time; shortlist →
  editable draft + explicit consent → introduction → next step → outcome.
  Demo loop completes in-browser with labelled simulated replies; signed-in
  members continue two-sided in Introductions/Collaborations.
- Supabase foundation per Kilo's brief (verified against official Resend and
  Next.js docs + installed `@supabase/ssr`): env config (publishable/anon
  names reconciled), browser/server/admin clients, Next 16 `proxy.ts` session
  refresh, email+password auth UI + PKCE callback, migration
  `0004_notifications` (notifications table + RLS + contact-stripped
  `public_profiles` view), full repository with tested mappers. No project
  exists: zero live requests, RLS never exercised — see KNOWN_ISSUES #2.
- Introductions `/introductions` (recipient accept/decline, withdraw,
  accepted-only contact reveal), Collaborations upgrade (authed status/steps/
  outcomes + Ask-Arko demo records), Profile `/profile` (authed editor +
  needs/offers, demo editor), authenticated dashboard data merge.
- Notifications: Supabase-backed in-app (recipient RLS, service-role
  inserts) + journey-store demo notifications in the dashboard bell.
  No Realtime (deliberate: refresh-on-navigation suffices for the MVP).
- Email: Resend client + orchestration complete per official API docs, demo
  fallback preserves in-app-only behavior. Never sent; see
  `docs/EMAIL_SETUP.md` and KNOWN_ISSUES #12.

## Done (2026-11-05, MVP delivery)

Muse Code, same branch, uncommitted. All verified: `npm test` (357 pass,
30 files), `npm run typecheck` (all workspaces), `npm run lint`,
`npm run build` (33 routes), plus browser-driven journeys in system Chrome
and live Supabase/Meta calls.

- P1 auth/onboarding: check-email pending screen, resend on signup + login,
  callback handles `code` + `token_hash` with allowlisted `next`, idempotent
  profile ensure, 4-step `/onboarding`, new-user gating (`proxy.ts` 307s +
  page gates); `contact_method` dual-write removed; `0006_onboarding.sql`
  (`onboarding_completed` + outcome UPDATE policy) applied to production.
- P2 Ask Arko + voice: voice wire corrected to the official shape and proven
  live through the app route; `chat` proven live; `/ask` UI smoke-driven.
- P3 Pitch Deck Studio: schemas + slide ops, 9th AI op `draftDeckOutline`
  (anti-fabrication, template grounding), `0007_decks.sql` + owner RLS
  applied, editor UI, real `.pptx` export (content-verified), studio entry
  flipped live. New deps: `pptxgenjs` (web), `jszip` (root dev, export test).
- Env normalized (`AI_PROVIDER=meta`, stray `SUPABASE_URL` removed);
  `/api/health` reports live meta mode.
- Resume Studio recovered onto `main` (selective path restore, no merge):
  `/resume` editor (contact, target role, summary, experience, projects,
  skills, education, certifications), live preview, `improveResumeSection`
  AI op with labelled demo fallback on live failure, real `%PDF` export,
  `0008_resumes.sql` + owner RLS applied to production (remote table +
  42501 anon-write rejection verified), studio entry flipped live.
  Verified 2026-11-05: 382 tests / 33 files, lint, typecheck, build all
  green; 18/18 browser acceptance incl. mobile 390px; guest localStorage
  reload-verified; signed-in Supabase persistence code-verified only.

## 1. Meta Model API facts, primary confirmation (Kilo)
Update 2026-11-05: voice wire confirmed vs official docs with citations
(`docs/AI_AGENT_DESIGN.md`); `extractGoal`, `chat`, `transcribeAudio`,
`draftDeckOutline` passed live. Still open: rate limits, cost,
data-retention terms, Taglish quality.

## 2. Supabase schema, RLS and auth (Muse Code) — DONE 2026-11-05
Migrations 0001-0007 applied to the live project; RLS exercised
(owner/discoverable/anon paths); email+password auth (not magic link) with
verification, resend, callback, and onboarding. Dual guest/authed mode kept:
guests use the labelled browser demo, members persist to Supabase.

## 3. AI text labels + tag suggestions in the UI (Claude Code)
Use `extractGoal`/`suggestTags` to suggest need/offer tags from the goal text (J1), and
replace the "Demo template" labels in `app/start/Journey.tsx` with "AI suggestion" only
when the source is the real model. (Follow-up preserved from the provider milestone.)
Update 2026-11-04: the label half is done — `criteriaSource` gains an honest
`demo` state and draft/suggestion notes follow the server-returned source
(Muse Code); only tag-suggestion UI wiring remains.

## 4. Deploy and demo script (Claude Code + Muse Code)
Update 2026-11-05: recording script refreshed (`planning/DEMO_SCRIPT.md`) with
verified URLs + demo account; deploy still open (KNOWN_ISSUES #14).

## IA Phase 4: Supabase-backed onboarding (core built 2026-11-05)

Core flow is live: single 4-step `/onboarding` (name, situation, goal, needs,
offers, pathway → `primary_studio`), `onboarding_completed` flag, new-user
gating. The fuller multi-route design below (`/onboarding/profile`,
`/onboarding/journey`, `primary_journey`/`journeys[]`/`active_studio`,
add-another-journey) is deferred, not needed for the demo.

Implemented IA (Phases 0–3, 5) intentionally stops before real accounts. When a
Supabase project is provisioned and verified, build the intended production flow:

Sign up → Profile Setup → Choose Primary Journey → Corresponding Studio Dashboard.

- New routes `/onboarding/profile` (progressive: name + goal first, then skills,
  experience, interests, offers) and `/onboarding/journey` (three journey cards;
  Arko may suggest via the existing chat op, the user taps to choose).
- Migration adding `primary_journey`, `journeys[]`, `active_studio`,
  `onboarding_step` to profiles, own-row RLS.
- Login/session entry redirects to `active_studio`; studio visits update it;
  `/home` stays the cross-studio overview; "add another journey" from Profile.
- Remove the temporary "accounts aren't available in this preview" states in
  `AuthForm` at cutover. Guest `/start` demo and studio guest previews remain.

Journey → studio mapping (already encoded in `JOURNEY_TO_STUDIO`,
`apps/web/lib/studios.ts`): Change careers → Career Studio, Grow as a
freelancer → Freelance Studio, Build a company → Venture Studio.

## Post-hackathon platform roadmap: Supabase M1 to M6 (deferred, retained)

The full backend stays in the plan and starts only after the hackathon submission, so the
demo build is never destabilized. No Supabase provisioning, migrations, auth UI, or Expo
scaffolding happens before then, and no fake authentication or simulated live users will be
added in the meantime. The architecture holds throughout: three distinct studios over one
shared reciprocal human-connection engine. Matching decisions stay deterministic and are
never delegated to an LLM.

- **M1: Supabase authentication and member profiles.** Magic-link sign-in, one real member
  profile per user, and row-level security so members read and write only their own rows.
- **M2: Persistent needs and offers with row-level security.** Needs, offers, skills, and
  availability stored per member, with RLS policies reviewed per table.
- **M3: Real reciprocal matching and two-sided introduction requests.** The existing
  deterministic engine runs over persistent member data. Introductions need explicit
  consent from both sides before contact details are shared.
- **M4: Persistent collaborations, next steps, and outcomes.** Collaboration records,
  agreed next steps with status, and outcome recording owned by the collaborators.
- **M5: Server-side Meta AI integration with user-level limits and privacy boundaries.**
  The existing MetaModelProvider moves behind an authenticated gateway with rate limits,
  caching, cost controls, and prompts that carry only what each feature needs.
- **M6: Mobile application with Expo sharing the same backend.** New React Native UI
  over the same shared contracts and engine calls. No separate matching logic.

## Research in parallel (Kilo)
PH market questions, competitor landscape, job-source registry, user-validation conversations.
