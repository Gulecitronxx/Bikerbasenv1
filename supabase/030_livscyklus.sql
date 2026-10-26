-- 030: annoncens livscyklus — frisk, forsinket, midlertidigt utilgaengelig,
--      ikke laengere aktiv, udloebet
-- ---------------------------------------------------------------
-- STATUS: KILDEFIL. IKKE KOERT. Aktivering er et ejerskridt (se
-- docs/review/gauntlet/v7/data.md, "Aktivering"). Intet i sitet kraever den:
-- frontenden regner alder af sidst_set, som findes i forvejen, og crawleren
-- skriver kun til kolonnerne herunder, naar BB_LIVSCYKLUS=1 er sat.
--
-- Hvorfor: maalt mod produktionen 26.10.2026 var 332 af 735 indekserede
-- annoncer (45 %) sidst set for over 60 dage siden — de to forhandlere og en
-- del af Gul og Gratis/MC Syd blev ikke crawlet i oktober — men de stod som
-- 'aktiv', fordi markerBorte() i crawler/db.js kun kan saette 'borte' efter
-- tre kørsler. Soeges der ikke, rykker intet.
--
-- Reglen (crawler/livscyklus.js, spejlet her og i js/data.js):
--   * En annonce i kildens liste er "set": alle taellere nulstilles.
--   * Kun et BEKRAEFTET vaek-signal (HTTP 404/410 paa annoncens egen side, en
--     "solgt"-markoer, eller mangel i en KOMPLET koersel, hvis fund holdt
--     vaernet) taeller. N = 3 i traek, fordelt over mindst T = 7 dage -> 'borte'.
--   * Timeout, 5xx, netvaerksfejl, robots.txt-spaerring, en afbrudt eller
--     ufuldstaendig koersel er TEKNISKE: de taeller i teknisk_fejl_i_traek og
--     kan aldrig alene faa en annonce til at forsvinde.
--   * 90 dage uden en eneste bekraeftelse: status 'udloebet' (raekken slettes
--     ALDRIG; den bliver aktiv igen, naar kilden ses).

begin;

-- ---------- 1. Kolonner ----------
alter table public.eksterne_annoncer
  add column if not exists sidst_forsoegt        timestamptz,
  add column if not exists vaek_i_traek          smallint    not null default 0 check (vaek_i_traek >= 0),
  add column if not exists foerste_vaek_signal   timestamptz,
  add column if not exists teknisk_fejl_i_traek  smallint    not null default 0 check (teknisk_fejl_i_traek >= 0),
  add column if not exists sidste_signal         text
    check (sidste_signal in ('set','404','410','fjernet_markoer','ikke_i_liste',
                             'timeout','5xx','netvaerk','blokeret','robots','afbrudt',
                             'ufuldstaendig','vaern','udloebet'));

comment on column public.eksterne_annoncer.sidst_set is
  'Sidste gang crawleren SAA annoncen i kildens liste. Det eneste, der foerer annoncen tilbage til "bekraeftet".';
comment on column public.eksterne_annoncer.sidst_forsoegt is
  'Sidste gang crawleren forsoegte at tjekke annoncen, uanset udfald. Efter sidst_set = vi forsoegte, men kunne ikke bekraefte.';
comment on column public.eksterne_annoncer.vaek_i_traek is
  'Antal koersler i traek med et BEKRAEFTET vaek-signal. Nulstilles af et "set". Rores aldrig af en teknisk fejl.';
comment on column public.eksterne_annoncer.teknisk_fejl_i_traek is
  'Koersler i traek, hvor vi ikke kunne tjekke (timeout, 5xx, robots ...). Siger intet om annoncen.';

-- ---------- 2. Status: 'udloebet' ----------
alter table public.eksterne_annoncer drop constraint if exists eksterne_annoncer_status_check;
alter table public.eksterne_annoncer
  add constraint eksterne_annoncer_status_check check (status in ('aktiv','solgt','borte','udloebet'));

-- Offentlig laesning: som foer, men ogsaa 'udloebet' er skjult. 'solgt' er uaendret (bruges ikke af crawleren).
drop policy if exists "ekstern: offentlig laesning" on public.eksterne_annoncer;
create policy "ekstern: offentlig laesning" on public.eksterne_annoncer
  for select using (
    status not in ('borte','udloebet')
    and exists (select 1 from public.kilder k where k.id = kilde_id and k.aktiv)
  );

-- ---------- 3. Tilstanden som funktion ----------
-- Samme regel som vurderLivscyklus() i crawler/livscyklus.js og
-- livscyklusTilstand() i js/data.js. Taerskler: 14 / 90 dage.
create or replace function public.livscyklus_tilstand(
  p_status text, p_sidst_set timestamptz, p_vaek smallint, p_teknisk smallint,
  p_nu timestamptz default now()
) returns text language sql stable set search_path = public as $$
  select case
    when p_status = 'udloebet' then 'slettet_udloebet'
    when p_status in ('borte','solgt') then 'ikke_laengere_aktiv'
    when p_sidst_set is not null and p_nu - p_sidst_set > interval '90 days' then 'slettet_udloebet'
    when coalesce(p_vaek, 0) > 0 or coalesce(p_teknisk, 0) > 0 then 'midlertidigt_utilgaengelig'
    when p_sidst_set is not null and p_nu - p_sidst_set > interval '14 days' then 'aktiv_forsinket'
    else 'aktiv_bekraeftet'
  end;
$$;

-- ---------- 4. Intern oversigt (kun service_role / ejeren i dashboardet) ----------
create or replace view public.livscyklus_oversigt
with (security_invoker = on) as
  select k.domaene,
         public.livscyklus_tilstand(e.status, e.sidst_set, e.vaek_i_traek, e.teknisk_fejl_i_traek) as tilstand,
         count(*) as antal,
         min(e.sidst_set) as aeldste_sidst_set,
         max(e.sidst_set) as nyeste_sidst_set
    from public.eksterne_annoncer e
    join public.kilder k on k.id = e.kilde_id
   group by 1, 2;

-- FALDGRUBE (samme som 016/024): revoke eksplicit, grant select fjerner ikke default privileges.
revoke all on public.livscyklus_oversigt from anon, authenticated, public;

commit;

-- Tjek bagefter:
--   select * from public.livscyklus_oversigt order by domaene, tilstand;
--   -- Foerste koersel med BB_LIVSCYKLUS=1 skal give: ingen 'borte' der ikke var det i forvejen,
--   -- og 'midlertidigt_utilgaengelig' kun for annoncer ældre end 14 dage, naar en koersel fejlede teknisk.
