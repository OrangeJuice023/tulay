# Email Setup (Resend)

Status: **code complete, not configured, never sent.** No email has ever been
sent from Tulay — there are no credentials in any environment, and the sender
domain is not verified. The app sends in-app notifications always, and email
only when this page's configuration exists. Nothing in the UI claims an email
was sent unless the Resend API returned an id.

## What is implemented

- `apps/web/lib/email/resend.ts` — minimal Resend client (server-only).
  Wire details verified against the official Resend API reference
  (`resend.com/docs/api-reference/emails/send-email`, fetched 2026-11-04):
  `POST https://api.resend.com/emails`, `Authorization: Bearer <key>`,
  `Idempotency-Key` header, success shape `{ id }`. 15s timeout, zero
  retries, typed `ResendError` that never carries the key or the address.
- `apps/web/lib/email/notify.ts` — delivery orchestration. Every event writes
  a Supabase in-app notification first, then sends at most one email.
- Events with email: introduction received, introduction accepted/declined,
  collaboration updated. Outcome notifications are in-app only (low urgency).
- Guards: emails send only from explicit sender actions (server actions);
  recipient addresses are fetched server-side via the service role and never
  exposed to the sender or the model; demo members structurally cannot receive
  email (no auth user, so the address lookup returns null and delivery is
  skipped); acceptance happens in-app behind sign-in, so no magic-link token
  scheme was invented.
- Tests: `apps/web/lib/email/resend.test.ts` (payload shape, id return,
  rejection without leaking the address, missing-key failure). No live
  request has been made.

## Manual configuration (founder)

1. Create a Resend account at `resend.com`.
2. Verify the sender domain via DNS (SPF/DKIM/DMARC records Resend shows
   you). Until this is done, Resend only delivers to your own address.
3. Create a sending API key restricted to that domain.
4. Set server-only environment variables (Vercel or `apps/web/.env.local`,
   never commit values):
   - `RESEND_API_KEY=<key>`
   - `RESEND_FROM_EMAIL=Tulay <intro@yourdomain.com>` (must be on the
     verified domain)
5. Deploy, then trigger a real introduction between two signed-in test users
   and confirm both the in-app notification and the delivered email.
6. Check the server log for `[tulay][notify] ... emailed=sent|failed`.

## Deferred (documented, not built)

- `RESEND_WEBHOOK_SECRET` delivery-event webhook (bounce/complaint handling).
  The event name is reserved in `.env.example`; no route exists yet.
- Suppression-list handling for bounces and complaints.
- Per-user email preferences (opt-out of notification emails).
