-- Bikerbasen migration 025: beskeder mellem koeber og saelger (V7, KILDEFIL).
-- Koer i Supabase SQL Editor (helst foerst paa et staging-projekt / en branch).
-- Kan koeres igen uden skade. Ren ASCII.
--
-- DEN HER FIL ER IKKE KOERT MOD PRODUKTION. Aktivering er et ejerskridt:
-- se docs/review/gauntlet/v7/besked.md ("Aktiveringsguide"). Frontenden ligger
-- bag flaget BB_FLAGS.beskeder i js/supabase-config.js (default FRA), saa det
-- er ufarligt at koere migrationen foer flaget saettes.
--
-- BAGGRUND. En tidligere kontaktformular blev FJERNET (F2-006, w5), fordi den
-- indsamlede navn, e-mail og telefon til en besked, der aldrig blev leveret.
-- Nu bygges den rigtigt: en besked bliver gemt, saelgeren faar en notifikation,
-- og begge parter kan se traaden i Mine annoncer -> Beskeder.
--
-- MODELLEN, kort:
--   * public.samtaler   en traad pr. (annonce, koeber). Kun EGNE annoncer
--                       (public.listings) - indekserede annoncer
--                       (eksterne_annoncer) har aldrig en kontaktflade.
--   * public.beskeder   beskederne i en traad (1-1000 tegn).
--   * public.besked_blokeringer   "jeg vil ikke have flere beskeder fra X".
--   * public.besked_indstillinger kun valget "send mig mail ved ny besked".
--   * ALLE skrivninger gaar gennem security definer-funktioner herunder.
--     Klientroller faar INGEN insert/update/delete paa tabellerne - og kun
--     SELECT paa samtaler/beskeder via RLS (deltagerne, ingen andre).
--   * Ingen funktion eller tabel udstiller en afsenders e-mail eller telefon
--     til modparten. Modparten faar kun profilnavnet (som er offentligt i
--     forvejen) og det, afsenderen selv skriver i teksten.
--   * Rate limit sker I DATABASEN (taelling paa beskeder-tabellen), ikke kun i
--     browseren: se send_besked / svar_besked.
--   * Notifikation: trigger -> pg_net -> Edge Function besked-notifikation
--     (samme moenster som 013_soegeagenter.sql). Mailen indeholder ALDRIG
--     beskedteksten (ingen brugerindhold i mail fra vores domaene).
--
-- FOER DU KOERER DEN:
--   1. Kraever schema.sql (profiles, listings). 013 kraeves for pg_net-moenstret,
--      men 025 opretter selv extension'en, hvis den mangler.
--   2. Saet <<PROJEKT_URL>> og <<HEMMELIGHED>> i funktionen besked_notifikation()
--      (samme vaerdier som i 013). Foer de er sat, sender databasen INTET kald
--      (vagten i funktionen) - beskeder virker, men der gaar ingen mail.
--   3. Deploy Edge Function besked-notifikation og saet secrets
--      (RESEND_API_KEY, NOTIFY_SECRET, SITE_URL) - se doku.

create extension if not exists pg_net;

-- ---------- 1. Tabeller ----------

create table if not exists public.samtaler (
  id                     uuid primary key default gen_random_uuid(),
  -- listing_id bliver NULL, hvis annoncen slettes: traaden skal kunne laeses
  -- bagefter (laast, med aerlig tekst), ikke forsvinde under modpartens fod.
  listing_id             uuid references public.listings(id) on delete set null,
  -- Snapshot af annoncens titel, saa en slettet annonce stadig har et navn.
  annonce_titel          text not null,
  seller_id              uuid not null references public.profiles(id) on delete cascade,
  buyer_id               uuid not null references public.profiles(id) on delete cascade,
  created_at             timestamptz not null default now(),
  last_message_at        timestamptz not null default now(),
  last_sender_id         uuid references public.profiles(id) on delete set null,
  seller_last_read_at    timestamptz,
  buyer_last_read_at     timestamptz,
  -- Throttle til notifikationsmail: hoejst en mail pr. modtager pr. traad pr. 30 min.
  seller_notificeret_at  timestamptz,
  buyer_notificeret_at   timestamptz,
  constraint samtaler_ikke_dig_selv check (seller_id <> buyer_id),
  constraint samtaler_titel_laengde check (char_length(annonce_titel) between 1 and 160),
  -- En traad pr. annonce pr. koeber (NULL i listing_id regnes som forskellige).
  constraint samtaler_en_pr_koeber unique (listing_id, buyer_id)
);

create index if not exists samtaler_saelger_idx on public.samtaler (seller_id, last_message_at desc);
create index if not exists samtaler_koeber_idx  on public.samtaler (buyer_id, last_message_at desc);
create index if not exists samtaler_oprettet_idx on public.samtaler (buyer_id, created_at desc);

create table if not exists public.beskeder (
  id          uuid primary key default gen_random_uuid(),
  samtale_id  uuid not null references public.samtaler(id) on delete cascade,
  afsender_id uuid not null references public.profiles(id) on delete cascade,
  tekst       text not null,
  created_at  timestamptz not null default now(),
  constraint beskeder_tekst_laengde check (char_length(tekst) between 2 and 1000)
);

create index if not exists beskeder_samtale_idx  on public.beskeder (samtale_id, created_at);
create index if not exists beskeder_afsender_idx on public.beskeder (afsender_id, created_at desc);

create table if not exists public.besked_blokeringer (
  blokerer_id uuid not null references public.profiles(id) on delete cascade,
  blokeret_id uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (blokerer_id, blokeret_id),
  constraint besked_blokering_ikke_dig_selv check (blokerer_id <> blokeret_id)
);

create table if not exists public.besked_indstillinger (
  user_id            uuid primary key references public.profiles(id) on delete cascade,
  mail_ved_ny_besked boolean not null default true,
  updated_at         timestamptz not null default now()
);

-- ---------- 2. Row Level Security ----------
-- Alle fire tabeller har RLS. Kun to har en politik, og begge er SELECT for
-- deltagerne. Ingen politik giver bred laeseadgang; ingen giver skriveadgang.

alter table public.samtaler            enable row level security;
alter table public.beskeder            enable row level security;
alter table public.besked_blokeringer  enable row level security;   -- ingen politik: kun definer-funktioner
alter table public.besked_indstillinger enable row level security;  -- ingen politik: kun definer-funktioner

drop policy if exists "samtale: deltagere laeser" on public.samtaler;
create policy "samtale: deltagere laeser" on public.samtaler
  for select to authenticated
  using ((select auth.uid()) = seller_id or (select auth.uid()) = buyer_id);

drop policy if exists "besked: deltagere laeser" on public.beskeder;
create policy "besked: deltagere laeser" on public.beskeder
  for select to authenticated
  using (exists (
    select 1 from public.samtaler s
    where s.id = beskeder.samtale_id
      and ((select auth.uid()) = s.seller_id or (select auth.uid()) = s.buyer_id)
  ));

-- Grant-gulv (samme princip som 021/024): Supabase giver som standard alle
-- roller alt paa nye tabeller. Det fjernes her; kun SELECT gives tilbage, og
-- kun paa de to tabeller, hvor RLS siger hvem der maa se hvad.
revoke all on public.samtaler, public.beskeder, public.besked_blokeringer, public.besked_indstillinger
  from public, anon, authenticated;
grant select on public.samtaler, public.beskeder to authenticated;

-- ---------- 3. Hjaelpefunktioner (rene, ingen adgang udefra) ----------

create or replace function public.bb_rens_besked(p_tekst text)
returns text
language sql
immutable
set search_path = ''
as $fn$
  select btrim(
    regexp_replace(
      replace(replace(coalesce(p_tekst, ''), chr(13) || chr(10), chr(10)), chr(13), chr(10)),
      chr(10) || '{3,}', chr(10) || chr(10), 'g')
  );
$fn$;

create or replace function public.bb_antal_links(p_tekst text)
returns int
language sql
immutable
set search_path = ''
as $fn$
  select (
    (char_length(lower(coalesce(p_tekst, ''))) - char_length(replace(lower(coalesce(p_tekst, '')), 'http', ''))) / 4
    + (char_length(lower(coalesce(p_tekst, ''))) - char_length(replace(lower(coalesce(p_tekst, '')), 'www.', ''))) / 4
  )::int;
$fn$;

revoke execute on function public.bb_rens_besked(text) from public, anon, authenticated;
revoke execute on function public.bb_antal_links(text) from public, anon, authenticated;

-- ---------- 4. send_besked: foerste besked til en saelger ----------
-- Svarer ALTID jsonb { ok: true, samtale_id } eller { ok: false, kode }.
-- Forventede afvisninger er ikke fejl (HTTP 200), saa frontenden kan skrive
-- en praecis, dansk tekst pr. kode. Koder:
--   ikke_logget_ind, ikke_verificeret, ugyldig_tekst, for_mange_links,
--   annonce_findes_ikke, annonce_ikke_aktiv, egen_annonce, blokeret,
--   for_mange (timegraense), for_mange_pr_annonce, for_mange_samtaler, dublet
-- Honeypot: er p_honning udfyldt, svares ok UDEN at gemme noget (en bot faar
-- ikke at vide, at den blev opdaget).

create or replace function public.send_besked(p_listing uuid, p_tekst text, p_honning text default '')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_uid   uuid := auth.uid();
  v_tekst text;
  v_l     record;
  v_sam   uuid;
  v_titel text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'kode', 'ikke_logget_ind');
  end if;

  if coalesce(btrim(p_honning), '') <> '' then
    return jsonb_build_object('ok', true);
  end if;

  if not exists (select 1 from auth.users u where u.id = v_uid and u.email_confirmed_at is not null) then
    return jsonb_build_object('ok', false, 'kode', 'ikke_verificeret');
  end if;

  v_tekst := public.bb_rens_besked(p_tekst);
  if char_length(v_tekst) < 2 or char_length(v_tekst) > 1000 then
    return jsonb_build_object('ok', false, 'kode', 'ugyldig_tekst');
  end if;
  if public.bb_antal_links(v_tekst) > 2 then
    return jsonb_build_object('ok', false, 'kode', 'for_mange_links');
  end if;

  select l.id, l.seller_id, l.brand, l.model, l.year, l.status
    into v_l
  from public.listings l
  where l.id = p_listing;
  if not found then
    return jsonb_build_object('ok', false, 'kode', 'annonce_findes_ikke');
  end if;
  if v_l.status <> 'active' then
    return jsonb_build_object('ok', false, 'kode', 'annonce_ikke_aktiv');
  end if;
  if v_l.seller_id = v_uid then
    return jsonb_build_object('ok', false, 'kode', 'egen_annonce');
  end if;

  if exists (
    select 1 from public.besked_blokeringer b
    where (b.blokerer_id = v_l.seller_id and b.blokeret_id = v_uid)
       or (b.blokerer_id = v_uid and b.blokeret_id = v_l.seller_id)
  ) then
    return jsonb_build_object('ok', false, 'kode', 'blokeret');
  end if;

  -- Rate limit i databasen. Taeller paa beskeder-tabellen selv, saa der ikke
  -- findes et hjaelpebord, der kan komme ud af trit.
  if (select count(*) from public.beskeder m
      where m.afsender_id = v_uid and m.created_at > now() - interval '1 hour') >= 20
     or (select count(*) from public.beskeder m
         where m.afsender_id = v_uid and m.created_at > now() - interval '24 hours') >= 100 then
    return jsonb_build_object('ok', false, 'kode', 'for_mange');
  end if;
  if (select count(*) from public.beskeder m
      join public.samtaler s on s.id = m.samtale_id
      where m.afsender_id = v_uid and s.listing_id = p_listing
        and m.created_at > now() - interval '1 hour') >= 5 then
    return jsonb_build_object('ok', false, 'kode', 'for_mange_pr_annonce');
  end if;

  select s.id into v_sam from public.samtaler s
  where s.listing_id = p_listing and s.buyer_id = v_uid;

  if v_sam is null then
    -- Hoejst 10 NYE traade pr. koeber pr. doegn: en spammer, der skriver til
    -- mange forskellige saelgere, rammer loftet her, ikke hos den enkelte.
    if (select count(*) from public.samtaler s
        where s.buyer_id = v_uid and s.created_at > now() - interval '24 hours') >= 10 then
      return jsonb_build_object('ok', false, 'kode', 'for_mange_samtaler');
    end if;
    v_titel := left(btrim(
      coalesce(v_l.brand, '') || ' ' || coalesce(v_l.model, '')
      || case when v_l.year is not null then ' (' || v_l.year::text || ')' else '' end), 160);
    if char_length(v_titel) < 1 then v_titel := 'Annonce'; end if;
    insert into public.samtaler (listing_id, annonce_titel, seller_id, buyer_id)
    values (p_listing, v_titel, v_l.seller_id, v_uid)
    on conflict (listing_id, buyer_id) do nothing
    returning id into v_sam;
    if v_sam is null then
      select s.id into v_sam from public.samtaler s
      where s.listing_id = p_listing and s.buyer_id = v_uid;
    end if;
  else
    if exists (select 1 from public.beskeder m
               where m.samtale_id = v_sam and m.afsender_id = v_uid and m.tekst = v_tekst
                 and m.created_at > now() - interval '10 minutes') then
      return jsonb_build_object('ok', false, 'kode', 'dublet');
    end if;
  end if;

  insert into public.beskeder (samtale_id, afsender_id, tekst)
  values (v_sam, v_uid, v_tekst);

  update public.samtaler
     set last_message_at = now(), last_sender_id = v_uid, buyer_last_read_at = now()
   where id = v_sam;

  return jsonb_build_object('ok', true, 'samtale_id', v_sam);
end
$fn$;

-- ---------- 5. svar_besked: svar i en eksisterende traad (begge veje) ----------

create or replace function public.svar_besked(p_samtale uuid, p_tekst text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_uid    uuid := auth.uid();
  v_tekst  text;
  v_s      record;
  v_status text;
  v_modpart uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'kode', 'ikke_logget_ind');
  end if;

  -- Deltagertjek foerst, og uden at afsloere, om traaden findes for andre.
  select s.id, s.listing_id, s.seller_id, s.buyer_id into v_s
  from public.samtaler s
  where s.id = p_samtale and (s.seller_id = v_uid or s.buyer_id = v_uid);
  if not found then
    return jsonb_build_object('ok', false, 'kode', 'findes_ikke');
  end if;

  if not exists (select 1 from auth.users u where u.id = v_uid and u.email_confirmed_at is not null) then
    return jsonb_build_object('ok', false, 'kode', 'ikke_verificeret');
  end if;

  v_tekst := public.bb_rens_besked(p_tekst);
  if char_length(v_tekst) < 2 or char_length(v_tekst) > 1000 then
    return jsonb_build_object('ok', false, 'kode', 'ugyldig_tekst');
  end if;
  if public.bb_antal_links(v_tekst) > 2 then
    return jsonb_build_object('ok', false, 'kode', 'for_mange_links');
  end if;

  -- Annoncen skal stadig vaere aktiv (slettet = listing_id er NULL).
  if v_s.listing_id is not null then
    select l.status into v_status from public.listings l where l.id = v_s.listing_id;
  end if;
  if v_status is distinct from 'active' then
    return jsonb_build_object('ok', false, 'kode', 'annonce_ikke_aktiv');
  end if;

  v_modpart := case when v_uid = v_s.seller_id then v_s.buyer_id else v_s.seller_id end;
  if exists (
    select 1 from public.besked_blokeringer b
    where (b.blokerer_id = v_modpart and b.blokeret_id = v_uid)
       or (b.blokerer_id = v_uid and b.blokeret_id = v_modpart)
  ) then
    return jsonb_build_object('ok', false, 'kode', 'blokeret');
  end if;

  if (select count(*) from public.beskeder m
      where m.afsender_id = v_uid and m.created_at > now() - interval '1 hour') >= 30
     or (select count(*) from public.beskeder m
         where m.afsender_id = v_uid and m.created_at > now() - interval '24 hours') >= 150 then
    return jsonb_build_object('ok', false, 'kode', 'for_mange');
  end if;
  if (select count(*) from public.beskeder m
      where m.samtale_id = p_samtale and m.afsender_id = v_uid
        and m.created_at > now() - interval '1 hour') >= 20 then
    return jsonb_build_object('ok', false, 'kode', 'for_mange_pr_annonce');
  end if;

  if exists (select 1 from public.beskeder m
             where m.samtale_id = p_samtale and m.afsender_id = v_uid and m.tekst = v_tekst
               and m.created_at > now() - interval '10 minutes') then
    return jsonb_build_object('ok', false, 'kode', 'dublet');
  end if;

  insert into public.beskeder (samtale_id, afsender_id, tekst)
  values (p_samtale, v_uid, v_tekst);

  update public.samtaler
     set last_message_at = now(),
         last_sender_id = v_uid,
         seller_last_read_at = case when v_uid = seller_id then now() else seller_last_read_at end,
         buyer_last_read_at  = case when v_uid = buyer_id  then now() else buyer_last_read_at  end
   where id = p_samtale;

  return jsonb_build_object('ok', true, 'samtale_id', p_samtale);
end
$fn$;

-- ---------- 6. Indbakke, traad og taeller ----------

-- Indbakken: mine traade, nyeste foerst (maks. 100). Navnet er modpartens
-- PROFILNAVN (offentligt i forvejen) - aldrig e-mail eller telefon.
-- annonce_status: 'active' | 'sold' | 'hidden' | 'slettet'.
create or replace function public.mine_samtaler()
returns table (
  samtale_id       uuid,
  listing_id       uuid,
  annonce_titel    text,
  annonce_status   text,
  rolle            text,
  modpart_navn     text,
  sidste_tekst     text,
  sidste_fra_mig   boolean,
  sidste_tidspunkt timestamptz,
  ulaest           boolean,
  blokeret         boolean
)
language sql
stable
security definer
set search_path = ''
as $fn$
  select
    s.id,
    s.listing_id,
    s.annonce_titel,
    case when s.listing_id is null then 'slettet' else coalesce(l.status, 'slettet') end,
    case when s.seller_id = (select auth.uid()) then 'saelger' else 'koeber' end,
    nullif(btrim(p.name), ''),
    (select left(b.tekst, 140) from public.beskeder b where b.samtale_id = s.id order by b.created_at desc limit 1),
    s.last_sender_id is not distinct from (select auth.uid()),
    s.last_message_at,
    (s.last_sender_id is not null
      and s.last_sender_id is distinct from (select auth.uid())
      and (case when s.seller_id = (select auth.uid()) then s.seller_last_read_at else s.buyer_last_read_at end) is null)
    or (s.last_sender_id is not null
      and s.last_sender_id is distinct from (select auth.uid())
      and (case when s.seller_id = (select auth.uid()) then s.seller_last_read_at else s.buyer_last_read_at end) < s.last_message_at),
    exists (
      select 1 from public.besked_blokeringer bl
      where (bl.blokerer_id = (select auth.uid()) and bl.blokeret_id = case when s.seller_id = (select auth.uid()) then s.buyer_id else s.seller_id end)
         or (bl.blokeret_id = (select auth.uid()) and bl.blokerer_id = case when s.seller_id = (select auth.uid()) then s.buyer_id else s.seller_id end)
    )
  from public.samtaler s
  left join public.listings l on l.id = s.listing_id
  left join public.profiles p on p.id = case when s.seller_id = (select auth.uid()) then s.buyer_id else s.seller_id end
  where (select auth.uid()) is not null
    and (s.seller_id = (select auth.uid()) or s.buyer_id = (select auth.uid()))
  order by s.last_message_at desc
  limit 100;
$fn$;

-- En traad med beskeder (de seneste 200). Aabning markerer traaden laest for
-- kalderen (p_marker_laest = false lader den staa ulaest, fx ved genhentning).
create or replace function public.hent_samtale(p_samtale uuid, p_marker_laest boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_uid     uuid := auth.uid();
  v_s       record;
  v_status  text;
  v_navn    text;
  v_modpart uuid;
  v_blok    boolean;
  v_beskeder jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'kode', 'ikke_logget_ind');
  end if;

  select s.* into v_s from public.samtaler s
  where s.id = p_samtale and (s.seller_id = v_uid or s.buyer_id = v_uid);
  if not found then
    return jsonb_build_object('ok', false, 'kode', 'findes_ikke');
  end if;

  if v_s.listing_id is null then
    v_status := 'slettet';
  else
    select coalesce(l.status, 'slettet') into v_status from public.listings l where l.id = v_s.listing_id;
    v_status := coalesce(v_status, 'slettet');
  end if;

  v_modpart := case when v_uid = v_s.seller_id then v_s.buyer_id else v_s.seller_id end;
  select nullif(btrim(p.name), '') into v_navn from public.profiles p where p.id = v_modpart;
  select exists (
    select 1 from public.besked_blokeringer b
    where (b.blokerer_id = v_uid and b.blokeret_id = v_modpart)
       or (b.blokerer_id = v_modpart and b.blokeret_id = v_uid)
  ) into v_blok;
  -- Hvem har blokeret? Kun kalderen faar at vide, om det er kalderen selv
  -- (saa "Fortryd blokering" kun vises hos den, der blokerede).
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', m.id, 'fra_mig', m.afsender_id = v_uid, 'tekst', m.tekst, 'oprettet', m.created_at)
           order by m.created_at), '[]'::jsonb)
    into v_beskeder
  from (select b.* from public.beskeder b where b.samtale_id = p_samtale
        order by b.created_at desc limit 200) m;

  if p_marker_laest then
    update public.samtaler
       set seller_last_read_at = case when v_uid = seller_id then now() else seller_last_read_at end,
           buyer_last_read_at  = case when v_uid = buyer_id  then now() else buyer_last_read_at  end
     where id = p_samtale;
  end if;

  return jsonb_build_object(
    'ok', true,
    'samtale', jsonb_build_object(
      'samtale_id', v_s.id,
      'listing_id', v_s.listing_id,
      'annonce_titel', v_s.annonce_titel,
      'annonce_status', v_status,
      'rolle', case when v_uid = v_s.seller_id then 'saelger' else 'koeber' end,
      'modpart_navn', v_navn,
      'blokeret', v_blok,
      'jeg_har_blokeret', exists (select 1 from public.besked_blokeringer b where b.blokerer_id = v_uid and b.blokeret_id = v_modpart)
    ),
    'beskeder', v_beskeder
  );
end
$fn$;

-- Antal traade, hvor den sidste besked er fra modparten og ikke laest endnu
-- (badge i headeren og paa fanen).
create or replace function public.ulaeste_samtaler()
returns int
language sql
stable
security definer
set search_path = ''
as $fn$
  select count(*)::int
  from public.samtaler s
  where (select auth.uid()) is not null
    and (s.seller_id = (select auth.uid()) or s.buyer_id = (select auth.uid()))
    and s.last_sender_id is not null
    and s.last_sender_id is distinct from (select auth.uid())
    and (
      (case when s.seller_id = (select auth.uid()) then s.seller_last_read_at else s.buyer_last_read_at end) is null
      or (case when s.seller_id = (select auth.uid()) then s.seller_last_read_at else s.buyer_last_read_at end) < s.last_message_at
    );
$fn$;

-- ---------- 7. Bloker / rapporter / mailvalg ----------

create or replace function public.bloker_modpart(p_samtale uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_uid uuid := auth.uid();
  v_s   record;
  v_modpart uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'kode', 'ikke_logget_ind');
  end if;
  select s.seller_id, s.buyer_id into v_s from public.samtaler s
  where s.id = p_samtale and (s.seller_id = v_uid or s.buyer_id = v_uid);
  if not found then
    return jsonb_build_object('ok', false, 'kode', 'findes_ikke');
  end if;
  v_modpart := case when v_uid = v_s.seller_id then v_s.buyer_id else v_s.seller_id end;
  insert into public.besked_blokeringer (blokerer_id, blokeret_id)
  values (v_uid, v_modpart)
  on conflict do nothing;
  return jsonb_build_object('ok', true);
end
$fn$;

create or replace function public.fjern_blokering(p_samtale uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_uid uuid := auth.uid();
  v_s   record;
  v_modpart uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'kode', 'ikke_logget_ind');
  end if;
  select s.seller_id, s.buyer_id into v_s from public.samtaler s
  where s.id = p_samtale and (s.seller_id = v_uid or s.buyer_id = v_uid);
  if not found then
    return jsonb_build_object('ok', false, 'kode', 'findes_ikke');
  end if;
  v_modpart := case when v_uid = v_s.seller_id then v_s.buyer_id else v_s.seller_id end;
  delete from public.besked_blokeringer where blokerer_id = v_uid and blokeret_id = v_modpart;
  return jsonb_build_object('ok', true);
end
$fn$;

-- Indberetning af en traad genbruger den eksisterende DSA-kanal (public.reports,
-- target_type 'profile' = modpartens profil). Kommentaren faar traadens id, saa
-- den, der behandler indberetningen, kan finde beskederne (service_role).
create or replace function public.rapporter_samtale(p_samtale uuid, p_aarsag text, p_kommentar text default '')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_uid uuid := auth.uid();
  v_s   record;
  v_modpart uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'kode', 'ikke_logget_ind');
  end if;
  if p_aarsag is null or p_aarsag not in ('svindel', 'upassende', 'andet') then
    return jsonb_build_object('ok', false, 'kode', 'ugyldig_aarsag');
  end if;
  select s.seller_id, s.buyer_id into v_s from public.samtaler s
  where s.id = p_samtale and (s.seller_id = v_uid or s.buyer_id = v_uid);
  if not found then
    return jsonb_build_object('ok', false, 'kode', 'findes_ikke');
  end if;
  -- Hoejst 10 indberetninger pr. bruger pr. doegn (samme loft som 'indberet').
  if (select count(*) from public.reports r
      where r.reporter_id = v_uid and r.created_at > now() - interval '24 hours') >= 10 then
    return jsonb_build_object('ok', false, 'kode', 'for_mange');
  end if;
  v_modpart := case when v_uid = v_s.seller_id then v_s.buyer_id else v_s.seller_id end;
  insert into public.reports (reporter_id, target_type, target_id, reason, comment)
  values (v_uid, 'profile', v_modpart::text, p_aarsag,
          left('Besked-traad ' || p_samtale::text || '. ' || coalesce(btrim(p_kommentar), ''), 2000));
  return jsonb_build_object('ok', true);
end
$fn$;

create or replace function public.hent_besked_mail()
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select coalesce(
    (select i.mail_ved_ny_besked from public.besked_indstillinger i where i.user_id = (select auth.uid())),
    true)
  where (select auth.uid()) is not null;
$fn$;

create or replace function public.saet_besked_mail(p_til boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $fn$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return false; end if;
  insert into public.besked_indstillinger (user_id, mail_ved_ny_besked, updated_at)
  values (v_uid, coalesce(p_til, true), now())
  on conflict (user_id) do update set mail_ved_ny_besked = excluded.mail_ved_ny_besked, updated_at = now();
  return true;
end
$fn$;

-- ---------- 8. Notifikation (trigger -> Edge Function) ----------
-- Kun naar der skal sendes en mail: hoejst en pr. modtager pr. traad pr. 30 min.
-- Mailen har aldrig beskedteksten; funktionen faar kun besked-id'et.
-- Vagt: er <<PROJEKT_URL>> / <<HEMMELIGHED>> ikke udskiftet, sker der intet
-- kald (og beskeden gemmes alligevel). Fejl i notifikationen maa aldrig vaelte
-- selve beskeden.

create or replace function public.besked_notifikation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_s    record;
  v_sidst timestamptz;
  v_url  text := '<<PROJEKT_URL>>';
  v_hem  text := '<<HEMMELIGHED>>';
begin
  select s.id, s.seller_id, s.buyer_id, s.seller_notificeret_at, s.buyer_notificeret_at
    into v_s
  from public.samtaler s where s.id = new.samtale_id;
  if not found then return new; end if;

  v_sidst := case when new.afsender_id = v_s.seller_id then v_s.buyer_notificeret_at else v_s.seller_notificeret_at end;
  if v_sidst is not null and v_sidst > now() - interval '30 minutes' then
    return new;
  end if;

  if v_url like '%<<%' or v_hem like '%<<%' then
    return new;   -- ikke aktiveret endnu
  end if;

  update public.samtaler
     set buyer_notificeret_at  = case when new.afsender_id = seller_id then now() else buyer_notificeret_at end,
         seller_notificeret_at = case when new.afsender_id = buyer_id  then now() else seller_notificeret_at end
   where id = new.samtale_id;

  begin
    perform net.http_post(
      url := v_url || '/functions/v1/besked-notifikation',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-bb-secret', v_hem),
      body := jsonb_build_object('besked_id', new.id)
    );
  exception when others then
    null;   -- notifikationen er en hjaelp, ikke en del af beskeden
  end;
  return new;
end
$fn$;

revoke execute on function public.besked_notifikation() from public, anon, authenticated;

drop trigger if exists on_besked_oprettet on public.beskeder;
create trigger on_besked_oprettet after insert on public.beskeder
  for each row execute function public.besked_notifikation();

-- ---------- 9. Opbevaring: ryd gamle traade ----------
-- Privatlivsforslag: traade slettes 24 maaneder efter sidste besked. Funktionen
-- koeres IKKE automatisk - planlaeg den (pg_cron eller Supabase Scheduled
-- Functions), naar privatlivspolitikken er opdateret med opbevaringstiden.
create or replace function public.ryd_gamle_samtaler()
returns int
language plpgsql
security definer
set search_path = ''
as $fn$
declare n int;
begin
  delete from public.samtaler where last_message_at < now() - interval '24 months';
  get diagnostics n = row_count;
  return n;
end
$fn$;

revoke execute on function public.ryd_gamle_samtaler() from public, anon, authenticated;

-- ---------- 10. Rettigheder paa funktionerne ----------
-- Kun indloggede kan kalde dem; udloggede og robotter kan intet.
do $$
declare f text;
begin
  foreach f in array array[
    'public.send_besked(uuid, text, text)',
    'public.svar_besked(uuid, text)',
    'public.mine_samtaler()',
    'public.hent_samtale(uuid, boolean)',
    'public.ulaeste_samtaler()',
    'public.bloker_modpart(uuid)',
    'public.fjern_blokering(uuid)',
    'public.rapporter_samtale(uuid, text, text)',
    'public.hent_besked_mail()',
    'public.saet_besked_mail(boolean)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

-- Tjek bagefter (som den, der har service_role):
--   select count(*) from public.samtaler;
--   select has_function_privilege('anon', 'public.send_besked(uuid,text,text)', 'execute');        -- false
--   select has_function_privilege('authenticated', 'public.send_besked(uuid,text,text)', 'execute'); -- true
--   select has_table_privilege('authenticated', 'public.beskeder', 'insert');                       -- false
