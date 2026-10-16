# Critic bølge 5+6 samlet (blind) — commit 849505e mod origin/main e5eaa90

DOM: PUSH. Ingen P0/P1 fundet.

## Målt (kopi i temp, ingen build/generator, ingen produktionslæsning)
- npm test: 813/813 grønne (kræver node_modules; uden dem fejler 6 crawler-tests, det er miljø, ikke kode).
- verificer-site --hurtig: 7/7 trin grønne (node --check, synk-header, seo-audit, sitemap, døde links, testliste).
- Playwright 390/1440, lys/mørk, 19 repræsentative sider: 0 vandret overflow, 0 null/undefined/NaN, præcis 1 h1 og unik title overalt, ingen CSP-blokeringer, ingen JS-fejl. Alle 88 html-sider ved 390: 0 overflow/JS-fejl/NaN.
- sitemap.xml: identisk URL-sæt (59 -> 59, 0 fjernet, 0 tilføjet). robots.txt uændret. noindex-sæt identisk med origin/main.
- llms.txt er ny (findes ikke på main): ingen tal på annoncer/priser, alle 10 linkede interne sider findes.
- Cookie-banner og GA4 (inline-cookie/-analytics): scripts uændret; GA4 kun ved samtykke "all". Banner vist, valg "Kun nødvendige" er fokuseret standard.
- a2Status: 48-49 hk uden kW = 'graense'/"Kørekort ikke afgjort — tjek kW" i både js/data.js og statiske koerekort-a2-kort (3 kort, kk-ukendt); koerekort-a.html har 0 48-49 hk-kort (kun kk-a). Konsistent.
- privatlivspolitik: Supabase EU-region (Irland) som verificeret; GA4 kun med samtykke; ingen uverificerede påstande set.
- vilkaar: "betaling direkte mellem køber/sælger, intet escrow" — ingen falske løfter. Ingen "helt nyt"/beskedløfter fundet.

## Fund
- P0: ingen. P1: ingen.
- P2: annonce-sider kalder produktions-Edge-Function `haendelse` ved visning (uændret adfærd fra main; blev udløst af min test fra localhost -> CORS/401 i konsollen, forventet lokalt, ikke en regression). Ingen handling.
- P3: HTML-kommentar i vilkaar.html:192-201 afslører intern retfærdiggørelse ("her stod et sikker betaling-flow ...") i kildekoden. Harmløst, men kan fjernes før push.
- P3: Min egen regex-CSP-tjek gav falske positiver (match på `<script` i strenge); csp-hashes.test.js er grøn og ingen CSP-fejl i browserkonsollen, så hashes er OK.

## Ikke dækket
Logget-ind-flows (dashboard/opret annonce) kun overflow/konsol-tjekket uden login; ingen reel Supabase-data testet (bevidst).
