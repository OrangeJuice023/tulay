# Next Steps

Prioritized. Each item is a task card (format in `docs/AGENT_WORKFLOW.md`). Updated 2026-10-28.

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

## 1. Meta Model API facts, primary confirmation (Kilo)
Kilo's research report never landed; confirm the implemented wire values (base URL, auth,
model, `json_schema` shape) against official docs with citations, plus rate limits, cost,
and data-retention terms. Then someone with a key runs one live request.

## 2. Supabase schema, RLS and auth (Muse Code)
Migrations and RLS from `docs/DATA_MODEL.md`; RLS test; magic-link auth.

Then Claude Code swaps the browser-local demo store (`apps/web/lib/demo-store.ts`) and the
simulated reply for real records and a real recipient inbox.

## 3. AI text labels + tag suggestions in the UI (Claude Code)
Use `extractGoal`/`suggestTags` to suggest need/offer tags from the goal text (J1), and
replace the "Demo template" labels in `app/start/Journey.tsx` with "AI suggestion" only
when the source is the real model. (Follow-up preserved from the provider milestone.)

## 4. Deploy and demo script (Claude Code + Muse Code)
Deploy, then a demo script that proves one completed act of mutual help (the north-star test
in `docs/PROJECT_DIRECTION.md`). Suggested demo: "Build a company" → sample → Katrina Uy
(reciprocal co-founder match) → introduction → next step → "Yes, I moved forward".

## Research in parallel (Kilo)
PH market questions, competitor landscape, job-source registry, user-validation conversations.
