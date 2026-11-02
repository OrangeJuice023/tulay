# Tulay Brand System

*Tulay* (Filipino for "bridge") helps freelancers, career shifters and independent
workers move forward with other people, not alone.

- North star: "Your next career move shouldn't be a solo mission."
- Tagline: "People. Opportunities. Progress."

## Purpose

Make asking for help feel normal. Every surface should say: real people, mutual
consent, and one completed act of help at a time.

## Personality

Human, welcoming, collaborative, professional, optimistic. Warm, never corporate;
encouraging, never pushy (reciprocity is shown, never pressured). Plain language,
no jargon, no hype, no unproven claims.

## Voice and tone

- Clear and approachable: short sentences, concrete verbs ("Ask Mara for help").
- Honest about limits: demo members are labeled, AI text is labeled, unknowns
  are stated ("nothing here is a verified qualification").
- Celebrates follow-through, not clicks ("You didn't do this alone").

## Color

Values from `apps/web/app/globals.css` (`@theme`). Use tokens, never raw hex in
components.

| Token | Hex | Use |
| --- | --- | --- |
| `ivory` | `#FFF9F2` | Page background |
| `forest` | `#176B46` | Primary actions, brand, progress |
| `forest-dark` | `#0F4D32` | Primary hover, button shadow |
| `leaf` | `#4CAF7A` | Secondary green accents |
| `mist` | `#EBF3EA` | Soft green surfaces, selected states |
| `coral` | `#FF7A59` | Accent only (icons, badges, art) |
| `coral-ink` | `#8A3B1F` | Text on coral-tinted surfaces |
| `peach` | `#FDEBD7` | Warm highlight surfaces |
| `ink` | `#1F2937` | Headings and body text |
| `muted` | `#535B67` | Secondary text (darkened from `#6B7280` for 4.5:1 contrast) |
| `line` | `#E8DFD2` | Borders and dividers |
| `danger` | `#B42318` | Errors only |

Rules: white text never sits on coral; body text is always ink or muted; coral is
an accent, never a full section background.

## Typography

Inter via `next/font` (latin subset, `display: swap`), `--font-sans` stack.
Scale is semantic: extrabold tracking-tight display headings, semibold section
titles, regular body, small semibold eyebrows. One family, three weights — no
display serif, no gradient headline text.

## Logo

`apps/web/components/Logo.tsx` (`LogoMark`, `Wordmark`); static copies in
`apps/web/public/brand/tulay-mark.svg` and `tulay-wordmark.svg`.

The mark: two people joined by a bridge — deck and pier read as a **T**, the arch
carries them. One figure is forest, one is coral. Green parts use
`currentColor`, so the mark works on dark surfaces with `text-ivory`.

Usage: wordmark in the header (links home), mark alone at small sizes and as the
app icon seed. Clear space around the mark; never recolor the coral figure;
never place on busy photography.

## Illustration

Landing art direction: flat bridge-and-people scenes in brand colors
(`BridgeScene` on the home page). Warm geometric shapes, no stock photos, no
glowing blobs, no purple gradients. People are simple rounded figures, always
shown together — never a lone hero staring at a dashboard.

## Iconography

Single-weight stroke icons (`apps/web/components/icons.tsx`, 24px grid, 2px
stroke, round caps): navigation arrows, pathway icons (leaf, briefcase, rocket),
check, swap. Decorative icons are `aria-hidden`; functional icon buttons always
carry an accessible label. No emoji as icons.

## Motion

One opacity-only step transition (240ms, `tulay-enter`); primary buttons press
down 3px (`shadow-press`). Pinned mobile action bars must never be wrapped in a
transformed ancestor. Everything collapses under `prefers-reduced-motion`.

## Accessibility

- Contrast: ink/muted on ivory and mist meet 4.5:1; coral-ink (not white) on
  coral surfaces.
- Touch: primary actions are min 44px; radios/checkboxes use full-label targets.
- Focus: 3px forest `:focus-visible` outline; skip-to-content link; step headings
  receive focus with smooth scroll (suppressed under reduced motion).
- Screen readers: progress announced per step, live regions on match counts,
  decorative art hidden, form errors tied to fields with `role="alert"`.
