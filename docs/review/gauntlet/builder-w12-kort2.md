# Builder w12-kort2 (rester fra Critic w11: kort-overlay, liste/swipe-fod, fejlbanner, kildenavn)

Branch `gauntlet/w12-kort2` fra 7ef5efa. Kun lokal mock (smoke-browser/smoke-fixtures), ingen produktion, ingen build/udgiv/generatorer.
Intet opdigtet: ingen stjerner, anmeldelser, "autoriseret", svartid, beskeder, betaling. Grøn kun ✓. Kørekort via `a2Status`/`koerekortMaerkat`.

## Acceptkriterier (målbare, skrevet før koden)

- O1 Overlay-overlap: ved 320/360/390/768/1440 px (lys) er `getBoundingClientRect`-skæringen 0 px mellem (hjerte `.fav-btn`, sammenlign `.card-compare`) og (alle `.badge` i `.card-media`, `.foto-tom-titel`, `.foto-tom-ikon`), og mellem knapperne indbyrdes og mellem badges og foto-tom-tekst. Målt på søgning (grid), mærke-, type-, annonce-"lignende", forside, sammenlign-visning samt syntetiske kort: egen m/u foto, forhandler, "Nyt opslag", "Under markedspris" og alle tre samtidig.
- O2 Ingen badge eller "Ingen fotos i denne annonce"-tekst ligger delvist uden for fotofeltet, og ingen badge er afkortet (`scrollWidth <= clientWidth`, ingen "FORHANDLE…").
- O3 Badge-teksten "Forhandler" er læsbar i fuld længde, eller badgen er ikon med `title`/tekst for skærmlæser; kortets øvrige højder er uændrede (nabokort i en række: top/bund-forskel <= 1 px).
- R1 `listingRowHTML` og `swipeCardHTML` (egne og eksterne) bruger `kortFodHTML(l, f)`: hver række/swipe-kort har `.rk-fod` med `.rk-sted` FØR `.rk-kilde`, begge med `title` og `aria-label` ("Sted: …"/"Kilde: …"). Rækkens øvrige layout uændret (grid-områder, højde +-2 px).
- F1 soegning.html ved 390 px under lagerfejl (mock 503): fejlbanneret skærer ikke hero-/sidens h1 (`getBoundingClientRect`-skæring 0), bevarer `role="alert"`, "Prøv igen" og "Luk" (begge >= 36 px høje), CLS < 0,05, kun < 1024 px; desktop uændret.
- K1 Kildenavn i kortfod ved 139 px kort: op til 2 linjer (line-clamp) i stedet for 1 linje ellipsis; alle kort i samme række har samme højde (`.rk-fod` højde ens, kort-top/bund-forskel <= 1 px); sted står stadig først og aldrig afkortet til under 4 tegn.
- T1 smoke-browser `--strikt` (soegning, index, maerke-honda, type-sport, annonce) x 320/390/768/1024/1440 x lys+mørk: 0 fejl, 0 advarsler (tap-mål >= 24 px, kontrast >= 4,5:1 for badge-/fodtekst målt med getComputedStyle).
- G node --check, `npm test` grønt, ingen ændring udenfor ejerfiler; før/efter-screenshots udenfor repoet.
