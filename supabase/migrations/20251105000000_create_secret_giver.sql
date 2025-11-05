-- Secret Giver feature implementation
-- Adds SMS verification, request management, and temporary access control

-- Extend profiles table with Secret Giver fields
alter table public.profiles
add column if not exists is_sms_verified boolean not null default false,
add column if not exists free_sg_pool integer not null default 0,
add column if not exists phone_number text,
add column if not exists allow_anonymous_sg boolean not null default true;

-- Create index for phone number lookup
create index if not exists idx_profiles_phone_number on public.profiles(phone_number) where phone_number is not null;

-- SMS verification codes table
create table if not exists public.sms_verification_codes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  phone_number text not null,
  code text not null,
  expires_at timestamptz not null,
  verified_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_sms_verification_profile on public.sms_verification_codes(profile_id);
create index if not exists idx_sms_verification_expires on public.sms_verification_codes(expires_at) where verified_at is null;

-- Secret Giver request status enum
create type public.sg_request_status as enum ('pending', 'approved', 'rejected', 'expired');

-- Secret Giver requests table
create table if not exists public.secret_giver_requests (
  id uuid primary key default gen_random_uuid(),
  
  -- Parties involved
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_identifier text not null, -- Email or phone number
  recipient_profile_id uuid references public.profiles(id) on delete set null,
  
  -- Request details
  requested_category public.category not null,
  product_type text, -- Optional: specific product type within category
  status public.sg_request_status not null default 'pending',
  
  -- Response data
  data_payload text, -- The size/measurement value provided by recipient
  
  -- Privacy and relationship
  is_anonymous boolean not null default false,
  is_from_circle_member boolean not null default false,
  
  -- Timestamps
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  responded_at timestamptz,
  expires_at timestamptz, -- Set to 48h after approval
  
  -- Token for public access (for users without account)
  token uuid unique default gen_random_uuid()
);

-- Indexes for Secret Giver requests
create index if not exists idx_sg_requests_sender on public.secret_giver_requests(sender_id);
create index if not exists idx_sg_requests_recipient_profile on public.secret_giver_requests(recipient_profile_id);
create index if not exists idx_sg_requests_recipient_identifier on public.secret_giver_requests(recipient_identifier);
create index if not exists idx_sg_requests_status on public.secret_giver_requests(status);
create index if not exists idx_sg_requests_expires on public.secret_giver_requests(expires_at) where status = 'approved';
create index if not exists idx_sg_requests_token on public.secret_giver_requests(token);

-- Update trigger for secret_giver_requests
create trigger trg_secret_giver_requests_updated
before update on public.secret_giver_requests
for each row
execute function public.touch_updated_at();

-- Function to check if user has access to a category via active Secret Giver request
create or replace function public.has_sg_access(
  requester_id uuid,
  owner_id uuid,
  p_category public.category
) returns boolean as $$
begin
  return exists (
    select 1 
    from public.secret_giver_requests sgr
    join public.profiles sender on sgr.sender_id = sender.id
    join public.profiles target on sgr.recipient_profile_id = target.id
    where sender.owner_id = requester_id
      and target.owner_id = owner_id
      and sgr.status = 'approved'
      and sgr.requested_category = p_category
      and sgr.expires_at > now()
  );
end;
$$ language plpgsql security definer stable;

-- Function to expire old pending requests (called by CRON)
create or replace function public.expire_old_sg_requests()
returns integer as $$
declare
  expired_count integer;
begin
  update public.secret_giver_requests
  set status = 'expired',
      updated_at = now()
  where status = 'pending'
    and created_at < now() - interval '72 hours';
  
  get diagnostics expired_count = row_count;
  return expired_count;
end;
$$ language plpgsql security definer;

-- Function to expire approved requests past their expiration date
create or replace function public.expire_approved_sg_requests()
returns integer as $$
declare
  expired_count integer;
begin
  update public.secret_giver_requests
  set status = 'expired',
      updated_at = now()
  where status = 'approved'
    and expires_at < now();
  
  get diagnostics expired_count = row_count;
  return expired_count;
end;
$$ language plpgsql security definer;

-- Enable RLS on new tables
alter table public.sms_verification_codes enable row level security;
alter table public.secret_giver_requests enable row level security;

-- RLS Policies for sms_verification_codes
create policy "SMS verification codes manageable by owner"
on public.sms_verification_codes
for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = sms_verification_codes.profile_id
      and p.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = sms_verification_codes.profile_id
      and p.owner_id = auth.uid()
  )
);

-- RLS Policies for secret_giver_requests

-- Sender can view and manage their own requests
create policy "SG requests viewable by sender"
on public.secret_giver_requests
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = secret_giver_requests.sender_id
      and p.owner_id = auth.uid()
  )
);

-- Recipient can view requests sent to them
create policy "SG requests viewable by recipient"
on public.secret_giver_requests
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = secret_giver_requests.recipient_profile_id
      and p.owner_id = auth.uid()
  )
  or (
    -- Also allow viewing if email/phone matches current user's profile
    recipient_profile_id is null
    and exists (
      select 1 from public.profiles p
      where p.owner_id = auth.uid()
        and (
          lower(p.email) = lower(secret_giver_requests.recipient_identifier)
          or p.phone_number = secret_giver_requests.recipient_identifier
        )
    )
  )
);

-- Sender can create requests
create policy "SG requests creatable by authenticated users"
on public.secret_giver_requests
for insert
with check (
  exists (
    select 1 from public.profiles p
    where p.id = secret_giver_requests.sender_id
      and p.owner_id = auth.uid()
  )
);

-- Sender can update their own pending requests (e.g., cancel)
create policy "SG requests updatable by sender"
on public.secret_giver_requests
for update
using (
  exists (
    select 1 from public.profiles p
    where p.id = secret_giver_requests.sender_id
      and p.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = secret_giver_requests.sender_id
      and p.owner_id = auth.uid()
  )
);

-- Recipient can update requests sent to them (approve/reject)
create policy "SG requests updatable by recipient"
on public.secret_giver_requests
for update
using (
  exists (
    select 1 from public.profiles p
    where p.id = secret_giver_requests.recipient_profile_id
      and p.owner_id = auth.uid()
  )
  or (
    -- Allow if email/phone matches
    recipient_profile_id is null
    and exists (
      select 1 from public.profiles p
      where p.owner_id = auth.uid()
        and (
          lower(p.email) = lower(secret_giver_requests.recipient_identifier)
          or p.phone_number = secret_giver_requests.recipient_identifier
        )
    )
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = secret_giver_requests.recipient_profile_id
      and p.owner_id = auth.uid()
  )
  or (
    recipient_profile_id is null
    and exists (
      select 1 from public.profiles p
      where p.owner_id = auth.uid()
        and (
          lower(p.email) = lower(secret_giver_requests.recipient_identifier)
          or p.phone_number = secret_giver_requests.recipient_identifier
        )
    )
  )
);

-- Extend measurements RLS to include Secret Giver access
-- Drop and recreate the existing policy to add SG access
drop policy if exists "Measurements are managed by profile owner" on public.measurements;

create policy "Measurements viewable by owner and authorized users"
on public.measurements
for select
using (
  -- Owner access
  exists (
    select 1 from public.profiles p
    where p.id = measurements.profile_id
      and p.owner_id = auth.uid()
  )
  or
  -- Trusted circle access (if permissions exist)
  exists (
    select 1 
    from public.profiles owner
    join public.trusted_circle_permissions tcp 
      on tcp.owner_profile_id = owner.id
    join public.profiles member 
      on tcp.member_profile_id = member.id
    where owner.id = measurements.profile_id
      and member.owner_id = auth.uid()
      and tcp.category::public.category = measurements.category
  )
  or
  -- Secret Giver temporary access
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

create policy "Measurements writable by owner only"
on public.measurements
for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = measurements.profile_id
      and p.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = measurements.profile_id
      and p.owner_id = auth.uid()
  )
);

-- Similar extension for body_measurements if needed
-- Note: body_measurements doesn't have category column, so SG access granted via any category approval
drop policy if exists "Body measurements are viewable by owner" on public.body_measurements;

create policy "Body measurements viewable by owner and authorized users"
on public.body_measurements
for select
using (
  -- Owner access
  exists (
    select 1 from public.profiles p
    where p.id = body_measurements.profile_id
      and p.owner_id = auth.uid()
  )
  or
  -- Trusted circle access (if any category is shared)
  exists (
    select 1 
    from public.profiles owner
    join public.trusted_circle_permissions tcp 
      on tcp.owner_profile_id = owner.id
    join public.profiles member 
      on tcp.member_profile_id = member.id
    where owner.id = body_measurements.profile_id
      and member.owner_id = auth.uid()
  )
  or
  -- Secret Giver temporary access (if any category is approved)
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

-- Grant necessary permissions
grant all on public.sms_verification_codes to authenticated;
grant all on public.secret_giver_requests to authenticated;
grant execute on function public.has_sg_access to authenticated;
grant execute on function public.expire_old_sg_requests to authenticated;
grant execute on function public.expire_approved_sg_requests to authenticated;

-- Comments for documentation
comment on table public.secret_giver_requests is 'Secret Giver requests for temporary access to specific size categories';
comment on column public.secret_giver_requests.is_from_circle_member is 'True if sender and recipient are in each others trusted circle';
comment on column public.secret_giver_requests.expires_at is 'Set to 48 hours after approval for temporary access';
comment on column public.secret_giver_requests.token is 'UUID token for public access by users without account';
comment on function public.expire_old_sg_requests is 'Expires pending requests older than 72 hours (called by CRON)';
comment on function public.expire_approved_sg_requests is 'Expires approved requests past their expiration date (called by CRON)';

