# Email and Supabase Integration Brief — Tulay

Research only. Official documented behavior vs. recommendations labeled.

## Recommended provider
Resend (https://resend.com). Rationale: HTTP API + idempotency keys, domain verification via DNS, webhooks (Svix-signed), 100-email batch, no SMTP setup, fits Next.js server route handler. Official docs cited above. Alternative: Supabase's built-in auth emails (only for auth flows; not for app notifications) — official but insufficient for introduction-request emails.

## Supabase Next.js SSR auth (official)
- Packages: `@supabase/ssr` + `@supabase/supabase-js` (already in package.json). Do not mix with deprecated `@supabase/auth-helpers-nextjs`.
- Env vars (client-exposed, safe only with RLS): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (docs use publishable key; repo `.env.example` uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` — reconcile: current Supabase docs now call it publishable key `sb_publishable_...`; anon key still works as legacy). Server-only: `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS — never in client).
- Two client factories: browser client + server client via `cookies()`. Proxy file `proxy.ts` (Next 16 renamed from middleware.ts) refreshes session with `supabase.auth.getClaims()` (verify signature). Never trust `getSession()` server-side.
- Use PKCE flow (default in @supabase/ssr). Auth code exchange via `exchangeCodeForSession`.

## RLS requirements (official pattern; specific to data model)
- profiles: own row read/write; others only if discoverable; contact_method only to accepted collaborators.
- needs/offers: own; others only if owner discoverable and status open/active.
- introduction_requests: sender + recipient read; sender creates/withdraws; recipient accepts/declines. Unique partial index prevents duplicate pending.
- collaborations: two participants read/write.
- collaboration_feedback: two participants read; own insert after completion.
- notifications (new table needed): recipient read; insert via service role or trigger; no client writes.
- Realtime: private channels; RLS on `realtime.messages` for SELECT/INSERT.

## Realtime options (official)
- Broadcast (recommended by Supabase docs for scalability/security) over Postgres Changes.
- Use database trigger → `realtime.broadcast_changes()` or `realtime.send()` to private channel `user:{recipient_id}:notifications`.
- Postgres Changes simpler but scales poorly (authorization per subscriber).
- Clients call `supabase.realtime.setAuth()` before subscribing to private channels. Enable replication on notifications table only if using Postgres Changes.

## Email provider config (Resend official)
Env vars:
- `RESEND_API_KEY` (server only)
- `RESEND_FROM_EMAIL` (e.g. `Tulay <intro@yourdomain.com>`)
- `RESEND_WEBHOOK_SECRET` (Svix signing secret for webhook verification)
- `NEXT_PUBLIC_APP_URL` (already) for accept/decline links

Sender-domain verification: verify domain via DNS (SPF/DKIM/DMARC + tracking CNAME). Once verified, any address at domain works — no per-sender setup. Async; use `domain.verified` webhook instead of polling.

API auth: `Authorization: Bearer <RESEND_API_KEY>`. Sending keys can be restricted to one domain.

Idempotency: `Idempotency-Key` header, ≤256 chars, 24h window. Use `intro-request/{introduction_request_id}`.

Webhooks: Svix headers `svix-id`, `svix-timestamp`, `svix-signature`; verify before acting. Events include delivery, bounce, complaint, failed.

Rate limits/anti-abuse (official-ish from docs + general): per-account sending limits by plan; 100/request batch max. Anti-abuse: verify domain, suppress bounced/complained addresses, unsubscribe handling, webhook-based suppression list. No explicit per-second limits stated in fetched docs — check dashboard/plan.

## Minimal implementation pattern
1. Server action on "send introduction request": insert `introduction_requests` row (RLS: sender owns). On success, call Resend POST /emails with idempotency key, from `RESEND_FROM_EMAIL`, to recipient's contact email (fetched server-side via service role or RLS-allowed join), subject "X would like to connect", body contains in-app link `NEXT_PUBLIC_APP_URL/introductions/{id}` plus message preview. Do NOT include recipient's contact details in email body to sender.
2. Recipient sees request in-app (Realtime notification) and via email link.
3. Accept/decline via server action updating status + responded_at; on accept create collaboration row (one per accepted intro).
4. Contact method shared only after acceptance (RLS + view).

## Introduction acceptance workflow
pending → accepted (creates collaboration) or declined/withdrawn. Unique partial index prevents duplicate pending. Consent: no contact detail shared until accepted. Email is notification only; acceptance state lives in DB and is authoritative.

## Security & consent requirements
- Email never sent without sender's explicit action (server action).
- Recipient email fetched server-side; never exposed to sender or model.
- Model never receives contact details (per architecture trust boundary).
- RLS is last line; service role only in server route handlers/actions.
- Idempotency prevents duplicate emails on retry.
- Webhook verification (Svix) before processing delivery events.
- Demo mode: if env missing, use demo provider + fixtures; label "Demo".

## Local testing instructions
- `cp .env.example apps/web/.env.local`; fill Supabase + Resend test key.
- Supabase local: `supabase start` (email testing server on port 54324) for auth emails; app emails via Resend test domain or Resend's sandbox.
- Resend: use onboarding@resend.dev / test domain; webhook testing via `resend webhooks` CLI or ngrok to localhost.
- Run lint + typecheck: `npm run lint`, `npx tsc --noEmit`, `npm run build`.

## Configuration blockers requiring founder action
1. Create Supabase project (region decision) — unresolved per TECH_STACK.
2. Create Resend account + verify sender domain (DNS access to tulay domain) — founder must own DNS.
3. Decide sender domain/subdomain and from-address.
4. Provide `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET` to Vercel env.
5. Confirm hackathon requires specific Meta model/hosting (unresolved).
6. Decide whether to use Supabase publishable key naming vs legacy anon key (update .env.example).

Keep scope: no payments, no chat, no vector DB. Small complete flow only.
