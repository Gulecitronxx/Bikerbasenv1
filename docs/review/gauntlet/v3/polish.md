# V3 Agent 1 – Visual polish og designkonsistens

Metode: screenshots før/efter (`scripts/visuel-regression.js`, 375/430/768/1440/1920, lys+mørk) i `polish/foer/` og `polish/efter/`.

## Forskelle mod Forside.png og nyt layout (fundet)
1. Båndet bag søgekortet (surface-2) sluttede i en hård kant lige over "Udforsk efter type" (mockuppen havde tillidsrækken som fortsættelse af båndet). **Rettet**: 22 px falmning mod sidebaggrund (`.hero-sok::after`).
2. Tillidsrækken flød uden afgrænsning mellem Udvalgte og Sådan virker (skrevet til gammel placering under søgekortet). **Rettet**: egen tonet sektion med hårlinjer (`.trust-sektion`), kompakt padding, 375–1920 lys/mørk.
3. "Udforsk efter type" klistrede til "97 annoncer i Danmark". **Rettet**: ekstra top-padding (18 px desktop, space-4 mobil).
4. Aktivt menupunkt var kun markeret med farve. **Rettet**: 2 px understregning i primærfarve.
5. Kort, fliser, mærke-/kørekortfliser og ikonknapper manglede :active-feedback. **Rettet** (diskret skala/skygge).
6. Header-CTA og typer-pil manglede hover-dybde. **Rettet**.
7. Fokusring på fliser/mærkefliser (offset og radius). **Rettet**.
8. Tomme pladsholdere (kort, fliser, mærker, lister) var blanke huller før data. **Rettet**: rolig skeleton-shimmer, slået fra ved reduced-motion; ingen layoutændring (CLS uændret).

Bevidst ikke ændret: indhold ("annoncer" vs "motorcykler" i fliser, tal), 1920-bredde (header og indhold deler `--site-w`, gutters ok), tillidsrækkens 4 punkter (mockuppens "svindel"-påstande er forbudt af reglerne).

## Filer
css/styles.css (V3-blok sidst), css/p-forside.css (V3-blok sidst), index.html (genbygget kritisk CSS). Øvrige genererede html ikke committet; Orchestrator bygger efter merge.

## Tests
- `node js/w14-forside.test.js`: 14/14 grønne (første forsøg fejlede på "tre kolonner ≤ 1250" med 1253 px; margin/padding trimmet).
- `scripts/forside-v2.test.js`, `scripts/forside.test.js`: grønne.
- smoke (index m.fl., 320–1440, lys+mørk, --strikt): index alene 0 fejl x2. Flere sider i samme kørsel giver `cls 0.077` på index 390 (både lys/mørk) – **eksisterer identisk på commit 57c0bd5d uden mine ændringer** (verificeret i separat worktree), rækkefølge-/belastningsafhængig; rapporteres til Orchestrator.
- Ingen nye testfiler.

## Skema (1-10)
| Dimension | Forside | Globalt (header/footer/komponenter) |
|---|---|---|
| Visuel kvalitet | 8 – bånd/overgange nu rolige | 8 |
| Designkonsistens | 8 | 8 – aktiv/hover/active ensartet |
| Funktionalitet | 8 | 8 |
| Brugeroplevelse | 8 | 8 – aktiv menu ikke kun farve |
| Mobil | 8 | 8 |
| Performance | 8 (ingen layout-ændring) | 8 |
| Indholdskvalitet | 7 – fliser siger "annoncer" | 8 |
Restpunkter: CLS-flake på index/390 i multi-side smoke; Forside.png-tillidsrække står under søgekort (bevidst flyttet af bruger).

## Tillæg: CLS-rod på index (390)
Målt med layout-shift-kilder + rAF-tidslinje (Playwright, 3 parallelle sider, varm cache). Årsag: sektionsbytningen lagde typefliserne over folden på mobil, og tre ting flyttede layoutet efter første maling: (1) "Udforsk efter type"-overskrift og link brød over i to rækker, da webfonten blev skiftet ind (+39 px); (2) `#types-sub` reserverede 5,8 em (tunet til Udvalgtes lange tekst) men fyldte to linjer; (3) `.sk-antal` i søgekortet voksede 17 -> 47 px (390) / 62 px (768) når lageret svarede. Rettet i css/p-forside.css (V3-CLS-blok): fast linjebrud for `.sek-hoved` <480 px, 3 linjer reserveret til noten <600 px, min-højde på `.sk-antal` <1100 px.
Resultat: index CLS < 0,02 ved 320/390/768/1024/1440, lys+mørk, alene og i rækkefølge (3 kørsler à 60 målinger + 3 kørsler `index,soegning,maerker,index` ved 390: 0 fejl). Test: `scripts/v3-forside-cls.test.js` (Orchestrator tilføjer til package.json). W14 14/14, forside.test, forside-v2 grønne.
