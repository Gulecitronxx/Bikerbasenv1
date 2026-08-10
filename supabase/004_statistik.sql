-- ============================================================
-- Bikerbasen — migration 004
-- Rigtige tal til forhandler-dashboardet.
--
-- Visninger og henvendelser var indtil nu opdigtede (seedet ud fra
-- annoncens id). De var ærligt mærket som demo i UI'et, men de målte
-- ingenting, og en forhandler kunne derfor ikke se hvilke annoncer der
-- faktisk virkede.
--
-- Vi gemmer dagstotaler pr. annonce — ikke én række pr. besøg. Der er
-- dermed ingen IP, ingen cookie og intet at koble tilbage til en person,
-- og tabellen vokser med højst én række pr. annonce pr. dag.
--
-- ------------------------------------------------------------
-- SÅDAN KØRES DEN
-- Supabase' SQL-editor kører hele arket som ÉN transaktion. Fejler ét
-- eneste udtryk, rulles alt tilbage — også tabellen — og man kan ikke se
-- hvor det gik galt.
--
-- Kør derfor DEL 1, 2 og 3 hver for sig: markér én del ad gangen og tryk
-- Run. Så står det med det samme hvilken del der eventuelt fejler.
-- Alle dele kan køres igen uden skade.
-- ------------------------------------------------------------


-- ============================================================
-- DEL 1 — tabel og adgang
-- ============================================================

create table if not exists public.listing_stats (
  listing_id uuid not null references public.listings(id) on delete cascade,
  stat_day   date not null default current_date,
  views      int  not null default 0,
  contacts   int  not null default 0,
  primary key (listing_id, stat_day)
);

alter table public.listing_stats enable row level security;

-- Kun annoncens ejer må se sine egne tal. Der findes bevidst ingen
-- insert/update-politik: al skrivning går gennem funktionen i DEL 2, så en
-- klient ikke kan sætte vilkårlige tal ind.
drop policy if exists "statistik: kun egen annonce" on public.listing_stats;
create policy "statistik: kun egen annonce" on public.listing_stats
  for select to authenticated using (
    exists (select 1 from public.listings l
            where l.id = listing_id and l.seller_id = auth.uid())
  );

-- Dashboardet henter 30 dage ad gangen for alle brugerens annoncer.
create index if not exists listing_stats_day_idx
  on public.listing_stats (listing_id, stat_day desc);


-- ============================================================
-- DEL 2 — funktion der registrerer en hændelse
-- ============================================================

-- security definer, så også anonyme besøgende kan tælle med — men
-- funktionen accepterer kun de to kendte hændelsestyper.
create or replace function public.record_listing_event(p_listing uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if p_kind not in ('view', 'contact') then
    raise exception 'Ukendt haendelsestype: %', p_kind;
  end if;

  -- Tael kun aktive annoncer, og aldrig saelgerens egne besoeg.
  if not exists (
    select 1 from public.listings
    where id = p_listing
      and status = 'active'
      and (auth.uid() is null or seller_id <> auth.uid())
  ) then
    return;
  end if;

  -- Maaltabellen refereres UKVALIFICERET i ON CONFLICT DO UPDATE.
  -- "public.listing_stats.views" laeser Postgres som en FROM-reference,
  -- der ikke findes i den kontekst, og saa fejler hele create function.
  insert into public.listing_stats as s (listing_id, stat_day, views, contacts)
  values (
    p_listing, current_date,
    case when p_kind = 'view'    then 1 else 0 end,
    case when p_kind = 'contact' then 1 else 0 end
  )
  on conflict (listing_id, stat_day) do update set
    views    = s.views    + excluded.views,
    contacts = s.contacts + excluded.contacts;
end;
$fn$;

grant execute on function public.record_listing_event(uuid, text) to anon, authenticated;


-- ============================================================
-- DEL 3 — hvor mange har gemt mine annoncer?
-- ============================================================

-- favorites-politikken lader kun brugeren se sine EGNE favoritter, saa en
-- saelger kan ikke taelle dem selv. Denne funktion giver kun totaler ud —
-- aldrig hvem der har gemt hvad.
--
-- Udgangskolonnen hedder listing med vilje, ikke listing_id: navne i
-- RETURNS TABLE bliver til parametre, og et navn der ogsaa er en rigtig
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
