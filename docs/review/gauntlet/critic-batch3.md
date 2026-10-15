# Critic batch 3 (blind) - commit 0ecfb92 mod baseline 7d1f071

Metode: git worktrees af 0ecfb92 og 7d1f071 uden for repoet, serveret paa egne porte; Playwright (Chromium), skaerm 320/360/390/768/1440, lys+moerk; WCAG-kontrast beregnet fra computed styles. Screenshots laest. Intet i repoet aendret undtagen denne rapport.

## Domme

| Krav | Dom | Kort |
|---|---|---|
| 1 Maerke-intro | PASS (med bemaerkning) | 25/25 maerke-sider ok, ingen split i prisinterval, ingen "..", ingen tomme folds. Ingen regressionstest tilfoejet. |
| 2 Juridiske sider | PASS | 0 vandret overflow (5 sider x 5 bredder x 2 temaer); pre laesbar/scrollbar; ikke-legal sider uaendret. |
| 3 Formularkontrast | FAIL (delvist) | .input opfylder maal, men 2 felter uden .input (inkl. soegesidens hovedsoegefelt) har stadig 1,3:1 kant og moerkt placeholder 3,69:1; hover/fejl-kant knap til at skelne fra hvile. |
| 4 Regression | PASS | npm test 364/364, udgiv.js ok, ingen nye konsolfejl. |

## Krav 1 - maerke-intro

- Alle 25 maerke-*.html (kravets "ca. 26") udtrukket: synligt afsnit + "Mere om udvalget". Regel i script: `/(?<!\bkr|\bm\.fl)\.\s/`.
- Alle 25 synlige afsnit slutter paa hele saetninger ("... fra 4.000 kr. til 609.995 kr., med aargange mellem 1963 og 2026." / "..., aargang 2005." / "... Annoncen er indekseret fra X, og handlen sker hos kilden."). Ingen dobbelte punktummer, ingen tomme folds. Hyosung og Kymco har ingen fold (alt synligt, ingen tom `<details>`); Benelli/Cagiva/Ducati/Husqvarna/Indian/Victory har fold der starter "Udvalget daekker ...", korrekt.
- Syntetiske kanttilfaelde (regex): interval uden aargang -> synligt afsnit foelger til efter "m.fl." og slutter ved "...pris ved henvendelse." (lang men ikke delt). Enkelt pris uden aargang ("til 5.000 kr. Annoncen er...") -> search giver -1, hele intro synlig (accepteret).
- Honda: synligt afsnit +28 px hoejere (nu med hele prisintervallet) - forventet.
- NF3-1 (lav): ingen test i commit'en (scripts/maerkeside.test.js ikke aendret). En fremtidig regex-aendring fanges ikke. Anbefal test med "fra 4.000 kr. til 609.995 kr., ..." og "m.fl.".
- NF3-2 (lav, eksisterende): Kymco-intro "0 brugte og 1 fabriksny" og "Fb Mondial" (skrivemaade) - ikke fra denne commit.
- NF3-3 (info): UA-URL i om-indeksering.html/crawler/hent.js er `.../om-indeksering.html`, CLAUDE.md-tabellen siger `/om-indeksering`. Konsistent i kode, afviger kun fra dokumentet.

## Krav 2 - juridiske sider

- Overflow (scrollWidth - clientWidth), ny: om-indeksering, vilkaar, privatlivspolitik, sikkerhed, om-bikerbasen ved 320/360/390/768/1440 lys+moerk: **0 px overskud overalt**. Baseline: om-indeksering 641 px bred paa 320/360/390 (reproducerer fejlen), fixet.
- `<pre class="legal-pre">`: font monospace 13 px, bg --color-surface-2, 1 px kant, radius; scrollWidth 539 mod clientWidth 286/356 (320/390), ingen sideoverflow. Paa 1440 ligger linjen helt synligt (718 px). Screenshots (pre2-*) ser hensigtsmaessige ud, rolige og varme i begge temaer.
- NF3-4 (lav): paa mobil afskaeres UA-linjen ("Bikerbasen-indeksering/1.0 (+https://b...") uden synlig scroll-indikator (overlay-scrollbar) og uden tabindex/aria-label paa pre'en. Det er den vigtigste linje paa siden for en webmaster; overvej `white-space:pre-wrap; overflow-wrap:anywhere` eller en fade.
- Ikke-legal sider, DOM-hoejde ny mod baseline, lys/moerk x 360/1440 (index, soegning, annonce, login, opret-annonce, forhandler, dashboard, mine-annoncer, maerker, type-sport, koerekort-a2, region-sjaelland, maerke-honda): **identiske** (fx index 14606 = 14606 @360, soegning 12385, opret 3236). Eneste forskelle: om-indeksering (+887 px @360 fordi pre ikke laengere straekker siden, +18 px @1440 = pre-padding) og maerke-honda +28 px (krav 1). vilkaar, privatlivspolitik, sikkerhed, om-bikerbasen uaendret i hoejde og i .legal-content bredde/x (720 hhv. 820 @1440).

## Krav 3 - formularkontrast

Beregnede tal (WCAG), felt-bg = --color-surface:

| Maal | Lys | Moerk | Krav |
|---|---|---|---|
| kant (#8A8279 / #7A7268) mod flade | 3,78 | 3,59 | >=3 ok |
| kant mod sidebg | 3,48 | 3,89 | ok |
| kant mod surface-2 (hero-/sidekort) | 3,24 | 3,35 | ok |
| placeholder (fg-muted) mod felt | 5,74 | 6,43 | >=4,5 ok |
| placeholder mod surface-2 | 4,92 | 6,00 | ok |
| gammel kant mod flade (sammenligning) | 1,34 | 1,32 | - |

Alle `.input`/`select.input`/textarea paa index, soegning (filter), opret-annonce (alle 4 trin, ogsaa skjulte), login/registrer, dashboard, mine-annoncer og annonce-kontaktformular er maalt til 3,48-3,89 kant mod forelder og 5,74/6,43 placeholder.

Tilstande (kant mod hvilekant, luminanskontrast): hover 1,52 (lys) / 1,79 (moerk); fokus-kant 1,33 / 1,66 (men global `:focus-visible` giver 2,5 px kobber-outline + offset, saa fokus er tydeligt - set i login-screenshots); fejl (--color-danger) 1,24 / 1,70.

Fund:
- **NF3-5 (medium, FAIL): felter uden `.input` er faldet uden for fixet.** `#filter-q` (soegesidens hovedsoegefelt, input type=search) og `#brand-search` ("Soeg maerke..." i filter) har kant `--color-border` = 1,34:1 (lys) / 1,32:1 (moerk) mod flade og placeholder 4,61 (lys) / **3,69 (moerk, under 4,5)** - V-007 er ikke opfyldt dér. Sammen med de nye staerke `.input` (sorter-select, tal-felter lige ved siden af) giver det visuelt uens look paa soegning.html (screenshots soeg-light/dark-1440: stort soegefelt og "Soeg maerke..." svage, "Blandet"-select og tal-felter staerke). Opfoelger: saet `border-color: var(--color-input-border)` og placeholder-farve paa `#filter-q`/`#brand-search` (css/styles.css ca. linje 1592-1609, ogsaa :hover der saetter fg-muted). Dette er de eneste 2 input/select/textarea (ikke radio/checkbox/range/file/hidden) i *.html og js/*.js uden .input.
- **NF3-6 (lav-medium): hover og fejl adskilles nu kun af nuance, ikke lysstyrke.** Hvilekanten er mellemgraa, saa hover er kun 1,52:1 fra hvile og den roede fejlkant 1,24:1 fra hvile (lys). Fejl er stadig aflaeselig via nuance + `.field-error`-tekst/ikon, men en farveblind bruger ser en tynd kant der ligner hvile. Overvej 2 px fejlkant eller baggrundstone paa `.has-error .input`.
- NF3-7 (info): ikke-input-kontroller er stadig ca. 1,3:1: kk-seg/pille-chips, radio-card (motorcykeltype-fliser), sekundaerknapper ("Struktureer min beskrivelse", "Gem soegning"), native checkboxes. Uden for krav 3, men skaber en vis ujaevnhed (se step2-dark-360).
- Designvurdering (DESIGN_DNA: varm, rolig, kobber): kanterne er varm graa, ikke kolde/sorte; hero-soegekortet (index lys+moerk, 360/1440), opret-annonce (alle 4 trin), login og dashboard ser stadig rolige ud; kobber er forbeholdt fokus/CTA. Bryder ikke identiteten. Eneste designproblem er inkonsistensen NF3-5.

## Krav 4 - regression

- `npm test`: 364 tests, 364 pass, 0 fail.
- `node scripts/udgiv.js` (kørt i worktree 0ecfb92): "_site: 113 filer, 64 HTML-sider ... Alle referencer ... _site er klar." OK.
- Konsol (Chromium, 1280 px): index, soegning, opret-annonce, annonce, annonce-bmw-r45..., om-indeksering, maerke-honda, login - ingen JS-fejl. Kun miljoefejl, **identiske i baseline**: ERR_BLOCKED_BY_ORB paa eksternt guloggratis-billede (soegning) og CORS/401 mod supabase-funktionen `haendelse` fra localhost paa annoncesiden. Ingen nye.

## Samlet dom pr. krav

1. ACCEPTER (anbefal regressionstest for NF-1).
2. ACCEPTER (NF3-4 som laveste prioritet opfoelger).
3. AFVIS: ret `#filter-q` og `#brand-search` (NF3-5) foer verificeret; overvej NF3-6.
4. ACCEPTER.

## Reproduktion
- NF3-5: aabn soegning.html, konsol `getComputedStyle(document.querySelector('#filter-q')).borderTopColor` = rgb(227,222,214) (lys) / rgb(55,49,42) (moerk); moerk placeholder 3,69:1 mod --color-surface.
- Overflow-baseline: 7d1f071 om-indeksering.html @360 -> scrollWidth 641.
