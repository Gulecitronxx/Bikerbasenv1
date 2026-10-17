# Critic w11 samlet (ba83fba mod origin/main 226dbe7)

DOM: PUSH (ingen P0/P1).

Verificeret i temp-kopi (git archive, node_modules via junction):
- npm run gate: 8/8 grønne (inkl. npm test, seo-audit, sitemap, døde links, udgiv).
- smoke-browser --strikt: 120 målinger (12 sider) + 290 målinger (29 sider: index, soegning, annonce, maerke-*, type-*, koerekort-*, guides, region, by, budget, model, login, dashboard, opret-annonce, 404 m.fl.) x 320/390/768/1024/1440 x lys+mørk: 0 fejl, 0 advarsler (ingen CSP-script-blokeringer, ingen overflow, CLS under grænsen).
- Font-preload bevaret: _site/index.html har 2 x as="font" (?v=hash). Whitespace-strip rører ikke script/style/pre/textarea (opret-annonce textarea uændret); CSP-hashes intakte.
- SEO: sitemap kun lastmod forside 10-16 -> 10-17; ingen title/description/canonical-ændring i index.html.
- Annonce resize 1280/1024/768/759/390/320/768/1024/1440/390: ingen dublerede id'er, 1 h1, 1 kørekortkort, ingen overflow, ingen JS-fejl; actionbar kun <760.
- Fejloverlay (mock 503): role=alert, 56 px højt på 390, søgefeltet dækkes ikke på forsiden; kun én "Prøv igen"; sort-skift sætter state.page=1 (search.js).
- Kørekorttal på forsiden: A1 18 år/11 kW (15 hk), A2 20 år/35 kW (47 hk), A 24 år (22 efter 2 år på A2). Ingen løfter om beskeder/betaling/MitID/"helt nyt".

Fund
P0/P1: ingen.
P2-1  css/styles.css (.card-rich badge) + js/components.js: FORHANDLER-badge afkortes til "FORHANDLE…" og støder mod hjerte/sammenlign ved 320 px i 2-kolonne (synligt på kort uden foto, fx KTM RC 390 / Aprilia RS 660 i mock). Kendt; kosmetisk, ingen funktion brudt. Hjerte og sammenlign-knap ligger næsten kant mod kant på foto-løse kort.
P2-2  soegning.html ved 390 px under lagerfejl: banneret (top ~76 px) dækker hero-overskriften delvist (søgefelt frit). Skjules ved scroll ned; acceptabelt.
P3-1  Kort-fod: lange kildenavne ellipses stadig ("Roskilde Motorcyk…") ved 139 px kort, men sted står altid fuldt og fuld tekst er i title/aria-label; aldrig "Ro…".
P3-2  Forside 1440 mock: hero-foto/billedkort er mock-farver; kan ikke vurderes mod billede 1 pixelnært uden rigtige billeder. Struktur (hero, søgekort, trust-række, kort, typer, Sådan virker, mærker/kørekort/region) matcher.
P3-3  stamp-version skifter font-?v= til indholdshash: engangs-refetch af fonte for eksisterende besøgende. Uskadeligt.
Ikke kørt: fuld smoke på alle ~200 sider (kun repræsentative 29+12); live-hosting/Cloudflare ikke testet.
