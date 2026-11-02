# Product Spec

MVP requirements. "Must" = needed for the demo; "Should" = if time allows.

North star (canonical): `docs/PROJECT_DIRECTION.md` — "Your next career move shouldn't be a solo
mission." Journeys are judged by completed acts of mutual help with recorded outcomes, not by
profiles, matches, messages, or AI-generated content.

## Personas (hypotheses, to be checked by `research/user-needs/validation-plan.md`)

- **Career shifter (Mara):** call-centre agent moving into UX design. Needs a portfolio review
  from a working designer. Can offer English interview practice.
- **New freelancer (Jun):** developer with first Upwork-style client proposal. Needs proposal
  feedback and help with pricing. Can offer website setup help.
- **Experienced independent (Ate Liza):** senior virtual assistant. Willing to mentor; wants help
  with short-form video for her own services.
- **Aspiring founder (Diego):** mobile developer with a working prototype. Needs a
  business-minded co-founder and pitch feedback. Can offer MVP-building help.

## Journey 1: State a goal and a need (Must)

1. User signs up (email magic link) or enters demo mode.
2. User answers: "What are you trying to accomplish?" (free text, Filipino or English).
3. Tulay proposes a structured version: goal, 1 to 3 specific needs, what the user can offer.
4. User edits and confirms. Nothing is saved until they confirm.
5. User sets visibility: who can discover them, and which fields are shown.

Requirements: works with the model off (demo provider returns a fixed structure the user then
edits). Each field has a visible label. The proposal clearly says it was AI-suggested.

## Journey 2: Find complementary people (Must)

1. User picks one need.
2. Tulay lists up to 5 real members whose offers match the need, ranked deterministically.
   Members who also need something this user offers are marked "You can help each other".
3. Each card shows display name, the matching offer, shared language, availability, and a short
   explanation. Demo members carry a "Demo" label.
4. Empty state when nobody matches: say so plainly and suggest broadening the need. Never fill the
   list with invented people.
5. Applies to any career path, including founder-related needs (co-founder search, founder
   feedback, early users). Matches always come from concrete complementary offers, never from
   founder status alone.

## Journey 3: Ask for an introduction with consent (Must)

1. User opens a candidate and chooses "Ask for an introduction".
2. Tulay drafts a short message (model or demo). User edits it. User must press Send.
3. Recipient sees the request in-app: who, why, the message, what is being asked for.
4. Recipient accepts or declines. Declining is quiet (no reason required, sender sees "not now").
5. Only after acceptance do both see each other's chosen contact method.

Rules: one pending request per pair per need (no duplicates). A user can withdraw a pending
request. No email or external message is sent without the sender's action (Should: in-app only for
MVP).

## Journey 4: Coordinate a collaboration (Must)

1. Acceptance creates a collaboration with the need and one proposed next step (for example
   "30-minute portfolio review call by Friday"). Tulay may suggest steps; both can edit.
2. Status: `agreed` → `in_progress` → `completed` or `cancelled`.

## Journey 5: Record the outcome (Must)

1. When completed, each person answers "Did this help you move forward?" (yes / partly / no) and
   an optional note.
2. User's profile shows completed collaborations (private by default).

## Out of MVP

Public feed, job board, payments, ratings or reputation scores, group chat, real-time chat,
mobile app, automatic job matching.

## Product language

Use: goal, need, offer, introduction, collaboration, next step, "helped". Avoid: "connect" as a
verb for automatic actions, "match score" shown as a number, "AI found" (people are found by
search, not by AI).

## Open questions

- Is the hackathon demo shown with real sign-up or demo mode only?
- Contact method after acceptance: in-app note, email, or a link the user provides?
- Filipino-language UI in MVP, or English UI with Filipino input accepted?
