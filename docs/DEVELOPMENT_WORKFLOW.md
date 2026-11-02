# Development Workflow

Day-to-day setup. Agent roles and hand-offs: `docs/AGENT_WORKFLOW.md`. Commits and branches:
`docs/COMMIT_CONVENTIONS.md`.

## Getting started

1. Clone the repo.
2. `cd apps/web && npm install`.
3. Optional: copy `.env.example` to `apps/web/.env.local` and fill values. Without it, demo mode.
4. Supabase migrations: none yet (see `planning/NEXT_STEPS.md`).
5. `npm run dev`.

## Before committing

- [ ] `npm run lint` passes
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes
- [ ] Tests pass (once a runner exists)
- [ ] No secrets or ignored data staged
- [ ] Relevant docs updated

## Code style

TypeScript strict, functional React components, Tailwind, Zod at every boundary (form input,
model output, route input). Use `next/link` for internal links. Follow the patterns already in
the file you are editing; comment only where intent is not obvious.

## Troubleshooting

- `'next' is not recognized` / missing `.bin`, or "not a valid Win32 application" for
  `@next/swc-win32-x64-msvc`: `node_modules` is a partial or corrupt install. Delete
  `apps/web/node_modules` and `apps/web/.next`, then `npm install` again (seen 2026-10-28).
