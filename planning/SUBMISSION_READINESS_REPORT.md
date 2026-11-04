# Tulay — Submission Readiness Report

> **Addendum 2026-11-04 (after this report):** exactly one live Meta Model API
> `extractGoal` request has since passed (see `docs/AI_AGENT_DESIGN.md`
> runbook outcome). Every "zero live requests" line below was true when
> written and now reads "one live `extractGoal`; all other ops mock-only".
> Supabase and Resend still have zero live requests.

- **Date:** 2026-11-04 (stabilization pass, same day as snapshot audit)
- **Evidence root:** `D:\Tulay` — the authoritative repo (git HEAD `4951bf3`,
  branch `feat/tulay-reciprocal-match-improvements`, plus uncommitted WIP).
  Supersedes the `tulay-verify/` snapshot audit: that tree was verified
  byte-identical to this repo's HEAD (9/9 sampled hashes + file-list match).
- **Sources:** snapshot audit of HEAD, plus this session's stabilization work
  (build fix, attribution fixes, typecheck repair, full suite re-runs).
- **Writer scope:** audit + stabilization only; no new features, no Supabase
  implementation, no redesign, no commits. No secrets are printed here.
- **Status words:** IMPLEMENTED = code exists and is wired; VERIFIED mechanics =
  inspected + engine-tested but UI untested; SIMULATED = labeled demo behavior,
  no real effect; SYNTHETIC = fictional fixture data; PLANNED = design/docs only.

---

## 1. Executive Summary

Tulay (in `D:\Tulay`) is a **consent-first reciprocal-help demo** for Filipino
freelancers, career shifters, and founders-as-members. Its north star —
*"Your next career move shouldn't be a solo mission"* — is embodied as one
completed act of mutual help with a recorded outcome in a <3-minute demo.

**What is solid (all re-verified today in `D:\Tulay`):**

- **160/160 vitest passing** (11 files), `typecheck` green in all 3 workspaces,
  `lint` clean, **production build green** (19/19 pages).
- Deterministic matching, consent gating, and contact-stripping implemented
  **and tested**; AI/demo attribution labels fixed and regression-tested.
- Meta provider (`services/ai/meta.ts`) is a full Chat-Completions
  implementation, mock-verified by 25 tests; API key in a true private field;
  secret scans return zero matches.
- All routes statically complete with empty/loading states and Zod
  client+server validation; a demo script and submission triage exist.

**What is not ready:**

- **Zero live Meta Model API requests have ever been made**; wire details are
  Reported-not-Confirmed. Blocking only if the rules require live model use —
  and the rules themselves are uncaptured.
- No deployed URL, no `vercel.json`, no CI, zero video/script files, no timed
  human <3-minute run.
- No auth, no database (`supabase/` exists only as untracked WIP migrations +
  seed with no client wired); persistence is fixtures + `localStorage` only;
  the recipient reply is SIMULATED — the loop is single-sided and demo-only.

**Bottom line:** honest demo mechanics with real engine tests and a green
production build — submittable as a prototype with disclosure, with remaining
work on deploy, video, live-model evidence (if required), and rules/license.

---

## 2. Product Overview

- **Problem (explicitly a HYPOTHESIS pending Kilo validation, per
  `docs/PROJECT_DIRECTION.md`):** Filipino freelancers, career shifters, and
  independents need small, specific help (portfolio review, pricing, interview
  practice) but don't know who to ask; cold-messaging feels risky and is
  ignored; potential helpers lack low-pressure discovery.
- **Target users (primary):** Filipino freelancers/online workers, career
  shifters (e.g. BPO→tech/design), recent grads, founders-as-members
  (co-founder search, pitch feedback, early users). Secondary: other countries
  later.
- **Value proposition:** state a goal + specific need → deterministic
  complementary-people search → mutual-consent introduction → one concrete
  collaboration with a next step → record "did this help".
- **Differentiation (in-repo, ungrounded vs competitors):** starts from
  goal/need, not profile browsing; reciprocal ("You can help each other")
  without pressure; consent before any contact; AI does language work while
  deterministic code picks real people; success = completed acts of help, not
  likes/followers. Research note: Kilo 2026-11-02 report finds
  reciprocal+consent+outcome-tracking is the defensible niche; competitor and
  market docs are otherwise empty.
- **Explicitly NOT:** a chatbot, feed, job board, mentor directory, or
  investment platform.
- **Pathways:** Change careers (Mara, BPO→UX + 8-role Landas-inspired career
  map), Grow as freelancer (Jun), Build something together (Diego); 4th persona
  Ate Liza (experienced VA mentor).
- **Reciprocal engine:** one `findCandidates` engine
  (`packages/shared/matching.ts`: tag+keyword scoring, reciprocity bonus,
  stable ranking, contact stripped) serves all three pathways with zero engine
  changes; fixtures prove co-founder/pitch-feedback/early-user matches.
- **Judges should remember:** consent-first (decline reveals nothing),
  real-people-only (Demo-labeled SYNTHETIC data, empty state over invention),
  Muse Spark for extraction/explanation/drafts + code for retrieval/consent,
  demo-mode fallback, judged by one recorded "helped" outcome.

---

## 3. Feature Inventory

Legend: ✅ VERIFIED mechanics (engine-tested, UI untested, SYNTHETIC-dependent,
not production-ready) · 🟡 PARTIAL · ❌ NOT IMPLEMENTED · 🎭 SIMULATED.

| # | Feature | Status | Evidence |
|---|---------|--------|----------|
| 1 | Landing + brand | ✅ | `apps/web/app/page.tsx`, `layout.tsx` (real `next/font` Inter), `components/Logo.tsx`, `Arko.tsx`, `MobileNav.tsx`, `globals.css` tokens; hero, 4-step how-it-works, 3 path tiles, consent banner. Member count is SYNTHETIC (fixture via `getCommunityStats`). |
| 2 | Career onboarding + 8-role map | ✅ | `/start` path step (`PathCard` + `lib/paths.ts`), intake form, career-mapping UI, `mapCareerAction`, `packages/shared/career-map.ts` 8-role catalog; engine tested (9 tests). |
| 3 | Freelancer pathway | 🟡 | `paths.ts` copy/samples/suggested-tags, same `findCandidates` engine; `/explore` "Freelance Studio — Preview: in design" lists unbuilt tools. |
| 4 | Founder pathway | 🟡 | `paths.ts` company config + founder fixtures + founder-path tests; `/explore` "Venture Studio — Preview: in design"; explicit no-investors note. |
| 5 | Needs/offers capture | ✅ | `Journey` intake with `NeedSchema`/`OfferSchema`/`CareerGoalSchema`/`ProfileSchema` client validation + focus-first-error; tag pickers from fixture vocabulary; server revalidation; schema-tested. |
| 6 | Match explanations | ✅ deterministic | `MatchCard` shows deterministic reasons + sharedTags + reciprocity via `startBrowsingAction` + `ConciergeSession` one-at-a-time browsing; engine tested (matching 21 + fixtures 15 + concierge 24). AI `explainMatch` has **zero call sites** in `apps/web`. |
| 7 | Criteria attribution | ✅ fixed 2026-11-04 | `criteriaSource` is now `ai`/`demo`/`as-written`: DemoProvider echo reports `demo` ("no model call"), live model reports `ai`, failure falls back to `as-written`. Regression-tested. |
| 8 | Intro-request drafting | 🟡 (delivery 🎭) | `draftIntroductionAction` → template → editable textarea → consent checkbox gates Send → `IntroductionRequestSchema` → pending view. Draft note follows server source (`LIVE_TEXT_NOTE`/`DEMO_TEXT_NOTE`). No message is ever sent. |
| 9 | Consent handling | ✅ sender / 🎭 recipient | Sender consent ✅ (checkbox + "What recipient sees"). Recipient reply 🎭 SIMULATED via labeled Demo accept/decline + withdraw. Contact reveal on accept ❌ (explicit nothing-shown copy). `contactMethod` stripped from matches (tested). |
| 10 | Next-step suggestions | ✅ mechanics / 🎭 content | `suggestNextStepsAction` → 3 fixed generic strings; pick-or-write-own; `CollaborationSchema`-validated; note follows server source. |
| 11 | Collaboration tracking | ✅ demo-only | agreed → in_progress → completed + `/collaborations` list from `localStorage` (`tulay.demo.collaborations.v1`, clear button, private-mode fallback); browser-only. |
| 12 | Recorded outcomes | 🟡 single-sided | yes/partly/no + note via `CollaborationFeedbackSchema`; partner answer shown as **Not recorded** (demo members cannot respond). |
| 13 | Demo persistence | ✅ by design | `lib/demo-store.ts` `localStorage` only; **no server writes anywhere** in the web app. |
| 14 | Authentication | ❌ NOT IMPLEMENTED | No login/signup/session code anywhere (searched). Profile page is an intentional "Profiles arrive with sign-in" empty state. |
| 15 | `explainMatch` / `suggestTags` wiring | ❌ zero callers | Ops exist in providers + schemas + tests only; no `/concierge` route (contract doc only). |
| 16 | Directory repositories (WIP) | 🟡 uncommitted | `members.ts` (directory contracts, filters, repository interfaces) + `demo-repository.ts` (`LocalDemoRepository`, demo-only by construction); tested (5 tests). `RealCommunityRepository` has no implementation. |
| 17 | Empty/loading/error states | ✅ | `EmptyState`, `LoadingState`, route skeletons, `LinkPending` spinners, `error.tsx`; all untested. |
| 18 | Form validation | ✅ | Client+server Zod, inline `role=alert` errors, `noValidate` + focus-first-error. |

---

## 4. Technology Stack

- **Frontend:** Next.js 16.4.3 App Router, React 19.3.0, TypeScript strict;
  path alias `@/*` (`apps/web`).
- **Language:** TypeScript throughout; Zod 3 for contracts.
- **Styling:** Tailwind CSS 4 via `@tailwindcss/turbopack` + `@theme` tokens in
  `app/globals.css`; `next.config.ts` keeps `turbopack.rules` for CSS,
  `cacheComponents`, `partialPrefetching`.
- **Component system:** hand-rolled, no UI library (`ui.tsx`, `MatchCard`,
  `PathCard`, `Arko` mascot, `Logo`, `MobileNav`).
- **Workspace:** npm workspaces `apps/* packages/* services/*`; web depends on
  `@tulay/shared` + `@tulay/ai`; `transpilePackages` both; engines `node>=20.9`.
- **Shared core:** `packages/shared` — schemas, `matching.ts` (ADR-0001),
  `concierge.ts`, `career-map.ts`, plus WIP `members.ts` /
  `demo-repository.ts`; `@types/node` in devDependencies for node-API typings.
- **AI abstraction:** `services/ai` 6-op `AIProvider`; `getAIProvider` returns
  Meta only if `AI_PROVIDER=meta` AND a key is set, else `DemoProvider`.
- **Database:** NONE wired. `supabase/` holds untracked WIP (config, seed,
  migrations 0001 real_members / 0002 demo_dataset / 0003 storage); no client
  code references `@supabase` anywhere in `apps/`. Persistence = fixture
  (server) + `localStorage` (client).
- **Auth:** NONE. Fixed `DEMO_SEEKER_ID`; RLS design-only.
- **API surface:** single route `GET /api/health` (`{ok, demoMode, provider,
  contractOk}`, configuration only — never pings the model API); all other
  server I/O via 9 server actions in `app/start/actions.ts`.
- **Testing:** vitest, include `packages/**`, `services/**`,
  `apps/web/**` (11 test files, 160 tests); zero UI/component tests;
  Playwright recommended but absent.
- **Deployment:** target Vercel+Supabase, NOT set up: no `vercel.json`,
  `Dockerfile`, or CI; `.gitignore` covers `.next`/`.vercel`/env.

---

## 5. Architecture and Data Flow

**Layers:** `packages/shared` (schemas / matching / concierge / career-map /
WIP members+demo-repository, no I/O) → `services/ai` (6-op provider;
demo default, meta only if `AI_PROVIDER=meta` + key) → `apps/web` server
actions (9 actions, `ActionResult`) → `Journey.tsx` (~1353-line client
component; intro/collab/outcome state client-side, validated, `localStorage`
persisted).

**Matching engine (`matching.ts`, pure, no model calls):** eligibility =
discoverable, not-self, active offers; relevance requires ≥1 shared tag or
keyword; +10/tag, +2/keyword capped +10, +5 reciprocity (open needs only;
reciprocity alone never matches — explicit test); stable ranking; default
limit 5; `contactMethod` stripped; malformed need throws, malformed members
skipped; never filters `isDemo`.

**Concierge (`concierge.ts`):** session cursor browsing/accepted/exhausted;
accept/skip/refine; `contactVisibleTo` true only when accepted and party;
`createCollaboration` requires accepted+id+same parties. No `/concierge`
route — helpers reused inside `/start` only.

**Directory layer (WIP, uncommitted):** `members.ts` defines
`DirectoryMember` contracts, `memberMatchesFilters`, and
`DemoCommunityRepository` / `RealCommunityRepository` interfaces;
`demo-repository.ts` implements the demo side over in-memory rows,
rejecting anything not `isDemo` at construction. Nothing in `apps/web`
consumes it yet.

**End-to-end flow:**

1. `/start` intake (path, goal/need/offer + tags) → `extractGoalAction`
   (model structuring with live/demo label, user confirms) → Need.
2. `startBrowsingAction`: career-direction enriches need → `findCandidates`
   over fixture → `extractCriteria` with honest `ai`/`demo`/`as-written`
   source → one-at-a-time `MatchCard` skip/accept.
3. Accept → `draftIntroductionAction` (edit + consent gate) → pending →
   🎭 SIMULATED reply → Collaboration (agreed).
4. `suggestNextStepsAction`; agreed → in_progress → completed → outcome
   (yes/partly/no) → done + `localStorage` → `/collaborations`.

**Known weaknesses:** `explainMatch`/`suggestTags` unwired; English-only
matching tokenizer (Taglish untested); 8-role career map with hard-fail on
unknown targets; `Journey.tsx` monolith; `data/README.md` provenance empty;
`data/raw` + `data/processed` hold only `.gitkeep`.

---

## 6. Meta Model API Integration Status

**Status: NEEDS WORK — implemented and mock-verified, zero live requests ever.**

- **Implementation (`services/ai/meta.ts`) is real:** POST
  `{base}/chat/completions`, Bearer key in a true private `#apiKey`;
  `response_format: json_schema` derived from Zod; all 6 ops Zod-validated;
  `suggestTags` enforces vocabulary subset; 30s timeout; 8000-char input cap;
  **zero retries**; typed `MetaProviderError` (config/http/network/timeout/
  protocol/validation); defaults base `https://api.meta.ai/v1`, model
  `muse-spark-1.3`; `MODEL_API_KEY` canonical, `META_MODEL_API_KEY` fallback.
- **Demo provider (`services/ai/demo.ts`):** deterministic templates, no
  network — fixed needs/offers/skills, keyword-scan criteria, fixed strings.
- **Mock verification:** 25 `meta.test.ts` tests + `index.test.ts` pass on
  injected mock fetch (key-absence-from-JSON/errors asserted). **No live
  request has ever been made** (wire details Reported 2026-10-29, Kilo primary
  confirmation open; smoke-test runbook in `docs/AI_AGENT_DESIGN.md` unrun).
- **Health route:** reports `demoMode`/`provider`/`contractOk` from live
  provider selection — but "meta" means *configured*, it **never pings the
  API**, so reachability is unverified.
- **UI labeling (fixed 2026-11-04):** extract-goal assist, criteria source,
  draft notes, and suggestion notes all distinguish live model output from
  demo templates; the stale "stub" comment is rewritten.
- **Unknowns:** rate limits, cost, data-retention terms; Taglish extraction
  quality; whether any deployed environment sets the key (no deployment
  inspected — none exists).

---

## 7. Testing and QA Results

### Checks actually executed in `D:\Tulay` (2026-11-04 stabilization)

| Check | Outcome |
|-------|---------|
| `npm test` (vitest 5.0.5) | ✅ exit 0 — **160 passed, 11 files**: concierge 24, fixtures 15, ai/meta 25, shared/index 38, matching 21, demo-repository 5, career-map 9, stories 6, ai/index 14, web actions 2, zz-debug 1 |
| `npm run typecheck` | ✅ exit 0 — web, `@tulay/shared`, `@tulay/ai`, no errors (after WIP test-file repair) |
| `npm run lint` | ✅ exit 0, clean (web `eslint`) |
| `npm run build` | ✅ exit 0 — compiled 3.8s, TypeScript clean, 19/19 static pages (confirmed twice, incl. after all edits) |
| Focused `demo-repository.test.ts` | ✅ 5/5 (post import-fix regression proof) |
| Focused `actions.test.ts` (new) | ✅ 2/2 (attribution: `demo` source + `demo-template` draft source) |
| Secret scans | ✅ zero matches (keys/tokens/private-keys ex-node_modules/.next); only `.env.example` placeholders; no `.env` files; components contain zero contact/email/phone identifiers |
| Contact-gating tests | ✅ `matching` + `concierge` assert contact-stripping; `fixtures` enforces `example.com` contacts |
| Static route inspection | ✅ all routes complete; error/loading screens present; zero TODO/FIXME/placeholder/lorem matches |

### Test-count history — resolved

- **107** = dated 2026-10-29 Meta-provider milestone snapshot (superseded).
- **146** = unexpanded literal `it(` block count (stale README claim).
- **152** = true HEAD-tree count (146 + one 6-case `it.each`).
- **160** = current `D:\Tulay` count: 152 + demo-repository 5 + zz-debug 1 +
  web attribution 2. README, implementation gates, MVP checklist, and next
  steps all updated to 160.

### QA gaps (honest)

- **Zero UI/component tests** — all UI behavior rests on static inspection
  plus engine/server-action tests.
- **No dev-server or browser run performed** — runtime rendering, responsive
  behavior, and live API calls unverified (one earlier note claimed an Edge
  check; treated as UNVERIFIED for lack of evidence).
- `zz-debug.test.ts` is a temporary debug probe (console-spelunking, asserts
  nothing) — kept and fixed per its author's WIP, not deleted.

---

## 8. Demo Scenario

**5-minute career-shifter run** (all members SYNTHETIC, all replies
🎭 SIMULATED — label everything on screen and in narration):

1. Alex (fictional seeker) opens `/start` (`/demo` redirects there by design),
   loads the career sample: support → UX, need `portfolio-review`, offer
   `interview-practice`.
2. Muse structuring step — labeled demo-template (DemoProvider echo, no model).
3. Meets SYNTHETIC Bianca T. ("Matching skills: portfolio-review" +
   "You can help each other") with `DemoBadge`; criteria line reads "Demo
   rules structured your search (no model call)".
4. Checks consent ("What recipient sees"), edits draft, sends → pending
   (🎭 SIMULATED — nothing is sent).
5. Labeled Demo accept ("no message was sent") → Collaboration (agreed).
6. Agrees next step: "30-min portfolio review call by Friday"
   (pick-or-write-own; the 3 suggestions are fixed generics).
7. agreed → in_progress → completed; records "Yes, I moved forward" → done
   summary shows partner answer **"Not recorded: demo members cannot
   respond"**.
8. `/collaborations` shows the persisted demo record (`localStorage`); stories
   carry `FICTIONAL_STORY_LABEL` — never present stories as testimonials.

**Founder option (same beats):** company-path sample → SYNTHETIC Katrina Uy
reciprocal co-founder match → same consent → next-step → outcome flow.

**Demo caveats:** no timed human <3-minute run performed; zero video/script
files in the repo; demo-script checklist item unchecked. Recording + backup +
one timed run is feasible pre-deadline.

---

## 9. Security and Privacy Assessment

**Verdict: READY-FOR-DEMO, with mandatory disclosure** (no-auth,
localStorage-only, simulated replies).

- **Consent enforced:** send gated on explicit checkbox + non-empty draft;
  waiting step uses labeled Demo accept/decline with "no message was sent".
- **Contact gating:** `contactVisibleTo` false unless accepted; collaborate
  step shows "nothing is shown" instead of contact details. IMPLEMENTED
  contact reveal: NONE.
- **Exposure surface:** `PublicProfileSchema` omits `contactMethod`;
  concierge re-strips on session start; fixture is server-only
  (`lib/community.ts`); `MatchCard` renders names/goals/offers/tags/reasons
  only; zero contact/email/phone identifiers in components.
- **Secrets:** zero-match scans; `.env.example` placeholders only; `.gitignore`
  covers env/`.next`; key server-only (private `#apiKey`, never serialized;
  `MetaProviderError` excludes key/prompt); keys read in provider
  constructors only; no `NEXT_PUBLIC_*` key vars; client imports server
  actions only, never `@tulay/ai`.
- **Auth/persistence:** no `supabase/` client, no auth; `localStorage` holds
  visitor text + fictional names only, with "Clear demo data"; RLS is
  design-doc only.
- **Honesty markers:** `DemoBadge` + demo notices on landing/matches/intro/
  collaborations/stories; footer hackathon-prototype disclaimer;
  `KNOWN_ISSUES.md` tracking; README Status-and-limitations section.
- **Not independently verified:** deployed-env exposure (nothing deployed);
  live Meta rate limits/cost/retention.

---

## 10. Submission Readiness Scorecard

| Area | Rating | Basis |
|------|--------|-------|
| Description / tagline | ✅ Ready | README tagline + pathways match the north star; landing carries it |
| Problem framing | 🟡 Needs work | Labeled "hypothesis"; market research not started |
| Differentiation | 🟡 Needs work | In-repo differentiators articulated; competitor findings empty |
| Meta Model API use | 🟡 Needs work | Real provider + 25 mocked tests, but zero live requests ever |
| Demo mechanics | ✅ Ready | Full intake → matches → consent → collaborate → outcome flow verified; 160/160 tests |
| Repo layout | ✅ Ready | Workspaces, docs + ADRs, planning, research, data conventions |
| README | ✅ Ready | Install/run/test/deploy-env/status/limits present; counts current (160) |
| Deploy | 🟡 Needs work | No `vercel.json`, URL, or CI; standard Next.js 16 app so feasible |
| Video | 🟡 Needs work | Zero video/script files; no timed run; flow designed <3min |
| Privacy for demo | ✅ Ready-for-demo | Consent enforced, contacts stripped, no secrets; must disclose demo-only limits |
| Limitations disclosure | ✅ Ready | `KNOWN_ISSUES.md` + README + checklist honest |
| Production build proof | ✅ Ready | `npm run build` exit 0, 19/19 pages (fixed + verified 2026-11-04) |
| Label accuracy | ✅ Ready | 3 conflation bugs fixed + regression-tested 2026-11-04 |
| Rules / license | 🟡 Needs work | Hackathon rules and license choice not captured (`KNOWN_ISSUES` #10, #11) |

---

## 11. Critical Blockers

1. **Zero live Meta requests + Reported-not-Confirmed wire** — if hackathon
   rules require live model use, this is submission-blocking. Rules
   themselves are unknown (blocker 5 compounds this). Needs a key holder +
   the `docs/AI_AGENT_DESIGN.md` runbook (Kilo/Muse Code).
2. **No deployed URL / CI / `vercel.json`** — deploy feasibility is
   assertion without evidence. Needs a Vercel project + first deploy
   (Muse Code).
3. **Zero video/script files + no timed human <3-minute run** — the demo
   artifact does not exist yet (Claude Code, after deploy or a dev URL).
4. **Demo-only loop by design (disclose, don't fix pre-deadline):** auth
   not implemented, recipient reply 🎭 SIMULATED, contact reveal not
   implemented — single-sided. Supabase/auth/RLS, real inbox, tag-UI
   wiring, market research, and Android are all CUT per the
   `HACKATHON_TIMELINE` freeze rule.
5. **Rules / deadline-TZ / license uncaptured** — cannot confirm what
   "done" means or under what license the submission ships.

**Resolved 2026-11-04 (were blockers, now verified):** production build
green; AI/demo label accuracy fixed + regression-tested; test-count docs
current (160); typecheck green in all workspaces.

---

## 12. Final Prioritized Action Plan

Sizes: S = small, M = medium. Owners: Muse Code (architecture/backend/AI),
Claude Code (frontend/UX/polish), Kilo (research/verification).

**Done 2026-11-04:** authoritative-repo verification; build fix; 3 label
fixes + regression test; WIP test-file typecheck repair; README/gates/
checklist/issues count updates; this report.

| ID | Action | Size / deps / owner | Why |
|----|--------|---------------------|-----|
| M3 | Meta live smoke test via `AI_AGENT_DESIGN.md` runbook + record outcome **including failure** | S–M, needs key holder, Kilo | Converts "zero live requests" into evidence either way |
| M4 | Confirm wire details vs official Meta docs | S, needs docs/key holder, Kilo | Lifts Reported-not-Confirmed |
| M6 | Vercel deploy + verify URL | M, needs Vercel project, Muse Code | Closes §11 #2 |
| M7 | Record demo video + backup + one timed human <3-minute run | M, after M6 or a dev URL, Claude Code | Closes §11 #3 |
| M8 | Capture hackathon rules/deadline-TZ + choose license | S, no deps, Claude Code | Closes §11 #5; unblocks the "live model required?" question |

SHOULD (small, if time): S1 — submission-text disclosure paragraph
(demo-only / no-auth / localStorage / simulated replies), Claude Code.
S2 — human browser pass at desktop + mobile widths, Claude Code.

CUT before the deadline (per freeze rule — do not start): Supabase
migrations/auth/RLS, real recipient inbox, AI tag-suggestion UI wiring,
competitor/market research, Android app, MCP, new architecture.

---

## 13. Post-Hackathon Roadmap

Explicitly AFTER the deadline, in rough priority order:

1. **Persistence + auth:** finish Supabase (migrations exist as WIP) +
   auth/RLS + server-side persistence; real sign-up decision (J1).
2. **Two-sided loop:** real recipient inbox + contact-reveal-on-accept
   (wire `respondToIntroduction`/`withdrawIntroduction`/`contactVisibleTo`
   into the UI; today `respond()` bypasses them).
3. **AI wiring:** wire `explainMatch`/`suggestTags` into server actions +
   UI; build `/concierge` per `docs/CONCIERGE_CONTRACT.md`; consume the
   WIP directory repositories from `apps/web`.
4. **Filipino quality:** Taglish tokenizer + extraction-quality eval;
   rate-limit/cost/retention hardening + retries (today: zero retries).
5. **Career map:** expand beyond 8 curated roles; soften unknown-target
   hard-fail.
6. **Quality gates:** UI/component tests + Playwright + CI; `Journey.tsx`
   decomposition (~1353 lines); retire or promote `zz-debug.test.ts`.
7. **Validation:** competitor/market research per the Kilo plan; resolve
   problem-hypothesis status; fill `source-registry.md`.
8. **Hygiene:** license/rules capture if missed; status-line refreshes.
9. **Mobile:** native app only with an ADR.

---

## 14. Appendix of File Paths and Routes

**Root:** `D:\Tulay` (git HEAD `4951bf3`,
`feat/tulay-reciprocal-match-improvements`; uncommitted WIP preserved, nothing
committed by this session).

**Routes (all statically complete unless noted):**

- `/` (`apps/web/app/page.tsx`) — landing, CTAs to `/start`, demo label,
  responsive classes.
- `/start` (`page.tsx` + `Journey.tsx` + `actions.ts`) — 8-step journey:
  path → intake → matches → introduce → waiting → collaborate → outcome →
  done. Zod validation with inline errors + focus; consent checkbox gates
  send; honest `ai`/`demo`/`as-written` criteria line; responsive ActionBar.
  Runtime flow UNVERIFIED (no dev-server/browser run).
- `/onboarding`, `/find-help`, `/demo` — intentional `redirect('/start')`.
- `/explore` — 3 studios (career live, freelance/venture "Preview: in
  design"); all CTAs to `/start`.
- `/profile` — intentional "Profiles arrive with sign-in" empty state.
- `/collaborations` (+ `CollaborationList.tsx`, `demo-store.ts`, key
  `tulay.demo.collaborations.v1`) — demo-only `localStorage` list.
- `/stories` + `/stories/[slug]` — `FICTIONAL_STORY_LABEL`,
  `generateStaticParams`, `notFound()` on unknown slug.
- `/our-story` — static brand essay with honest demo-vs-platform note.
- `/api/health` — GET `{ok, demoMode, provider, contractOk}`; configuration
  only, never pings the model API.
- Shells: `error.tsx`, route `loading.tsx` skeletons, skip link, sticky
  header, `MobileNav` + `DesktopNav`.

**Key files:**

- Engine: `packages/shared/matching.ts`, `schemas.ts`, `concierge.ts`,
  `career-map.ts`, `index.ts`; WIP: `members.ts`, `demo-repository.ts`
- AI: `services/ai/index.ts`, `demo.ts`, `meta.ts`
- Web: `apps/web/app/start/actions.ts`, `Journey.tsx`,
  `lib/community.ts` (server-only fixture), `lib/demo-store.ts`,
  `lib/paths.ts` (`DEMO_SEEKER_ID`)
- Data: `data/fixtures/demo-community.json` (14 members, 1
  `discoverable:false`, all `isDemo`); WIP: `data/fixtures/demo-directory.json`
  (12 members, 4 per studio)
- Direction docs (15/15): `AGENTS.md`, `README.md`, `CLAUDE.md`,
  `docs/PROJECT_DIRECTION.md`, `PRODUCT_SPEC.md`, `ARCHITECTURE.md`,
  `DATA_MODEL.md`, `AI_AGENT_DESIGN.md`, `SECURITY_AND_PRIVACY.md`,
  `TECH_STACK.md`, `planning/MVP_CHECKLIST.md`, `NEXT_STEPS.md`,
  `KNOWN_ISSUES.md`, `HACKATHON_TIMELINE.md` (+ `CONCIERGE_CONTRACT.md`,
  `docs/product/10-implementation-sequence.md`)
- Tests (11 files, the ONLY `*.test.*` files in the tree): `packages/shared`
  matching/concierge/career-map/fixtures/index/stories/demo-repository/
  zz-debug + `services/ai` index/meta + `apps/web/app/start/actions`
- This report: `planning/SUBMISSION_READINESS_REPORT.md` (authored
  2026-11-04 from live findings in this repo; supersedes the HEAD-snapshot
  audit kept at `C:/Users/Gervi/tulay-verify/`)

**Present as untracked WIP (not in HEAD):** `supabase/` (config, seed,
migrations 0001–0003), `data/fixtures/demo-directory.json`,
`packages/shared/{members,demo-repository}.ts`,
`packages/shared/{demo-repository,zz-debug}.test.ts`, Supabase dep entries
in `package.json`/`apps/web/package.json`/`package-lock.json`,
`@types/node` in `packages/shared` devDependencies, attribution fixes +
`actions.test.ts`, doc count updates, this report.

**Confirmed absent:** `vercel.json`, `Dockerfile`, `.github/` CI,
`.env`/`.env.local`, `apps/web/app/concierge/`, any `.mp4`/`.mov`/
demo-script files, Playwright, any `@supabase` import in `apps/`.

---

*End of report. Stabilization session, 2026-11-04. All claims above are
grounded in commands executed against `D:\Tulay` in this session; carried
gaps (no browser run, no live Meta request, undeployed) are stated inline.*
