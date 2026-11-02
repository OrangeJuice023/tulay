# Agent Workflow

How three coding agents and the team share one repository without stepping on each other.
The rules are deliberately plain: Markdown task cards and written hand-offs, no orchestration
framework.

## Who does what

| Agent | Default lane | Preferred ownership |
| --- | --- | --- |
| **Claude Code** | Product experience: UI/UX, interaction design, accessibility, responsive layout, frontend implementation, frontend tests, browser verification, product language, demo flow polish | `apps/web/` (and `apps/mobile/` only if a mobile app is approved by ADR) |
| **Kilo** | Research and technical investigation: Philippine career-mobility problem, freelancer and career-shifter needs, competitors and alternatives, PH and international job-data sources, official API docs, evidence-backed comparisons | `research/`, research docs, explicitly assigned investigations |
| **Muse Code** | Architecture and integration: repo-wide changes, backend, Supabase migrations and RLS, shared schemas and contracts, Meta Model API integration, agent orchestration, integration tests, debugging, cross-cutting docs | `packages/`, `services/`, `supabase/`, `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/AI_AGENT_DESIGN.md`, test setup |

These are defaults, not walls. A task card can assign any file to any agent; the card wins.

Shared files that need a hand-off before editing: `AGENTS.md`, `README.md`, `packages/shared/*`
(the contract between web and backend), `.env.example`, `planning/*`.

### Instruction files

- `AGENTS.md` is canonical. Muse Code and Kilo read it directly. Do not run `muse init --force`
  or any generator that overwrites it.
- `CLAUDE.md` imports `AGENTS.md` and adds only Claude-specific guidance.
- Kilo: no extra rule files for now. `AGENTS.md` plus the task card is enough. Add a Kilo-specific
  rule only if a repeated Kilo mistake shows a gap, and record why.

### Kilo's evidence rules

Cite every claim with a URL and retrieval date. Label each finding **Confirmed** (primary source
read), **Reported** (secondary source) or **Hypothesis**. Check licence and terms before
recommending a data source. Search results, blog posts and unverified datasets are leads, not
evidence. Full protocol: `docs/RESEARCH_PROTOCOL.md`.

## Task card

Every task, whoever assigns it, is written down before work starts (in the PR/issue, or as an
item in `planning/NEXT_STEPS.md`):

```markdown
### <short title>
- Owner: Claude Code | Kilo | Muse Code | <person>
- Scope: what is in, and what is explicitly out
- Acceptance criteria: observable results a reviewer can check
- Verification: commands to run and flows to click through
- Expected files: paths to be created or changed
- Depends on / blocks: other tasks
```

If any field is unclear, ask the person who assigned the task before starting.

## Before starting

1. `git status -sb` and `git log --oneline -10`. Read what changed recently.
2. Confirm no other agent has the files you need in progress (check open hand-offs and branches).
3. Read the docs for the area you will touch.

## Working

- Work on a branch (`feat/…`, `fix/…`, `docs/…`, `research/…`).
- Stay inside the expected files. If you need to touch another lane's file, stop and note it in
  your hand-off, or ask.
- Never edit a file another agent is editing at the same time.

## Hand-off note

When you stop, finish, or pass work on, write this in the PR description or the task item:

```markdown
## Hand-off: <task title>
- Changed files: path (created / updated), …
- Checks run: command → result (pass / fail with the error). "Not run" if not run, and why.
- Done: what now works, verified how
- Not done: what is incomplete or known broken
- Next action: who does what next
- Open questions: decisions needed from a human
```

## Typical sequence for a feature

1. Kilo researches if the feature depends on outside facts (an API, a data source, user need).
2. Muse Code lands the contract: schema in `packages/shared`, migration, server action or route.
3. Claude Code builds the UI against that contract and verifies it in the browser.
4. Muse Code runs the end-to-end integration check.

Steps 2 and 3 can overlap once the schema is agreed, because they touch different files.
