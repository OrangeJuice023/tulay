@AGENTS.md

## Claude Code specifics

Claude Code's default lane is product experience and the frontend (`apps/web/`). See
`docs/AGENT_WORKFLOW.md` for the full split with Kilo (research) and Muse Code (architecture,
backend, integration).

- Before UI work, read `docs/PRODUCT_SPEC.md` for the journey you are building and keep product
  language consistent with it (for example "introduction", "collaboration", "help you can offer").
- Verify UI changes in a real browser at phone (375px) and desktop widths, with keyboard-only
  navigation, before reporting them done. Say which flows you checked.
- Accessibility baseline: every input has a visible label, focus is visible, colour is never the
  only signal, and touch targets are at least 44px.
- Demo data shows a visible "Demo" label in the UI. Never hard-code people into components; read
  them from fixtures or the database.
- Changes outside `apps/web/` (schemas in `packages/shared`, migrations, `services/ai`) belong to
  Muse Code by default. Propose them in your hand-off notes instead of making them, unless the task
  assigns them to you.
