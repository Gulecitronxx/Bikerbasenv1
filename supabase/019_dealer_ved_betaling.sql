-- Bikerbasen migration 019: forhandler-dashboardet var uopnaaeligt for den,
-- der faktisk betalte for det.
-- Koer i Supabase SQL Editor. Ren ASCII. Kan koeres igen uden skade.
--
-- FUNDET: dashboard.html/js/dashboard.js laaser adgang paa profiles.is_dealer
-- ("Dashboardet er for forhandlere" naar is_dealer = false). Men hverken
-- stripe-webhook (supabase/functions/stripe-webhook/index.ts) eller
-- dev_set_plan() (006_forhandler_abonnement.sql) satte NOGENSINDE is_dealer —
-- de satte kun profiles.plan til 'dealer'. En privat bruger, der betalte for
-- forhandlerabonnementet via "Mine annoncer -> Konto -> Bliv forhandler",
-- fik altsaa ubegraensede annoncer, men saa STADIG "Dashboardet er for
-- forhandlere" naar han klikkede paa netop det dashboard, betalingen skulle
-- laase op for. To felter for samme beslutning, kun det ene blev sat.
--
-- RETTELSE: dev_set_plan('dealer') saetter nu ogsaa is_dealer = true. Samme
-- rettelse er lavet i stripe-webhook/index.ts's opdaterPlan() for den
-- rigtige betalingsvej. Nedgradering (plan -> 'free') AENDRER IKKE is_dealer
-- tilbage: er man registreret som virksomhed, eller er man blevet det ved at
-- betale, er det en kendsgerning om kontoen, ikke et abonnementsflag, og skal
-- ikke forsvinde, fordi abonnementet udloeber. (Jf. "Aerlighed slaar
-- fuldstaendighed" i work/DECISIONS.md — is_dealer beskriver hvem kontoen
-- ER, ikke hvad den betaler for lige nu.)

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
    subscription_period_end = case when p_plan = 'dealer' then now() + interval '30 days' else null end,
    is_dealer = case when p_plan = 'dealer' then true else is_dealer end
  where id = auth.uid();
end $fn$;

grant execute on function public.dev_set_plan(text) to authenticated;

-- Tjek bagefter (skal begge vaere sande for en testbruger, der lige har
-- koert dev_set_plan('dealer')):
--   select plan, is_dealer from public.profiles where id = auth.uid();
