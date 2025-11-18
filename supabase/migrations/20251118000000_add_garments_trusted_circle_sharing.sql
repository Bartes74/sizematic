-- Migration: Add trusted circle sharing RLS policy for garments table
-- This enables users to see garments shared by their trusted circle members
-- based on permissions configured in trusted_circle_permissions

-- Drop the old policy that only allows owner access
drop policy if exists "Garments managed by owner" on public.garments;

-- Create new SELECT policy that includes trusted circle access
create policy "Garments viewable by owner and authorized users"
on public.garments
for select
using (
  -- Own garments
  exists (
    select 1 from public.profiles p
    where p.id = garments.profile_id
      and p.owner_id = auth.uid()
  )
  or
  -- Garments shared via trusted circle with category/product_type permissions
  exists (
    select 1
    from public.trusted_circle_permissions tcp
    join public.trusted_circles tc on tc.id = tcp.circle_id
    join public.profiles owner on owner.id = tc.owner_profile_id
    join public.profiles member on member.id = tcp.member_profile_id
    where owner.id = garments.profile_id
      and member.owner_id = auth.uid()
      and tc.allow_size_access = true
      and garments.category::public.category = tcp.category::public.category
      and (
        tcp.product_type is null
        or (garments.size->>'product_type_id')::text = tcp.product_type
      )
  )
  or
  -- Secret Giver access (existing)
  exists (
    select 1
    from public.profiles owner
    join public.profiles requester on requester.owner_id = auth.uid()
    join public.secret_giver_requests sgr
      on sgr.sender_id = requester.id
      and sgr.recipient_profile_id = owner.id
    where owner.id = garments.profile_id
      and sgr.status = 'approved'
      and sgr.requested_category = garments.category
      and sgr.expires_at > now()
  )
);

-- Recreate INSERT/UPDATE/DELETE policies for owner-only access
create policy "Garments insertable by owner"
on public.garments
for insert
with check (
  exists (
    select 1 from public.profiles p
    where p.id = garments.profile_id
      and p.owner_id = auth.uid()
  )
);

create policy "Garments updatable by owner"
on public.garments
for update
using (
  exists (
    select 1 from public.profiles p
    where p.id = garments.profile_id
      and p.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = garments.profile_id
      and p.owner_id = auth.uid()
  )
);

create policy "Garments deletable by owner"
on public.garments
for delete
using (
  exists (
    select 1 from public.profiles p
    where p.id = garments.profile_id
      and p.owner_id = auth.uid()
  )
);

comment on policy "Garments viewable by owner and authorized users" on public.garments
  is 'Allows viewing own garments, garments shared via trusted circles (with category/product_type filtering), and Secret Giver approved requests';
