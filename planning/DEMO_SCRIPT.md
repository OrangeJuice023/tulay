# Tulay — Judge Demo Script (3–4 minutes, recorded 2026-11-05)

Setup: `cd apps/web && npm install && npm run dev`, open
http://localhost:3000. Model key + Supabase configured (see `/api/health`:
`{"ok":true,"demoMode":false,"provider":"meta","contractOk":true}`).

North star to land: **"Your next career move shouldn't be a solo mission."**
AI understands the user, deterministic matching finds real people, both sides
consent, and the relationship leads to recorded progress.

## Accounts and data (prepare before recording)

- Demo account: sign in with the address + password from the delivery handoff
  (never committed to the repo). It has a completed profile ("Demo Voyager",
  1 need, 1 offer) and no decks — a clean slate for the deck step.
- Fresh-signup path: needs a real inbox you control and a fresh Supabase
  email hour (free-tier rate limit trips after a few signup emails —
  KNOWN_ISSUES #16). If the hour is spent, use the demo account (fallback A).
- Guest path needs nothing: labelled demo mode, browser-local only.
- Do NOT show the dev-server terminal on camera: it logs server-action
  arguments including passwords (dev-only framework behavior, KNOWN_ISSUES #17).

## Local URLs (verified)

- Landing: http://localhost:3000/
- Signup / login: http://localhost:3000/signup · http://localhost:3000/login
- Onboarding: http://localhost:3000/onboarding (new users land here automatically)
- Home: http://localhost:3000/home
- Ask Arko: http://localhost:3000/ask
- Pitch Deck Studio: http://localhost:3000/deck
- Directory: http://localhost:3000/discover · Studios: http://localhost:3000/explore
- Health: http://localhost:3000/api/health

## The run (signed-in path, ~3:30)

1. **Land (15s).** Open `/`. Point at the tagline. Say: "Tulay's bet is that
   AI should help people help one another — not replace the relationship."
2. **Sign in (20s).** `/login` with the demo account → lands on `/home`
   (returning user, no repeat onboarding). Point at the greeting, journey
   stats, and right rail. Say: "Every number is computed from my data."
3. **Ask Arko, text (30s).** `/ask`. Send: **"I want to learn data
   analytics. Who should I talk to first?"** Live AI reply renders; need
   confirmed; shortlist searches real + fixture members. Say: "Arko
   understands the words; the deterministic matcher finds the people."
4. **Voice (40s).** Click the mic, allow the microphone, say **"I want to
   become a UX designer and I need a portfolio review"**, stop, review the
   transcript in the composer, fix a word, send. Say: "Nothing sends until I
   approve the transcript — consent before outreach, even to the AI."
   Fallback: if the mic or live transcription fails, the route returns a
   labelled demo transcript — say so aloud, do not pretend it heard you.
5. **Pitch Deck Studio (60s).** `/deck`. New deck → Startup template, title
   "Acme pre-seed pitch", purpose/audience/context → **Draft with AI**.
   Point at the "Drafted with live AI" note. Edit the Problem slide (add a
   bullet), drag-reorder via ↑, Save → "Saved …" state. **Export .pptx**,
   open the file: title, edited bullets, placeholders all present. Say:
   "Unknowns come back as bracketed placeholders — the model never invents
   traction."
6. **Consent + outcome (30s).** Back on `/ask`, open a match → **Why this
   match** (grounded evidence, no scores) → Ask for an introduction → edit
   the draft → consent checkbox → send. Say: "Nothing reaches her until we
   both accept." (Recipient reply is a labelled simulation for demo
   members; the signed-in two-sided inbox is implemented.)
7. **Close (15s).** `/home`: stats, notifications, journey trail. Say the
   tagline once more.

Total: ~3:30.

## Fresh-signup variant (shows onboarding, +60s)

Replace step 2 with: `/signup` → name + email + password → check-email
screen → open the inbox link (same browser) → lands on `/onboarding` →
4 steps (name, goal, needs, offers, path) → success → `/home`. Resend link
is on both the pending screen and `/login`. Only attempt with a fresh
email hour; otherwise use fallback A (demo account, steps above).

## Fallbacks (labelled, honest)

- A. Auth/email trouble → demo-account login (no email needed).
- B. Model key trouble → the app falls back to labelled demo replies; the
  transcript/deck steps show their demo labels. Say so aloud.
- C. Full guest run → the original no-account journey (`/start` → `/ask` →
  MatchFlow → outcome) still works end to end in labelled demo mode.

## What to disclose (30s, if asked)

- Live in this recording: Supabase auth/profiles/needs/offers/decks,
  Meta chat/transcription/deck-drafting, PowerPoint export.
- Labelled demo: fixture members (`Demo` badges), simulated recipient
  replies, guest browser-local decks.
- Not wired: Resend email (code complete, unconfigured — in-app only),
  mobile app, deployment. No fake users, scores, or success states.
