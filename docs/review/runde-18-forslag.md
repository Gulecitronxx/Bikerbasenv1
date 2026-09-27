# Runde 18 — forslag fra en frisk bilbasen.dk-sammenligning (27.09.2026)

Runde 10's STOP gjaldt de fulde blinde sammenligninger af forside/søgning/
annonce mod bilbasen.dk — konklusionen dengang var aftagende udbytte, og at
referencens resterende fordele var ting, reglerne forbyder at kopiere
(galleri, fuld annoncetekst, kontaktoplysninger). De to forslag her er ikke
en genoptagelse af det loop. De er to snævre, navngivne mekanikker fra en ny
gennemgang af bilbasen.dk (forside + søgeresultater, 27.09.2026), som ikke
var i spil i runde 5-10's screenshots. Ingen af dem kræver et felt uden for
§2's feltliste eller rører kilde/rate-limit-reglerne.

Status: **forslag**, ikke `valgt`. Kræver critic's blinde efterprøvning og
dev's vurdering, før noget kodes — `dev` er den eneste rolle, der må skrive
produktionskode.

---

## R18-1 — TRUKKET TILBAGE (27.09.2026): findingen var forkert

**Oprindelig påstand:** hero-søgeknappen er statisk, Bilbasens er ikke.

**Hvorfor den var forkert:** jeg læste kun den statiske markup i
`index.html:214` (`#hs-submit`, tekst "Søg motorcykler") og konkluderede
derfra, at intet reagerer på filtervalg. Jeg tjekkede ikke `js/home.js`'s
runtime — hvor mekanikken allerede findes, bare andetsteds:

- `js/home.js:174-195` (`heroFiltre`/`heroListe`) regner en live liste af
  `Filtrering.anvendFiltre(Store.getAllListings(), filtre, null, skjult)` —
  samme delte filterkæde som `soegning.html` bruger (`js/filtrering.js`,
  indført runde 3 netop for at forhindre to sider, der tæller hver sin vej).
- `js/home.js:224-330` (`opdaterHero`) skriver resultatet ind i
  `#hero-count-hint` (**ikke** knappen): "Din søgning matcher **91**
  annoncer lige nu." — efterprøvet live i browseren 27.09.2026: valgte
  "Cruiser" i typefeltet, linjen skiftede fra det statiske "603 annoncer …"
  til "Din søgning matcher 91 annoncer lige nu." uden sideskift.
- `js/home.js:332-338` binder `input`/`change` på præcis de tre felter
  (`hs-query`, `hs-type`, `hs-price`) plus kørekort-radioerne og et
  `reset`-håndtag — dækker samme overflade, mit forslag pegede på.
- Knappens tekst er med vilje uændret: kommentaren ved linje 318-330 siger
  det direkte — en tidligere runde ("Aim-loop runde 16") PRØVEDE en
  dynamisk knaptekst ("Vis 602 annoncer") og trak den tilbage til fordel
  for én konsistent CTA-tekst hele siden igennem (den optræder fire steder:
  hero, "Sådan fungerer det", slut-CTA, header), med tallet i stedet
  liggende lige over knappen, hvor det opdateres af samme funktion.

**Lektion for mig selv, ikke kun for arkivet:** en finding, der citerer
statisk markup uden at følge JS'ens runtime-bindinger, kan se ud som et
reelt hul, selvom mekanismen allerede findes ét niveau dybere. Næste gang
et "mangler X" skal først eftervises med `grep` på funktionsnavnet i den
tilhørende `.js`-fil, ikke kun på teksten i `.html`-filen.

**Status:** trukket tilbage, intet at rette. Ingen kode ændret for R18-1.

---

## R18-2 — forsiden har to rails, Bilbasen har tre

**Rolle:** designer · **Akse:** design/funktionalitet · **Sev:** P3

**Fil:** `js/home.js:911` (`vaelgFeatured` — kuraterede seks, spredt på
kørekort og mærke), `js/home.js:729` (`tegnNyeste`/`renderNewest` —
kronologisk nyeste)

**Problem:** Bilbasen.dk viser tre parallelle lister på forsiden: alle biler,
kun private sælgere, og nyeste. Bikerbasen har kun de to nævnte ovenfor.
Data til en tredje rail findes allerede — tri-state `saelgertype`
(forhandler/privat/null, indført i D7-F1) kunne bære en "Kun fra
forhandlere"-liste uden nye felter.

**Hvorfor dette IKKE bare er "kopiér Bilbasen":** runde 5's D5-F5 fjernede
med vilje overflødig prosa og rails, fordi mere skrolning uden ny information
var en regression, ikke en forbedring (side 9 754 → 8 114 px). En tredje rail
er kun en forbedring, hvis den viser noget de to andre ikke gør — "kun
forhandlere" gør det (udelukker private, som `vaelgFeatured` i dag blander
ind), men skal måles mod den samme linjal D5-F5 brugte: hvor mange ekstra
piksler koster den, og hvad får brugeren for dem.

**Forslag til retning:** critic bør først afgøre, om en forhandler-rail
overhovedet er efterspurgt (findes der klik-data på filteret
`soegning.html?dealer=1`, nævnt i footer-linket "Kun forhandlere"?) — før
dev bruger tid på en rail, ingen bruger filteret, der allerede findes,
efterspørger.

**Efterprøvet 27.09.2026 — delvist svar:** der findes måle-infrastruktur
(GA4 bag samtykke, `js/maaling.js`, se filens egen historik C3 23.08.2026),
og `js/search.js:1548-1556` (`maalSoegning`) sender et `search`-event for
hvert stabile filtersæt (800 ms debounce mod tastetryk). Men
`Maaling.soegning()` (`js/maaling.js:57-68`) læser kun
`q, brands, types, koerekort, priceMax, priceMin, sort, results` fra
`state` — **`state.dealerOnly` (sat i `js/search.js:61` fra `?dealer=1`,
findes i samme objekt) bliver aldrig sendt med.** Der er heller ingen
Supabase-tabel til søge- eller kliklog (`grep` i `supabase/` gav intet).

Så: en bruger, der søger med "Kun forhandlere" slået til, sender i dag et
`search`-event, der ser identisk ud med ét uden — dimensionen findes ikke i
det tal, vi kan trække ud af GA4's hændelser. GA4's *automatiske*
sidevisnings-event fanger som udgangspunkt fuld URL (`page_location`), og
`scripts/inline-analytics.js` sætter ingen `page_location`-override, så
`?dealer=1` er sandsynligvis synlig i de rå pageviews for de besøgende, der
har sagt "Accepter alle" til statistik-cookien — men **det kan jeg ikke
bekræfte herfra**: det kræver login til selve GA4-egenskaben
(måle-id `G-RWJZ8NJB0C`), som jeg ikke har adgang til, og en eventuel
"Redact query parameters"-indstilling i GA4-administrationen kan have
fjernet den alligevel.

**Konklusion:** forslaget kan ikke gøres til `valgt` på et rigtigt tal endnu.
To adskilte veje herfra — begge kræver mennesket:
1. Slå op i GA4 (kræver kontoadgang) om `?dealer=1` optræder i
   `page_location` på `soegning.html`-sidevisninger, og hvor mange.
2. ~~Ret `js/maaling.js:57-68` til at sende `dealer: state.dealerOnly` med~~
   **rettet 27.09.2026** — `search`-eventet sender nu `dealer: true`, når
   `?dealer=1` er aktivt, og udelader feltet ellers (samme mønster som
   `koerekort`/`types`). To nye asserts i `js/maaling.test.js` (dealer=true
   sendes, dealer=false udelades). Fuld gate kørt: `node --check` (alle
   js/crawler/scripts-filer), `npm test` (333/333), `node scripts/build.js`,
   `node scripts/udgiv.js` — alle grønne.

   **Giver ikke et tal i dag.** Fremadrettet data, ikke bagudrettet — det
   besvarer først "bruger nogen filteret" om nogle uger, når GA4 har samlet
   `search`-hændelser med det nye felt. Vej 1 (kontoadgang, se ovenfor) er
   stadig den eneste, der kan svare NU.

Uden ét af de to svar (nu: vej 1's opslag, eller vent på vej 2's data) er
R18-2 fortsat en gætteforbedring, præcis den kategori runde 10 bad om at
stoppe med at måle på screenshots alene.

---

## Status ved lukning af runde 18 (aim-loop, 27.09.2026)

Efter R18-1's tilbagetrækning og R18-2's rettelse blev der brugt en ny
kritik-cyklus på at lede efter mere at sammenligne mod bilbasen.dk. Resultat:

- **Forsiden, søgesiden, annoncesiden, opret-annonce-flowet og
  sælgerprofilen er alle allerede dækket i dybden** — henholdsvis runde
  1-13 + K16/K17 (commits, ikke egne docs), `opret-runde-1/2/3-kritik.md`,
  og `bar/` (dedikeret Bilbasen-benchmark af sælgerprofilen, se
  `js/forhandler.js`'s egen henvisning til `bar/RUBRIC.md`). En ny fuld
  blind sammenligning af de samme fem overflader ville med stor
  sandsynlighed gentage runde 10's egen dom: aftagende udbytte.
- **Frisk sundhedstjek i browseren (27.09.2026, produktion, `v=b51efa92`):**
  nul konsolfejl, alle 12 netværkskald på forsiden 200. Ingen ny drift at
  rette.
- **Konklusion:** denne cyklus fandt ingen ny, navngivet finding, der
  holder til samme bevisstandard som R18-2. Det er ikke det samme som
  "intet at forbedre" — runde 9's kritiker pegede allerede på de reelle
  næste skridt, og de er stadig ubesvarede, fordi de kræver mennesket, ikke
  mere kode: crawl-kadence (manuel i dag), claim-verifikation
  (domæne/kode-verifikation ikke bygget), søgeagent-mail (Resend-nøgle
  mangler), flere kilder (kræver tilladelsesaftaler). Den, der vil have
  næste reelle gevinst, finder den der — ikke i endnu en
  skærmbillede-sammenligning med bilbasen.dk.
