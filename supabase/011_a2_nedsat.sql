-- Bikerbasen migration 011: "kan nedsaettes til A2".
-- Koer hele filen i Supabase SQL Editor. Kan koeres igen uden skade.
-- Ren ASCII.
--
-- En staerk motorcykel (>48 hk) kan ofte effektbegraenses, saa den lovligt
-- maa foeres paa A2-koerekort. Det er en central MC-koeber-nuance (jf. brief:
-- "A2 + A2-nedsat"), som udvider koeberkredsen for annoncen. Valgfrit felt,
-- default false, saa eksisterende annoncer er uaendrede.

alter table public.listings
  add column if not exists kan_nedsaettes_a2 boolean not null default false;
