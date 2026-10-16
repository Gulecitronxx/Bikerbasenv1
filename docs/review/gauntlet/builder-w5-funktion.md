# Builder w5-funktion (bølge 5) — acceptkriterier og bevis

Branch `gauntlet/w5-funktion` fra `3caffd2`. Kilde: `detective2-funktion.md` (F2-001 … F2-014). Kriterierne er skrevet FØR bygning
(meta-gauntlet-2: acceptkriterier først, integrationstests frem for streng-søgning i kildekode).

## Acceptkriterier (kopi af opgaven)

| ID | Sev | Kriterium |
|---|---|---|
| F2-001 | P1 | Annonce med 48 eller 49 hk (uden kW) vises IKKE som "Kræver A" og udelukkes IKKE af A2-filteret; den vises som "Kørekort ikke afgjort — tjek kW". hk ≤ 47 giver "Mulig A2" (uændret), hk ≥ 50 giver "Kræver A" (uændret). Test: 40 hk-værdier 30-60, kW opgivet (35 kW giver mulig A2, 36 kW giver kræver A), A1-grænser. Kørekort-antal på kortbadge, filter, annoncesidens "Kan du køre denne?" og facet/forside følger ÉN funktion (integrationstest). Antal annoncer i fixturen der skifter status dokumenteres. |
| F2-002 | P1 | Knappen "Betal sikkert (MobilePay)" og alt tilhørende UI er væk; ingen betalingsløfte i brugerrettet tekst (grep js/ og html); annoncesiden virker ellers uændret (test på egen annonce i mock). |
| F2-003 | P1 | Opslagsmærket hedder "Nyt opslag" (anden stil end "Ny"-stand); "Ny" kun via standen (`kildeNyStatus`). Test: 1979-annonce oprettet i går giver "Nyt opslag", ikke "Ny". |
| F2-006 | P1 | Ingen personoplysninger indsamles til noget, der ikke leveres: formular og felter fjernet, klar tekst FØR enhver handling; kun telefon vises hvis sælgeren har valgt det; den falske tæller (+1 pr. klik) fjernet. Åben ejerbeslutning om besked-levering beskrives. Test på egen annonce i mock: ingen POST med navn/e-mail/telefon, ingen tæller-skrivning. |
| F2-008 | P2 | Modelnavne bevares uforkortede; "Street Glide/Street Bob/Street Triple/Street Rod/Street 750" bliver ikke Naked via ordet "Street"; søgning "street glide" finder dem; test på 15 navne inkl. ægte Street-nakeds (type fra kilde/model-tabel, ikke ordet alene). |
| F2-009/011/014 | P2/P3 | Aldrig "null"/"undefined"/"NaN" i brugerrettet tekst (test: kort/annonce/sammenlign/swipe med alle felter null). Søgning uden typeord/tastefejl: kun hvis rent og enkelt, ellers beskrevet. Uden model: "Model ikke oplyst"/"Ukendt mærke" ærligt; ingen opfundet model. |
| F2-010 | P2 | Ved backend-fejl/tom hentning står en ærlig fejl ("Vi kunne ikke hente annoncerne lige nu — prøv igen"), ikke "Bikerbasen er helt nyt". Test med mock (500 og []). |
| F2-007 | P1 hyp. | Kun rapport-note (kræver crawl/ejerbeslutning). |

Gate: `npm test` (645 baseline i worktree), `node --check` på alle js, 0 overflow og ren konsol på berørte sider (mocks).

## Bevis

(udfyldes nedenfor under bygning)

### Resultat (commit 2ead7a5 + denne rapport)

Gate: `npm test` 645/645 (uændret; package.json røres ikke), `node --check` på alle js/ og crawler/, `node --test js/w5-*.test.js` 55/55.
Nye testfiler (IKKE i package.json — ejer/integration tilføjer): `js/w5-koerekort.test.js`, `js/w5-annonce.test.js`, `js/w5-street.test.js`,
`js/w5-null.test.js`, `js/w5-tomt.test.js` (+ hjælper `js/w5-hjaelp.js`, ingen test). Ændrede eksisterende tests: `js/koerekort.test.js` (48/49 hk: A -> ikke afgjort, 50 -> A).
Browsermåling (Playwright, page.route-mocks, 0 netværkskald til produktion, 360/768/1280 px): 0 px vandret overflow, tom konsol på søgning, annonce og sammenlign.

| ID | Bevis |
|---|---|
| F2-001 | Én funktion `a2Status()` i js/data.js (`koerekortForListing`, `passerKoerekort`, `koerekortTvivl`, `koerekortMaerkat`). Test over hk 30-60 (+ strenge/decimaler): <=47 Mulig A2, 48-49 "Kørekort ikke afgjort — tjek kW" og med i A2-filteret, >=50 Kræver A; kW 35 -> A2, 36 -> A; A1-grænser uændrede; badge, filter, annoncesidens kort og tællefunktion enige for hver hk. Mock: kort CMX 48 hk og NX 49 hk viser "Kørekort ikke afgjort — tjek kW", A2-filtret tager dem med, annoncesidens badge "? Ikke afgjort — tjek kW". Fixture-tal: repoets demo/eksempelrækker har 0 annoncer på 48-49 hk, så før/efter måles på detective2's live-tal: 29 annoncer skifter fra "Kræver A" til "ikke afgjort" (A2-facet 59 -> op til 88 når de tæller med). Feltet `kw` er understøttet men leveres endnu ikke af nogen kilde. |
| F2-002 | Knap, modal og handler fjernet. Mock (indlogget, egen annonce): ingen "Betal sikkert"/"MobilePay" i siden; annoncesiden ellers uændret (H1, fakta, sælgerkort). Legitime omtaler i sikkerhed/vilkaar/privatliv og Stripe-abonnement (forhandler) uændret. |
| F2-003 | Opslagsmærke "Nyt opslag" (badge-neutral, ikke grøn badge-new). Test: BMW R45 1979 oprettet i går -> "Nyt opslag", ingen "Ny"; "Ny" kun via `kildeNyStatus` (rk-ny). Mock bekræfter "NYT OPSLAG" på kortet. |
| F2-006 | Formular, felter, samtykketekst, bjælkeknap og tæller væk. Tekst "Beskeder til sælger kan endnu ikke sendes via Bikerbasen" står før handlinger (indlogget og udlogget); "skriv i stedet" fjernet overalt. Mock: 0 POST med navn/e-mail/telefon; eneste POST er `view`; ingen `contact`-hændelse. Telefon-reveal (sælgerens eget valg) tæller stadig 1 gang pr. klik (knappen deaktiveres) — det er en reel hændelse og matcher dashboardets tekst. annonce.html beholder en tom `#contact-modal`-beholder, fordi `scripts/shared.js` udtrækker blokken til statiske sider (JS fjerner den). |
| F2-008 | `delModelOgVariant`/`normaliserType` (crawler/normalize.js) og broen (`MODEL_MED_TYPEORD`, `modelMistetTypeord`, `streetErModelnavn`, `TYPE_FOR_MODELNAVN` i data.js) beskytter Street Glide/Bob/Triple/Rod/Twin/750 og Sport/Road Glide. 15 navne testet; rækker allerede i DB med "FLHX Glide"/type Street genskabes fra titlen (model "FLHX Street Glide", type touring; Street Bob -> cruiser; Street Triple stadig naked via tabel; ZR-7 Street/MSX 125 Street stadig naked fra kildens ord). Mock: søgning "street glide" 0 -> 1, Street Glide ikke i Naked. **Åbent:** `crawler/parse.js` (udenfor min ret) bruger `normaliserType` — den er rettet, men eksisterende DB-rækker bør genkøres. |
| F2-009/011/014 | Test af kort, række, swipe, sammenlign-hoved/-rækker og annonce-klodser med alle felter null: aldrig null/undefined/NaN. `typeLabel(null)`="Ikke oplyst"; sammenlign: Type/Årgang "Ikke oplyst", Stand vises for indekserede; `sammenlignRaekker/Hoved` flyttet ud af IIFE (testbare). Uden model: "Honda (model ikke oplyst)", ukendt mærke: "Ukendt mærke MTX800"; "CFMOTO MTX800" (Ukendt mærke) læses nu til CFMoto fra titlen. Søgning: typeord (cruiser, naked, touring ...) finder typen; søgning på "null" matcher intet. **Ikke gjort (beskrevet):** a1/a2 i q -> filter, tastefejl ("kawasacki") og kælenavne — kræver UI ("Mente du …?") og ejerens valg; små fuzzy-hjælpere (mt07) uændret. |
| F2-010 | `tomtilstandsIndhold`: tomt lager -> "Vi kunne ikke hente annoncerne lige nu — prøv igen" + Prøv igen-knap, antal-linjen "Annoncerne kunne ikke hentes", aldrig "helt nyt"; annoncesiden: hentefejl -> "Vi kunne ikke hente annoncen lige nu" (ikke "findes ikke"). Test på enhedsniveau; mock med 500 på annonceside bekræftet. Lokalt har dev-serveren 51 demo-annoncer, så "helt tomt"-grenen på søgesiden er kun enhedstestet; `soegning.html` indeholder stadig den skjulte statiske standardtekst (ikke min fil). |
| F2-007 | Kun note (se nedenfor). |

### ÅBNE EJERBESLUTNINGER

1. **Levering af beskeder til sælger (F2-006).** I dag: ingen formular, ærlig tekst; en privat sælger uden vist telefon har ingen kontaktvej. Forslag: Supabase Edge Function `send_besked` (rate limit pr. køber/annonce, server-side opslag af sælgerens e-mail, aldrig afsløret for køberen), tabel `beskeder` til kvittering/misbrug, samtykke-tekst der passer til faktisk levering, og først DEREFTER genindføres formularen. Alternativ: "Markér interesse" uden persondata.
2. **Døde kilde-links (F2-007, hypotese).** Rydbergs MC 3/3 og Gul og Gratis 1/5 gav 404 på HEAD; lager 53-61 dage gammelt. Kræver GET-tjek med `crawler/borte.js` (crawl) og beslutning om skjul/markér ved >X % døde eller >30 dage. Ikke rørt.
3. Generatorerne `scripts/build-facet-pages.js` (`kraeverA = hk > A2_MAX_HK`) og `scripts/build-brand-pages.js` tæller stadig 48-49 hk som "kræver A"; w5-seo bør bruge `koerekortForListing(l) === 'A'` / `koerekortTvivl(l)`.
4. `js/login.js:41` ("Kontakt sælgeren") og `css/*` (egen stil til `.badge-nyt-opslag`) tilhører andre strømme.
