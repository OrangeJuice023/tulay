-- 0001_real_members.sql: real-member dataset. Additive only; no drops, no rewrites.
-- Profiles reference auth.users. Every table has RLS. Contact details are never
-- in a public read path: application queries must select explicit columns.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- profiles --
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 100),
  headline text check (char_length(headline) <= 160),
  bio text check (char_length(bio) <= 2000),
  career_background text check (char_length(career_background) <= 2000),
  current_situation text check (char_length(current_situation) <= 2000),
  career_goal text check (char_length(career_goal) <= 2000),
  availability text check (char_length(availability) <= 200),
  languages text[] not null default '{}',
  country_code char(2) not null default 'PH',
  locale text not null default 'en-PH',
  discoverable boolean not null default true,
  visibility_settings jsonb not null default '{}',
  primary_studio text check (primary_studio in ('career', 'freelance', 'venture')),
  interests text[] not null default '{}',
  location text check (char_length(location) <= 200),
  avatar_path text check (char_length(avatar_path) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists profiles_discoverable_idx on public.profiles (discoverable) where discoverable;

-- ------------------------------------------------------------------- needs --
create table if not exists public.needs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  description text not null check (char_length(description) between 1 and 2000),
  tags text[] not null default '{}',
  goal_context text check (char_length(goal_context) <= 2000),
  status text not null default 'open' check (status in ('open', 'fulfilled', 'closed')),
  ai_suggested boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists needs_profile_idx on public.needs (profile_id);

-- ------------------------------------------------------------------ offers --
create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  description text not null check (char_length(description) between 1 and 2000),
  tags text[] not null default '{}',
  capacity text check (char_length(capacity) <= 200),
  status text not null default 'active' check (status in ('active', 'paused')),
  rate_amount numeric check (rate_amount is null or rate_amount >= 0),
  currency_code char(3),
  created_at timestamptz not null default now()
);
create index if not exists offers_profile_idx on public.offers (profile_id);

-- ------------------------------------------------- introduction_requests --
create table if not exists public.introduction_requests (
  id uuid primary key default gen_random_uuid(),
  from_profile_id uuid not null references public.profiles (id) on delete cascade,
  to_profile_id uuid not null references public.profiles (id) on delete cascade,
  need_id uuid not null references public.needs (id) on delete cascade,
  offer_id uuid references public.offers (id) on delete set null,
  match_factors text[] not null default '{}',
  explanation text check (char_length(explanation) <= 2000),
  message text not null check (char_length(message) between 1 and 2000),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'withdrawn')),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  check (from_profile_id <> to_profile_id)
);
create unique index if not exists intro_pending_unique
  on public.introduction_requests (from_profile_id, to_profile_id, need_id)
  where status = 'pending';
create index if not exists intro_participants_idx
  on public.introduction_requests (from_profile_id, to_profile_id);

-- ----------------------------------------------------------- collaborations --
create table if not exists public.collaborations (
  id uuid primary key default gen_random_uuid(),
  introduction_request_id uuid not null unique references public.introduction_requests (id) on delete cascade,
  requester_id uuid not null references public.profiles (id) on delete cascade,
  helper_id uuid not null references public.profiles (id) on delete cascade,
  intended_outcome text check (char_length(intended_outcome) <= 2000),
  status text not null default 'agreed' check (status in ('agreed', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  check (requester_id <> helper_id)
);

-- ------------------------------------------------- collaboration_milestones --
create table if not exists public.collaboration_milestones (
  id uuid primary key default gen_random_uuid(),
  collaboration_id uuid not null references public.collaborations (id) on delete cascade,
  text text not null check (char_length(text) between 1 and 500),
  done boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists milestones_collab_idx on public.collaboration_milestones (collaboration_id);

-- --------------------------------------------------- collaboration_outcomes --
create table if not exists public.collaboration_outcomes (
  id uuid primary key default gen_random_uuid(),
  collaboration_id uuid not null references public.collaborations (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  helped text not null check (helped in ('yes', 'partly', 'no')),
  note text check (char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  unique (collaboration_id, profile_id)
);

-- ------------------------------------------------------- updated_at trigger --
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- --------------------------------------------------------------------- RLS --
alter table public.profiles enable row level security;
alter table public.needs enable row level security;
alter table public.offers enable row level security;
alter table public.introduction_requests enable row level security;
alter table public.collaborations enable row level security;
alter table public.collaboration_milestones enable row level security;
alter table public.collaboration_outcomes enable row level security;

-- profiles: owner manages own row; anyone may read discoverable rows.
-- Application code must never select contact_method for non-participants.
drop policy if exists profiles_owner_all on public.profiles;
create policy profiles_owner_all on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists profiles_discoverable_read on public.profiles;
create policy profiles_discoverable_read on public.profiles
  for select using (discoverable = true);

-- needs/offers: owner manages own; others read only discoverable owners' open rows.
drop policy if exists needs_owner_all on public.needs;
create policy needs_owner_all on public.needs
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
drop policy if exists needs_discoverable_read on public.needs;
create policy needs_discoverable_read on public.needs
  for select using (
    status = 'open' and exists (
      select 1 from public.profiles p where p.id = needs.profile_id and p.discoverable
    )
  );
drop policy if exists offers_owner_all on public.offers;
create policy offers_owner_all on public.offers
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
drop policy if exists offers_discoverable_read on public.offers;
create policy offers_discoverable_read on public.offers
  for select using (
    status = 'active' and exists (
      select 1 from public.profiles p where p.id = offers.profile_id and p.discoverable
    )
  );

-- introduction_requests: participants read; sender creates and withdraws;
-- recipient accepts or declines. Server actions own the transitions.
drop policy if exists intro_participant_read on public.introduction_requests;
create policy intro_participant_read on public.introduction_requests
  for select using (auth.uid() = from_profile_id or auth.uid() = to_profile_id);
drop policy if exists intro_sender_create on public.introduction_requests;
create policy intro_sender_create on public.introduction_requests
  for insert with check (auth.uid() = from_profile_id and status = 'pending');
drop policy if exists intro_sender_withdraw on public.introduction_requests;
create policy intro_sender_withdraw on public.introduction_requests
  for update using (auth.uid() = from_profile_id and status = 'pending')
  with check (auth.uid() = from_profile_id and status = 'withdrawn');
drop policy if exists intro_recipient_decide on public.introduction_requests;
create policy intro_recipient_decide on public.introduction_requests
  for update using (auth.uid() = to_profile_id and status = 'pending')
  with check (auth.uid() = to_profile_id and status in ('accepted', 'declined'));

-- collaborations: only the two participants, created from an accepted request.
drop policy if exists collab_participant_read on public.collaborations;
create policy collab_participant_read on public.collaborations
  for select using (auth.uid() = requester_id or auth.uid() = helper_id);
drop policy if exists collab_participant_create on public.collaborations;
create policy collab_participant_create on public.collaborations
  for insert with check (
    (auth.uid() = requester_id or auth.uid() = helper_id) and exists (
      select 1 from public.introduction_requests r
      where r.id = collaborations.introduction_request_id and r.status = 'accepted'
    )
  );
drop policy if exists collab_participant_update on public.collaborations;
create policy collab_participant_update on public.collaborations
  for update using (auth.uid() = requester_id or auth.uid() = helper_id)
  with check (auth.uid() = requester_id or auth.uid() = helper_id);

-- milestones: participants of the parent collaboration manage them.
drop policy if exists milestone_participant_all on public.collaboration_milestones;
create policy milestone_participant_all on public.collaboration_milestones
  for all using (exists (
    select 1 from public.collaborations c
    where c.id = collaboration_milestones.collaboration_id
      and (auth.uid() = c.requester_id or auth.uid() = c.helper_id)
  )) with check (exists (
    select 1 from public.collaborations c
    where c.id = collaboration_milestones.collaboration_id
      and (auth.uid() = c.requester_id or auth.uid() = c.helper_id)
  ));

-- outcomes: participants read; each participant writes only their own row.
drop policy if exists outcome_participant_read on public.collaboration_outcomes;
create policy outcome_participant_read on public.collaboration_outcomes
  for select using (exists (
    select 1 from public.collaborations c
    where c.id = collaboration_outcomes.collaboration_id
      and (auth.uid() = c.requester_id or auth.uid() = c.helper_id)
  ));
drop policy if exists outcome_owner_write on public.collaboration_outcomes;
create policy outcome_owner_write on public.collaboration_outcomes
  for insert with check (
    auth.uid() = profile_id and exists (
      select 1 from public.collaborations c
      where c.id = collaboration_outcomes.collaboration_id
        and (auth.uid() = c.requester_id or auth.uid() = c.helper_id)
    )
  );
