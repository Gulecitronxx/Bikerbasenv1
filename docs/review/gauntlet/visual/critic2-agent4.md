# Critic runde 2 (blind) — Agent 4 / w14-maerker (mærke-, type-, kørekort-, model-, regionssider, maerker.html)

Branch `gauntlet/w14-maerker` @ f7fe83c6. Test i egen kopi `%TEMP%\c2a4-20261017-204139\site` (worktree + syntetisk lager på 308 annoncer via Builderens fixture-metode: generatorerne kørt med preload mod mock-Supabase; annoncefotos peget på `img/type`). Produktion ikke rørt, `SUPABASE_SERVICE_ROLE_KEY` fjernet, port 9160-9172. Jeg så mockupperne og egne screenshots FØR Builderens dokument.

## DOM: AFVIS

| Mockup | Ligner mockuppen |
|---|---|
| Mærker.png (Yamaha) | **5,0 / 10** (Builder: 6,5) |
| Sport motorcykler.png | **5,5 / 10** (Builder: 6,5) |
| Motorcykler til A 2.png | **6,5 / 10** (Builder: 7) |
| Samlet | **5,5 / 10** |

Struktur og rækkefølge er rimeligt tæt (tillidsrække, søgekort, 5 kort + CTA-panel, typefliser, tre bundkolonner). Men første indtryk er det modsatte af mockuppen: **alle tre mockups er foto-heroer med rytter og landskab; vi har en flad, brun-sort flade**. Det er det første ejeren ser, og det er det, der afgør "ikke godt nok". Alt under heroen er pænt, men gennemsnitligt (kortfliser, hvide kort, tekst), og de mest "imponerende" moduler i billederne (CTA-panel med rytterfoto, hero-foto, undertypekort med foto, guide-foto-kort) mangler eller er erstattet af tekst/ikoner.

## 1) Screenshots (alle i `%TEMP%\c2a4-20261017-204139\shots\`)
- `d\` 1440x900 lys (11 sider) + `-s1..s4` segmenter for yamaha/sport/a2 (fuld side), `dk\` 1440 mørk (yamaha, sport, a2, maerker) + lys honda.
- `m\` 390x844 lys+mørk og 768x1024 lys for alle 11 sider; `ms\` segmenter 390 (yamaha, a2); `f\` fejl-/tomtilstand yamaha; `logos.png` hero-lockups for 17 mærker.
- Mørk verificeret: `body` = rgb(22,20,15) på alle mørke skærmbilleder; 0 vandret overflow på alle 11 sider i 390/768/1440, lys og mørk.

## 2) Min afvigelsesliste (prioriteret). N = nødvendig (manglende asset/data), R = kan rettes

**1 Manglende moduler**
1. Hero uden foto/rytter (Yamaha, Honda, Harley, model): flad mørk flade, tomt midterfelt, faktapanel til højre. Mockup: fuldbredde foto med rytter. Faldet i "imponerende" er stort. Der findes kun ét heroasset (`img/hero-*.webp`, Ducati XDiavel) og 8 studiofotos `img/type/*.webp` på grå baggrund. Hvis nye fotos skal opdigtes/genereres: **N (asset)**; men en bedre hero er **R** med eksisterende assets (se rettelse 1).
2. CTA-panel (Find din næste Yamaha / Er en sport-motorcykel noget for dig?) uden rytterfoto og uden mærkelogo i farver: kun logo + tekst + knap. På mærkesider ses en klippet foto-sliver i panelets bund (fejl, **R**). Rytterfoto: **N**, men et crop af et type-foto bag panelet er **R**.
3. Sport: "Udforsk typer inden for sport-motorcykler" (Supersport, Sports-touring, Lette sportscykler, Trackday m. foto og "Se guide") er erstattet af "efter behov" (A2 / pris / km / region) uden foto. Undertyper kan ikke udledes af data (**N** for tal), men fire redaktionelle kort med foto og "Se guide" til `guide-mc-typer` uden tal er **R**.
4. Sport: "Det skal du vide om sport-motorcykler" (4 infokort) og "Se sport-motorcykler i din region" findes kun som chips/ingen; A2: "Nyeste A2 motorcykler" og "Guides og viden om A2" (3 fotokort) mangler (guiderække findes på sport, ikke på A2-screenshot). **R** (guiderække + infokort er statisk redaktionelt indhold; "Nyeste" kan bygges af `foerst_set`).
5. Yamaha: "Sådan virker Bikerbasen" findes, men "Gem og sammenlign" og fællesskabsbanner med bjerg-illustration er reduceret til et blegt grønt kort med ikon. Mock-bundrækken "Populære modeller | Kørekort | Region" findes, men region viser kun 3 fliser og A1 viser "0 Yamaha" som tom flise (ærligt, men ser ødelagt ud — vis ikke tomme fliser, **R**).

**2 Forkert layout**
6. Mærkesidens tillidsrække er flyttet under søgekortet med 4 lange tekstblokke (lav ikon, 2 linjer) og er hvid på hvid; i mockuppen er den en lys stribe på sidebaggrund. Mindre afvigelse (**R**).
7. Hero-højder 272/254/214 (Builder) er målt ved 'nær hero'; faktisk hero + overlappende søgekort fylder ca. 430 px (Yamaha) fra top, og første kortrække er synlig ved 1440x900 (kortrække 600-880 px) — **det er godt** og matcher billedet. Men Yamaha/Honda-søgekort er 125 px højere end mockuppens (overskrift + 2-linjers tekst + tal), og Harley/Region/model får tre-linjers knap ("Søg Harley-Davidson motorcykler") og klippet placeholder ("(fx FLHX Street G"). **R**: kortere knaptekst ("Søg") eller smallere felter.
8. "Kort fortalt" mint-bånd (4 haker) står som ekstra modul, som mockuppen ikke har, midt mellem fliser og moduler; på A2 står den over de tre infobokse og trækker fokus. Mockuppen har ikke dette modul. **R**: gør den til en tynd tekstlinje eller flyt til bund.
9. Region-side og model-side følger ikke noget billede (acceptabelt, ingen mockup), men model-hero med kun tre filtre (pris/årgang/km) og ingen søgefelt er svagt.

**3 Hierarki**
10. H1 er 48 px fed Space Grotesk, men ligger i en flad flade uden kontrast i form/størrelse; mockuppen har 60+ px titel over foto med skygge. Mærke-lockup (72 px emblem) er godt og tydeligt, men H1 under den ("Brugte Yamaha-motorcykler til salg i Danmark") konkurrerer ikke og logoet "bærer" siden alene. **R**.
11. Annoncekortprisen står under titlen på 3 af 5 mærkekort (titel-brud over to linjer: "Harley-Davidson FLHX Street Glide" -> pris på egen linje), mockuppen har titel+pris på samme linje. **R** (kortere titelfelt eller pris under).

**4 Kort/panelopbygning**
12. Fotokort er tætte på mockuppen (kørekortbadge, ccm/hk-chips, sted, kilde). Mangler: kg-chip (ikke oplyst i data, **N**), hjerte-favorit mangler på flere kort (kun sammenlign-ikon) — **R**. "Foto kunne ikke hentes" / "Ingen fotos i denne annonce" med stiplet ramme på 2 af 5 kort ser uafsluttet ud (**R**: ensartet neutral placeholder med motorcykel-silhuet).
13. Typefliser er fine (3:1, billede + antal), men på Yamaha kun 4 fliser (data) og tekst er lille. OK.

**5 Billedbrug**
14. Samme to-tre studiobilleder går igen på ALLE kort (syntetisk lager — **ikke** Builderens skyld, men heroen er det): hero på Sport, A1, A2, A og region viser den samme **Ducati XDiavel (cruiser)**; på "Sport-motorcykler" er det direkte forkert motiv. **R**: type-specifikt hero-crop (sport.webp/touring.webp osv.) eller neutral flad hero.

**6 Proportioner/spacing**
15. Stort tomt område i heroens midte (x 700-1100) på mærkesider; bunden har ca. 120 px tom luft før footer på type-siden. **R**.

**7 Typografi/detaljer**
16. Nummercirkler på "Sådan virker" overlapper ikonerne (orange 1-4 over ikon) — ser tilfældigt ud. "Mere om udvalget" (understreget orange link) hænger alene under kortrækken. "Se alle 61 Yamaha i søgningen →" bryder over to linjer ved 1440. **R**.
17. Footer er mørk i lys tilstand (hele sitet; mockuppen: lys). Uden for scope, noteret.

**8 Mikrointeraktion**: ikke vurderet i dybden (hover på kort/fliser findes). Ingen pile-/indlæsningsanimation på hero; mockupens favorithjerte mangler på flere kort.

### Er Builderens designvalg et fald? (flad hero, ikonkort, 5+8, hero-højder)
- **Flad mørk hero uden motorcykel: ja, et reelt fald i "imponerende"** set mod mockuppens foto. Argumentet "ingen sticker-hero med fremmed mærke" er ærligt og korrekt — men løsningen kan være en tom flade OG et neutralt foto-crop; i dag er den bare tom. På Sport/A1/A2/A er der et foto, men det er en cruiser, så billedet "lyver" om siden.
- **Ikonkort i stedet for foto ("Udforsk efter behov")**: ærligt, men svagere end mockuppens fotokort; det er hvad der gør Sport-siden til "6/10".
- **5+8 kort**: 5 over foldens kortrække matcher billedet (+). 8 kort i "Flere"-gitteret er fornuftigt.
- **Hero-højde**: lavere end baseline og tæt på mockuppens, men fordi hero er flad ligner den et banner, ikke en hero.

## 3) Prioriterede rettelser (fil / hvad / målbart kriterie)
1. `css/p-maerke.css` (.mk-hero-flad / .mk-hero-media) + `scripts/build-brand-pages.js` ~l.1336: lad mærke- og model-heroen få en højre-halvdel-baggrund fra et eksisterende type-foto (mærkets mest udbudte type, fx `img/type/naked.webp`, maskeret med gradient fra venstre; ingen motorcykel med fremmed logo) eller `img/hero-1600.webp`. Kriterie: >= 35 % af heroens areal er fotografi ved 1440; ingen gengivelse af et andet mærkes emblem; kontrast hvid H1 på foto >= 4,5:1.
2. `scripts/build-facet-pages.js` ~l.1910 (`fa-hero`): vælg hero-foto pr. type (sport -> sport.webp-crop, ikke XDiavel) og for A1/A2/A: neutral (touring/naked-crop). Kriterie: `type-sport` hero indeholder ikke `hero-*.webp`; 8 typer har 8 forskellige hero-baggrunde.
3. `css/p-facet.css` + builder: CTA-panelet får et crop af et type-foto (højre side, 45 % bredde) i stedet for tom hvid; fjern foto-sliveren i bunden på mærke-CTA. Kriterie: panel viser foto >= 120x160 px eller intet; ingen klippet stribe < 20 px.
4. `build-facet-pages.js` type-siden: erstat "Udforsk efter behov" med to rækker: (a) 4 redaktionelle undertypekort m. foto + "Se guide →" til `guide-mc-typer.html` (ingen tal), (b) behovskortene som tynde chips. Kriterie: 4 fotokort >= 90 px høje ved 1440 over fold nr. 2.
5. `build-facet-pages.js` kørekortside: tilføj "Guides og viden om A2" (3 fotokort, `guide-a2-koerekort.html` m.fl.) og "Nyeste A2" (sorteret på `foerst_set`, kun hvis >= 3). Kriterie: begge moduler findes på `koerekort-a2` og gengives ikke som tomme.
6. Søgekort (`p-maerke.css`/`p-facet.css`): knaptekst "Søg {Mærke}" (maks. 18 tegn, ellers "Søg") + placeholdere kortere. Kriterie: knap 1 linje, 52 px, på alle 14 mærker ved 1440; placeholder ikke klippet.
7. Annoncekort (`js/…` kort-skabelon bruges af mærkesider): titel og pris på samme linje (titel `…`-afkortet, 1 linje), pris højrejusteret; favorit-hjerte på alle kort. Kriterie: alle kort i en række samme højde og 0 kort med pris på egen linje ved 1440.
8. Tomme fliser: A1 "0 Yamaha" og tomme regioner skal skjules (eller markeres "Ingen endnu") i `build-brand-pages.js`. Kriterie: ingen flise med tal 0.
9. "Kort fortalt": gør til én-linjes tekststribe (ca. 48 px) eller flyt under linkgrupper. Kriterie: højde <= 56 px.
10. "Sådan virker": placér nummercirklen til venstre for ikonet (ikke overlappende); hold "Mere om udvalget"-linket inde i overskriftsrækken. Kriterie: ingen overlap; link på samme række som "Se alle".
11. CLS-fix (se pkt. 5): find kilden til 0,053-0,059 ved 1440 på 12 små mærkesider. Kriterie: `smoke-browser --cls 0.05 --strikt` 0 fejl to gange.
12. Placeholder til foto-løse kort: ensartet neutral silhuet i stedet for stiplet ramme + tekst. Kriterie: ens højde/udtryk, ingen stiplet kant.

## 4) Logo-korrekthed (hero-lockup, `logos.png`; ejeren har godkendt logoer, intet ændres)
14 mærker + 3 ekstra renderes uden manglende filer, hvide lockups læsbare i både lys og mørk. Synlige afvigelser at dokumentere (ikke rette): **Vespa** er ca. dobbelt så højt (ordmærke ~70 px mod 35-45 px hos de andre) og skubber H1 ned/klipper nærmest overskriften i et 130 px-udsnit; **Ducati, Harley-Davidson, KTM, Aprilia** er emblem/ordmærke alene (Ducati/Harley-skjold bærer navn selv; ok); **Indian** er lille ved siden af resten; **Honda** vinge+ordmærke er stort (ca. 55 px). Visuel vægt er ikke ens på tværs. A-Z-listen (maerker.html) viser logofliser for 8 mærker med logo og knapper for resten (monogram/bogstav) — ens. Logo-testene (w13-logo-*) er grønne på pristine kopi.

## 5) Funktion, tests og SEO
- **Søgemoduler -> soegning.html**: `action="soegning.html" method=get`, korrekte parametre (`brands`, `type`, `koerekort`, `regions`, `maxPrice`, `model`, `sort`). Tal på chips/fliser matcher soegning med mock: sport 31=31, A2 116=116, hver modelflise 12 = 12 (XJ6 "1 annonce" -> 0/1), **men** brand-total: siden "61 Yamaha" / "A 61" mod 67 resultater (Honda 109 vs 115, +6 på begge). Sandsynligvis mock-artefakt (Builders `svar` ignorerer filtre; egne rækker), men uafklaret — bør verificeres mod `soegning` for et fixture med filtre.
- **Lagerfejl (500)**: banner "Vi kunne ikke hente annoncerne...", `data-lager-fejl` sat, tal -> "?" — korrekt og ærligt. **200 med `[]`**: INGEN banner, intet flag, siden viser stadig de byggede 61 Yamaha-kort og "61 Yamaha-motorcykler" — målt (`func.js tom`). Det er **ikke fuldt ærligt**: tom lagerstatus på mærke-/type-/kørekortsider behandles ikke som afbrud (kun siderne med lagerliste). Kan rettes (`erSideMedLagerliste`) ; Builderens begrundelse (byggede kort er et snapshot) holder kun hvis siden mærker det som "snapshot fra {dato}".
- **smoke-browser** (`--rod` min kopi, 35 sider x 5 viewports x lys/mørk, `--cls 0.05 --strikt`), kørt 2 gange: 350 målinger, **24 fejl / 23 fejl, ens**: CLS 0,053-0,059 ved 1440 (lys+mørk) på 12 mærkesider (aprilia, ducati, husqvarna, indian, ktm, lauge-jensen, moto-guzzi, mv-agusta, piaggio, royal-enfield, triumph, vespa). 0 overflow, 0 konsolfejl, 0 tap-mål/kontrast-fund (0 advarsler). Kørt delvist under anden CPU-belastning i run 1; run 2 gav samme mønster. Builder rapporterede 0 fejl på 17 sider — han målte tilsyneladende ikke disse smålagrede sider, eller kun uden de to ekstra faktorer.
- **Tests** (`node --test` w14-maerker, w13-logo-*, facet-sider, maerkeside): i pristine kopi 109/109 grønne. I den syntetisk byggede kopi fejler 3 (logo-generator: 18 mærkelinks, "kopi rørte repo", manifest ≥29 sider) — kun fordi det syntetiske lager har 18 mærker mod 29 live; ikke en defekt.
- **SEO**: `node scripts/seo-audit.js` på committede sider: 101 sider, 73 indekserbare, **0 fund**. Sammenligning committed vs. min byggede kopi: title/H1/canonical/JSON-LD uændret hvor data er ens; afvigelser kun i tal (annoncer/pris) og fire-seks sider der flipper noindex/ændrer titel pga. det syntetiske lagers størrelse (`type-sport` får "Brugte …" i titel når alle er bevist brugte — tilsigtet; `koerekort-a1` 0->4 annoncer -> noindex i kopien). maerker.html i kopien mangler canonical (bliver tilføjet i den fulde build-kæde, ikke af generatorerne alene) — committed side har den.
- **Kørekortregler** i `koerekort-a1/a2/a`: A1 18 år / 11 kW (ca. 15 hk) / 0,1 kW/kg — OK; A2 20 år (stedet siger "Fra 20 år", mockup 18 — Danmark: A2 fra 20 år, så siden er korrekt) / 35 kW = 47 hk / 0,2 — OK; A 24 år / 22 efter 2 års A2 — OK (A2-siden: "Fra 24 år, eller 22 år efter 2 års A2 og praktisk prøve").
- **Ærlighed**: intet "3.842"/"1.827"-lignende opdigtet tal på siderne; alle tal er beregnet af lageret. Ingen sticker-hero med fremmed mærke (heroen er flad). Dog viser hero på Sport/A1/A2/A cruiser-foto — vildledende motiv (se pkt. 14).

## Kort konklusion
AFVIS. Det skarpeste hul er heroen (alle tre mockups: foto + rytter; vi: flad flade eller en cruiser på Sport), derefter manglende foto-moduler (CTA-rytter, undertypekort, guide-fotos), og et reelt CLS-problem på små mærkesider ved 1440 samt uærlig 200-tom tilstand. Funktion/SEO/kørekortregler/logoer er i orden.
