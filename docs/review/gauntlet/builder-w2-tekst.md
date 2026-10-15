# Builder w2-tekst — info-/tekstsider i guide-stilen (billede 10)

Branch `gauntlet/w2-tekst` (fra e040073), port 8752. Sider: om-bikerbasen, vilkaar, privatlivspolitik, sikkerhed, om-indeksering, 404. afmeld.html er uændret (login-strømmens version er allerede restylet, har med vilje kun logoet).

## Før / efter
- Før: smal 720/820-kolonne, h1 32 px, ingen hero, 404 uden header/tema/footer (relative stier, ustylet på dybe URL'er).
- Efter: foto-hero (samme foto og overlay som guides), brødkrumme, kicker, h1 `clamp(32px,5.4vw,56px)` som guide-h1, ingress, opdateringsdato. To kolonner >=1024 px: indholdsfortegnelse (ankre) + nummererede h2'er til venstre, sticky sidebjælke til højre (`Kort fortalt` + `Læs også`, sticky ved højde >=900 px), mørk foto-CTA-bjælke efter teksten. Mobil: Kort fortalt først, så tekst. Samme header/footer og `.container` (1240) som guides, så flugten er 132-1308 ved 1440.
- om-bikerbasen: ikon-række med 4 principper (kilden står på kortet, kørekort som filter, vi gætter aldrig, kontaktinfo bag login) og `Sådan virker Bikerbasen` (genbrugt `.saadan-trin*`, teksterne fra forsiden). Kun påstande fra sidens egen tekst; ingen tal, historier eller navne.
- om-indeksering: User-Agent i mørk kodeboks, `Reglerne i korte træk` som 6 kort (tempo, robots.txt, skriftligt ja, hvad vi gemmer/ikke gemmer, stop med ét flag), alt udledt af sidens egen tekst.
- 404: rodrelative stier overalt (`/css/…`, `/js/…`, `/img/…`, links, fonte i inline-css), CSP-meta, header + footer + cookiebanner + tema, hero med søgefelt (`/soegning.html?q=`) og 6 genvejskort. `noindex, follow`, title, description, canonical uændret. Headeren har `id="sidehoved"`, så `synk-header.js` springer den over (ellers overskrives de rodrelative stier); testen sammenligner den med index.html.
- Juridisk tekst ordret uændret: siderne er bygget programmatisk ud fra de gamle filer (`git show e040073`); kun struktur, klasser og ids (til ankre) er tilføjet, og to inline-stile er blevet til klasser. Nyt ingress på vilkaar/privatlivspolitik (ingen ingress fandtes) står uden for den hashede tekst.
- Inline scripts: de sidespecifikke `renderHeader(...)`-scripts er flyttet til `js/info.js` (side angives med `data-aktiv`). Kun tema-, GA4- og cookie-scripts er tilbage, og alle tre er dækket af de eksisterende CSP-hashes. JSON-LD: BreadcrumbList tilføjet på alle fem; øvrig SEO uændret.

## Test
- Ny: `scripts/info-tekst.test.js` (21 test) — **Orchestrator skal tilføje den til `npm test`**. Låser sha256 af sidernes tekst uden markup mod de gamle sider (e040073), ét h1, ingen sidespecifikke inline-scripts, TOC-ankre findes, Kort fortalt har ingen tal der ikke står på siden, 404 uden relative stier, 404-header = index-header.
- `npm test`: 490 pass / 0 fail uden den nye fil; `node --check` js/ scripts/ crawler/ rent.
- Renderet (Playwright, lys+mørk): scrollWidth==clientWidth ved 320/360/390/768/1024/1280/1440/1920 på alle 6 sider + afmeld, ét h1, 0 konsolfejl; AA-kontrast på alle tekstnoder uden fotobaggrund (lys+mørk, 1440+390): 0 fejl (tekst på foto kan ikke måles automatisk; samme overlay som guides). Tastatur: fokusring 2 px på alle Tab-trin, skip-link virker, mobilskuffen åbner og lukker med Escape.
- 3 iterationer mod billede 10: (1) overlap på sidebjælken for stort -> hero min-højde 340 + overlap 92 px; (2) mørk CTA-kort i sidebjælken gjorde den for høj til sticky -> flyttet til bjælke under teksten; (3) principper 4 kolonner for smalle -> 2x2, regelkort kompakte på mobil.

## Afviger stadig fra billede 10
- Ingen forfatter/«Af …»-blok (ingen opdigtede forfattere); i stedet kun opdateringsdato hvor siden selv har en. Ingen læsetid.
- Ingen kort med populære motorcykler i sidebjælken (ville kræve data-kald på tekstsider).
- Hero-fotoet er det fælles motorcykelfoto, ikke billedets rytter.
- Kort fortalt er på alle seks sider (billedet har den kun på guiden); punkterne er citater/udledninger af sidens egen tekst.

## DELT-ØNSKER
1. `scripts/synk-header.js`: skip 404.html eksplicit (i stedet for id-tricket `sidehoved`) og lad den evt. generere den rodrelative header selv.
2. Footerens «Om Bikerbasen»-kolonne mangler «Artikler & guides» (kolonnen «Køb & salg» kunne have det).
3. Generaliser `.if-hero/.if-toc/.if-tldr/.if-links` og `.gd-*` til én delt «tekstside»-skabelon i styles.css, når w2-bredde er landet (nu to ens kopier).
4. `package.json`: tilføj `scripts/info-tekst.test.js`.

## Filer / commits
Nye: `css/p-info.css`, `js/info.js`, `scripts/info-tekst.test.js`. Ændrede: om-bikerbasen, vilkaar, privatlivspolitik, sikkerhed, om-indeksering, 404 (.html). Ingen ?v=-stempler, CSP-hashes eller build-filer ændret. Rester: ingen kendte.
