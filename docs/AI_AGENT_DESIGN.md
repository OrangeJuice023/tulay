# AI Agent Design

## Responsibilities

| Task | Model does | Code does |
| --- | --- | --- |
| Goal extraction | Free text → `{goal, needs[], offers[], skills[]}` | Validates with `ExtractedGoalSchema`; user confirms before saving |
| Candidate retrieval | Nothing | SQL query + deterministic ranking over real rows |
| Match explanation | One short paragraph for a candidate the code already selected | Passes only that candidate's visible fields; falls back to listing the matched factors |
| Introduction draft | Draft message | User must edit/approve and press Send |
| Next-step suggestions | 1 to 3 concrete steps | Users choose or edit; nothing is scheduled automatically |
| Skill tags | Pick from the caller's vocabulary | Enforces the subset; demo does substring match |

The model never: invents people or attributes, decides who is shown, changes consent or status,
sends anything externally, or sees contact details.

## Provider abstraction (`services/ai/`, exists)

```typescript
interface AIProvider {
  extractGoal(input: string): Promise<ExtractedGoal>
  explainMatch(context: ExplainMatchContextInput): Promise<MatchExplanation>
  draftIntroduction(context: DraftIntroductionContextInput): Promise<IntroductionDraft>
  suggestCollaboration(context: SuggestCollaborationContextInput): Promise<CollaborationSuggestions>
  suggestTags(context: SuggestTagsContextInput): Promise<SuggestedTags>
}
```

- `DemoProvider` (`demo.ts`): deterministic, no network, no credentials. Note: its `extractGoal`
  returns fixed needs regardless of input; acceptable for demo mode, but the UI must label it.
- `MetaModelProvider` (`meta.ts`): real Chat Completions integration with structured output
  (implemented 2026-10-29, mock-verified, no live request yet). Sends only model, messages and
  `response_format`; 30s timeout; zero retries. Throws typed `MetaProviderError` on any
  failure and never silently returns demo output. The key lives in a true private field.
- `getAIProvider()`: returns Meta only if `AI_PROVIDER=meta` and a key is set (`MODEL_API_KEY`,
  canonical; `META_MODEL_API_KEY` still works as a legacy fallback). Anything else → demo.
- The `context` parameters use input types from `packages/shared`, and every output is validated
  with its Zod schema before use (wired 2026-10-28).

## Validation

Every model response is parsed with the matching Zod schema. On parse failure, timeout or HTTP
error the provider throws `MetaProviderError` (typed code, operation, HTTP status; never the
key, prompt, or user text); server actions catch it and fall back to the deterministic path
with a visible "AI suggestion unavailable" note. Never retry: each call is one request.

Schemas live in `packages/shared` (defined in `schemas.ts`, re-exported from `index.ts`;
not `schemas/ai.ts` as an earlier draft said).

## Meta Model API: wire details (Reported — primary confirmation still open)

Kilo's research report had not landed when this integration was built, so the wire details
below were corroborated from the task brief plus independent public sources on 2026-10-29 and
are labelled **Reported** (secondary), not **Confirmed**. Kilo's research item stays open to
confirm each line against official docs (`dev.meta.ai/docs`, `ai.developer.meta.com/docs`)
with retrieval dates. Rate limits, cost, and data-retention terms are unknown: the 30s
timeout and zero-retry policy are the conservative defaults until the report lands.

- [x] Product: "Meta Model API", the developer inference API for Muse Spark (Reported)
- [x] Base URL `https://api.meta.ai/v1`; `POST /v1/chat/completions`, OpenAI-compatible (Reported)
- [x] Auth: `Authorization: Bearer MODEL_API_KEY`, key from the dev.meta.ai dashboard (Reported)
- [x] Model: `muse-spark-1.3` default, latest Standard checkpoint (`muse-spark-1.2`
  previous, same API and rates); override with `META_MODEL_MODEL` (Reported)
- [x] Structured output: `response_format` `{type: "json_schema", json_schema: {name, schema}}`
  derived from the Zod contracts; strict mode off; client-side Zod validation always (Reported)
- [ ] Rate limits, quotas, cost, data retention terms (unknown)
- [ ] Filipino / Taglish input quality (test, do not assume)
- [ ] A live request against the real API (mock-verified only so far)

## Configuration

| Variable | Purpose |
| --- | --- |
| `AI_PROVIDER` | `demo` (default) or `meta` (used only when a key is set) |
| `MODEL_API_KEY` | Canonical server-only key. Never `NEXT_PUBLIC_`, never committed |
| `META_MODEL_API_KEY` | Legacy fallback for the same key |
| `META_MODEL_API_URL` | Base URL override (default `https://api.meta.ai/v1`) |
| `META_MODEL_MODEL` | Model override (default `muse-spark-1.3`) |

Local setup: copy `.env.example` to `apps/web/.env.local`, set `AI_PROVIDER=meta` and
`MODEL_API_KEY`, restart `npm run dev`. `/api/health` reports the live selection.
Tests (`services/ai/meta.test.ts`) inject a mock fetch and never touch the network.

Verified 2026-10-29 (mocked HTTP only): request shape, Bearer auth, all five operations
returning Zod-valid contracts, malformed/HTTP/network/timeout/config failures, selection
rules, no key in errors or serialized instances. Not verified: any live request, Taglish
quality, rate limits, cost.

## Live smoke test (manual, requires your own key)

Run this on your own machine. Never commit a key, paste one into chat, or print one.
The test input below is deliberately tiny and non-sensitive.

```powershell
# From the repo root. Uses npx tsx (downloaded on first use, nothing installed).
$env:MODEL_API_KEY = '<paste key here, this shell only>'
npx -y tsx -e "import { MetaModelProvider } from './services/ai/meta.ts'; const provider = new MetaModelProvider(); console.log(JSON.stringify(await provider.extractGoal('I want to become a UX designer'), null, 2));"
Remove-Item Env:\MODEL_API_KEY
```

Expect: exit 0 and a JSON object with `goal`, `needs`, `offers`, `skills` (1 request,
negligible cost). Then record the outcome here: date, model used, pass/fail, and the
`MetaProviderError` code if it failed. If it fails with `http`, the wire details above
need re-checking against official docs before any other live use.

You can also confirm selection end to end: put the key in `apps/web/.env.local` with
`AI_PROVIDER=meta`, run `npm run dev`, and open `/api/health` (expect `provider: "meta"`,
`demoMode: false`), then remove the key file when done.

## Prompt rules

- Pass the minimum fields; never contact details, never another user's private fields.
- Tell the model it may only use the facts provided and must answer in the schema.
- Treat user text as data, not instructions (prompt-injection: a bio saying "ignore previous
  instructions" must not change behaviour). Keep consent logic out of the model's reach so an
  injection cannot do harm beyond odd text, which the user reviews anyway.

## Safety checklist for the integration PR

Keys server-only; schema validation; timeout; fallback path tested with the key unset; no PII in
logs; demo mode labelled. Status 2026-10-29: all hold for the mock-verified integration; the
live-request check is still open.
