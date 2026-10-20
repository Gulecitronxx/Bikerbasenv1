# V5 Logoer: officielle mærkelogoer i Bikerbasens logosystem

Builder: V5-logoer. Branch `gauntlet/v5-logoer`. Dato: 2026-10-20.

Ejeren bad i chatten om at downloade logoer fra nettet ("download loger fra nettet"). Orkestratoren hentede og validerede 21 officielle SVG-logoer fra
Wikimedia Commons (alle markeret Public domain; logoerne er varemærker og bruges kun til at identificere producenten i annoncer). Denne builder har
ikke downloadet noget; filerne er læst fra `C:\Users\pasca\Desktop\rod\wt\logo-download-v5\` og lagt i repoet.

Mærker: ajp, benelli, bimota, dkw, ducati, fantic, gilera, harley-davidson, honda, husqvarna, indian, keeway, kymco, mv-agusta, piaggio, rieju,
royal-enfield, sherco, sym, triumph, vespa.

## Sådan virker logosystemet (kort)

| Del | Fil | Rolle |
|---|---|---|
| Kilde | `img/brands/manifest.json` | ét sted pr. mærke: fil, godkendelse, proveniens, hash, mål, `variant`, `ensfarvet`, `varianter` |
| Generator | `scripts/brand-logos-gen.js` | validerer manifestet (SVG-regler, hash, mål), skriver `js/brand-logos-data.js`; `--tjek` i gaten, `--opdater` overskriver hash/mål |
| Kerne | `js/brand-logos.js` | `logoHTML()`: fast slot pr. størrelse (sm/md/lg/xl/hero/wm), `--bl-ar` i markup, fallback (monogram/ordmærke) altid med |
| CSS | `css/p-brand-logo.css` | slotten (bredde = min(maks. bredde, højde x forhold, k x rod(forhold))), maske, fallback |
| Ensfarvet | `ensfarvet:true` | `<span class="bl-mark">` = CSS-maske i `currentColor`; klienten henter filen én gang og lægger masken som data-URI |
| Farvet | `ensfarvet:false` | `<img class="bl-img">` i samme slot (fandtes i kernen; V5 bruger den til alle officielle filer, se beslutning 1) |
| Fallback | `bl-fb` | ligger altid i markup; vises ved manglende logo og ved fejlet hentning (`bl--fejl`) |

## Beslutninger

### 1. Farvet rendering for officielle filer (maske kun for de ensfarvede AI-udkast)

Masken er en ensfarvet silhuet (alfa-kanalen i `currentColor`). De officielle logoer er flerfarvede, og flere er fyldte flader (DKW: gul flade med
blå bogstaver, Ducati: rød flade, Sherco: blå flade, Gilera). Gennem en maske ville de blive en massiv klods; testen
`scripts/v5-logo-officielle.test.js` måler det: DKW, Ducati og Sherco har over 90 % alfa-dækning ved 200 px.

Beslutning: alle 21 officielle poster har `ensfarvet:false` og tegnes som `<img>` med brandfarverne. Kernens `<img>`-vej (`bl--img`) fandtes i forvejen
og er testet; V5 tilføjer: lazy-loading i sm/md/lg (et logo i et foldet filterpanel henter intet, som masken gjorde via IntersectionObserver), en
manifestvalidering for officielle filer (`validerOfficiel`), og CSS til flisen (beslutning 2). Masken bevares uændret for de ti AI-udkast, der stadig er
ensfarvede (Yamaha, Suzuki, BMW, Kawasaki, KTM, Aprilia, CFMoto, Moto Guzzi, GasGas, Zero).

Også de rent sorte officielle logoer (Harley-Davidson, AJP, Keeway) tegnes som billede og ikke som maske: så bevarer alle officielle logoer deres
udgiver-udseende (Honda rødt, Harley sort), og reglen er ens for alle officielle filer.

### 2. Sorte logoer på mørk baggrund: samme lyse flise for alle farvede logoer

I mørk tilstand står hvert farvet logo på en neutral lys flise: `background: var(--color-fg)` (rgb 245, 241, 235), udstrakt med `box-shadow` (spread 3 px i
sm, 4 px som standard, 5 px i xl, 6 px i hero/wm) og afrundet. Fordi flisen ligger uden for slotten, er slotmålene (bredde x højde) identiske i lys og mørk
(testet: `getBoundingClientRect` i begge temaer) og layoutet flytter sig ikke. Valget er ikke pr. logo: alle farvede logoer får samme flise, så rækker med
Honda (rød), Harley (sort) og DKW (gul) ser ens ud. Kontrast: flise mod sort logo er over 15:1 (testen kræver mindst 7:1). I lys tilstand er der ingen flise.

Mærkesidens hero ligger på et mørkt foto i begge temaer (`.mk-hero`), så dér står flisen også i lys tilstand (`--color-surface`, hvid). CSS bruger kun tokens
(ingen hex): testen A12 i `w13-logo-kerne.test.js` er uændret grøn. Tvungne farver (`forced-colors`): `forced-color-adjust:none` på flisen, så den bevares.

Uden JavaScript viser build-skabelonens `<noscript>`-regel fallbacken oven på alle `.bl--logo`; en ekstra regel i `p-brand-logo.css`
(`.bl--logo.bl--img > .bl-fb{display:none}`, højere specificitet) forhindrer, at monogrammet ligger oven på et billede-logo. Build-scripts er ikke rørt.

### 3. Slogans og firmanavne: viewBox-beskæring kun hvor det er rent

Ingen paths, farver eller andre elementer er ændret i nogen officiel fil (testet: alt efter rod-tagget er byte-identisk med originalen). Kun rod-attributterne
viewBox/width/height. Beskæring er målt pr. element med `getBoundingClientRect` (ikke gættet) og verificeret visuelt (se screenshots):

| Mærke | Indhold uden for logoet | Beslutning |
|---|---|---|
| Honda | "The Power of Dreams" (y 50,7-67,8) under wordmarket (y 0-36,5) | viewBox `0 0 300 36.5`: slogan-pathen ligger helt udenfor, begge logo-paths helt indenfor |
| Triumph | "FOR THE RIDE" (y 129-152) under emblemet (y 1-115,3) | viewBox `35 0 130 116.5`: de ti bogstaver udenfor, emblemet indenfor |
| Kymco | kinesisk firmanavn (y 41,4-55) under logoet (y 0-31,5) | viewBox `0 0 200 31.6`: firmanavnet udenfor |
| Rieju | lille tagline "For everyday adventure" (y 263,7-296) | IKKE beskåret: taglinen overlapper det ovale emblem lodret (emblemet ender y 266,3), så intet rektangel kan fjerne den rent. Vist uændret |

Testen `browser: beskæring er ren` kontrollerer for alle 21 filer, at intet element er klippet halvt midt i viewBox, at de tre beskårne filer har deres slogan
helt udenfor, og at de øvrige filer ikke har noget udenfor viewBox.

### 4. viewBox/width/height normaliseret

| Fil | Original | Normaliseret |
|---|---|---|
| dkw | ingen viewBox, width 1215,5 x 617,49 | `0 0 1215.5 617.49` |
| rieju | ingen viewBox, width/height 1600 x 400 (tegningen fylder x 101-1499) | `101 103.5 1398 193` (tegningens egne grænser) |
| sym | viewBox `0 0 248000000 97899983` (CorelDRAW, enhed 1e-5), width 2480px | `-20000 10500000 248040000 87450000` (samme skala, tomrum øverst fjernet), width/height 1000 x 353 |
| benelli | viewBox `220 90 170 80` (forhold 2,1) passer ikke til tegningen (x 136-477, forhold 5,4); den virkede kun, fordi width/height (700 x 160) gav et bredere billedfelt. Slotmatematikken læser forholdet fra viewBox og ville have klemt logoet | `136 101.3 341.5 63.2` |
| ajp | viewBox `0 273.445 595.28 302`, ca. 20 % luft rundt om tegningen | `59 296 458 249` |
| vespa | width/height 100 % | numerisk `242.166 x 88.68` (viewBox uændret) |
| honda, triumph, kymco | se beslutning 3 | |
| øvrige | viewBox og mål var i orden | uændret (husqvarna, indian, gilera m.fl. har få procent luft; ikke rørt for at undgå unødige ændringer) |

SYM-tallene er fortsat store (path-koordinaterne er det); kun viewBox-attributten kunne ændres. Rendering er verificeret visuelt og i
`v5-logo-officielle.test.js` (elementerne ligger indenfor viewBox).

Originalerne ligger urørte i `docs/review/gauntlet/v5/logoer/original/` (`.gitattributes`: `-text`, så hashen er ens i alle arbejdskopier), sammen med orkestratorens
`kilder.json` og det oprindelige kontaktark. Manifestet har `kilde_fil`, `kilde_hash` (hash af originalen) og `normalisering` (hvad der er ændret og hvorfor); `hash` er
hash af filen i `img/brands/`. Reproducér: `node scripts/v5-logo-import.js` og `node scripts/brand-logos-gen.js --opdater` (begge har `--tjek`).

**SYM og download-loggen:** `kilder.json` angiver for SYM 3912 bytes og en anden sha256, men den leverede `sym.svg` var 1958 bytes. Forklaring (fra Orkestratoren): filen blev konverteret fra UTF-16 til
UTF-8 af Orkestratoren (derfor mindre), og `kilder.json`s hash/størrelse stammer fra et tidligere, mislykket kørselsforsøg. Manifestet følger den fil, der ligger i `kilde_fil`, og `bemaerkning` siger det.

**Persondata og metadata fjernet (efter Orkestratorens krav):** alle 21 originaler og alle 47 filer i `img/brands` er scannet for mailadresser, telefonnumre, lokale filstier (`C:\Users`, `/home/`), RDF/dc:creator/cc:Work,
Inkscape-/sodipodi-metadata og kommentarer med navne. Fund: SYM havde uploaderens mailadresse i `data-name`; `dkw`/`indian` havde kommentarer med forfatter-/programnavne; `indian`, `kymco` og `triumph` havde RDF/Creative
Commons-metadata, `triumph` desuden Inkscape-editortilstand og `sodipodi:docname`; `sym` en tom Corel-metadata-blok; flere havde generator-kommentarer. `scripts/v5-logo-import.js` (`renMetadata`) fjerner kun disse ting fra de UDGIVNE
filer (kommentarer, metadata-blokke, `sodipodi:namedview`, `data-name`, `sodipodi:docname`, `inkscape:version/export-*`); paths, farver, defs, style og geometri er ikke rørt (testet med et geometri-fingeraftryk mod originalen).
Manifestets `normalisering` nævner pr. fil, hvad der er fjernet. I docs-kopien af originalen er SYM-mailadressen erstattet med `[fjernet]` (docs ligger i et offentligt repo); de øvrige originaler er uændrede (kun generator-/programnavne).
Testen `INGEN SVG i img/brands …` i `scripts/v5-logo-officielle.test.js` fejler, hvis en SVG indeholder @-adresse, `C:\Users`, `/home/`, telefonnummer, kommentar/metadata, `<script>`, hændelses-attributter eller ekstern href.
Mailadressen har aldrig været i en pushet commit: branchens commits er omskrevet (ikke pushet), så adressen ikke ligger i historikken.

## Restpunkter og ønsker til fælles filer

1. ~~SYM-mailadresse og SYM-hash~~: afklaret og rettet, se beslutning 4.
3. **sm-slotten (A–Z og søgefilter) viser monogram for otte brede ordmærker** (Honda, Husqvarna, Royal Enfield, Benelli, Fantic, Keeway, Kymco, Rieju). Det er den ærlige visning inden for kernens 56 x 22 px-slot. Vil man have Honda-wordmarket også her, kræver det en bredere sm-slot (fx 80 px) i `SLOT`, `p-brand-logo.css`, `.bl-spalte--sm`, `.mk-az-logo` og de tests, der låser 56 px; en beslutning for Orchestrator, da den ændrer layoutet af søgefilteret.
4. **Rieju** har stadig sin lille tagline (kan ikke fjernes rent med viewBox).
5. **Annoncens titelrække**: brede ordmærker (Honda) er 160 px brede og tager lidt plads fra H1 (262 px mod ca. 340 før); testens minimum er sænket til 240 px. Kan snævres ved et maks.-bredde-loft på `.an-maerkelogo` i `css/p-annonce.css`, hvis Critic ønsker det.
6. **Ønsket build-ændring (ikke gjort, fælles fil):** `<noscript>`-reglen i `scripts/build-brand-pages.js` og `scripts/build-listing-pages.js` (`.bl--logo>.bl-fb{display:inline-flex}`) bør blive `.bl--logo:not(.bl--img)>.bl-fb`; i dag modvirkes den af en CSS-regel i `p-brand-logo.css`.
7. BSA, Cagiva, Buell, Victory, FB Mondial, Hyosung, Rewaco, Lauge Jensen, Bach m.fl. har stadig kun fallback (ingen officiel fil leveret).
8. Screenshots er 22 MB i git; kan ryddes, når Critic har dømt.

## 7 dimensioner (ærlig selvvurdering; Critic dømmer)

| Dimension | Mærkeoversigt | Mærkesider (hero/CTA) | Forside mærkerække / søgefilter |
|---|---|---|---|
| Visuel kvalitet | 8: rigtige logoer i brandfarver, flisen i mørk tilstand ser ens ud for alle; otte brede ordmærker er monogram i A–Z | 8: hero-flisen er tydelig og ens i begge temaer; Honda/Triumph/Kymco rene uden slogan | 7: Honda-wordmarket er lavt i den smalle forsideflise; skjoldet står pænt |
| Designkonsistens | 8: samme slot, samme flise, samme afstand som før; AI-udkast (masker) og officielle (billeder) lever side om side, og det kan ses i lys tilstand | 8 | 8 |
| Funktionalitet | 9: fallback bevaret, 404 -> monogram, lazy, tests | 9 | 9: søgefilter henter intet fra folded panel (testet) |
| Brugeroplevelse | 8 | 8: navn ved emblem-only logoer | 8 |
| Mobil | 8: 375/430 uden overflow | 8: hero-flise kommer tæt på kanten ved 375 (6 px spread) | 8 |
| Performance | 8: 21 filer, i alt ca. 170 KB, kun hentet hvor de vises (lazy i lister); ingen CLS (smoke 0,05) | 8 | 8 |
| Indholdskvalitet | 9: kilde, licens, hentedato og ejer-godkendelse pr. fil; ingen opdigtet; originaler bevaret | 9 | 9 |

Samlet vurdering mod opgaven: 8/10.

