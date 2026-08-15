-- 013: soegeagenter der rent faktisk sender mail
-- ---------------------------------------------------------------
-- Foer denne migration var soegeagenten tom hele vejen ned: knappen skrev
-- til localStorage, tabellen saved_searches (fra 002) blev aldrig skrevet
-- til, metoderne i js/supabase-api.js blev aldrig kaldt, og der fandtes
-- intet job der sendte noget som helst. Teksten "Vil du have besked, naar
-- der kommer en?" var altsaa et loefte uden daekning.
--
-- Nu: naar en annonce bliver aktiv, kalder databasen Edge Function'en
-- notify-saved-searches, som finder de gemte soegninger der matcher og
-- sender mail via Resend.
--
-- FOER DU KOERER DEN:
--   1. saet <<HEMMELIGHED>> herunder til en lang tilfaeldig streng
--   2. samme streng skal ligge som secret NOTIFY_SECRET paa funktionen
--   3. saet <<PROJEKT_URL>> til https://<projekt-ref>.supabase.co

create extension if not exists pg_net;

-- ---------- Afmeldingstoken ----------
-- Enhver mail af den her slags skal kunne afmeldes uden login. Token'et er
-- pr. soegeagent, saa et laekket link kun kan slaa den ene fra.
alter table public.saved_searches
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid();

-- ---------- Hvem har faaet hvad ----------
-- Uden den her ville en genudgivet annonce, et gensendt kald eller et
-- gentaget forsoeg sende samme motorcykel til samme person igen.
create table if not exists public.search_notifications (
  saved_search_id uuid not null references public.saved_searches(id) on delete cascade,
  listing_id      uuid not null references public.listings(id) on delete cascade,
  sent_at         timestamptz not null default now(),
  primary key (saved_search_id, listing_id)
);

alter table public.search_notifications enable row level security;
-- Ingen politik: kun service_role (som gaar uden om RLS) roerer denne tabel.

-- ---------- Afmeld uden login ----------
-- security definer, saa en anonym med et gyldigt token kan slaa sin egen
-- agent fra. Token'et er det eneste, der giver adgang — og kun til den ene
-- raekke.
create or replace function public.unsubscribe_saved_search(p_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare fundet int;
begin
  update public.saved_searches set notify = false
  where unsubscribe_token = p_token and notify = true;
  get diagnostics fundet = row_count;
  return fundet > 0;
end;
$$;

grant execute on function public.unsubscribe_saved_search(uuid) to anon, authenticated;

-- ---------- Fyr af naar en annonce bliver aktiv ----------
create or replace function public.notify_saved_searches()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Kun aktive annoncer, og kun naar de BLIVER aktive — ikke ved hver
  -- efterfoelgende redigering af en annonce der allerede var aktiv.
  if new.status <> 'active' then return new; end if;
  if tg_op = 'UPDATE' and old.status = 'active' then return new; end if;

  perform net.http_post(
    url := '<<PROJEKT_URL>>/functions/v1/notify-saved-searches',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-bb-secret', '<<HEMMELIGHED>>'
    ),
    body := jsonb_build_object('listing_id', new.id)
  );
  return new;
end;
$$;

drop trigger if exists on_listing_active on public.listings;
create trigger on_listing_active after insert or update of status on public.listings
  for each row execute function public.notify_saved_searches();

-- Tjek bagefter:
--   select count(*) from public.saved_searches where notify;
--   select * from public.search_notifications order by sent_at desc limit 10;
