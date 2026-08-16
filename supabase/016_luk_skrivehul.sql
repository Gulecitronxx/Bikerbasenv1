-- Bikerbasen migration 016: luk skrivehullet i public_profiles og haerd RPC-fladen.
-- Koer hele filen i Supabase SQL Editor. Kan koeres igen uden skade.
--
-- ============================================================
-- HULLET (det vaerste, og det raadgiverne IKKE fangede)
-- ============================================================
-- schema.sql:147 giver kun "grant select on public.public_profiles to anon,
-- authenticated". Det saa rigtigt ud. Men Supabase har som standard
--   alter default privileges in schema public grant all on tables to anon,
--   authenticated, service_role
-- og et VIEW er en "table" i den sammenhaeng. View'et fik altsaa INSERT,
-- UPDATE og DELETE foraeret i samme sekund det blev oprettet, uden at nogen
-- skrev det nogen steder.
--
-- public_profiles er et simpelt view over én tabel, saa Postgres gjorde det
-- automatisk skrivbart. Kombineret med security_invoker = off betyder det:
-- et anonymt PATCH mod /rest/v1/public_profiles skrev direkte i profiles
-- SOM EJEREN AF VIEW'ET, altsaa helt uden om RLS.
--
-- Verificeret mod produktion 16.08.2026 i en rullet-tilbage transaktion:
--   begin; set local role anon;
--   update public.public_profiles set city = city, is_dealer = is_dealer
--    where id = (select id from public.public_profiles limit 1);
--   -> 1 raekke. rollback;
--
-- Hvad en angriber kunne: saette is_dealer = true paa sig selv, aendre en
-- fremmed saelgers navn/firma/by, eller sla en aegte forhandlers oplysninger
-- i stykker. Paa en markedsplads hvor koeberen bruger netop de felter til at
-- afgoere HVEM han overfoerer 80.000 kr. til, er det den dyreste slags hul.
--
-- FALDGRUBE TIL NAESTE BUILDER: "grant select on <view>" fjerner ikke de
-- rettigheder default privileges allerede har givet. Hvert nyt view i public
-- SKAL have et eksplicit revoke som nedenfor.

-- ---------- 1. Fjern skriverettighederne fra begge views ----------
revoke insert, update, delete, truncate, references, trigger
  on public.public_profiles from anon, authenticated, public;
revoke insert, update, delete, truncate, references, trigger
  on public.seller_ratings  from anon, authenticated, public;

-- Laesning er hele pointen med de to views og bevares.
grant select on public.public_profiles to anon, authenticated;
grant select on public.seller_ratings  to anon, authenticated;

-- ---------- 2. seller_ratings: over paa invokerens rettigheder ----------
-- reviews har i forvejen politikken "anmeldelse: offentlig laesning" med
-- using (true), saa view'et har ingen grund til at koere som ejeren. Skiftet
-- aendrer ingenting for brugeren og fjerner det ene af de to ERROR-fund.
alter view public.seller_ratings set (security_invoker = on);

-- ---------- 3. public_profiles: bliver bevidst staaende som definer ----------
-- Raadgiveren vil have security_invoker = on her ogsaa. Det kan vi ikke, og
-- her er hvorfor — skrevet ned saa ingen prøver igen uden at laese dette:
--
-- profiles har kun politikken "profil: læs egen" (auth.uid() = id). Med
-- invoker ville en udlogget besoegende faa NUL raekker fra public_profiles,
-- og saelgernavnet ville forsvinde fra hvert eneste annoncekort og hver
-- detaljeside. Det braekker siden.
--
-- Den aabenlyse lappeloesning — en "using (true)"-politik paa profiles — er
-- vaerre end hullet: profiles indeholder phone, cvr og stripe_customer_id,
-- og js/supabase-api.js henter sin egen profil med select('*'), saa vi kan
-- ikke bare skrue kolonne-privilegierne ned for authenticated uden at braekke
-- login-flowet. Enhver indlogget bruger ville kunne hoeste alle saelgeres
-- telefonnumre paa ét kald.
--
-- Efter revoke'et ovenfor er view'et kun laesbart, og dets kolonneliste er
-- fast: id, name, city, is_dealer, company, member_since, verified. Der er
-- ingen vej fra det view til et telefonnummer. Definer-rettigheden bruges
-- altsaa til praecis dét den blev lavet til, og intet andet.
--
-- DEN RIGTIGE LOESNING (kraever frontend-aendringer, derfor ikke her):
-- flyt phone, cvr, email_verified, phone_verified og stripe_*-felterne til
-- en separat tabel "profiler_private", giv profiles en offentlig
-- laesepolitik og saet saa security_invoker = on. Det rydder ERROR'en helt.
comment on view public.public_profiles is
  'Bevidst SECURITY DEFINER: profiles er privat pr. raekke, og dette view er '
  'den eneste offentlige vej til de syv felter en koeber maa se. Skriverettigheder '
  'er fjernet i migration 016. Se kommentaren der foer du aendrer noget.';

-- ============================================================
-- 4. SECURITY DEFINER-funktioner der kunne kaldes af anon
-- ============================================================
-- Samme aarsag som ovenfor: default privileges giver EXECUTE paa alt i public
-- til anon og authenticated. Ingen af funktionerne nedenfor blev nogensinde
-- bevidst aabnet — de arvede det.

-- ---------- 4a. Triggerfunktioner: skal ALDRIG kunne kaldes ----------
-- Alle tre returnerer "trigger" og giver kun mening naar Postgres selv kalder
-- dem. Verificeret i databasen: handle_new_user og handle_user_confirmed
-- haenger paa auth.users, notify_saved_searches paa listings.
-- EXECUTE tjekkes kun naar triggeren OPRETTES, ikke naar den fyrer, saa de
-- eksisterende triggere koerer videre uden aendring.
revoke execute on function public.handle_new_user()        from public, anon, authenticated;
revoke execute on function public.handle_user_confirmed()  from public, anon, authenticated;
revoke execute on function public.notify_saved_searches()  from public, anon, authenticated;

-- ---------- 4b. RPC'er der kraever et login for at give mening ----------
-- Begge hviler paa auth.uid(). For anon er den null, saa de returnerede i
-- forvejen ingenting — men en funktion der ikke kan bruges skal heller ikke
-- staa aaben i API'et.
revoke execute on function public.my_listing_saves()       from public, anon;
revoke execute on function public.ret_ekstern_annonce(uuid, text, text) from public, anon;

grant  execute on function public.my_listing_saves()       to authenticated;
grant  execute on function public.ret_ekstern_annonce(uuid, text, text) to authenticated;

-- ---------- 4c. RPC'er der MED VILJE er aabne for udloggede ----------
-- record_listing_event taeller visninger, og de fleste visninger kommer fra
-- udloggede besoegende. Den er indhegnet: kun 'view'/'contact', kun aktive
-- annoncer, aldrig saelgerens egne besoeg, og den skriver kun i listing_stats.
-- Accepteret risiko: ingen rate limit, saa nogen kan pumpe et taellevaerk op.
-- Konsekvensen er en loegnagtig graf paa saelgerens dashboard, ikke laekket
-- data. Skal loeses med rate limiting, ikke med et revoke.
--
-- unsubscribe_saved_search kaldes fra afmeld-linket i mailen, hvor brugeren
-- pr. definition ikke er logget ind. Den kraever et uuid-token og saetter kun
-- notify = false.
revoke execute on function public.record_listing_event(uuid, text)     from public;
revoke execute on function public.unsubscribe_saved_search(uuid)       from public;

grant  execute on function public.record_listing_event(uuid, text)     to anon, authenticated;
grant  execute on function public.unsubscribe_saved_search(uuid)       to anon, authenticated;

-- ============================================================
-- 5. search_path paa funktionerne
-- ============================================================
-- De to raadgiveren naevnte. Ingen af dem slaar op i en tabel, saa en tom
-- search_path er gratis.
alter function public.is_verified(public.profiles) set search_path = '';
alter function public.touch_updated_at()           set search_path = '';

-- Resten stod paa search_path = 'public'. Det er ikke et hul i dag, fordi
-- PUBLIC kun har USAGE og ikke CREATE paa public-skemaet — men det er en
-- usynlig snubletraad: den dag nogen giver CREATE paa public, kan en angriber
-- lave en funktion der skygger for en af opslagene og faa den koert som
-- ejeren. Alle seks har i forvejen skemakvalificerede referencer
-- (public.*, auth.uid(), net.http_post), saa '' bryder ingenting.
alter function public.handle_new_user()                                set search_path = '';
alter function public.handle_user_confirmed()                          set search_path = '';
alter function public.notify_saved_searches()                          set search_path = '';
alter function public.my_listing_saves()                               set search_path = '';
alter function public.record_listing_event(uuid, text)                 set search_path = '';
alter function public.ret_ekstern_annonce(uuid, text, text)            set search_path = '';

-- ============================================================
-- 6. Tabeller med RLS men uden politikker
-- ============================================================
-- crawl_koersler og search_notifications er service_role-tabeller: crawleren
-- (crawler/db.js) og edge-funktionen notify-saved-searches skriver i dem, og
-- ingen browser skal nogensinde se dem. RLS uden politikker naegter allerede
-- alt for anon og authenticated — det er den rigtige tilstand, ikke en fejl,
-- og raadgiverens INFO bliver staaende med vilje.
--
-- Vi fjerner grants'ene ovenpaa, saa beskyttelsen ikke hviler paa RLS alene.
-- Uden det ville en glemt "enable row level security" i en fremtidig
-- migration aabne tabellerne paa vid gab. service_role gaar udenom RLS og
-- rammes ikke af et revoke paa anon/authenticated.
revoke all on public.crawl_koersler       from anon, authenticated;
revoke all on public.search_notifications from anon, authenticated;

comment on table public.crawl_koersler is
  'Kun service_role (crawler/db.js). RLS uden politikker + intet grant til anon/authenticated er med vilje.';
comment on table public.search_notifications is
  'Kun service_role (edge-funktionen notify-saved-searches). RLS uden politikker + intet grant er med vilje.';

-- ============================================================
-- 7. Fund vi IKKE kan lukke her — skrevet ned, ikke glemt
-- ============================================================
-- pg_net i public: raadgiveren tager fejl paa dette projekt. Extensionen er
-- registreret paa public, men alle tolv af dens funktioner ligger i skemaet
-- "net" (verificeret via pg_depend: nul pg_net-objekter i public). Der er
-- altsaa intet at flytte. Og pg_net har extrelocatable = false, saa
-- "alter extension pg_net set schema extensions" fejler uanset hvad.
-- WARN'en bliver staaende. Ingen handling er den rigtige handling.
--
-- Leaked password protection: en Auth-indstilling, ikke SQL. Slaas til under
-- Authentication -> Policies -> "Prevent use of leaked passwords" i
-- dashboardet. Kan ikke saettes fra en migration.

-- PostgREST cacher rettigheder og funktionssignaturer. Uden det her slaar
-- aendringerne foerst igennem ved naeste genstart af API'et.
notify pgrst, 'reload schema';
