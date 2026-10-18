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

## Restpunkter (ikke gjort, ærligt)
- Mockuppens billedtæller (1/14), prisslider, anmeldelser/stjerner, svartid: opfindes ikke, data findes ikke.
- Tomtilstand viser stadig Sortér/visningsknapper uden resultater (kosmetisk).
- `?page=99` viser sidste side; URL normaliseres ikke (ikke undersøgt).
- Listevisningen viser "Ingen fotos" mens gitteret viser typefoto (bevidst forskellig, men uens).

## Selvscore (før Critic)
Søgning 7,5/10, annonce 7/10 (ingen store fund; forbedringer er små og ærlige, løftet ligger i låste tests, ikke i nyt design).
