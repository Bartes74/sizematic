-- Create avatars storage bucket
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true);

-- Allow authenticated users to upload avatars
create policy "Users can upload avatars"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and name like 'avatars/' || auth.uid()::text || '%'
);

-- Allow authenticated users to update their own avatars
create policy "Users can update their own avatar"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and name like 'avatars/' || auth.uid()::text || '%'
);

-- Allow authenticated users to delete their own avatars
create policy "Users can delete their own avatar"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and name like 'avatars/' || auth.uid()::text || '%'
);

-- Allow public read access to all avatars
create policy "Avatars are publicly accessible"
on storage.objects for select
to public
using (bucket_id = 'avatars');
