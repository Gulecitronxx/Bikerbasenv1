# DECISIONS — afviste findings og de valg, der ikke er til forhandling

To slags indhold her, og de skal holdes adskilt.

**Afvisninger.** `dev` må afvise en finding, men kun skriftligt og med
begrundelse. En afvisning uden måling er ikke en afvisning, det er en udsættelse.

```
### <ID> afvist — <dato>
FINDING: <hvad der blev påstået>
HVORFOR AFVIST: <begrundelse, med tal hvor der kan måles>
BEVIS: <hvordan det blev efterprøvet>
```

**Låste valg.** Ting, en senere runde ikke må lave om uden at spørge mennesket —
fordi de er betalt for én gang og gerne skal forblive løste.

---

## Låst

### Stakken bliver som den er
Statiske HTML-sider, vanilla JS, én CSS-fil, Supabase bagved. Ingen framework,
ingen bundler, ingen TypeScript. Sitet er live på GitHub Pages fra `main`.
En migrering er ikke en forbedring, en køber kan se, og det målte gulv
(Lighthouse) er lettere at holde uden.

### Gaten er tilpasset repoet, ikke omvendt
Den oprindelige specifikation nævnte `npm run typecheck`, `npm run lint` og
`npm run build`. Ingen af dem findes: intet TypeScript, ingen eslint-config, nul
devDependencies. Gaten er derfor `node --check` på hver JS-fil, `npm test`,
`node scripts/build.js` og Lighthouse på tre sider.

**Lint-trinnet er droppet med vilje.** At indføre eslint på ~6.000 linjer
eksisterende kode er en selvstændig beslutning med sin egen oprydning, ikke et
gate-trin man tilføjer i forbifarten. Skal det ind, er det en finding for sig.

### Ærlighed slår fuldstændighed
Vi viser aldrig et felt, vi ikke har dækning for. Mangler tallet, står der "Ikke
oplyst". Et gættet felt vejer tungere imod os end et manglende — og det er målt:
tre blinde kritikere tabte uafhængigt tillidskategorien på præcis den fejl
(opdigtede fotos i galleriet, "under markedspris" på en 1968-Nimbus, og et
stjernegennemsnit der ikke kunne udledes af anmeldelserne).

### A2-grænsen er 47 hk, og den er skrevet i kilowatt
A2 er lovligt 35 kW. 35 / 0,7355 = 47,59 hk. Grænsen stod på 48, fordi nogen
rundede op — men 48 hk ER 35,30 kW, altså over loftet, og en Harley Iron 883 med
48 hk stod derfor med "Kørekort A2" til en tyveårig. Testene låser grænsen i kW,
ikke i hk, så en fremtidig "oprydning" ikke kan flytte den tilbage.

### Crawlerens juridiske spærrer røres ikke uden mennesket
`tilladelse_modtaget`, robots.txt-respekten, `crawl_delay_ms`, felt-whitelisten,
opt-out. `tilladelse_modtaget` er ikke en indstilling, der åbner en dør — det er
en nedskrivning af, at en aftale findes.

### Kilden ejer sine billeder
Vi indekserer miniaturen og linker til kilden. Vi kopierer ikke gallerier, og vi
viser ikke et pressefoto af modellen som om det var annoncens.

---

## Afvist

<!-- dev skriver herunder -->

### C-010 delvist afvist — 17.08.2026
**FINDING:** "`fingerprint`-reglen er skrevet ned, men ikke implementeret.
Kommentaren i `crawler/normalize.js:485` lover: *Samme motorcykel annonceret tre
steder skal være ÉN annonce hos os med tre kilde-links.* Hashen beregnes, gemmes
og indekseres — og læses aldrig." Findingen tilbyder selv to udgange: gruppér på
`fingerprint` i læsestien, eller skriv kommentaren om, så den beskriver det,
koden gør.

**HVAD DER ER AFVIST:** sammenlægningen. **Hvad der er lavet:** kommentaren er
skrevet om, med målingen i sig, og målingen er låst i en test
(`crawler/normalize.test.js`, "fingerprint kan IKKE skelne ens nyt lager").
Kolonnen og indekset bliver liggende, og der står nu hvorfor.

**HVORFOR AFVIST — målt på drift 17.08.2026, 332 aktive annoncer fra ÉN kilde:**

| | |
|---|---|
| unikke `fingerprint` | **238** af 332 |
| grupper der deler nøgle | **41** |
| rækker involveret | **135 = 40,7 %** af lageret |
| største gruppe | **13** rækker |
| af de 135 med `stand: 'ny'` | **128** |
| grupper hvor alle `kilde_annonce_id` er forskellige | **41 af 41** |
| samme måling med `km` i nøglen | 37 grupper, **126** rækker (38 %) |

De 41 grupper er ikke samme motorcykel annonceret flere steder. Der er kun én
kilde i drift, så de er alle *inden for* MC Syd — syv ens Honda CMX 500 Rebel
2024 til 84.995 kr., seks ens Honda NX 500 2024 til 89.995 kr., og så videre.
Syv forskellige motorcykler med hver sit lagernummer hos kilden og hvert sit
stelnummer. Kilden holder dem adskilt; nøglen kan ikke.

En sammenlægning på `fingerprint` ville altså gøre 332 annoncer til 238 og
**skjule 94 motorcykler, en forhandler faktisk har til salg** — og vise et kort,
der påstod "13 kilde-links" til 13 forskellige maskiner. Det er præcis den
slags påstand, "Ærlighed slår fuldstændighed" blev skrevet imod: at skjule en
rigtig annonce vejer tungere imod os end at vise to.

At tage `km` med i nøglen retter det ikke. 128 af de 135 kolliderende rækker er
nye maskiner uden kilometerstand; kun 7 af 135 har en km at skelne på. Med km i
nøglen er der stadig 37 grupper og 126 rækker.

**HVAD DER SKULLE TIL:** et felt, der adskiller to ens maskiner fra den samme
maskine to steder — stelnummer, registreringsnummer eller et billedmatch. Ingen
af dem står i felt-whitelisten i `crawler/db.js`, og ingen kilde giver os dem i
dag. Findes et sådant felt en dag, er sammenlægningen den rigtige rettelse, og
`fingerprint` er den halve nøgle, den skal bygge på. Indtil da er den en
kandidatnøgle, og det er nu det, kommentaren siger.

**BEVIS:** tolv anonyme GET mod `/rest/v1/eksterne_annoncer` med den offentlige
nøgle (`select=id,kilde_annonce_id,titel,maerke,model,aargang,km,pris_dkk,postnr,fingerprint,stand`,
`status=eq.aktiv`), hashen genberegnet lokalt med `crawler/normalize.js`s egen
`fingerprint()` og holdt op mod den gemte kolonne: **0 af 332 er uenige**, så
grupperingen er kildens tal og ikke min omregning. Ingen skrivning til
databasen. `npm run crawl:tjek` bagefter: MC Syd, 332 aktive annoncer, urørt.
