-- 0003_storage.sql: avatar buckets. demo-avatars is public-read; member-avatars
-- is owner-scoped for writes and readable by authenticated users only. Guests
-- never see real members, so guests never need member-avatars reads.

insert into storage.buckets (id, name, public)
values ('demo-avatars', 'demo-avatars', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('member-avatars', 'member-avatars', false)
on conflict (id) do update set public = false;

-- demo-avatars: public read, no client writes (seeded by service role / deploy).
drop policy if exists demo_avatars_public_read on storage.objects;
create policy demo_avatars_public_read on storage.objects
  for select using (bucket_id = 'demo-avatars');

-- member-avatars: owner manages "<auth.uid()>/*"; authenticated users may read.
drop policy if exists member_avatars_owner_write on storage.objects;
create policy member_avatars_owner_write on storage.objects
  for insert with check (
    bucket_id = 'member-avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists member_avatars_owner_update on storage.objects;
create policy member_avatars_owner_update on storage.objects
  for update using (
    bucket_id = 'member-avatars' and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'member-avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists member_avatars_owner_delete on storage.objects;
create policy member_avatars_owner_delete on storage.objects
  for delete using (
    bucket_id = 'member-avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists member_avatars_auth_read on storage.objects;
create policy member_avatars_auth_read on storage.objects
  for select to authenticated using (bucket_id = 'member-avatars');
