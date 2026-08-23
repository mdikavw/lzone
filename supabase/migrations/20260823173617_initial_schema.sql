-- ============================================================
-- LZone Initial Schema
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================

create type public.class_type as enum (
    'GROUP',
    'PRIVATE'
);

create type public.class_status as enum (
    'ACTIVE',
    'INACTIVE'
);

create type public.student_status as enum (
    'ACTIVE',
    'INACTIVE'
);


-- ============================================================
-- CLASSES
-- ============================================================

create table public.classes (
    id uuid primary key default gen_random_uuid(),

    name text not null,
    description text,

    type public.class_type not null default 'GROUP',
    status public.class_status not null default 'ACTIVE',

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);


-- ============================================================
-- STUDENTS
-- ============================================================

create table public.students (
    id uuid primary key default gen_random_uuid(),

    name text not null,
    phone text not null,
    email text,

    class_id uuid not null references public.classes(id)
        on delete restrict,
    
    status public.student_status not null default 'ACTIVE',

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);


-- ============================================================
-- PAYMENTS
-- ============================================================

create table public.payments (
    id uuid primary key default gen_random_uuid(),

    student_id uuid not null references public.students(id)
        on delete restrict,

    amount bigint not null,
    payment_period date not null,
    paid_at timestamptz not null default now(),

    description text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint payments_amount_positive
        check (amount > 0),

    constraint payments_period_is_first_day
        check (extract(day from payment_period) = 1),

    constraint payments_student_period_unique
        unique (student_id, payment_period)
);


-- ============================================================
-- INDEXES
-- ============================================================

create index students_class_id_idx
    on public.students(class_id);

create index payments_student_id_idx
    on public.payments(student_id);

create index payments_payment_period_idx
    on public.payments(payment_period);


-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;


create trigger classes_updated_at
before update on public.classes
for each row
execute function public.update_updated_at();


create trigger students_updated_at
before update on public.students
for each row
execute function public.update_updated_at();


create trigger payments_updated_at
before update on public.payments
for each row
execute function public.update_updated_at();