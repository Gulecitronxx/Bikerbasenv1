-- Bikerbasen migration 010: daekalder + vinterklargoering paa annoncer.
-- Koer hele filen i Supabase SQL Editor. Kan koeres igen uden skade.
-- Ren ASCII.
--
-- To ekstra MC-historik-fakta (jf. produktbrief): daekalder (aarstal for
-- naar daekkene sidst blev skiftet) og om motorcyklen er vinterklargjort.
-- Begge valgfrie, saa eksisterende annoncer er uaendrede. CHECK haandhaever
-- et rimeligt aarstal server-side.

alter table public.listings add column if not exists daek_aar   int;
alter table public.listings add column if not exists vinterklar boolean not null default false;

alter table public.listings drop constraint if exists listings_daek_aar_chk;
alter table public.listings add constraint listings_daek_aar_chk
  check (daek_aar is null
         or (daek_aar between 1990 and extract(year from now())::int + 1));
