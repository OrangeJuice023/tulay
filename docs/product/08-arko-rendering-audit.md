# Arko rendering bug audit

Status: code-level audit (no screenshots found — see evidence gap). No code
changes in this phase.

## Evidence gap (important)

The brief cites "provided local screenshots" showing clipping, tiny Arko,
homepage overlap/duplication, and cut-off sections. A full-tree search found
**no such screenshots** in the repo (only the approved concept sheet and the
generated exploration sheet). **Do not assume bundling proves rendering** —
but likewise, rendering bugs cannot be confirmed without the pictures. The
findings below are what static code + bundle inspection can and cannot prove.

## What code inspection proves

- **Assets are correct:** all 8 production PNGs verified pixel-by-pixel
  (alpha where background should be, character intact, no neighbor-slice
  artifacts); bundle references resolve (`brand/mascot/arko-*` in the start
  chunk; hero `arko-idle` in the prerendered landing HTML).
- **Clip risk (1 real):** homepage hero Arko is `absolute right-4 bottom-3`
  inside an `overflow-hidden rounded-b-[2.5rem]` art container — it can touch
  the rounded-corner clip. Cosmetic, by design (sits "on" the bridge), but if
  screenshots show hard clipping here, move to `bottom-6 right-6`.
- **Size intent:** 44px (typing) and 48px (match count) are deliberately small
  inline markers; 72px moments, 88px celebration, 120px+ README hero. If
  screenshots show "disproportionately small," say where — these sizes are
  specced, not accidental.
- **No overlap mechanism found:** the hero wrapper is a plain block div (no
  negative margins, no absolute escapes except Arko itself, which is
  `pointer-events-none` inside the art column). No code path duplicates
  homepage sections. If overlap/duplication reproduces, it is not from the
  current tree's committed layout — capture route + viewport + build.
- **Aspect handling is safe:** `Arko.tsx` derives height from each asset's
  true aspect; `image-rendering: pixelated` preserves crispness; decorative
  instances are `aria-hidden`.

## Correction plan (needs the screenshots first)

1. Attach the screenshots (file, route, viewport width, desktop/mobile).
2. Reproduce each at 390 / 768 / 1440 against `npm run dev`.
3. Fix per finding (reposition hero Arko clear of the rounded clip; confirm
   `sizes` on next/image; check `ActionBar` ancestors for transforms).
4. Re-verify in the production build output (prerender HTML + chunks), not
   just the dev server.

## Standing prevention rules

- New Arko placements: in-flow or padded absolute, never over CTAs, forms, or
  the mobile ActionBar; decorative = `aria-hidden`; motion only via
  `.arko-bob` (already reduced-motion-gated).
- Concept sheet (`docs/brand/mascot/*sheet*.png`) must never be referenced
  from `apps/web` or the README — verified clean by repo search.
