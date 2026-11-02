# Data Model

Status: design only. No migrations exist in `supabase/migrations/` yet. Owner: Muse Code.
Field names are snake_case in Postgres; the Zod schemas in `packages/shared` use camelCase.

## Entities

### profiles
- `id` uuid PK, references `auth.users(id)`; demo rows use generated ids with no auth user
- `display_name` text not null (1 to 100 chars)
- `bio`, `career_background`, `current_situation` text
- `career_goal` text
- `availability` text (for example "weekday evenings"); structured later if needed
- `languages` text[] (BCP 47, for example `{fil,en}`)
- `country_code` char(2) default `'PH'`; `locale` text default `'en-PH'`
- `discoverable` boolean default true; `visibility_settings` jsonb (per-field show/hide)
- `contact_method` text, shown only to accepted collaborators
- `is_demo` boolean not null default false
- `created_at`, `updated_at` timestamptz

### needs (help requests)
- `id` uuid PK; `profile_id` FK → profiles, on delete cascade
- `description` text not null; `tags` text[] (normalized skill tags used for matching)
- `goal_context` text; `status` `open | fulfilled | closed`
- `ai_suggested` boolean (whether the text came from extraction, for transparency)

### offers
- `id` uuid PK; `profile_id` FK → profiles, on delete cascade
- `description` text not null; `tags` text[]
- `capacity` text (for example "1 session a week"); `status` `active | paused`
- Optional `rate_amount` numeric + `currency_code` char(3) for later paid offers; null in MVP

The earlier draft's separate `skills` table is folded into `tags` on needs and offers: matching
only needs tag overlap, and one less join keeps the MVP simpler. Revisit if skill levels matter.

### introduction_requests
- `id` uuid PK
- `from_profile_id`, `to_profile_id` FK → profiles; check `from_profile_id <> to_profile_id`
- `need_id` FK → needs; `offer_id` FK → offers (nullable)
- `match_factors` jsonb (deterministic factors at request time); `explanation` text (AI, optional)
- `message` text not null (edited by sender)
- `status` `pending | accepted | declined | withdrawn`
- `responded_at` timestamptz
- Unique partial index on (`from_profile_id`, `to_profile_id`, `need_id`) where status =
  `pending`, so duplicate requests are impossible

The earlier draft's `match_proposals` table is dropped: candidates are computed on demand and
only persisted when someone actually asks for an introduction. That avoids storing "matches"
about people who never consented to anything.

### collaborations
- `id` uuid PK; `introduction_request_id` FK unique (one per accepted introduction)
- `requester_id`, `helper_id` FK → profiles
- `intended_outcome` text; `next_steps` jsonb array of `{text, done}`
- `status` `agreed | in_progress | completed | cancelled`
- Created only when the introduction status becomes `accepted` (enforced in the server action
  and by a check that the linked request is accepted)

### collaboration_feedback
- `collaboration_id` FK, `profile_id` FK, unique together
- `helped` `yes | partly | no`; `note` text; `created_at`
- Only participants of the collaboration can insert; only after status `completed`

### job_sources (later, not MVP)
Reserved for vetted job-listing sources from `research/data-sources/source-registry.md`
(`country_code`, `licence`, `url`, `retrieved_at`). Do not create until a source is approved.

## Access rules (RLS)

| Table | Read | Write |
| --- | --- | --- |
| profiles | own row; other rows only if `discoverable` (visible fields via a view); `contact_method` only to accepted collaborators | own row |
| needs, offers | own; others' only if owner discoverable and status open/active | own |
| introduction_requests | sender and recipient | sender creates/withdraws; recipient accepts/declines |
| collaborations | the two participants | the two participants |
| collaboration_feedback | the two participants | own row, after completion |

Demo rows (`is_demo`) are readable in demo mode and never mixed into real users' results
without the "Demo" label.
