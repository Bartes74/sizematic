-- Create branding settings singleton table and storage policies

create table if not exists public.branding_settings (
  id boolean primary key default true,
  site_name text not null default 'SizeHub',
  site_claim text not null default 'SizeSync',
  logo_path text,
  logo_url text,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.branding_settings enable row level security;

create trigger trg_branding_settings_updated
before update on public.branding_settings
for each row
execute function public.touch_updated_at();

insert into public.branding_settings (id, site_name, site_claim)
values (true, 'SizeHub', 'SizeSync')
on conflict (id) do update
set site_name = excluded.site_name,
    site_claim = excluded.site_claim;

create policy "Branding settings readable by everyone"
on public.branding_settings
for select
using (true);

create policy "Branding settings manageable by admins"
on public.branding_settings
for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.owner_id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.owner_id = auth.uid()
      and p.role = 'admin'
  )
);

create policy "Branding settings insertable by admins"
on public.branding_settings
for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.owner_id = auth.uid()
      and p.role = 'admin'
  )
);

-- Storage bucket for branding assets
insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;

create policy "Branding assets publicly readable"
on storage.objects
for select
to public
using (bucket_id = 'branding');

create policy "Admins manage branding assets"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'branding'
  and exists (
    select 1 from public.profiles p
    where p.owner_id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  bucket_id = 'branding'
  and exists (
    select 1 from public.profiles p
    where p.owner_id = auth.uid()
      and p.role = 'admin'
  )
);
