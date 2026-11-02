# Known Issues

Unresolved technical issues and blockers. Add date, impact and owner. Remove when fixed.

| # | Issue | Impact | Owner | Found |
| --- | --- | --- | --- | --- |
| 1 | Meta Model API wire details corroborated from secondary sources only; no live request yet | Live behavior unproven; rate limits/cost/retention unknown | Kilo (confirm) + Muse Code (live test) | 2026-10-29 |
| 2 | `supabase/migrations/` empty; no Supabase client | No persistence, auth or RLS | Muse Code | 2026-10-28 |
| 3 | Demo journey keeps introductions and collaborations in browser `localStorage` (`apps/web/lib/demo-store.ts`); recipient replies are simulated | No real second participant until Supabase lands | Claude Code (after Muse's schema) | 2026-10-29 |
| 4 | `DemoProvider` draft and next-step texts are generic fixed templates (labelled in the UI) | Demo copy is bland until the UI wires the real provider | Claude Code | 2026-10-29 |
| 5 | `public/brand/tulay-wordmark.svg` sets "Tulay" as SVG text, so it renders in a fallback font where Inter is not installed | Static file only; the app uses the React wordmark | Claude Code | 2026-10-29 |
| 6 | Root `package-lock.json` generated but not committed (supersedes the removed `apps/web` lockfile) | Installs not reproducible until committed | whoever commits next | 2026-10-28 |
| 7 | `npm install` warns that `unrs-resolver` postinstall is not in `allowScripts` | Possibly slower lint resolution; lint passes | Muse Code | 2026-10-28 |
| 8 | `apps/web/README.md` is the create-next-app default | Misleading for new contributors | Claude Code | 2026-10-28 |
| 9 | Some existing files saved with a UTF-8 BOM by an earlier tool | Cosmetic; watch for tools that mishandle it | any | 2026-10-28 |
| 10 | Hackathon rules (required Meta model, submission format, deadline time zone) not captured in the repo | Risk of building to the wrong spec | team | 2026-10-28 |
| 11 | License not chosen | Needed before public submission | team | 2026-10-28 |
