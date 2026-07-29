-- ============================================================
-- Bikerbasen — migration 003
-- Udstyr, brændstof, træktype, cylindre og farve på annoncerne.
--
-- 123mc.dk lader køberen filtrere på ~40 udstyrspunkter plus farve,
-- brændstof, træktype og cylinderantal. Uden de felter kan vi ikke
-- konkurrere på den søgning, der faktisk fører til et køb.
--
-- Kør i Supabase Dashboard → SQL Editor. Alle kolonner er nullable eller
-- har default, så eksisterende annoncer består uændret.
-- ============================================================

alter table public.listings
  add column if not exists fuel      text,
  add column if not exists drive     text,
  add column if not exists cylinders int,
  add column if not exists color     text,
  add column if not exists equipment text[] not null default '{}';

-- Værdierne er lukkede lister i UI'et; her spejles de, så en fejlagtig
-- klient ikke kan skrive noget søgefiltrene aldrig vil finde igen.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'listings_fuel_check') then
    alter table public.listings add constraint listings_fuel_check
      check (fuel is null or fuel in ('Benzin','El','Hybrid','Diesel'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'listings_drive_check') then
    alter table public.listings add constraint listings_drive_check
      check (drive is null or drive in ('Kædetræk','Kardantræk','Remtræk'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'listings_cylinders_check') then
    alter table public.listings add constraint listings_cylinders_check
      check (cylinders is null or cylinders between 1 and 8);
  end if;
end $$;

-- Udstyrsfilteret spørger "indeholder alle disse" (array-containment).
-- GIN-indekset er det, der holder den forespørgsel hurtig når annoncerne
-- vokser fra hundreder til tusinder.
create index if not exists listings_equipment_idx
  on public.listings using gin (equipment);

-- Filtrene kombineres næsten altid med "kun aktive annoncer".
create index if not exists listings_active_created_idx
  on public.listings (created_at desc) where status = 'active';
