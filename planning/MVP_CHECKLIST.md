# MVP Checklist

Objective acceptance criteria for demo readiness. Tick only when verified, and note how.

## Foundation
- [x] Repo structure, docs and agent workflow in place (2026-10-28)
- [x] Next.js + TypeScript strict + Tailwind scaffolded; `npm run build` passes (verified 2026-10-28)
- [x] `npm run lint` and `npx tsc --noEmit` pass (verified 2026-10-28, after the `next/link` fix)
- [ ] Root `package-lock.json` committed (replaces the `apps/web` lockfile, removed for workspaces)
- [x] npm workspaces: web app imports `@tulay/shared` and `@tulay/ai` (verified 2026-10-28: `/api/health` route imports both in the production build)
- [x] Test runner configured with at least one passing test (verified 2026-10-28: 43 tests pass via root `npm test`)
- [ ] CI runs lint, typecheck, build, tests

## Data and security
- [x] Migrations for profiles, needs, offers, introduction_requests, collaborations, feedback, notifications. Verified 2026-11-05: 0001-0007 applied to the live project via CLI (`migration list` shows Local == Remote)
- [x] RLS enabled on every table. Verified 2026-11-05 live: owner-only profiles/contacts/decks/outcomes, contact-stripped anon discovery, accepted-collaborator contact read; non-participant introduction-read test still owed
- [x] Unique pending introduction per (sender, recipient, need) enforced in the DB. Verified 2026-11-05: partial index applied with 0001 (live duplicate-attempt test still owed)
- [x] Demo fixtures: at least 8 labelled synthetic members, at least 2 reciprocal pairs (verified 2026-10-28: 10 members, all `isDemo`, 3 reciprocal pairs, validated by `fixtures.test.ts`)
- [x] Founder path: fixtures + tests prove co-founder, founder-feedback, and early-user matches via the unchanged matching engine (verified 2026-10-28: 14 members, 4 reciprocal pairs, `fixtures.test.ts`; engine-level only, no UI yet)
- [x] Service-role and model keys never appear in the client bundle (verified 2026-10-29: no `MODEL_API_KEY`/`api.meta.ai` strings in `.next/static`; provider is server-only, no Supabase client yet)

## Journeys (`docs/PRODUCT_SPEC.md`)
- [ ] J1: goal text → AI-suggested needs/offers → user edits → saved. Partial (2026-11-04): Ask Arko `chat` op interprets goal/needs/offers (live or demo-labelled), user confirms the need before search; saved to browser store in demo, to Supabase rows when signed in (unverified — no project)
- [x] J2: need → up to 5 real candidates, deterministic order, "Demo" labels, honest empty state (verified 2026-10-29 in Edge: server action calls `findCandidates` on the fixture; empty state shown for an unmatched need; no contact details in any response)
- [ ] J3: drafted, edited intro sent; recipient accepts or declines; contact shown only on accept. Demo-complete (2026-11-04): editable draft, send gated on explicit consent, `IntroductionRequestSchema`-validated; recipient reply is a labelled simulation and no contact is shown. Real two-sided path (inbox, accepted-only contact reveal, email) implemented but unverified — needs a Supabase project
- [x] J4: collaboration with one next step and status changes (verified 2026-10-29: agreed → in_progress → completed, `CollaborationSchema`-validated; stored in this browser only)
- [ ] J5: "Did this help?" recorded by both participants. Partial (2026-10-29): the visitor's answer is recorded and shown; the demo partner's answer is shown as "not recorded"

## AI
- [x] Meta Model API facts verified and cited in `docs/AI_AGENT_DESIGN.md` (verified 2026-11-05: voice wire confirmed vs official docs `dev.meta.ai/docs/api-reference/voice/*`; chat/ASR/deck ops live or mocked; rates/retention still unknown)
- [x] Real Meta provider for extraction, explanation, draft (+ next steps, tag grounding, chat, voice, deck outline); outputs Zod-validated (verified 2026-11-05: mocked HTTP, 357 tests pass; `extractGoal`, `chat`, `transcribeAudio` passed live)
- [x] With the key unset, every journey still works and says "demo" (verified 2026-11-04: `DemoProvider` selection + `demo-template` source labels asserted in `actions.test.ts` suites; demo badges throughout the UI)
- [x] Model failure (timeout / bad JSON) falls back without breaking the page (verified 2026-11-05: ASR 400 → labelled `demo-template` fallback through the live route; chat fallback asserted in tests)
- [x] Live smoke test performed with a real key (runbook in `docs/AI_AGENT_DESIGN.md`); outcome recorded there (2026-11-05: chat + voice + deck-outline paths live)

## Demo
- [x] Visual identity applied: logo mark, favicon, tokens, components, landing with exact tagline (2026-10-29)
- [ ] Full flow runs in under 3 minutes on a phone-width browser with no dead buttons. Automated run at 375px passes every step (2026-10-29); a timed human run is still owed
- [ ] Deployed URL works
- [ ] Demo script and backup recording. Partial (2026-11-05): `planning/DEMO_SCRIPT.md` refreshed with the delivery recording script + demo account; no recording, no timed human run
- [ ] Demo proves the north-star promise: one completed act of mutual help with recorded outcomes (not profile, match, or message counts). Flow complete in demo (Ask Arko + guided journey); human run still owed
