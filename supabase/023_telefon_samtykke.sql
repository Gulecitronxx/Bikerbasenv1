-- Bikerbasen migration 023: telefonnummer for indloggede koebere — KUN med
-- saelgerens samtykke (O3-1b, godkendt af mennesket 24.08.2026).
-- Koer i Supabase SQL Editor eller via MCP. Kan koeres igen uden skade. Ren ASCII.
--
-- MODELLEN, i tre saetninger:
--   1. `profiles.vis_telefon` (default FALSE) er saelgerens eget samtykke —
--      saettes i opret-flowets trin 4 og kan aendres af saelgeren selv
--      (kolonnen er med i kolonne-grant'en fra 006).
--   2. Nummeret udleveres KUN af RPC'en hent_saelger_telefon(listing):
--      kraever indlogget kalder, en AKTIV annonce, samtykke = true og et
--      ikke-tomt nummer. Alt andet giver null — aldrig en fejl, der afsloerer
--      hvorfor.
--   3. `public_profiles` roeres IKKE: nummeret ligger stadig aldrig i en
--      view, et select * eller et kort-payload. Udloggede, soegemaskiner og
--      robotter kan ikke naa RPC'en (execute kun til authenticated).
--
-- Det holder sitets loefte ("telefon og e-mail vises aldrig offentligt")
-- sandt, og goer samtidig "indloggede koebere kan ringe" muligt.

alter table public.profiles
  add column if not exists vis_telefon boolean not null default false;

-- Kolonne-grant'en fra 006 gen-skrives med vis_telefon som eneste tilfoejelse.
revoke update on public.profiles from anon;
revoke update on public.profiles from authenticated;
grant update (name, phone, city, is_dealer, company, cvr, vis_telefon)
  on public.profiles to authenticated;

create or replace function public.hent_saelger_telefon(p_listing uuid)
returns text
language plpgsql
security definer
set search_path = public
as $fn$
declare
  nummer text;
begin
  -- Kun indloggede. RLS gaelder ikke i en definer-funktion, saa gaten
  -- skrives eksplicit.
  if auth.uid() is null then
    return null;
  end if;
  select nullif(trim(p.phone), '') into nummer
  from public.listings l
  join public.profiles p on p.id = l.seller_id
  where l.id = p_listing
    and l.status = 'active'
    and p.vis_telefon = true;
  return nummer;
end $fn$;

revoke execute on function public.hent_saelger_telefon(uuid) from public, anon;
grant execute on function public.hent_saelger_telefon(uuid) to authenticated;
