-- Migration: refactor trusted circle data model to support named circles

-- 1. Core table for circles
create table if not exists public.trusted_circles (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  allow_wishlist_access boolean not null default false,
  allow_size_access boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists idx_trusted_circles_owner_name
  on public.trusted_circles(owner_profile_id, lower(name));

create trigger trg_trusted_circles_touch_updated
before update on public.trusted_circles
for each row
execute function public.touch_updated_at();

-- 2. Temporarily disable RLS-dependent policies
drop policy if exists "Trusted circle memberships viewable by owner or member" on public.trusted_circle_memberships;
drop policy if exists "Trusted circle memberships manageable by owner" on public.trusted_circle_memberships;

drop policy if exists "Trusted circle permissions readable by owner or member" on public.trusted_circle_permissions;
drop policy if exists "Trusted circle permissions manageable by owner" on public.trusted_circle_permissions;

-- 3. Extend membership and permission tables with circle references
alter table public.trusted_circle_memberships
  add column if not exists circle_id uuid references public.trusted_circles(id);

alter table public.trusted_circle_permissions
  add column if not exists circle_id uuid references public.trusted_circles(id);

alter table public.trusted_circle_invitations
  add column if not exists circle_id uuid references public.trusted_circles(id);

-- 4. Seed default circles for existing data
insert into public.trusted_circles (owner_profile_id, name)
select owner_profile_id, 'Mój Krąg'
from (
  select distinct owner_profile_id
  from public.trusted_circle_memberships
) owners
on conflict (owner_profile_id, lower(name)) do nothing;

update public.trusted_circle_memberships m
set circle_id = (
  select id
  from public.trusted_circles tc
  where tc.owner_profile_id = m.owner_profile_id
  order by tc.created_at asc
  limit 1
)
where m.circle_id is null;

update public.trusted_circle_invitations i
set circle_id = (
  select id
  from public.trusted_circles tc
  where tc.owner_profile_id = i.inviter_profile_id
  order by tc.created_at asc
  limit 1
)
where i.circle_id is null;

-- 5. Carry circle_id to permissions using membership mapping
update public.trusted_circle_permissions p
set circle_id = m.circle_id
from public.trusted_circle_memberships m
where m.owner_profile_id = p.owner_profile_id
  and m.member_profile_id = p.member_profile_id
  and p.circle_id is null;

-- 6. Enforce not-null constraints
alter table public.trusted_circle_memberships
  alter column circle_id set not null;

alter table public.trusted_circle_permissions
  alter column circle_id set not null;

alter table public.trusted_circle_invitations
  alter column circle_id set not null;

-- 7. Update unique constraints
alter table public.trusted_circle_memberships
  drop constraint if exists trusted_circle_memberships_owner_profile_id_member_profile_id_key;

alter table public.trusted_circle_permissions
  drop constraint if exists trusted_circle_permissions_owner_profile_id_member_profile_id_category_product_type_key;

alter table public.trusted_circle_memberships
  add constraint trusted_circle_memberships_circle_member_unique unique (circle_id, member_profile_id);

alter table public.trusted_circle_permissions
  add constraint trusted_circle_permissions_circle_member_category_unique unique (circle_id, member_profile_id, category, product_type);

create index if not exists idx_trusted_circle_invitations_circle
  on public.trusted_circle_invitations(circle_id);

-- 8. Remove redundant owner columns (owner now derived from circle)
-- 9. Enable RLS and recreate policies with new structure
alter table public.trusted_circles enable row level security;

create policy "Trusted circles manageable by owner"
on public.trusted_circles
for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = trusted_circles.owner_profile_id
      and p.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = trusted_circles.owner_profile_id
      and p.owner_id = auth.uid()
  )
);

alter table public.trusted_circle_memberships enable row level security;
alter table public.trusted_circle_permissions enable row level security;

create policy "Trusted circle members viewable by owner or member"
on public.trusted_circle_memberships
for select
using (
  exists (
    select 1 from public.trusted_circles tc
    join public.profiles owner on owner.id = tc.owner_profile_id
    where tc.id = trusted_circle_memberships.circle_id
      and owner.owner_id = auth.uid()
  )
  or exists (
    select 1 from public.profiles member
    where member.id = trusted_circle_memberships.member_profile_id
      and member.owner_id = auth.uid()
  )
);

create policy "Trusted circle members manageable by owner"
on public.trusted_circle_memberships
for all
using (
  exists (
    select 1 from public.trusted_circles tc
    join public.profiles owner on owner.id = tc.owner_profile_id
    where tc.id = trusted_circle_memberships.circle_id
      and owner.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.trusted_circles tc
    join public.profiles owner on owner.id = tc.owner_profile_id
    where tc.id = trusted_circle_memberships.circle_id
      and owner.owner_id = auth.uid()
  )
);

create policy "Trusted circle permissions viewable by owner or member"
on public.trusted_circle_permissions
for select
using (
  exists (
    select 1 from public.trusted_circles tc
    join public.profiles owner on owner.id = tc.owner_profile_id
    where tc.id = trusted_circle_permissions.circle_id
      and owner.owner_id = auth.uid()
  )
  or exists (
    select 1 from public.profiles member
    where member.id = trusted_circle_permissions.member_profile_id
      and member.owner_id = auth.uid()
  )
);

create policy "Trusted circle permissions manageable by owner"
on public.trusted_circle_permissions
for all
using (
  exists (
    select 1 from public.trusted_circles tc
    join public.profiles owner on owner.id = tc.owner_profile_id
    where tc.id = trusted_circle_permissions.circle_id
      and owner.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.trusted_circles tc
    join public.profiles owner on owner.id = tc.owner_profile_id
    where tc.id = trusted_circle_permissions.circle_id
      and owner.owner_id = auth.uid()
  )
);

-- 10. Update measurement policies to use the new circle structure
drop policy if exists "Measurements viewable by owner and authorized users" on public.measurements;

create policy "Measurements viewable by owner and authorized users"
on public.measurements
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = measurements.profile_id
      and p.owner_id = auth.uid()
  )
  or
  exists (
    select 1
    from public.trusted_circle_permissions tcp
    join public.trusted_circles tc on tc.id = tcp.circle_id
    join public.profiles owner on owner.id = tc.owner_profile_id
    join public.profiles member on member.id = tcp.member_profile_id
    where owner.id = measurements.profile_id
      and member.owner_id = auth.uid()
      and tc.allow_size_access = true
      and tcp.category::public.category = measurements.category
  )
  or
  exists (
    select 1
    from public.profiles owner
    join public.profiles requester on requester.owner_id = auth.uid()
    join public.secret_giver_requests sgr
      on sgr.sender_id = requester.id
      and sgr.recipient_profile_id = owner.id
    where owner.id = measurements.profile_id
      and sgr.status = 'approved'
      and sgr.requested_category = measurements.category
      and sgr.expires_at > now()
  )
);

drop policy if exists "Body measurements viewable by owner and authorized users" on public.body_measurements;

create policy "Body measurements viewable by owner and authorized users"
on public.body_measurements
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = body_measurements.profile_id
      and p.owner_id = auth.uid()
  )
  or
  exists (
    select 1
    from public.trusted_circle_permissions tcp
    join public.trusted_circles tc on tc.id = tcp.circle_id
    join public.profiles owner on owner.id = tc.owner_profile_id
    join public.profiles member on member.id = tcp.member_profile_id
    where owner.id = body_measurements.profile_id
      and member.owner_id = auth.uid()
      and tc.allow_size_access = true
  )
  or
  exists (
    select 1
    from public.profiles owner
    join public.profiles requester on requester.owner_id = auth.uid()
    join public.secret_giver_requests sgr
      on sgr.sender_id = requester.id
      and sgr.recipient_profile_id = owner.id
    where owner.id = body_measurements.profile_id
      and sgr.status = 'approved'
      and sgr.expires_at > now()
  )
);

comment on table public.trusted_circles is 'Named trusted circles owned by a profile.';
comment on column public.trusted_circles.allow_wishlist_access is 'Grant wishlist visibility to circle members.';
comment on column public.trusted_circles.allow_size_access is 'Grant size visibility to circle members.';


