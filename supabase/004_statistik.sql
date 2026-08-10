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
-- Kør i Supabase Dashboard → SQL Editor.
-- ============================================================

create table if not exists public.listing_stats (
  listing_id uuid not null references public.listings(id) on delete cascade,
  day        date not null default current_date,
  views      int  not null default 0,
  contacts   int  not null default 0,
  primary key (listing_id, day)
);

alter table public.listing_stats enable row level security;

-- Kun annoncens ejer må se sine egne tal. Der findes bevidst ingen
-- insert/update-politik: al skrivning går gennem funktionen nedenfor, så en
-- klient ikke kan sætte vilkårlige tal ind.
drop policy if exists "statistik: kun egen annonce" on public.listing_stats;
create policy "statistik: kun egen annonce" on public.listing_stats
  for select to authenticated using (
    exists (select 1 from public.listings l
            where l.id = listing_id and l.seller_id = auth.uid())
  );

-- Registrerer en visning eller en kontaktafsløring.
-- security definer, så også anonyme besøgende kan tælle med — men
-- funktionen accepterer kun de to kendte hændelsestyper.
create or replace function public.record_listing_event(p_listing uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_kind not in ('view', 'contact') then
    raise exception 'Ukendt hændelsestype: %', p_kind;
  end if;

  -- Tæl kun aktive annoncer, og aldrig sælgerens egne besøg på sin annonce.
  if not exists (
    select 1 from public.listings
    where id = p_listing
      and status = 'active'
      and (auth.uid() is null or seller_id <> auth.uid())
  ) then
    return;
  end if;

  insert into public.listing_stats (listing_id, day, views, contacts)
  values (
    p_listing, current_date,
    case when p_kind = 'view'    then 1 else 0 end,
    case when p_kind = 'contact' then 1 else 0 end
  )
  -- Måltabellen refereres UKVALIFICERET her. "public.listing_stats.views"
  -- læser Postgres som en FROM-reference, der ikke findes, og så fejler
  -- hele create function.
  on conflict (listing_id, day) do update set
    views    = listing_stats.views    + excluded.views,
    contacts = listing_stats.contacts + excluded.contacts;
end $$;

grant execute on function public.record_listing_event(uuid, text) to anon, authenticated;

-- Hvor mange har gemt hver af mine annoncer?
-- favorites-politikken lader kun brugeren se sine EGNE favoritter, så en
-- sælger kan ikke tælle dem selv. Denne funktion giver kun totaler ud —
-- aldrig hvem der har gemt hvad.
create or replace function public.my_listing_saves()
returns table(listing_id uuid, saves bigint)
language sql
security definer
set search_path = public
as $$
  select f.listing_id, count(*)::bigint
  from public.favorites f
  join public.listings l on l.id = f.listing_id
  where l.seller_id = auth.uid()
  group by f.listing_id;
$$;

grant execute on function public.my_listing_saves() to authenticated;

-- Dashboardet henter 30 dage ad gangen for alle brugerens annoncer.
create index if not exists listing_stats_day_idx
  on public.listing_stats (listing_id, day desc);
