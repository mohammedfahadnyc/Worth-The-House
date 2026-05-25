create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  monthly_income numeric default 0,
  monthly_debt numeric default 0,
  cash_on_hand numeric default 0,
  setup_complete boolean default false,
  use_default_house_data boolean default false,
  default_purchase_price numeric default 0,
  default_interest_rate numeric default 7.0,
  default_down_payment_percent numeric default 20,
  default_annual_taxes numeric default 0,
  default_annual_insurance numeric default 0,
  default_monthly_pmi numeric default 0,
  default_monthly_hoa numeric default 0,
  default_monthly_rental_income numeric default 0,
  default_loan_term_years integer default 30,
  default_closing_cost_percent numeric default 3,
  default_repair_reserve numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  address text not null,
  listing_url text default '',
  general_notes text default '',
  tour_notes text default '',
  purchase_price numeric default 0,
  interest_rate numeric default 7.0,
  down_payment_percent numeric default 20,
  annual_taxes numeric default 0,
  annual_insurance numeric default 0,
  monthly_pmi numeric default 0,
  monthly_hoa numeric default 0,
  monthly_rental_income numeric default 0,
  loan_term_years integer default 30,
  closing_cost_percent numeric default 3,
  repair_reserve numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.properties
add column if not exists listing_url text default '';

create index if not exists idx_properties_user_id on public.properties(user_id);
create index if not exists idx_properties_created_at on public.properties(created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_properties_updated_at on public.properties;
create trigger set_properties_updated_at
before update on public.properties
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.properties enable row level security;

drop policy if exists "Users can select own profile" on public.profiles;
create policy "Users can select own profile"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles for insert
with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can delete own profile" on public.profiles;
create policy "Users can delete own profile"
on public.profiles for delete
using (auth.uid() = id);

drop policy if exists "Users can select own properties" on public.properties;
create policy "Users can select own properties"
on public.properties for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own properties" on public.properties;
create policy "Users can insert own properties"
on public.properties for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own properties" on public.properties;
create policy "Users can update own properties"
on public.properties for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own properties" on public.properties;
create policy "Users can delete own properties"
on public.properties for delete
using (auth.uid() = user_id);
