# Tulay

**Turn career goals into meaningful human connections and completed acts of mutual help.**

Tulay is a community-powered AI agent for freelancers, career shifters, and independent workers in the Philippines (scalable globally). It helps people find complementary others, get consent for introductions, coordinate small acts of help, and track outcomes.

## The Problem
Existing career platforms focus on job boards, resumes, and broadcasting to large networks. People who need specific help (e.g., review a portfolio, practice an interview, get feedback on a proposal) often don't know who to ask or how to ask. Those who can help want to give back but lack a low-pressure way to connect.

## The Solution
Tulay's workflow: **Understand goal → Find complementary people → Propose match → Get consent → Coordinate help → Track outcome**

## Core Features (MVP)
- **Onboarding & Profiles** - Goals, needs, skills they can offer, availability, language, visibility controls
- **Community & Matching** - Deterministic matching based on complementary needs/offers, goals, skills, availability
- **Consent-Based Introductions** - Review, edit message, explicit approval. No unsolicited contact.
- **Collaboration Tracking** - Agreed outcomes, next steps, status tracking, usefulness feedback, history

## Tech Stack
- [Next.js](https://nextjs.org/) 15+ (App Router), TypeScript (strict)
- [Tailwind CSS](https://tailwindcss.com/)
- [Supabase](https://supabase.com/) - Auth, PostgreSQL, RLS
- [Meta Model API](https://www.meta.com/ai/) - Goal extraction, normalization, match explanations, message drafting (with demo fallback)
- [Zod](https://zod.dev/) for schema validation

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm/yarn/pnpm
- Supabase project (or use demo mode)

### Installation
`ash
# Install dependencies (after scaffolding)
npm install

# Copy environment variables
cp .env.example .env.local

# Run development server
npm run dev
`

### Environment Setup
See .env.example for required variables. API keys are server-side only. Without Meta Model API credentials, Tulay runs in **demo mode** with deterministic mocks.

## Architecture
See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for details.

## Project Status
🚧 **In development** - Hackathon MVP (Meta Global AI Developer Hackathon, Oct 26 - Nov 4, 2026)

## Known Limitations
- MVP scope only (no public feed, payments, job board, full chat)
- Demo mode available when AI credentials missing
- Matching is deterministic rule-based (AI explains, doesn't decide)
- Focus on Philippines initially, globally scalable design

## License
TBD
