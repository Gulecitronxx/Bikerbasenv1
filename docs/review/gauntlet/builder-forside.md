# Builder — forside efter referencebillede 1

Branch `gauntlet/master`. Kilde: `33d238b`, genererede filer: `ef68c72`. Mål: `Bikerbasen billeder/…-1.png` (hero-variant: `…-9.png`).
Verifikationsgate grøn: `node --check` på alle js/crawler/scripts, `npm test` 384/384 (364 før + 20 nye), `node scripts/build.js`, `node scripts/udgiv.js`.

## Hvad der er bygget (punkt 1–7)

1. **Topbar** — hvid (lys) / mørk topbar på ALLE sider, ikke kun forsiden (den gennemsigtige forside-header er væk). Logo, Motorcykler, Mærker, Kørekort (CSS-undermenu A1/A2, åbner på hover og tastaturfokus), Om Bikerbasen, (Mine annoncer for indloggede), Favoritter, Log ind, Opret annonce i brandfarven. Kun links til sider, der findes (test). Headeren står ÉT sted (index.html); `scripts/synk-header.js` kopierer den til de 61 andre sider, generatorerne trækker den selv; en test (`--tjek`) fejler, hvis en side driver. Mobilskuffen, tema-, login- og dealer-nav-krogene er uændrede.
2. **Hero** — fuldbredde foto (`img/hero-*.webp`), kicker, h1 uændret, to linjer underlinje. Søgekortet overlapper fotoets underkant, fuld bredde: Mærke/model · Type · Maks. pris · Kørekort-segment · stor CTA med "N annoncer i Danmark" (N fra `Filtrering.anvendFiltre`, tom til lageret har svaret). Al søgelogik og filterkæde er bevaret. Fire tillidspunkter (inline SVG fra `js/icons.js`, 5 nye ikoner): kilden på kortet · kørekortfilter på oplyste tal · "Ikke oplyst" · du går videre til sælger.
3. **Udvalgte motorcykler** + **Sælg-panel** (`img/sell-cruiser.webp`, 26 KB, brugbar; tre sande ✓). Kortet er en variant af `listingCardHTML(l, i, { rich: true })` i `js/components.js`: titel+pris på én linje, `år | km | type`, kørekort-/ccm-/hk-chips kun for oplyste tal ("hk ikke oplyst" som dæmpet chip), sted + "Kilde: domæne" (eget kort: Privat/Forhandler). Antal kort følger gitterets spalter (5/4/3; 6 i vandret rulleliste på mobil). Andre sider får kortet med `{ rich: true }`; ingen andre sider er ændret.
4. **Udforsk efter type** — op til 8 fotofliser i én rulleliste med pil-knap; billeder `loading="eager"` (V-004), mørk gradient-scrim bag teksten (V-005). Flise → `type-*.html` hvis siden findes, ellers søgningen.
5. **Sådan virker Bikerbasen** — kompakt strip med nummer, ikon og pile + grøn "Køb og sælg trygt"-boks til `sikkerhed.html` (der findes ingen fællesskab/guides-side, så "Bliv en del af fællesskabet" er IKKE bygget).
6. **Tre kolonner** — Populære mærker (6, antal fra lageret), Udforsk efter kørekort (A1/A2/A), Find i din region (5). De gamle SEO-sektioner er samlet i ét lavmælt linkbånd (`.seo-links`) over footeren, så ingen intern linkmål er mistet. Linkinventar før/efter (renderet DOM, 1440): alle `maerke-*`, `koerekort-*`, `region-*`, `type-*`, `maerker.html` bevaret (+2 mærkesider, `koerekort=A`). Kun `soegning.html?type=…` og `?regions=…` for de fem typer/fire regioner, der nu har en fast side, er erstattet af den faste side.
7. **Forklaring og slut-CTA** — problem, løsning, "Skal du købe eller sælge" (de to spor) og slut-CTA bevaret; "Tryghed når du handler" (dublet af tillidsrækken) og "Nyeste annoncer" (dublet af udvalget; de indekserede har ingen dato) er fjernet. Footer uændret.

## Bevidste afvigelser fra billedet

- **Hjerte på alle kort**: det indekserede kort har kun sammenlign-knap (D-008: `favorites.listing_id` peger på egne annoncer; testen `eksternt-kort.test.js` låser det). Hjerte kun på egne annoncer. **Favoritter i topbaren** er skjult, til noget er gemt (samme begrundelse).
- **kg-chip** udeladt: ingen annonce i lageret oplyser vægt.
- **"N motorcykler"** står som **"N annoncer"** (D7-F2: samme motorcykel kan ligge hos to kilder). Én streng at ændre i `js/home.js`, hvis ejeren vil have ordet fra billedet.
- **Artikler & guides / Viden** i menuen, **grønne CTA'er**, **logoer på mærkefliser** (vi har ingen; monogram i stedet), **rytterfoto** i hero og sælg-panel, **opdigtede tal** og "vi fjerner svindel"/"stærkt fællesskab": udeladt (ingen dækning / ingen side).
- 4 kort + panel ved 1400–1699 px (5 først ved ≥ 1700 px): 5 kort à 205 px kan ikke bære titel + pris på én linje.

## Målinger

- Vandret overflow: `scrollWidth == clientWidth` ved 360/390/768/1024/1440/1920 px, lys og mørk. Sweep af 19 andre sider (alle hånd- og facetsider) ved 360/1440, lys/mørk: 0 overflow, 0 konsolfejl.
- Kontrast: al tekst på flade baggrunde ≥ AA (script over computed styles, 0 under 4,5:1/3:1). Tekst over foto/gradient (typefliser, hero, sælg-panel) målt på pixels bag teksten, 5. til 95. percentil: min **4,81:1 lys, 5,17:1 mørk** (typefliser V-005 før 2,0–3,0:1).
- CLS 0,0000 (1440, 390), 0,0001 (768). CSS 274,3 → 261,9 KB (død CSS fjernet), `js/home.js` 65,6 → 24,7 KB. Ingen nye billeder.
- Tastatur: tab-rækkefølge header → søgekort → kort; fokusring 2 px overalt; undermenu åbner på fokus; Escape lukker skuffen.
- Rettet undervejs: `wireFavoriteButtons(document)` sidst i `home.js` bandt hjerterne to gange (klik slog til og fra) — fjernet.

## Filer

`index.html`, `js/home.js`, `js/components.js` (rigtKortHTML), `js/icons.js`, `css/styles.css`, `scripts/synk-header.js` (ny), `scripts/build-brand-pages.js` + `build-facet-pages.js` (skrivemål/linkbånd), 12 håndskrevne sider (kun header), tests `js/rigt-kort.test.js` + `scripts/forside.test.js` (i `npm test`).

---

# Runde 2 (efter Critic: 3,5/5 — "vær mere modig")

Kilde-commit og build-commit: se `git log` (to commits efter `1da606a`). Gate grøn: syntaks, `npm test` 387/387, build, udgiv.

## Hvad der er ændret

1. **Nederste halvdel skåret til ÉN sektion.** "Hvorfor Bikerbasen" (3 korte punkter) + én `<details>` med de lange ærlige forklaringer (upålidelige tal, to udgaver, underkategori, "Skal du købe / sælge"-sporene med deres knapper). Problem-/løsnings-/slut-CTA-sektionerne og deres CSS er væk. Forsiden går nu: tre kolonner -> kompakt "Hvorfor" -> ét lavt linkbånd -> footer. Sidehøjde 1440 px: 4783 -> 2585 px. Link-script (renderet DOM, 1440): 51 interne mål før og efter, 0 mistet, 0 nye. Linkbåndet er nu flade rækker (Typer / Kørekort / Landsdele / Flere mærker / Genveje) i stedet for tre kolonner.
2. **5 kort ved 1440** (4 ved 1280–1439, 3 ved 1100–1279, 3 + panel under ved tablet, rulleliste på mobil). Kortet er kompakteret (14,5 px titel/pris, kortere type "Classic", kørekortchip "A" i stedet for "Kørekort A"; teksten ligger i title og skærmlæsertekst). **Ens venstrekant**: header, hero og alle sektioner på forsiden står i samme 1480 px container (x=32 ved 1440).
3. **Tre kolonner som billedet:** 6 mærker i én række (monogram-fliser med ens højde; der findes ingen brugbare logofiler, og vi opfinder ikke varemærkelogoer), A1/A2/A i ens fliser ("Let mc / Mellem mc / Alle mc"), 5 regioner i én række. Kolonnebredder 1,3 / 0,9 / 1,5.
4. **Lavere søgekort:** disclaimer-fodlinjen er væk (kortet 126 -> ca. 115 px højt). "Vi gætter aldrig / A2 afhænger af vægt og afledningsregel" står i tillidsrækken; det valgte kørekorts forbehold (A1/A2/A) vises under kortet først, når et kørekort er valgt. "Nulstil" ligger under antallet. **Hero-foto lysere:** scrim 84 -> 66 % og bund 55 -> 30 %; tekstkontrast målt på pixels: min 4,81 (lys) / 5,17 (mørk) ved alle bredder (tablet har egen scrim).
5. **Sælg-panel ryddet:** titel, tre ✓, foto i eget felt (aldrig under teksten), knap. Tablet: tekst til venstre, foto til højre.
6. **Fejl:** Escape lukker A1/A2-undermenuen (også ved hover; genåbner ved ny hover/fokus); placeholder "F.eks. MT-07" afkortes ikke ved 768; chips på én linje ved 768. **Mobil-LCP:** målt igen — LCP er hero-fotoet (34 KB på mobil, preloadet, `fetchpriority=high`) og ligger på 690–800 ms både før og efter denne runde; i netværkstimingen ankommer billedet ved 625 ms, resten er den enkelttrådede lokale dev-server, der kø'er CSS/JS. Baseline (392 ms) målte en tekst-LCP; fotoet er nu synligt og tæller. Ingen yderligere ændring, men heller ingen forværring (mine `filter`-forsøg er fjernet).

## Selv-scores mod billede 1 (0–5)

| Sektion | Før | Nu | Hvad der stadig afviger |
|---|---|---|---|
| Topbar | 4 | 4 | Ingen "Artikler & guides/Viden" (ingen sider); Favoritter skjult til noget er gemt; Kørekort-undermenu (billedet har ingen) |
| Hero + søgekort + tillidsrække | 4 | 4,5 | Hero-foto uden rytter (vi har ikke et licenseret rytterfoto); kortet 8-10 px højere end billedet |
| Udvalgte + sælg-panel | 3 | 4 | Intet hjerte på indekserede kort (D-008); sælg-panelet har cruiser-studiefoto, ikke rytter |
| Typefliser | 4 | 4 | 8 fliser (billedet 7) |
| Sådan virker | 4 | 4 | Grøn boks er guide (sikkerhed.html), ikke "fællesskab" |
| Tre kolonner | 3 | 4 | Monogram i stedet for mærkelogoer |
| Afslutning | 2 | 4 | Én kort "Hvorfor"-sektion + linkbånd ligger stadig mellem kolonnerne og footeren (billedet har intet) |
| **Samlet** | 3,5 | **4,1** | |

Målt: overflow 0 ved 360/390/768/1024/1440/1920, lys og mørk; konsol rent; kontrast på flade baggrunde 0 fund; CLS 0; tastatur (tab, Escape, fokusring) ok.
