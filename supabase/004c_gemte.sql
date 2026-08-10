-- Bikerbasen migration 004c: hvor mange har gemt mine annoncer.
-- Koer 004a og 004b foerst. Hele denne fil koeres som den er.
--
-- favorites-politikken lader kun brugeren se sine EGNE favoritter, saa en
-- saelger kan ikke taelle dem selv. Funktionen giver kun totaler ud og
-- afsloerer aldrig hvem der har gemt hvad.
--
-- Udgangskolonnen hedder listing og ikke listing_id med vilje: navne i
-- returns table bliver til parametre, og et navn der ogsaa er en rigtig
-- kolonne kan goere referencer i kroppen tvetydige.

create or replace function public.my_listing_saves()
returns table (listing uuid, saves bigint)
language sql
security definer
set search_path = public
as $fn$
  select f.listing_id, count(*)::bigint
  from public.favorites f
  join public.listings l on l.id = f.listing_id
  where l.seller_id = auth.uid()
  group by f.listing_id;
$fn$;

grant execute on function public.my_listing_saves() to authenticated;
