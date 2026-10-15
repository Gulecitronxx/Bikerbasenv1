# Critic (blind) — forside efter referencebillede 1

Branch `gauntlet/master`, HEAD `2027572`, baseline `72090b0`. Målt på localhost:8700 (ny) og en statisk kopi af baseline på :8701. Playwright, lys og mørk, 1440/1024/768/390 (+320/360/1920 til overflow). Referencebilleder: `-1.png` (forside) og `-9.png` (viser sig at være mærkesiden Yamaha, ikke en hero-variant af forsiden).

## Samlet dom: ACCEPTER

Ingen P0/P1. Funktionen er intakt, ingen juridiske brud, ingen opdigtede tal, ingen overflow, konsol rent, tests 384/384. De åbne punkter er stilistiske eller P2/P3-polish (se nedenfor). Visuelt er forsiden et stort skridt mod billedet, men nederste halvdel er stadig det gamle site.

## Sektionsscores (match med billede 1, 0-5)

| Sektion | Score | Dom |
|---|---|---|
| Topbar | 4 | Hvid bar, logo, menu, Log ind, orange "Opret annonce" matcher. Mangler "Artikler & guides"/"Viden" (ingen sider, korrekt udeladt), Favoritter skjult (bevidst), intet tema-skift i desktop-headeren (samme som baseline). Kørekort har A1/A2-undermenu (billedet har ingen). |
| Hero + overlappende søgekort + tillidsrække | 4 | Fuldbredde foto, h1 til venstre, kortet overlapper fotoets kant, fire felter + stor CTA + "655 annoncer i Danmark", fire ikon-punkter. Afvigelser: foto uden rytter, mørkere og fladere end billedets solnedgang. Kortet har en ekstra fodlinje (disclaimer) som billedet ikke har, så det er højere og tungere. |
| Udvalgte-række + "Sælg din motorcykel" | 3 | Rigt kort med titel+pris, år/km/type, kørekort-/ccm-/hk-chips, sted + kilde ligner billedet. Kun 4 kort ved 1440 (billedet har 5); intet hjerte på eksterne kort (bevidst, D-008); sælg-panelet har et uforklaret tomrum under titlen, ingen rytter, og teksten ligger over det udtonede foto. |
| Typefliser | 4 | 8 fotofliser i én række med antal og pil, ens højde (89 px), mørk scrim. Billedet har 7 med monogram-frie fotos. |
| Sådan virker | 4 | Nummereret strip med ikoner og pile + grøn boks. Rækkefølge og form tæt på. Boksen er "Køb og sælg trygt" i stedet for fællesskab (ærlig). |
| Tre kolonner (mærker / kørekort / region) | 3 | Struktur og rækkefølge rigtig, tal fra data. Men: mærker som 3×2 monogram-kort (billedet: 6 i én række med logoer), region som 3+2 (billedet: 5 i én række), A2-fliserne er højere end A1/A (tre linjers tekst), så "ens højder" brydes. |
| Afslutning (under kolonnerne) | 2 | Billedet slutter ved de tre kolonner. Vi fortsætter med problem/løsning/"Skal du købe eller sælge"/mørk slut-CTA/SEO-linkbånd: tre lange tekstsektioner i det gamle sites stil. Her er vi tættest på det gamle site. |
| **Samlet visuelt match** | **3,5** | Øverste halvdel (topbar → typefliser) er tæt på billedet; nederste halvdel er ikke. |

## Dom pr. krav

1. **Funktion: PASS.**
   - Søgekort: tom søgning → `soegning.html`; "Honda CB" → `?q=Honda+CB`; mærke+type+pris+A2 → `?q=honda&types=touring&priceMax=100000&koerekort=A2`; A2 alene → `?koerekort=A2`.
   - Antal-linjen matcher søgesiden: A2 74/74, A1 17/17, A 655/655, alle 655/655. Uoplyst-linjen (170 annoncer) vises og matcher søgesidens "170 annoncer er ikke vist".
   - 56 interne links på forsiden: 0 fejl (alle 200). Typefliser → `type-cruiser/adventure/naked/touring/sport.html`; classic/scooter/cross → `soegning.html?type=…` (der findes ingen faste sider).
   - Kortlinks → `annonce.html?id=…`. Sammenlign-knap: "1 valgt til sammenligning" + Sammenlign/Ryd-bjælke. Hjerte på egen annonce: aria-pressed false→true, Favoritter i headeren vises, skjules igen ved fravalg.
   - Header: hover åbner A1/A2 og lukker ved museforladelse; tastaturfokus åbner (Tab går ind i A1); parent-link → `koerekort-a2.html`. Mobilskuffe: åbner, 7 links (Motorcykler, Mærker, Kørekort A1, Kørekort A2, Om, Opret, Log ind), tema i skuffen, Escape og luk-knap lukker, `overlay-open` sættes. Tema-skift virker (footer-knap, skuffe; `bb_theme` gemmes). Login-link → `login.html`.
   - Se fund F-1 (Escape lukker ikke desktop-undermenuen).
2. **Ingen opdigtede tal / jura: PASS.** Alle tal beregnes (655 annoncer, 74/17, 589 med foto og modelnavn, 301 uden type, mærke- og regionstal matcher `type-sport` 29, `type-cruiser` 95, `maerke-honda` 282, `region-hovedstaden` 31, `koerekort-a2` 74). Kortet viser kun titel, pris, år, km, type, kørekortbadge, ccm, hk, sted, kilde-domæne, ét thumbnail (320×240). Ingen kontaktdata, intet galleri. (Pilene på Suzuki-kortets billede er brændt ind i kildens eget thumbnail, ikke vores UI.)
3. **Layout: PASS.** Vandret overflow 0 ved 320/360/390/768/1024/1440/1920, lys og mørk (14 kombinationer). Kort 274 px ens ved 1440; fliser 89 px ens. Billeder indlæses (naturalWidth > 0). Se F-2, F-3, F-4 for P3-punkter. Kontrast: computed-style-scan på flade baggrunde 0 fund i mørk; i lys kun falske positiver (translucent header og tekst over foto, som scriptet ikke kan måle). Tekst over foto (fliser, hero) vurderet på skærmbilleder: læsbar; builderens pixelmåling (min 4,81 lys / 5,17 mørk) er ikke modsagt.
4. **Header på alle sider: PASS.** `site-header`-blokken er byte-ens (op til CRLF/LF) på 62 af 64 html-filer. Undtagelser er bevidste: `404.html` (ingen header) og `afmeld.html` (kun logo; samme i baseline). Renderet header, 4 navlinks, login, CTA og burger målt på 18 sider ved 1440 og 390 (soegning, annonce, login, opret-annonce, dashboard, mine-annoncer, maerker, maerke-yamaha/honda, type-sport/cruiser, koerekort-a1/a2, region-hovedstaden/sjaelland, om-bikerbasen, sikkerhed, vilkaar, model-honda-nx-500, forhandler). Header 68 px overalt, 0 overflow, ingen JS-fejl. Dashboard/mine-annoncer viser 5. link (Mine annoncer). Skuffen åbner på soegning, maerke-yamaha og mine-annoncer.
5. **SEO: PASS (med bemærkning).** Title, h1, canonical, meta description og JSON-LD er ordret identiske med baseline. Sitemap uændret (ingen diff). Kildesæt: ingen mistede `maerke-*`, `koerekort-*`, `region-*`, `type-*`, `maerker.html`-links; renderet DOM mistede kun `soegning.html?type=…` (5) og `?regions=…` (4), som nu peger på de faste sider, og fik `maerke-husqvarna`, `maerke-indian` og `koerekort=A`. Bemærkning F-5: forsiden linker nu til 4 annoncer i stedet for ~9, og renderet linkantal faldt 69 → 54.
6. **Ydelse: PASS.** Lokal, ikke throttlet. CLS 0,0053 (1440) og 0,0004 (390) mod 0 og 0,0019 i baseline. LCP 1440: 1160 → 888 ms; 390: 392 → 848 ms (stadig langt under 2,5 s, men forværret, F-6). JS 384 → 349 KB, CSS 277 → 262 KB (rå), billeder 643 → 707 KB (1440), DOM 1758 → 1255 noder. Konsol: 0 fejl og 0 sideexceptions på forsiden i begge viewports.
7. **Regression: PASS.** `npm test`: 384/384 grønne (0 fail). `node scripts/udgiv.js`: "Alle referencer … peger på filer, der er med. _site er klar." `git status` viser ingen ændringer i produktionsfiler fra mig.

## Fund

| ID | Sev | Fund | Reproduktion |
|---|---|---|---|
| F-1 | P2 | Escape lukker ikke den åbne A1/A2-undermenu på desktop (WCAG 1.4.13 "dismissible"). Fokus i menuen holder den åben, indtil man tabber væk. | 1440, fokusér "Kørekort", tryk Tab (A1), tryk Escape: `.nav-sub` har stadig `display:flex`. |
| F-2 | P3 | Kolonnerne er ujævne: A2-fliserne er højere (3 linjer) end A1/A; mærkefliserne er 3×2 monogram-kort; Sjælland falder alene på anden række. | 1440, scroll til "Populære mærker". |
| F-3 | P3 | Uens indholdsbredde: topbar og hero-tekst ligger ved x=132, men "Udvalgte motorcykler", typer og tre kolonner starter ved x=32 (1376 px bred mod 1176 px). Venstrekanten springer ned ad siden. | 1440, sammenlign "Biker­basen"-logoet med "Udvalgte motorcykler". |
| F-4 | P3 | Ved 768 afkortes placeholderen ("F.eks. MT-07, Honc"), og kortenes chips/meta ombrydes til to linjer ("Classic/Veteran", "152 hk"). Sælg-panelets tekst ligger over det udtonede foto, og der er et tomt hul under titlen ved 1440. | 768 mørk; 1440 ved "Sælg din motorcykel". |
| F-5 | P3 | Færre indgående interne links til annoncer fra forsiden (4 mod ~9) og i alt 54 mod 69 linkmål. Typer/regioner er styrket (faste sider). | Link-diff, se krav 5. |
| F-6 | P3 | LCP på mobil fordoblet i lokal måling (392 → 848 ms). Hero-billedet er preloadet; sandsynligvis den større hero-/søgekort-blok. Bør måles throttlet. | `perf.js`-lignende måling, 390 px. |
| F-7 | Info | Sælg-panelets cruiser-billede ligner et genereret studiebillede; det er dekoration, ikke et annoncebillede, så ingen regelbrud. `region-sjaelland.html` er `noindex` og linkes bevidst ikke fra forsiden. | — |

## For at komme tættere på billedet (prioriteret)

1. **Skær slutningen ned (størst gevinst).** Samlet "Kubikcentimeter…", "Vi gør regnestykket…" og "Skal du købe eller sælge?" til én kompakt sektion (eller flyt til `om-bikerbasen`/kørekortside); behold kun den mørke slut-CTA og linkbåndet. Så ender forsiden som billedet: tre kolonner → footer. Det er det enkleste svar på "er vi for tæt på det gamle site".
2. **Fem kort + panel ved 1440.** Gør containeren ens bred (løser F-3 samtidig) og vis 5 kort à ~205 px med titel/pris på to linjer, eller gør sælg-panelet smallere, så rækken ligner billedet.
3. **Tre kolonner som i billedet:** mærker i én række af 6 (monogram → rigtige logoer, hvis vi må bruge dem; ellers pænere monogram-brikker), kørekort A1/A2/A med ens højde (forkort undertekst), region som 5 i én række.
4. **Hero:** varmere, lysere foto med motiv til højre (gerne rytter, hvis en ægte licenseret kilde findes), og fjern den lange disclaimer-fodlinje fra søgekortet (flyt til en tooltip/"?" eller til tillidsrækken) så kortet bliver lavt som i billedet.
5. **Sælg-panel:** fjern tomrummet, læg billedet til højre uden tekstoverlap, mere samme proportion som billedet (titel, tre ✓, CTA).
6. **Topbar:** overvej at tilføje "Artikler & guides" når en guides-side findes; ellers uændret.
7. **Polish:** Escape lukker undermenuen (F-1); placeholder og chip-ombrydning ved 768 (F-4); mål LCP throttlet (F-6).
