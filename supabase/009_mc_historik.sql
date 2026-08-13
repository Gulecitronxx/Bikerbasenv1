-- Bikerbasen migration 009: MC-historik-felter paa annoncer.
-- Koer hele filen i Supabase SQL Editor. Kan koeres igen uden skade.
-- Ren ASCII.
--
-- Tilfoejer tre strukturerede historik-fakta, som en seriøs MC-koeber
-- vaelger ud fra (jf. 123mc/bikerportalen): servicehistorik, antal ejere og
-- aarstal for sidste syn. Alle er valgfrie (null tilladt), saa eksisterende
-- annoncer er uaendrede. CHECK-constraints haandhaever gyldige vaerdier
-- server-side, saa et direkte API-kald ikke kan gemme en ugyldig kombination.

alter table public.listings add column if not exists service_historik text;
alter table public.listings add column if not exists antal_ejere       int;
alter table public.listings add column if not exists sidste_syn         int;

-- Servicehistorik: kun det kendte vaerdisaet (matcher formularen).
alter table public.listings drop constraint if exists listings_service_historik_chk;
alter table public.listings add constraint listings_service_historik_chk
  check (service_historik is null
         or service_historik in ('Fuld', 'Delvis', 'Ingen', 'Ukendt'));

-- Antal ejere: mindst 1, og en fornuftig oevre graense mod urealistiske tal.
alter table public.listings drop constraint if exists listings_antal_ejere_chk;
alter table public.listings add constraint listings_antal_ejere_chk
  check (antal_ejere is null or (antal_ejere >= 1 and antal_ejere <= 99));

-- Sidste syn: et aarstal i et rimeligt interval (ikke foer 1980, ikke i fremtiden).
alter table public.listings drop constraint if exists listings_sidste_syn_chk;
alter table public.listings add constraint listings_sidste_syn_chk
  check (sidste_syn is null
         or (sidste_syn between 1980 and extract(year from now())::int + 1));
