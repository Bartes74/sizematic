-- Enable pg_cron extension for scheduled jobs
create extension if not exists pg_cron;

-- Grant permissions to postgres user
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

-- Schedule: Expire old pending requests (every hour)
-- Runs at minute 0 of every hour
select cron.schedule(
  'expire-old-sg-requests',
  '0 * * * *',  -- Every hour
  $$
    update public.secret_giver_requests
    set status = 'expired',
        updated_at = now()
    where status = 'pending'
      and created_at < now() - interval '72 hours';
  $$
);

-- Schedule: Expire approved requests past their expiration date (every 15 minutes)
select cron.schedule(
  'expire-approved-sg-requests',
  '*/15 * * * *',  -- Every 15 minutes
  $$
    update public.secret_giver_requests
    set status = 'expired',
        updated_at = now()
    where status = 'approved'
      and expires_at < now();
  $$
);

-- Comments
comment on extension pg_cron is 'PostgreSQL cron scheduler for Secret Giver request expiration';

