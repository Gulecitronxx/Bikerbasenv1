-- ============================================================
-- Tjek: hvad findes der egentlig efter migration 004?
--
-- Kør i Supabase SQL Editor. Ændrer ingenting — kun læsning.
--
-- Bemærk: forespørgslen må ikke nævne public.listing_stats direkte.
-- Postgres slår tabelnavne op når planen lægges, altså FØR et
-- "findes den?"-udtryk overhovedet bliver kørt — så en direkte reference
-- ville få hele tjekket til at fejle, netop når tabellen mangler.
-- Derfor bruges katalogtabellerne hele vejen igennem.
-- ============================================================

select 'tabel: listing_stats' as ting,
       case when to_regclass('public.listing_stats') is not null
            then 'FINDES' else 'MANGLER' end as status

union all
select 'funktion: record_listing_event',
       case when exists (select 1 from pg_proc p
                         join pg_namespace n on n.oid = p.pronamespace
                         where n.nspname = 'public' and p.proname = 'record_listing_event')
            then 'FINDES' else 'MANGLER' end

union all
select 'funktion: my_listing_saves',
       case when exists (select 1 from pg_proc p
                         join pg_namespace n on n.oid = p.pronamespace
                         where n.nspname = 'public' and p.proname = 'my_listing_saves')
            then 'FINDES' else 'MANGLER' end

union all
select 'politik på listing_stats',
       coalesce((select string_agg(policyname, ', ') from pg_policies
                 where schemaname = 'public' and tablename = 'listing_stats'), 'INGEN')

union all
select 'anslåede rækker i listing_stats',
       coalesce((select n_live_tup::text from pg_stat_user_tables
                 where schemaname = 'public' and relname = 'listing_stats'), 'n/a');
