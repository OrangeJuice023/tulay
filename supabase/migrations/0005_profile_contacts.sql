-- 0005_profile_contacts.sql: isolate contact_method behind its own RLS table so
-- the anon key can never read it through `profiles`. Owner manages; accepted
-- collaborators (introduction status accepted) may read the other party's row.
create table if not exists public.profile_contacts (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  contact_method text check (char_length(contact_method) <= 500),
  updated_at timestamptz not null default now()
);

alter table public.profile_contacts enable row level security;

drop policy if exists profile_contacts_owner_all on public.profile_contacts;
create policy profile_contacts_owner_all on public.profile_contacts
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

drop policy if exists profile_contacts_accepted_read on public.profile_contacts;
create policy profile_contacts_accepted_read on public.profile_contacts
  for select using (
    exists (
      select 1 from public.introduction_requests r
      where r.status = 'accepted'
        and (
          (r.from_profile_id = auth.uid() and r.to_profile_id = profile_contacts.profile_id)
          or (r.to_profile_id = auth.uid() and r.from_profile_id = profile_contacts.profile_id)
        )
    )
  );

create or replace function public.touch_profile_contacts_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists profile_contacts_touch on public.profile_contacts;
create trigger profile_contacts_touch before update on public.profile_contacts
  for each row execute function public.touch_profile_contacts_updated_at();
