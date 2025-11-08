-- Create pricing settings singleton table

create table if not exists public.pricing_settings (
  id boolean primary key default true,
  currency text not null default 'EUR',
  premium_monthly numeric(10, 2) not null default 5.00,
  premium_yearly numeric(10, 2) not null default 24.00,
  sg_pack_3 numeric(10, 2) not null default 5.00,
  sg_pack_10 numeric(10, 2) not null default 12.00,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.pricing_settings enable row level security;

create trigger trg_pricing_settings_updated
before update on public.pricing_settings
for each row
execute function public.touch_updated_at();

insert into public.pricing_settings (id)
values (true)
on conflict (id) do nothing;

create policy "Pricing settings readable by everyone"
on public.pricing_settings
for select
using (true);

create policy "Pricing settings manageable by admins"
on public.pricing_settings
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.owner_id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.owner_id = auth.uid()
      and p.role = 'admin'
  )
);

create policy "Pricing settings insertable by admins"
on public.pricing_settings
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.owner_id = auth.uid()
      and p.role = 'admin'
  )
);

