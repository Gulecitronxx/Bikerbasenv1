# Critic w7 samlet (blind) - commit 4378bba mod origin/main 03dd9a1

Dom: **PUSH**. Ingen P0/P1 fundet.

Kørt i temp-kopi (git archive 4378bba, node_modules som junction):
- `npm test`: 921/921 grønne.
- `verificer-site.js --hurtig`: 7/7 trin grønne (npm test sprunget over, kørt separat).
- `smoke-browser.js` (90 sider x 390/1440 x lys): 3 fejl, 3 advarsler (se P2).
- Egen Playwright-brudtest (port 8881): dashboard, mine-annoncer, opret-annonce, login, forhandler, annonce.html med ødelagt/manglende/ukendt ?id=, `login.html?next=//evil.com` og `dashboard.html?tab=<img>`. Backend 500, tomt svar (200 uden body), 401 og netværks-abort, ved 390 og 1440. Resultat: 0 sidefejl, 0 konsolfejl, 0 vandret overflow, ingen "undefined/NaN/null/[object" i synlig tekst. Dækker kun udlogget tilstand; indlogget dækkes af js/w7-funktion.test.js (grøn).
- CSP: alle 344 inline-scripts på 90 sider matcher et hash i `script-src` (hash beregnet på LF-normaliseret tekst, som HTML-parseren gør). 0 blokerede. Alle JSON-LD parser. Alle indekserbare sider har canonical.

## P0
Ingen.

## P1
Ingen.

## P2
1. Intermitterende CLS på mobil: `by-thorsoe.html`, `model-honda-crf-1100-l-africa.html`, `model-suzuki-vlr-1800.html` ved 390 px, CLS 0.43-0.46 mod grænse 0.05. Ved gentagelse (2 x 5 sider) kom 0/1 fejl, så flaktisk race, sandsynligvis hydrering af kort-/modelgitter. Giver ikke brud, men w7-visuel's CLS-fix holder ikke 100 %. Ikke push-blokerende.
2. Guiderne er faktatjekket mod tidligere kritikers kildeliste (docs/review/gauntlet/critic-guides-2.md bekræfter § 81 stk. 1/3 og § 105 stk. 1). Jeg kunne ikke selv hente lovteksten (retsinformation.dk er JS-renderet), så LBK-nummeret "nr. 118 af 12. januar 2026" og paragraf-numrene står uverificeret af mig. Formuleringerne er forsigtige (ingen priser, ingen selskaber, "spørg Færdselsstyrelsen" om hjelmgodkendelse, forbehold om regler der kan ændre sig).

## P3
1. `llms.txt` lister kun 3 af 5 guides; `guide-mc-forsikring` og `guide-mc-udstyr` mangler (llms.txt er uændret i diffen).
2. `supabase/functions/haendelse/index.ts:~62`: salt-default er `'bikerbasen'` hvis `TAELLER_SALT` ikke er sat. Så er IP-hashen (sha256 af IP|dato|salt, afkortet til 32 tegn) reelt brute-force-bar på IPv4. Privatlivspolitikken siger "hemmeligt salt"; sørg for at secret er sat i produktion, ellers er påstanden ikke sand.
3. `dashboard/login/mine-annoncer.html` ved 1440: footerlinks "vilkår" (34x19) og "privatlivspolitik" (90x19) under 24 px tap-mål (kun advarsel).
4. Privatlivspolitikken siger funktionen "ikke gemmer og logger selve IP-adressen". Funktionen gør det ikke (kun fejlbesked logges), men Supabase-gatewayen logger selv requests. Overvej "gemmer ikke" frem for "logger ikke".
5. `afmeld.html`: description 47 tegn (noindex-side, uden betydning).

## Verificeret OK
- Privatlivspolitik mod kode: IP-hash (sha256 af IP + dato + salt, én pr. IP/annonce/slags/dag), tabel `skrive_taeller` uden klient-adgang (RLS uden politikker + revoke), rydning af rækker ældre end i går ca. hver 100. kald (`random() < 0.01`), service_role-only i migration 022. Billedhosts images.danbase.dk og assets.guloggratis.dk, GA4 kun efter samtykke, `search_term` op til 80 tegn, Resend/notify-saved-searches (funktionen findes), "ingen beskeder", Stripe "planlagt, ikke i brug" stemmer med BETALING_BYGGET=false.
- Betaling: `BETALING_BYGGET = false` (js/store.js:25); dashboard, mine-annoncer og opret-annonce skjuler opgradér/abonnement. Ingen falske løfter om MitID (login.html: "ikke sat op endnu"), beskeder ("Vi videresender ikke beskeder") eller "helt nyt" fundet.
- Sitemap: kun tilføjelser (2 nye guides, lastmod), ingen URL fjernet; robots.txt uændret. Begge nye guides har article:published_time = datePublished = dateModified = 2026-10-16, er i guides.html og har "Læs også".
