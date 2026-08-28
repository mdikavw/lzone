create type public.billing_type as enum (
  'MONTHLY',
  'PER_SESSION'
);

alter table public.students
add column billing_type public.billing_type
not null default 'MONTHLY';