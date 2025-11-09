-- Add onboarding completion flag to profiles

alter table public.profiles
  add column if not exists has_completed_onboarding boolean not null default false;

comment on column public.profiles.has_completed_onboarding is 'Indicates whether the user finished the product onboarding flow.';

