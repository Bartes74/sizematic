create table if not exists public.wishlist_public_links (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  wishlist_id uuid not null references public.wishlists(id) on delete cascade,
  wishlist_item_id uuid references public.wishlist_items(id) on delete cascade,
  kind text not null check (kind in ('list', 'item')),
  token_hash text not null unique,
  created_at timestamptz not null default timezone('utc', now()),
  last_accessed_at timestamptz,
  expires_at timestamptz,
  constraint wishlist_public_links_item_check
    check (
      (kind = 'list' and wishlist_item_id is null)
      or (kind = 'item' and wishlist_item_id is not null)
    )
);

create index if not exists wishlist_public_links_wishlist_id_idx
  on public.wishlist_public_links (wishlist_id);

create index if not exists wishlist_public_links_item_id_idx
  on public.wishlist_public_links (wishlist_item_id);

alter table public.wishlist_public_links enable row level security;

drop policy if exists "Owners manage wishlist public links" on public.wishlist_public_links;
create policy "Owners manage wishlist public links"
  on public.wishlist_public_links
  for all
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

drop policy if exists "Service role can manage wishlist public links" on public.wishlist_public_links;
create policy "Service role can manage wishlist public links"
  on public.wishlist_public_links
  for all
  to service_role
  using (true)
  with check (true);

grant usage on schema public to anon;
grant usage on schema public to authenticated;

grant select, insert, update, delete on public.wishlist_public_links to authenticated;
grant select on public.wishlist_public_links to service_role;

