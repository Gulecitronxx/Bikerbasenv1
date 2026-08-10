-- ============================================================
-- Tjek: hvad findes der egentlig efter migration 004?
--
-- Kør denne i Supabase SQL Editor og send resultatet.
-- Den ændrer ingenting — kun læsning.
-- ============================================================

select
  'tabel: listing_stats' as ting,
  case when to_regclass('public.listing_stats') is not null
       then 'FINDES' else 'MANGLER' end as status

union all
select
  'funktion: record_listing_event',
  case when exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'record_listing_event'
  ) then 'FINDES' else 'MANGLER' end

union all
select
  'funktion: my_listing_saves',
  case when exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'my_listing_saves'
  ) then 'FINDES' else 'MANGLER' end

union all
select
  'politik på listing_stats',
  coalesce((select string_agg(policyname, ', ')
            from pg_policies
            where schemaname = 'public' and tablename = 'listing_stats'), 'INGEN')

union all
select
  'rækker i listing_stats',
  case when to_regclass('public.listing_stats') is not null
       then (select count(*)::text from public.listing_stats)
       else 'n/a' end;
