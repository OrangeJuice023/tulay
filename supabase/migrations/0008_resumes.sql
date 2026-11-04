-- 0008_resumes.sql: per-user resumes for Resume Studio. Owner-only
-- rows; sections are JSON validated by the app against ResumeSchema.
-- Additive only.
create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 160),
  headline text not null default '' check (char_length(headline) <= 200),
  email text not null default '' check (char_length(email) <= 320),
  phone text not null default '' check (char_length(phone) <= 60),
  location text not null default '' check (char_length(location) <= 200),
  summary text not null default '' check (char_length(summary) <= 2000),
  experience jsonb not null default '[]'::jsonb,
  education jsonb not null default '[]'::jsonb,
  skills jsonb not null default '[]'::jsonb,
  projects jsonb not null default '[]'::jsonb,
  certifications jsonb not null default '[]'::jsonb,
  target_role text not null default '' check (char_length(target_role) <= 200),
  target_job_description text not null default '' check (char_length(target_job_description) <= 8000),
  source text not null default 'manual' check (source in ('manual', 'ai-assisted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.resumes enable row level security;

drop policy if exists resumes_owner_all on public.resumes;
create policy resumes_owner_all on public.resumes
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create index if not exists resumes_owner_updated_idx on public.resumes (owner_id, updated_at desc);

drop trigger if exists resumes_touch on public.resumes;
create trigger resumes_touch before update on public.resumes
  for each row execute function public.touch_updated_at();
