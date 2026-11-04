# Known Issues

Unresolved technical issues and blockers. Add date, impact and owner. Remove when fixed.

| # | Issue | Impact | Owner | Found |
| --- | --- | --- | --- | --- |
| 1 | Meta Model API: `extractGoal` (2026-11-04), `chat` + `transcribeAudio` (2026-11-05, voice wire confirmed vs official docs) verified live; Taglish quality, rate limits/cost/retention still unknown | Remaining ops + terms unproven | Kilo (confirm) | 2026-10-29 |
| 2 | ~~Supabase unprovisioned; zero live requests~~ FIXED 2026-11-05: project live, migrations 0001-0007 applied, auth/onboarding/decks verified against production | — | Muse Code | 2026-10-28 |
| 3 | Demo journey keeps introductions and collaborations in browser `localStorage` (`apps/web/lib/demo-store.ts`); recipient replies are simulated | No real second participant until Supabase lands | Claude Code (after Muse's schema) | 2026-10-29 |
| 4 | `DemoProvider` draft and next-step texts are generic fixed templates (labelled in the UI) | Demo copy is bland until the UI wires the real provider | Claude Code | 2026-10-29 |
| 5 | `public/brand/tulay-wordmark.svg` sets "Tulay" as SVG text, so it renders in a fallback font where Inter is not installed | Static file only; the app uses the React wordmark | Claude Code | 2026-10-29 |
| 6 | Root `package-lock.json` generated but not committed (supersedes the removed `apps/web` lockfile) | Installs not reproducible until committed | whoever commits next | 2026-10-28 |
| 7 | `npm install` warns that `unrs-resolver` postinstall is not in `allowScripts` | Possibly slower lint resolution; lint passes | Muse Code | 2026-10-28 |
| 8 | `apps/web/README.md` is the create-next-app default | Misleading for new contributors | Claude Code | 2026-10-28 |
| 9 | Some existing files saved with a UTF-8 BOM by an earlier tool | Cosmetic; watch for tools that mishandle it | any | 2026-10-28 |
| 10 | Hackathon rules (required Meta model, submission format, deadline time zone) not captured in the repo | Risk of building to the wrong spec | team | 2026-10-28 |
| 11 | License not chosen | Needed before public submission | team | 2026-10-28 |
| 12 | Resend code complete but unconfigured: no account, key, or verified sender domain; zero emails ever sent | Introduction/acceptance emails never deliver; in-app only | founder (Resend + DNS) | 2026-11-04 |
| 13 | ~~`profiles.contact_method` dual-write~~ FIXED 2026-11-05: removed from the `profiles` upsert (column never existed; writes go only to `profile_contacts`), regression test added | — | Muse Code | 2026-11-04 |
| 14 | No deployment: no Vercel project, URL, or CI; no demo video | Submission artifacts missing; recording script + demo account ready 2026-11-05 | team | 2026-11-04 |
| 15 | Partial browser verification 2026-11-05: signup/login/onboarding/deck/ask journeys driven in system Chrome; full-matrix pass + voice-mic drive still open | Untested surfaces may have rendering issues | team | 2026-11-04 |
| 16 | Supabase free-tier auth email rate limit trips after a few signup emails ("email rate limit exceeded"); recording signup should be the first email action in a fresh hour, demo-account login is the fallback | Live signup on camera can fail if the hour is spent | team | 2026-11-05 |
| 17 | Next.js dev server logs server-action arguments including passwords (dev-only framework behavior; production unaffected) | Credential exposure on shared screens/recording | team | 2026-11-05 |
| 18 | Real-email confirmation-link click untested (no inbox access): PKCE `code` branch code-reviewed, token/error branches verified with generated links | First live run is the recording signup; demo-account login is the fallback | team | 2026-11-05 |

## Fixed 2026-11-05 (verified in D:\Tulay, uncommitted)
- Supabase live end-to-end: project reachable, migrations 0001-0007 applied
  via CLI, RLS exercised (owner/discoverable/anon paths), signup toggle
  confirmed ON, demo recording account created.
- Auth/onboarding rebuilt: pending-session check-email screen, resend on
  signup + login, callback handles `code` + `token_hash` with allowlisted
  `next` (open redirect closed), idempotent profile ensure, 4-step onboarding
  with new-user gating on `/home` + `/onboarding` (proxy 307s + page gates).
- Voice wire corrected to the official shape (`request` + `audio` parts,
  `Accept: application/json`, `{transcript, audioDurationMs}`) and verified
  live through the app route (word-perfect, `source: "live"`).
- Pitch Deck Studio built: schemas + slide ops, 9th AI op (`draftDeckOutline`,
  anti-fabrication prompt, template grounding), `decks` table + owner RLS,
  editor UI, real `.pptx` export (content-verified), studio entry flipped live.
- Suite at 357/357 tests (30 files); typecheck green in all workspaces; lint
  clean; production build green (33 routes).

## Fixed 2026-11-04 (verified in D:\Tulay, uncommitted)
- Production build green (was: Turbopack module-resolution failure on wrong
  import sources in uncommitted `members.ts` / `demo-repository.ts`).
- AI/demo attribution honest: `criteriaSource` `demo` state, draft/suggestion
  notes follow the server source, stale stub comment rewritten; regression test
  added (`apps/web/app/start/actions.test.ts`).
- Suite at 160/160 tests (11 files); typecheck green in all 3 workspaces; lint
  clean. Test-count docs updated (README, implementation gates, MVP checklist,
  next steps).
