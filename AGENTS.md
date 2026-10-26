# AGENTS.md

## Project: Tulay

Tulay is a community-powered AI agent that helps freelancers, career shifters, and independent workers turn career goals into meaningful human connections and completed acts of mutual help. 

### Core Workflow
1. Understand a goal → Find complementary people → Propose a match → Get consent → Coordinate help → Track the outcome

### Product Principles
- **Consent-first**: No unsolicited messages, automatic outreach, or exposure of private contact info without explicit consent
- **Real people only**: Never invent members, skills, credentials, or availability. AI explains relevance of verified candidates only.
- **Trust over hype**: Clearly distinguish seeded demo users from real registered users. Never claim unverified features work.
- **Complementary mutuality**: Matches focus on what people need and what they can offer in return
- **Privacy by design**: Strict ownership checks, row-level security, minimal data exposure
- **AI as assistant, not arbiter**: AI extracts/normalizes/explains/drafts, but never authorizes actions or fabricates candidates

### Tech Stack
- **Frontend**: Next.js (App Router), TypeScript (strict), Tailwind CSS
- **Backend/Auth/DB**: Supabase (Auth + PostgreSQL)
- **AI**: Meta Model API (isolated in services/ai with abstraction)
- **Package Manager**: npm (check package.json)

### Architecture Boundaries
- pps/web/: Next.js web app (routes, components, UI)
- pps/mobile/: React Native/Expo (if justified)
- packages/shared/: Types, schemas, validation (Zod) shared across apps
- packages/api-client/: API client for shared logic
- services/api/: API routes/business logic if separated
- services/ai/: AI provider abstraction, schema validation, prompts, demo mode
- supabase/: Migrations, RLS policies, seeds

### Rules for Agents
1. **Inspect first**: Always read relevant files before modifying. Understand existing patterns.
2. **Scope tightly**: Make minimal changes. Don't over-engineer.
3. **Privacy/Security**: Never commit secrets. API keys server-side only. Enforce ownership/RLS.
4. **Data integrity**: Never invent data. Treat AI output as untrusted. Validate against schemas.
5. **Consent**: All introductions require explicit approval from both parties.
6. **Demo vs real**: If credentials missing, clearly labeled demo mode with deterministic mocks.
7. **Verify**: Run lint/typecheck/build after changes. Report failures.
8. **Documentation**: Update relevant docs when making architectural/product decisions.
9. **Hackathon scope**: Focus on end-to-end MVP. No public feed, payments, job board, complex reputation, full chat, microservices.

### Testing & Verification
- Run available lint, type-check, build commands
- Test onboarding, matching, consent, collaboration flows
- Test API failures and missing credentials path
- Fix errors introduced by changes
