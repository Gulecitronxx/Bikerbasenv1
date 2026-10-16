# Critic w2-bredde (blind) — ensrettet bredde + ét annoncekort

HEAD `81d1043` (gauntlet/master) mod baseline `211e6aa` (git archive udenfor repoet, port 8701; HEAD på 8700). Måleskripts: `C:\Users\pasca\Desktop\rod\crit-w2\s\` (udenfor repoet). Supabase: GET tilladt, alt andet mocket til `[]`. Ingen produktionskode ændret.

## DOM: ACCEPTER
Ingen P0, ingen regression, ingen regel-2-brud, SEO uændret, 0 vandret overflow. To forbehold bør rettes før/sammen med push: P2-1 (typebillede) og P1-forud (swipe-badge-klat, findes også live i dag, ikke indført af w2).

## 1. Flugt (x for venstrekant: logo / h1 / indhold / første kort / footer-indhold; baseline -> HEAD)
Mål ved 1024/1280/1440/1920 på 24 sider (alle familier + info + 404 + afmeld). Header, h1, indhold og footer står på samme kant på **alle** sider undtagen bevidst indrykkede elementer. Kanten er 32 ved 1024/1280/1440 og 252 ved 1920; højrekanten 1248/1408/1668.

| side | 1440 før | 1440 efter | 1920 før | 1920 efter |
|---|---|---|---|---|
| forside | 32/32/32/32/100 | 32/32/32/32/32 | 252/252/252/252/340 | 252 hele vejen |
| søgning | 32/132/72/376/100 | 32/32/32/336*/32 | 252/372/312/616/340 | 252/252/252/556*/252 |
| annonce (ekstern + statisk) | 32/600/32/32/100 | 32/600**/32/32/32 | 252/840/272/272/340 | 252/836**/252/252/252 |
| mærke | 32/132/24/24/100 | 32/32/32/32/32 | 252/372/256/256/340 | 252 hele vejen |
| mærker, kørekort, type, region, model | 132 (udover header) | 32 hele vejen | 292 | 252 hele vejen |
| guides, guide, opret, dashboard, mine, forhandler | 132 | 32 hele vejen | 372 | 252 hele vejen |
| login | 32/164/100 | 32/96**/32 | 252/404/340 | 252/316**/220*** |
| om, vilkår, sikkerhed, privatliv, om-indeksering | 132 | 32 (h1 og tekst) | 372 | 252 |
| 404 | ingen header/footer | 32 hele vejen | – | 252 hele vejen |
| afmeld | – | uændret (se P3-4) | | |

\* søgning: kortrækken starter efter sidebaren (336), bevidst. \*\* h1 i kolonne/kort, bevidst. \*\*\* login 1920: `.lg-strip-list` 220..1700 (32 px uden for 252..1668), se P3-1.
Sammenklistret-listen §3: (1) header 1176 vs 1376 **løst** (logo 32/252 på alle sider), (2) søgning filtre/resultater **løst** (32..1408), (3) annonce **løst**, (4) mærke 24..1416 **løst**, (5) kørekort/type 1920 **løst**, (6) tekstsider: kolonnerne er stadig smalle (649/830) men venstrekanten flugter; udseendet er w2-tekst's, (7) login **næsten** (kort 252..1668, strip 220..1700), (8) logget-ind-header ikke målt brudt ved 1024/1280/1440/1920 på dashboard (CTA 1125..1408 på én linje), (9) tre kortformer: **løst for gitterkortet, men listerække og swipe-kort er stadig egne former** (P2-2).

## 2. Ét kort
Gitterkortet er **identisk** på forside, søgning, mærke, type, kørekort, region, model, annonce-"lignende", opret-forhåndsvisning og forhandlerside: samme `.card-rich`, kant (1 px), radius 14, skygge, padding 12/12/11, titel 15/700, pris 15/700, linje 12,5, chips 11,5/600, fod 12, 4 ikoner (ekstern) / 5 (egen, + hjerte). Højde varierer kun med kolonnebredde: 329 (forside 212 px), 330 (søgning 256), 360 (type/kørekort/region/model 254), 334 (lignende 219), **425 (mærke, kort strakt til CTA-panelets højde, luft mellem chips og bund)**. Prisen står under titlen under 263 px og ved siden af over; to udseender af samme kort efter bredde (P3-3). Opret-forhåndsvisning 290 px: ens struktur, fotofelt uden type viser kamera-ikon i stedet for typebillede (kendt type -> typebillede).

Regel 2: alle 655 kort renderet i siden (602 eksterne): ingen telefon/mail/adresse i kortteksten (regex, 0 fund); feltsættet er titel, årgang, km, type, ccm, hk, pris, sted (by/region fra postnr), sælgertype, kilde-domæne, ét thumbnail, deeplink. `hk` og kildens "Ny"/salgsmærke-chip står ikke i regel 2's liste, men `hk` er i crawler-whitelisten og var på baseline-kortet (ikke ny).
Kørekortbadge: 22 kantcases testet (125/10, 125/null, 125/0, 50/null, null/null, null/45, 650/45, 650/70, 400/34-35-48, 100/15-16, tomme strenge, 300/300 selvmodsigende, 1000/null m.fl.): badge = `koerekortMaerkat` hver gang; manglende ccm/hk giver "hk ikke oplyst"/"ccm ikke oplyst"/"ccm og hk ikke oplyst"; 125 ccm uden hk = "ikke afgjort", ikke A1. På alle 655 annoncer: Mulig A1 17 + Mulig A2 57 = filter `koerekort=A2` 74 (= baseline), Kræver A 408, ikke afgjort 150, ukendt 23.
Hjerte (egne annoncer; aria-pressed + `bb_favorites` + tæller) og sammenlign (2 valgte -> bjælke "2 valgt til sammenligning") virker; tastatur: Tab -> kort-link -> sammenlign, 2 px fokusring på alle, lys og mørk.

### Uden foto: "Typebillede · intet foto"
Målt: kortet viser et gråtonet **fotografi** af en motorcykel af typen (fx en rød sportsmaskine på en KTM RC 390-annonce) med en lille pille i midten. Vurdering: ærligt i ord (mærkat + aria "ikke annoncens motorcykel"), men **kan misforstås som annoncens foto**, fordi billedet er fotografisk, lige så stort som et rigtigt foto, og mærkaten er det eneste signal. Det modsiger i ånden annoncesidens løfte (`js/annonce.js:1157`: "Vi viser ikke en tegning i stedet") og den begrundelse, som runde 2 i `js/components.js:285` selv dokumenterer for at fjerne tegningen (14 ens billeder, to sider siger forskelligt). Builderen har selv markeret det som beslutning (DELT-ØNSKER 4). Mislykket kildefoto bruger samme typebillede med teksten "Fotoet kunne ikke hentes hos kilden", hvor kameraikonet ligger bag pillen og teksten brydes på to linjer.
Forslag (vælg én): (a) tilbage til det stiplede tomme felt med kamera + "Ingen fotos i denne annonce" (det gælder allerede opret-preview og ukendt type, og passer til annoncesiden), eller (b) hold typebilledet, men gør det umuligt at tage for et foto: opacity <= .18, farvetonet i accentens varme grå, stiplet kant, kamera-ikon-ud-streget, mærkat nederst til venstre og i tilfældet "mislykket" skjul ikonet; og ret annoncesidens tekst til samme sprog ("Intet foto fra sælgeren. Billedet på kortet er et typebillede") så de to sider ikke siger hver sit. Anbefaling: (a).

Fjernede klasser/noscript: ingen side refererer CSS-klasser, der er fjernet. Diff af alle klasser defineret i baseline-CSS men ikke i HEAD-CSS (26) mod `.html` og `js/*.js`: kun `mk-wide` (26 mærkesider, `scripts/build-brand-pages.js`, rent kosmetisk død klasse) og `rk-egen` (markørklasse uden regler, bevidst). 0 `card-external`/`card-dealer`/`seller-line` i nogen `.html`. Genererede sider (soegning 12, mærke 29, type 21, kørekort 24, region 21, model 10 kort) bruger nyt markup. `<noscript>`-listerne (`brand-noscript`) er rene tekstlister uden kortmarkup og uændrede.

## 3. Regression
| tjek | resultat |
|---|---|
| søgefiltre/URL'er (`koerekort`, `type`, `q`, `maxPrice`, `kilde`, `sort`) | tal identiske med baseline: alle 655, A1 17, A2 74, sport 29, yamaha 55, mcsyd 345, maxPrice 30000 = 60; sortering pris lav/høj virker |
| gitter / liste / swipe | virker (liste = `.listing-row`, swipe = `.swipe-card`, uændret fra baseline) |
| annonce egen, ekstern, statisk | h1 + 6 "lignende" kort + kilde-links, 0 konsolfejl |
| opret live-forhåndsvisning | tegner `card-rich` med dealer-mock |
| dashboard, mine annoncer, login (mock) | indlæser, 0 konsolfejl (dashboard/mine bruger egne rækker, ikke kortet) |
| overflow `documentElement` | 35 sider × lys+mørk × 320/360/390/768/1024/1280/1440/1920 = **560 målinger, 0 afvigelser**; nyindlæsning 12 sider × 320/390 × lys/mørk = 48, 0 (kort der rækker uden for skærmen er de bevidste karruseller) |
| konsol | 0 fejl i alle kørsler |
| AA-kontrast (tekstnoder, kendt baggrund) | 12 sider × lys/mørk: 0 under 4,5:1 (forsidefliser = hvid tekst på foto, ikke målbar, udeladt) |
| tastatur/fokus | OK |
| CSS | rå CSS 446 201 -> 426 146 B (-20 KB), `styles.css` 4 394 -> 4 036 linjer (-358 netto; ~430 fjernet + nyt kort), `_site` minificeret 286 KB |
| LCP/CLS (median af 5, lokalt) | forside 708->704 ms / 0,002; søgning 712->728 / 0,014->0,015; mærke 744->748 / 0,001; type 712->716 / 0,001; mobil 390: alle indenfor ±16 ms, CLS 0,000. Ingen forskel |

## 4. SEO vs baseline (69 sider)
title, meta description, canonical, robots, h1 og JSON-LD **identiske på alle 69 sider**. `sitemap.xml` og `robots.txt` byte-ens (git diff). Interne links: eneste ændring er det nye menupunkt `koerekort-a.html` (+55 sider; siden findes og er i sitemap som `/koerekort-a`); ingen links fjernet.

## 5. Kommandoer
`npm test`: **526 pass / 0 fail**. `node --check` på alle `js|crawler|scripts/*.js`: rent. `node scripts/synk-header.js --tjek`: "alle sider har samme header og footer som index.html". `node scripts/udgiv.js`: "Alle referencer ... peger paa filer, der er med. _site er klar." Repoet uændret af mine kørsler (kun 11 untracked filer, heriblandt denne rapport).

## Fund
| # | P | Fund | Reproduktion |
|---|---|---|---|
| 1 | P1 forud (ikke w2-regression, findes live) | **Swipe-kortets kørekortbadge er en sort ellipse over hele fotoet** (396×292). `.card-koerekort` sætter `left:10px; bottom:10px`, `.swipe-card-kk` tilføjer `top/right:12px`, så elementet spændes ud. Samme på baseline. Rettelse: `.swipe-card-kk{left:auto;bottom:auto}` | `soegning.html` -> klik "swipe" ikonet (`#view-swipe`), se første kort (`so-swipe-8700.png`) |
| 2 | P2 | **Typebillede uden foto** kan læses som annoncens foto og modsiger annoncesidens "Vi viser ikke en tegning" (se afsnittet ovenfor). Forslag a/b | `type-sport.html`, kortet "KTM RC 390"; `annonce.html?id=<egen uden foto>` |
| 3 | P2 | **Stadig tre kortformer**: gitterkort, liste-række (`listing-row`) og swipe-kort. Kørekort står som "Mulig A2" på gitterkortet, men som rå "A2" på liste-rækken og "Kørekort A2" på swipe: samme annonce, to påstande om kørekort (honesty-regel i `docs/forretning.md` 3.1). Swipe viser ikke kilde/sælgertype | `soegning.html`, skift mellem Gitter/Liste/Swipe på samme annonce |
| 4 | P3 | `.lg-strip-list` på login er 220..1700 ved 1920 mod header/kort 252..1668 | `login.html` ved 1920 |
| 5 | P3 | Kortets titel/pris-layout skifter ved 263 px (pris under titel i 212/254/256 px-kort, ved siden af i opret-preview 290 px). Mærkesidens kort strækkes til 425 px med luft før bunden | forside vs opret; `maerke-yamaha.html` ved 1440 |
| 6 | P3 | Mislykket kildefoto: kameraikon bag pillen, tekst på to linjer | bloker billedforespørgsler til andre domæner end localhost på `soegning.html` |
| 7 | P3 | h1-størrelse stadig 26 (mærke, usynlig-agtig under wordmark) / 40 (annonce) / 44 (afmeld) / 50 / 56 (tekstsider, 404). Tekstkolonner 649 (om, sikkerhed, privatliv, om-indeksering) vs 830 (vilkår). `afmeld.html` har ingen footer/menu | `h1.js`-måling ved 1440 |
| 8 | P3 | Død klasse `mk-wide` på 26 mærkesider (genereres af `build-brand-pages.js`); `hk`/salgsmærke-chip ikke nævnt i CLAUDE.md regel 2 (allerede før w2) | grep |

## Prioriteret liste
1. Ret swipe-badge (`.swipe-card-kk{left:auto;bottom:auto}`), 1 linje.
2. Afgør typebillede: anbefaling (a) tilbage til tomt felt, ellers (b) og ens tekst på annonceside.
3. Ens kørekort-tekst ("Mulig A2") på liste-række og swipe; overvej at lade liste/swipe bruge `kortFakta`.
4. P3: login-strip, `mk-wide`, h1-/kolonnebredder på tekstsider (hører til w2-tekst), afmeld-footer.
