# 0002: Landas knowledge transfer (concepts only, no shared code or data)

- Status: Accepted (proposed by Muse Code on 2026-11-02; confirm with the team)
- Owner: Muse Code

## Context

`D:\Landas-AI` is a separate Vite + Supabase career-mobility app with PSA labor
data, a matching/transition engine (`src/domain`), and extensive planning
research (transferable skills, career transitions, data provenance, knowledge
graph). Tulay needs career-intelligence concepts for its demo, but must not
inherit Landas's infrastructure (Supabase, jobs proxy, salary datasets) or its
product scope (simulator, career map) during the hackathon.

## Decision

One-way concept transfer only. No shared code, no dataset imports, no infra
coupling. Adopted:

- **Status labels on every derived fact.** Landas labels each displayed fact
  (source-backed, curated, AI-generated, not connected). Tulay already labels
  synthetic members (`isDemo` + DemoBadge) and demo simulation; this ADR
  extends the discipline to AI wording via an explicit `AiTextSource`
  (`demo-template` | `live`) surfaced in the UI wherever Muse drafts text.
- **Structured data is the source of truth; AI is the personalization layer.**
  Reinforces ADR-0001: goal/criteria extraction always returns Zod-validated
  structs the user reviews and confirms before matching runs.
- **Grounded tag vocabulary.** Match tags come only from what fixture members
  actually offer or need (`getTagVocabulary`), mirroring Landas's refusal to
  present unverified entities.

Explicitly not adopted for the MVP: PSA datasets, knowledge-graph
relationships, salary/vacancy evidence, jobs adapter, Supabase schema.

## Consequences

- Landas stays a separate project; Tulay's demo works offline with zero new
  dependencies.
- Post-hackathon, revisit a shared skill/tag taxonomy if both projects keep
  real user data.
