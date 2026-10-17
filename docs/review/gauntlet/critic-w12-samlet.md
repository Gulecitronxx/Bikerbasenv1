# Critic w12 samlet (blind) - 70badc24 mod origin/main 46f107a9

Arbejdskopi: %TEMP%\critic-w12-20261017-140057 (git archive; node_modules via junction; SUPABASE_SERVICE_ROLE_KEY fjernet i alle mine processer; crawler/build/generatorer ikke kørt mod produktion).

## DOM: PUSH (ingen P0/P1)

## Målt
- (a) Kritisk CSS, 8 aktive familier (koerekort, type, region, budget, model, mc, guide, login) + 52 sider med blok: VR med (BB_KRITISK=ingen) vs aktiv, 12 sider x 320/390/768/1024/1440 x lys/mørk = 120 par: 119 par 0,00 %; ét par (koerekort-a2 320 lys) 1,07 % ved første kørsel, men 0,00 % ved to genkørsler = mock-timing, ikke kritisk CSS. 0 CSP-fejl. Langsom CSS (css/p-*.css + styles.css forsinket 4 s, 390/1440, lys/mørk, 9 sider): siden er stylet og brugbar ved 1,5 s (H1 korrekt størrelse/skrifttype, header 68 px, mørk baggrund rigtig, ingen horisontal scroll); skærmbillede af koerekort-a2 viser komplet hero + søgeboks før arket lander. Forside og søgning har ikke blokken (som angivet).
- (b) CSS-flytning (perf2): ren pixelækvivalens kan ikke isoleres (nye sider mangler inline-style og gamle ark), så jeg sammenlignede gamle live-sider mod ny: login/dashboard/mine-annoncer/forhandler/annonce-bmw har ens afvigelse (3,7-5,5 %), og diff-billedet af login 1440 viser, at KUN footerens guide-liste (nye guides) og sidehøjden afviger; hele indholdet er pixel-ens. Annonce/mærke-honda 7-23 % skyldes ændret datasæt (flere annoncer), ikke CSS.
- (c) Cookie-bundark (dialog showModal): begge knapper identiske (samme baggrund, farve, vægt 600, 44 px høj, samme bredde) ved 320/390/1440; fokus starter på "Kun nødvendige"; Tab holder fokus i dialogen; Escape lukker ikke (bevidst); "Kun nødvendige" fjerner banner og starter ingen statistik; 0 analytics-scripts uden samtykke. Højde 140-159 px, forsvinder efter valg (på 320x568 dækker den 28 % indtil valg).
- (d) by-sider bruger .fa-by-liste; ingen duplikerede id på maerker, by-*, index (soegning: kun id-tekst i en kommentar, falsk positiv).
- (e) npm run gate: 8/8 grønne. smoke-browser --strikt: 808 målinger (101 sider x 4 bredder x lys/mørk), 0 fejl, 0 advarsler. seo-audit: 0 fund (101 sider, 73 indekserbare).
- (g) Ærlighed: login siger udtrykkeligt at MitID/SMS ikke er sat op; kørekort-a2 viser 48/49 hk som "ukendt/kan være afrundet" (ikke afgjort). Ingen løfter om beskeder/betaling fundet.
- (h) Edge-funktioner: HMAC-SHA256 med TAELLER_SALT, ellers tilfældig 32-byte pepper pr. instans; ingen service-role-genbrug, ingen offentlig standardværdi. Korrekt; DEPLOY.md opdateret. Kræver at funktionerne deployes for at virke.

## Fund
- P2 sitemap/scope: sitemap indeholder udover de tre guides 7 nye URL'er (maerke-bsa, maerke-ducati, region-sjaelland, model-bmw-k-1200, model-honda-cbr-1100-xx, mc-bmw-touring, mc-honda-adventure) + lastmod-opdateringer, fordi build'et løftede noindex/nye sider ud fra et nyere datasæt. maerke-bsa/ducati/region-sjaelland havde noindex live og er nu indekserbare; maerke-bsa og model-honda-xl-750-transalp har ny title. Gate/seo-audit er grønne, men det er ikke "kun guides". Bekræft at de nye sider skal indekseres (tynd-indhold-tærskel) og at 43 meta-description-tal (fx koerekort-a2 88 -> 101) matcher live-data ved push.
- P2 js/components.js initCookieConsent + inline-cookie.js: modalen spærrer også privatlivspolitik.html (målt: :modal åben ved 320/390/1440), så linket "privatlivspolitik" i banneret fører til en side, man ikke kan læse før man har valgt. Overvej at undlade showModal på privatlivspolitik/vilkaar.
- P3 inline-cookie.js: Chromes dobbelt-Escape (close watcher) kan lukke dialogen uden valg uden user-activation; banneret kommer igen ved næste sideindlæsning. Ikke testet i andre browsere.
- P3 haendelse/indberet: uden TAELLER_SALT er pepperen pr. instans, så dagsgrænsen (10 indberetninger/dag) kan omgås på tværs af instanser; sæt TAELLER_SALT i Supabase.
- P3 kritisk CSS: koerekort-a2 320 lys gav engang 1,07 % (flaky mock), ikke reproducerbart.
- Ikke testet: dashboard med logget-ind-mock og opret-annonce computed-style 1:1 (kun visuel diff på login/dashboard/mine-annoncer/forhandler/annonce/opret via gamle live-sider); Safari/Firefox.
