-- Missions core schema

-- Create mission_status enum if it does not exist
do $$
begin
  if not exists (select 1 from pg_type where typname = 'mission_status') then
    create type public.mission_status as enum ('locked','hidden','available','in_progress','claimable','completed','cooldown');
  end if;
end$$;

-- Missions master table
create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  category text not null default 'core',
  difficulty text,
  repeatable boolean not null default false,
  cooldown_days integer not null default 0,
  seasonal_start date,
  seasonal_end date,
  rules jsonb not null default '{}'::jsonb,
  rewards jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  display_order integer not null default 100,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_missions_category on public.missions(category);
create index if not exists idx_missions_display_order on public.missions(display_order);

create trigger trg_missions_updated
  before update on public.missions
  for each row
  execute function public.touch_updated_at();

-- Localised copy for mission titles/descriptions
create table if not exists public.mission_translations (
  mission_id uuid not null references public.missions(id) on delete cascade,
  locale text not null,
  title text not null,
  summary text not null,
  reward_short text,
  cta_label text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (mission_id, locale)
);

create trigger trg_mission_translations_updated
  before update on public.mission_translations
  for each row
  execute function public.touch_updated_at();

-- Per-profile mission state
create table if not exists public.user_mission_states (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  mission_id uuid not null references public.missions(id) on delete cascade,
  status public.mission_status not null default 'locked',
  progress jsonb not null default '{}'::jsonb,
  streak_counter integer not null default 0,
  attempts integer not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  next_eligible_at timestamptz,
  last_event_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (profile_id, mission_id)
);

create index if not exists idx_user_mission_states_profile on public.user_mission_states(profile_id);
create index if not exists idx_user_mission_states_status on public.user_mission_states(status);

create trigger trg_user_mission_states_updated
  before update on public.user_mission_states
  for each row
  execute function public.touch_updated_at();

-- Mission progression events (audit trail)
create table if not exists public.mission_progress_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  mission_id uuid not null references public.missions(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_mission_progress_events_profile on public.mission_progress_events(profile_id);
create index if not exists idx_mission_progress_events_mission on public.mission_progress_events(mission_id);
create index if not exists idx_mission_progress_events_type on public.mission_progress_events(event_type);

-- Rewards ledger to capture XP, badges, items etc.
create table if not exists public.mission_reward_ledger (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  mission_id uuid references public.missions(id) on delete set null,
  source text not null,
  xp integer not null default 0,
  rewards jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_mission_reward_ledger_profile on public.mission_reward_ledger(profile_id);
create index if not exists idx_mission_reward_ledger_mission on public.mission_reward_ledger(mission_id);

-- Profile progression (xp, levels, streaks, freeze tokens)
create table if not exists public.profile_progression (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  xp integer not null default 0,
  level integer not null default 1,
  current_streak integer not null default 0,
  best_streak integer not null default 0,
  freezes_owned integer not null default 0,
  freezes_used integer not null default 0,
  last_active_date date,
  last_reward_claim_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger trg_profile_progression_updated
  before update on public.profile_progression
  for each row
  execute function public.touch_updated_at();

-- RLS policies
alter table public.missions enable row level security;
alter table public.mission_translations enable row level security;
alter table public.user_mission_states enable row level security;
alter table public.mission_progress_events enable row level security;
alter table public.mission_reward_ledger enable row level security;
alter table public.profile_progression enable row level security;

-- Extend profiles with locale preference (default 'pl')
alter table if exists public.profiles
  add column if not exists locale text not null default 'pl';

create policy "Missions readable to authenticated" on public.missions
  for select
  to authenticated, anon
  using (true);

create policy "Mission translations readable to authenticated" on public.mission_translations
  for select
  to authenticated, anon
  using (true);

create policy "User mission states manageable by owner" on public.user_mission_states
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = user_mission_states.profile_id
        and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = user_mission_states.profile_id
        and p.owner_id = auth.uid()
    )
  );

create policy "Mission events viewable by owner" on public.mission_progress_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = mission_progress_events.profile_id
        and p.owner_id = auth.uid()
    )
  );

create policy "Mission events insert by owner" on public.mission_progress_events
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = mission_progress_events.profile_id
        and p.owner_id = auth.uid()
    )
  );

create policy "Mission reward ledger viewable by owner" on public.mission_reward_ledger
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = mission_reward_ledger.profile_id
        and p.owner_id = auth.uid()
    )
  );

create policy "Profile progression manageable by owner" on public.profile_progression
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = profile_progression.profile_id
        and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = profile_progression.profile_id
        and p.owner_id = auth.uid()
    )
  );
