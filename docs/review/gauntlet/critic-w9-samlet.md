# Critic W9 samlet (blind) - commit 7e926e8 mod origin/main 7c47a19

Dom: PUSH IKKE (1 x P1: kørekortkortet på annonce.html er brudt på desktop). Alt andet er grønt.
Metode: kopi i temp (git archive), node_modules via junction, ingen build/generatorer, mock fra smoke-browser + smoke-fixtures + w9-saelger-mock, egen server.

## Grønt
- npm test: 1005/1005 bestået (også crawler-tests). verificer-site --hurtig: 7/7 (trin 2 sprunget, som aftalt).
- smoke-browser --hurtig: 0 fejl. Bredt: 92 sider x 320/390/768/1440 x lys+mørk = 736 målinger, 0 fejl (kun 6 tap-mål-advarsler: footerlinks "vilkår"/"privatlivspolitik" 34x19 på login/dashboard/mine-annoncer ved 1440).
- seo-audit: 92 sider, 63 indekserbare, 0 fund. Sitemap-diff: kun +guide-mc-typer, +guide-mc-ordliste. Ingen blokerede scripts (csp-script = 0 på alle 736 målinger; scripts/csp-hashes.js: 0 skrevet = hashes up to date).
- Hydrering/tal: facet-cls-, w9-discovery- og seo-soeglink-tests grønne; søgning ?koerekort=A2 = "30 motorcykler fundet" = koerekort-a2.html "30 indekseret". Forside A2-kort -> søgning -> annonce -> tilbage bevarer filter og scrollposition. Favorit gem OK.
- Kørekortindhold: A2 = 20 år overalt (BEK 550/2026 §36). Eneste "A2 fra 18 år" (guide-a2-koerekort.html:159, guides-data.js:236) er korrekt formuleret som særregel (forsvar/mekanikere, kun tjeneste/afprøvning, § 36 stk. 2-3) og fandtes allerede på main. 48-hk-faldgruben og 35 kW = 47,6 hk er konsistente.
- Ærlighed: ingen løfter om beskeder/betaling/MitID/"helt nyt" (login.html:280 og om-bikerbasen siger det modsatte, BETALING_BYGGET=false styrer dashboard/opret). Favorit-rollback (store.js) rydder lokalt valg + toast ved databasefejl.

## Fund
P1  css/p-annonce.css:234-262 + js/annonce.js:83-115 (anBalancerKolonner): "Kan du køre denne motorcykel?"-kortet (.an-kk) er ét vandret kort (ikon + tekst + badge), men balanceringen på >=1180 px placerer det vilkårligt i sidekolonnen (300-330 px) eller kolonne B (354-478 px). Målt .an-kk-tekst-bredde ved 1180/1280/1440/1920 px: 22-76 px i side/B (op til 266 kun når kortet havner i kolonne A). Resultat: teksten brydes ét ord pr. linje ("Kan / du / køre / denne ..."), badge klemt. Ses på annonce.html?id=<fixture 1,3,5,12,30> ved 1280/1440/1920 (screenshot: annonce-1440-light). Ikke et problem på main (balanceringen er ny) og fanges ikke af smoke (ingen overflow/cls). Fix: stakér ikon/tekst/badge lodret når kolonnen er smal (container query eller .an-side .an-kk / .an-col-b .an-kk { grid-template-columns:1fr }, jf. regel ved linje 261), eller lås kortet til kolonne A/bred position i balancerne; tilføj test på tekstbredde >= ~200 px.
P2  Fejltilstand (databasen svarer 503): CLS over 0,05 trods ærlig fejltekst. Den globale fejlbanner ("Vi kunne ikke hente annoncerne fra databasen" + Prøv igen) indsættes OVER hero og skubber siden 106 px: facet-/annonce-/kørekortsider 0,068 (1440) og 0,161 (390); forside 1440: 0,223 (featured-section 257->151 px + banner); søgning type=sport 0,107. Bedre end main (forside 0,723, model/by 1,0 på 390), men målet <0,05 er ikke nået. Smoke dækker kun succesvejen. Reservér bannerpladsen eller læg den under hero.
P3  Fejl-/tomtilstand på forsiden viser stadig det indbagte "51 annoncer i Danmark" under fejlbanneren (mens fixture-succes viser 97) - ingen "0", men tallet er ikke friskt; overvej at skjule tallet ved hentefejl.
P3  Tap-mål: footerlinks "vilkår" (34x19) og "privatlivspolitik" (90x19) på login/dashboard/mine-annoncer ved 1440 (advarsel, WCAG 2.5.8).
P3  Model-/byside i fejltilstand (model-honda-cb-1000-r, by-horsens): teksten "0 annoncer" står i bodyteksten (statisk side, ikke et hentet tal) - tjek at det er den ærlige "ingen kunne hentes"-formulering og ikke et påstået antal.

## Visuelt (10 nøglesider, 390/1440, lys+mørk)
Forside, søgning, kørekort-a2, type-sport, mærke-yamaha, guides, opret-annonce, mine-annoncer set: sammenhængende hero/kort/søgekort på tværs af familier, header med altid-synlig Favoritter, ingen overflow, ingen regression bortset fra P1 ovenfor (annonce, 1440 lys og mørk).
Ikke gennemset pixel for pixel: region, login ved alle 4 kombinationer (kun fejlfri i smoke).

## Anbefaling
Ret P1 (lille CSS/JS-ændring + test), byg, kør smoke igen, derefter PUSH. P2 kan følge efter push, hvis P1 er rettet.
