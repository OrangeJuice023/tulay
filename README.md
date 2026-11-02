# Tulay

**"Your next career move shouldn't be a solo mission."**

Tulay ("bridge" in Filipino) is a community-powered AI agent for freelancers, career shifters and
independent workers, starting in the Philippines. You say what you are trying to achieve and what
specific help you need. Tulay finds real members whose offers match your need (and who need
something you can offer), asks both of you before making an introduction, helps you agree on a
small concrete collaboration, and records whether it helped.

Product direction (canonical): `docs/PROJECT_DIRECTION.md`.

Built for the Meta Global AI Developer Hackathon (Oct 26 to Nov 4, 2026).

## Status (2026-10-28)

Early scaffold. Honest summary:

| Area | State |
| --- | --- |
| Web app (`apps/web`) | Next.js pages for home, onboarding, find help, collaborations, profile. Static placeholders: forms do not submit, "Demo User" cards are hard-coded. |
| Shared schemas (`packages/shared`) | Zod schemas for profile, extracted goal, match explanation. Not imported by the web app yet. |
| AI layer (`services/ai`) | Deterministic demo provider. The Meta provider is a stub that returns demo output. |
| Database (`supabase/`) | No migrations yet. |
| Tests | None configured. |

See `planning/NEXT_STEPS.md` and `planning/KNOWN_ISSUES.md`.

## Setup

Prerequisites: Node.js 20 or later (verified with 24.11.1), npm.

```bash
cd apps/web
npm install
cp ../../.env.example .env.local   # optional; without it the app runs in demo mode
npm run dev                         # http://localhost:3000
```

## Environment variables

Defined in `.env.example` (placeholders only; never commit real values).

| Variable | Where it is used | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server | Public project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser + server | Public anon key; safe only with RLS on every table |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | Bypasses RLS. Never import in client code. |
| `MODEL_API_KEY` | server only | Meta Model API key (canonical name; never commit it) |
| `META_MODEL_API_KEY` | server only | Legacy fallback for the same key |
| `META_MODEL_API_URL` | server only | API base URL (default `https://api.meta.ai/v1`) |
| `META_MODEL_MODEL` | server only | Model id (default `muse-spark-1.3`) |
| `AI_PROVIDER` | server only | `demo` (default) or `meta` (used only when a key is set) |
| `NEXT_PUBLIC_APP_URL` | browser + server | Base URL |

**Demo mode:** if `AI_PROVIDER` is not `meta` or no API key is set, the AI layer uses the
deterministic `DemoProvider` (no network calls). If Supabase variables are missing, the app
reads synthetic people from `data/fixtures/`. Demo mode is always labelled in the UI.

**Meta mode:** set `AI_PROVIDER=meta` and `MODEL_API_KEY` in `apps/web/.env.local` (server
only; never commit it) and restart. `/api/health` reports the live selection. The provider
is verified with mocked HTTP only (`npm test` covers request shape, auth, all five
operations, and every failure class); no live API request has been performed yet. Details
and provenance: `docs/AI_AGENT_DESIGN.md`.

## Commands

Run from `apps/web/`:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Type check |
| `npm run build` | Production build |

No test runner yet; adding one is in `planning/NEXT_STEPS.md`.

## Demo

The demo script is not ready yet. Target flow (see `docs/PRODUCT_SPEC.md`): a career shifter
types a goal → Tulay extracts the specific need → shows two or three labelled demo members with a
complementary offer and a short explanation → the user edits and sends an introduction request →
the other member accepts → both agree on one concrete next step → the user marks it helpful.

Every demo beat must answer: does this help someone make their next career move with other
people, rather than having to do it alone?

## Documentation

| Doc | Purpose |
| --- | --- |
| `AGENTS.md` | Rules for every coding agent (canonical) |
| `docs/AGENT_WORKFLOW.md` | Claude Code / Kilo / Muse Code lanes and hand-offs |
| `docs/PROJECT_DIRECTION.md` | Product north star (canonical), problem, users, scope, success criteria |
| `docs/PRODUCT_SPEC.md` | User journeys and requirements |
| `docs/TECH_STACK.md`, `docs/ARCHITECTURE.md` | Stack choices, system boundaries |
| `docs/DATA_MODEL.md`, `docs/AI_AGENT_DESIGN.md` | Entities, model responsibilities and safety |
| `docs/SECURITY_AND_PRIVACY.md` | Access control, consent, secrets |
| `docs/RESEARCH_PROTOCOL.md`, `research/` | How research is done and where it lives |
| `docs/COMMIT_CONVENTIONS.md` | Commits and Git workflow |
| `planning/` | Next steps, MVP checklist, timeline, known issues |

## License

Not chosen yet (unresolved).
