-- 0006_onboarding.sql: onboarding completion flag plus the missing outcome
-- UPDATE policy (recordOutcome upserts, so a second outcome write needs UPDATE).
-- Additive only; no drops, no rewrites.
alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false;

drop policy if exists outcome_owner_update on public.collaboration_outcomes;
create policy outcome_owner_update on public.collaboration_outcomes
  for update using (
    auth.uid() = profile_id and exists (
      select 1 from public.collaborations c
      where c.id = collaboration_outcomes.collaboration_id
        and (auth.uid() = c.requester_id or auth.uid() = c.helper_id)
    )
  ) with check (
    auth.uid() = profile_id and exists (
      select 1 from public.collaborations c
      where c.id = collaboration_outcomes.collaboration_id
        and (auth.uid() = c.requester_id or auth.uid() = c.helper_id)
    )
  );
