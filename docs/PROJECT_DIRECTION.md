# Project Direction

Canonical source of truth for Tulay's product north star. Every other document follows this one:
they reference it instead of restating it.

## Tagline

**"Your next career move shouldn't be a solo mission."**

This is the central product principle, not just marketing copy. It guides design, development,
and the hackathon presentation.

## North star

**AI should help people help one another, not replace the human relationships that make career
mobility possible.**

Tulay is a community-powered AI agent that helps freelancers, career changers, and independent
workers build useful human connections and turn those connections into concrete, mutually
beneficial career progress. Our central belief is that AI should not simply tell people how to
succeed. It should help people find others who can move forward with them.

## Positioning

- **Emotional promise:** you do not have to navigate a career transition alone.
- **Functional promise:** find the people who can help you get unstuck, discover what you can
  offer in return, and turn introductions into completed acts of mutual help.

## Product thesis

A specific need plus a person who can meet it, introduced with both people's consent and a
concrete next step, creates more career progress than a job board, a feed or an AI that answers
everything itself.

## What Tulay is not

Tulay is not another AI career chatbot, professional networking feed, job board, or mentor
directory. It never treats a match or a generated message as the outcome: human connection must
become action. It is not a startup-investment platform either: founder matching runs on the
same needs-and-offers engine, and Tulay claims no investor network and makes no fundraising
promises.

What makes it different:

- Starts from the goal and a specific need, not from browsing profiles.
- Reciprocal: shows when two people can help each other, and never pressures anyone to offer.
- Consent before any contact; nothing automatic.
- AI does language work (understand, explain, draft); deterministic code picks real people.
- Measures completed acts of help ("did this help?"), not likes, followers, or message counts.

## Core workflow

1. Understand a person's career goal and immediate obstacle.
2. Identify the concrete help they need and what they can offer others.
3. Find eligible community members with complementary needs, skills, and goals.
4. Explain why the match could be mutually useful.
5. Facilitate introductions only with the participants' consent.
6. Help them agree on a concrete collaboration.
7. Follow up and record whether the collaboration actually helped.

## Final test

Every product decision must answer yes to this:

**Does this help someone make their next career move with other people, rather than having to
do it alone?**

## Problem

Freelancers, career shifters and independent workers in the Philippines often need small,
specific help: a portfolio review, feedback on a client proposal, interview practice, advice on
pricing. They rarely know who to ask, and cold-messaging strangers on large platforms feels risky
and is often ignored. People who could help would do so in exchange for something they need, but
there is no low-pressure way to find each other.

Status: this framing is a **hypothesis** from the team's experience. Kilo's research
(`research/market/philippines.md`, `research/user-needs/validation-plan.md`) should confirm or
correct it with sources before the pitch states it as fact.

## Users

- Primary: Filipino freelancers and online workers, career shifters (for example BPO to tech or
  design), recent graduates entering independent work. They are the initial target community.
  This includes people whose next move is founding: finding a co-founder, getting founder
  feedback, or meeting early users. They are matched on concrete complementary capabilities,
  not on founder status.
- Secondary: similar communities in other countries, later. The underlying concept, mutual help
  for career moves, stays relevant internationally.

## MVP scope

In: reciprocal matching (needs ↔ offers), consent-based introductions, specific collaborations
with one next step, measurable outcomes ("did this help?"), founder-related needs and offers
(co-founder search, founder feedback, early users) through the same matching engine, plus goal
and need capture with AI extraction, profiles with visibility controls, and demo mode with
labelled synthetic members.

Out: public feed, payments, job board, reputation scores, full chat, microservices, mobile app,
MCP server, international ingestion.

## Success criteria (hackathon)

1. A judge can run the full flow (goal → need → candidates → introduction → acceptance →
   next step → "helped") in under 3 minutes, live, with no dead buttons, ending in a completed
   collaboration with a recorded outcome.
2. Meta Model API powers extraction, explanations and drafts when a key is present; demo mode
   works and is labelled when it is not.
3. Consent is enforced in code and RLS, demonstrably (a declined request reveals nothing).
4. No invented people anywhere; every demo person is labelled.
5. Lint, typecheck, build and the core-flow tests pass.
6. The demo is judged by one completed act of mutual help, not by counts of profiles, matches,
   messages, or AI-generated content.

## Long term (not now)

More languages, other countries, group sessions, community moderation, vetted job-source
integration.
