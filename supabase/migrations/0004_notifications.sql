-- 0004_notifications.sql: in-app notifications plus a contact-safe public view.
-- Additive only; no drops, no rewrites.
--
-- 1. `notifications` are recipient-scoped. Only the service role inserts them
--    (no client insert policy by design); recipients read and mark their own.
-- 2. `public_profiles` is a contact-stripped view over `profiles` with
--    security_invoker, so the underlying RLS still governs every row while
--    `contact_method` can never leak through discovery reads. Application code
--    must read discovery lists through this view and fetch `contact_method`
--    only for accepted collaborators (see RLS policy below).

-- ------------------------------------------------------------- notifications --
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_profile_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in (
    'intro_received', 'intro_accepted', 'intro_declined',
    'collab_update', 'check_in', 'outcome_submitted', 'opportunity'
  )),
  title text not null check (char_length(title) between 1 and 160),
  body text not null check (char_length(body) between 1 and 500),
  link text check (char_length(link) <= 500),
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_recipient_idx
  on public.notifications (recipient_profile_id, created_at desc);
create index if not exists notifications_unread_idx
  on public.notifications (recipient_profile_id) where read = false;

alter table public.notifications enable row level security;

-- Recipient reads their own notifications.
drop policy if exists notif_recipient_read on public.notifications;
create policy notif_recipient_read on public.notifications
  for select using (auth.uid() = recipient_profile_id);

-- Recipient marks their own notifications read/unread. Application code
-- updates the `read` column only; other columns are server-written.
drop policy if exists notif_recipient_update_read on public.notifications;
create policy notif_recipient_update_read on public.notifications
  for update using (auth.uid() = recipient_profile_id)
  with check (auth.uid() = recipient_profile_id);

-- No insert/delete policies: only the service role (server actions) writes.

-- ------------------------------------------------------------ public_profiles --
-- Contact-stripped discovery view. security_invoker (Postgres 15+) keeps the
-- base table's RLS as the governing check for every reader.
create or replace view public.public_profiles with (security_invoker = true) as
  select
    id, display_name, headline, bio, career_background, current_situation,
    career_goal, availability, languages, country_code, locale, discoverable,
    visibility_settings, primary_studio, interests, location, avatar_path,
    created_at, updated_at
  from public.profiles;

-- ---------------------------------------------------------------- contact cut --
-- Note: Postgres has no per-row column policy, so `contact_method` protection
-- is layered: (a) discovery reads go through the `public_profiles` view above,
-- which cannot return the column; (b) application code selects `contact_method`
-- only for the row owner or an accepted collaborator, after checking the
-- introduction state. A determined holder of the anon key could still select
-- the column directly from `profiles`; the follow-up is a separate
-- `profile_contacts` table (documented in planning/KNOWN_ISSUES.md, not built).
