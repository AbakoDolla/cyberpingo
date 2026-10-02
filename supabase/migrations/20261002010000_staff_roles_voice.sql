-- CyberPingo · Staff roles and the mascot voice bucket
--
-- 1. The audit log is reserved to super-administrators. Administrators run the content and the
--    learners but cannot read who did what; the actions are still written by the audited
--    functions for everyone.
-- 2. mascot-voice: the human voice recordings played by Pingo. Public read, because learners play
--    them in their browser; only staff can write. Audio only, 5 Mo per file.

drop policy if exists "Staff read the audit log" on public.admin_logs;
create policy "Superadmins read the audit log" on public.admin_logs
  for select to authenticated using ((select public.is_superadmin()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('mascot-voice', 'mascot-voice', true, 5242880,
   array['audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Staff list mascot voice" on storage.objects
  for select to authenticated
  using (bucket_id = 'mascot-voice' and (select public.is_admin()));
create policy "Staff upload mascot voice" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'mascot-voice' and (select public.is_admin()));
create policy "Staff replace mascot voice" on storage.objects
  for update to authenticated
  using (bucket_id = 'mascot-voice' and (select public.is_admin()))
  with check (bucket_id = 'mascot-voice' and (select public.is_admin()));
create policy "Staff delete mascot voice" on storage.objects
  for delete to authenticated
  using (bucket_id = 'mascot-voice' and (select public.is_admin()));
