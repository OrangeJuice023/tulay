# 0001: Deterministic matching; the model only assists

- Status: Accepted (proposed in docs on 2026-10-28; confirm with the team)
- Owner: Muse Code

## Context

Tulay recommends real people to each other. If a language model picks candidates or produces
scores, it can invent people, attributes or reasons, and its choices are hard to test or explain.
The community is small during the hackathon (tens of members), and the demo must work even without
a model key.

## Decision

- Candidate retrieval and ranking are SQL plus deterministic TypeScript: overlap between one
  person's need tags and another's offer tags, filtered by discoverability, language and status,
  boosted when the reverse direction also overlaps (reciprocity).
- The Meta model is used only for language tasks on data the code has already selected: goal
  extraction (confirmed by the user), explanation of a selected candidate, introduction drafts,
  next-step suggestions.
- Consent and status changes happen only through explicit user actions.
- No vector database for the MVP.

## Consequences

- Matching is unit-testable and explainable ("matched on: portfolio review, Filipino").
- Matching quality depends on good tag normalization; goal extraction should output tags from a
  small controlled list.
- If free-text offers prove too varied for tag overlap, revisit with embeddings in a new ADR.
