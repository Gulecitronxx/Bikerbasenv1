-- Bikerbasen migration 006: fundament for forhandler-abonnement.
-- Koer hele filen i Supabase SQL Editor. Kan koeres igen uden skade. Ren ASCII.
--
-- Model: private konti maa have 3 aktive annoncer gratis. Forhandlere
-- (plan = 'dealer', med aktivt abonnement) maa have ubegraenset.
--
-- VIGTIGT: graensen haandhaeves med en database-trigger, ikke kun i klienten.
-- Ellers kunne en bruger bare kalde API'et direkte og oprette flere.

-- ------------------------------------------------------------
-- 1) Abonnement-felter paa profilen
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists plan                    text not null default 'free',
  add column if not exists subscription_status     text,
  add column if not exists subscription_period_end timestamptz,
  add column if not exists stripe_customer_id      text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_plan_check') then
    alter table public.profiles
      add constraint profiles_plan_check check (plan in ('free', 'dealer'));
  end if;
end $$;

-- ------------------------------------------------------------
-- 2) Laas de nye felter for brugeren (samme princip som 005)
-- Kun en betroet serverproces (Stripe-webhook via service_role) maa aendre
-- abonnement. Ellers kunne en forhandler give sig selv gratis abonnement.
-- Vi gen-grant'er kun de felter en bruger selv maa redigere.
-- ------------------------------------------------------------
revoke update on public.profiles from anon;
revoke update on public.profiles from authenticated;
grant update (name, phone, city, is_dealer, company, cvr)
  on public.profiles to authenticated;

-- ------------------------------------------------------------
-- 3) Server-haandhaevet annoncegraense
-- ------------------------------------------------------------
create or replace function public.enforce_listing_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  brugerplan text;
  antal_aktive int;
begin
  select plan into brugerplan from public.profiles where id = new.seller_id;

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

drop trigger if exists trg_listing_limit on public.listings;
create trigger trg_listing_limit
  before insert on public.listings
  for each row execute function public.enforce_listing_limit();

-- ------------------------------------------------------------
-- 4) DEV-ONLY: skift din egen plan uden betaling, saa gating kan testes
-- foer Stripe er koblet paa. FJERN denne funktion foer lancering ved at
-- koere:  drop function public.dev_set_plan(text);
-- ------------------------------------------------------------
create or replace function public.dev_set_plan(p_plan text)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if p_plan not in ('free', 'dealer') then
    raise exception 'ugyldig plan';
  end if;
  update public.profiles set
    plan = p_plan,
    subscription_status = case when p_plan = 'dealer' then 'active' else null end,
    subscription_period_end = case when p_plan = 'dealer' then now() + interval '30 days' else null end
  where id = auth.uid();
end $fn$;

grant execute on function public.dev_set_plan(text) to authenticated;
