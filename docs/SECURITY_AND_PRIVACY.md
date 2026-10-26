# Security and Privacy

## Principles
- **Consent-first**: Explicit approval required for all introductions
- **Least privilege**: Minimal data exposure
- **Privacy by design**: No unsolicited contact, visibility controls
- **Defense in depth**: Auth + ownership checks + RLS

## Authentication
- Supabase Auth
- Session management server-side
- Protected routes for authenticated features

## Authorization
- Ownership checks on all mutations
- Row Level Security (RLS) on all tables
- Users can only access records they own or are party to
- Match/intro/collab visible only to involved parties

## Data Protection
- API keys server-side only (never in client bundles)
- No secrets committed
- .env.example with placeholders only
- Demo data clearly labeled
- No PII in logs
- Private contact info never exposed without consent

## AI Safety
- Treat model output as untrusted
- Schema validation
- No auto-actions from AI
- Candidates only from verified DB records
- Demo mode when credentials missing
- No fabrication of people/skills/credentials

## Incomplete Items (Document)
Track known gaps here as discovered.

## Compliance Notes
Hackathon project - document limitations clearly.
