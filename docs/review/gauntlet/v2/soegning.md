# V2 Søgning og annonce (Builder 2)

Metode: lokal server + Playwright mod mock (`*.supabase.co` besvares lokalt, ingen produktion). Mockups: Motorcykler til salg.png, Annonce.png.
Skærmbilleder: `docs/review/gauntlet/v2/skaerm/` (`*-foer-*` og `*-efter-*`; m320/m390 = søgning, a-* = annonce).

## Eksplicit kontrol: tomtilstand sammen med resultater?
En vagt (MutationObserver + 30 ms interval) kørte i siden under 16 hente-/URL-tilstande: default, ?q=nul, side 2, side 99, nul-filter, 1-3 træf,
ekstern fejl, egne fejl, begge fejl, begge tomme, langsom hydrering (1,2 s), 320/390. Samt interaktion: filter -> tom -> Nulstil -> søg -> visninger
(grid/liste/swipe) -> sider -> Tilbage. Vagten fanger "tomtilstand synlig + kort", "Ingen fotos" i kort med rigtigt foto, "Lageret kunne ikke
hentes" i resultattal sammen med kort, og synlig tekst "Ingen annoncer…" mens kort står. Vagten er valideret (tvunget brud fanges).
Resultat: INGEN brud i nogen tilstand. render() skifter grid/empty atomisk. Låst i `js/v2-soegning.test.js`.

## Fundne og rettede fejl
1. Typefoto-etiketten brød over to linjer på mobil ("Typefoto, ikke / annoncens"). Nu `nowrap`; under 360 px står kun "Typefoto" synligt,
   resten ("ikke annoncens") er visuelt skjult men i DOM/oplæsning, og `title` bærer hele forklaringen.
2. Filterchips med åbent interval læste "Årgang 2020 – …", "1000 – ∞ ccm", "0 – 48 hk". Nu "Årgang fra 2020", "Fra 1000 ccm", "Maks. 48 hk".
3. Infolinjen "· fra 3 kilder" stod med enlig punktum først på en linje ved 320 px. Punktum skjules og linjen står for sig under 360 px.
4. Listerækkens titel blev klippet ("Ducati Multistrad…") på mobil. Må nu bryde til to linjer.

## Testet uden fund (kun testet, ikke ændret)
Filterkombinationer (type, mærke, pris, km, årgang, hk, ccm, kørekort A1/A2, forhandler, kilde, kun billeder): tal = kort summeret over alle sider,
ingen dubletter. Sortering pris/km/årgang monoton med uoplyst sidst. Paginering + Tilbage. Favorit huskes efter reload. Sammenlign (bar, modal, ingen
null/NaN). Gem/fjern søgning (lokal). Ekstern annonce: kilde-knap = kildens https-adresse, target _blank, rel noopener, forhandlerforbehold,
"flere billeder i deres annonce", ingen miniaturer/tæller på ét foto. Egen annonce: galleri, lightbox (åbn, piletaster, Esc), ukendt id = ærlig fejl.
Telefon-reveal er allerede dækket af `js/w14-annonce.test.js`. Overflow 320/390 for søgning (gitter, liste, filterskuffe, tom) og 4 annoncer.
Typefoto-mærkningen "ikke annoncens" bevares (ingen skjulte typefotos som annoncebillede).

## Iteration 2

Restpunkter fra iteration 1 rettet: (a) listevisningen bruger nu samme ærlige typefoto som gitteret (kun "Typefoto" synligt i den lille miniature, resten i DOM),
(b) Sortér/visning skjules uden resultater, (c) `?page=99` normaliseres til `?page=5` i URL'en (replaceState efter klem).

Sammenligninger (mockup | før | efter, lys og mørk, 1440 og 390): `docs/review/gauntlet/v2/skaerm/sammenlign-{soegning,annonce}-{1440,390}-{light,dark}.png`.
Mockuppen findes kun som desktop; 390 vises ved siden af den som reference for rytme og indhold. Mockuppens grønne primærfarve er et mærkevalg og ændres ikke.

### Forskelsliste (mockup mod nu)
| # | Mockup | Før | Nu |
|---|---|---|---|
| 1 | Søgekort overlapper hero, "12.842 motorcykler" under overskriften | Samme, undertitel på samme linje ved 1440 (kompakt hero, bevidst fra tidligere runder) | uændret |
| 2 | Filtersidebar: Mærke/model, Type, Pris-slider, Årgang, Km, Kørekort | Findes, inkl. dobbeltslider og hurtigpriser | uændret (ingen nye filtre opfundet) |
| 3 | Aktive filterchips over resultaterne, "Ryd alle filtre" | Findes; åbne intervaller læste "2020 – …", "∞" | Rettet (iteration 1): "Årgang fra 2020", "Fra 1000 ccm" |
| 4 | Resultatlinje kun med antal + Sortér + Gitter/Liste | Tre linjer finskrift (kilder, friskhed, sortering) | Finskriften er bevaret med vilje (kilde-ærlighed); uden resultater skjules Sortér/visning nu |
| 5 | Kortets billede med billedtæller (1/12) | Typefoto-etiket brød over 2 linjer; tæller kan ikke laves (kun ét thumbnail) | Etiket på én linje; under 760 px "Typefoto" (+ fuld tekst i DOM/title) så den ikke rammer sammenlign-knappen |
| 6 | Kort: specrække A2 / ccm / hk / kg i ens chips | Mobil: "44 hk" stod alene på 3. række | Mobil: kørekortchip på egen række, ccm + hk sammen |
| 7 | Liste-rytme: ens rækker med foto | Listen viste "Ingen fotos"-kasse, hvor gitteret viste typefoto; titel klippet | Samme typefoto som gitteret; titel bryder til 2 linjer på mobil |
| 8 | Paginering under gitteret | Findes (1-5, pile, "Viser 1-24 af 97") | uændret; `?page=99` rettet til sidste side i URL |
| 9 | Annonce: titelblok med mærkelogo, år / km / type, pris | Findes | uændret |
| 10 | Annonce: nøgletalsrække med 5 ikoner | Mobil: 3+1 (en enlig "130 hk"-række) | Mobil: 2 x 2 |
| 11 | Annonce: kørekortkort med stor A2-badge til højre | Mobil: høj boks under teksten | Mobil: lav badge-linje ("KRÆVER A", forklaring under) |
| 12 | Annonce: brødkrumme | Mobil: aktuel side klippet ("Ka…") | Aktuel side skjult visuelt (titlen står under), bevaret for skærmlæsere |
| 13 | Sælgerkort med anmeldelser, ring op, svartid, finansiering | Findes ikke og opfindes ikke; ekstern: ærlig kilde-CTA + forhandlerforbehold | uændret (ingen data) |
| 14 | Galleri med 6 miniaturer og "+10" | Egne annoncer: miniaturer + "+N" ved 6+; ekstern: ét foto + "flere billeder hos kilden" | uændret |
| 15 | Lignende motorcykler, 6 kort | Findes | uændret |
| 16 | Sticky handling på mobil | Findes ("Vis nummer" / "Gå til annoncen hos …" i bund) | uændret |

Implementeret uden opdigtet indhold: punkterne 3, 5, 6, 7, 10, 11, 12 samt (a)-(c) ovenfor. Ingen nye billeder; typefotos er sidens egne `img/type/*.webp`.

### Byggekæde
`node scripts/build.js` -> `node scripts/kritisk-gen.js` -> `node scripts/build.js` kørte uden fejl i sandboxen. Kun mine filer er committet
(css/p-soegning.css, css/p-annonce.css, js/search.js, soegning.html, annonce.html, testen, doku); de øvrige genererede filer er rullet tilbage til Orchestrator.

## Restpunkter (ærligt)
- Mockuppens billedtæller, prisslider-i-kortet, anmeldelser, svartid, ring op/besked: data findes ikke, opfindes ikke.
- Tomme 54 px over "97 motorcykler" på mobil er CLS-reservation til filterchips (bevidst); uden filtre kunne den fjernes, men det kræver et inline-script (CSP-hash) og er ikke gjort.
- Infobåndets tre finskriftslinjer på desktop er stadig travlere end mockuppens.

## Selvscore (før Critic)
Søgning 8/10, annonce 7,5/10.
