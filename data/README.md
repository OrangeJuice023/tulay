# Data

Files used to build, test and demo Tulay. Live user data lives in Supabase, never here.

| Folder | Holds | In Git? |
| --- | --- | --- |
| `raw/` | Original downloads or imports, unchanged | No (ignored) |
| `processed/` | Outputs of documented transformations of `raw/` | No (ignored) |
| `fixtures/` | Synthetic people, needs and offers for demo mode and tests | Yes |

Research write-ups go in `research/`, not here.

## Rules

- No secrets, no real user data, no private messages, no scraped personal profiles.
- `raw/` is never edited. Any transformation is a script whose input and output are listed below.
- Large files (over about 5 MB) stay out of Git even in `fixtures/`.
- Every fixture person has `isDemo: true` and an obviously fictional name. Never base a fixture on
  a real, identifiable person.

## Provenance log

Add a row for every file placed in `raw/` (source must also be in
`research/data-sources/source-registry.md` with an approved licence).

| File | Source URL | Licence | Retrieved | SHA-256 | Notes |
| --- | --- | --- | --- | --- | --- |
| (none yet) | | | | | |

## Transformations

| Script | Input | Output | Notes |
| --- | --- | --- | --- |
| (none yet) | | | |

## Fixtures

`fixtures/demo-community.json`: 14 synthetic members (all `isDemo: true`) whose needs and
offers create four reciprocal pairs for the demo, including a founder co-founder pair. Shape follows the Zod schemas in
`packages/shared` and `docs/DATA_MODEL.md`, validated by `packages/shared/fixtures.test.ts`.
Owner: Muse Code (schema), Claude Code (demo story).

## Retention

Raw and processed files are local working copies; delete them when the analysis they served is
done. Fixtures are kept as long as the demo uses them.
