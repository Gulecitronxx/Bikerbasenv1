# V6 Logoer: syv officielle logoer erstatter AI-udkast

Builder: V6-logoer. Branch `gauntlet/v6-logoer`. Dato: 2026-10-21. Fortsættelse af V5 (`docs/review/gauntlet/v5/logoer.md`, som beskriver logosystemet, farvet rendering og den lyse flise i mørk tilstand; alt er genbrugt uændret).

Ejeren bad i chatten om at downloade logoer fra nettet ("download loger fra nettet", 2026-10-20). Orkestratoren hentede og validerede syv SVG-logoer fra Wikimedia Commons (alle markeret Public domain; logoerne er varemærker og bruges kun til at identificere producenten). Denne builder har ikke downloadet noget: filerne er kopieret fra `C:\Users\pasca\Desktop\rod\wt\logo-download-v5\v6\valgt\` til `docs/review/gauntlet/v6/logoer/original/` (byte for byte, `.gitattributes: -text`) sammen med `kilder.json` og kontaktarket (`kontaktark.png`).

| Mærke | Fil (Commons) | Variant | viewBox |
|---|---|---|---|
| Yamaha | `Yamaha_Motor_Co_logo.svg` (stemmegaffel + ordmærke) | lockup | uændret `0 0 26.458333 6.0854165` |
| Suzuki | `Suzuki_logo_2025.svg` (vandret S + ordmærke) | lockup | uændret `0 0 144 28` (width/height tilføjet 144 x 28) |
| BMW | `Logo_BMW_Motorrad_2021.svg` (rundel + "BMW MOTORRAD") | lockup | uændret `0 0 811 173` (width/height 100 % -> 811 x 173) |
| Kawasaki | `Kawasaki-logo.svg` (River Mark + ordmærke) | lockup | uændret `0 0 168.332 29.99909` |
| KTM | `KTM-Logo.svg` (orange flade, sort skrift) | ordmaerke | **mangler i originalen** -> `0 0 779.528 305.652` (width/height) |
| Aprilia | `Aprilia-logo.svg` (rød flade, hvid skrift) | ordmaerke | uændret `0 0 400 200` |
| CFMoto | `CFMOTO_Logo.svg` (rundel + skrift) | lockup | uændret `0 0 142 28` |

## Hvad der er gjort

- **Import:** `scripts/v6-logo-import.js` (bruger V5's `renMetadata` og `normaliser`, samme kode). Skriver `img/brands/<slug>.svg`, opdaterer manifestet (kilde-URL, licens, `hentet` 2026-10-21, `godkendt_af` "ejer (bad om download i chatten 2026-10-20)", `autenticitet: officiel`, `ensfarvet:false`, `kilde_fil`, `kilde_hash`, `normalisering`), sletter de ti erstattede emblem-/ordmærke-filer og fjerner de syv poster fra `assets.json`. `--tjek` bruges af testen. Reproducér: `node scripts/v6-logo-import.js && node scripts/brand-logos-gen.js --opdater`.
- **Fælles filer (småt, nødvendigt):** `scripts/brand-logos-gen.js` accepterer nu `kilde_fil` under både `v5` og `v6` (`validerOfficiel`, ét regex); `ERSTATTET_AF_OFFICIEL` i `scripts/logo-vektoriser-alle.js` udvidet fra 10 til 17 (kun GasGas, Zero og Moto Guzzi er stadig i batchen); `.gitattributes` har en linje til v6-originalerne. Ingen kerne (`js/brand-logos.js`), CSS eller build-script er rørt.
- **Metadata:** Yamaha: RDF/Creative Commons-blok, `sodipodi:namedview`, `sodipodi:docname`, `inkscape:version`, Inkscape-kommentar. Suzuki: `data-name` og Illustrator-generatorkommentar. KTM: Inkscape-kommentar. BMW, Kawasaki, Aprilia, CFMoto: intet at fjerne. Ingen path, farve, defs, style eller geometri er rørt (testet med et fingeraftryk mod originalen). Titlen i Yamaha-filen er bevaret. Ingen mailadresser, stier eller personnavne fandtes i nogen af de syv (heller ikke i docs-kopierne).
- **Rest af udkastene:** `*-emblem.svg` og `*-ordmaerke.svg` for yamaha, suzuki, bmw, kawasaki, cfmoto er slettet, ligesom `varianter` i manifestet. Mærkesidens hero viser nu ét logo i stedet for emblem + ordmærke ved siden af hinanden (den officielle fil indeholder begge dele; ellers ville de to blive vist dobbelt).

## viewBox: målt, ikke gættet

For hver fil er union-boksen af alle tegne-elementer målt med `getBoundingClientRect` i Chromium og sammenholdt med viewBox (testen `browser: tegningen fylder sin viewBox`): luft pr. side er 0-1,4 % (Yamaha 0,2-1,2 %, Suzuki 1,4 % i bunden, resten 0-0,4 %), intet element ligger uden for viewBox. Yamahas viewBox (26,458 x 6,085) ser usædvanlig ud, men passer til tegningen (stemmegaflen og ordmærket fylder den) og til width/height 100 x 23: **ingen ændring**. KTM havde ingen viewBox, men tegningen (orange flade 779,5 x 305,7 under en `translate`) fylder width/height præcist: viewBox sat dertil. BMW og Suzuki fik numeriske width/height (BMW havde 100 %), så billedformatet er entydigt. Der er ikke beskåret noget, og ingen slogans fandtes (Aprilias registered-tegn er en del af udgiverens logo og er bevaret).

## BMW: "BMW Motorrad"-logoet bruges som BMW

Filen er Motorrad-varianten (rundel + to linjer "BMW MOTORRAD"). Mærket i registret er BMW (alias `bmw motorrad`), og alle annoncer på sitet er motorcykler, så Motorrad-logoet er det rigtige for BMW's motorcykelmærke. Konteksterne er kontrolleret på skærmbillederne: oversigtskortet "BMW" (logo over navnet), mærkesidens hero (logoet ved siden af H1 "Brugte BMW-motorcykler til salg"), CTA-kortet "Find din næste BMW". Ordet "Motorrad" forvirrer ikke noget af stederne; i A-Z-listen vises monogram "B" (se nedenfor). Vil man have rundelen alene, kræver det en beskåret variant og en navnetekst ved siden af; ikke gjort, da det ville være en redigeret fil. `alt` er "BMW-logo".

## Konsekvens i sm-slotten (A-Z og søgefilter): fire flere monogrammer

Kernens regel (min. 12 px højde, 56 x 22 px-slot) giver monogram, når et bredt logo ville blive lavere end 12 px. Med de nye filer gælder det Suzuki (10,9 px), Kawasaki (10,0), CFMoto (11,0) og BMW (11,95) i sm; Yamaha (12,7) og de øvrige får logo. Før havde fire af dem et AI-emblem i sm. I V5 var det otte brede ordmærker (Honda, Husqvarna, Royal Enfield, Benelli, Fantic, Keeway, Kymco, Rieju); nu er det tolv. Større slots (lg, xl, hero) er ikke berørt, og `md` bruges ikke på sitet. **Ønske til Orchestrator (fælles filer):** en bredere sm-slot (fx 80 x 22) i `SLOT`, `css/p-brand-logo.css`, `.bl-spalte--sm`, `.mk-az-logo` og de tests, der låser 56 px, løser alle tolv på én gang. Alternativt `MIN_HOEJDE` 10 for sm. Ikke ændret her.

## Tre mærker uden officiel SVG (beholder AI-udkast/fallback)

Ingen SVG findes på Commons for GasGas, Zero og Moto Guzzi. De beholder deres ensfarvede AI-udkast (godkendt af ejer 2026-10-17, autenticitet `ukendt`/`tvivlsom`, med monogram/ordmærke-fallback) og står stadig i `assets.json` og vektoriser-batchen. Foreslåede officielle kilder (ikke kontrolleret af denne builder, intet er hentet; ejeren skal beslutte og bede om download):

| Mærke | Foreslået kilde |
|---|---|
| GasGas | Pierer Mobility-koncernens presse-/mediecenter for GasGas (gasgas.com, "press"/"media"), logo-pakke i SVG |
| Zero | Zero Motorcycles' mediecenter/brand assets (zeromotorcycles.com, "press"/"media kit") |
| Moto Guzzi | Piaggio Group media (piaggiogroup.com, "media"/"brand assets") eller motoguzzi.com's presseområde |

Kræv ved hentning: direkte SVG, licens/brugsvilkår (varemærke), og at filen ikke indeholder metadata/persondata (guard-testen tjekker det).

## Tests (nye og ændrede)

- **Ny:** `scripts/v6-logo-officielle.test.js` (18 tests): manifest/proveniens, hash og `kilder.json` (rå sha256, bytes, URL, licens, dato), kun rod-attributter ændret (geometri-fingeraftryk), viewBox kun rettet hvor nødvendigt, **guard mod persondata/metadata** (mail, stier, telefon, kommentarer, RDF, editor-metadata, script, hændelser, ekstern href/url(), indlejret billede, ENTITY; kun BMW har en DOCTYPE og kun den standardiserede W3C) for alle SVG i `img/brands`, docs-kopierne og `kilder.json`, renser, `--tjek`-reproducerbarhed, udkast ryddet (filer, `assets.json`, batch), tre udkast tilbage, markup og monogram-regel i alle størrelser, og i Chromium: tegningen fylder viewBox, farvet rendering (Aprilia rød flade, KTM orange flade, Yamaha rød, Suzuki blå), lys flise i mørk tilstand med uændrede slotmål, slotmål uden klemning på 375/768/1440 og intet vandret overløb, afgrænsning (`js/annonce.js` og `css/p-annonce.css` er urørte).
- **Ændret (tal og lister):** `scripts/v5-logo-officielle.test.js` (de 21 fra V5 + 7 fra V6, 17 erstattede udkast), `scripts/w13-logo-assets.test.js` (3 udkast, 28 officielle filer), `scripts/w14-maerker.test.js` (lockup-testen bruger Zero; Yamaha har ét logo).
- Kørt: `w13-logo-assets`, `w13-logo-generator`, `w13-logo-kerne`, `w13-logo-layout`, `w14-maerker`, `v5-logo-officielle`, `v6-logo-officielle`, `brand-logos-gen --tjek`, `v5-/v6-logo-import --tjek`: alle grønne (se rapporten for antal). Smoke strikt (index, maerker, maerke-yamaha/suzuki/bmw/kawasaki/ktm/aprilia/cfmoto, soegning; 375/430/768/1440/1920; lys + mørk; `--cls 0.05`): 100 målinger, 0 fejl, 0 advarsler, to kørsler.
- Brede ordmærker i annoncetitlen (Honda 160 px, V5-restpunkt 5) hører til annonce-agentens spor; `js/annonce.js` og `css/p-annonce.css` er ikke rørt. De syv nye logoer ligger alle inden for xl-slottens 160 x 64 px.

## Screenshots

`docs/review/gauntlet/v6/logoer/foer/` (HEAD før V6) og `.../efter/`: oversigten (`maerker`), forsiden (`index`) og tre mærkesider (`maerke-yamaha`, `maerke-bmw`, `maerke-ktm`) ved 375, 768 og 1440 px, lys og mørk (de første 2400 px). 1920 og 430 px er dækket af smoke-testen (ingen overløb, CLS under 0,05), ikke af billeder.

## Byg

`node scripts/build.js` -> `node scripts/kritisk-gen.js` -> `node scripts/build.js` er kørt lokalt til smoke-testen. De genererede html-sider, `sitemap.xml`, `robots.txt`, `llms.txt`, `scripts/kritisk-manifest.json` og `scripts/sitemap-lastmod.json` er IKKE committet (Orchestrator bygger efter merge). Indtil da refererer de committede `maerke-*.html` (fra V5) stadig til de slettede emblem-/ordmærkefiler (yamaha, suzuki, bmw, kawasaki, cfmoto); et nyt byg retter det.

## 7 dimensioner (ærlig selvvurdering; Critic dømmer)

| Dimension | Mærkeoversigt | Mærkesider (hero/CTA) | Forside / søgefilter / A-Z |
|---|---|---|---|
| Visuel kvalitet | 8: Yamaha, Suzuki, BMW, Kawasaki, KTM får rigtige logoer i brandfarver; Aprilia kun i A-Z (lille) | 8: KTM-flisen og BMW-rundelen står klart; Yamaha/Suzuki brede og læsbare | 6: fire flere monogrammer i A-Z (Suzuki, Kawasaki, CFMoto, BMW); tidligere emblem |
| Designkonsistens | 8: samme slot, flise og afstand som V5; udkast (GasGas, Zero, Moto Guzzi) ensfarvede ved siden af | 8 | 7 |
| Funktionalitet | 9: fallback bevaret, tests | 9 | 9 |
| Brugeroplevelse | 8 | 8: BMW "Motorrad" er rigtigt for et MC-mærke | 7: monogram i stedet for logo i A-Z |
| Mobil | 8: 375/430 uden overflow | 8: KTM-logoet fylder pænt, flisen i mørk | 8 |
| Performance | 8: filer 1,6-8,6 KB, lazy i lister; 10 filer slettet | 8 | 8 |
| Indholdskvalitet | 9: kilde, licens, hentedato, ejer-godkendelse, hash og original pr. fil; ingen opdigtet | 9 | 9 |

Samlet: 8/10. Det svageste punkt er sm-slotten (se ovenfor), som kræver en beslutning om en fælles fil.
