# Project Direction

## North Star
Build Tulay as a community-powered AI agent that helps people turn career goals into completed acts of mutual help through consent-based connections.

## Problem Statement
Freelancers, career shifters, and independent workers in the Philippines (and globally) need specific, actionable help to reach their goals, but lack a way to find the right people to ask. Those who can help want to contribute but need low-pressure, reciprocal ways to connect.

## Differentiator
- **Goal-oriented, not profile-browsing**: Start from "What are you trying to accomplish?" not endless scrolling
- **Complementary matching**: Focus on mutual need/offer, not just skills
- **Consent-first by design**: Introductions require explicit approval from both parties
- **AI as facilitator**: Extracts, explains, drafts - never fabricates or decides alone
- **Outcome-focused**: Track actual collaborations and usefulness, not vanity metrics
- **Trustworthy**: Demo users clearly labeled, AI outputs validated, real candidates only

## Target Users
Primary: Filipino freelancers, career shifters, students transitioning to careers, gig workers seeking growth
Secondary: Global communities with similar needs

## In Scope (Hackathon MVP)
- Onboarding with goals/needs/offers/skills/availability
- Profile with visibility controls
- Deterministic matching with AI explanations
- Consent-based introductions (review/edit/approve)
- Collaboration tracking with status and feedback
- AI goal extraction/normalization with demo fallback
- Basic auth and RLS

## Out of Scope
- Public social feed
- Payments/monetization
- Job board/postings
- Complex reputation scores/badges
- Full real-time chat platform
- Microservices architecture
- Mobile app (unless clearly justified - start web-first)
- MCP server (document as future extension unless critical)

## Hackathon Success Criteria (10 days)
1. **Working end-to-end flow**: User can onboard → express goal → see matches → send intro with consent → create collaboration
2. **AI integration working**: Meta Model API integrated with schema validation, or demo mode clearly functional
3. **Consent enforced**: No automatic outreach, both parties must approve
4. **Clean foundation**: Good docs, types, validation, basic security/RLS
5. **Demo-ready**: Can showcase the full workflow with seeded demo users

## Long-term Vision
- Expand to more communities and languages
- Deeper collaboration tools
- Community governance
- Integration opportunities while maintaining consent-first values
