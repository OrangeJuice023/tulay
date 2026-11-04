-- 0007_decks.sql: per-user pitch decks for Pitch Deck Studio. Owner-only
-- rows; slides are JSON validated by the app against DeckSchema. Additive only.
create table if not exists public.decks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  purpose text not null default '' check (char_length(purpose) <= 2000),
  audience text not null default '' check (char_length(audience) <= 500),
  context text not null default '' check (char_length(context) <= 4000),
  template text not null check (template in ('startup', 'proposal', 'portfolio')),
  slides jsonb not null default '[]'::jsonb,
  source text not null default 'manual' check (source in ('manual', 'ai-draft')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.decks enable row level security;

drop policy if exists decks_owner_all on public.decks;
create policy decks_owner_all on public.decks
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create index if not exists decks_owner_updated_idx on public.decks (owner_id, updated_at desc);

drop trigger if exists decks_touch on public.decks;
create trigger decks_touch before update on public.decks
  for each row execute function public.touch_updated_at();
