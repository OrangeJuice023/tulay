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
- [ ] Migrations for profiles, needs, offers, introduction_requests, collaborations, feedback
- [ ] RLS enabled on every table; a test shows a non-participant cannot read an introduction
- [ ] Unique pending introduction per (sender, recipient, need) enforced in the DB
- [x] Demo fixtures: at least 8 labelled synthetic members, at least 2 reciprocal pairs (verified 2026-10-28: 10 members, all `isDemo`, 3 reciprocal pairs, validated by `fixtures.test.ts`)
- [x] Founder path: fixtures + tests prove co-founder, founder-feedback, and early-user matches via the unchanged matching engine (verified 2026-10-28: 14 members, 4 reciprocal pairs, `fixtures.test.ts`; engine-level only, no UI yet)
- [x] Service-role and model keys never appear in the client bundle (verified 2026-10-29: no `MODEL_API_KEY`/`api.meta.ai` strings in `.next/static`; provider is server-only, no Supabase client yet)

## Journeys (`docs/PRODUCT_SPEC.md`)
- [ ] J1: goal text → AI-suggested needs/offers → user edits → saved. Partial (2026-10-29): goal, need and optional offer captured and Zod-validated, with tags chosen from fixture vocabulary; no AI suggestion (Meta stub) and nothing saved server-side
- [x] J2: need → up to 5 real candidates, deterministic order, "Demo" labels, honest empty state (verified 2026-10-29 in Edge: server action calls `findCandidates` on the fixture; empty state shown for an unmatched need; no contact details in any response)
- [ ] J3: drafted, edited intro sent; recipient accepts or declines; contact shown only on accept. Demo-complete (2026-10-29): editable draft, send gated on explicit consent, `IntroductionRequestSchema`-validated; recipient reply is a labelled simulation and no contact is shown. Needs a real recipient (Supabase)
- [x] J4: collaboration with one next step and status changes (verified 2026-10-29: agreed → in_progress → completed, `CollaborationSchema`-validated; stored in this browser only)
- [ ] J5: "Did this help?" recorded by both participants. Partial (2026-10-29): the visitor's answer is recorded and shown; the demo partner's answer is shown as "not recorded"

## AI
- [ ] Meta Model API facts verified and cited in `docs/AI_AGENT_DESIGN.md`
- [x] Real Meta provider for extraction, explanation, draft (+ next steps, tag grounding); outputs Zod-validated (verified 2026-10-29: mocked HTTP, 107 tests pass; no live request yet)
- [ ] With the key unset, every journey still works and says "demo"
- [ ] Model failure (timeout / bad JSON) falls back without breaking the page
- [ ] Live smoke test performed with a real key (runbook in `docs/AI_AGENT_DESIGN.md`); outcome recorded there

## Demo
- [x] Visual identity applied: logo mark, favicon, tokens, components, landing with exact tagline (2026-10-29)
- [ ] Full flow runs in under 3 minutes on a phone-width browser with no dead buttons. Automated run at 375px passes every step (2026-10-29); a timed human run is still owed
- [ ] Deployed URL works
- [ ] Demo script and backup recording
- [ ] Demo proves the north-star promise: one completed act of mutual help with recorded outcomes (not profile, match, or message counts)
