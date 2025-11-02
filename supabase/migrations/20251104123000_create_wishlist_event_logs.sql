create table if not exists public.wishlist_event_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  wishlist_id uuid references public.wishlists(id) on delete cascade,
  wishlist_item_id uuid references public.wishlist_items(id) on delete cascade,
  event_type text not null,
  source text not null check (source in ('owner', 'public')),
  metadata jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists wishlist_event_logs_profile_id_idx
  on public.wishlist_event_logs (profile_id, created_at desc);

create index if not exists wishlist_event_logs_wishlist_id_idx
  on public.wishlist_event_logs (wishlist_id, created_at desc);

alter table public.wishlist_event_logs enable row level security;

drop policy if exists "Owners view wishlist events" on public.wishlist_event_logs;
create policy "Owners view wishlist events"
  on public.wishlist_event_logs
  for select using (auth.uid() = profile_id);

drop policy if exists "Owners insert wishlist events" on public.wishlist_event_logs;
create policy "Owners insert wishlist events"
  on public.wishlist_event_logs
  for insert with check (auth.uid() = profile_id);

drop policy if exists "Owners update wishlist events" on public.wishlist_event_logs;
create policy "Owners update wishlist events"
  on public.wishlist_event_logs
  for update using (auth.uid() = profile_id);

drop policy if exists "Owners delete wishlist events" on public.wishlist_event_logs;
create policy "Owners delete wishlist events"
  on public.wishlist_event_logs
  for delete using (auth.uid() = profile_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.wishlist_event_logs to authenticated;
grant select on public.wishlist_event_logs to service_role;

