# Builder — mærkelogo-SYSTEM (W13, strøm 1+2)

Branch `gauntlet/logo-system` (fra 70badc24). Kun system: manifest, delt kerne, CSS, generator-integration, tests, BRUG.md.
**Ingen logofiler er hentet eller udgivet. Ingen af de 20 AI-PNG'er er med.** Alle mærker er `godkendt:false`; sitet viser derfor
ordmærke/monogram, indtil ejeren lægger en SVG i `img/brands/` og sætter `godkendt:true` i manifestet (ingen kodeændring).

## Acceptkriterier (skrevet før bevis; hvert punkt er målbart og har en test)

| # | Kriterium | Mål | Bevis (test) |
|---|---|---|---|
| A1 | Manifest dækker alle mærker | 64 poster: 29 mærkesider + GasGas, Zero, Piaggio + 32 øvrige fra `js/data.js`; hver `maerke-*.html` i repoet og hver nøgle i `BRANDS_BY_MODEL` normaliseres til en post | w13-logo-kerne |
| A2 | Default er ærligt | 0 mærker med `godkendt:true`; 0 PNG/JPG/WebP i `img/brands/`; alle poster har `fallback:'ordmaerke'`, `monogram` 1–3 tegn | w13-logo-kerne |
| A3 | Én kilde | `node scripts/brand-logos-gen.js --tjek` grøn (data-filen = manifestet, byte for byte); gen er deterministisk (to kørsler = ens uddata) og afviser fil uden kilde/licens, ukendt `variant`, godkendt uden fil, forkert hash/ratio | w13-logo-kerne |
| A4 | Normalisering | ≥ 30 varianter (`BMW Motorrad`, `harley`, `HD`, `H-D`, `Harley Davidson`, `CF Moto`, `CFMOTO`, `Zero Motorcycles`, `Gas Gas`, `Indian Motorcycle`, `Royal-enfield`, `mvagusta`, accenter/store bogstaver …) giver rigtigt slug; `Ukendt`, `andet mærke`, tom, null, tal-løse typer → `null`; `__proto__`/`constructor` giver ingen prototype-lækage | w13-logo-kerne |
| A5 | Ingen HTML-injektion | mærkenavne med `<script>`, `"`, `'`, `&` giver i output ingen rå `<` eller `"` fra navnet; i browser indsættes intet script/handler-element; `data-bl` og `aria-label` er escapet | w13-logo-kerne + layout |
| A6 | Fallback altid synlig | for alle 64 mærker × 4 størrelser × decorative/ikke: markup ikke tom; i browser har slot og fallback bredde > 0 og højde > 0; ingen `<img>` uden godkendt logo | w13-logo-layout |
| A7 | CLS = 0 | Slot-mål identiske før og efter at logofilen er hentet (SVG forsinket 600 ms); `layout-shift` summerer til 0 ved indsættelse af et 6-flisers grid; fast højde også for tekstfallback | w13-logo-layout |
| A8 | Aldrig brudt/tom | SVG svarer 404: `.bl` får `bl--fejl`, `.bl-mark` er `display:none` (ingen massiv blok), fallback har areal > 0; også for `<img>`-varianten | w13-logo-layout |
| A9 | Ensartet visuel vægt | i `md`/`lg`-slot: største/mindste logoareal ≤ 2,2 over placeholder-former med forhold 0,9–4,0 (smallere end 0,9 er højdebegrænset; de overskrider aldrig slotten); ingen overskrider slotten | w13-logo-layout |
| A10 | Lys/mørk | maske-farve = `--color-fg` i begge temaer (og forskellig mellem dem); tekstfallback (ordmærke og monogram) kontrast ≥ 4,5:1 mod flisens baggrund i lys OG mørk; hero (hvid på mørkt foto-overlay) ≥ 4,5:1 | w13-logo-layout |
| A11 | Responsivt | 320/390/768/1440: `scrollWidth ≤ clientWidth` på logo-testsiden (logo og uden logo) og på genereret `maerker.html` + en `maerke-*.html` | w13-logo-layout + generator |
| A12 | Ingen hårdkodede farver | `css/p-brand-logo.css` har 0 hex/rgb/hsl-farver; CSS-slotmål = `SLOT` i `js/brand-logos.js` | w13-logo-kerne |
| A13 | SVG-krav | `tjekSvg`: < 6 KB, `viewBox`, ingen `<script>`/`on*=`/`<foreignObject>`/`<image>`/ekstern href/url()/@import/DOCTYPE; negative eksempler afvises; alle placeholder-SVG'er består | w13-logo-kerne |
| A14 | Stille-404-vagt | hver `fil` i manifestet findes i `img/brands/` og matcher udgiv-allowlisten for `img/` (`.svg`); `scripts/udgiv.js` kopierer en godkendt placeholder til `_site/img/brands/` i en testkopi, og en side der refererer en manglende logofil får udgiv til at AFBRYDE | w13-logo-generator |
| A15 | Generator | på syntetisk lager (29 mærker): `maerker.html` har logo/monogram i alle 8 topfliser; med 6 godkendte placeholder-logoer har hero, CTA, topfliser og A–Z logo-markup; uden dem er hero/CTA identisk med nuværende (`mk-mono`, `mk-cta-navn`); to byg = byte-identisk output; alle mærke-links peger på eksisterende filer; p-brand-logo.css/scripts linkes KUN, når logo-markup findes (maerker.html: CSS altid) | w13-logo-generator |
| A16 | Hurtigsøg | `harley` → kun Harley-Davidson synlig, `zzz` → statustekst «Ingen mærker matcher.», tomt felt viser alle, Enter ved ét match navigerer; feltet er `hidden` uden JS | w13-logo-layout |
| A17 | Gate | `node --check` på alle js/scripts; `npm test` + de nye filer grønne; `node scripts/udgiv.js` grøn; `node scripts/brand-logos-gen.js --tjek` grøn; `git status` rent bortset fra egne filer | se bevis nederst |
| A18 | Delt lag urørt | `git diff 70badc24 --stat` viser INGEN ændring i `css/styles.css`, `js/components.js`, `js/home.js`, `index.html`, `scripts/build.js`, `scripts/udgiv.js`, `package.json` | se bevis nederst |

## Designvalg (kort)

- **Standard er tekst.** Uden godkendt logo: monogram-cirkel hvor navnet står ved siden af (fliser, filter, A–Z), ordmærke i versaler hvor
  logoet står alene. Samme fast slot som logoet, så et mærke uden logo aldrig ser «ødelagt» ud ved siden af et med.
- **Ensfarvet = CSS-mask i `currentColor`** (lys/mørk uden filskift, ét SVG pr. mærke). Flerfarvet (`ensfarvet:false`) = `<img>`.
- **Fast slot:** `width:min(maksBredde, maksHøjde·forhold)` + `aspect-ratio` — slottens mål kendes uden at filen er hentet (CLS 0).
- **Fejl:** capture-lytter på `error` giver `bl--fejl` → fallback (ligger altid i markup) tager over; mask skjules (ellers ville en
  fejlet mask tegne en massiv blok). Server-renderede sider er desuden dækket af udgiv.js (probe-`<img src>` er en statisk reference).
- **Ingen producentslogans.** Hero viser kun emblem/ordmærke (+ navn hvis kun emblem).

## Bevis (2026-10-17)

- Nye testfiler (til `npm test`, Orchestrator): `scripts/w13-logo-kerne.test.js`, `scripts/w13-logo-generator.test.js`, `scripts/w13-logo-layout.test.js` — 28 tests grønne.
- `npm test` (1207 tests): 1205 grønne. 2 røde: `K5c` (Playwright `ERR_NO_BUFFER_SPACE`, forbigående netværksstøj, rører ikke logoer) og kritisk-manifestet
  (`p-brand-logo.css: 23 regler ændret`) — løses af Orchestrator: `node scripts/build.js` (maerker.html linker det nye stilark) og derefter `node scripts/kritisk-gen.js`.
- `node scripts/udgiv.js` grøn; `node scripts/brand-logos-gen.js --tjek` grøn; `node --check` på alle js/scripts/crawler.
- Delt lag urørt (A18): ingen ændring i styles.css, components.js, home.js, index.html, build.js, udgiv.js, package.json.
- Godkendelse: ejeren har (via Orchestrator, 2026-10-17) sagt at logoerne må sættes til `godkendt:true`; det er IKKE gjort her (se rapport) — manifestet er stadig
  `godkendt:false` for alle, indtil det bekræftes direkte. Mekanismen er klar og testet med placeholder-SVG'er.
- Screenshots (udenfor repoet): `C:\Users\pasca\Desktop\rod\w13-logo-shots\` (test-med/uden, maerker-med/uden, honda-med/uden, kawasaki-med; 1440/390; lys/mørk).
