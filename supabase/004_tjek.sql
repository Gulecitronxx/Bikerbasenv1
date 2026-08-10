-- Bikerbasen: hvad findes der efter 004a, 004b og 004c?
-- Kun laesning. Aendrer ingenting. Ren ASCII.
--
-- Forespoergslen naevner med vilje ikke public.listing_stats direkte:
-- Postgres slaar tabelnavne op naar planen laegges, altsaa FOER et
-- "findes den"-udtryk bliver koert. En direkte reference ville derfor faa
-- hele tjekket til at fejle netop naar tabellen mangler.

select 'tabel: listing_stats' as ting,
       case when to_regclass('public.listing_stats') is not null
            then 'FINDES' else 'MANGLER' end as status

union all
select 'funktion: record_listing_event',
       case when exists (select 1 from pg_proc p
                         join pg_namespace n on n.oid = p.pronamespace
                         where n.nspname = 'public'
                           and p.proname = 'record_listing_event')
            then 'FINDES' else 'MANGLER' end

union all
select 'funktion: my_listing_saves',
       case when exists (select 1 from pg_proc p
                         join pg_namespace n on n.oid = p.pronamespace
                         where n.nspname = 'public'
                           and p.proname = 'my_listing_saves')
            then 'FINDES' else 'MANGLER' end

union all
select 'politik paa listing_stats',
       coalesce((select string_agg(policyname, ', ') from pg_policies
                 where schemaname = 'public'
                   and tablename = 'listing_stats'), 'INGEN')

union all
select 'anslaaede raekker i listing_stats',
       coalesce((select n_live_tup::text from pg_stat_user_tables
                 where schemaname = 'public'
                   and relname = 'listing_stats'), 'n/a');
