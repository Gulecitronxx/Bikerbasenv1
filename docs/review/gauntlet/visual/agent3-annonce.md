# Agent 3 — Annoncedetaljer og opret-flow (Visual Fidelity Gauntlet)

Branch `gauntlet/w14-annonce` (fra fefe1570). Mål: `Annonce.png` (Yamaha MT-07) og `Opret annonce.png`. Billeder i `agent3-annonce/` (JPEG, samlet ca. 4,9 MB).
Testfotos i målingerne er udsnit af mockuppens eget motorcykelfoto (kun lokalt, aldrig i repoet), fordi mockens fotos ellers er flade farver. De indeholder
mockuppens indbagte "1/14"-mærke og pile i hjørnerne; det er et testartefakt, ikke en fejl i siden.

## Acceptkriterier (skrevet før koden; runde 2 efter Critic AFVIS 6/10 + 5/10 tilføjer A8–A12)
- A1 Galleriets hovedbillede fylder hele sin boks: billedhøjde = boxhøjde ±1 px ved 1440.
- A2 (omskrevet i runde 2) INGEN strækning: intet kort har > 40 px tomt rum under sit sidste indholdselement ved 1440 (egen med 5 og 0 fotos). Kolonnerne må ende ujævnt; hvide felter i sidens bund er ikke et kort med tomt rum.
- A3 Kørekortkortet står i midterkolonnen, lavt (≤ 240 px), med stor badge til højre for teksten ved ≥ 1180 px; grundlag/legende sammenfoldet; kun oplyste tal og offentlige grænser (A2: 35 kW ≈ 47 hk), "Mulig" aldrig "bekræftet".
- A4 Faktatabellen: to lige kolonner, "Ikke oplyst" sidst, ulige antal giver en sidste række i fuld bredde (ingen enlig halv række).
- A5 Opret: billedsektionen har dropzone og miniaturer (≥ 100 px) i samme række, tips som bånd, ingen overflow.
- A6 Ingen dubletter/tab af elementer ved resize 1440→1024→768→390→1440; 0 vandret overflow 320/390/768/1024/1440 lys+mørk.
- A7 CLS < 0,05 (`smoke-browser --cls 0.05 --strikt`) på alle `annonce*.html` og `opret-annonce` ved 320–1440; SEO uændret; ingen opdigtet data.
- A8 "Det bør du tjekke" i sidekolonnen under "Handl trygt" (standard), brede kort, foto som bånd over teksten, aldrig under den.
- A9 Galleri: fuldskærmsknap og lightbox (Esc/pile, fokus tilbage) hvor der er egne fotos; "+N"-tile ved > 6 fotos.
- A10 Opret: sektionsrækkefølge som billedet (1 Detaljer, 2 Billeder, 3 Beskrivelse og pris) på ÉN side, 4 trin i bjælken (Detaljer, Billeder, Beskrivelse & pris, Gennemse), fire kolonner i første feltrække.
- A11 Login-gate bevares uden tab: udlogget ser en login-port i stedet for dropzonen (billeder overlever ikke en login-omvej), kladden gemmes og man lander ved billederne efter login.
- A12 Tap-mål ≥ 40 px og kontrast ≥ 4,5:1 (målt med canvas-afledt farve, også på color-mix-flader) på annoncesiden, 320–1440 lys+mørk.
Bevis: `js/w14-annonce.test.js` (9 browsertests), `js/w9-saelger.test.js` (33), smoke, egne målescripts (kontrast/tap).

## Afvigelsesliste (prioriteret, fra egne observationer og Critics)
1. Moduler: tyndt kørekortmodul → LUKKET (bred flade, stor badge, sammenfoldet grundlag + legende). Galleri uden fuldskærm → LUKKET (knap + lightbox).
2. Layout: kort strakt til 490 px med 200 px tomt rum (align-stretch) → LUKKET (strækning fjernet, fast komposition: kørekort i midten, "Handl trygt" + "Det bør du tjekke" i sidekolonnen; for høj sidekolonne (lange kildetekster) flyttes tjek til venstre hvis det sparer ≥ 80 px højdeforskel).
3. Hierarki/billedbrug: galleribillede dækkede 87 % af boksen (fejl) → LUKKET.
4. Panelopbygning: faktatabel med enlig række og én kolonne ved 510 px → LUKKET. "Det bør du tjekke" klemt, tekst over fotoflade → LUKKET (foto som bånd). Sælgerpanel for tungt udlogget → delvist (to noter beholdt af tests, tredje "Mød altid sælger…" fjernet udlogget).
5. Opret: billeder som eget trin efter pris, to trin-sider → LUKKET (billeder = sektion 2 på samme side, review = trin 4); første række 4 felter; tips som bånd; hero lavere; skillelinje før sektion 3.
6. CLS 0,298 på `annonce-harley-davidson-flhx-2007-541ad405.html` ved 1024 mørk → LUKKET. Årsag: brødkrummen brækkede over to linjer i den forrenderede side og én linje efter hydrering (fejltilstand i smoke, hvor id'et ikke findes i fixtures); nu `nowrap` + ellipsis ≥ 900 px, og højden låses, når en fejltilstand erstatter siden.
7. Typografi/detaljer: tap-mål (32 px-links, miniaturer 43×32) og lav kontrast → LUKKET/målt rent.
8. Mikrointeraktion: lightbox tilføjet; favorit/sammenlign/kilde-link/telefon-reveal testet (telefon: nummer via RPC; uden samtykke ærlig afvisning).

## Tilbageværende — ligner ikke endnu (ærligt)
- Sælgerpanel udlogget er stadig højere end billedets (ingen avatar/stjerner/svartid/"Ring op"/"Send besked"/"autoriseret": må ikke opdigtes eller er ikke bygget). Derfor ender sidekolonnen ofte 150–300 px under de andre, og bunden af venstre/midterkolonne står hvid.
- Beskrivelse uden grønne check-punkter for eksterne annoncer (ingen data); egne får dem kun når felterne er udfyldt.
- Ingen finansieringsforslag, "+10 billeder", forhandlerlogo, kort-link (ingen data); eksterne har ét thumbnail uden fuldskærm.
- Opret: ingen titelfelt (titlen udledes af mærke/model/årgang), ingen B/I-værktøjslinje, ingen model-dropdown, intet rytterfoto i hero (findes ikke i repoet), 4 trin mod billedets 5 ("Sælgeroplysninger" findes ikke som valg), ingen "Vis eksempel på fuld annonce" og ingen galleripile i forhåndsvisningen (delt kortkomponent, Agent 2).
- Opret er lidt mindre kompakt end billedet (feltrækkerne er højere, trin 1 har 3 felt-rækker + fold).
- Udlogget sælger kan ikke vælge billeder før login (bevidst, se A11); i billedet ligger upload frit.
- Forhåndsvisningens første række i fejltilstand viser toast over felter (kun kosmetik).

## Målinger (runde 2)
- `node --test js/w14-annonce.test.js`: 9/9. `js/w9-saelger.test.js`: 33/33 (5 tests opdateret bevidst: billeder er sektion 2 på samme side, trinnavne, ét tilbage-trin, login-port). `js/w9-marketplace-r2.test.js` opdateret bevidst (ingen strækning).
- `smoke-browser --sider "annonce*.html,opret-annonce" --viewports 320,390,768,1024,1440 --cls 0.05 --strikt`: 40 målinger, 0 fejl, 0 advarsler.
- Kontrast/tap (`annonce` egen + ekstern × 320/390/768/1024/1440 × lys/mørk, 20 sider): 0 fund under 4,5:1 (3:1 for stor tekst), 0 tap-mål < 40 px efter rettelse.
- `kritisk-gen` + `scripts/w12-kritisk.test.js`: 18/18. `npm run gate` (uden build): node --check, hele `npm test`, synk-header, seo-audit, sitemap, døde links, udgiv = OK. Trin 7 rød, til Orchestratoren tilføjer `js/w14-annonce.test.js` til package.json "test".

## Billeder (agent3-annonce/)
reference-annonce/opret; foer-annonce 1440/390, foer-opret; efter-annonce 1440/768/390 lys og mørk; efter-ekstern (48 hk, lys; med foto, mørk); efter-opret 1440 lys/mørk, 768, 390, gennemse og fejl; side-om-side (mockup | efter) pr. nøglesektion: sbs-annonce-oeverst/nederst, sbs-opret-oeverst/nederst.

## Ærlig score mod mockuppen (selvvurdering, ikke godkendelse)
Annonce ca. 7/10, opret ca. 6,5/10. Komposition og sektionsrækkefølge følger billederne nu; den største rest er sælgerpanelet og at kolonnerne ender ujævnt.

## Nye testfiler (package.json er Orchestratorens)
`js/w14-annonce.test.js`.
