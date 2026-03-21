begin;

create extension if not exists pgcrypto;
create extension if not exists postgis;

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  store_name varchar(255) not null,
  business_category_large varchar(50),
  business_category_medium varchar(100),
  business_category_small varchar(100),
  business_code varchar(20),
  location geography(point, 4326) not null,
  address_jibun varchar(500),
  address_road varchar(500),
  dong_code varchar(20),
  floor_area numeric(10, 2) check (floor_area is null or floor_area >= 0),
  opened_at date,
  closed_at date,
  status varchar(20) not null default '영업/정상',
  is_franchise boolean not null default false,
  franchise_brand varchar(100),
  semas_id varchar(50),
  localdata_id varchar(50),
  match_confidence numeric(3, 2) check (match_confidence is null or match_confidence between 0 and 1),
  data_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint stores_status_check check (status in ('영업/정상', '휴업', '폐업')),
  constraint stores_closed_after_opened_check check (
    closed_at is null or opened_at is null or closed_at >= opened_at
  )
);

create table if not exists public.district_stats (
  dong_code varchar(20) primary key,
  dong_name varchar(100) not null,
  population integer not null default 0 check (population >= 0),
  households integer not null default 0 check (households >= 0),
  single_households integer not null default 0 check (single_households >= 0),
  area_boundary geography(polygon, 4326),
  updated_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lat numeric(10, 7) not null,
  lng numeric(10, 7) not null,
  address varchar(500) not null,
  business_category varchar(100) not null,
  temperature_score integer not null check (temperature_score between 0 and 100),
  risk_score integer not null check (risk_score between 0 and 100),
  estimated_revenue_min bigint not null check (estimated_revenue_min >= 0),
  estimated_revenue_median bigint not null check (estimated_revenue_median >= estimated_revenue_min),
  estimated_revenue_max bigint not null check (estimated_revenue_max >= estimated_revenue_median),
  report_data jsonb not null default '{}'::jsonb,
  is_paid boolean not null default false,
  created_at timestamptz not null default now(),
  constraint reports_lat_check check (lat between -90 and 90),
  constraint reports_lng_check check (lng between -180 and 180)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  report_id uuid references public.reports (id) on delete set null,
  payment_type varchar(20) not null,
  amount integer not null check (amount > 0),
  payment_key varchar(200) not null,
  status varchar(20) not null default 'pending',
  created_at timestamptz not null default now(),
  constraint payments_type_check check (payment_type in ('single', 'subscription')),
  constraint payments_status_check check (status in ('pending', 'completed', 'refunded')),
  constraint payments_single_requires_report_check check (
    (payment_type = 'single' and report_id is not null)
    or (payment_type = 'subscription' and report_id is null)
  ),
  constraint payments_payment_key_key unique (payment_key)
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan varchar(50) not null,
  target_dong varchar(20),
  amount integer not null check (amount > 0),
  started_at timestamptz not null,
  expires_at timestamptz not null,
  status varchar(20) not null default 'active',
  created_at timestamptz not null default now(),
  constraint subscriptions_plan_check check (plan in ('local_pass', 'b2b_standard', 'b2b_pro')),
  constraint subscriptions_status_check check (status in ('active', 'cancelled', 'expired')),
  constraint subscriptions_expiry_check check (expires_at > started_at),
  constraint subscriptions_local_pass_target_check check (
    plan <> 'local_pass' or target_dong is not null
  )
);

create index if not exists stores_location_idx on public.stores using gist (location);
create index if not exists stores_business_code_idx on public.stores (business_code);
create index if not exists stores_dong_code_idx on public.stores (dong_code);
create index if not exists stores_status_idx on public.stores (status);
create unique index if not exists stores_semas_id_uidx on public.stores (semas_id) where semas_id is not null;
create unique index if not exists stores_localdata_id_uidx on public.stores (localdata_id) where localdata_id is not null;

create index if not exists district_stats_area_boundary_idx on public.district_stats using gist (area_boundary);

create index if not exists reports_user_id_created_at_idx on public.reports (user_id, created_at desc);
create index if not exists payments_user_id_created_at_idx on public.payments (user_id, created_at desc);
create index if not exists subscriptions_user_id_status_idx on public.subscriptions (user_id, status);

alter table public.stores enable row level security;
alter table public.district_stats enable row level security;
alter table public.reports enable row level security;
alter table public.payments enable row level security;
alter table public.subscriptions enable row level security;

create policy "Authenticated users can read stores"
  on public.stores
  for select
  to authenticated
  using (true);

create policy "Authenticated users can read district stats"
  on public.district_stats
  for select
  to authenticated
  using (true);

create policy "Users can read own reports"
  on public.reports
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can create own reports"
  on public.reports
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can read own payments"
  on public.payments
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can read own subscriptions"
  on public.subscriptions
  for select
  to authenticated
  using (auth.uid() = user_id);

grant select on public.stores to authenticated;
grant select on public.district_stats to authenticated;
grant select, insert on public.reports to authenticated;
grant select on public.payments to authenticated;
grant select on public.subscriptions to authenticated;

create or replace function public.nearby_stores(
  target_lat numeric,
  target_lng numeric,
  radius_meters integer,
  category varchar default null
)
returns setof public.stores
language sql
stable
as $$
  select s.*
  from public.stores as s
  where st_dwithin(
    s.location,
    st_setsrid(st_point(target_lng::double precision, target_lat::double precision), 4326)::geography,
    radius_meters
  )
    and s.status = '영업/정상'
    and (category is null or s.business_category_small = category)
  order by st_distance(
    s.location,
    st_setsrid(st_point(target_lng::double precision, target_lat::double precision), 4326)::geography
  );
$$;

grant execute on function public.nearby_stores(numeric, numeric, integer, varchar) to authenticated;

commit;
