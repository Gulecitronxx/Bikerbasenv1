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

## R18-1 — hero-søgeknappen er statisk, Bilbasens er ikke

**Rolle:** designer · **Akse:** funktionalitet · **Sev:** P2

**Fil:** `index.html:151` (`#hero-count-hint`), `index.html:214`
(`#hs-submit`)

**Problem:** `#hero-count-hint` viser totalantallet, sat ved page load, og
rører sig ikke, når brugeren ændrer type/pris/kørekort i `#hero-search-form`.
Knappen `#hs-submit` siger konstant "Søg motorcykler". På bilbasen.dk opdaterer
CTA-knappen sig selv til "Vis 41.573 biler" (eller hvad optællingen bliver)
for hver ændring i formularen, før der klikkes søg — brugeren ser konsekvensen
af filtrene, ikke først efter et sideskift.

**Hvorfor det er en reel forskel og ikke bare pynt:** siden bygger allerede
sit løfte på præcise tal ("603 annoncer", "Vi gætter aldrig") — et statisk
"Søg motorcykler"-CTA bryder ikke det løfte, men det udnytter heller ikke det,
lageret allerede kan svare på client-side. `kandidater`/`raekkefoelge` (samme
datasæt som `vaelgFeatured` bruger, `js/home.js:911`) er til stede i
hukommelsen på forsiden, så en optælling kræver ikke et ekstra kald.

**Forslag til retning (ikke bindende for dev):** knappens tekst opdateres til
"Vis N annoncer" ved hver `change`/`input` på `#hero-search-form`'s felter,
regnet af samme filterlogik som `soegning.html` bruger, så tallet ikke kan
komme i utakt med søgesidens eget. Falder tallet til 0, skal knappen sige det
— ikke skjule sig eller vise "0" råt (jf. `js/soegning-tom.test.js`'s
mønster for søgesidens tomtilstand).

**Risiko/faldgrube for critic at holde øje med:** et `input`-event på
`#hs-query` (fritekst) uden debounce kan omregne på hvert tastetryk — mål
kald/sekund før det godkendes.

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
