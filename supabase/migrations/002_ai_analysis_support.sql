begin;

create or replace function public.stores_within_radius_with_distance(
  target_lat numeric,
  target_lng numeric,
  radius_meters integer,
  category varchar default null
)
returns table (
  id uuid,
  store_name varchar(255),
  business_category_large varchar(50),
  business_category_medium varchar(100),
  business_category_small varchar(100),
  business_code varchar(20),
  location geography(point, 4326),
  address_jibun varchar(500),
  address_road varchar(500),
  dong_code varchar(20),
  floor_area numeric(10, 2),
  opened_at date,
  closed_at date,
  status varchar(20),
  is_franchise boolean,
  franchise_brand varchar(100),
  semas_id varchar(50),
  localdata_id varchar(50),
  match_confidence numeric(3, 2),
  data_updated_at timestamptz,
  distance_meters double precision
)
language sql
stable
as $$
  select
    s.id,
    s.store_name,
    s.business_category_large,
    s.business_category_medium,
    s.business_category_small,
    s.business_code,
    s.location,
    s.address_jibun,
    s.address_road,
    s.dong_code,
    s.floor_area,
    s.opened_at,
    s.closed_at,
    s.status,
    s.is_franchise,
    s.franchise_brand,
    s.semas_id,
    s.localdata_id,
    s.match_confidence,
    s.data_updated_at,
    st_distance(
      s.location,
      st_setsrid(st_point(target_lng::double precision, target_lat::double precision), 4326)::geography
    ) as distance_meters
  from public.stores as s
  where st_dwithin(
    s.location,
    st_setsrid(st_point(target_lng::double precision, target_lat::double precision), 4326)::geography,
    radius_meters
  )
    and (
      category is null
      or s.business_category_small = category
      or s.business_category_medium = category
      or s.business_category_large = category
    )
  order by distance_meters;
$$;

grant execute on function public.stores_within_radius_with_distance(numeric, numeric, integer, varchar) to authenticated;

commit;
