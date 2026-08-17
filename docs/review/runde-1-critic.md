# Runde 1 — critic — AUDIT ONLY

**Commit ved start:** `4a33b41caf4deae2c4529676676ea4dfbf2dc18f` (2026-08-16 22:36:45 +0200)
**Målt:** 17.08.2026, kl. 17:19–18:05. Fire andre agenter arbejdede i repoet undervejs;
`js/data.js`, `js/opret-annonce.js`, `js/backend-bridge.js`, `js/components.js` og
`js/supabase-api.js` havde ubyggede ændringer i arbejdstræet under målingen.
**Ingen produktionsfil er rørt.** Ingen skrivning til databasen — alle DB-fund er
læsninger (`pg_class`, `pg_policies`, `pg_proc`, `pg_default_acl`, `pg_constraint`)
plus tolv anonyme GET mod REST-API'et.

**Note om metode:** dev-serveren på `:55945` svarede ikke (ingen lytter på porten,
efterprøvet med `Get-NetTCPConnection`). Jeg har derfor startet min EGEN server på
`:59321` med `PORT=59321 python scripts/dev-server.py` og målt der. Andres server
er ikke rørt eller genstartet.

**Note om `work/DECISIONS.md`:** filen siger i linje 7 "Kritikere må IKKE læse denne
fil". Min opgavebeskrivelse bad mig læse den. Jeg har læst den og siger det højt her,
så det er synligt, at min vinkel ikke længere er helt uafhængig af buildernes
begrundelser. Vurdér de fund, hvor jeg citerer den, med det i baghovedet.

---

## Findings

| ID | rolle | akse | severity | fil | problem | forslag | status |
|---|---|---|---|---|---|---|---|
| C-001 | critic | sikkerhed | P1 | `.github/workflows/deploy.yml:41` (`path: .`) | **Hele repoet ligger offentligt på bikerbasen.dk.** Efterprøvet med curl mod produktion: `supabase/schema.sql` HTTP 200, `supabase/016_luk_skrivehul.sql` HTTP 200, `sources/mcsyd.yaml` HTTP 200, `crawler/config.js` HTTP 200, `scripts/shared.js` HTTP 200, `work/DECISIONS.md` HTTP 200. 016 er det dokument, der beskriver hvilke huller der blev lukket OG hvilke der står åbne med vilje; `work/DECISIONS.md` er buildernes interne log med sætninger som "016 er skrevet, men IKKE koert". `docs/review/BACKLOG.md` svarer 404 i dag, kun fordi `docs/` er nyere end sidste deploy — mappen er ikke i `.gitignore` (`git check-ignore` giver ikke match), så **denne fil bliver også publiceret ved næste push til main** | Byg artefakten fra en allowlist i stedet for `path: .`, eller flyt `crawler/`, `supabase/`, `sources/`, `scripts/`, `work/` og `docs/` uden for det, der uploades. Sikkerheden hviler ikke på, at filerne er hemmelige — RLS holder, se C-002-testen — men et RLS-regelsæt og en intern beslutningslog hører ikke på et handelsdomæne | åben |
| C-002 | critic | sikkerhed | P2 | `supabase/016_luk_skrivehul.sql:31-43` | **Hullet er lukket, men fabrikken kører videre.** `pg_default_acl` viser stadig `anon=arwdDxtm` og `authenticated=arwdDxtm` på `objtype='r'` i skema `public` — fra BEGGE grantors (`postgres` og `supabase_admin`). Et view tæller som en "table", så præcis det mønster, der gav `anon` skriveadgang til `profiles` gennem `public_profiles`, gentager sig automatisk for det NÆSTE view eller den næste tabel, nogen opretter. 016 fjernede rettighederne på de to eksisterende views (efterprøvet: begge har nu kun `anon=rm/postgres`) og skrev endda advarslen i linje 31-33 — men kørte aldrig et `alter default privileges ... revoke` | `alter default privileges in schema public revoke insert, update, delete, truncate, references, trigger on tables from anon, authenticated;` — så er beskyttelsen strukturel i stedet for at afhænge af, at den næste builder læser linje 31 | åben |
| C-003 | critic | sikkerhed | P2 | `supabase/016_luk_skrivehul.sql:155-160` | **`profiles` har stadig INSERT og DELETE til `anon`.** ACL'en er `anon=ardDxtm/postgres` — kun `w` (UPDATE) er trukket tilbage. RLS lukker det i dag: `profiles` har præcis to politikker, "profil: læs egen" (SELECT) og "profil: opdater egen" (UPDATE), altså ingen INSERT- eller DELETE-politik, og uden politik er svaret nej. Men 016 formulerer selv princippet i linje 155 — "Vi fjerner grants'ene ovenpaa, saa beskyttelsen ikke hviler paa RLS alene" — og anvendte det kun på `crawl_koersler` og `search_notifications`. Samme mønster gælder `listings`, `favorites`, `reviews`, `krav`, `reports`, `listing_photos`, `listing_stats`, `saved_searches`, hvor `anon` har fuldt `arwdDxtm` og alene RLS står imellem | `revoke insert, update, delete on public.profiles from anon;` og tilsvarende for de øvrige otte tabeller, hvor `anon` ikke skal skrive. Ikke fordi RLS svigter i dag, men fordi én `using(true)`-politik skrevet i en fart så bliver en skrivetilladelse i stedet for en læsetilladelse | åben |
| C-004 | critic | sikkerhed | P2 | `js/components.js:569` + `reports`-tabellen | **Anonym, ubegrænset skrivekanal til produktionsdatabasen.** RLS-politikken "indberetning: alle må oprette" har rolle `public` og `with_check ((reporter_id IS NULL) OR (auth.uid() = reporter_id))` — altså må en udlogget indsætte rækker med `reporter_id = null`. `reports.comment` har INGEN længde-CHECK (efterprøvet i `pg_constraint`: kun `reason`, `status`, `target_type` er begrænsede), og `<textarea id="report-comment">` har ingen `maxlength`. Der er hverken captcha, rate limit eller størrelsesloft nogen steder i kæden, og `sb_publishable_*`-nøglen står i sidens kilde. Postgres `text` tager op til 1 GB pr. værdi. Til sammenligning HAR `listings` et `listings_text_len_chk` (description ≤ 5000) og `eksterne_annoncer` et `uddrag ≤ 200` — mønsteret findes, `reports.comment` og `reviews.comment` blev sprunget over | `alter table reports add constraint reports_comment_len check (char_length(comment) <= 2000);` plus `maxlength` på textarea'en. `reviews.comment` har samme manglende loft, men kun for indloggede og med én række pr. (seller, author), så dens radius er lille | åben |
| C-005 | critic | sikkerhed | P2 | `krav`-tabellen, INSERT-politikken "krav: opret eget" | **Claim-flowet kan selvgodkendes på papiret.** Politikkens `with_check` er kun `auth.uid() = bruger_id`. `status`, `metode`, `behandlet_af`, `behandlet` og `dokumentation` er alle klientstyrede, så en indlogget bruger kan POSTe `{status:'godkendt', metode:'domaene', behandlet_af:'<vilkårlig uuid>', behandlet:'now()'}` direkte til `/rest/v1/krav`. Det giver **ingen adgang i dag** — se "Det her er fint" nedenfor — men enhver senere admin-visning eller funktion, der læser `krav.status`, arver et selvgodkendt krav. Dertil: `unique (annonce_id, bruger_id)` betyder, at samme bruger ikke kan claime to gange, men **to forskellige brugere kan hver claime samme annonce**, og intet felt markerer konflikten. Og der er intet krav om e-mail-, CVR- eller MitID-verificering nogen steder i claim-stien — `profiles.email_verified` læses ikke | Læg `check (status = 'afventer')` i INSERT-politikkens `with_check`, eller flyt `status`/`behandlet*` til kolonner, `authenticated` ikke har INSERT på. Tilføj en delvis unique-index, der kun tillader ÉT `godkendt` krav pr. annonce. Og hvis verificering skal være betingelsen, skal den stå i politikken, ikke i en UI, der ikke findes endnu | åben |
| C-006 | critic | sikkerhed | P3 | `unsubscribe_saved_search` | Otte af ni funktioner i `public` blev hærdet til `search_path=""` af 016. Denne ene står stadig med `search_path=public` (`pg_proc.proconfig`), og den er `SECURITY DEFINER` og eksekverbar af `anon`. Den refererer allerede skemakvalificeret (`public.saved_searches`), så der er ingen kendt udnyttelse — det er en efterladt sten, ikke et hul | Sæt `search_path=""` som på de otte andre, så reglen er ensartet og ikke afhænger af, at kroppen bliver ved med at være skemakvalificeret | åben |
| C-007 | critic | kodefejl | P2 | `js/bike-art.js:90`, indlæst fra 12 HTML-sider | **8,2 kB død JavaScript på hver side.** `bikeArtSVG()` (plus `wheelSVG()` og `bodyFor()`) kaldes ingen steder. Efterprøvet med et script over alle 63 js/html-filer: de eneste to forekomster af navnet i hele repoet er selve definitionen og en KOMMENTAR i `js/home.js:1`. Pladsholderen tegnes i dag af `listingMediaHTML()` i `js/components.js:191-196`, som bruger `Icon.camera` og `.foto-tom` — ingen tegning. Filen er stadig `<script defer>` i annonce, dashboard, forhandler, index, login, maerker, mine-annoncer, opret-annonce, privatlivspolitik, sikkerhed, soegning, vilkaar, den skrives ind i genererede annoncesider (`scripts/build-listing-pages.js:253`) og den ligger i `browserModules` (`scripts/shared.js:133`) | Slet filen og de 12 script-tags plus de to byggereferencer. NB: `work/DECISIONS.md` beskriver `bikeArtSVG()`s `<rect>` som levende ("Tegningens egen baggrund … slukkes") — den beslutning er forældet og bør rettes samtidig, ellers genopfinder næste runde en afhængighed til en død fil | åben |
| C-008 | critic | kodefejl | P2 | `js/supabase-api.js:384` + `js/backend-bridge.js:411-424` | **En slugt fejl kan tømme brugerens gemte annoncer.** `listFavorites()` destrukturerer kun `{ data }` — fejlen kastes væk — og returnerer `[]`. Kæden: fejler læsningen, bliver `remoteIds = []`; `toPush` bliver så ALLE brugerens uuid-favoritter; hvert `db.addFavorite(id)` rammer primærnøglen `favorites_pkey (user_id, listing_id)` (efterprøvet i `pg_constraint`) og fejler som dublet; `remoteIds.push(id)` springes derfor over; og linje 423 skriver `localStorage.favorites = [...remoteIds, ...demoIds]` — altså **uden brugerens rigtige favoritter**. Hjerterne slukker, listen "Gemte" står tom. Rækkerne findes stadig i basen, så en senere lykket indlæsning henter dem tilbage — det er tab af visning, ikke af data. Samme mønster i `Store.toggleFavorite()` (`js/store.js:72`): DB-fejlen ender i `console.warn`, brugeren ser et rødt hjerte, og næste sideindlæsning fjerner det uden en linje tekst | Læs `error` i `listFavorites()` og lad `syncFavorites()` returnere UDEN at skrive til localStorage, når læsningen fejlede. En sammenfletning, der bygger på et tomt svar, må ikke være destruktiv. Og giv brugeren en toast, når et hjerte ikke kunne gemmes — `console.warn` er ikke en besked til nogen | åben |
| C-009 | critic | kodefejl | P3 | `js/opret-annonce.js`, byte-offset 7334 | **En rå NUL-byte gør filen binær for git og grep.** Kildens linje er `if (nuvaerende.join('\0') === TYPES.map(t => t.id).join('\0')) return;` — men `\0` står som en faktisk 0x00-byte i filen, ikke som escape-sekvensen. `node --check` er tilfreds og koden virker. Konsekvensen er værktøjet: `file` siger `data`, `grep` svarer "Binary file matches", og `git diff --stat HEAD~1` viser `js/opret-annonce.js | Bin 37806 -> 42392 bytes` i stedet for en diff. En fil, ingen kan review'e i en diff, er den fil, en fejl gemmer sig i — i en 42 kB fil, der ejer annonceoprettelsen | Erstat de to NUL-bytes med escape-sekvensen `\0` i kildeteksten (samme kørselsadfærd, tekstlig fil), eller brug en separator som `''` skrevet som escape. Overvej `*.js text` i `.gitattributes` som vagthund | åben |
| C-010 | critic | funktionalitet | P1 | `crawler/normalize.js:484-507`, `crawler/db.js:196` | **`fingerprint`-reglen er skrevet ned, men ikke implementeret.** Kommentaren i linje 485-486 lover: "Samme motorcykel annonceret tre steder skal være ÉN annonce hos os med tre kilde-links." Virkeligheden: hashen beregnes (`crawler/parse.js:144` og `:323`), gemmes (`supabase/014_aggregator.sql:53`) og indekseres (`:65`) — og læses aldrig. Efterprøvet: nul forekomster af `fingerprint` i `js/`, i `crawler/db.js`s læse- eller skrivesti, i `crawler/pipeline.js` og i nogen SQL-view. `skrivAnnoncer()` upserter på `onConflict: 'kilde_id,kilde_annonce_id'`, altså dedup PR. KILDE. Det er usynligt i dag, fordi `kilder` har én aktiv række (MC Syd) — men `sources/guloggratis.yaml` står med `aktiv: true` og `tilladelse_modtaget: true`. Første kørsel med to kilder giver samme motorcykel to kort i søgeresultatet, og "ét sted at se det hele" er så en påstand, siden selv modsiger | Beslut hvilken vej det skal være, og skriv den ÉT sted: enten grupperes på `fingerprint` i læsestien (én række, flere kilde-links), eller kommentaren i normalize.js:485 skal skrives om, så den beskriver det, koden gør. Den nuværende tilstand er den værste af de tre — et løfte med et indeks bag og ingen logik | åben |
| C-011 | critic | funktionalitet | P1 | `crawler/pipeline.js:198-201` | **Et selector-skift hos kilden kan tømme hele kataloget.** `markerBorte()` kaldes på hver fuld kørsel — `if (!toerloeb && !limit)` — uden nogen betingelse på, hvor mange annoncer kørslen fandt. Fem linjer tidligere logges endda `"ingen annoncer fundet. Selectors eller sidestruktur bør efterses"` (linje 172), og så kører markeringen alligevel i samme gennemløb. `KOERSLER_FOER_BORTE = 3` beskytter mod et hikke, jf. begrundelsen i `crawler/db.js:213-217 `— men et DOM-skift er ikke et hikke, det er permanent. Tre fulde kørsler med nul kort, og `graense` bliver starten på den tredjesidste kørsel; alle 332 rækker har `sidst_set` ældre end det og sættes til `'borte'`, hvorefter politikken "ekstern: offentlig laesning" (`status <> 'borte'`) skjuler dem. Sitet går fra 332 annoncer til 0. **Formildende:** der er ingen cron for crawleren — `deploy.yml` bygger kun, og kørsel er manuel (`npm run crawl`) — så en operatør VILLE kunne se advarslen. Den står bare midt i en flere hundrede linjer lang log, i samme kørsel som skaden sker | Spring `markerBorte()` over, når `annoncer.length === 0`. Bedre: spring over, når fundet er faldet mere end fx 40 % siden sidste afsluttede kørsel, og skriv hvorfor i loggen. Én betingelse står mellem et kosmetisk skift hos MC Syd og et tomt katalog | åben |
| C-012 | critic | funktionalitet | P2 | `crawler/pipeline.js:103-122` | **Ingen afbrydelse ved gentagne 4xx.** `berigMedDetaljer()` løber alle annoncer igennem uanset hvor mange der fejler. `tal.fejlede` tælles, men bruges kun til at DÆMPE loggen (`if (tal.fejlede <= 3) log.skriv(...)`) — aldrig til at stoppe. Statuskoden ER kendt: `crawler/hent.js:89-91` kaster `HTTP 403 på <url>`. Så begynder kilden at afvise os, laver crawleren alligevel 332 forespørgsler med `crawl_delay_ms = 2000` — elleve minutters bankning på en kilde, der aktivt siger nej. For en crawler, der kører på et skriftligt ja (`sources/mcsyd.yaml:31`), er det præcis den adfærd, der får et ja trukket tilbage. Samme mangel i `indsamlAnnoncer()`: hver liste-URL fejler for sig og løkken fortsætter | Stop kørslen efter fx 5 sammenhængende 4xx og skriv statuskoden i afslutningen af `crawl_koersler`. Skeln 403/429 (bak ud, alarmér) fra 404 (annoncen er væk) — de to kræver modsatte reaktioner, og i dag ender de i samme `continue` | åben |
| C-013 | critic | funktionalitet | P2 | `crawler/config.js:130-131` | **De juridiske spærrer er attestationer, ikke kontroller.** Jeg rører dem ikke, men de virker ikke, som navnene lover. (a) `robots.txt` hentes eller parses ALDRIG i kørselsstien — efterprøvet: de eneste `robots`-forekomster i `crawler/` er `kraev('robots_tjekket', Boolean(k.robots_tjekket), …)` og et felt, der kopieres til `kilder.robots_hentet`. Tilføjer mcsyd.dk `Disallow: /Produkter/` i morgen, kører crawleren videre. (b) `tilladelse_modtaget` gates på `Boolean()`. `sources/mcsyd.yaml:31` skriver en dato (`2026-08-16`), men `sources/guloggratis.yaml:35` skriver bare `true` — og `true` er nok. `work/DECISIONS.md` kalder feltet "en nedskrivning af, at en aftale findes"; en bar `true` nedskriver hverken hvornår, med hvem eller under hvilke vilkår | Behold spærrerne, gør dem strengere: kræv en dato på `tilladelse_modtaget` (`kraev(..., /^\d{4}-\d{2}-\d{2}$/.test(String(k.tilladelse_modtaget)), ...)`), og hent robots.txt én gang pr. kørsel og afbryd, hvis en liste- eller detalje-URL er disallowed. En spærre, der kun kan svare "feltet er udfyldt", beskytter dokumentationen — ikke kilden | åben |
| C-014 | critic | seo | P1 | `scripts/shared.js:39-64` (`fetchListings`) | **Produktionssitet har 7 indekserbare adresser og NUL annonce- eller mærkesider.** `fetchListings()` henter kun fra `listings` — `/rest/v1/listings?status=eq.active` — og `listings` har **0 rækker** (målt). `eksterne_annoncer` har **332 aktive rækker** og læses ikke af byggekæden overhovedet. Derfor producerer `build-listing-pages.js` nul sider, `build-brand-pages.js` nul mærkesider, og sitemappet nul annonce- og forhandler-URL'er. Efterprøvet direkte mod produktion: `sitemap.xml` = 7 `<loc>` (index, soegning, maerker, opret-annonce, sikkerhed, vilkaar, privatlivspolitik), `https://bikerbasen.dk/maerke-honda.html` → **404**, `https://bikerbasen.dk/annonce-suzuki-gsx-r750-2017-1017.html` → **404**. Og `maerker.html` — en af de syv — har nul links til `maerke-*.html`; dens 60 mærkelinks peger alle på `soegning.html?brands=X`, som canonical'er tilbage til bare `soegning.html`. Long-tailen findes altså hverken som sider eller som links | Mærkesider er VORES egen aggregering — et antal, et prisspænd, links ind i vores søgning — ikke en kopi af kildens annoncetekst. De kan bygges af `eksterne_annoncer` uden at røre `noindex`-reglen på selve de kopierede annoncer (`js/annonce.js:335`), som skal blive, hvor den er. Det er den ene ændring, der giver siden noget at rangere på. Beslutningen er menneskets, ikke min | åben |
| C-015 | critic | seo | P1 | `js/seo.js:191-205` (`seoSearchResults`) | **Søgesidens struktureret data peger på 404'ere.** Hver `ListItem.url` sættes til `listingPageUrl(l)`. Målt på `soegning.html?types=sport&priceMax=60000&koerekort=A2`: ItemList'et navngiver `https://bikerbasen.dk/annonce-honda-cbr-250-r-2011-72eb6a40.html` og `https://bikerbasen.dk/annonce-ktm-rc-390-2021-1032.html`. Den første er en EKSTERN annonce (`72eb6a40` er uuid-præfikset) — og eksterne annoncer får hverken en genereret side (`fetchListings` ser dem ikke, C-014) eller lov at blive indekseret (`noindex, follow`, `js/annonce.js:335`). Efterprøvet mod produktion: `annonce-*.html` svarer 404. Google får altså en ItemList, hvor hver enkelt URL er død | `listingPageUrl()` må kun bruges til annoncer, der HAR en genereret side. For eksterne bør posten enten udelades eller pege på `annonce.html?id=<uuid>` — men den er `noindex`, så udeladelse er det ærlige. Alternativt bortfalder problemet af sig selv, hvis C-014 løses | åben |
| C-016 | critic | seo | P2 | `js/seo.js:118` og `:145` | **Struktureret data påstår et foto, siden selv nægter at påstå.** `const image = (photoUrls && photoUrls[0]) || `${SITE_URL}/og-image.png`` — og `vehicle.image` får den værdi. Målt på `annonce.html?id=1017`: siden viser korrekt "Ingen fotos i denne annonce" (`.gallery-tom`), mens `jsonld-vehicle` erklærer `image: ["https://bikerbasen.dk/og-image.png"]`, altså Bikerbasens eget delingsbillede, som om det var motorcyklen. Det er samme fejl, som `buildPhotoSet()` netop blev rettet for at fjerne fra DOM'en — den er bare flyttet ned i `<head>`. Googles retningslinjer for køretøjsannoncer forventer, at `image` ER køretøjet | Udelad `image` fra `vehicle`, når `photoUrls` er tom. `og:image` kan gerne blive — et delingskort er et kort om SIDEN — men `Vehicle.image` er en påstand om produktet. "Ærlighed slår fuldstændighed" gælder også i JSON-LD | åben |
| C-017 | critic | seo | P3 | `js/seo.js:191` | Søgesidens `<title>` og `meta description` er identiske på hver facet. Målt: `?types=cross&brands=Harley-Davidson&priceMax=1000&koerekort=A1` giver `<title>Søg motorcykler — Bikerbasen</title>` og "Søg og filtrer blandt brugte motorcykler til salg i Danmark på Bikerbasen." — mens `<h1>` tilpasser sig korrekt til "Brugte Harley-Davidson til salg". `seoSearchResults()` kalder aldrig `Seo.setSocial()`. Rangeringsmæssigt er det næsten uden betydning, fordi canonical samler alle facetter på én adresse (og det er rigtigt, se nedenfor) — men det er fanebladet og det delte link, der intet siger | Lad `seoSearchResults()` sætte titel og description ud fra samme kilde som `h1` (uden at røre canonical). Lav prioritet | åben |
| C-018 | critic | seo | P3 | alle 14 HTML-sider, `<html lang="da">` | Specifikationen siger `lang="da-DK"`; sitet har `lang="da"` på alle fjorten sider (efterprøvet). `da` er gyldig BCP-47 og fuldt tilstrækkeligt for Google og for skærmlæsere — dette er en afvigelse fra en aftale, ikke en fejl med en konsekvens jeg kan måle | Enten ret de fjorten attributter til `da-DK`, eller ret specifikationen. Jeg vil ikke påstå, at `da` koster noget | åben |
| C-019 | critic | seo | P3 | `js/search.js:1695-1727` | Der er ingen `noindex` på et søgeresultat med nul træf. Målt: `?types=cross&brands=Harley-Davidson&priceMax=1000&koerekort=A1` har intet `<meta name="robots">`. Det er i praksis dækket — canonical peger på bare `soegning.html`, så den tomme facet indekseres ikke som sin egen side, og `jsonld-results` fjernes korrekt, når listen er tom. Nævnt for fuldstændighedens skyld, ikke fordi jeg har målt en skade | `Seo.setMeta(... 'noindex, follow')` når `total === 0`, hvis man vil have livrem og seler | åben |

---

## Det her er fint

Sagt fordi det er efterprøvet, ikke for at være flink.

**Claim-flowet kan ikke eskaleres til skriveadgang.** Jeg gik efter kæden
`krav` → ejerskab → `ret_ekstern_annonce` og den holder. Der er INGEN trigger på
`krav` (`pg_trigger` viser kun `trg_listings_touch`, `on_listing_active`,
`trg_profiles_touch`), så et selvgodkendt krav sætter ikke `eksterne_annoncer.ejet_af`.
`ejet_af` kan kun skrives af `service_role`: ACL'en for `anon` og `authenticated` på
`eksterne_annoncer` er `rDxtm` — intet `w` — og `crawler/db.js:121` holder kolonnen
ude af crawlerens `KOLONNER` med vilje. `ret_ekstern_annonce` gater på
`ejet_af = auth.uid()` og returnerer `false` i stedet for at kaste, og dens
felt-whitelist er 15 navne, hvor `%I` i `format()` gør identifier-injektion umulig.
Det er ordentligt lavet.

**Ingen IDOR på dashboard, mine-annoncer eller opret-annonce.** Efterprøvet i
politikkerne, ikke gættet: `listings` SELECT er `status='active' OR auth.uid()=seller_id`,
så en fremmed `hidden`/`sold` annonce kan ikke læses; UPDATE og DELETE kræver
ejerskab. `listing_stats` SELECT kræver, at man ejer annoncen — visningstal lækker
ikke. `listing_photos` kræver, at forælderen er aktiv eller ejet. `favorites`,
`saved_searches`, `krav` og `reports` er alle scopet til egen bruger.
Dertil har `startEditing()` (`js/opret-annonce.js:757-762`) et eksplicit ejer-tjek
i klienten OVEN PÅ RLS, og `updateListing()` bruger `.select().single()`, så en
RLS-afvist opdatering giver PGRST116 i stedet for et tavst "gemt". Begge dele er
den rigtige rækkefølge.

**Den anonyme læseflade er stram.** Tolv GET mod REST-API'et med den offentlige
nøgle: `profiles`, `krav`, `reports`, `listing_stats`, `favorites`, `reviews` og
`saved_searches` svarer alle `[]`; `crawl_koersler` og `search_notifications` svarer
HTTP 401 "permission denied" på privilegie-niveau. `public_profiles` udstiller
præcis `id, name, city, is_dealer, company, member_since, verified` — **ingen
`phone`, ingen `cvr`, ingen `stripe_*`**. Sidens løfte i `js/annonce.js:205`
("Kontaktoplysninger … er kun synlige for indloggede brugere. Det holder
telefonnumre væk fra robotter") er altså en påstand, siden faktisk kan bakke op.
Det er ikke en selvfølge, og det var dét, jeg forventede at kunne vælte.

**Escaping-disciplinen er konsekvent.** Jeg ledte målrettet efter brugerinput i
`innerHTML` uden `escapeHTML()` og fandt ingen. `js/components.js` escaper
titel, variant, alt-tekst, domæne, salgsmarkører, specværdier, kørekort-titel,
sted og sælgerlinje hver for sig; `listingCardHTML()` escaper `brand`/`model`/`city`
én gang og bruger med vilje de RÅ værdier i pris-tooltippet for ikke at dobbelt-escape
et `&` (og escaper hele strengen bagefter). `sikkerUrl()` afviser alt uden
`https?://`, fordi `escapeHTML` ikke ville stoppe `javascript:`. Anmeldelseskommentarer
(`js/forhandler.js:220`), dashboardets tabeller og søjler
(`js/dashboard.js:153, 172, 267`) er alle escapede. Kun `${kilde}` i
`externalCardHTML` ser uescaped ud i skabelonen — den er escapet i linje 395, før
den bruges.

**Søgningen virker, kombineret og delbar.** Målt i en forrest fane på topniveau,
ikke i en iframe: `?types=sport&priceMax=60000&koerekort=A2` → "2 annoncer fundet",
Honda CBR 250 R (29.800 kr.) og KTM RC 390 (44.900 kr.) — begge sport, begge under
60.000, begge med A2-mærkat. Fire filtre samtidig
(`?types=sport&priceMax=60000&kmMax=40000&koerekort=A2`) giver samme to og fire
korrekte filterpiller. En FRISK fane med
`?types=sport&priceMax=60000&koerekort=A2&sort=price-desc&page=1` giver samme resultat,
`#sort-select` står på `price-desc`, og prisrækkefølgen er 44.900 → 29.800.
`page=1` strippes korrekt som standardværdi. Et ugyldigt `?sort=pris-asc` falder
pænt tilbage til `blandet` i stedet for at vælte.

**Nul resultater er håndteret ordentligt.** Ikke en blank side: "Ingen annoncer
matcher dine filtre", "Prøv at fjerne et filter eller udvide dit prisinterval",
en synlig "Nulstil filtre"-knap (kun når der ER filtre at nulstille), de fire
aktive filterpiller, og et tilbud om at gemme søgningen som søgeagent. 370 px
synligt indhold. `jsonld-results` fjernes, når listen er tom, i stedet for at
udgive et `ItemList` med `numberOfItems: 0`. Jeg var på vej til at skrive det
modsatte fund, fordi jeg først kiggede inde i `#view-grid` — tom-tilstanden er
et søskendeelement. Værd at nævne, så næste kritiker ikke laver samme fejl.

**Facet-canonical er rigtig.** Hver filtreret søgeside canonical'er til
`https://bikerbasen.dk/soegning.html` — målt på tre forskellige facetkombinationer.
Det er præcis den rigtige håndtering af duplicate content fra facetter, og det er
sjældent, at den er på plads.

**`noindex` sidder de rigtige steder.** Eksterne annoncedetaljer får
`noindex, follow` med en begrundelse, der holder (`js/annonce.js:335`: "en kopi af
forhandlerens annonce skal ikke konkurrere med originalen"). "Annoncen findes ikke"
får `noindex, follow` (`:744`). `dashboard.html`, `mine-annoncer.html`, `login.html`,
`afmeld.html` og `404.html` har alle `noindex` i markup'en, og `build-brand-pages.js:355`
holder `login.html` ude af sitemappet med en rigtig begrundelse. `robots.txt` er
gyldig og peger på sitemappet. `.git/config` svarer 404 i produktion.

**JSON-LD'ets struktur er korrekt på annoncesiden.** Målt på `?id=1017`:
`@type: Motorcycle` (gyldig `Vehicle`-undertype), `offers` som `Offer` med
`price: 62900`, `priceCurrency: "DKK"`, `availability: InStock`,
`itemCondition: UsedCondition` og `priceValidUntil: 2026-09-16` — og prisen stemmer
med de synlige 62.900 kr. på siden. `mileageFromOdometer` bruger `unitCode: "KMT"`,
`engineDisplacement` bruger `unitCode: "CMQ"` (kubikcentimeter) — begge korrekte
UN/CEFACT-koder, og det er den slags, der plejer at være gættet. `enginePower`
kommer kun med, når `listing.power` findes. `Offer.seller` er `AutoDealer` med
adresse for forhandlere og `Person` med kun `addressLocality` for private — navnet
lækker aldrig i struktureret data. `BreadcrumbList` er der i tre niveauer med
absolutte `item`-URL'er, og `maerker.html` har sin egen gyldige `BreadcrumbList`.
Kun `image` er forkert, og det er C-016.

**Funktioner defineret men aldrig kaldt: tælling = 0.** Det var den tilbagevendende
fejl fem gange, og denne runde er den ikke der. Jeg scannede 414 deklarationer
(`function f()`, `const f = () =>`, `const f = function`) i 63 filer og holdt hvert
navn op mod alle kaldsteder i js/ + crawler/ + scripts/ + alle 14 HTML-sider, med
kommentarer strippet. De 18 rå udfald var alle handlers eller callbacks givet
videre ved reference (`addEventListener('click', toggleTheme)`,
`requestAnimationFrame(step)`, `.sort(bedstFoerst)`, `.map(normalizeExternalListing)`)
— altså rigtige kald. Undtagelsen er ikke en funktion, men en hel fil: C-007.

**`await` uden try/catch: ingen reelle fund.** 139 `await` gennemgået. Alle
sidernes opstart hænger på `await backendReady()`, og `backendReady()`
(`js/backend-bridge.js:478-497`) har sin egen try/catch om hele arbejdet og
returnerer altid — så en død database giver et site på lokale data, ikke en side,
der stopper midt i `DOMContentLoaded`. `loadExternalListings()` fanger sin fejl og
returnerer `[]` med en eksplicit kommentar om, at eksterne ikke må tage egne
annoncer med sig. Resten er supabase-js-kald, der returnerer `{data, error}` frem
for at kaste, og hvor `error` faktisk tjekkes. Den ene undtagelse er C-008, hvor
`error` ikke destruktureres — den står som sit eget fund.

**Gaten er grøn.** `node --check` på alle 42 js-filer: nul syntaksfejl.
`npm test`: 130 beståede, 0 fejlede.

---

## Hvor står sitet teknisk

Håndværket er over gennemsnittet, og det er ikke en høflighed. Escaping er
konsekvent gennemført i seks filer med 115 `escapeHTML`-kald. RLS er ikke bare slået
til — politikkerne er faktisk scopet, og jeg fandt intet IDOR, hverken på
annoncer, fotos, statistik, favoritter, søgeagenter, krav eller indberetninger.
Facet-canonical er rigtig, `noindex` sidder de rigtige steder, JSON-LD'ets enheder
er korrekte, søgningen kombinerer fire filtre rigtigt og er fuldt delbar, og
tom-tilstanden er den bedste enkeltdel, jeg har set i repoet. Crawlerens pipeline
isolerer fejl på fire niveauer og advarer om selector-skift, tomme lister, manglende
hk og felter uden kolonne. Det er ikke en prototype.

Problemerne er ikke i håndværket. De er tre steder, hvor en regel er SKREVET NED
uden at være HÅNDHÆVET, og hvor nedskrivningen får den næste læser til at tro, at
sagen er lukket:

1. **`fingerprint`** har en kommentar, en kolonne og et indeks — og ingen logik
   (C-010). Anden kilde er allerede `aktiv: true`.
2. **`markerBorte`s tre-kørsels-værn** beskytter mod et hikke, men står i samme
   gennemløb som advarslen om, at kilden har skiftet DOM (C-011).
3. **`robots_tjekket` og `tilladelse_modtaget`** gates på `Boolean()`. De beskytter
   dokumentationen af en aftale, ikke kilden (C-013).

Og oven på det: **hele den indekserbare flade er syv statiske sider.** 332 annoncer
i basen, nul annoncesider, nul mærkesider, 404 på begge (C-014). En markedsplads,
Google ikke kan se, er teknisk velbygget og kommercielt usynlig. Det er det, der
koster mest af alt i denne runde.

## Den ene ting, der bekymrer mig mest

**C-001: hele repoet ligger offentligt på bikerbasen.dk lige nu.**

Ikke fordi RLS falder — den holder, jeg prøvede tolv gange. Men fordi
`https://bikerbasen.dk/supabase/016_luk_skrivehul.sql` svarer HTTP 200, og den fil
er en gennemgang af, hvilke sikkerhedshuller der blev lukket og hvilke der står
åbne med vilje. Fordi `https://bikerbasen.dk/work/DECISIONS.md` svarer HTTP 200 og
er buildernes interne log, med sætninger som "016 er skrevet, men IKKE koert" og
"ERROR'en staar aaben". Fordi `sources/mcsyd.yaml` udleverer crawlerens selectors
og aftalegrundlag. Og fordi `docs/` ikke er i `.gitignore` — så **det her dokument,
med nitten navngivne svagheder og linjenumre, bliver publiceret på handelsdomænet
ved næste push til main.** Det er den eneste af mine fund, der forværrer alle de
andre, og den er allerede sand i produktion.

Tættest på: **C-011**, der har den største radius, hvis den udløses — 332 annoncer
til nul, én betingelse fra at være umulig. Og **C-014**, der koster mest i kroner
hver dag, den står åben.
