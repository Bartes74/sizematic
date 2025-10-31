-- Trusted Circle core schema

create type public.trusted_circle_invitation_status as enum ('pending', 'accepted', 'revoked', 'cancelled');

create table if not exists public.trusted_circle_invitations (
  id uuid primary key default gen_random_uuid(),
  inviter_profile_id uuid not null references public.profiles(id) on delete cascade,
  invitee_profile_id uuid references public.profiles(id) on delete set null,
  invitee_email text not null,
  status public.trusted_circle_invitation_status not null default 'pending',
  token uuid not null unique default gen_random_uuid(),
  message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  accepted_at timestamptz,
  revoked_at timestamptz
);

create unique index if not exists idx_trusted_circle_invitation_active_email
on public.trusted_circle_invitations(inviter_profile_id, lower(invitee_email))
where status in ('pending', 'accepted');

create trigger trg_trusted_circle_invitations_updated
before update on public.trusted_circle_invitations
for each row
execute function public.touch_updated_at();

create table if not exists public.trusted_circle_memberships (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles(id) on delete cascade,
  member_profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique(owner_profile_id, member_profile_id)
);

create table if not exists public.trusted_circle_permissions (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles(id) on delete cascade,
  member_profile_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  product_type text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(owner_profile_id, member_profile_id, category, product_type)
);

create trigger trg_trusted_circle_permissions_updated
before update on public.trusted_circle_permissions
for each row
execute function public.touch_updated_at();

alter table public.trusted_circle_invitations enable row level security;
alter table public.trusted_circle_memberships enable row level security;
alter table public.trusted_circle_permissions enable row level security;

-- Invitation policies
create policy "Trusted Circle invitations manageable by inviter"
on public.trusted_circle_invitations
for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = trusted_circle_invitations.inviter_profile_id
      and p.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = trusted_circle_invitations.inviter_profile_id
      and p.owner_id = auth.uid()
  )
);

create policy "Trusted Circle invitations viewable by invitee email"
on public.trusted_circle_invitations
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = trusted_circle_invitations.inviter_profile_id
      and p.owner_id = auth.uid()
  )
  or (
    trusted_circle_invitations.invitee_profile_id is not null
    and exists (
      select 1 from public.profiles p2
      where p2.id = trusted_circle_invitations.invitee_profile_id
        and p2.owner_id = auth.uid()
    )
  )
  or (
    trusted_circle_invitations.invitee_profile_id is null
    and exists (
      select 1 from public.profiles p3
      where p3.owner_id = auth.uid()
        and p3.email is not null
        and lower(p3.email) = lower(trusted_circle_invitations.invitee_email)
    )
  )
);

create policy "Trusted Circle invitations acceptable by invitee"
on public.trusted_circle_invitations
for update
using (
  (
    exists (
      select 1 from public.profiles p
      where p.id = trusted_circle_invitations.inviter_profile_id
        and p.owner_id = auth.uid()
    )
  )
  or (
    exists (
      select 1 from public.profiles p2
      where p2.owner_id = auth.uid()
        and (
          p2.id = trusted_circle_invitations.invitee_profile_id
          or (
            p2.email is not null
            and lower(p2.email) = lower(trusted_circle_invitations.invitee_email)
          )
        )
    )
  )
)
with check (
  (
    exists (
      select 1 from public.profiles p
      where p.id = trusted_circle_invitations.inviter_profile_id
        and p.owner_id = auth.uid()
    )
  )
  or (
    exists (
      select 1 from public.profiles p2
      where p2.owner_id = auth.uid()
        and (
          p2.id = trusted_circle_invitations.invitee_profile_id
          or (
            p2.email is not null
            and lower(p2.email) = lower(trusted_circle_invitations.invitee_email)
          )
        )
    )
  )
);

-- Membership policies
create policy "Trusted circle memberships viewable by owner or member"
on public.trusted_circle_memberships
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = trusted_circle_memberships.owner_profile_id
      and p.owner_id = auth.uid()
  )
  or exists (
    select 1 from public.profiles p2
    where p2.id = trusted_circle_memberships.member_profile_id
      and p2.owner_id = auth.uid()
  )
);

create policy "Trusted circle memberships manageable by owner"
on public.trusted_circle_memberships
for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = trusted_circle_memberships.owner_profile_id
      and p.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = trusted_circle_memberships.owner_profile_id
      and p.owner_id = auth.uid()
  )
);

-- Permissions policies
create policy "Trusted circle permissions readable by owner or member"
on public.trusted_circle_permissions
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = trusted_circle_permissions.owner_profile_id
      and p.owner_id = auth.uid()
  )
  or exists (
    select 1 from public.profiles p2
    where p2.id = trusted_circle_permissions.member_profile_id
      and p2.owner_id = auth.uid()
  )
);

create policy "Trusted circle permissions manageable by owner"
on public.trusted_circle_permissions
for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = trusted_circle_permissions.owner_profile_id
      and p.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = trusted_circle_permissions.owner_profile_id
      and p.owner_id = auth.uid()
  )
);
