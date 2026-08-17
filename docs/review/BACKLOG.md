# BACKLOG — findings

Fire akser: **SEO**, **design**, **funktionalitet**, **kodefejl**.
Tre roller: `designer` (D-), `critic` (C-). `dev` retter og skriver aldrig
findings her.

## Severity

| | Betyder |
|---|---|
| **P0** | Data lækker, penge eller adgang på spil, eller siden er brækket for brugeren |
| **P1** | Funktionalitet virker ikke som lovet, en påstand på siden er falsk, eller AA brydes |
| **P2** | Mærkbar risiko eller forbedring med konkret konsekvens |
| **P3** | Kosmetisk eller teoretisk |

## Status

`åben` → `valgt` (taget med i en runde) → `rettet` (dev melder færdig) →
`verificeret` (critic har efterprøvet) eller `genåbnet` (den var ikke løst).
`afvist` kræver en begrundelse i `DECISIONS.md` — ikke bare et ord her.

---

## Runde 1 — audit

Auditeret 17.08.2026 på commit `4a33b41`. 31 findings: 0 × P0, 12 × P1, 13 × P2, 6 × P3.

**Fuld dokumentation** — reproduktion, målinger og forslag — står i
[runde-1-critic.md](runde-1-critic.md) og [runde-1-designer.md](runde-1-designer.md).
Tabellen her er indekset; beviset bliver hos findingen, fordi 34 KB
reproduktionstrin i én tabelcelle ikke kan læses af nogen.

| ID | rolle | akse | sev | fil | problem | status |
|---|---|---|---|---|---|---|
| C-001 | critic | sikkerhed | **P1** | `.github/workflows/deploy.yml:41 (path: .)` | Hele repoet ligger offentligt på bikerbasen.dk | åben |
| C-010 | critic | funktionalitet | **P1** | `crawler/normalize.js:484-507, crawler/db.js:196` | fingerprint-reglen er skrevet ned, men ikke implementeret | åben |
| C-011 | critic | funktionalitet | **P1** | `crawler/pipeline.js:198-201` | Et selector-skift hos kilden kan tømme hele kataloget | åben |
| C-014 | critic | seo | **P1** | `scripts/shared.js:39-64 (fetchListings)` | Produktionssitet har 7 indekserbare adresser og NUL annonce- eller mærkesider | åben |
| C-015 | critic | seo | **P1** | `js/seo.js:191-205 (seoSearchResults)` | Søgesidens struktureret data peger på 404'ere | åben |
| D-001 | designer | design | **P1** | `css/styles.css:456-462 (mobil) og :428-439 (desktop)` | Hero-scrimmens lyseste punkt ligger præcis under teksten | åben |
| D-002 | designer | design | **P1** | `css/styles.css:815 + :795, js/components.js:439-442` | Prishierarkiet er vendt om på 87 % af lageret | åben |
| D-003 | designer | design | **P1** | `js/components.js:454-456` | Søgeresultatet sender 87 % af trafikken ud af sitet ét klik efter søgningen — og springer vores egen annonceside over | åben |
| D-004 | designer | design | **P1** | `js/annonce.js — videreKortHTML() / den eksterne gren; css/styles.css .listing-next` | På den eksterne annonceside konkurrerer væk-CTA'en med ingenting — den vinder ved walkover | åben |
| D-005 | designer | design | **P1** | `js/home.js:475 og :499 (gaten), index.html #newest-sub` | I drift påstår forsiden en dato, vi ikke har | åben |
| D-006 | designer | design | **P1** | `css/styles.css — html (ingen scroll-padding); .site-header:256, .listing-actionbar:1354` | WCAG 2.2 AA, SC 2.4.11 "Focus Not Obscured (Minimum)" fejler i BEGGE ender, og den ene ende er hele sitet | åben |
| D-007 | designer | design | **P1** | `css/styles.css:1963` | .safety-banner-sep{ opacity:.4 } — samme fejl som .facet-n, et andet sted | åben |
| C-002 | critic | sikkerhed | **P2** | `supabase/016_luk_skrivehul.sql:31-43` | Hullet er lukket, men fabrikken kører videre | åben |
| C-003 | critic | sikkerhed | **P2** | `supabase/016_luk_skrivehul.sql:155-160` | profiles har stadig INSERT og DELETE til anon | åben |
| C-004 | critic | sikkerhed | **P2** | `js/components.js:569 + reports-tabellen` | Anonym, ubegrænset skrivekanal til produktionsdatabasen | åben |
| C-005 | critic | sikkerhed | **P2** | `krav-tabellen, INSERT-politikken "krav: opret eget"` | Claim-flowet kan selvgodkendes på papiret | åben |
| C-007 | critic | kodefejl | **P2** | `js/bike-art.js:90, indlæst fra 12 HTML-sider` | 8,2 kB død JavaScript på hver side | åben |
| C-008 | critic | kodefejl | **P2** | `js/supabase-api.js:384 + js/backend-bridge.js:411-424` | En slugt fejl kan tømme brugerens gemte annoncer | åben |
| C-012 | critic | funktionalitet | **P2** | `crawler/pipeline.js:103-122` | Ingen afbrydelse ved gentagne 4xx | åben |
| C-013 | critic | funktionalitet | **P2** | `crawler/config.js:130-131` | De juridiske spærrer er attestationer, ikke kontroller | åben |
| C-016 | critic | seo | **P2** | `js/seo.js:118 og :145` | Struktureret data påstår et foto, siden selv nægter at påstå: jsonld-vehicle erklærer og-image.png som om det var motorcyklen | åben |
| D-008 | designer | design | **P2** | `js/components.js:428-457 (eksternt kort, ingen .fav-btn)` | Favoritfunktionen har i drift ingenting at virke på | åben |
| D-009 | designer | design | **P2** | `maerker.html (genereres af scripts/build-brand-pages.js)` | Mærkeindekset er 73 % blindgyder, og det taber to mærker, der HAR lager | åben |
| D-010 | designer | seo | **P2** | `maerker.html, sitemap.xml` | Følger af D-009, men det er et selvstændigt forhold: mærkeindekset udstiller 44 interne links til søgeresultater med nul indhold | åben |
| D-011 | designer | design | **P2** | `css/styles.css:749-916 (.card-external), js/components.js eksternSpecs()` | De to korttyper i samme liste har to forskellige rytmer | åben |
| C-006 | critic | sikkerhed | **P3** | `unsubscribe_saved_search` | Otte af ni funktioner i public blev hærdet til search_path="" af 016 | åben |
| C-009 | critic | kodefejl | **P3** | `js/opret-annonce.js, byte-offset 7334` | En rå NUL-byte gør filen binær for git og grep | åben |
| C-017 | critic | seo | **P3** | `js/seo.js:191` | Søgesidens <title> og meta description er identiske på hver facet | åben |
| C-018 | critic | seo | **P3** | `alle 14 HTML-sider, <html lang="da">` | Specifikationen siger lang="da-DK"; sitet har lang="da" på alle fjorten sider (efterprøvet) | åben |
| C-019 | critic | seo | **P3** | `js/search.js:1695-1727` | Der er ingen noindex på et søgeresultat med nul træf | åben |
| D-012 | designer | design | **P3** | `js/search.js — tomtilstandens hjælpetekst` | soegning.html?q=zzzzqqq (nul træf, ét aktivt filter = frisøgningen) skriver "Prøv at fjerne et filter eller udvide dit prisinterval" | åben |

---

## Lukket

<!-- Verificerede findings flyttes herned med rundenummer, så tabellen ovenfor
     kun viser det, der stadig er i spil. -->
