# Tulay Concierge: integration contract for Claude Code

Owner of this file: Muse Code. Owner of the UI: Claude Code. Last updated: 2026-11-02.

## What this is

Concierge lets the user describe who they want to meet in free text
("I'm building a fintech startup and looking for a technical co-founder who
understands payments") instead of filling need/offer/tag fields. Tulay extracts
structured criteria, retrieves candidates with the existing deterministic
engine, and presents **one candidate at a time**: accept, skip, or refine.

The server-side pieces already exist and are tested. This file is the contract
for wiring the UI. Suggested home for the UI: a new `apps/web/app/concierge/`
route reusing the existing components (`MatchCard`, `Notice`, `EmptyState`,
`LoadingState`, demo store); do not change `apps/web/app/start/` behavior.

## End-to-end flow

1. User types who they want to meet (free text, English or Filipino/Taglish).
2. Server action calls `extractCriteria` (model or demo), then `suggestTags`
   to ground skills into the community vocabulary.
3. Server builds a `Need` and calls the existing `findCandidates()`.
4. Server starts a concierge session and returns it; UI shows the extracted
   criteria (editable via refine) plus the first candidate.
5. User accepts, skips, or refines (free text → steps 2–4 again, skipped
   people excluded).
6. Accept → existing introduction flow: editable draft, explicit consent,
   send. Recipient accepts/declines; contact shared only after acceptance;
   acceptance creates a collaboration (reuse the `/start` components).

## Data structures (all in `@tulay/shared`)

### ConciergeCriteria — who the user wants to meet

```json
{
  "relationship": "co-founder",
  "skills": ["payments", "fintech"],
  "description": "A technical co-founder who understands payments"
}
```

- `relationship`: `mentor | peer | collaborator | co-founder | advisor |
  early-user | other`. A display label only; it never affects ranking.
- `skills`: raw phrases from the user's text (max 20). Display them so the
  user can spot mis-extraction; the tags used for retrieval are the grounded
  ones on the `Need` (see below).
- `description`: short restatement of who they want to meet. Always show it
  next to the candidates with a refine affordance (criteria drift is the top
  failure mode; see `research/findings/agent-mediated-introductions.md`).

### Need — the grounded query (existing schema)

The server builds a `Need` from the criteria: `description` = the user's text
(or the criteria description), `tags` = `suggestTags` output against the
community vocabulary, `aiSuggested: true`, `status: 'open'`. Show the tags as
"Searching for: ..." chips so demo users see the grounding.

### CandidateMatch — one candidate (existing schema, contact-free)

Same shape the `/start` matches step already renders: public profile (no
`contactMethod` — guaranteed stripped by `findCandidates()` and re-validated
when the session starts), the matching offer, `sharedTags`,
`sharedKeywords`, `reciprocal` + `reciprocalTags`, and `reasons[]`.
Render exactly one at a time. Keep the "Demo" badge, the reciprocity line
("You can help each other"), and the matched-factors explanation. Never show
a numeric match score (product language rule).

### ConciergeSession — the walk-through state

```json
{
  "criteria": { "relationship": "co-founder", "skills": ["payments"], "description": "..." },
  "need": { "profileId": "…", "description": "…", "tags": ["payments"], "status": "open", "aiSuggested": true },
  "candidates": [ { "profile": { "displayName": "…" }, "offer": { "description": "…" }, "score": 10, "sharedTags": ["payments"], "sharedKeywords": [], "reciprocal": false, "reciprocalTags": [], "reasons": ["…"] } ],
  "index": 0,
  "skippedProfileIds": [],
  "status": "browsing"
}
```

- `status`: `browsing` (there is a current candidate) | `accepted` (user
  picked one; move to the introduction step) | `exhausted` (no more
  candidates; show the empty state + refine).
- The session is a plain Zod-validated object: keep it in client state for
  the demo (it contains no contact details, so holding it client-side is
  safe). After Supabase lands, skipped ids persist server-side.
- Helpers (pure, in `@tulay/shared`): `startConciergeSession`,
  `currentCandidate`, `remainingCandidates`, `skipCandidate`,
  `acceptCandidate`, `refineConciergeSession`. Skip/accept/refine transitions
  may run client-side; refine needs a server round-trip for re-extraction
  (see actions below).

## Accept, skip, refine

| Action | Trigger | Behavior |
| --- | --- | --- |
| Skip | "Not now" / "Next person" | `skipCandidate` advances the cursor; the skipped profile id is recorded so refine never resurfaces them. Past the last candidate → `exhausted`. |
| Accept | "Ask for an introduction" | `acceptCandidate` resolves the session; continue with the existing draft → consent → send flow (Journey 3). |
| Refine | Free text ("actually I meant…") | Send the new text to the server; the server re-runs extraction + grounding + `findCandidates()` and returns a fresh session via `refineConciergeSession` (skipped people excluded, cursor reset). |

Always offer "see everyone" (fall back to the `/start` list UI for the same
need) and "start over" escapes; never trap the user in the one-at-a-time funnel.

## Introduction request lifecycle (existing schemas + new helpers)

States: `pending → accepted | declined | withdrawn`.

- `buildIntroductionRequest({ fromProfileId, toProfileId, needId, offerId?,
  matchFactors, explanation?, message })` → validates (no self-requests,
  message required) and returns a `pending` request with `respondedAt: null`.
- `respondToIntroduction(request, responderId, 'accepted' | 'declined')` →
  only the **recipient** (`toProfileId`), only while `pending`; stamps
  `respondedAt`.Throws otherwise. Declining is quiet: the sender sees "not now".
- `withdrawIntroduction(request, senderId)` → only the **sender**
  (`fromProfileId`), only while `pending`.
- `contactVisibleTo(request, profileId)` → `true` only when `accepted` and
  the profile is a party. Gate **every** contact rendering on this.
- `createCollaborationFromIntroduction(request, { requesterId, helperId,
  intendedOutcome?, nextSteps? })` → requires `accepted`, requires the
  request to have an id, requires requester = sender and helper = recipient;
  returns an `agreed` collaboration. Throws otherwise.
- Duplicate guard stays in the DB layer (partial unique index per
  `docs/DATA_MODEL.md`); in demo mode, disable the send button once a pending
  request exists for the pair + need (same as `/start`).

Demo limitation (same as Journey 3): a real recipient inbox needs Supabase;
until then the recipient reply stays a labelled simulation.

## Loading, empty, and error states

| State | Condition | UI |
| --- | --- | --- |
| Extracting | criteria request in flight | Loading state: "Understanding who you're looking for…" |
| Matching | candidates request in flight | Loading state: "Finding people who can help…" |
| Empty | session `exhausted` with zero candidates, or skipped through all | Empty state, plain words: "Nobody matches that description yet." + the shown criteria + refine input + "see everyone" link. Never invent people to fill it. |
| AI unavailable | provider throws (timeout / bad JSON / no key in meta mode) | Notice: "AI suggestion unavailable" + fall back: build the need from the raw text with `suggestTags` demo grounding (substring match) and continue. The page must not break. |
| Invalid input | empty text, or schema parse failure | Inline validation error on the text field; keep the user's text. |

## Required server actions (Claude to implement)

New file suggested: `apps/web/app/concierge/actions.ts` (server-only; the
fixture and the model key must never reach the browser). Shape follows the
existing `ActionResult<T>` in `apps/web/app/start/actions.ts`:

```typescript
startConciergeAction(input: {
  text: string                    // raw "who I want to meet" text
  seekerProfileId: string         // uuid; demo: the visitor's generated id
  seekerOffers: unknown[]         // for the reciprocity bonus; same handling as findMatchesAction
}): Promise<ActionResult<{
  session: ConciergeSession       // from startConciergeSession; contact-free
  criteriaSource: 'demo-template' | 'ai-suggestion'  // label honesty: demo vs real model
}>>
// Server steps: extractCriteria(text) → suggestTags({ text, vocabulary }) → build
// Need (aiSuggested: true) → findCandidates(need, getCommunity(), { seekerOffers })
// → startConciergeSession({ criteria, need, candidates }). On provider failure,
// fall back to raw-text need + demo grounding with criteriaSource 'demo-template'
// and relationship 'other'.

refineConciergeAction(input: {
  text: string                    // new "who I want to meet" text
  session: unknown                // current ConciergeSession (validated server-side)
  seekerOffers: unknown[]
}): Promise<ActionResult<{
  session: ConciergeSession       // from refineConciergeSession; skips preserved
  criteriaSource: 'demo-template' | 'ai-suggestion'
}>>

explainConciergeCandidateAction(context: ExplainMatchContextInput)
  // Optional: one-paragraph explanation for the CURRENT candidate only, via the
  // existing explainMatch op. Same fallback as /start: matched factors list.

draftIntroductionAction / suggestNextStepsAction
  // Reuse the existing actions from app/start/actions.ts unchanged.
```

`criteriaSource` drives the label next to the shown criteria: "AI suggestion"
only when the real model produced it, otherwise "Demo template" (item 3 in
`planning/NEXT_STEPS.md` applies here too).

## Demo-mode labeling (non-negotiable)

- Every synthetic candidate keeps the "Demo" badge.
- Extracted criteria carry their source label (`criteriaSource`).
- With no model key, the whole flow works and says demo (demo provider:
  deterministic keyword scan for `relationship`, input echoed as
  `description`, empty `skills` — grounding still works via substring match).
- Never present synthetic users as real members.

## Product language

Goal, need, offer, introduction, collaboration, next step, "helped". Avoid
"connect" for automatic actions, numeric match scores, and "AI found"
(people are found by search, not by AI). Say "Tulay found N people" only
when N comes from `findCandidates()`.

## Out of scope (do not build)

No WhatsApp/MCP/Redis/new backend, no automatic outreach, no UI redesign of
`/start`, no reputation scores, no separate matching path for founders
(`co-founder` is a label; retrieval is skill tags as usual).

## Flags for Claude (found during this task, not changed: your files)

- `apps/web/app/start/actions.ts` still comments that `MetaModelProvider` "is
  still a stub that delegates to it" — stale since the real provider landed
  (2026-10-29). Update the comment and the `AiTextSource` type when you touch
  that file (see NEXT_STEPS item 3).

## Verification for the UI

`npm test`, `npm run typecheck`, `npm run lint`, `npm run build` from the repo
root; drive the flow at 375px and 1280px with the key unset (demo labels
visible) and, if a key is available, once with `AI_PROVIDER=meta`; confirm no
contact details in any concierge response before acceptance.
