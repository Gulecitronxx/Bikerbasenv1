# Builder: annonce (billede 3) — gauntlet/annonce

Filer: `annonce.html`, `js/annonce.js`, `scripts/build-listing-pages.js`, ny `css/p-annonce.css`, de to committed `annonce-*.html` (samme 5 tekstændringer som generatoren; ikke regenereret, så build.js-indsatte cookie/GA/CSP bevares), ny test `js/annonce-skal.test.js`.

## Bygget pr. billedelement
- Brødkrumme Forside › Motorcykler › Mærke › Model › "Mærke Model (årgang)" + `Del annonce`, `Sammenlign` (findes) og `Gem som favorit` (kun egne annoncer; indekserede har ingen favorit, D-008).
- Tre kolonner ≥1180 px (galleri+fakta+kørekort | titelblok+beskrivelse+tjekliste | sælgerboks+trygt). 760-1179: 2 kolonner med fuldbredde fakta; mobil: galleri, titel, sælger, beskrivelse, fakta, kørekort, trygt, tjek, lignende.
- Galleri: egne annoncer stort foto, tæller, pile, miniaturrække (maks. 5 + "+N"); eksterne kun det ene thumbnail (+ "Foto: kilde"-tekst) eller ærligt tomt felt. V-001-fixet bevaret (minmax(0,…), min-width:0), målt ingen overflow.
- Titelblok: chips (Brugt/Ny, type, kørekort-vurdering, ejere), h1 flyttes ind i blokken (stadig kun én h1), `år | km | type`, stor pris, ikon-række med oplyste nøgletal (km, årgang, ccm, hk).
- Beskrivelse: egne annoncer tekst + ✓-liste af oplyst udstyr/service; eksterne: ærlig blok "Beskrivelse og flere billeder står hos kilden" (CLAUDE.md regel 2).
- Fakta om motorcyklen: 2 kolonner m. ikoner (container query); grundfelter altid ("Ikke oplyst"), øvrige kun når oplyst.
- Sælgerboks: ekstern = kilde, domæne, sælgertype (kun hvis kilden oplyser), sted, `Gå til annoncen hos <kilde>`; egen = eksisterende kontaktflow (login/skriv/telefon). Ingen telefon/mail på eksterne.
- "Handl trygt" (4 ægte punkter + link sikkerhed.html), "Kan du køre denne?" (koerekortMaerkat(), "ikke udelukket ud fra de oplyste tal", link koerekort-a1/a2), "Det bør du tjekke" (5 generelle punkter + `guide-brugt-motorcykel.html`), "Lignende motorcykler" (6 kort, fælles pointsystem for begge typer) + "Søg videre"-chips med tal.
- Sticky mobil-bjælke bevaret: egne (`#listing-actionbar`) uændret; eksterne flyttet fra inline-script i annonce.html til `anEksternBjaelke()` i annonce.js (inline-script fjernet → CSP-hash ubrugt, ikke ændret).

## Matcher IKKE billedet (bevidst)
Brandlogo, "Se finansieringsforslag", anmeldelser/stjerner/svartid, Ring op/Send besked på eksterne, fotogalleri på eksterne, 14 fotos, fuldskærmsknap (findes ikke), billede i tjekboksen, sælger-adresse "Se på kort". Tjeklisten ligger i midterkolonnen ved siden af kørekortkortet (højre kolonne er sælger+trygt) for at undgå tomme felter.

## Kørekort-kilde
fstyr.dk/privat/koerekort/udvidelse-af-koerekort/koerekort-til-motorcykel (læst 15.10.2026): A1 ≤125 cm³/11 kW/0,1 kW/kg; A2 ≤35 kW/0,2 kW/kg, ikke afledt af model >2× effekt; A uden effektgrænse. Ingen nye påstande; teksten kommer fra eksisterende `koerekortMaerkat()`.

## Tests / målinger
- `npm test`: 364 + 6 nye (js/annonce-skal.test.js) grønne. `node --check` på js/scripts/crawler OK.
- Playwright (render, lys+mørk, 320/390/768/1024/1440; egen m. 5 fotos, egen uden foto, demo, ekstern m. foto/uden foto/uden km/Gul og Gratis, statisk annonce-bmw): scrollWidth==clientWidth overalt, 1 h1, 0 konsolfejl (udover kendt Supabase CORS). Logget-ind egen annonce: "Skriv til sælger"/telefon/favorit virker.
- Statisk side: title, canonical, description, og:, JSON-LD uændret (diff). Eksterne sætter stadig `noindex, follow`; annonce.html har `noindex`.
- 3 iterationer mod billedet: (1) tom plads/ragged kolonner → kolonnestakke; (2) fakta-tabel for smal → container query + bredere venstre kolonne; (3) bar-pris afkortet, "Indregistreret"/"Motorstørrelse" brud → rettet.

## DELT-ØNSKER
1. Tilføj `css/p-annonce.css` til udgivelses-allowlist (`scripts/udgiv.js`) og versionsstempling; tilføj `js/annonce-skal.test.js` til `npm test`.
2. Header-`.container` er 1240 px, siden bruger 1440 px (`main > .container` i p-annonce.css) — udvid headerens container til 1440 på alle sider, så header og krop flugter som i billedet.
3. `js/seo.js` breadcrumb-JSON-LD har 3 led; den synlige har 5 — udvid til Forside › Motorcykler › Mærke › Model › Annonce.
4. Kontaktmodalen lukker ikke på Escape (eksisterende; overlay-hjælperen bruges ikke på `#contact-modal`).

## Rest
Ekstern `Type` er ofte "Ikke oplyst" (kilden oplyser den ikke). Lange egne beskrivelser gør midterkolonnen lang (højre kolonne er kortere).

## Runde 2 (efter Critic ACCEPT, 15.10.2026)
- F-1 rettet: `har-actionbar` fjernes ikke længere efter bjælken er bygget (body-padding 76 px; footerens ©-linje synlig på 390).
- F-2 rettet lokalt i annonce.js: fokus ind i kontaktmodalen, Escape lukker, Tab fanget, fokus tilbage til udløseren, role=dialog/aria-modal. Testet.
- F-3 rettet: generator + de to statiske sider har 5-leds BreadcrumbList; runtime omskriver seo.js' 3 led til 5 (`anSeoBrodkrumme`), så seo.js ikke røres.
- P3: Lignende-titler/priser klippes med ellipsis; kildenavn i CTA har `nowrap` (ingen "MC / Syd"); ekstern uddrag klippes til 200 tegn i visningen; 50 cc "Ikke udelukket A1" er IKKE en fejl (A1 dækker ≤125 cm³) — evt. DELT-ØNSKE om "AM" i data.js, ikke ændret.
- Tættere på billedet: "Kan du køre?" og "Det bør du tjekke" står side om side i bundrækken (desktop) med motorcykelfoto (img/sell-cruiser.webp, dekorativt) i tjekboksens højre side, lys+mørk; egen sælgerboks samlet i ét kort (kontakt, telefon, betalingsinfo, sælgerprofil); lange egne beskrivelser klippes til 12 linjer med "Vis hele beskrivelsen".
- Målt: 1440/1180/390/320 lys+mørk, egen/ekstern/Gul og Gratis/statisk: ingen overflow, 1 h1, 0 konsolfejl. `npm test` 364 + annonce-skal 6 grønne.
- Selv-score (0-5): brødkrumme 4, galleri 4, titelblok 4, fakta 4, beskrivelse 4, sælgerboks 3,5, trygt 4, kørekort 4,5, tjek 4,5, lignende 4, mobil 4.
- DELT-ØNSKE uændret: header-container 1440, `p-annonce.css` i allowlist/?v=-stempling, test i `npm test`.
