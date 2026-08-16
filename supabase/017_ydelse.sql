-- Bikerbasen migration 017: ydelse — fremmednoegle-indexes og RLS-initplan.
-- Koer hele filen i Supabase SQL Editor. Kan koeres igen uden skade.
--
-- ROEKKEFOELGE: koer 016_luk_skrivehul.sql FOERST. 016 lukker hullerne, 017
-- tager kun de to INFO-fund fra ydelsesraadgiveren. De to filer roerer intet
-- af det samme, saa raekkefoelgen er ikke kritisk for korrektheden — men 016
-- er den, der haster.
--
-- HVORFOR OVERHOVEDET? Siden har lav trafik i dag. Begge fund koster derfor
-- ingenting lige nu, og det er praecis derfor de skal ordnes nu: de er begge
-- af den slags, der er usynlige indtil tabellen er stor, og saa er de pludselig
-- en langsom side, ingen kan pege paa aarsagen til. En tom tabel er det
-- billigste tidspunkt at bygge et index paa.

-- ============================================================
-- 1. Fremmednoegler uden index
-- ============================================================
-- Postgres laver AUTOMATISK et index for en PRIMARY KEY og for en UNIQUE, men
-- ALDRIG for en FOREIGN KEY. Det overrasker de fleste, og konsekvensen er to
-- ting:
--
--   a) Sletning i FORAELDERTABELLEN. Naar en raekke i listings eller profiles
--      slettes, SKAL Postgres bevise, at ingen barneraekke peger paa den. Uden
--      index paa barnets noeglekolonne er beviset en fuld scanning af hele
--      barnetabellen — pr. slettet foraelderraekke. "Slet min annonce" og
--      "slet min bruger" er altsaa de to knapper, der bliver langsomme foerst,
--      og de er begge knapper, brugeren venter paa.
--
--   b) Opslag den anden vej. Flere af kolonnerne er samtidig dem, RLS-
--      politikkerne i afsnit 2 filtrerer paa. Et index paa bruger_id er det,
--      der goer "krav: laes eget" til et opslag i stedet for en scanning.
--
-- Verificeret 16.08.2026: alle syv mangler stadig et daekkende index (kontrolleret
-- mod pg_constraint/pg_index, ikke mod raadgiverens liste alene). De oevrige
-- elleve fremmednoegler i public har allerede et.
--
-- Ikke CONCURRENTLY: create index concurrently kan ikke koere inde i en
-- transaktion, og hele filen er ment til at blive indsat i ét stykke i SQL-
-- editoren. Tabellerne er sub-1000 raekker, saa laasen holdes i millisekunder.
-- Den dag en af dem er stor, skal et nyt index laves concurrently for sig.

-- listings -> favorites. Rammer "fjern min annonce": uden det her scannes hele
-- favorites for hver slettet annonce. Samtidig den join, my_listing_saves()
-- haenger paa (favorites f join listings l on l.id = f.listing_id).
create index if not exists favorites_listing_idx
  on public.favorites (listing_id);

-- profiles -> reviews. Bruges baade ved sletning af en bruger og af
-- politikkerne "anmeldelse: ret egen" og "anmeldelse: slet egen", der begge
-- filtrerer paa author_id. Bemaerk: det findes et unikt index no_self_review
-- (seller_id, author_id), men author_id staar som ANDEN kolonne, og et
-- btree-index kan kun bruges fra venstre. Det taeller derfor ikke.
create index if not exists reviews_author_idx
  on public.reviews (author_id);

-- profiles -> reports. "indberetning: laes egne" filtrerer paa reporter_id.
-- Kolonnen er nullable (udloggede maa indberette), og et btree-index springer
-- null-raekkerne over — det passer praecis til den forespoergsel.
create index if not exists reports_reporter_idx
  on public.reports (reporter_id);

-- profiles -> krav (bruger_id). "krav: laes eget" filtrerer paa den.
create index if not exists krav_bruger_idx
  on public.krav (bruger_id);

-- profiles -> krav (behandlet_af). Ingen forespoergsel bruger den i dag; den
-- er her udelukkende for a): uden den scanner en brugersletning hele krav.
create index if not exists krav_behandlet_idx
  on public.krav (behandlet_af);

-- profiles -> eksterne_annoncer. ret_ekstern_annonce() slaar op paa
-- (id, ejet_af), og id er primaernoegle, saa selve RPC'en er hurtig nok. Det
-- her index er til a) og til "vis de annoncer, jeg har overtaget".
create index if not exists eksterne_ejet_af_idx
  on public.eksterne_annoncer (ejet_af);

-- listings -> search_notifications. Ren service_role-tabel, men den vokser med
-- én raekke pr. udsendt agentmail og bliver dermed den stoerste barnetabel
-- under listings. Uden index bliver "slet min annonce" langsommere jo laengere
-- soegeagenterne har koert.
create index if not exists search_notif_listing_idx
  on public.search_notifications (listing_id);

-- ============================================================
-- 2. auth.uid() genevalueret pr. raekke i RLS-politikker
-- ============================================================
-- auth.uid() er markeret STABLE, ikke IMMUTABLE. Staar den bart i en RLS-
-- politik, betragter planlaeggeren den som en del af raekkefiltret og kalder
-- den én gang PR. RAEKKE, den overvejer. Pakkes den i en skalar underforespoergsel
-- — (select auth.uid()) — bliver den til en InitPlan: kaldt én gang for hele
-- forespoergslen, og resultatet behandlet som en konstant.
--
-- Det er ikke bare faerre funktionskald. Det er ogsaa det, der goer, at
-- vaerdien kan bruges som opslagsnoegle i indexene fra afsnit 1 i stedet for
-- at blive evalueret oven paa en scanning.
--
-- Semantikken er uaendret: auth.uid() laeser JWT'et fra sessionen og er
-- konstant hele forespoergslen igennem. Der findes ingen forespoergsel, hvor
-- de to former giver forskellige raekker.
--
-- ALTER POLICY, ikke drop + create: navnet, rollen og kommandoen bevares, og
-- der er intet oejeblik, hvor tabellen staar uden politik. Hver saetning
-- angiver praecis de klausuler, politikken faktisk har — en SELECT-politik har
-- ingen with check, en INSERT-politik har ingen using, og Postgres afviser at
-- faa foraeret den forkerte. Koeres filen igen, saettes det samme udtryk igen.
--
-- Alle atten udtryk er afproevet mod produktionsskemaet 16.08.2026 som rene
-- SELECT'er (samme praedikat, ingen DDL), saa kolonnenavne og typer er
-- verificeret — ikke afskrevet.

-- ---------- favorites ----------
alter policy "favorit: kun egne" on public.favorites
  using       ((select auth.uid()) = user_id)
  with check  ((select auth.uid()) = user_id);

-- ---------- krav ----------
alter policy "krav: laes eget" on public.krav
  using       ((select auth.uid()) = bruger_id);

alter policy "krav: opret eget" on public.krav
  with check  ((select auth.uid()) = bruger_id);

-- ---------- listing_photos ----------
-- auth.uid() ligger inde i en EXISTS-underforespoergsel. Den blev alligevel
-- genevalueret for hvert billede, fordi underforespoergslen koeres pr. raekke.
alter policy "billede: offentlig læsning" on public.listing_photos
  using (exists (
    select 1 from public.listings l
    where l.id = listing_photos.listing_id
      and (l.status = 'active' or l.seller_id = (select auth.uid()))
  ));

alter policy "billede: skriv til egen annonce" on public.listing_photos
  using (exists (
    select 1 from public.listings l
    where l.id = listing_photos.listing_id
      and l.seller_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.listings l
    where l.id = listing_photos.listing_id
      and l.seller_id = (select auth.uid())
  ));

-- ---------- listing_stats ----------
alter policy "statistik: kun egen annonce" on public.listing_stats
  using (exists (
    select 1 from public.listings l
    where l.id = listing_stats.listing_id
      and l.seller_id = (select auth.uid())
  ));

-- ---------- listings ----------
-- Den her er den vigtigste af de atten: den koerer paa HVER eneste
-- forespoergsel mod listings, ogsaa for udloggede, altsaa paa forsiden og i
-- hele soegningen. Med bart auth.uid() betaler en udlogget besoegende et
-- funktionskald pr. annonce for at faa svaret "nej, du ejer den ikke".
alter policy "annonce: offentlig læsning" on public.listings
  using (status = 'active' or (select auth.uid()) = seller_id);

alter policy "annonce: opret egen" on public.listings
  with check  ((select auth.uid()) = seller_id);

alter policy "annonce: opdater egen" on public.listings
  using       ((select auth.uid()) = seller_id)
  with check  ((select auth.uid()) = seller_id);

alter policy "annonce: slet egen" on public.listings
  using       ((select auth.uid()) = seller_id);

-- ---------- profiles ----------
alter policy "profil: læs egen" on public.profiles
  using       ((select auth.uid()) = id);

alter policy "profil: opdater egen" on public.profiles
  using       ((select auth.uid()) = id)
  with check  ((select auth.uid()) = id);

-- ---------- reports ----------
-- reporter_id er null for udloggede indberetninger, og null-grenen skal blive
-- staaende foerst: en udlogget bruger skal kunne indberette uden at
-- auth.uid()-sammenligningen naas.
alter policy "indberetning: alle må oprette" on public.reports
  with check  (reporter_id is null or (select auth.uid()) = reporter_id);

alter policy "indberetning: læs egne" on public.reports
  using       ((select auth.uid()) = reporter_id);

-- ---------- reviews ----------
alter policy "anmeldelse: skriv som sig selv" on public.reviews
  with check  ((select auth.uid()) = author_id);

alter policy "anmeldelse: ret egen" on public.reviews
  using       ((select auth.uid()) = author_id)
  with check  ((select auth.uid()) = author_id);

alter policy "anmeldelse: slet egen" on public.reviews
  using       ((select auth.uid()) = author_id);

-- ---------- saved_searches ----------
alter policy "søgeagent: kun egne" on public.saved_searches
  using       ((select auth.uid()) = user_id)
  with check  ((select auth.uid()) = user_id);

-- ============================================================
-- 3. Statistik, saa planlaeggeren opdager de nye indexes
-- ============================================================
-- Et nyt index bliver ikke brugt, hvis planlaeggeren stadig tror, tabellen er
-- tom. Flere af tabellerne her har aldrig vaeret analyseret (reltuples = -1).
analyze public.favorites;
analyze public.reviews;
analyze public.reports;
analyze public.krav;
analyze public.eksterne_annoncer;
analyze public.search_notifications;
analyze public.listings;
analyze public.profiles;

-- ============================================================
-- 4. De ubrugte indexes: bevidst urørte
-- ============================================================
-- Ydelsesraadgiveren melder syv indexes med nul scanninger:
--   eksterne_koerekort_idx, listings_active_created_idx, listings_active_idx,
--   listings_equipment_idx, listings_facets_idx, listings_seller_idx,
--   reports_status_idx
--
-- De bliver staaende. "Aldrig brugt" og "unoedvendig" er ikke det samme paa en
-- side med lav trafik og én rigtig annonce i listings: pg_stat_user_indexes
-- taeller kun det, der FAKTISK er sket, og der er naesten ingenting sket endnu.
-- Planlaeggeren vaelger sekventiel scanning paa en tabel med én raekke uanset
-- hvor godt indexet passer — taelleren siger altsaa noget om trafikken, ikke
-- om indexet.
--
-- Og hvert enkelt af dem svarer til en soegevej, siden allerede har:
-- listings_facets_idx er filterpanelet (maerke/type/pris/aargang),
-- listings_equipment_idx er udstyrsfiltret, eksterne_koerekort_idx er
-- A1/A2/A-udledningen paa de eksterne annoncer, listings_active_* er forsidens
-- "nyeste foerst". At droppe dem nu ville betyde at bygge dem igen praecis den
-- dag trafikken kom — altsaa den dag, det goer ondt at bygge dem.
--
-- Prisen for at lade dem ligge er maalt: 136 kB tilsammen, det stoerste 32 kB.
-- Det er mindre end ét annoncefoto. Vurder dem igen, naar listings har passeret
-- nogle tusinde raekker OG taelleren stadig staar paa nul — foer da er tallet
-- ikke bevis for noget.

-- PostgREST cacher skemaet. De aendrede politikker slaar igennem uden det her,
-- men vi beder alligevel om en genindlaesning, saa tilstanden er entydig.
notify pgrst, 'reload schema';
