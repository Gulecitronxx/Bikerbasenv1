# Critic samlet (blind) — gauntlet/master b33e5548 mod live fefe1570

Arbejdskopier: `C:\Users\pasca\AppData\Local\Temp\critic-20261017-221402\{new,live}` (git archive; node_modules som junction). Intet kørt mod produktion, crawler/build ikke kørt, ingen commits.

## DOM: PUSH (med betingelse: P2-1 bør rettes eller bevidst accepteres)
Ingen P0/P1 fundet. Alle ti sidefamilier er tydeligt tættere på mockuppen og ingen er dårligere end live. Én reproducerbar CLS-regression (P2) og et par visuelle klip (P2/P3).

## Fund
**P0/P1: ingen.**

**P2-1 CLS-regression (reproducerbar, ikke flaky): `mc-honda-adventure.html` @768 (lys og mørk), CLS 0,116 (> 0,05 og > Googles 0,1).**
- Live fefe1570: 0,000 (2 kørsler). Ny: 0,116 i 2 af 2 kørsler, og i smoke 1 af 1 bred kørsel.
- Udløses når siden er målt efter en tidligere kontekst i samme browser (varm cache); alene som første side er den 0,000. Derfor "flaky" hos Builder. Varm cache er normalt for gensynsbesøgende, så det er IKKE blot test-artefakt.
- Kilde (layout-shift sources, t=172 ms): `DIV.fa-udvalgte-gitter`, `H2.fa-h2` og `A.fa-mere` (overskrift + "Se alle"-link i "Udvalgte ..."-sektionen). `.fa-mere` hopper fra under overskriften (x32,y852) til højre på samme linje (x577,y820), og gitteret vokser 119→152 px. Sektionen ligger i folden på 768×1024. Altså: reglerne for `.fa-h2/.fa-mere` er ikke i det kritiske CSS på 768-breakpointet, så de lander efter første paint. `scripts/w12-kritisk.test.js` tester kun 390/1440, så det fanges ikke. Se `css/` + `scripts/kritisk-*.js` (fa-udvalgte-*). Samme risiko på andre facetsider ved andre viewporthøjder.
- model-honda-cb-1000-hornet, model-honda-xl-750-transalp: 0 fejl i 2 af 2 kørsler (320+768, lys+mørk) og i den brede kørsel. `by-roedding` findes ikke i repoet (kun by-horsens/-skive/-thorsoe, alle grønne). Hele den brede kørsel (100 sider × 320/390/768/1024/1440 × lys+mørk = 1000 målinger, parallel 3): kun denne ene side fejler (2 målinger). 0 konsolfejl, 0 CSP-script-blokeringer, 0 overflow, 0 døde links.

**P2-2 Opret annonce: hero-tekst og højre infokort klippes af trin-bjælken @1440.** Underteksten "...kan gemme en kladde." og linjen "Samme søgning som deres annoncer." i infokortet er delvist skjult bag stepper-kortet (`04-opret-1440-light.png`, `-dark.png`). Hero er for lav til indholdet (mockuppen har luft). Ses også på 390 som tæt, men ikke klippet.

**P3-1** Tekstkort på forsiden afkortes med "…" midt i en forklarende sætning ("Fem af de 42 annoncer med foto og modelnavn — ... fra samm…", "5 af 97 annoncer har ingen type oplyst ... dem finder du i den fulde…") — ellipsis fjerner netop det ærlighedsforbehold teksten skal give. `01-index-1440-light.png`.
**P3-2** CTA-paneler på type-/kørekortsider (`Er en sport-motorcykel noget for dig?`, A2-versionen): motorcykelfoto ligger henover sidste punkt/knap, tekst delvist svær at læse (`06-type-1440-light.png`, `07-koerekort-1440-light.png`).
**P3-3** Forside 503/tom lager @390: CLS 0,039 (live 0,000) fra `ASIDE.saelg-panel`. Under grænsen, men ny. Desktop 0.
**P3-4** Annonce: galleriet viser kun ét billede (korrekt iflg. CLAUDE.md, ét thumbnail); mockuppens thumbnailrække/"+10" kan ikke og må ikke efterlignes. Min lightbox-sonde fandt ingen lightbox på eksterne annoncer med ét foto (forventet). Intern annonces galleri/lightbox + telefon-reveal er ikke dybdetestet af mig (tidsgrænse) — Builder-tests dækker.
**P3-5** Smoke-værktøjet: `--temaer mørk` er korrekt (normaliserer til 'dark'); men et script der kalder `initScript` med 'mørk' direkte får lys tema — kun relevant ved egne scripts.

## Verifikation
- `verificer-site.js --hurtig --med-udgiv`: 8/8 trin grønne (npm test springes over i --hurtig; fuld `npm test` ikke kørt af mig p.g.a. tidsgrænsen — kør selv før push).
- `seo-audit`: 101 sider, 73 indekserbare, 0 fund. SEO-diff over alle rod-*.html (title, description, canonical, robots, H1, antal JSON-LD) mod fefe1570: **0 forskelle**, ingen nye/manglende sider. robots.txt identisk. Sitemap: kun `opret-annonce` lastmod 16.→17.10. (bevidst/ufarlig).
- `udgiv.js`: grøn ("_site er klar", CSS 620→427 KB). `w12-kritisk.test.js`: 18/18 grønne.
- Ærlighed/juridik (stikprøver i skærmbilleder + tekst): ingen opdigtede tal/stjerner/anmeldelser/svartid/"autoriseret"/beskeder/MitID/social login; login har "Fortsæt uden konto" i stedet for Google/Facebook/Apple; tal er beregnet af lageret ("97 annoncer", "12 sport-motorcykler"); "Mulig A2/A1" ≠ bekræftet, "Kørekort ikke afgjort — tjek kW"; A2 "Fra 20 år", A fra 24 år/22 efter 2 år A2. Typefoto-fallback på søgekort er mærket "Typefoto, ikke annoncens" i en mørk bånd-etiket nederst på billedet: tydelig og ærlig (og bedre end live's tomme "Ingen fotos"-bokse), men på mobil bliver etiketten brudt over to linjer; acceptabel. Eksterne annoncer: kilde-domæne + "Gå til annoncen hos X"-deeplink, "hos MC Syd"-prisafsnit, forhandlerforbehold, "Meld fejl". Cookiebundark vises på index, ikke på privatlivspolitik/vilkår.

## Funktion (mock, 1440 + enkelte 390)
OK: forside-søgekort → `soegning.html?q=Honda&type=sport&maxPrice=60000&koerekort=A2`; søgning: 24 kort, sortering (`?sort=price-asc`), typefilter (24→12, `?types=sport`), paginering (1–5, `?page=2`), browser-tilbage; annonce (intern + 2 eksterne): 1 H1, kilde-deeplink korrekt, resize 1440→768→390→1440 uden dubletter (identiske DOM-tal); mærker: 29 mærkesider, 25+ logoer synlige, hurtigsøg ("yam") filtrerer; guide: 14 TOC-links, klik scroller så H2 ligger 124 px fra top (header 54 px, sticky) — scroll-padding virker; cookie-regler; 503: banner "Vi kunne ikke hente annoncerne", ingen NaN/null, CLS ≈ 0 desktop; opret: login-port for ikke-indlogget, 4 trin (Detaljer/Billeder/Beskrivelse&pris/Gennemse), upload af 2 billeder viser 2 forhåndsvisninger, fil > 10 MB afvises, "Gem kladde" skriver kladde i localStorage; dashboard/mine annoncer: statkort, fanebjælke, 3 annoncer, "Min profil" + "Log ud" i header. Ikke fundet fejl i ERRS (ingen pageerror/console.error).
Ikke dækket af tid: udgiv-lås, telefon-reveal logget ind, favorit/sammenlign-klik, lightbox på intern annonce, swipe-visning, fuld `npm test`.

## Ligner mockuppen x/10 og bedre/dårligere end live
Skærmbilleder side om side: nye `shots2\new`, live `shots2\live` (1440×900 + fuld side, 390×844, lys+mørk; mørk verificeret mørk: body rgb(22,20,15)).

| Sidefamilie | Mockup | Live | Ny | Vs. live | Hovedforskel til mockup |
|---|---|---|---|---|---|
| Forside | Forside.png | 4/10 | 7/10 | BEDRE | Lav hero med overlappende søgekort, tillidsrække, kort+CTA-panel over folden, typeflise-række, "Sådan virker", 3 kolonner: strukturen matcher. Mangler rytter-motiv (bike beskåret), kortene mangler foto af annoncen (typefoto), ingen 5-kolonne nye-kort med spec-chips hk/kg |
| Søgning | Motorcykler til salg.png | 6/10 | 7/10 | BEDRE | Lav hero + overlap-søgekort, filter-chips, sidebar, Gitter/Liste, kort med badges; mangler pris-slider/billedtæller (ikke tilladt) |
| Annonce | Annonce.png | 6/10 | 6,5/10 | MARGINALT BEDRE | Mere kompakt, kørekortkort over folden; ét foto (lovligt), ingen sælger-anmeldelser/telefon (korrekt) |
| Opret | Opret annonce.png | 5,5/10 | 6/10 | BEDRE, men P2-2 | Fuld-sides sektioner + live-forhåndsvisning + tips-bokse; hero-klip |
| Mærke (Yamaha) | Mærker.png | 5/10 | 7/10 | BEDRE | Logo-hero, overlap-søgekort, tillidsrække, kortrække + CTA; "Kort fortalt" flyttet ned |
| Type (Sport) | Sport motorcykler.png | 5/10 | 7/10 | BEDRE | Stat-panel i hero, søgekort, rækkens kort+CTA; P3-2 |
| Kørekort A2 | Motorcykler til A 2.png | 5/10 | 7/10 | BEDRE | Fakta-række + søgekort + udvalgte; ærlige A2-regler |
| Guide | Artikel.png | 5,5/10 | 6,5/10 | BEDRE | Hero m. forfatter/opdateret/læsetid, 2-kolonne TOC, "Kort fortalt", mørkt CTA-panel; ingen opdigtet forfatter (korrekt) |
| Login | Login eller oper profil.png | 5/10 | 6,5/10 | BEDRE | To-kolonne kort på foto; uden social login/tal (korrekt) |
| Mine annoncer | Mine annoncer.png | 5/10 | 6/10 | BEDRE | Hero + faner + 5 statkort + liste + Min konto; uden visninger/beskeder (korrekt); annoncekort uden foto i mock |

Ingen side er blevet dårligere. Mørk tilstand er ægte mørk på alle ti. Mobil (390) ser fornuftig ud på alle ti.

## Skærmbilleder
- `...\critic-20261017-221402\shots2\new\NN-<side>-{1440,390}-{light,dark}[-full].png` (NN 01 index, 02 soegning, 03 annonce, 04 opret, 05 maerke, 06 type, 07 koerekort, 08 guide, 09 login, 10 mine); samme under `shots2\live\`
- `...\critic-20261017-221402\sheet-new-390-light.png`, `sheet-new-390-dark.png`, `sheet-new-1440-dark.png`
- Rapporter/logs: `...\critic-20261017-221402\out\{smoke1.json,smoke1.txt,verificer.txt}`; værktøj: `tools\{shots,func2,func3,cls,f503}.js`
