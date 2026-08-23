-- Bikerbasen migration 022: de to anonyme skrivekanaler faar en kant.
-- Koer i Supabase SQL Editor (eller scripts/backend-deploy.js). Ren ASCII.
-- Kan koeres igen uden skade.
--
-- BAGGRUND (audit 23.08.2026, C2 + DECISIONS.md C-004): to ting kunne en
-- udlogget skrive uden graense: INSERT i reports (indberetninger, med vilje
-- aaben — DSA) og RPC record_listing_event (visnings-/kontakttaelling).
-- C-004 afviste en rate limit I DATABASEN med tre gode grunde (ingen identitet
-- at taelle paa, en global taeller lukker kanalen for den aerlige, target_id
-- er fri tekst) og pegede paa KANTEN som det rigtige sted: der er afsenderens
-- IP observeret, ikke oplyst. Det er det, der sker nu:
--
--   browser  ->  Edge Function indberet / haendelse  ->  service_role  ->  db
--
-- Funktionerne (supabase/functions/indberet, supabase/functions/haendelse)
-- laeser IP'en fra gatewayens x-forwarded-for, hasher den med dagens salt
-- (ingen raa IP gemmes, og hashen kan ikke slaas op paa tvaers af dage) og
-- spoerger taelleren her, foer de skriver:
--   - haendelse: én visning pr. IP pr. annonce pr. dag (per-day unique),
--     én kontakt pr. IP pr. annonce pr. dag;
--   - indberet: hoejst 10 indberetninger pr. IP pr. dag — og kun DEN IP
--     rammes; alle andre kan stadig anmelde. Fejler taelleren (db-fejl),
--     fejler funktionen AABENT og tager imod: en notice-and-action-kanal maa
--     ikke lukke, fordi et hjaelpebord er nede (C-004's pointe).
--
-- Her i databasen sker tre ting:
--   1. taelleren (skrive_taeller + taeller_tik) — kun service_role kan bruge den;
--   2. den direkte anonyme doer i reports lukkes: anon mister INSERT. Indloggede
--      beholder deres egen (reporter_id = auth.uid()). Kanalen for udloggede
--      er ikke vaek — den gaar gennem indberet;
--   3. record_listing_event mister EXECUTE for anon og authenticated: kun
--      haendelse (service_role) taeller. Klienten (js/supabase-api.js) kalder
--      funktionen foerst og falder tilbage til den direkte vej, saa laenge
--      funktionen svarer 404 — derfor er det ufarligt at koere 022 FOER eller
--      EFTER funktionerne er deployet, bare begge dele sker.
--
-- GDPR: skrive_taeller indeholder en daglig saltet sha256 af IP + dato — ikke
-- IP'en. Raekkerne slettes automatisk efter to dage (ryd_skrive_taeller,
-- kaldt af taeller_tik ca. hver 100. gang). Tabellen har ingen grants til
-- klientroller og ingen RLS-politikker — den er usynlig udefra.

create extension if not exists pgcrypto;

-- ---------- 1. taelleren ----------
create table if not exists public.skrive_taeller (
  noegle  text not null,          -- fx 'view:<annonce-uuid>:<iphash>' eller 'report:<iphash>'
  dag     date not null default current_date,
  antal   int  not null default 0,
  primary key (noegle, dag)
);
alter table public.skrive_taeller enable row level security;   -- ingen politikker = ingen klientadgang
revoke all on public.skrive_taeller from anon, authenticated;

create or replace function public.ryd_skrive_taeller()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.skrive_taeller where dag < current_date - 1;
$$;
revoke execute on function public.ryd_skrive_taeller() from public, anon, authenticated;

-- Taeller én op for noeglen i dag og svarer true, hvis graensen IKKE er naaet
-- (altsaa: handlingen maa gennemfoeres). p_graense = 1 giver "én pr. dag".
create or replace function public.taeller_tik(p_noegle text, p_graense int)
returns boolean
language plpgsql
security definer
set search_path = public
as $fn$
declare
  nu int;
begin
  if p_noegle is null or length(p_noegle) > 200 then return false; end if;
  insert into public.skrive_taeller as t (noegle, dag, antal)
  values (p_noegle, current_date, 1)
  on conflict (noegle, dag) do update set antal = t.antal + 1
  returning antal into nu;
  -- Oprydning uden cron: ca. hver 100. gang.
  if random() < 0.01 then perform public.ryd_skrive_taeller(); end if;
  return nu <= p_graense;
end $fn$;
revoke execute on function public.taeller_tik(text, int) from public, anon, authenticated;
-- service_role har EXECUTE via sin standardrolle (ejeren/postgres) — ingen grant noedvendig.

-- ---------- 2. reports: den direkte anonyme doer lukkes ----------
-- Politikken "indberetning: alle maa oprette" (002/017) bliver staaende — den
-- gaelder stadig for service_role-skrivninger med reporter_id = null fra
-- indberet, og for indloggede med reporter_id = auth.uid(). Det, der fjernes,
-- er anons tabelprivilegium, saa en udlogget ikke kan POSTe direkte til
-- /rest/v1/reports udenom taelleren.
revoke insert on public.reports from anon;
-- authenticated beholder insert (018 gav den eksplicit).

-- ---------- 3. record_listing_event: kun via haendelse ----------
revoke execute on function public.record_listing_event(uuid, text) from public, anon, authenticated;

-- Tjek bagefter:
--   select has_table_privilege('anon', 'public.reports', 'insert');                 -- false
--   select has_function_privilege('anon', 'public.record_listing_event(uuid,text)', 'execute'); -- false
--   select has_function_privilege('anon', 'public.taeller_tik(text,int)', 'execute');            -- false
-- Og fra nettet: node scripts/tjek-backend.js (punkterne "migration 022").
