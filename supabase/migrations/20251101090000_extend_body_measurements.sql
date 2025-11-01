-- Migration: extend body measurements coverage with additional fields

alter table public.body_measurements
  add column if not exists torso_girth_cm numeric(5,1);

alter table public.body_measurements
  add column if not exists thigh_cm numeric(5,1);

alter table public.body_measurements
  add column if not exists foot_width_cm numeric(5,1);

alter table public.body_measurements
  add column if not exists wrist_cm numeric(5,1);

alter table public.body_measurements
  add column if not exists hand_length_cm numeric(5,1);

alter table public.body_measurements
  add column if not exists finger_circumference_mm numeric(6,2);

