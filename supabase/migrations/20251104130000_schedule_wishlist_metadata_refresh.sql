set check_function_bodies = off;

create extension if not exists pg_cron with schema extensions;

create or replace function public.refresh_stale_wishlist_metadata(limit_records integer default 50)
returns void
language plpgsql
as
$$
declare
begin
  with candidates as (
    select id
    from public.wishlist_items
    where (parsed_at is null or parsed_at < timezone('utc', now()) - interval '14 days')
      and parse_status <> 'pending'
    order by coalesce(parsed_at, '1970-01-01'::timestamptz) asc
    limit limit_records
  )
  update public.wishlist_items wi
     set parse_status = 'pending',
         parse_error = null,
         parsed_at = null,
         updated_at = timezone('utc', now())
   from candidates c
   where wi.id = c.id;
end;
$$;

comment on function public.refresh_stale_wishlist_metadata(integer) is
  'Marks stale wishlist items for metadata refresh. Default limit 50 rows per invocation.';

do
$$
begin
  if exists (
    select 1
    from cron.job
    where jobname = 'wishlist_metadata_refresh'
  ) then
    perform cron.unschedule('wishlist_metadata_refresh');
  end if;

  perform cron.schedule(
    'wishlist_metadata_refresh',
    '0 */12 * * *',
    'call public.refresh_stale_wishlist_metadata(50);'
  );
end;
$$;

