-- CyberPingo · Storage buckets and access rules
--   avatars        public read, each user writes only inside "<user id>/"      (2 Mo, images)
--   course-images  public read, staff write                                     (5 Mo, images)
--   lesson-assets  public read, staff write                                     (20 Mo, images, PDF, MP4)
--   certificates   private: the owner ("<user id>/…") and staff read; only the
--                  generate-certificate Edge Function (service role) writes     (5 Mo, PDF)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp']),
  ('course-images', 'course-images', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']),
  ('lesson-assets', 'lesson-assets', true, 20971520, array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf', 'video/mp4']),
  ('certificates', 'certificates', false, 5242880, array['application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Users list their avatar folder" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "Users upload into their avatar folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "Users replace their avatar" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text))
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "Users delete their avatar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "Staff list content media" on storage.objects
  for select to authenticated
  using (bucket_id in ('course-images', 'lesson-assets') and (select public.is_admin()));
create policy "Staff upload content media" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('course-images', 'lesson-assets') and (select public.is_admin()));
create policy "Staff replace content media" on storage.objects
  for update to authenticated
  using (bucket_id in ('course-images', 'lesson-assets') and (select public.is_admin()))
  with check (bucket_id in ('course-images', 'lesson-assets') and (select public.is_admin()));
create policy "Staff delete content media" on storage.objects
  for delete to authenticated
  using (bucket_id in ('course-images', 'lesson-assets') and (select public.is_admin()));

create policy "Owners and staff read certificates" on storage.objects
  for select to authenticated
  using (bucket_id = 'certificates' and ((storage.foldername(name))[1] = (select auth.uid()::text) or (select public.is_admin())));
