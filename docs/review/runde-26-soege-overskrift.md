# Runde 26 — søgesidens H1 (29.09.2026)

Bruger: "kør loopet igen. du behøver ikke spørger igen." Runde 25 lukkede den
sidste kendte finding, så runden startede med et nyt blik: fuld sammenligning
mod bilbasen.dk (forside, søgeside, annonce på desktop og 390px, opret-annonce,
kildeside), kørt i lyst tema — ikke det mørke, browseren selv valgte.

## Hvad blev afvist, og hvorfor

Fire udslag viste sig at være målefejl, ikke fejl i siden:

- **Forsidens hero uden foto i lyst tema.** Billedet var indlæst (1440 px
  naturlig bredde); skærmbilledet blev taget midt i fade-in. Genoptaget efter 2 s.
- **Tre grå typefliser på opret-annonce** (Scooter, Classic, Cross). Alle otte
  filer findes og indlæses; de fem sidste har `loading="lazy"`, og billedet blev
  taget, før de nåede at hente. Målt: `naturalWidth` 456 på alle otte.
- **Grå Kawasaki ZR-7-kort på kildesiden.** Samme årsag; `naturalWidth` 596.
- **"CTA scroller ud af syne" på annoncen.** Desktop: `.external-detail-aside`
  er sticky (runde 7-fixet virker). Mobil: `.listing-actionbar` er fixed i
  bunden med pris og kildeknap. Det, jeg først målte, var den skjulte
  mobil-variant af knappen i overskriften.

Lighthouse blev ikke kørt igen: runde 19 har tallene (100/100/100/100 mod
80/77/100/50), og den eneste åbne performance-finding — cache-headere — venter
på `CLOUDFLARE_API_TOKEN` og DNS-omlægning, ikke på kode.

## To reelle fund, begge i `js/search.js`

**1. Region blev hængt på "i Danmark".** `soegning.html?regions=Syddanmark`
gav H1 og title "Motorcykler til salg i Danmark i Syddanmark". Koden startede
altid fra "…i Danmark" og føjede ` i ${region}` til. Nu erstatter regionen
"i Danmark".

**2. Kildesiden ignorerede sit eget filter.** `?kilde=mcsyd.dk` viste 345
annoncer fra ét sted under overskriften "Motorcykler til salg i Danmark". Det
er det nærmeste, en indekseret forhandler har til en profil (der er ingen
sælgerprofil for eksterne, jf. regel 2), så overskriften skal sige, hvis side
det er: "Motorcykler hos MC Syd". Kildenavnet slås op i de filtrerede
annoncer; findes det ikke, står domænet. Kombineret med et mærkefilter vinder
mærket ("Honda til salg"), og kildechippen viser resten. `js/seo.js` afleder
title fra H1, så titlen fulgte med uden at blive rørt.

Logikken er flyttet ud i `soegeoverskrift(state, listings)`, så den kan
testes; 8 nye tests i `js/soegeoverskrift.test.js`, registreret i
`package.json` (scriptet opremser filerne, så en ny fil, der ikke føjes til
listen, ville være en test, der aldrig kører — første kørsel gav stadig 336).

## Aggregator-reglerne

Ingen berørt. Kun visningstekst; ingen crawler-, lagrings- eller claim-kode.

## Verifikation

Browser, lyst tema, 1440 px: region → "Motorcykler til salg i Syddanmark";
kilde → "Motorcykler hos MC Syd" (title følger); kilde+mærke → "Honda til salg".
**Gate:** `node --check`, `npm test` 344/344 (336 + 8), `node scripts/build.js`,
`node scripts/udgiv.js` — alle grønne.
