# Architecture

## System Overview
Tulay is a consent-first community platform with AI-assisted matching and introductions.

## Components

`mermaid
graph TB
    User[User Browser] --> Web[Next.js App Router]
    Web --> Auth[Supabase Auth]
    Web --> DB[(Supabase PostgreSQL)]
    Web --> AI[AI Service Layer]
    AI --> MetaAPI[Meta Model API]
    AI --> Demo[Demo Mode/Fallback]
    DB --> RLS[Row Level Security]
`

## Boundaries
- **apps/web**: UI, routes, client components. Calls API routes or server actions.
- **packages/shared**: TypeScript types, Zod schemas shared across packages
- **services/ai**: Provider abstraction (Meta), prompt templates, schema validation, demo mode
- **supabase**: Schema migrations, RLS policies, seed data

## Data Flow
1. **Onboarding**: User fills profile → validated → stored in Supabase with RLS
2. **Goal Understanding**: Natural language → AI extracts structured needs/offers/goals (validated) or demo mode
3. **Matching**: Deterministic algorithm finds complementary profiles from DB
4. **Match Explanation**: AI explains why specific verified candidate matches (not generating candidates)
5. **Introduction**: Both parties review/edit message → explicit consent → create collaboration
6. **Tracking**: Status updates, action items, outcome feedback

## Trust Boundaries
- **Client**: Never sees API keys, minimal data exposure
- **Server/API routes**: Auth checks, ownership validation, RLS enforcement
- **AI layer**: Isolated, validates output, treats as untrusted, no direct DB writes without app logic
- **Database**: RLS policies enforce row-level access

## Design Decisions
- **Consent-first**: No automatic introductions or external outreach
- **Deterministic matching**: AI explains/reasons, doesn't invent people/skills/scores as truth
- **Server-side secrets**: All API keys in env vars, never exposed to browser
- **Schema validation**: All AI outputs validated with Zod before use
- **Graceful degradation**: Demo mode when credentials unavailable

## Deployment
- **Web**: Vercel/Netlify (Next.js)
- **DB/Auth**: Supabase (hosted)
- **Env**: Server env vars only for secrets
