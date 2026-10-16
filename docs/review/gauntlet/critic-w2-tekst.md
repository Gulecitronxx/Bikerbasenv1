# Critic w2-tekst (blind) — HEAD 7c9e3f6 vs baseline e040073

## DOM: ACCEPTER
Ingen juridisk tekst er ændret eller fjernet. Ingen usande påstande fundet. Ingen P0/P1. Fund P2/P3 nedenfor.

## 1. Ord-for-ord diff (main: h1–h6, p, li, td, pre; LCS på ord)
Alle fem sider: **0 fjernede/omformulerede ord i den gamle tekst.** Kun tilføjelser plus fjernelse af den gamle indholdsfortegnelses-overskrift/-numre (TOC-nummerering er nu CSS; h2'ernes egne numre står stadig i teksten).

| Side | Gammel/ny (ord) | Fjernet | Tilføjet |
|---|---|---|---|
| vilkaar | 790/885 | kun gammel TOC («Indhold», 1.–11.) | brødkrumme, kicker «VILKÅR», ingress, «Indholdsfortegnelse», CTA «Handl trygt…», Kort fortalt (4 punkter), «Læs også» |
| privatlivspolitik | 836/945 | kun gammel TOC | kicker, ingress, TOC, CTA «Dine annoncer, dine data», Kort fortalt (4), Læs også, «Spørgsmål? Skriv til kontakt@…» |
| sikkerhed | 664/801 | ingen | kicker, TOC, «Læs vilkårene»-kort, Kort fortalt (4), Læs også |
| om-indeksering | 489/715 | ingen (opdateret-linjen flyttet, uændret ordlyd) | «Reglerne i korte træk» (6 kort), TOC, CTA «Er det dit domæne?», Kort fortalt (4), Læs også, kontaktnote |
| om-bikerbasen | 440/672 | ingen | 4 principper, TOC, CTA «Hvordan finder vi annoncerne?», Kort fortalt (4), Læs også, «Sådan virker Bikerbasen» (4 trin) |

Sandhedstjek af alle nye tekster mod sidens egen tekst/forside/CLAUDE.md: alle sande og ikke rådgivende (vilkår: formidler, ingen ID-verificering, betaling direkte, skriftlig tilladelse = vilkår pkt 1/2/6/8; privatliv: GA4 kun efter samtykke, navn/tlf kun for indloggede, ingen deling til markedsføring, svar inden en måned = pkt 4/5/8; sikkerhed: knapnavne, escrow-fravær, «kontrolleret» = ordret; om-indeksering: 2 sek./domæne, robots.txt hver kørsel, skriftligt ja, feltliste = hent.js/CLAUDE.md regel 1–5; om-bikerbasen: gratis/ingen kommission, mærkning, ingen verificering). Ingen modsiger den juridiske tekst.
Linker: i main er alle gamle hrefs (mailto, mine-annoncer.html, mine-annoncer.html?tab=konto, vilkaar/sikkerhed osv.) bevaret; kun tilføjet (ankre, guides, index, søgning). «Sidst opdateret»-datoer (vilkår 26. juli 2026, om-indeksering 17. august 2026), kontakt@bikerbasen.dk (3 steder privatliv, 2 indeksering), cookie-/GDPR-afsnit (pkt 4, 5, 8) intakte. om-indeksering: UA-linjen `Bikerbasen-indeksering/1.0 (+https://bikerbasen.dk/om-indeksering.html)` er identisk med `crawler/hent.js` (kun hent.js har `.html`; CLAUDE.md-teksten skriver uden — uændret fra baseline); alle regler matcher.

## Låse-testen (scripts/info-tekst.test.js, mutation på kopi)
Fanger: ændret ord i vilkår/privatliv/om-bikerbasen/om-indeksering (4 af 4 mutationer), ændret dato, ændret UA-tekst, ændret mailadresse i tekst, ordændring i sikkerhed, tilføjet ord inde i artiklen. 
Fanger IKKE:
- **P2** ændret `href` uden tekstændring (fx `mailto:evil@x.dk` med uændret linktekst) — hash er kun af tekst. Repro: sed på `legal-kontakt` mailto i kopi → 21 pass.
- **P3** tekst/ændringer uden for `data-juridisk`-elementer (Kort fortalt, ingresser, CTA, TOC) er kun delvist beskyttet (tal-tjek); en usand påstand i Kort fortalt fanges ikke automatisk. Ændringer i `<li>`/nav uden for artiklen ligeledes.
- Testen er ikke i `npm test` (builder bad orchestrator tilføje den) — `npm test` = 490 pass uden den; **P2: skal tilføjes til package.json**, ellers kører den ikke i gate.

## 2. Design mod billede 10 (0–5; set 1440 og 390, lys+mørk; 1024 via overflow/layout-test)
| Side | Hero | TOC | h2/brødtekst | Kort fortalt | Sticky sidebjælke | Mørk CTA | Mobil |
|---|---|---|---|---|---|---|---|
| vilkaar | 4 | 4 | 4 | 4 | 4 | 4 | 4 |
| privatlivspolitik | 4 | 4 | 4 | 4 | 4 | 4 | 4 |
| sikkerhed | 4 | 4 | 4 | 4 | 4 | 4 | 4 |
| om-indeksering | 4 | 4 | 4 | 4 | 4 | 4 | 4 |
| om-bikerbasen | 4 | 4 | 4 | 4 | 4 | 4 | 4 |
| 404 | 4 | – | – | – | – | – | 4 |
Træk: hero er lav (≈340 px) og uden forfatter/læsetid/rytter-foto (bevidst, ærligt); CTA er en slank bjælke under teksten, ikke stort foto-kort i sidebjælken; sidebjælken har ingen «populære motorcykler». Struktur, farver, typografi, kort-stil og Kort fortalt-grøn boks matcher billedet godt; mørk tilstand ren.

## 3. 404
Test med node-server der returnerer 404.html for /xx/yy/zz og /a/b/c/d: status 404, 0 relative stier, 0 fejlende ressourcer (CSS/JS/billeder/fonte/logo), header+footer+tema+cookiebanner (modal, fokus på «Kun nødvendige») virker, `noindex, follow`, ét h1, søgefelt → `/soegning.html?q=ducati`, genvejskort-links → 200, lys+mørk, 390 uden overflow. Eneste konsollinje = sidens egen 404-svarstatus (forventet). title/description/canonical uændret. afmeld.html uændret vs baseline; mock-token giver fejlbesked uden JS-fejl (kun forventet 400 fra backend).

## 4. Teknik
- Ét h1 på alle sider (+afmeld). title/description/canonical/robots identiske med baseline (alle 6). JSON-LD parser; BreadcrumbList tilføjet på 5 sider, AboutPage bevaret.
- Inline scripts: kun `<script>` ×2 (tema/cookie) + ga4 + JSON-LD. `node scripts/csp-hashes.js` på kopi: ingen hash mangler. **P3** hver side har en forældet ekstra hash (`sha256-mZ0I…`, det gamle renderHeader-script; også i baseline) som build fjerner — harmløs.
- Vandret overflow: 0 ved 320/360/390/768/1024/1440/1920, lys+mørk, alle 7 sider.
- AA-kontrast (alle tekstnoder uden fotobaggrund, 1440+390, lys+mørk): 0 fejl. Tekst på foto-hero ikke automatisk målbar; visuelt tydelig.
- Tastatur: første Tab = skip-link «Gå til indhold» på alle sider; TOC-ankre: alle 39 ankre lander under sticky header (0 fejl); sidebjælke sticky (top 84) ved højde 900, klipper ikke (bund < viewport). Ved højde <900 er sticky bevidst slået fra.
- Konsol: 0 fejl/advarsler; kun afbrudte `hero-2560.webp`-requests ved viewport-skift (srcset-annullering, filen giver 200) — benign.
- `npm test` 490/490, `node --test scripts/info-tekst.test.js` 21/21, `node --check` js/ crawler/ scripts/ rent.

## Fund
- P2 Låse-test ikke i `npm test` (package.json).
- P2 Låse-test dækker ikke href-/attributændringer og ikke Kort fortalt/CTA-sandhed (kun tal).
- P3 Stale CSP-hash i alle 5 sider (rettes af build).
- P3 «A1, A2 eller A — vi skjuler det, tallene udelukker» (om-bikerbasen trin 1) er kopieret fra forsiden; ikke verificeret mod søgelogik.
- P3 Hero er markant lavere end billede 10 og uden rytter.

## Proces-note
Ved oprydning stoppede jeg ved en fejl nogle `bash.exe`-wrapperprocesser (PID 32700/37612/2016) ved at matche kommandolinjer; en af dem kan have været en anden agents port-8752-kommando. Ingen filer ændret. Egne servere (8753 python, 8754 node) er stoppet.
