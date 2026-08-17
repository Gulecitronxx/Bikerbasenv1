-- Bikerbasen migration 018: laeg et gulv under rettighederne i stedet for at
-- lappe hul for hul.
-- Koer hele filen i Supabase SQL Editor. Kan koeres igen uden skade. Ren ASCII
-- i kommentarerne; politiknavne staves som de er oprettet.
--
-- Findings fra runde 1: C-002, C-003, C-004, C-005, C-006.
--
-- ============================================================
-- HVORFOR DENNE MIGRATION FINDES
-- ============================================================
-- 016 lukkede ét hul: public_profiles kunne skrives af anon. Den skrev endda
-- ned i linje 31-33 HVORFOR hullet opstod — Supabase' default privileges giver
-- "all on tables" til anon og authenticated i skema public, og et view taeller
-- som en tabel. Men 016 fjernede kun rettighederne fra de to eksisterende
-- views. Fabrikken, der producerede hullet, koerte videre.
--
-- Det her er forskellen mellem at lukke et hul og at lukke kilden til huller.
--
-- ============================================================
-- 1. C-002 — sluk fabrikken (default privileges)
-- ============================================================
-- Efterproevet i produktion 17.08.2026:
--   select pg_get_userbyid(defaclrole), nspname, defaclobjtype, defaclacl
--   from pg_default_acl d left join pg_namespace n on n.oid=d.defaclnamespace;
-- gav for skema public, objtype 'r' (tabeller OG views):
--   grantor postgres        -> anon=arwdDxtm, authenticated=arwdDxtm
--   grantor supabase_admin  -> anon=arwdDxtm, authenticated=arwdDxtm
--
-- Alt hvad nogen opretter i public arver altsaa INSERT, UPDATE, DELETE og
-- TRUNCATE til den udloggede. RLS staar imellem — men RLS er en raekkefilter,
-- ikke et rettighedsgulv, og TRUNCATE gaar helt UDEN OM RLS. Beskyttelsen
-- hviler i dag paa, at PostgREST ikke har et TRUNCATE-verbum. Det er en
-- egenskab ved et andet produkt, ikke en beslutning vi har truffet.
--
-- SELECT bliver staaende. Laesning er hele formaalet med public-skemaet her,
-- og RLS gater raekkerne. Det er skrivningen, der aldrig maa vaere gratis.
--
-- VIGTIGT FOR NAESTE BUILDER: efter det her faar en NY tabel i public ingen
-- skriverettigheder af sig selv. Det er meningen. Skal authenticated kunne
-- skrive i din nye tabel, skal du skrive linjen selv:
--     grant insert, update, delete on public.<tabel> to authenticated;
-- Glemmer du den, faar du en 401/403 fra PostgREST — ikke et stille hul.
-- Det er den rigtige vej at fejle.
--
-- Aendringen er IKKE tilbagevirkende: eksisterende tabeller beholder de
-- rettigheder, de allerede har faaet. Derfor kommer afsnit 2.
alter default privileges in schema public
  revoke insert, update, delete, truncate, references, trigger on tables
  from anon, authenticated;

-- Den anden grantor kan vi formentlig ikke naa. Efterproevet:
--   current_user = postgres, rolsuper = false,
--   pg_has_role('postgres','supabase_admin','MEMBER') = false
-- Postgres kan kun aendre default privileges for roller, den er medlem af, saa
-- linjen nedenfor vil kaste 42501. Den staar i en DO-blok, saa resten af filen
-- koerer igennem — og saa fejlen bliver SAGT hoejt i stedet for at forsvinde.
--
-- Hvor slemt er det, at supabase_admin-posten bliver staaende? Den fyrer kun,
-- naar supabase_admin SELV opretter et objekt i public. Vores migrationer
-- koeres som postgres, og alle femten nuvaerende tabeller og views i public er
-- ejet af postgres. Den praktiske vej er altsaa lukket. Posten er en
-- restrisiko for Supabase-installerede objekter, ikke for vores egne.
do $$
begin
  execute 'alter default privileges for role supabase_admin in schema public '
       || 'revoke insert, update, delete, truncate, references, trigger on tables '
       || 'from anon, authenticated';
  raise notice '018: supabase_admin-posten i pg_default_acl blev ogsaa lukket.';
exception when insufficient_privilege then
  raise notice '018: supabase_admin-posten i pg_default_acl staar tilbage. Forventet: postgres er ikke medlem af supabase_admin. Se kommentaren i migrationen; kraever superuser.';
end $$;

-- ============================================================
-- 2. C-003 — traek de arvede skriverettigheder tilbage paa det, der findes
-- ============================================================
-- Efterproevet i pg_class.relacl 17.08.2026. Ni tabeller stod med fuldt
-- anon=arwdDxtm. profiles stod med anon=ardDxtm — 005 tog UPDATE, resten blev
-- staaende.
--
-- HVOR SLEMT ER DET, PRAECIST? Det er vigtigt at sige rigtigt, for det er
-- efterproevet: profiles har politikker for SELECT og UPDATE og INGEN for
-- INSERT eller DELETE, og RLS uden politik naegter. Rettigheden er der,
-- udnyttelsen er spaerret af noget andet. Det er en FAELDE, ikke et brud.
--
-- Faelden udloeses den dag nogen skriver én politik i en fart. Skriver du
-- "profil: offentlig laesning" med using (true) og glemmer at binde den til
-- SELECT — en FOR ALL-politik er standard, hvis kommandoen udelades — saa er
-- INSERT-rettigheden, der har ligget der hele tiden, pludselig brugbar. Der er
-- ingen advarsel, og den politik ser rigtig ud i en pull request.
--
-- Princippet staar allerede i 016 linje 155: "beskyttelsen skal ikke hvile paa
-- RLS alene". 016 anvendte det paa to tabeller. Her er de ni andre.
--
-- Hvem skriver hvad, efterproevet ved at laese js/supabase-api.js igennem:
-- ALLE mutationer paa naer én kraever et login (rollen authenticated). Den ene
-- undtagelse er reports, som en udlogget SKAL kunne indsaette i.

-- ---------- 2a. Tabeller hvor anon aldrig skriver ----------
-- listings, favorites, reviews, saved_searches, listing_photos, krav.
-- Alle seks skrives kun af authenticated via supabase-api.js.
revoke insert, update, delete, truncate, references, trigger
  on public.listings       from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.favorites      from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.reviews        from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.saved_searches from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.listing_photos from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.krav           from anon;

-- ---------- 2b. profiles: INSERT, DELETE og TRUNCATE ryger ----------
-- Ingen af de to roller indsaetter i profiles. Raekken oprettes af triggeren
-- handle_new_user(), som er SECURITY DEFINER ejet af postgres og derfor ikke
-- bruger kalderens rettigheder. Ingen sletter heller; der findes ingen
-- DELETE-politik.
--
-- UPDATE roeres IKKE. authenticated har KOLONNE-privilegier fra 005 paa
-- praecis seks felter (name, phone, city, is_dealer, company, cvr), og
-- mitid_verified/cvr_verified/email_verified er bevidst udeladt. Et
-- "revoke all" her ville tage dem med og braekke profilsiden — og vaerre:
-- nogen ville give dem tilbage med et bredt grant og dermed aabne flagene.
-- Derfor navngives hver rettighed her i stedet for at bruge all.
revoke insert, delete, truncate, references, trigger
  on public.profiles from anon, authenticated;

-- ---------- 2c. listing_stats: skrives kun af RPC'en ----------
-- record_listing_event() er SECURITY DEFINER ejet af postgres og skriver som
-- ejeren. Hverken anon eller authenticated behoever en skriverettighed for at
-- taellevaerket virker. authenticated beholder SELECT (politikken "statistik:
-- kun egen annonce" giver saelgeren sin egen graf).
revoke insert, update, delete, truncate, references, trigger
  on public.listing_stats from anon, authenticated;

-- ---------- 2d. reports: INSERT bevares, resten ryger ----------
-- Den udloggede indberetning er en bevidst aaben doer, se afsnit 3. Men
-- UPDATE, DELETE og TRUNCATE har aldrig vaeret en del af den doer, og der er
-- ingen politik for dem. Uden dette revoke ville en fremtidig
-- "indberetning: ret egen"-politik give mere vaek end den lover.
revoke update, delete, truncate, references, trigger
  on public.reports from anon, authenticated;
grant  insert on public.reports to anon, authenticated;

-- ---------- 2e. eksterne_annoncer og kilder: resten af 014 ----------
-- 014 linje 132-133 tog insert, update og delete. TRUNCATE, REFERENCES og
-- TRIGGER blev staaende (efterproevet: anon=rDxtm). TRUNCATE gaar uden om RLS,
-- saa den er den af de tre, der betyder noget: 332 indekserede annoncer kan
-- ikke beskyttes af en raekkepolitik mod en kommando, der ikke ser paa raekker.
revoke truncate, references, trigger
  on public.eksterne_annoncer from anon, authenticated;
revoke truncate, references, trigger
  on public.kilder            from anon, authenticated;

-- ============================================================
-- 3. C-004 — loft over det, en udlogget kan skrive
-- ============================================================
-- reports er den ENESTE anonyme skrivekanal i hele API'et. Politikken
-- "indberetning: alle må oprette" har rolle public og
-- with check (reporter_id is null or auth.uid() = reporter_id), altsaa maa en
-- udlogget indsaette raekker med reporter_id = null. Det er med vilje: en
-- notice-and-action-kanal, der kraever login, er ikke en notice-and-action-
-- kanal.
--
-- Problemet er ikke doeren, det er at der ikke er noget loft bag den.
-- Efterproevet i pg_constraint: reports har CHECK paa reason, status og
-- target_type — og INGEN laengdegraense paa comment eller target_id. Begge er
-- text, og Postgres' text tager op til 1 GB pr. vaerdi. Én raekke kunne altsaa
-- koste ~2 GB disk.
--
-- Moensteret findes allerede i huset: listings har listings_text_len_chk med
-- description <= 5000, eksterne_annoncer har uddrag <= 200. reports og reviews
-- blev sprunget over.
--
-- Maalt foer aendringen: 1 raekke i reports, laengste comment 17 tegn, laengste
-- target_id 8 tegn. 0 raekker i reviews. Ingen eksisterende raekke braekker
-- nogen af graenserne nedenfor, saa valideringen gaar igennem.
--
-- 2000 tegn er valgt, fordi en indberetning er en beskrivelse af ét problem,
-- ikke et dokument. 64 tegn paa target_id, fordi vaerdien enten er et uuid
-- (36 tegn) eller et demo-id (4 tegn).
--
-- HVAD DET IKKE LOESER: antallet af raekker. Se DECISIONS.md, C-004 — rate
-- limiting hoerer ikke til her, og begrundelsen staar der, ikke i en TODO.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'reports_text_len_chk') then
    alter table public.reports add constraint reports_text_len_chk
      check (char_length(comment) <= 2000 and char_length(target_id) <= 64);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'reviews_text_len_chk') then
    alter table public.reviews add constraint reviews_text_len_chk
      check (char_length(comment) <= 2000);
  end if;

  -- krav.dokumentation er samme slags ubundne text-felt, bare bag et login.
  -- Radius er mindre, men prisen for at lukke den er nul.
  if not exists (select 1 from pg_constraint where conname = 'krav_dok_len_chk') then
    alter table public.krav add constraint krav_dok_len_chk
      check (dokumentation is null or char_length(dokumentation) <= 2000);
  end if;
end $$;

-- ============================================================
-- 4. C-005 — et krav maa ikke kunne godkende sig selv
-- ============================================================
-- Politikken "krav: opret eget" kontrollerede kun auth.uid() = bruger_id.
-- status, metode, behandlet_af, behandlet og dokumentation var alle
-- klientstyrede, saa en indlogget bruger kunne POSTe
--   {status:'godkendt', behandlet_af:'<vilkaarligt uuid>', behandlet:'now()'}
-- direkte til /rest/v1/krav og faa en raekke, der ser behandlet ud.
--
-- HVOR LANGT RAEKKER DET? Ikke til skriveadgang. Efterproevet: ingen trigger
-- saetter ejet_af ud fra krav, og kun service_role har w paa
-- eksterne_annoncer. Et selvgodkendt krav giver ingen rettighed i dag.
--
-- Hvorfor det alligevel lukkes: en raekke, der siger "godkendt", er en
-- paastand i databasen. Den funktion, der en dag laeser krav.status for at
-- afgoere, hvem der ejer en annonce, arver loegnen — og den funktion vil blive
-- skrevet af nogen, der med rette gaar ud fra, at status betyder noget.
-- Prisen for at lukke det NU er tre linjer. Prisen for at lukke det bagefter
-- er en oprydning i data, ingen kan skelne.
--
-- Godkendelse sker herefter kun via service_role, som gaar uden om RLS. Der er
-- hverken UPDATE- eller DELETE-politik paa krav, saa brugeren kan ikke naa sin
-- egen raekke igen bagefter.
alter policy "krav: opret eget" on public.krav
  with check (
        (select auth.uid()) = bruger_id
    and status        = 'afventer'
    and behandlet_af  is null
    and behandlet     is null
  );

-- Findingens anden halvdel: unique (annonce_id, bruger_id) forhindrer, at SAMME
-- bruger claimer to gange — men to FORSKELLIGE brugere kan hver claime samme
-- annonce, og intet felt markerede konflikten. Det er i orden, saa laenge de
-- afventer; to mennesker maa gerne mene, de ejer den samme annonce. Det, der
-- ikke maa ske, er at begge ender som godkendt.
--
-- Delvist unikt indeks: kun raekker med status 'godkendt' er med, saa et
-- vilkaarligt antal 'afventer' og 'afvist' er stadig tilladt.
-- Maalt foer: 0 raekker i krav, 0 dubletter. Indekset bygges uden konflikt.
create unique index if not exists krav_et_godkendt_pr_annonce
  on public.krav (annonce_id) where status = 'godkendt';

comment on index public.krav_et_godkendt_pr_annonce is
  'Kun ét godkendt krav pr. annonce. To brugere maa gerne AFVENTE paa samme '
  'annonce; det er godkendelsen, der skal vaere entydig. Migration 018, C-005.';

-- ============================================================
-- 5. C-006 — den niende funktion
-- ============================================================
-- 016 afsnit 5 haerdede otte af ni funktioner i public til search_path = ''.
-- unsubscribe_saved_search stod tilbage med search_path = public (efterproevet
-- i pg_proc.proconfig). Den er SECURITY DEFINER og eksekverbar af anon, saa
-- den er praecis den slags funktion, reglen blev skrevet for.
--
-- Kroppen er allerede skemakvalificeret — den rammer kun
-- public.saved_searches — saa '' bryder ingenting i dag. Pointen er, at det
-- ikke skal AFHAENGE af, at kroppen bliver ved med at vaere det.
alter function public.unsubscribe_saved_search(uuid) set search_path = '';

-- ============================================================
-- 6. Efterproevning efter koerslen
-- ============================================================
-- Forventet resultat, saa den, der koerer filen, kan se om den virkede:
--
--   select relname, relacl from pg_class c join pg_namespace n
--     on n.oid=c.relnamespace where n.nspname='public' and relkind='r';
-- -> anon skal staa som 'r' alene overalt undtagen reports, hvor den er 'ar'.
--
--   select defaclacl from pg_default_acl d join pg_namespace n
--     on n.oid=d.defaclnamespace
--    where n.nspname='public' and defaclobjtype='r'
--      and pg_get_userbyid(defaclrole)='postgres';
-- -> anon=r/postgres, authenticated=r/postgres (var arwdDxtm).
--
--   select proconfig from pg_proc where proname='unsubscribe_saved_search';
-- -> {search_path=""}
--
-- Og den vigtigste roeg-test, fordi den rammer den ene doer, vi holder aaben:
-- indberet en annonce fra sikkerhed.html som UDLOGGET. Den skal stadig virke.

-- PostgREST cacher rettigheder. Uden det her slaar aendringerne foerst igennem
-- ved naeste genstart af API'et.
notify pgrst, 'reload schema';
