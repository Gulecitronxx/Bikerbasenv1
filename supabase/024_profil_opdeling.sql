-- Bikerbasen migration 024: del profiles i en offentlig og en privat halvdel,
-- så public_profiles kan køre på invokerens rettigheder.
--
-- ------------------------------------------------------------
-- HVORFOR
--
-- Supabase-rådgiveren melder: "View public.public_profiles is defined with the
-- SECURITY DEFINER property". Migration 016 undersøgte det og lod det bevidst
-- stå, fordi alternativet dengang var værre. Læs afsnit 3 i 016 før du læser
-- videre her — den her migration er den løsning, 016 selv beskriver til sidst:
--
--   "DEN RIGTIGE LOESNING (kraever frontend-aendringer, derfor ikke her):
--    flyt phone, cvr, email_verified, phone_verified og stripe_*-felterne til
--    en separat tabel, giv profiles en offentlig laesepolitik og saet saa
--    security_invoker = on."
--
-- Problemet, 016 sad fast i: `profiles` bærer BÅDE de syv felter, en køber må
-- se, OG telefonnummer, CVR og Stripe-id. Én tabel kan ikke have to
-- læserettigheder på samme tid — RLS gælder rækker, ikke kolonner — så enten
-- var alt privat (og sælgernavnet forsvandt fra hvert annoncekort), eller alt
-- var offentligt (og enhver indlogget kunne høste alle telefonnumre).
--
-- Snittet løser det: de offentlige felter bliver i `profiles`, som får en
-- offentlig læsepolitik, og de private flytter til `profiles_private`, som kun
-- kan læses af ejeren. Så er der ikke længere noget at beskytte i `profiles`,
-- og view'et kan arve den besøgendes egne rettigheder.
--
-- ------------------------------------------------------------
-- FØR DU KØRER DEN
--
-- Den her migration flytter data og dropper kolonner. Kør den på et
-- staging-projekt først, og tag en backup af `profiles` inden. Rækkefølgen er
-- lavet så den kan køres i én transaktion: intet droppes, før kopien er lavet
-- og verificeret af assert'en i trin 3.
-- ------------------------------------------------------------

begin;

-- ---------- 1. Den private halvdel ----------
-- Hvad der flytter, og hvorfor det ikke må være offentligt:
--   phone, vis_telefon         kontaktoplysning + samtykket til at vise den
--                              (migration 023: nummeret må aldrig ligge i en
--                              offentlig visning uden sælgerens ja)
--   email_verified,
--   phone_verified             intern kontostatus, ikke købererelevant
--   plan, subscription_status,
--   subscription_period_end,
--   stripe_customer_id         betalingsforhold
--   cvr                        se noten ved trin 4 om check-constrainten
create table if not exists public.profiles_private (
  id                      uuid primary key
                          references public.profiles(id) on delete cascade,
  phone                   text,
  vis_telefon             boolean not null default false,
  cvr                     text,
  email_verified          boolean not null default false,
  phone_verified          boolean not null default false,
  plan                    text not null default 'free',
  subscription_status     text,
  subscription_period_end timestamptz,
  stripe_customer_id      text,
  updated_at              timestamptz not null default now()
);

-- Samme plan-værdier som constrainten i migration 006 håndhævede.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_private_plan_check') then
    alter table public.profiles_private
      add constraint profiles_private_plan_check check (plan in ('free','dealer'));
  end if;
end $$;

-- ---------- 2. Flyt data ----------
insert into public.profiles_private
  (id, phone, vis_telefon, cvr, email_verified, phone_verified,
   plan, subscription_status, subscription_period_end, stripe_customer_id)
select id, phone, vis_telefon, cvr, email_verified, phone_verified,
       plan, subscription_status, subscription_period_end, stripe_customer_id
from public.profiles
on conflict (id) do nothing;

-- ---------- 3. Bevis at kopien er komplet, FØR noget droppes ----------
-- Uden det her kunne en delvis kopi ende med at slette de originale kolonner
-- alligevel. Fejler assert'en, ruller hele transaktionen tilbage.
do $$
declare mangler int;
begin
  select count(*) into mangler
  from public.profiles p
  left join public.profiles_private pp on pp.id = p.id
  where pp.id is null;
  if mangler > 0 then
    raise exception 'profiles_private mangler % raekker — migration afbrudt', mangler;
  end if;
end $$;

-- ---------- 4. Check-constrainten, der spænder over snittet ----------
-- `profiles` havde:  check (not cvr_verified or cvr is not null)
-- altså "en erhvervskonto må ikke stå som CVR-verificeret uden et CVR-nummer"
-- (DSA-krav, se schema.sql). `cvr` flytter til den private tabel, mens
-- `cvr_verified` bliver i `profiles`, fordi is_verified() — og dermed
-- verified-mærket på hvert annoncekort — regnes af den. En check-constraint
-- kan ikke læse en anden tabel, så garantien genskabes som en trigger, der
-- fyrer fra BEGGE sider: uanset om nogen sætter flaget eller fjerner nummeret.
alter table public.profiles drop constraint if exists dealer_needs_cvr;

create or replace function public.krav_cvr_ved_verifikation()
returns trigger language plpgsql security definer set search_path = '' as $$
declare har_cvr boolean; er_verificeret boolean;
begin
  if tg_table_name = 'profiles' then
    er_verificeret := new.cvr_verified;
    select cvr is not null into har_cvr from public.profiles_private where id = new.id;
  else
    har_cvr := new.cvr is not null;
    select cvr_verified into er_verificeret from public.profiles where id = new.id;
  end if;
  if coalesce(er_verificeret, false) and not coalesce(har_cvr, false) then
    raise exception 'cvr_verified kraever et cvr-nummer (dealer_needs_cvr)';
  end if;
  return new;
end $$;

drop trigger if exists cvr_krav_profiles on public.profiles;
create constraint trigger cvr_krav_profiles
  after insert or update of cvr_verified on public.profiles
  deferrable initially deferred
  for each row execute function public.krav_cvr_ved_verifikation();

drop trigger if exists cvr_krav_private on public.profiles_private;
create constraint trigger cvr_krav_private
  after insert or update of cvr on public.profiles_private
  deferrable initially deferred
  for each row execute function public.krav_cvr_ved_verifikation();

-- ---------- 5. Fjern de private kolonner fra profiles ----------
alter table public.profiles
  drop column if exists phone,
  drop column if exists vis_telefon,
  drop column if exists cvr,
  drop column if exists email_verified,
  drop column if exists phone_verified,
  drop column if exists plan,
  drop column if exists subscription_status,
  drop column if exists subscription_period_end,
  drop column if exists stripe_customer_id;

-- Længdegrænserne fra migration 008 pegede på kolonner, der nu er væk.
-- De genskabes for de felter, der stadig findes.
alter table public.profiles drop constraint if exists profiles_text_len_chk;
alter table public.profiles add constraint profiles_text_len_chk check (
  length(coalesce(name, '')) <= 120 and
  length(coalesce(city, '')) <= 80 and
  length(coalesce(company, '')) <= 160
);

-- ---------- 6. RLS på den private halvdel: kun din egen række ----------
alter table public.profiles_private enable row level security;

drop policy if exists "privat profil: laes egen" on public.profiles_private;
create policy "privat profil: laes egen" on public.profiles_private
  for select to authenticated using ((select auth.uid()) = id);

drop policy if exists "privat profil: opdater egen" on public.profiles_private;
create policy "privat profil: opdater egen" on public.profiles_private
  for update to authenticated using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "privat profil: opret egen" on public.profiles_private;
create policy "privat profil: opret egen" on public.profiles_private
  for insert to authenticated with check ((select auth.uid()) = id);

-- Ingen delete: rækken følger profilen via on delete cascade.
revoke delete, truncate, references, trigger on public.profiles_private
  from anon, authenticated, public;
revoke all on public.profiles_private from anon;

-- Kolonnegulv (samme princip som migration 021): abonnementsfelterne skrives
-- af Stripe-webhooken med service_role, ikke af brugeren selv.
grant select on public.profiles_private to authenticated;
grant insert, update (phone, vis_telefon, cvr) on public.profiles_private to authenticated;

-- ---------- 7. profiles bliver offentligt læsbar ----------
-- Nu er der ikke længere noget privat tilbage i tabellen: de otte kolonner er
-- præcis dem, et annoncekort viser i forvejen.
drop policy if exists "profil: læs egen" on public.profiles;
drop policy if exists "profil: laes offentligt" on public.profiles;
create policy "profil: laes offentligt" on public.profiles
  for select to anon, authenticated using (true);

-- Skrivning er uændret: kun din egen række.
drop policy if exists "profil: opdater egen" on public.profiles;
create policy "profil: opdater egen" on public.profiles
  for update to authenticated using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Kolonnegulv: verifikationsflagene sættes af service_role, aldrig af brugeren.
revoke update on public.profiles from anon, authenticated, public;
grant update (name, city, is_dealer, company) on public.profiles to authenticated;

-- ---------- 8. De to auth-triggere skriver nu i begge tabeller ----------
-- handle_new_user() indsatte phone, cvr og email_verified DIREKTE i profiles.
-- Efter trin 5 findes de kolonner ikke mere, saa signup ville fejle med
-- "column does not exist" — og en fejlende trigger paa auth.users blokerer
-- oprettelsen af brugeren selv. Den skriver nu den offentlige halvdel i
-- profiles og den private i profiles_private.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, name, is_dealer, company)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce((new.raw_user_meta_data->>'is_dealer')::boolean, false),
    new.raw_user_meta_data->>'company'
  )
  on conflict (id) do nothing;

  insert into public.profiles_private (id, phone, cvr, email_verified)
  values (
    new.id,
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'cvr',
    new.email_confirmed_at is not null
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Samme aarsag: e-mailbekraeftelsen satte email_verified i profiles.
create or replace function public.handle_user_confirmed()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    -- upsert, saa en konto uden privat raekke (oprettet foer 024) ogsaa faar
    -- flaget sat i stedet for at ramme nul raekker i stilhed.
    insert into public.profiles_private (id, email_verified)
    values (new.id, true)
    on conflict (id) do update set email_verified = true;
  end if;
  return new;
end;
$$;

-- Rettighedsgulvet fra migration 016/018 gaelder stadig: ingen maa kalde dem
-- direkte, de fyrer kun som triggere.
revoke execute on function public.handle_new_user()       from public, anon, authenticated;
revoke execute on function public.handle_user_confirmed() from public, anon, authenticated;
revoke execute on function public.krav_cvr_ved_verifikation() from public, anon, authenticated;

-- ---------- 9. Telefonopslaget peger nu paa den private tabel ----------
-- hent_saelger_telefon() (migration 023) laeste p.phone og p.vis_telefon fra
-- profiles. Begge kolonner er flyttet, saa funktionen ville fejle — og det er
-- den, der leverer nummeret bag "Vis telefonnummer" paa annoncesiden.
-- Betingelserne er UAENDREDE: kun indlogget, kun aktiv annonce, kun med
-- saelgerens eget samtykke.
create or replace function public.hent_saelger_telefon(p_listing uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  nummer text;
begin
  -- Kun indloggede. RLS gaelder ikke i en definer-funktion, saa gaten
  -- skrives eksplicit.
  if auth.uid() is null then
    return null;
  end if;
  select nullif(trim(pp.phone), '') into nummer
  from public.listings l
  join public.profiles_private pp on pp.id = l.seller_id
  where l.id = p_listing
    and l.status = 'active'
    and pp.vis_telefon = true;
  return nummer;
end $fn$;

revoke execute on function public.hent_saelger_telefon(uuid) from public, anon;
grant execute on function public.hent_saelger_telefon(uuid) to authenticated;

-- ---------- 10. Annoncegraensen laeser planen det nye sted ----------
-- enforce_listing_limit() (migration 006) hentede `plan` fra profiles. Uden
-- det her ville brugerplan blive NULL for ALLE, saa enhver forhandler faldt
-- tilbage til gratis-graensen paa 3 aktive annoncer — en stille regression,
-- der foerst ville vise sig, naar en betalende forhandler blev afvist.
create or replace function public.enforce_listing_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  brugerplan text;
  antal_aktive int;
begin
  select plan into brugerplan from public.profiles_private where id = new.seller_id;

  -- Forhandlere: ingen graense.
  if brugerplan = 'dealer' then
    return new;
  end if;

  -- Private: maks 3 aktive annoncer.
  select count(*) into antal_aktive
  from public.listings
  where seller_id = new.seller_id and status = 'active';

  if antal_aktive >= 3 then
    raise exception 'GRAENSE: Du kan have 3 aktive annoncer gratis. Bliv forhandler for ubegraenset.'
      using errcode = 'check_violation';
  end if;

  return new;
end $fn$;

revoke execute on function public.enforce_listing_limit() from public, anon, authenticated;

-- ---------- 11. is_verified regnes nu inline i view'et ----------
-- Funktionen tog hele rækken (`profiles.*`), hvilket krævede SELECT på hver
-- eneste kolonne. Den bliver stående til brug i triggere og admin-forespørgsler,
-- men view'et regner selv, så det kun rører de kolonner, det faktisk viser.
create or replace view public.public_profiles
with (security_invoker = on) as
  select id, name, city, is_dealer, company, member_since,
         case when is_dealer then mitid_verified and cvr_verified
              else mitid_verified end as verified
  from public.profiles;

-- FALDGRUBE (samme som migration 016): "grant select on <view>" fjerner ikke
-- de rettigheder, default privileges allerede har givet. Revoke eksplicit.
revoke insert, update, delete, truncate, references, trigger
  on public.public_profiles from anon, authenticated, public;
grant select on public.public_profiles to anon, authenticated;

comment on view public.public_profiles is
  'SECURITY INVOKER siden migration 024. profiles er offentligt laesbar og '
  'indeholder kun felter, en koeber maa se; telefon, cvr og betalingsforhold '
  'ligger i profiles_private, som kun ejeren kan laese.';

comment on table public.profiles_private is
  'Den private halvdel af en profil: kontaktoplysning, samtykke, CVR og '
  'betalingsforhold. Kun ejeren kan laese sin egen raekke. Se migration 024.';

commit;
