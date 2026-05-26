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
  dashboard_visible boolean default true,
  stage text default 'just_interested',
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

alter table public.properties
add column if not exists dashboard_visible boolean default true;

alter table public.properties
add column if not exists stage text default 'just_interested';

alter table public.properties
drop constraint if exists properties_stage_check;

alter table public.properties
add constraint properties_stage_check
check (stage in ('just_interested', 'offer_placed', 'toured', 'under_contract', 'fell_through'));

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

create table if not exists public.deal_rooms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.deal_room_members (
  id uuid primary key default gen_random_uuid(),
  deal_room_id uuid not null references public.deal_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'collaborator',
  created_at timestamptz default now(),
  unique(deal_room_id, user_id),
  constraint deal_room_members_role_check check (role in ('collaborator'))
);

create table if not exists public.deal_room_properties (
  id uuid primary key default gen_random_uuid(),
  deal_room_id uuid not null references public.deal_rooms(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  unique(deal_room_id, property_id)
);

create table if not exists public.deal_room_property_comments (
  id uuid primary key default gen_random_uuid(),
  deal_room_id uuid not null references public.deal_rooms(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  comment text not null,
  created_at timestamptz default now(),
  constraint deal_room_property_comments_length_check check (char_length(comment) <= 2000)
);

create table if not exists public.showcases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text default '',
  public_token text unique not null,
  access_mode text not null default 'view_only',
  is_public boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint showcases_access_mode_check check (access_mode in ('view_only', 'can_comment'))
);

create table if not exists public.showcase_properties (
  id uuid primary key default gen_random_uuid(),
  showcase_id uuid not null references public.showcases(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  unique(showcase_id, property_id)
);

create table if not exists public.public_property_comments (
  id uuid primary key default gen_random_uuid(),
  showcase_id uuid not null references public.showcases(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  display_name text default 'Anonymous',
  comment text not null,
  created_at timestamptz default now(),
  constraint public_property_comments_length_check check (char_length(comment) <= 2000)
);

create or replace function public.is_deal_room_owner(p_room_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.deal_rooms
    where id = p_room_id and owner_id = p_user_id
  );
$$;

create or replace function public.is_deal_room_member(p_room_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.deal_room_members
    where deal_room_id = p_room_id and user_id = p_user_id
  );
$$;

create or replace function public.can_access_deal_room(p_room_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.is_deal_room_owner(p_room_id, p_user_id)
    or public.is_deal_room_member(p_room_id, p_user_id);
$$;

create or replace function public.can_access_property_via_deal_room(p_property_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.deal_room_properties drp
    where drp.property_id = p_property_id
      and public.can_access_deal_room(drp.deal_room_id, p_user_id)
  );
$$;

create or replace function public.can_update_property_via_deal_room(p_property_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.deal_room_properties drp
    join public.deal_rooms dr on dr.id = drp.deal_room_id
    where drp.property_id = p_property_id
      and dr.owner_id = p_user_id
  );
$$;

create or replace function public.can_access_property_via_owned_showcase(p_property_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.showcase_properties sp
    join public.showcases s on s.id = sp.showcase_id
    where sp.property_id = p_property_id
      and s.owner_id = p_user_id
  );
$$;

create or replace function public.is_public_showcase_property(p_property_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.showcase_properties sp
    join public.showcases s on s.id = sp.showcase_id
    where sp.property_id = p_property_id
      and s.is_public = true
  );
$$;

drop function if exists public.get_public_showcase_properties(text);

create or replace function public.get_public_showcase_properties(p_public_token text)
returns table (
  showcase_id uuid,
  showcase_name text,
  showcase_description text,
  access_mode text,
  public_token text,
  property_id uuid,
  stage text,
  address text,
  listing_url text,
  general_notes text,
  tour_notes text,
  purchase_price numeric,
  interest_rate numeric,
  down_payment_percent numeric,
  annual_taxes numeric,
  annual_insurance numeric,
  monthly_pmi numeric,
  monthly_hoa numeric,
  monthly_rental_income numeric,
  loan_term_years integer,
  total_monthly_payment numeric,
  dti_status text,
  dti_status_label text,
  financing_fit text,
  financing_fit_label text
)
language sql
security definer
set search_path = public
as $$
  with base as (
    select
      s.id as showcase_id,
      s.name as showcase_name,
      s.description as showcase_description,
      s.access_mode,
      s.public_token,
      p.id as property_id,
      coalesce(p.stage, 'just_interested') as stage,
      p.address,
      p.listing_url,
      p.general_notes,
      p.tour_notes,
      coalesce(p.purchase_price, 0) as purchase_price,
      coalesce(p.interest_rate, 0) as interest_rate,
      coalesce(p.down_payment_percent, 0) as down_payment_percent,
      coalesce(p.annual_taxes, 0) as annual_taxes,
      coalesce(p.annual_insurance, 0) as annual_insurance,
      coalesce(p.monthly_pmi, 0) as monthly_pmi,
      coalesce(p.monthly_hoa, 0) as monthly_hoa,
      coalesce(p.monthly_rental_income, 0) as monthly_rental_income,
      coalesce(p.loan_term_years, 30) as loan_term_years,
      coalesce(pr.monthly_income, 0) as monthly_income,
      coalesce(pr.monthly_debt, 0) as monthly_debt
    from public.showcases s
    join public.showcase_properties sp on sp.showcase_id = s.id
    join public.properties p on p.id = sp.property_id
    join public.profiles pr on pr.id = s.owner_id
    where s.public_token = p_public_token
      and s.is_public = true
  ),
  math as (
    select
      base.*,
      greatest(purchase_price - (purchase_price * down_payment_percent / 100), 0) as loan_amount,
      (interest_rate / 100 / 12) as monthly_rate,
      greatest(loan_term_years * 12, 1) as months
    from base
  ),
  payments as (
    select
      math.*,
      case
        when purchase_price <= 0 then 0
        when monthly_rate > 0 then
          loan_amount * monthly_rate * power(1 + monthly_rate, months)
          / nullif(power(1 + monthly_rate, months) - 1, 0)
        else loan_amount / months
      end as monthly_pi
    from math
  ),
  final as (
    select
      payments.*,
      monthly_pi + annual_taxes / 12 + annual_insurance / 12 + monthly_pmi + monthly_hoa as total_payment,
      monthly_income + monthly_rental_income * 0.75 as dti_income
    from payments
  )
  select
    showcase_id,
    showcase_name,
    showcase_description,
    access_mode,
    public_token,
    property_id,
    stage,
    address,
    listing_url,
    general_notes,
    tour_notes,
    purchase_price,
    interest_rate,
    down_payment_percent,
    annual_taxes,
    annual_insurance,
    monthly_pmi,
    monthly_hoa,
    monthly_rental_income,
    loan_term_years,
    total_payment as total_monthly_payment,
    case
      when purchase_price <= 0 or dti_income <= 0 then 'needs_numbers'
      when (monthly_debt + total_payment) / dti_income <= 0.45 then 'under_target'
      else 'over_target'
    end as dti_status,
    case
      when purchase_price <= 0 or dti_income <= 0 then 'Needs numbers'
      when (monthly_debt + total_payment) / dti_income <= 0.45 then 'DTI under 45%'
      else 'DTI over 45%'
    end as dti_status_label,
    case
      when purchase_price <= 0 or dti_income <= 0 then 'needs_numbers'
      when (monthly_debt + total_payment) / dti_income <= 0.45 then 'looks_workable'
      else 'review_dti'
    end as financing_fit,
    case
      when purchase_price <= 0 or dti_income <= 0 then 'Needs numbers'
      when (monthly_debt + total_payment) / dti_income <= 0.45 then 'Good fit'
      else 'Review DTI'
    end as financing_fit_label
  from final;
$$;

alter table public.profiles enable row level security;
alter table public.properties enable row level security;

drop policy if exists "Users can select own profile" on public.profiles;
create policy "Users can select own profile"
on public.profiles for select
using (
  auth.uid() = id
  or exists (
    select 1 from public.deal_rooms dr
    where dr.owner_id = profiles.id
      and public.can_access_deal_room(dr.id, auth.uid())
  )
);

create or replace view public.profile_directory as
select id, username from public.profiles;

create or replace function public.is_deal_room_owner(p_room_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.deal_rooms
    where id = p_room_id and owner_id = p_user_id
  );
$$;

create or replace function public.is_deal_room_member(p_room_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.deal_room_members
    where deal_room_id = p_room_id and user_id = p_user_id
  );
$$;

create or replace function public.can_access_deal_room(p_room_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.is_deal_room_owner(p_room_id, p_user_id)
    or public.is_deal_room_member(p_room_id, p_user_id);
$$;

create or replace function public.can_access_property_via_deal_room(p_property_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.deal_room_properties drp
    where drp.property_id = p_property_id
      and public.can_access_deal_room(drp.deal_room_id, p_user_id)
  );
$$;

create or replace function public.can_update_property_via_deal_room(p_property_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.deal_room_properties drp
    join public.deal_rooms dr on dr.id = drp.deal_room_id
    where drp.property_id = p_property_id
      and dr.owner_id = p_user_id
  );
$$;

create or replace function public.can_access_property_via_owned_showcase(p_property_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.showcase_properties sp
    join public.showcases s on s.id = sp.showcase_id
    where sp.property_id = p_property_id
      and s.owner_id = p_user_id
  );
$$;

create or replace function public.is_public_showcase_property(p_property_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.showcase_properties sp
    join public.showcases s on s.id = sp.showcase_id
    where sp.property_id = p_property_id
      and s.is_public = true
  );
$$;

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
using (
  auth.uid() = user_id
  or public.can_access_property_via_deal_room(properties.id, auth.uid())
  or public.can_access_property_via_owned_showcase(properties.id, auth.uid())
  or public.is_public_showcase_property(properties.id)
);

drop policy if exists "Users can insert own properties" on public.properties;
create policy "Users can insert own properties"
on public.properties for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own properties" on public.properties;
create policy "Users can update own properties"
on public.properties for update
using (
  auth.uid() = user_id
  or public.can_update_property_via_deal_room(properties.id, auth.uid())
)
with check (
  auth.uid() = user_id
  or public.can_update_property_via_deal_room(properties.id, auth.uid())
);

drop policy if exists "Users can delete own properties" on public.properties;
create policy "Users can delete own properties"
on public.properties for delete
using (auth.uid() = user_id);

create table if not exists public.deal_rooms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.deal_room_members (
  id uuid primary key default gen_random_uuid(),
  deal_room_id uuid not null references public.deal_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'collaborator',
  created_at timestamptz default now(),
  unique(deal_room_id, user_id),
  constraint deal_room_members_role_check check (role in ('collaborator'))
);

create table if not exists public.deal_room_properties (
  id uuid primary key default gen_random_uuid(),
  deal_room_id uuid not null references public.deal_rooms(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  unique(deal_room_id, property_id)
);

create table if not exists public.showcases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text default '',
  public_token text unique not null,
  access_mode text not null default 'view_only',
  is_public boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint showcases_access_mode_check check (access_mode in ('view_only', 'can_comment'))
);

create table if not exists public.showcase_properties (
  id uuid primary key default gen_random_uuid(),
  showcase_id uuid not null references public.showcases(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  unique(showcase_id, property_id)
);

create table if not exists public.public_property_comments (
  id uuid primary key default gen_random_uuid(),
  showcase_id uuid not null references public.showcases(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  display_name text default 'Anonymous',
  comment text not null,
  created_at timestamptz default now(),
  constraint public_property_comments_length_check check (char_length(comment) <= 2000)
);

create index if not exists idx_deal_rooms_owner_id on public.deal_rooms(owner_id);
create index if not exists idx_deal_room_members_user_id on public.deal_room_members(user_id);
create index if not exists idx_deal_room_members_deal_room_id on public.deal_room_members(deal_room_id);
create index if not exists idx_deal_room_properties_deal_room_id on public.deal_room_properties(deal_room_id);
create index if not exists idx_deal_room_properties_property_id on public.deal_room_properties(property_id);
create index if not exists idx_deal_room_property_comments_deal_room_id on public.deal_room_property_comments(deal_room_id);
create index if not exists idx_deal_room_property_comments_property_id on public.deal_room_property_comments(property_id);
create index if not exists idx_showcases_owner_id on public.showcases(owner_id);
create index if not exists idx_showcases_public_token on public.showcases(public_token);
create index if not exists idx_showcase_properties_showcase_id on public.showcase_properties(showcase_id);
create index if not exists idx_showcase_properties_property_id on public.showcase_properties(property_id);
create index if not exists idx_public_property_comments_showcase_id on public.public_property_comments(showcase_id);
create index if not exists idx_public_property_comments_property_id on public.public_property_comments(property_id);

drop trigger if exists set_deal_rooms_updated_at on public.deal_rooms;
create trigger set_deal_rooms_updated_at
before update on public.deal_rooms
for each row execute function public.set_updated_at();

drop trigger if exists set_showcases_updated_at on public.showcases;
create trigger set_showcases_updated_at
before update on public.showcases
for each row execute function public.set_updated_at();

alter table public.deal_rooms enable row level security;
alter table public.deal_room_members enable row level security;
alter table public.deal_room_properties enable row level security;
alter table public.deal_room_property_comments enable row level security;
alter table public.showcases enable row level security;
alter table public.showcase_properties enable row level security;
alter table public.public_property_comments enable row level security;

drop policy if exists "Users can select accessible deal rooms" on public.deal_rooms;
create policy "Users can select accessible deal rooms"
on public.deal_rooms for select
to authenticated
using (
  owner_id = auth.uid()
  or public.is_deal_room_member(deal_rooms.id, auth.uid())
);

drop policy if exists "Users can insert own deal rooms" on public.deal_rooms;
create policy "Users can insert own deal rooms"
on public.deal_rooms for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "Owners can update deal rooms" on public.deal_rooms;
create policy "Owners can update deal rooms"
on public.deal_rooms for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "Owners can delete deal rooms" on public.deal_rooms;
create policy "Owners can delete deal rooms"
on public.deal_rooms for delete
to authenticated
using (owner_id = auth.uid());

drop policy if exists "Deal room memberships are visible to room users" on public.deal_room_members;
create policy "Deal room memberships are visible to room users"
on public.deal_room_members for select
using (
  user_id = auth.uid()
  or public.is_deal_room_owner(deal_room_members.deal_room_id, auth.uid())
);

drop policy if exists "Room owners can insert members" on public.deal_room_members;
create policy "Room owners can insert members"
on public.deal_room_members for insert
with check (public.is_deal_room_owner(deal_room_members.deal_room_id, auth.uid()));

drop policy if exists "Room owners can delete members" on public.deal_room_members;
create policy "Room owners can delete members"
on public.deal_room_members for delete
using (public.is_deal_room_owner(deal_room_members.deal_room_id, auth.uid()));

drop policy if exists "Deal room users can select linked properties" on public.deal_room_properties;
create policy "Deal room users can select linked properties"
on public.deal_room_properties for select
using (public.can_access_deal_room(deal_room_properties.deal_room_id, auth.uid()));

drop policy if exists "Deal room users can link properties" on public.deal_room_properties;
create policy "Deal room users can link properties"
on public.deal_room_properties for insert
with check (
  added_by = auth.uid()
  and public.can_access_deal_room(deal_room_properties.deal_room_id, auth.uid())
);

drop policy if exists "Room owners and adders can unlink properties" on public.deal_room_properties;
create policy "Room owners and adders can unlink properties"
on public.deal_room_properties for delete
using (
  added_by = auth.uid()
  or public.is_deal_room_owner(deal_room_properties.deal_room_id, auth.uid())
);

drop policy if exists "Deal room users can read comments" on public.deal_room_property_comments;
create policy "Deal room users can read comments"
on public.deal_room_property_comments for select
to authenticated
using (public.can_access_deal_room(deal_room_property_comments.deal_room_id, auth.uid()));

drop policy if exists "Deal room users can add comments" on public.deal_room_property_comments;
create policy "Deal room users can add comments"
on public.deal_room_property_comments for insert
to authenticated
with check (
  user_id = auth.uid()
  and char_length(trim(comment)) > 0
  and char_length(comment) <= 2000
  and public.can_access_deal_room(deal_room_property_comments.deal_room_id, auth.uid())
  and exists (
    select 1 from public.deal_room_properties
    where deal_room_properties.deal_room_id = deal_room_property_comments.deal_room_id
      and deal_room_properties.property_id = deal_room_property_comments.property_id
  )
);

drop policy if exists "Owners manage showcases" on public.showcases;
create policy "Owners manage showcases"
on public.showcases for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "Public can read public showcases" on public.showcases;
create policy "Public can read public showcases"
on public.showcases for select
using (is_public = true);

drop policy if exists "Owners manage showcase properties" on public.showcase_properties;
create policy "Owners manage showcase properties"
on public.showcase_properties for all
using (
  exists (
    select 1 from public.showcases
    where showcases.id = showcase_properties.showcase_id
      and showcases.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.showcases
    where showcases.id = showcase_properties.showcase_id
      and showcases.owner_id = auth.uid()
  )
);

drop policy if exists "Public can read public showcase properties" on public.showcase_properties;
create policy "Public can read public showcase properties"
on public.showcase_properties for select
using (
  exists (
    select 1 from public.showcases
    where showcases.id = showcase_properties.showcase_id
      and showcases.is_public = true
  )
);

drop policy if exists "Public can select public comments" on public.public_property_comments;
create policy "Public can select public comments"
on public.public_property_comments for select
using (
  exists (
    select 1 from public.showcases
    where showcases.id = public_property_comments.showcase_id
      and showcases.is_public = true
  )
);

drop policy if exists "Public can insert enabled comments" on public.public_property_comments;
create policy "Public can insert enabled comments"
on public.public_property_comments for insert
with check (
  char_length(trim(comment)) > 0
  and char_length(comment) <= 2000
  and exists (
    select 1 from public.showcases
    where showcases.id = public_property_comments.showcase_id
      and showcases.is_public = true
      and showcases.access_mode = 'can_comment'
  )
  and exists (
    select 1 from public.showcase_properties
    where showcase_properties.showcase_id = public_property_comments.showcase_id
      and showcase_properties.property_id = public_property_comments.property_id
  )
);

drop policy if exists "Owners can delete showcase comments" on public.public_property_comments;
create policy "Owners can delete showcase comments"
on public.public_property_comments for delete
using (
  exists (
    select 1 from public.showcases
    where showcases.id = public_property_comments.showcase_id
      and showcases.owner_id = auth.uid()
  )
);
