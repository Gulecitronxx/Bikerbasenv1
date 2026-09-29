# Runde 28 — kontrast: orange tekst på orange tint (29.09.2026)

Bruger: "kør loopet igen og push". Runden skulle tage mobil-filterskuffen og
tomme tilstande; begge er gennemgået, og den eneste reelle finding kom af en
måling, ikke af et blik.

## Gennemgået og fundet i orden

- **Mobil-filterskuffen (390 px).** Bundark med sticky overskrift ("Nulstil" +
  luk), sticky fod med "Vis 654 annoncer", antal på hver chip. Som runde 1
  roste den.
- **Rækkefølgen Mærke → Model → Kørekort** ser ud som drift fra runde 1 ("Kørekort
  som første gruppe"), men er en bevidst ændring: D7-S3, "Mærke først", lukket og
  verificeret i runde 8 og 9. Ikke rørt.
- **Tom søgning på mobil.** Ikon, overskrift, årsag ("Prøv kortere søgeord"),
  "Nulstil filtre" + "Sælg din motorcykel" og et "Gem søgningen"-tilbud.

## Bevidst ikke rørt: søgefeltets tekst klippes, mens man skriver

Feltet er 160 px bredt på 390 og har ca. 72 px til tekst mellem ikon og
ryd-knap, så "zzzzqqq" står som "zzzz". Efter søgning viser chippen under
feltet hele søgeordet, så det er kun mens man skriver, at det mærkes.

Det oplagte greb — skjul "Gem" og "Filtre", mens feltet har fokus, så det
fylder rækken — er ikke gjort, fordi det har en reel risiko: på iOS Safari
mister feltet fokus, når man rører ryd-knappen (knapper får ikke fokus ved tryk
der), så layoutet ville hoppe tilbage, før klikket registreres. En to-rækkes
bar koster ca. 56 px over det første kort og går imod D5-S1, som netop samlede
søgefelt, "Gem" og "Filtre" i én række efter Bilbasens SRP. Skal det løses, skal
det prøves på en rigtig iPhone, ikke i en emuleret viewport.

## Fundet: 4,20:1 på orange tekst på lys orange bund

En kontrastmåling (alle synlige tekstnoder, faktisk baggrund, AA 4,5:1 / 3:1 for
stor tekst) på ti sider i begge temaer gav nul udslag i mørkt tema og ét reelt i
lyst: `--color-primary` (#C6420E) på `--color-primary-tint` (#FFE6D9) er **4,20:1**.
`.regel-stat` ("35 kW" på forsiden, 13–15 px) lå under AA.

Parret bruges til tekst på flere steder end det, der blev målt: `.loesning-nr`,
`.avatar`, `.avatar-lg` og det valgte `.radio-card-label`. Kodebasen havde
allerede mønsteret til tre andre steder (`.preview-note`, `.status-pill.is-afventer`,
linje ~1516), som bruger `--color-primary-hover` (#A8380C) til tekst på tinten:
**5,43:1** i lyst tema. De fem steder er skiftet til samme token.

Mørkt tema er urørt og består i forvejen: `--color-primary` på tinten er 5,09:1,
`--color-primary-hover` 5,70:1 — skiftet gør ingen skade dér. Ikoner
(`.trust-icon`) er ikke rørt; ikoner kræver 3:1, og de står på 4,20.

**Målingens grænser.** Tekst på fotos (header og hero på forsiden, `.tile-count`
oven på fototile) kan scriptet ikke læse — baggrunden er et billede eller en
`color-mix`. De udslag var falske positiver ("hvid på hvid"); hero-teksten er
set i skærmbilleder i tidligere runder, ikke målt her.

## Aggregator-reglerne

Ingen berørt. Kun farvetokens på fem tekstregler.

## Verifikation

Kontrastmåling efter: forside, opret-annonce, om-bikerbasen, sikkerhed,
om-indeksering og login — nul reelle udslag i lyst tema.
**Gate:** `node --check`, `npm test` 344/344, `node scripts/build.js`,
`node scripts/udgiv.js` — alle grønne.
