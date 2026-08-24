# Runde 10 — STATUSRUNDE: blind efterprøvning + dom over loopet (AUDIT ONLY)

Ingen kodeændringer. Denne fil er det eneste, runden har skrevet.

Rollen er marketplace-UX-kritiker. Sæt A er Bilbasen.dk (`work/runde5/bilbasen-*`,
mærkesiden i `work/runde5/efter2/`). Sæt B er Bikerbasen.dk LIVE 24.08.2026
kl. 17:36–17:37, efter runde 9 OG efter dagens første crawl via GitHub Actions
(`work/runde10/bikerbasen-*`). Runde 10 er en statusrunde: hovedspørgsmålet er
ikke "hvad er galt", men "skal loopet fortsætte".

**Det vigtigste tal først: lageret er FRISKT, og det er efterprøvet uafhængigt.**
REST mod produktionen med sitets egen offentlige nøgle, 24.08: alle fire kilder
har `sidst_set` **24.08 kl. 15:28–15:29 UTC** — mcsyd 345, guloggratis 169,
rydbergs 74, jensens 28 = **616 rå, 602 viste** (14 tværkilde-dubletter, samme
regel som D7-F2). Annoncesiden skriver nu "sidst bekræftet **i dag**", og
mærkesiden "Senest bekræftet hos kilderne 24. aug. 2026". Runde 9's ene
gennemgående anke — "8 dage siden" på hver annonce — findes ikke mere.

Én ny kendsgerning ændrer dog rammen: commit `affe043` fjernede nat-cron'en
**efter menneskets egen beslutning** — crawlen kører nu kun ved manuelt tryk.
Nøglen VIRKER (dagens kørsel gik gennem Actions, `84a8d17`), men friskheden er
fra i dag en manuel pligt, ikke en automatik. Teksterne forbliver ærlige
(dagstallet regnes ved visning), så sitet lyver ikke, når det ældes — det
falmer bare.

---

## 0. Sådan er der målt

Billeder læst som billeder (Read; fuldsider skåret i striber med PIL) og målt
med PIL/numpy: første vedvarende fotorække pr. spalte for "første kort",
rækkestandardafvigelse for indholdsudstrækning, billedbredde for vandret
overløb. Alle otte B-fuldsider er præcis 390/1366 px brede — **0 px vandret
overløb på nogen side.** Den sorte flade nederst i `B-srp-d-full` (y 4 582–
5 114, RGB ≈ 88/87/85) er footerens `content-visibility`-pladsholder, kendt
måleartefakt fra runde 8–9, ikke tomrum.

Målt uden for billederne (kun læsning): REST-friskhed pr. kilde (ovenfor);
kode: `index.html`, `annonce.html`, `soegning.html`, `js/search.js`,
`css/styles.css`, `scripts/build-brand-pages.js`, `js/supabase-config.js`;
git-log (commits `c5c7a0b`, `c03fa63`, `ca0cd26`, `affe043`, `84a8d17`,
`478cf3e`).

Én tidsfælde, der skal stå her: `478cf3e` (D8-S4, undertitel-slotten) er
committet **17:39 — to minutter EFTER optagelsen 17:36–37.** Billederne viser
derfor stadig "(Eurosport)" i SRP-desktop kort 2; koden gør ikke.

---

## 1. Blind dom pr. side og skærm

Afsagt på billederne, før kode og git-log blev åbnet.

| Side / skærm | Vinder | Hvorfor — det, en blind dommer ser først |
|---|---|---|
| **Forside, mobil** | **Bikerbasen, klart** | Foto-hero, "602 annoncer … hos 4 danske forhandlere og markedspladser", fire søgefelter + kørekortvælger, CTA ≈655–706. De 8 kompaktkort: 4 mcsyd · 3 guloggratis · 1 rydbergs = **50 %, løftet holder**; alle titler hele eller med ellipse; fodnoten har nu by + domæne ("Rødding · mcsyd.dk"). Bilbasen: ≈30 kort er stadig deres eneste argument. |
| **Forside, desktop** | **Bikerbasen, klart** | Bilbasen: OK-ladeboks-takeover og klemt formular. Os: h1, sandt tal, CTA ≈578–628, tryghedslinjer, første kort ≈930 mod ≈1 200. 0 px tomrum under footeren (sidste tekstrække 5 415 af 5 435). |
| **Søgning (SRP), mobil** | **Bikerbasen, klart** | h1 "Motorcykler til salg i Danmark", 602 annoncer, "Gem" har nu synlig etiket (D9-S3), første pris ≈532 mod Bilbasens 684. Bilbasens kort bærer logo/video/hjerte — aktiver, regel 2 forbyder. |
| **Søgning (SRP), desktop** | **Bikerbasen, klart** | Første kort ≈322 mod 527; kildelinjen 345+155+102 = 602 stemmer med REST (169 GG rå − 14 dubletter = 155 ✓); Mærke-facet med tal, Kørekort med forklaring; ingen Polestar-tapet. Eneste rest i billedet: "(Eurosport)" i kort 2's undertitel-slot — lukket i kode 2 min. efter optagelsen (`478cf3e`). |
| **Annonce (VDP), mobil** | **Bikerbasen, klart** | Kildeflaget er VÆK (D9-A3): breadcrumb → foto → titel ≈475 → pris ≈578 → CTA ≈605–654 → nøgletalsrække 1 OG 2 over folden. Kilden nævnes nu **3×** i første skærm mod runde 8-9's 5×. Og friskheden: "sidst bekræftet **i dag**". Bilbasen: tre knapper før bilen. Sidehøjde 6 040 → **5 653** (D9-A2's dublet-tabel væk — Detaljer viser kun Mærke/Model/Type/Stand/Sælger/Sted/Annonce-id). |
| **Annonce (VDP), desktop** | **Bikerbasen, klart** | CTA 236–283 mod 311–350; fem nøgletal over folden; "Set hos MC Syd første gang 16. aug. · sidst bekræftet i dag"; "Søg videre" med fem sande, friske tal (345 · 276 · 602 · 366 · 602). Sidehøjde 3 288 → 2 955. |
| **Mærkeside (Honda), mobil** | **Bilbasen, snævert** (uændret) | Vores side er blevet ærligere og strammere: dato-linje, "101 uden oplyst type — dem finder du i den fulde søgning", Sortér-rækken skjult, tynd synlig scrollbar. Men det ene tal, dommen faldt på i runde 9, har næsten ikke flyttet sig: første kort **≈860** (runde 9: ≈890; mål ≤620; Bilbasen ≈282 under modalen). Facetterne er funktionen værd — men varerne starter stadig en hel skærm nede. |
| **Mærkeside (Honda), desktop** | **Bikerbasen, snævert** (uændret) | Facetterne står nu i 2 kolonner (KØREKORT+PRIS / TYPE+SORTÉR), dato-linjen under overskriften, modelchips med tal, typeløs-noten — alle tal friske (A1·10 A2·33 A·276; 109 brugte + 167 nye = 276 ✓). Første kort ≈815–829 (runde 9: ≈835) mod Bilbasens ≈527 — stadig kun snævert, af samme grund som mobil. |

**Samlet: 7–1 til Bikerbasen — uændret fra runde 9.** Men kvaliteten af de syv
er steget: alle syv er nu "klart", og friskheds-forbeholdet, der i runde 8–9
trak i alle otte domme, er væk. Det ene tabte felt tabes på ét tal (første kort
≈860 mod ≈282 på mobil), ikke på funktion, sandhed eller tillid.

---

## 2. Runde 9's findings — én for én, med bevis

| ID | Status | Bevis |
|---|---|---|
| D9-F1 meta/og/JSON-LD "brugte … egne annoncer" | **lukket** | `index.html:9/19/26/67`: alle fire maskinlæsbare felter siger nu "Motorcykler til salg fra danske forhandlere og markedspladser — nye og brugte, samlet ét sted. Kilden står på hvert kort." Ingen "egne annoncer", ingen "mødested". "brugte" optræder kun i den sande form "nye og brugte". |
| D9-F2 hero-chips uden rul-affordance | **lukket** | `css/styles.css:2768` `.popular-row{ overflow-x:auto; scrollbar-width:thin }` — skjult scrollbar er væk. Chippen klippes stadig ved kanten (det er selve affordancen), men nu med synlig scrollbar. |
| D9-F3 mobilkortets fod uden by | **lukket** | `B-fors-m-full` y≈1 500: alle 8 kort viser "Rødding/Esbjerg/Ballerup/Thorsø · domæne". |
| D9-S1 Pris/Type manglede i optagelsen | **måleartefakt** (afgjort i runde 9's egen efterprøvning) | Målt i browser dengang: Mærke@60, Kørekort@476, Pris@741, Type@1146. Runde 10-billedet viser Mærke + Kørekort i viewporten som forventet. |
| D9-S2 side 2 usynlig over folden | **lukket** | `js/search.js:892`: `· side ${state.page} af ${totalSider}` i tallinjen ved `page > 1`; titlen sættes i `js/seo.js` (BACKLOG runde 9). |
| D9-S3 klokke uden etiket | **lukket** | `soegning.html:590` — synligt "Gem"/"Gemt" (`#save-search-kort`); bekræftet i `B-srp-m`: knappen hedder "Gem" med klokkeikon. |
| D9-A1 og:image:alt "brugte" | **lukket** | `index.html:23` og `annonce.html:23`: "Bikerbasen — motorcykler til salg i Danmark, samlet fra danske forhandlere og markedspladser". |
| D9-A2 fem specs to gange | **lukket** | `B-vdp-m-full` y≈1 300–1 600: Detaljer-tabellen har KUN Mærke, Model, Type, Stand, Sælger, Sted, Annonce-id — ingen gentagelse af gitterets fem. Sidehøjde 6 040 → 5 653 (mobil), 3 288 → 2 955 (desktop). |
| D9-A3 kildeflaget på <960 | **lukket** (i `ca0cd26`, bekræftet i billedet) | `B-vdp-m`: intet flag — kilden nævnes 3× i første skærm (fototekst, "hos MC Syd", CTA) mod før 5×. |
| D9-M1 facetternes pixelregning | **delvist — funktionen er betalt, målet er ikke nået** | Sortér-rækken er skjult på mobil, desktop har 2 kolonner, chips tættere. Målt: første kort ≈860 (390) og ≈815–829 (1366) mod runde 9's ≈890/≈835 — en forbedring på ~30 px, mod et mål på ≤700 og runde 8's udgangspunkt 630/589. Det er den ene rest, der stadig koster en blinddom. |
| D9-M2 "til salg nu" uden dato | **lukket — og nu med SAND dato** | `scripts/build-brand-pages.js:854`: "N annoncer — de første 24 her" + "Senest bekræftet hos kilderne {dato}". Billedet viser "24. aug. 2026", og REST bekræfter, at datoen er sand samme dag. |
| D9-M3 de 84 typeløse unævnt | **lukket** | Billedet: "101 uden oplyst type — dem finder du i den fulde søgning." (tallet er vokset med lageret — det regnes, ikke hardcodes). |
| D9-M4 facetrækker uden rul-affordance | **lukket** | `css/styles.css:2848` `.brand-facet-raekke{ scrollbar-width:thin }`. |

**Friskheds-fundene (D8-F2 / D9-M2) er REELT lukket — med ét forbehold.**
Beviset: (1) REST 24.08 — alle fire kilder `sidst_set` 15:28–15:29 UTC samme
dag, 616 rå/602 viste; (2) VDP'en skriver "sidst bekræftet i dag", mærkesiderne
"Senest bekræftet hos kilderne 24. aug. 2026", og forsiden/SRP'en tæller 602 —
alle tal stemmer indbyrdes OG mod databasen. Forbeholdet: `affe043` fjernede
cron'en (menneskets beslutning), så ÉN kørsel beviser rørledningen — kun morgen-
dagens data kan bevise driften. Falder crawlen i glemsel, tæller "i dag" ærligt
op til "for 6 dage siden" igen. Fundets tekstlag er lukket for altid; datalaget
er lukket præcis så længe, nogen trykker på knappen.

D8-resterne: **S4 lukket i kode** (`478cf3e`, 2 min. efter optagelsen —
billederne viser den gamle adfærd), **S5/A2 lukket** i `ca0cd26` (bekræftet:
"Suzuki Gs katana" uden cc-hale på forsidekortet; intet flag på VDP-m),
**S6 åben** (`soegning.html:323` + `:566` — stadig to "Nulstil", P3),
**F5 ikke reproduceret** (0 px tomrum i denne optagelse igen; mekanismen
`--cookie-h`/`body:has` urørt i `css/styles.css:179` — P3, kan kun lukkes af
sticky-refaktoren eller lades ligge som accepteret restrisiko).

---

## 3. STATUSDOM: skal loopet fortsætte?

**Nej — ikke som blindt UX-loop mod Bilbasen. Loopet har gjort sit arbejde.**

Begrundelsen er målt, ikke følt. Runde 5 tabte forsiden blindt på første kort
4 340 px nede; runde 10 vinder 7 af 8 domme "klart", ingen P1 har overlevet to
runder, ingen falske påstande står tilbage på nogen af de fire sider, og selve
referencens tilbageværende fordele er i vid udstrækning ting, vi IKKE må
kopiere (galleristriber, hjerter på eksterne, Lendo-ydelser, anmeldelses-
stjerner uden data — hele "Kopiér IKKE"-listen fra runde 5–9). Det ene tabte
felt tabes på ét tal, og den rettelse behøver ingen blind dommer — den behøver
en lineal: flyt facetblokken, mål 390 og 1366, færdig. En runde 11 ville koste
en hel kritiker-cyklus for at genopdage det, denne rapport allerede har målt.
Det ER aftagende udbytte.

### (a) De maks. 5 ting tilbage med reel brugerværdi — prioriteret

| # | Hvad | Hvorfor det er brugerværdi | Fil / fix |
|---|---|---|---|
| 1 | **Crawl-drift: cron'en tilbage (eller en fast manuel rytme).** | Hele tillidslaget — "sidst bekræftet i dag", 602-tallene, dato-linjerne — ældes fra i morgen. Nøglen virker (dagens kørsel gik via Actions); det eneste, der mangler, er beslutningen. | `.github/workflows/crawl.yml`: genindsæt `schedule: cron '0 3 * * *'` — én linje, men menneskets (`affe043` var menneskets valg, så det skal menneskets ja ændre). |
| 2 | **Mærkeside mobil: første kort ≤700** (D9-M1-resten — den sidste tabte blinddom). | Køberen på telefon ser i dag nul varer på første skærm af en vareside. | `scripts/build-brand-pages.js` + `css/styles.css` `.brand-facetter`: flyt facetblokken NED under de første 6 kort på <640 (intro → modelchips → kort → facetter), eller fold KØREKORT/PRIS/TYPE til én rullerække. Mål før/efter. |
| 3 | **Flere kilder.** 602 annoncer fra 4 kilder mod Bilbasens 50.355. Hver ny dansk MC-forhandler med skriftligt ja gør søgningen, facetterne og kørekortfilteret mere værd — det er sitets egentlige produkt, og crawleren + YAML-formatet er bygget til det. | `sources/<ny>.yaml` + `tilladelse_modtaget` (kræver menneskets aftale med kilden — reglerne i CLAUDE.md står). |
| 4 | **Claim-verifikationen (regel 6's manglende halvdel).** Databasen spærrer selvgodkendelse, men ingen forhandler kan reelt claime sin annonce endnu — flowet er sitets vej fra aggregator til relation med kilderne. | `js/`-flade + Edge Function: domæne-match på e-mail eller kode på egen side; kræver Resend-nøglen til mails (menneskets). |
| 5 | **Søgeagentens mail.** "Gem søgning" tæller i dag kun ved genbesøg — med mail bliver den til den genbesøgs-motor, Bilbasens søgeagent er. | Trigger/funktion på `eksterne_annoncer` + Resend (menneskets nøgle); teksterne lover allerede ærligt kun det, der findes. |
| | *(Kode-rest under stregen: D8-S6's to "Nulstil", F5's cookie-sticky, "Mærke/r"-placeholderen i SRP-mobilens smalle felt — tilsammen en halv dags P3-kosmetik, ikke en runde.)* | | |

### (b) Hvad kræver menneskets nøgler/beslutninger

1. **Cron-beslutningen** (punkt 1 — secret'en er sat og virker; det er nu ren vilje).
2. **Resend** — søgeagent-mail (5) og claim-mails (4).
3. **Stripe** — forhandlerbetaling (dashboardet og betalingslåsen venter).
4. **Cloudflare** — Turnstile/WAF oven på kantens IP-gulv (C2/A3-køen).
5. **Aftaler med nye kilder** (3) — skriftligt ja pr. domæne, jf. reglerne.

### (c) Hvad JEG ville bruge næste arbejdsdag på, hvis jeg ejede sitet

**Ikke blind-runde 11.** Formiddag: cron'en tilbage (2 minutter + menneskets
ja) og D9-M1-resten (punkt 2 — den er målbar uden dommer). Eftermiddag: den
første NYE kilde i pipelinen — én dansk MC-forhandler med skriftligt ja, kørt
gennem det eksisterende YAML-format. Og derefter ville jeg skifte målestok:
sitet har nu i ni runder været målt mod et screenshot af Bilbasen; det er
aldrig blevet målt mod **en rigtig køber**. Fem danskere med A2-kørekort og et
"find en mc under 60.000 du ville køre hen og se" — dét er den kritiker, loopet
ikke kan simulere, og den eneste, der kan afgøre om kørekortfilteret (vores ene
strukturelle fordel) faktisk bærer. Blind-loopet genoptages den dag, en af de
store ting (claim-flow, beskeder, betaling) har bygget NYE sider, der ikke har
mødt en dommer endnu.

---

## Resumé

1. Blind dom: **7–1 til Bikerbasen, uændret** — men nu er alle syv "klart", og
   friskheds-anken er væk. Kun mærkeside-mobil tabes, på ét tal: første kort
   ≈860 mod ≈282.
2. Friskheden er REEL: REST 24.08 viser alle 4 kilder `sidst_set` kl. 15:28–29
   samme dag, 616 rå/602 viste; VDP siger "sidst bekræftet i dag". MEN cron'en
   er fjernet (`affe043`, menneskets valg) — friskheden er manuel fra i morgen.
3. D9-status: 11 lukket, 1 delvist (M1: ≈860/≈820 mod mål ≤700), 1 måleartefakt
   (S1). D8-resterne S4/S5/A2 lukket (S4 to minutter efter optagelsen); S6 + F5
   står som P3.
4. **STATUSDOM: stop blind-loopet.** Ingen P1, ingen falske påstande, referencens
   restfordele er ting, vi ikke må kopiere. Resten er 5 punkter: cron-beslutning,
   D9-M1-resten, flere kilder, claim-verifikation, søgeagent-mail — tre af fem
   venter på menneskets nøgler (cron-ja, Resend, kildeaftaler).
5. Næste arbejdsdag: cron + D9-M1 om formiddagen, ny kilde om eftermiddagen —
   og skift målestok fra Bilbasen-screenshots til fem rigtige købere.
