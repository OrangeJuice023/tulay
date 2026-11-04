-- 0002_demo_dataset.sql: fictional demo community. Separate tables, never joined
-- with real-member tables. Readable by anonymous visitors; no write policies, so
-- anon/authenticated clients cannot modify demo rows (service role seeds them).
-- No auth.users linkage: demo rows must never become auth accounts.

-- ------------------------------------------------------------- demo_profiles --
create table if not exists public.demo_profiles (
  id uuid primary key,
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
  primary_studio text not null check (primary_studio in ('career', 'freelance', 'venture')),
  interests text[] not null default '{}',
  location text check (char_length(location) <= 200),
  avatar_file text check (char_length(avatar_file) <= 200),
  created_at timestamptz not null default now()
);
create index if not exists demo_profiles_studio_idx on public.demo_profiles (primary_studio);

-- ---------------------------------------------------------------- demo_needs --
create table if not exists public.demo_needs (
  id uuid primary key,
  demo_profile_id uuid not null references public.demo_profiles (id) on delete cascade,
  description text not null check (char_length(description) between 1 and 2000),
  tags text[] not null default '{}',
  goal_context text check (char_length(goal_context) <= 2000),
  status text not null default 'open' check (status in ('open', 'fulfilled', 'closed')),
  created_at timestamptz not null default now()
);
create index if not exists demo_needs_profile_idx on public.demo_needs (demo_profile_id);

-- --------------------------------------------------------------- demo_offers --
create table if not exists public.demo_offers (
  id uuid primary key,
  demo_profile_id uuid not null references public.demo_profiles (id) on delete cascade,
  description text not null check (char_length(description) between 1 and 2000),
  tags text[] not null default '{}',
  capacity text check (char_length(capacity) <= 200),
  status text not null default 'active' check (status in ('active', 'paused')),
  created_at timestamptz not null default now()
);
create index if not exists demo_offers_profile_idx on public.demo_offers (demo_profile_id);

-- -------------------------------------- demo_introduction_scenarios --
create table if not exists public.demo_introduction_scenarios (
  id uuid primary key,
  title text not null check (char_length(title) between 1 and 200),
  narrative text not null check (char_length(narrative) between 1 and 4000),
  from_demo_profile_id uuid references public.demo_profiles (id) on delete set null,
  to_demo_profile_id uuid references public.demo_profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- -------------------------------------- demo_collaboration_scenarios --
create table if not exists public.demo_collaboration_scenarios (
  id uuid primary key,
  title text not null check (char_length(title) between 1 and 200),
  narrative text not null check (char_length(narrative) between 1 and 4000),
  outcome text not null check (outcome in ('yes', 'partly', 'no')),
  created_at timestamptz not null default now()
);

-- --------------------------------------------------------------------- RLS --
-- Read-only to everyone including anon. No insert/update/delete policies exist
-- by design; only the service role (which bypasses RLS) writes seed data.
alter table public.demo_profiles enable row level security;
alter table public.demo_needs enable row level security;
alter table public.demo_offers enable row level security;
alter table public.demo_introduction_scenarios enable row level security;
alter table public.demo_collaboration_scenarios enable row level security;

drop policy if exists demo_profiles_public_read on public.demo_profiles;
create policy demo_profiles_public_read on public.demo_profiles for select using (true);
drop policy if exists demo_needs_public_read on public.demo_needs;
create policy demo_needs_public_read on public.demo_needs for select using (true);
drop policy if exists demo_offers_public_read on public.demo_offers;
create policy demo_offers_public_read on public.demo_offers for select using (true);
drop policy if exists demo_intro_public_read on public.demo_introduction_scenarios;
create policy demo_intro_public_read on public.demo_introduction_scenarios for select using (true);
drop policy if exists demo_collab_public_read on public.demo_collaboration_scenarios;
create policy demo_collab_public_read on public.demo_collaboration_scenarios for select using (true);
