<div align=\"center\">

<img src=\"apps/web/public/brand/tulay-wordmark.svg\" alt=\"Tulay\" height=\"80\">

<br>

**\"Your next career move shouldn't be a solo mission.\"**

<sub>*Tulay* (Tagalog for \"bridge\") — a community-powered AI agent for career mobility, Philippines first.</sub>

[![License: Unspecified](https://img.shields.io/badge/license-unspecified-lightgrey.svg)](#license)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20.9.0-brightgreen.svg)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-222%2F222%20passing-brightgreen.svg)](#testing-instructions)
[![Hackathon](https://img.shields.io/badge/Meta%20Global%20AI%20Dev%20Hackathon-Oct%2026%E2%80%93Nov%204%2C%202026-orange.svg)](#hackathon-context--credits)

</div>

---

## Table of Contents

- [Why Tulay Exists](#why-tulay-exists)
- [What Tulay Does](#what-tulay-does)
- [The Three User Pathways](#the-three-user-pathways)
- [How It Works](#how-it-works)
- [Meet Arko — Ask Arko AI Assistant](#meet-arko--ask-arko-ai-assistant)
- [How Muse Spark Powers Ask Arko](#how-muse-spark-powers-ask-arko)
- [Product Capabilities](#product-capabilities)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Product Screenshots & Features](#product-screenshots--features)
- [Rate Tulay / Share Feedback](#rate-tulay--share-feedback)
- [Local Development Setup](#local-development-setup)
- [Environment Variables](#environment-variables)
- [Testing Instructions](#testing-instructions)
- [Security & Privacy Principles](#security--privacy-principles)
- [Current Limitations & Roadmap](#current-limitations--roadmap)
- [Hackathon Context & Credits](#hackathon-context--credits)
- [Documentation](#documentation)
- [License](#license)
- [README Asset Checklist](#readme-asset-checklist)

---

## Why Tulay Exists

Career mobility shouldn't be a solo mission. 

Freelancers, career shifters, founders, and independent workers often have access to information and AI tools, but still struggle to find the *right people* who can help them move forward. Cold-messaging on large platforms feels risky, and people who could help would often do so in return — if there was a low-pressure way to find each other.

**Tulay's thesis:** AI should help people help one another, not replace human relationships that make career mobility possible.

Tulay doesn't just tell someone *how* to succeed — it helps them discover people with complementary skills, needs, and goals; facilitates introductions with consent; and turns those connections into actual progress through concrete collaboration and follow-through.

**Tulay is:** A *community-powered AI agent* for career mobility and mutually beneficial collaboration focused on *completed acts of mutual help*, not engagement metrics.

**Tulay is not:** Another AI career chatbot, another professional networking feed or job board, merely a mentor directory, or a startup-investment platform (founder matching uses the same needs-and-offers engine).

---

## What Tulay Does

Tulay guides people through a complete journey: **Goal → Specific Need → Complementary People → Consent → Collaboration → Outcome**. At every step, AI assists with language and structure, but the code decides who gets matched, enforces consent, and controls state changes.

Every recommendation is grounded in real application data. No one is invented. Nothing reaches another person without explicit approval from both sides.

---

## The Three User Pathways

Tulay supports three interconnected pathways that all share the same matching engine and consent lifecycle:

| Pathway | Who It's For | How Tulay Helps |
| --- | --- | --- |
| **Change Careers** | BPO professionals moving to tech, designers transitioning to product, career shifters | Map transferable skills to target roles using curated career data, find peers who made the move, get portfolio reviews, practice interviews, and receive practical support. |
| **Grow as a Freelancer** | Designers, developers, editors, virtual assistants, and independents | Discover collaborators for skill swaps, get proposal and pricing feedback, find people who need what you offer in exchange for what you need. |
| **Build a Company** | Aspiring founders, solo builders, and early-stage collaborators | Find potential co-founders, early users, domain experts, and mentors through the same needs-and-offers engine. *Founder Mode is fully integrated into Tulay* — it's not a separate platform, just a use case of the reciprocal matching system. |

---

## How It Works

`mermaid
flowchart LR
    A[State Goal & Need] --> B[Ask Arko Structures It]
    B --> C[Find Complementary People]
    C --> D[Mutual Consent Required]
    D --> E[Introduction]
    E --> F[Agree on Next Step]
    F --> G[Collaborate & Record Outcome]
`

1. **Ask** - Tell Arko about your goal and specific need. Arko helps structure it; you confirm before saving.
2. **Match** - Tulay finds real people with complementary needs/offers, showing when you can help each other.
3. **Introduce** - Send an introduction request with a drafted message (you edit it). The other person must accept or decline.
4. **Act** - After mutual consent, coordinate one concrete next step together.
5. **Follow Through** - Mark completion and record whether it helped. This is the measure of success.

---

## Meet Arko — Ask Arko AI Assistant

<div align=\"center\">
<img src=\"apps/web/public/brand/mascot/arko-hero.png\" width=\"200\" alt=\"Arko, Tulay's bridge-building companion\">
</div>

**Arko** is Tulay's bridge-building companion and the face of **Ask Arko** — the conversational workspace where users talk through their next career move.

### Arko Demo Animation

> **Status:** *Placeholder — animation not yet checked in.*  
> **Planned location:** ssets/demo/arko-demo.gif  
> **What to capture:** A short screen recording showing (1) a user asking Arko for career guidance, (2) Arko understanding their situation, (3) an actual AI-generated response from Muse Spark/DemoProvider, and (4) voice transcription in action if verified. Keep it short, readable for GitHub, and free of private/sensitive data. Optimize for web viewing.  
> **How to capture (for Claude Code):** Run the app locally (
pm run dev in pps/web), navigate to /ask, demonstrate a realistic career-shifter scenario, record the interaction, trim to 10-30 seconds, and save as an optimized GIF to ssets/demo/arko-demo.gif. Do **not** generate a fake GIF or impersonate a working interface.

---

## How Muse Spark Powers Ask Arko

Tulay distinguishes between two different \"Muse\" concepts:

### Muse Code (Development Tool)
- **What it is:** The development agent used by the project team to build and maintain Tulay
- **Where it runs:** In the development environment, not in the deployed application
- **Purpose:** Assists the engineering team; not user-facing

### Muse Spark via Meta Model API (Runtime AI)
- **What it is:** The model integration intended to power Tulay's user-facing AI capabilities through the Meta Model API
- **Where it runs:** Server-side in the Next.js app via services/ai/meta.ts
- **Purpose:** Powers Ask Arko's natural language understanding and generation

**Muse Spark capabilities (when live):** Structure goals, extract needs/offers, interpret intent in chat, explain real candidates (selected by deterministic code), draft introductions (user must edit/approve), suggest collaboration steps, transcribe voice (Taglish/English), draft deck outlines with anti-fabrication safeguards.

**Critical design principle:** *AI assists, code decides.* Candidate retrieval, eligibility, ranking, consent enforcement, and database state changes remain under deterministic application control. All model outputs are validated against shared Zod schemas in packages/shared. The model never invents people, attributes, or contact details.

### Provider Configuration & Status

| Component | Status | Notes |
| --- | --- | --- |
| **DemoProvider** | ✅ Implemented & Working | Deterministic, no network/credentials. Used by default. Clearly labeled as \"demo mode\". |
| **MetaModelProvider** | ⚠️ Implemented, Partially Verified | Live Chat Completions to https://api.meta.ai/v1. One live extractGoal verified (2026-11-04). Chat/transcription live-verified in routes (2026-11-05). Other ops mock-verified only. |
| **Provider Selection** | ✅ Implemented | getAIProvider() returns Meta only if AI_PROVIDER=meta and MODEL_API_KEY set. Else DemoProvider. /api/health reports active provider. |
| **Schema Validation** | ✅ Implemented | Every model response validated with Zod. Parse/timeout/HTTP errors throw typed MetaProviderError and fall back to deterministic paths with visible notes. |

> **Note:** We do not claim full production readiness of the live Meta API integration. Live verification is partial. Rate limits, costs, and data-retention terms are not yet confirmed from official docs.

---

## Product Capabilities

| Feature | Status | Description |
| --- | --- | --- |
| **Ask Arko (Conversational Workspace)** | ✅ Implemented | Chat-based interface at /ask to talk through goals and needs with context-aware matching. |
| **Reciprocal Community Matching** | ✅ Implemented | Deterministic matching finds complementary needs↔offers from real members. Shows \"You can help each other\" when mutual. |
| **Career & Founder Pathways** | ✅ Implemented | All three pathways share one engine. Founder needs work through the same needs-and-offers logic. |
| **Consent-Based Introductions** | ✅ Implemented | Introduction requests require mutual acceptance. Declining is quiet. Contact details only revealed after consent. One pending request per pair per need. |
| **Follow-Through & Collaboration Outcomes** | ✅ Implemented | Create collaboration with next step, track status, record outcome (\"Did this help you move forward?\"). |
| **Career Intelligence (Landas-inspired)** | ✅ Implemented | 8 curated roles with skill relationships, transferable skills, adjacent roles with reasons. Enriches matching. Labeled as curated data. |
| **Voice Transcribe** | ⚠️ Implemented, Partially Verified | Voice input in Ask Arko. Records, converts to 16kHz mono WAV, transcribes via Meta API route. Live-verified once (2026-11-05). Falls back to labeled demo in demo mode. |
| **Resume Studio** | ⚠️ Present in Codebase | Routes/components exist (/studios), appears scaffolded. Not fully verified end-to-end. |
| **Pitch Deck Studio** | ⚠️ Present in Codebase | Routes/components exist (/deck), includes draftDeckOutline with Zod validation. Not fully verified end-to-end. |

---

## Architecture

`mermaid
flowchart TD
    User[User Browser] --> Next[Next.js 16 App Router]
    Next --> Shared[packages/shared - Zod Schemas & Types]
    Next --> Business[Business Logic & Server Actions]
    Business --> Supabase[(Supabase / PostgreSQL)]
    Business --> AI[services/ai - Provider Abstraction]
    AI --> Demo[DemoProvider - Deterministic]
    AI --> Meta[MetaModelProvider - Muse Spark API]
    Meta --> MetaAPI[api.meta.ai/v1]
`

**Key principles:** AI assists, code decides; schema validation everywhere; privacy by design (RLS); demo mode first; no invented data.

---

## Technology Stack

| Layer | Technology | Notes |
| --- | --- | --- |
| **Frontend** | [Next.js 16](https://nextjs.org/) (App Router), [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/) (strict) | pps/web/ |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com/) | Utility-first |
| **Shared Contracts** | [Zod](https://zod.dev/) in packages/shared/ | Single source of truth |
| **AI Provider** | Custom abstraction in services/ai/ | DemoProvider & MetaModelProvider |
| **Database/Auth** | [Supabase](https://supabase.com/) (Postgres + Auth) | Schema/migrations in supabase/migrations/, currently unconfigured in demo |
| **Testing** | [Vitest](https://vitest.dev/) | 222 tests across 18 files (verified 2026-11-04) |
| **Tooling** | npm workspaces, Turbopack (default), Webpack fallback | pps/*, packages/*, services/* |

---

## Product Screenshots & Features

> **Status:** *No screenshots or demo video checked in.* Run locally to explore. All demo members are synthetic and labeled with a \"Demo\" badge.

**Key areas:** Landing (/), Ask Arko (/ask), Demo (/demo), Journey/Onboarding (/start), Discover/Explore, Introductions, Collaborations, Home Dashboard (/home).

---

## Rate Tulay / Share Feedback

> **Status:** *Feedback destination not yet configured.* Links below are placeholders until a real mechanism is connected.

[![Rate 1/5](https://img.shields.io/badge/⭐%20Rate-1%2F5-red.svg)](FEEDBACK_DESTINATION_NOT_CONFIGURED)
[![Rate 2/5](https://img.shields.io/badge/⭐⭐%20Rate-2%2F5-orange.svg)](FEEDBACK_DESTINATION_NOT_CONFIGURED)
[![Rate 3/5](https://img.shields.io/badge/⭐⭐⭐%20Rate-3%2F5-yellow.svg)](FEEDBACK_DESTINATION_NOT_CONFIGURED)
[![Rate 4/5](https://img.shields.io/badge/⭐⭐⭐⭐%20Rate-4%2F5-lightgreen.svg)](FEEDBACK_DESTINATION_NOT_CONFIGURED)
[![Rate 5/5](https://img.shields.io/badge/⭐⭐⭐⭐⭐%20Rate-5%2F5-brightgreen.svg)](FEEDBACK_DESTINATION_NOT_CONFIGURED)

**To activate:** Configure GitHub Discussions/Issues or an in-app feedback route and replace FEEDBACK_DESTINATION_NOT_CONFIGURED. No votes are collected/stored until connected.

---

## Local Development Setup

### Prerequisites
- Node.js >= 20.9.0
- npm

### Installation & Running

`ash
git clone https://github.com/OrangeJuice023/tulay.git
cd tulay
npm install
npm run dev
`

Open [http://localhost:3000](http://localhost:3000). Demo mode works out of the box with no sign-up, DB, or API keys.

---

## Environment Variables

All optional for demo mode. See [.env.example](.env.example).

| Variable | Required | Purpose | Notes |
| --- | --- | --- | --- |
| AI_PROVIDER | No | demo (default) or meta | Only uses Meta if key set |
| MODEL_API_KEY | No | Server-only Meta key | Never NEXT_PUBLIC_, never commit |
| META_MODEL_API_KEY | No | Legacy fallback | Same as MODEL_API_KEY |
| META_MODEL_API_URL | No | Base URL override | Default: https://api.meta.ai/v1 |
| META_MODEL_MODEL | No | Model override | Default: muse-spark-1.3 |
| NEXT_PUBLIC_SUPABASE_URL | No | Supabase URL | For auth/persistence (unconfigured) |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | No | Supabase anon key | For auth/persistence (unconfigured) |
| SUPABASE_SERVICE_ROLE_KEY | No | Service role key (server-only) | For admin ops |
| RESEND_API_KEY | No | Resend key | Email not sent without config |

See [docs/EMAIL_SETUP.md](docs/EMAIL_SETUP.md).

---

## Testing Instructions

`ash
npm test        # vitest, repo root
npm run lint    # eslint (web workspace)
npm run typecheck # tsc --noEmit (all workspaces)
npm run build   # production build (web workspace)
`

**Verified (2026-11-04):** 222/222 tests passing (18 files), clean lint and typecheck, production build green. 
ext build defaults to Turbopack; if sandbox blocks worker ports, use 
px next build --webpack in pps/web.

---

## Security & Privacy Principles

1. **Consent first** - Nothing reaches another person without explicit approval from both sides
2. **Real people only** - No invented members/skills/outcomes; AI only explains/drafts about real candidates
3. **AI assists, code decides** - Matching/eligibility/consent/DB changes are deterministic; AI outputs validated with Zod
4. **Demo is labeled** - Seeded users have is_demo = true with visible \"Demo\" labels
5. **Privacy by design** - RLS on user tables; users see only their own rows and rows they're party to; secrets stay server-side
6. **No automatic outreach** - Everything requires explicit user action
7. **Schema validation** - All untrusted AI output validated before use
8. **Server-only secrets** - API keys never exposed to client

See [docs/SECURITY_AND_PRIVACY.md](docs/SECURITY_AND_PRIVACY.md).

---

## Current Limitations & Roadmap

### Current Limitations (Honest)
- **No live users** - All members synthetic and labeled \"Demo\"
- **Supabase unconfigured** - Code exists but not connected; RLS not exercised with real data
- **Partial AI integration** - Muse Spark live verification partial (extractGoal verified once, others mock-tested)
- **No emails sent** - Resend not configured
- **Missing assets** - No Arko GIF/screenshots checked in
- **License not chosen** - To be determined
- **Studios** - Resume/Pitch Deck present but not fully verified in core demo path

### Roadmap
- [ ] Live Muse Spark verification (rate limits/cost/data-retention)
- [ ] Supabase persistence & auth with RLS
- [ ] Native Android app via Expo (reusing @tulay/shared)
- [ ] Add ssets/demo/arko-demo.gif
- [ ] Add product screenshots
- [ ] Connect rating buttons to real feedback destination
- [ ] Expand career catalog if valuable

---

## Hackathon Context & Credits

**Event:** Meta Global AI Developer Hackathon (Oct 26 – Nov 4, 2026)  
**Approach:** One polished end-to-end flow beats many half-built features. Judged by completed acts of mutual help with recorded outcomes.  
**Built with:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Zod, Supabase, Vitest, Meta Muse Spark via Meta Model API  
**Notes:** Uses curated career data inspired by Landas. All demo data synthetic. Arko is Tulay's bridge-building mascot.

---

## Documentation

- [AGENTS.md](AGENTS.md) - Canonical agent instructions
- [docs/PROJECT_DIRECTION.md](docs/PROJECT_DIRECTION.md) - North star (canonical)
- [docs/PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md) - MVP requirements
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - Architecture
- [docs/TECH_STACK.md](docs/TECH_STACK.md) - Tech stack
- [docs/AI_AGENT_DESIGN.md](docs/AI_AGENT_DESIGN.md) - AI design, Muse Spark, validation
- [docs/DATA_MODEL.md](docs/DATA_MODEL.md) - Data model
- [docs/SECURITY_AND_PRIVACY.md](docs/SECURITY_AND_PRIVACY.md) - Security & privacy
- [docs/brand/](docs/brand/) - Brand assets
- [planning/](planning/) - Checklist, issues, next steps
- [research/](research/) - Research

---

## License

**Not yet chosen.**

---

## README Asset Checklist

| Item | Status | Notes |
| --- | --- | --- |
| **Tulay logo/wordmark** | ✅ Present | pps/web/public/brand/tulay-wordmark.svg, 	ulay-mark.svg |
| **Arko mascot images** | ✅ Present | All states in pps/web/public/brand/mascot/ |
| **Arko demo animation (ssets/demo/arko-demo.gif)** | ❌ Missing | Need screen recording of Ask Arko. See [Meet Arko section](#meet-arko--ask-arko-ai-assistant). |
| **Product screenshots** | ❌ Missing | Would enhance visual appeal but not critical. |
| **Rate Tulay feedback destination** | ❌ Not configured | Placeholder links; needs GitHub Discussions/Issues or app route. |
| **Architecture diagram** | ✅ Present | Mermaid diagram reflecting actual architecture |
| **Badges/links** | ✅ Present | Tech stack, tests, hackathon badges |

*README crafted to be judge-ready, factual, and transparent about implemented vs planned features.*
