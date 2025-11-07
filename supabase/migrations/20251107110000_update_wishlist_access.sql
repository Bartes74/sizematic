-- Migration: align wishlist access with trusted circles

-- Drop legacy share-based visibility policies
drop policy if exists "Wishlists viewable by accepted share recipients" on public.wishlists;
drop policy if exists "Wishlist items viewable by accepted recipients" on public.wishlist_items;

-- Allow owners or trusted circle members (with wishlist permission) to view wishlists
create policy "Wishlists viewable by trusted circle"
on public.wishlists
for select
using (
  auth.role() = 'service_role'
  or owner_id = auth.uid()
  or exists (
    select 1
    from public.trusted_circle_memberships tcm
    join public.trusted_circles tc on tc.id = tcm.circle_id
    where tc.owner_profile_id = wishlists.owner_profile_id
      and tcm.member_profile_id = public.current_profile_id()
      and tc.allow_wishlist_access = true
  )
);

-- Mirror access rules for wishlist items
create policy "Wishlist items viewable by trusted circle"
on public.wishlist_items
for select
using (
  auth.role() = 'service_role'
  or exists (
    select 1
    from public.wishlists w
    join public.trusted_circle_memberships tcm
      on tcm.owner_profile_id = w.owner_profile_id
    join public.trusted_circles tc on tc.id = tcm.circle_id
    where w.id = wishlist_items.wishlist_id
      and tcm.member_profile_id = public.current_profile_id()
      and tc.allow_wishlist_access = true
  )
  or exists (
    select 1
    from public.wishlists w
    where w.id = wishlist_items.wishlist_id
      and w.owner_id = auth.uid()
  )
);


