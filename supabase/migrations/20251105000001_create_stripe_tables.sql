-- Stripe integration tables for payments and subscriptions

-- Stripe events log (for idempotency)
create table if not exists public.stripe_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  event_type text not null,
  event_data jsonb not null,
  processed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_stripe_events_event_id on public.stripe_events(stripe_event_id);
create index if not exists idx_stripe_events_type on public.stripe_events(event_type);
create index if not exists idx_stripe_events_created on public.stripe_events(created_at desc);

-- Subscriptions table
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  stripe_subscription_id text not null unique,
  stripe_customer_id text not null,
  status text not null,
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_subscriptions_profile on public.subscriptions(profile_id);
create index if not exists idx_subscriptions_stripe_sub on public.subscriptions(stripe_subscription_id);
create index if not exists idx_subscriptions_status on public.subscriptions(status);

create trigger trg_subscriptions_updated
before update on public.subscriptions
for each row
execute function public.touch_updated_at();

-- Enable RLS
alter table public.stripe_events enable row level security;
alter table public.subscriptions enable row level security;

-- RLS Policies

-- stripe_events: only service role can access (no user policies)
-- This is managed entirely by webhook handlers

-- subscriptions: users can view their own subscriptions
create policy "Users can view own subscriptions"
on public.subscriptions
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = subscriptions.profile_id
      and p.owner_id = auth.uid()
  )
);

-- Grant permissions
grant all on public.stripe_events to service_role;
grant select on public.subscriptions to authenticated;

-- Comments
comment on table public.stripe_events is 'Log of processed Stripe webhook events for idempotency';
comment on table public.subscriptions is 'User subscription records synced from Stripe';

