# Næste prompter — Bikerbasen

Otte arbejdsprompter, klar til at køre én ad gangen i nye, uafhængige
sessioner. Rækkefølgen følger: ærlig kommunikation og indekseringsfejl (1-2)
→ udbud (3-5) → e-mailopsamling og SEO-struktur (6-7) → forhandler- og
betalingsinfrastruktur (8). Ingen af dem lægger vægt på UI-polish eller
ydelse — det er bevidst, jf. prioritetsrækkefølgen udbud → ærlighed →
trafik → penge.

Baggrund alle prompter deler: produktionsdatabasen har **392 aktive,
aggregerede annoncer** (verificeret 2026-08-19, se `docs/discovery.md`
afsnit 3) fra to forhandlerkilder (MC Syd, Gul og Gratis) og **0 egne
annoncer**. Supabase MCP-serveren kræver godkendelse af brugeren
(`/mcp` eller `claude mcp`), før den kan bruges — flere af prompterne
nedenfor forudsætter det.

---

## Prompt 1 — Ærlig kommunikation: ret løftet om "annoncer fra private"

**Hvorfor først:** Fase 3-verifikation viste, at `index.html` og
`soegning.html` lover "hundredvis af annoncer fra private og forhandlere",
mens der reelt er 0 private annoncer og 392 aggregerede opslag fra to
forhandlerkilder, som Bikerbasen ikke selv hoster. Det er i direkte
modstrid med "vi gætter aldrig"-positioneringen — det er ikke en gættet
værdi i en annonce, men et ugrundet løfte på selve forsiden, og derfor det
mest alvorlige ærlighedsproblem, der er fundet.

**Prompt:**
```
Vi driver Bikerbasen.dk, en dansk markedsplads for motorcykler
(repo: statisk HTML/CSS/vanilla JS, Supabase-backend, ingen framework).
Positioneringen er "vi gætter aldrig" — findes en oplysning ikke, skal
siden sige det, ikke antage det.

Produktionsdatabasen har lige nu 0 rækker i public.listings (egne,
brugeroprettede annoncer) og 392 aktive rækker i public.eksterne_annoncer
(aggregerede opslag fra forhandlerkilderne MC Syd og Gul og Gratis, som vi
IKKE selv hoster — køberen sendes videre til kildens side).

Ret alle steder på siden, der påstår eller antyder, at der findes annoncer
FRA PRIVATE, eller at Bikerbasen selv "har" eller "hoster" annoncerne.
Start med:
- index.html: <title>, meta name="description", og:description
- soegning.html: samme tre felter
- forhandler.html: samme tre felter, hvis relevant
- js/home.js: al tekst der genereres om lagerets sammensætning
  (søg efter "private" og "forhandlere" i strenge)

Formuleringen skal være sand for den faktiske sammensætning: 0 private,
392 aggregerede fra forhandlerpartnere. Skriv IKKE et konkret antal ind i
selve teksten (det ændrer sig ved hver crawl) — brug i stedet en
formulering, der er sand uanset tal, fx at annoncerne kommer fra
forhandlerpartnere, og at private snart kan oprette gratis.

Verificér efter ændringen ved at starte dev-serveren
(.claude/launch.json, "bikerbasen") og læse den renderede
<meta name="description"> og hero-tekst på forsiden og søgesiden.
Kør npm test bagefter og ret intet i databasen.
```

**Værktøjer:** `Claude_Browser` (preview_start med launch.json-profilen
`bikerbasen`, `read_page`/`get_page_text` til at læse den renderede meta og
hero-tekst). Ingen Supabase MCP nødvendig — dette er tekstændringer.
Subagent: ingen nødvendig, men `Explore` kan bruges til at finde alle
forekomster af "private" i `js/home.js` og HTML-filerne hurtigt.

**Definition of done:** `index.html`, `soegning.html` (og evt.
`forhandler.html`) har en meta-description og og:description, der ikke
påstår private annoncer findes, og som er sand for enhver fremtidig
kombination af egne/eksterne antal. Hero-teksten på forsiden nævner
kilden (forhandlerpartnere) i stedet for at antyde egne annoncer. `npm test`
er stadig grøn.

**Anslået omfang:** 3-4 filer.

---

## Prompt 2 — Indekseringsfejl: canonical til ren rod + strukturerede data på tomme resultater

**Hvorfor nummer to:** Stadig i "ærlig kommunikation og indeksering"-bunken.
Fase 3 fandt, at canonical på forsiden peger på
`https://bikerbasen.dk/index.html` i stedet for den rene rod
(`index.html:11`), samme mønster på `soegning.html` og `forhandler.html`.
`docs/review/BACKLOG.md` finding C-015 (stadig "åben") siger desuden, at
søgesidens strukturerede data (`js/seo.js`) kan pege på URL'er, der giver
404.

**Prompt:**
```
Vi driver Bikerbasen.dk (statisk HTML/CSS/vanilla JS, bygget af
scripts/build.js + scripts/build-meta.js, udgivet til GitHub Pages via
.github/workflows/deploy.yml). To indekseringsfejl skal rettes:

1. Canonical-tags peger på "index.html" i stedet for den rene rod.
   index.html:11 har <link rel="canonical" href="https://bikerbasen.dk/index.html">
   — det bør være "https://bikerbasen.dk/" for forsiden specifikt (roden,
   ingen filnavn). soegning.html, forhandler.html og de øvrige rodsider
   skal beholde deres egne, rene stier (fx "https://bikerbasen.dk/soegning.html"
   er allerede korrekt for DEM — det er kun forsidens selvhenvisning til
   "index.html" der er problemet). Ret der, hvor canonical genereres — se
   scripts/build-meta.js og evt. inline i hver HTML-fil — og sørg for at
   ÉN kilde bestemmer canonical for alle sider, så de ikke kan glide fra
   hinanden igen.

2. docs/review/BACKLOG.md finding C-015 (fil: js/seo.js:191-205,
   funktionen seoSearchResults) siger, at søgesidens strukturerede data
   (JSON-LD) kan pege på URL'er, der giver 404. Læs findingen og
   docs/review/runde-1-critic.md for reproduktionstrin, verificér om den
   stadig reproducerer, og ret den, hvis den gør. Opdatér BACKLOG.md-status
   for C-015 til "rettet" med en kort forklaring, hvis du retter den —
   samme format som de øvrige "rettet"-noter i filen.

Verificér med Claude_Browser mod den lokale dev-server
(.claude/launch.json "bikerbasen"): læs canonical-tagget på forsiden,
søgesiden og en mærkeside, og tjek at JSON-LD på en tom søgning
(fx soegning.html?q=zzzzqqq) ikke peger på en URL, der ikke findes.
Ret intet i databasen, og skrab ikke andre sider end vores egen.
```

**Værktøjer:** `Claude_Browser` (`navigate`, `read_page`,
`javascript_tool` til at læse `document.head.innerHTML` for canonical/JSON-LD).
Subagent: `feature-dev:code-explorer` eller `Explore` til at finde alle
steder, canonical genereres i byggekæden, før noget rettes.

**Definition of done:** Forsidens canonical er `https://bikerbasen.dk/`;
øvrige siders canonical er uændret korrekte; C-015 er enten bekræftet
rettet med en note i `BACKLOG.md`, eller bekræftet stadig åben med en
opdateret reproduktion. `npm test` grøn.

**Anslået omfang:** 4-6 filer (canonical-generering + evt. `js/seo.js` +
`BACKLOG.md`).

---

## Prompt 3 — Udbud: verificér og aktivér Jensens Motorcykler og Rydbergs MC

**Hvorfor i udbudsgruppen, først:** Det hurtigste, mest lavthængende skridt
til mere udbud er de to kildekonfigurationer, der allerede findes
(`sources/jensensmc.yaml`, `sources/rydbergsmc.yaml`, tilføjet i commit
`e3ca556`) men endnu ikke er koblet på — `public.kilder` indeholder i dag
kun MC Syd og Gul og Gratis (verificeret 2026-08-19).

**Prompt:**
```
Vi driver crawleren i crawler/ for Bikerbasen.dk. To kildekonfigurationer,
sources/jensensmc.yaml og sources/rydbergsmc.yaml, blev tilføjet i en
tidligere session (commit e3ca556) men er aldrig kørt — public.kilder
har kun MC Syd og Gul og Gratis registreret.

FØR du kører noget som helst: læs crawler/config.js's validerKilde()
grundigt (kravene til tilladelse_modtaget, tilladelse_dato, robots_tjekket
— alle skal have en ISO-dato, ikke bare "true"). Åbn de to YAML-filer og
BEKRÆFT MED ET MENNESKE (spørg brugeren direkte, gæt ikke), at den
skriftlige tilladelse i filerne er ægte og stadig gælder — en dato i en
YAML-fil er ikke i sig selv bevis for et gyldigt samtykke i dag. Kør ikke
en crawl mod en kilde, du er i tvivl om.

Når og kun når tilladelsen er bekræftet af et menneske:
1. Kør `node crawler/robots.js` (eller den relevante funktion) for at
   bekræfte at robots.txt hos begge kilder stadig tillader os, og at
   robots_tjekket-datoen i YAML'en er opdateret til i dag, hvis den var
   forældet.
2. Kør `npm run crawl` (se package.json for præcis kommando/flags til at
   målrette én kilde ad gangen, hvis det findes — ellers hele pipelinen).
3. Kør `npm run crawl:tjek` bagefter og bekræft, at MC Syd og Gul og Gratis'
   tal er uændrede, og at Jensens/Rydbergs nu viser et antal aktive
   annoncer > 0.
4. Kør npm test og bekræft alt stadig er grønt.

Rør ikke andre kilder, og skrab intet uden for de to YAML-filer, der
allerede er skrevet.
```

**Værktøjer:** Ingen MCP-browserstyring nødvendig — dette er en
Bash/Node-opgave. Hvis Supabase MCP er godkendt af brugeren, kan
`list_tables`/`execute_sql` bruges til at bekræfte `kilder`-tabellens
indhold før/efter i stedet for `crawler/tjek.js`. Subagent: ingen — dette
bør køres direkte og eftertænksomt, ikke uddelegeres, fordi det involverer
en reel skrivning til en ekstern parts data.

**Definition of done:** `npm run crawl:tjek` viser fire aktive kilder
(MC Syd, Gul og Gratis, Jensens Motorcykler, Rydbergs MC), alle med et
antal aktive annoncer > 0, og de to oprindelige kilders tal er uændrede.
`npm test` grøn. Mennesket har eksplicit bekræftet tilladelsen før crawlen
blev kørt — det skal fremgå af sessionens svar, ikke antages.

**Anslået omfang:** 0-2 filer i repoet (mest en kørt operation); evt.
rettelse af en forældet `robots_tjekket`-dato i de to YAML-filer.

---

## Prompt 4 — Udbud: dedup på tværs af aggregerede kilder

**Hvorfor her:** Med fire aktive kilder (efter Prompt 3) stiger risikoen
for, at samme fysiske motorcykel optræder to gange (fx hos både MC Syd og
en af de nye kilder). `public.eksterne_annoncer` har i dag kun
`unique(kilde_id, kilde_annonce_id)` — intet forhindrer duplikater på
tværs af kilder (`supabase/014_aggregator.sql:62`).

**Prompt:**
```
Bikerbasen.dk aggregerer motorcykelannoncer fra flere forhandlerkilder i
public.eksterne_annoncer (Supabase/Postgres). Tabellen har kun
unique(kilde_id, kilde_annonce_id) — intet forhindrer, at samme fysiske
motorcykel vises to gange, hvis den er annonceret hos to af vores kilder
samtidig. fingerprint-kolonnen (crawler/parse.js, funktionen der bygger
den) findes allerede og har et indeks, men ingen unik-constraint på tværs
af kilde_id.

Design og implementér en dedup-mekanisme:
1. Undersøg hvordan fingerprint bygges i dag (crawler/parse.js) — er den
   robust nok til at matche "samme motorcykel, to kilder" (fx baseret på
   mærke+model+årgang+km+pris), eller skal den udvides?
2. Beslut og dokumentér VALGET (i stil med work/DECISIONS.md): når to
   rækker matcher på tværs af kilder, skal søgeresultatet vise ÉN, med
   begge kilder synlige ("findes også hos X"), ikke to separate kort. Skriv
   ikke kode, før valget er skrevet ned og begrundet — det er et
   produktvalg, ikke kun en teknisk detalje.
3. Implementér i crawler/pipeline.js (eller en ny migration under
   supabase/, næste ledige nummer efter 018) og dæk med en test, samme
   stil som crawler/borte.test.js.
4. Kør npm test og bekræft alt er grønt, inklusive den nye test.

Ret ikke selve produktionsdatabasen direkte — skriv migrationen som en
.sql-fil under supabase/, samme mønster som de eksisterende, så brugeren
selv kan køre den i Supabase Dashboard (eller godkende Supabase MCP'en for
dig, hvis den er tilgængelig i din session).
```

**Værktøjer:** Supabase MCP (`list_tables`, `execute_sql` til at teste
matching-logikken mod de faktiske 392+ rækker, hvis brugeren har godkendt
serveren) — ellers skriv SQL'en uafprøvet mod skemaet, som resten af
`supabase/*.sql` gør. Subagent: `feature-dev:code-architect` er velegnet
til selve designvalget (matching-strategi), før implementeringen skrives.

**Definition of done:** En ny migration under `supabase/` og en ændring i
`crawler/pipeline.js` sikrer, at to rækker fra forskellige kilder, der
matcher på fingerprint/nøglefelter, vises som én i søgeresultatet med
begge kilder nævnt. Ny test i `crawler/`-mappen dækker scenariet.
Beslutningen er dokumenteret i `work/DECISIONS.md` i samme stil som
eksisterende noter. `npm test` grøn.

**Anslået omfang:** 4-6 filer (én ny migration, `pipeline.js`, én ny
testfil, en visningsændring, en DECISIONS-note).

---

## Prompt 5 — Udbud: gør opret-annonce-flowet klar til de første rigtige private annoncer

**Hvorfor her:** Kernen i forretningsmodellen ("gratis for private") har
0 brugere i produktion. Flowet findes teknisk (`js/opret-annonce.js`,
kladde via `localStorage`, EXIF-strip ved upload), men er aldrig afprøvet
med en rigtig, ende-til-ende gennemført annonce i drift.

**Prompt:**
```
Bikerbasen.dk's opret-annonce-flow (opret-annonce.html, js/opret-annonce.js,
js/supabase-api.js) er bygget, men public.listings har 0 rækker i
produktion — ingen har nogensinde gennemført flowet. Din opgave er at
verificere, at flowet reelt virker fra ende til anden, og rette det der
ikke gør, FØR nogen beder rigtige brugere om at prøve det.

Kør mod den lokale dev-server (.claude/launch.json "bikerbasen"), IKKE mod
produktion, medmindre du eksplicit får lov af brugeren til at oprette og
bagefter slette en testannonce i den rigtige database. Gennemgå:

1. Udfyld formularen med gyldige testdata (find kravene i
   supabase/schema.sql — brand, model, type, year, km, ccm, price m.fl.,
   bemærk at power og vin er valgfrie/nullable, mens price er påkrævet).
2. Test "Gem kladde" og at kladden faktisk hentes frem igen ved genindlæsning.
3. Upload et testbillede og bekræft at EXIF/GPS-strip (js/supabase-api.js,
   stripExifAndResize) rent faktisk kører og at billedet lander i
   Storage-bucketen "listing-photos" under brugerens egen mappe (RLS-kravet
   i supabase/schema.sql linje ~197-202).
4. Gennemfør oprettelsen og bekræft raekken lander i public.listings med
   status 'active', og at listing_photos peger korrekt.
5. Kør scripts/build-listing-pages.js lokalt og bekræft at der nu genereres
   en rigtig, indekserbar HTML-side for annoncen (ikke kun
   annonce.html?id=...).
6. Ret enhver fejl du finder undervejs. Skriv en test, hvis der er en reel
   kodefejl (ikke kun manglende testdata) — placér den efter samme mønster
   som js/favoritter.test.js.

Slut af med enten at rydde testdataen op igen (slet raekken og billedet),
eller — hvis du fik lov af brugeren til at lade den stå som den allerførste
rigtige annonce — sig det tydeligt i dit svar. Skriv IKKE i databasen uden
at have læst dette punkt.
```

**Værktøjer:** `Claude_Browser` (fuld interaktion: `navigate`, `computer`
til klik/formularudfyldning, `read_console_messages` til at fange
stille fejl). Supabase MCP (`execute_sql` eller `list_tables`, hvis
godkendt) til at bekræfte raekken i `public.listings` og til oprydning.
Subagent: ingen nødvendig — dette er ét sammenhængende, tilstandsbærende
flow, der ikke egner sig til parallel uddelegering.

**Definition of done:** En testannonce er gennemført ende-til-ende (kladde
→ billede → oprettelse → statisk side), enhver fundet fejl er rettet og
testdækket, og testdataen er enten ryddet op eller udtrykkeligt efterladt
med brugerens tilladelse. `npm test` grøn.

**Anslået omfang:** 2-5 filer, afhængig af hvor mange fejl der findes
undervejs (kan være 0 kodeændringer, hvis flowet allerede virker).

---

## Prompt 6 — E-mailopsamling: kobl søgeagenter til de eksterne annoncer

**Hvorfor her:** Det største, konkrete hul i e-mailopsamlingen. Triggeren,
der udløser `notify-saved-searches`, sidder kun på `public.listings`
(`supabase/013_soegeagenter.sql`: `create trigger on_listing_active …
on public.listings`). Da al reelt udbud (392 annoncer) ligger i
`eksterne_annoncer`, kan en søgeagent i praksis aldrig udløses i dag,
uanset hvor mange brugere der opretter en.

**Prompt:**
```
Bikerbasen.dk har en søgeagent-funktion (public.saved_searches,
supabase/013_soegeagenter.sql) der skal maile brugeren, når en ny annonce
matcher deres gemte søgning. Mekanismen virker sådan i dag: en
Postgres-trigger (on_listing_active) på public.listings kalder Edge
Function'en notify-saved-searches ved insert/opdatering til status='active'.

Problemet: public.listings har 0 rækker i produktion. Alt reelt udbud
(392 annoncer pr. 2026-08-19) ligger i public.eksterne_annoncer, som
IKKE skrives af en bruger-handling (insert/update fra en logget ind
bruger) — den bliver bulk-upsertet af crawleren via service_role
(crawler/pipeline.js, crawler/db.js). En almindelig row-trigger er derfor
ikke nødvendigvis den rigtige mekanisme her.

Design og implementér en løsning, der lader gemte søgninger matche NYE
eller genaktiverede eksterne annoncer efter hver crawl-kørsel:
1. Læs crawler/pipeline.js for at forstå, hvornår en kørsel afsluttes, og
   hvor "nye" annoncer i den kørsel er kendt (crawl_koersler.nye).
2. Design et matching-trin, der efter en afsluttet kørsel finder de
   saved_searches, der matcher de netop tilføjede/genaktiverede rækker i
   eksterne_annoncer, og kalder notify-saved-searches (eller en ny,
   tilsvarende Edge Function) med de rigtige listing-referencer.
   search_notifications-tabellen (fra 013) skal bruges til at undgå at
   sende samme match to gange — men bemærk at den i dag har en fremmednøgle
   til public.listings, ikke til eksterne_annoncer, så skemaet skal
   sandsynligvis udvides (ny kolonne eller ny tabel), ikke bare genbruges
   som det er.
3. Skriv migrationen som en ny .sql-fil under supabase/ (næste ledige
   nummer), og opdatér supabase/functions/notify-saved-searches/index.ts
   hvis payload-formatet skal ændres.
4. Tilføj en test af matching-logikken, samme stil som
   crawler/borte.test.js.
5. Kør npm test og bekræft alt er grønt.

Ret ikke produktionsdatabasen direkte — skriv migrationen, som brugeren
selv kan køre eller godkende via Supabase MCP.
```

**Værktøjer:** Supabase MCP (`list_tables`, `execute_sql`,
`generate_typescript_types` hvis Edge Function-typerne skal opdateres) —
kræver brugerens godkendelse først. Subagent: `feature-dev:code-architect`
til selve designet af matching-mekanismen, fordi den rører både
databaseskema, crawler-pipeline og en Edge Function.

**Definition of done:** Efter en crawl-kørsel med nye/genaktiverede
eksterne annoncer bliver relevante `saved_searches` matchet og en
notifikation sendt (eller i det mindste en verificerbar kø/rækkefølge
oprettet, hvis selve mailafsendelsen kræver Resend-nøgler, brugeren skal
sætte op separat). Duplikat-afsendelse forhindres. Ny test dækker
matching-logikken. `npm test` grøn.

**Anslået omfang:** 4-6 filer (ny migration, `pipeline.js`, evt.
`notify-saved-searches/index.ts`, ny testfil).

---

## Prompt 7 — SEO-struktur: luk de sidste blindgyder i mærkeindekset

**Hvorfor her:** `docs/review/BACKLOG.md` finding D-010 er kun halvt
rettet: sektionen "Mærker med annoncer nu" er fixet, men "Alle mærker"
linker stadig til `soegning.html?brands=X` for mærker uden lager —
BACKLOG.md's egen efterprøvning talte 43 blindgyder tilbage
(`docs/review/BACKLOG.md`, afsnittet "D-010 — hvad C-014 løste, og hvad den
ikke gjorde"). Dette er strukturelt SEO-arbejde, ikke design-polish, og
hører derfor til her, ikke i en senere UI-runde.

**Prompt:**
```
Bikerbasen.dk's mærkeindeks (maerker.html, genereret af
scripts/build-brand-pages.js) har en sektion "Alle mærker" nedenunder
"Mærker med annoncer nu". Ifølge docs/review/BACKLOG.md (finding D-010,
uddybet i afsnittet "D-010 — hvad C-014 løste, og hvad den ikke gjorde")
linker "Alle mærker" stadig til soegning.html?brands=X for ca. 43 mærker,
der giver nul træf i søgningen — interne links til indholdsløse sider.

1. Læs BACKLOG.md's D-010-afsnit i sin helhed for præcis kontekst og de
   tal, der allerede er talt op.
2. Bekræft tallet er stadig retvisende mod det faktiske lager (kør
   scripts/build-brand-pages.js eller den relevante hentefunktion mod
   produktionsdatabasen, samme metode som scripts/shared.js
   fetchExternalListings, og sammenlign de 60+ kendte mærker mod dem der
   faktisk har aktive annoncer i dag — tallet kan have ændret sig, hvis
   flere kilder er aktiveret siden).
3. Beslut og implementér: enten (a) fjern "Alle mærker"-sektionen for
   mærker uden lager helt, eller (b) vis dem uden link (ren tekst), eller
   (c) noindex den del af siden. Vælg ud fra hvad der er bedst for både
   brugeren og indekseringen — begrund valget kort i en commit-besked,
   samme stil som de øvrige "fix(seo): D-0xx"-commits i git-loggen.
4. Opdatér docs/review/BACKLOG.md's status for D-010 fra "rettet" (som den
   fejlagtigt allerede står, jf. den efterprøvede halve løsning) til det
   reelt korrekte, eller marker den endeligt løst, hvis du lukker hele
   hullet nu.
5. Kør npm test og bekræft alt er grønt, kør scripts/maerkeside.test.js
   specifikt.
```

**Værktøjer:** Ingen browserstyring strengt nødvendig, men `Claude_Browser`
er nyttig til at se den byggede `maerker.html` visuelt efter ændringen.
Subagent: `Explore` til hurtigt at finde alle steder, mærkelisten
genereres/renderes, før noget ændres.

**Definition of done:** `maerker.html` linker ikke længere internt til
søgninger uden træf; `BACKLOG.md`'s status for D-010 matcher den faktiske
kodetilstand efter ændringen. `npm test` og
`scripts/maerkeside.test.js` grønne.

**Anslået omfang:** 2-4 filer.

---

## Prompt 8 — Forhandler og betaling: forbind Stripe-abonnement og krav-flowet

**Hvorfor sidst:** Monetisering kommer først, når der er udbud og
ærlighed på plads — det er eksplicit sidste led i prioritetsrækkefølgen.
Infrastrukturen findes allerede (Stripe Edge Functions,
`006_forhandler_abonnement.sql`, `krav`-tabellen), men er ikke forbundet
til noget UI-flow, en forhandler reelt kan gennemføre.

**Prompt:**
```
Bikerbasen.dk har forberedt, men ikke aktiveret, forhandlerabonnement og
-betaling:
- supabase/006_forhandler_abonnement.sql (abonnementsskema)
- supabase/functions/create-checkout, create-portal, stripe-webhook
  (Stripe Edge Functions)
- supabase/STRIPE_OPSAETNING.md (opsætningsvejledning)
- public.krav-tabellen (supabase/014_aggregator.sql) og
  ret_ekstern_annonce()-funktionen — mekanismen der lader en forhandler
  gøre krav på og rette sine egne eksterne (aggregerede) annoncer.

Ingen af delene er koblet sammen i et flow, en forhandler reelt kan
gennemføre i dag: forhandler.html har ingen synlig "gør krav på min
annonce"-handling, og der er intet UI, der starter et Stripe Checkout-kald.

Byg det manglende bindeled, i denne rækkefølge:
1. Læs STRIPE_OPSAETNING.md og forstå den tiltænkte flow (den er allerede
   skrevet af projektet — følg den, opfind ikke en ny).
2. I forhandler.html/js/forhandler.js: tilføj UI der lader en forhandler
   se sine matchede eksterne annoncer (baseret på domæne-match eller
   manuel kode, jf. krav.metode-typerne 'domaene'/'kode'/'manuel' i
   014_aggregator.sql) og indsende et krav.
3. Byg det simpleste, der virker for godkendelse af et krav (kan være
   manuel admin-godkendelse i første omgang — spørg brugeren, om det er
   nok til at starte med, før du bygger en fuldautomatisk løsning).
4. Kobl "Opret forhandlerkonto"/"Opgradér" til create-checkout
   Edge Function'en, og bekræft stripe-webhook opdaterer abonnementstatus
   korrekt (brug Stripes testmode og testkort — ret aldrig et rigtigt
   betalingsmiddel, og opret ikke en rigtig Stripe-konto uden brugerens
   udtrykkelige tilladelse).
5. Test hele kæden lokalt mod dev-serveren med Stripe CLI i testmode.
6. Kør npm test og bekræft alt er grønt.

Dette er sidste led i rækkefølgen — udbud og ærlighed skal være løst
først. Byg ikke UI-polish ud over det, der kræves for at flowet kan
gennemføres og forstås.
```

**Værktøjer:** Supabase MCP (`execute_sql`, `deploy_edge_function`,
`get_advisors` til at tjekke RLS på de nye/ændrede tabeller) — kræver
godkendelse. `context7` til at slå aktuel Stripe Checkout/Webhook-API op,
hvis versionen i `STRIPE_OPSAETNING.md` er forældet. Subagent:
`feature-dev:code-architect` til at planlægge UI-flowet, før det
implementeres, og `feature-dev:code-reviewer` til at gennemgå
webhook-håndteringen specifikt (penge og adgang på spil — det er per
definition P0-følsomt, jf. `docs/review/BACKLOG.md`'s egen
severity-skala).

**Definition of done:** En forhandler kan, i Stripe testmode, gennemføre
et abonnementskøb fra `forhandler.html`, se sin status ændre sig via
webhooken, og indsende og (manuelt eller automatisk) få godkendt et krav
på en ekstern annonce, hvorefter `ret_ekstern_annonce()` kan bruges til at
rette dens felter. `npm test` grøn. Ingen rigtige betalinger er
gennemført.

**Anslået omfang:** 6-10 filer (forhandler.html, js/forhandler.js, én eller
flere Edge Functions, evt. en ny migration, evt. tests).
