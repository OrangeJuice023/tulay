# Commit Conventions and Git Workflow

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/): `type: short imperative summary`,
optional scope in parentheses, body explaining why when it is not obvious.

| Type | Use for | Example |
| --- | --- | --- |
| `feat` | New user-facing behaviour | `feat: add reciprocal matching flow` |
| `fix` | Bug fix | `fix: prevent duplicate introduction requests` |
| `docs` | Documentation only | `docs: document Meta Model API integration` |
| `research` | Reports under `research/` | `research: evaluate Philippine job data sources` |
| `test` | Tests only | `test: cover collaboration status transitions` |
| `refactor` | No behaviour change | `refactor: separate matching logic from API routes` |
| `chore` | Tooling, config, deps | `chore: configure Supabase migrations` |

Optional scopes: `web`, `ai`, `shared`, `db`, `research`, for example `feat(web): add consent screen`.

## Rules

- One logical change per commit. Do not mix a refactor with a feature.
- Stage files by name (`git add path/to/file`), not `git add .`.
- Run the checks for what you touched before committing (`AGENTS.md`, Commands).
- Never commit: secrets, `.env*` other than `.env.example`, real user data, private messages,
  `data/raw/`, `data/processed/`, `node_modules/`, `.next/`, `*.tsbuildinfo`, large binaries.
- Commit `apps/web/package-lock.json` with dependency changes.
- Agents never commit unless a human asks for it in that task.

## Branches and PRs

- Default branch: `master` (the current repo default). Work on `feat/…`, `fix/…`, `docs/…`,
  `research/…`.
- Rebase or merge the latest default branch before opening a PR.
- PR description: what changed and why in plain language, files changed, checks run with results,
  what is not done, and the hand-off section from `docs/AGENT_WORKFLOW.md`.
- A human reviews and merges. Agents do not approve or merge their own PRs.

## Never

Force-push shared branches, `git reset --hard` over someone's work, rewrite published history,
delete others' branches, or discard uncommitted changes you did not make.
