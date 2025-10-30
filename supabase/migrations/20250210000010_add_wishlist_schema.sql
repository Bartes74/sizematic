-- Migration: Add wishlist domain (wishlists, items, shares, claims, brand size profiles)

-- Enums for wishlist workflow
create type public.wishlist_status as enum ('draft', 'active', 'archived');
create type public.item_parse_status as enum ('pending', 'success', 'failed');
create type public.size_match_confidence as enum ('exact', 'similar', 'manual', 'missing');
create type public.wishlist_share_status as enum ('pending', 'accepted', 'revoked');
create type public.claim_status as enum ('claimed', 'purchased', 'cancelled');

-- Helper functions to resolve current profile context
create or replace function public.current_profile_id()
returns uuid
language sql
stable
as $$
  select p.id
  from public.profiles p
  where p.owner_id = auth.uid()
  limit 1;
$$;

create or replace function public.current_profile_email()
returns text
language sql
stable
as $$
  select p.email
  from public.profiles p
  where p.owner_id = auth.uid()
  limit 1;
$$;

-- Wishlists master table
create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  slug text not null,
  status public.wishlist_status not null default 'draft',
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  unique (owner_profile_id, slug)
);

create index if not exists idx_wishlists_owner on public.wishlists(owner_id);

create trigger trg_wishlists_updated_at
before update on public.wishlists
for each row
execute function public.touch_updated_at();

-- Wishlist items table
create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  wishlist_id uuid not null references public.wishlists (id) on delete cascade,
  url text not null,
  product_name text,
  product_brand text,
  image_url text,
  price_snapshot jsonb,
  parse_status public.item_parse_status not null default 'pending',
  parse_error text,
  parsed_at timestamptz,
  matched_size text,
  size_confidence public.size_match_confidence not null default 'missing',
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_wishlist_items_wishlist on public.wishlist_items(wishlist_id);
create index if not exists idx_wishlist_items_brand on public.wishlist_items(product_brand);

create trigger trg_wishlist_items_updated_at
before update on public.wishlist_items
for each row
execute function public.touch_updated_at();

-- Wishlists shares (access control)
create table if not exists public.wishlist_shares (
  id uuid primary key default gen_random_uuid(),
  wishlist_id uuid not null references public.wishlists (id) on delete cascade,
  recipient_email text not null,
  recipient_profile_id uuid references public.profiles (id) on delete set null,
  status public.wishlist_share_status not null default 'pending',
  invite_token uuid not null default gen_random_uuid(),
  invited_by uuid not null references auth.users (id) on delete cascade,
  notified_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_wishlist_shares_wishlist on public.wishlist_shares(wishlist_id);
create index if not exists idx_wishlist_shares_recipient_profile on public.wishlist_shares(recipient_profile_id);
create unique index if not exists uniq_wishlist_recipient on public.wishlist_shares (wishlist_id, lower(recipient_email));
create unique index if not exists idx_wishlist_shares_token on public.wishlist_shares(invite_token);

-- Wishlist claims (reservations)
create table if not exists public.wishlist_claims (
  id uuid primary key default gen_random_uuid(),
  wishlist_item_id uuid not null references public.wishlist_items (id) on delete cascade,
  share_id uuid not null references public.wishlist_shares (id) on delete cascade,
  claimer_profile_id uuid not null references public.profiles (id) on delete cascade,
  status public.claim_status not null default 'claimed',
  message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists uniq_active_claim_per_item
on public.wishlist_claims(wishlist_item_id)
where status in ('claimed', 'purchased');

create index if not exists idx_wishlist_claims_share on public.wishlist_claims(share_id);

create trigger trg_wishlist_claims_updated_at
before update on public.wishlist_claims
for each row
execute function public.touch_updated_at();

-- Brand size profiles (user-specific brand sizing)
create table if not exists public.brand_size_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  brand_name text not null,
  preferred_size text not null,
  fit_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_brand_size_profiles_brand on public.brand_size_profiles(lower(brand_name));
create unique index if not exists uniq_brand_profile on public.brand_size_profiles (profile_id, lower(brand_name));

create trigger trg_brand_size_profiles_updated_at
before update on public.brand_size_profiles
for each row
execute function public.touch_updated_at();

-- Enable RLS
alter table public.wishlists enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.wishlist_shares enable row level security;
alter table public.wishlist_claims enable row level security;
alter table public.brand_size_profiles enable row level security;

-- Wishlists policies
create policy "Wishlists manageable by owner or service role"
  on public.wishlists
  for all
  using (
    owner_id = auth.uid()
    or auth.role() = 'service_role'
  )
  with check (
    owner_id = auth.uid()
    or auth.role() = 'service_role'
  );

create policy "Wishlists viewable by accepted share recipients"
  on public.wishlists
  for select
  using (
    auth.role() = 'service_role'
    or owner_id = auth.uid()
    or exists (
      select 1
      from public.wishlist_shares ws
      where ws.wishlist_id = wishlists.id
        and ws.status = 'accepted'
        and (
          ws.recipient_profile_id = public.current_profile_id()
          or (
            ws.recipient_profile_id is null
            and ws.recipient_email is not null
            and public.current_profile_email() is not null
            and lower(ws.recipient_email) = lower(public.current_profile_email())
          )
        )
    )
  );

-- Wishlist items policies
create policy "Wishlist items manageable by owner or service role"
  on public.wishlist_items
  for all
  using (
    auth.role() = 'service_role'
    or exists (
      select 1
      from public.wishlists w
      where w.id = wishlist_items.wishlist_id
        and w.owner_id = auth.uid()
    )
  )
  with check (
    auth.role() = 'service_role'
    or exists (
      select 1
      from public.wishlists w
      where w.id = wishlist_items.wishlist_id
        and w.owner_id = auth.uid()
    )
  );

create policy "Wishlist items viewable by accepted recipients"
  on public.wishlist_items
  for select
  using (
    auth.role() = 'service_role'
    or exists (
      select 1
      from public.wishlists w
      join public.wishlist_shares ws
        on ws.wishlist_id = w.id
      where w.id = wishlist_items.wishlist_id
        and ws.status = 'accepted'
        and (
          w.owner_id = auth.uid()
          or ws.recipient_profile_id = public.current_profile_id()
          or (
            ws.recipient_profile_id is null
            and ws.recipient_email is not null
            and public.current_profile_email() is not null
            and lower(ws.recipient_email) = lower(public.current_profile_email())
          )
        )
    )
  );

-- Wishlist shares policies
create policy "Wishlist shares manageable by owner or service role"
  on public.wishlist_shares
  for all
  using (
    auth.role() = 'service_role'
    or exists (
      select 1
      from public.wishlists w
      where w.id = wishlist_shares.wishlist_id
        and w.owner_id = auth.uid()
    )
  )
  with check (
    auth.role() = 'service_role'
    or exists (
      select 1
      from public.wishlists w
      where w.id = wishlist_shares.wishlist_id
        and w.owner_id = auth.uid()
    )
  );

create policy "Wishlist shares viewable by recipients"
  on public.wishlist_shares
  for select
  using (
    auth.role() = 'service_role'
    or exists (
      select 1
      from public.wishlists w
      where w.id = wishlist_shares.wishlist_id
        and w.owner_id = auth.uid()
    )
    or (
      wishlist_shares.status in ('accepted', 'pending')
      and (
        wishlist_shares.recipient_profile_id = public.current_profile_id()
        or (
          wishlist_shares.recipient_profile_id is null
          and wishlist_shares.recipient_email is not null
          and public.current_profile_email() is not null
          and lower(wishlist_shares.recipient_email) = lower(public.current_profile_email())
        )
      )
    )
  );

-- Brand size profiles policies
create policy "Brand size profiles manageable by owner"
  on public.brand_size_profiles
  for all
  using (
    auth.role() = 'service_role'
    or profile_id = public.current_profile_id()
  )
  with check (
    auth.role() = 'service_role'
    or profile_id = public.current_profile_id()
  );

-- Wishlist claims policies
create policy "Wishlist claims viewable by share recipients"
  on public.wishlist_claims
  for select
  using (
    auth.role() = 'service_role'
    or exists (
      select 1
      from public.wishlist_shares ws
      join public.wishlist_items wi on wi.id = wishlist_claims.wishlist_item_id
      join public.wishlists w on w.id = wi.wishlist_id
      where ws.id = wishlist_claims.share_id
        and ws.status = 'accepted'
        and (
          ws.recipient_profile_id = public.current_profile_id()
          or exists (
            select 1
            from public.wishlist_shares ws2
            where ws2.wishlist_id = w.id
              and ws2.status = 'accepted'
              and ws2.recipient_profile_id = public.current_profile_id()
          )
        )
    )
  );

create policy "Wishlist claims insertable by claimer"
  on public.wishlist_claims
  for insert
  with check (
    auth.role() = 'service_role'
    or (
      exists (
        select 1
        from public.wishlist_shares ws
        where ws.id = wishlist_claims.share_id
          and ws.status = 'accepted'
          and ws.recipient_profile_id = public.current_profile_id()
      )
      and exists (
        select 1
        from public.wishlist_items wi
        join public.wishlists w on w.id = wi.wishlist_id
        where wi.id = wishlist_claims.wishlist_item_id
          and w.owner_id <> auth.uid()
      )
    )
  );

create policy "Wishlist claims updatable by claimer or service role"
  on public.wishlist_claims
  for update
  using (
    auth.role() = 'service_role'
    or exists (
      select 1
      from public.wishlist_shares ws
      where ws.id = wishlist_claims.share_id
        and ws.status = 'accepted'
        and ws.recipient_profile_id = public.current_profile_id()
    )
  )
  with check (
    auth.role() = 'service_role'
    or exists (
      select 1
      from public.wishlist_shares ws
      where ws.id = wishlist_claims.share_id
        and ws.status = 'accepted'
        and ws.recipient_profile_id = public.current_profile_id()
    )
  );

create policy "Wishlist claims deletable by service role"
  on public.wishlist_claims
  for delete
  using (auth.role() = 'service_role');
