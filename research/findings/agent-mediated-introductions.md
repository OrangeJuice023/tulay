# Agent-mediated introductions: should Tulay concierge who users meet?
- Date: 2026-11-02  - Author: Muse Code  - Status: draft

## Question

Users currently browse matches themselves (Journey 2 lists up to 5 candidates).
Should Tulay instead act as a concierge — the user describes who they want to meet
in free text ("a technical co-founder who understands payments"), and Tulay
presents one candidate at a time for accept / skip / refine? If so, what are the
product, safety, and trust boundaries?

## Sources (with retrieval dates)

- Tulay `docs/PROJECT_DIRECTION.md` (canonical north star), `docs/PRODUCT_SPEC.md`
  (Journeys 1–5), `docs/AI_AGENT_DESIGN.md` (model/code split), `docs/DATA_MODEL.md`
  (consent state), retrieved 2026-11-02.
- Tulay demo journey implementation (`apps/web/app/start/Journey.tsx`) and
  deterministic matching engine (`packages/shared/matching.ts`), retrieved 2026-11-02.
- No external sources were consulted for this note; the claims below are
  design reasoning grounded in Tulay's own docs, not market research.

## Findings (each labelled Confirmed / Reported / Hypothesis)

1. **Hypothesis.** Describing a person ("who I want to meet") is a lower-friction
   starting point than filling goal/need/offer/tag fields, especially for
   first-time users (career changers, new freelancers) who don't yet know
   Tulay's vocabulary. The concierge pattern keeps Journeys 1–2 but merges
   them into one conversational step.
2. **Hypothesis.** One-at-a-time presentation reduces choice overload versus a
   list of 5, and makes each accept/skip decision feel low-stakes. Risk: it
   hides the breadth of the community, so the UI must always offer "see all"
   or "refine" escapes and never trap the user in a funnel.
3. **Confirmed (in-repo).** Tulay's product rules already settle the safety
   architecture: candidates come from deterministic queries over real rows,
   the model only extracts/explains/drafts, outputs are Zod-validated, and
   nothing reaches another person without explicit two-sided consent
   (`AGENTS.md` rules 1–3; `docs/AI_AGENT_DESIGN.md` responsibilities table).
   Concierge changes no rule; it adds one extraction step before retrieval.
4. **Hypothesis.** The main new failure mode is criteria drift: the model's
   extracted skills/relationship misrepresent what the user meant, and the
   user blames the *candidates* ("nobody good here") instead of the query.
   Mitigation: always show the extracted criteria back to the user with an
   edit/refine affordance before and during the candidate walk-through.
5. **Hypothesis.** Skip reasons ("not relevant", "wrong skill", "want someone
   more senior") would improve refinement, but free-text refine ("actually I
   meant…") plus re-extraction covers the MVP without a taxonomy to maintain.
6. **Hypothesis.** Founder matching (co-founder, pitch feedback, early users)
   fits the same engine: "co-founder" is a relationship label on top of
   complementary skill tags, not a separate matching path. The fixture
   already proves this (`planning/NEXT_STEPS.md`, founder path item).

## Limitations and confidence (high / medium / low, and why)

- Confidence: **medium**. The architectural fit is high (finding 3 is
  confirmed in-repo), but findings 1, 2, 4–6 are hypotheses from the team's
  product reasoning with no user conversations behind them yet.
- `research/user-needs/validation-plan.md` should add one concierge probe:
  "would you rather describe the person or fill in need/offer fields?" and
  "does seeing one person at a time feel helpful or constraining?"
- No accessibility or localization review yet: one-at-a-time flows must keep
  keyboard/screen-reader parity with the list UI, and criteria extraction
  must accept Filipino/Taglish input (already an open test item for the
  provider).

## Implications for Tulay

1. Concierge is a Journey 1+2 front-end, not a new backend: extraction
   (`extractCriteria`) → vocabulary grounding (`suggestTags`) → existing
   `findCandidates()` → existing introduction/collaboration lifecycle.
2. New pure logic needed (no I/O): a session cursor over the ranked list with
   accept/skip/refine transitions, and small consent-transition helpers so
   accept/decline/withdraw/contact-visibility rules live in one tested place.
3. The model must never rank, filter, or reorder candidates; ranking stays
   byte-identical to `findCandidates()`. Explanations cover only the one
   candidate currently shown.
4. Demo mode must label extracted criteria as AI-suggested and keep the
   "Demo" label on every synthetic candidate, same as the list UI.

## Recommended next steps

1. Implement `ConciergeCriteria` extraction + session/consent helpers in
   `packages/shared`, with the provider op in `services/ai` (this task).
2. Claude Code wires the concierge UI per `docs/CONCIERGE_CONTRACT.md`,
   reusing the existing introduction/collaboration components.
3. Add the concierge probes to the user-needs validation plan (Kilo).
4. After Supabase lands, persist skipped-candidate exclusions per session so
   refine doesn't resurface skipped people across devices (demo: in-memory).
