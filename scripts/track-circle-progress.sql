with current_profile as (
  select p.id as profile_id
  from public.profiles p
  where p.owner_id = auth.uid()
  limit 1
)
select
  coalesce(
    json_build_object(
      'circle_size', (select count(*) from public.wishlist_shares ws where ws.invited_by = (select profile_id from current_profile)),
      'circle_accepts', (select count(*) from public.wishlist_shares ws where ws.invited_by = (select profile_id from current_profile) and ws.status = 'accepted')
    ),
    json_build_object('circle_size', 0, 'circle_accepts', 0)
  );
