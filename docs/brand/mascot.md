# Tulay Mascot

Status: **Arko is the official Tulay mascot** (human-approved from the concept
sheet). Ugnay and Tibay below are rejected explorations, kept for the record —
not competing mascots.

Reference (visual source of truth, do not redesign):
`docs/brand/mascot/Arko Pixel-Art Brand Concept Sheet.png`

Shared constraints for all directions: refined 16-bit pixel art, brand palette
only (forest `#164F3B`/`#2E7D5B`, ivory `#F6F2E6`, coral `#F77F6B`), strong
silhouette readable at 32px, friendly but not childish, works on web, Android,
social and README illustrations. Original work, not derived from any existing
character.

## Selected: Arko, the bridge sprite

A small green-hooded character with a leaf sprout, cream face, coral cheeks,
who carries (and becomes) a miniature coral bridge. Personality: curious,
helpful, optimistic, focused, celebrates progress with you.

Approved states (each maps to an `ArkoState` in `apps/web/components/Arko.tsx`):

| State | Approved artwork | In-app moment |
| --- | --- | --- |
| `idle` | `public/brand/mascot/arko-idle.png` | Browsing header ("Person N of M") |
| `curious` | `arko-curious.png` | Reserved for onboarding prompts |
| `searching` | `arko-searching.png` | Matching loading ("Building a bridge…") |
| `match-found` | `arko-match-found.png` | Reserved for future match highlight |
| `pending` | `arko-pending.png` | Waiting on the other person's reply |
| `connected` | `arko-connected.png` | Reserved for accepted introductions |
| `celebration` | `arko-celebration.png` | Outcome recorded ("done" step) |
| `empty` | `arko-empty.png` | No-matches empty state |
| hero | `arko-hero.png` | README hero only, never in-app |

Production notes: pixel-exact crops from the approved sheet (no AI
regeneration, no drift); exterior sheet background flood-filled to true
transparency (tolerance-keyed, edge-seeded — enclosed paper tones inside the
artwork are preserved as drawn); `image-rendering: pixelated`; one gentle bob
animation (`arko-bob`, 2.6s) disabled under `prefers-reduced-motion`;
decorative `aria-hidden` by default, optional label.

Usage rules: loading, matching and success moments only. Never in consent
buttons or flows (a mascot must not pressure a yes), never as a chat avatar
pretending to be human.

## React Native notes (for the future Expo app)

- The PNGs work as-is with the `Image` component; bundle them as `@2x`-style
  assets (source sprites are ~170px, crisp at 64–88pt; re-export @3x from the
  approved sheet before store submission if needed).
- Port `Arko.tsx` to a `View` + `Image` component with the same `state` prop;
  replace the CSS bob with a single `Animated.loop` translateY, still gated on
  `AccessibilityInfo.isReduceMotionEnabled`.
- Keep mascot files under `assets/mascot/`, separate from application logic.

## Rejected explorations (do not use)

### Ugnay (Connector) — rejected

Round ivory creature of two interlinked rings with green arms. Readable, but
the knot reads as a side character rather than Tulay itself, and the concept
overlaps generic "connection" mascots. Kept on the concept sheet only.

### Tibay (Builder) — rejected

Small green builder with coral hard hat carrying a plank. Charming, but the
construction metaphor suggests manual labor and narrows Tulay to "building"
rather than connecting. Kept on the concept sheet only.

## Asset specification (for any future Arko pose)

- Main artwork: transparent PNG, 512px + SVG trace where clean.
- App-icon adaptation: rounded square, forest background, Arko face centered,
  safe-area tested at 48px.
- Small sizes: pixel-tuned 32px and 24px variants, not just scaled.
- Poses: idle, thinking, connecting, celebration (+ the approved set above).
- Optional sprite sheet: 16×16 base grid, consistent 4-frame idle + 2-frame
  reactions, single palette file.
