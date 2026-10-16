# Critic: annonce (billede 3) — gauntlet/annonce @ 83a93c2 (baseline 9fadd59)

Metode: blind test på renderet side. Server på **port 8742** (8722 var optaget af en andens baseline-server). Supabase var fuldt mocket med `page.route` (egne + eksterne rækker, ingen produktionsadgang, ingen skrivning). Scripts ligger udenfor repoet i `C:\Users\pasca\Desktop\rod\crit_annonce`. 9 sidetyper x 7 viewports x lys/mørk = 126 målinger, plus viewport-screenshots (læst) i 1440/1180/768/390, lys og mørk.

Testede sider: egen med 7 fotos, egen uden foto, egen med XSS-titel/-beskrivelse, 18 egne med varierende hk/ccm, ekstern med foto, ekstern uden foto/km/type/pris, Gul og Gratis, ekstern ny (0 km), demo `?id=1001`, de to statiske `annonce-*.html`.

## Sektionsscores (0-5, lys / mørk ens medmindre andet)
| Element | Score | Bemærkning |
|---|---|---|
| Brødkrumme + handlinger | 4 | 5 led + Del/Sammenlign/Gem som favorit i samme række som billedet. Mangler kun fuldskærmsknap (findes ikke). |
| Galleri | 4 | Stort foto, tæller, pile, 5 miniaturer + "+N". V-001 intakt: pile/tæller inden for galleriet ved alle 7 bredder. Eksterne har ét foto + ærlig "Foto: kilde". |
| Titelblok / pris / nøgletal | 4 | Chips, h1, "år \| km \| type", stor pris, ikonrække. Ingen brandlogo/finansiering (bevidst). |
| Fakta-tabel | 4 | 2 kolonner med ikoner, "Ikke oplyst" hvor tomt. Eksterne viser også "Annonce-id hos kilde" (k1), ikke et tilladt felt, men harmløst. |
| Beskrivelse | 4 | ✓-liste fra oplyst udstyr. Eksterne: citatblok kun med uddrag + ærlig note. |
| Sælgerboks | 3 | Egen: ærlig og funktionel, men tynd (stort "2020 / Medlem siden" uden kontekst, ingen adresse). Ekstern: god (kilde, domæne, type, sted, CTA). CTA-teksten knækker "MC / Syd" på 2 linjer i 1440. |
| Handl trygt | 4 | Fire sande punkter + link. |
| Kan du køre denne? | 4 | Korrekt og ærlig (se krav 2). Ligger i venstre kolonne, ikke i bunden midt som i billedet. |
| Det bør du tjekke | 3.5 | Fem sande generelle råd + guidelink. Ingen billede i boksen, og den sidder i midterkolonnen. |
| Lignende | 4 | 6 kort + "Søg videre"-chips med tal. |
| Mobil + sticky bar | 3.5 | Rent layout, ingen overflow. Men ekstern bjælke dækker footer (fund F-1). |

Svar på de tre spørgsmål:
- **Matcher det tydeligt billedets opsætning?** Ja på struktur: 3 kolonner (galleri+fakta | titel+beskrivelse+tjek | sælger+trygt), samme rækkefølge af blokke og samme kortsprog. Afvigelser er bevidste og ærlige (orange i stedet for grøn CTA, ingen logo/stjerner/svartid/finansiering).
- **Tæt nok?** Ja for 1440/1180. Størst visuel afstand: Tjek-boksen mangler motorcykelbilledet, Kørekort-kortet og Tjek-boksen står ikke side om side nederst som i billedet, og sælgerboksen er mindre "rig".
- **For tæt på det gamle site?** Nej, layoutet er tydeligt nyt (baseline var 2 kolonner med sidebar). Man kunne være modigere i sælgerboksen og tjek-boksen, se prioriteret liste.

## Dom pr. krav
1. **Alle sidetyper / eksterne regler: PASS.** Alle 9 sidetyper renderer korrekt data. Eksterne (8 testet) viser ingen `tel:`/`mailto:`, ingen galleri (1 `<img>` = thumbnail), ingen fuld tekst. CTA "Gå til annoncen hos <kilde>" har `rel="noopener noreferrer nofollow"`, `target=_blank`, href = kildens deeplink, og står kun på vores side (sidebox + mobilbjælke). Egne: favorit (tæller 0 til 1, aria-pressed), sammenlign (aria-pressed), del ("Link kopieret"), kontaktflow logget ind (modal, send, kvittering "Din henvendelse er registreret"); anonym sendes til login med redirect tilbage. Forbehold: siden klipper ikke `description` til 200 tegn og filtrerer ikke telefon/mail, men forlader sig på crawleren (`uddrag()` max 200 + `fjernPersonoplysninger`, databasen afviser mere). Uændret ift. baseline (F-6).
2. **Intet opdigtet + kørekort: PASS.** Ingen finansiering/svartid/verificeret/logoer i `js/annonce.js`. "★/Anmeldelser" vises kun fra rigtige `seller.rating`/Store-reviews (kun synlig på demo-annonce 1001, uændret fra baseline). Kørekort verificeret mod fstyr.dk (hentet 15.10.2026): A1 ≤125 cm³, ≤11 kW, ≤0,1 kW/kg; A2 ≤35 kW, ≤0,2 kW/kg, ikke afledt af >2x effekt; A uden effektgrænse. Koden bruger 15 hk (=11,0 kW) og 47 hk (=34,6 kW), dvs. konservativt. Testet på 25 annoncer, alle stemmer: 73 hk=Kræver A; 48 hk=A; 47 hk=Ikke udelukket A2 (aldrig bekræftet, kW/kg og afledning nævnes); 15 hk/125 ccm=Ikke udelukket A1; 125 ccm uden hk, 1254 ccm uden hk, ingen tal, 100 hk på 125 ccm (selvmodsigende) = "Kan ikke afgøres" med ærlig forklaring; hk uden ccm=Ikke udelukket A2; 16 hk/125 ccm=A2. Eksterne bruger "hos kilden". Tjekliste: 5 generelle, sande råd. Mindre bemærkning: 50 cc-scooter får "Ikke udelukket A1" (en 50 cc kræver normalt AM; A1 dækker, så sandt men upræcist) (P3).
3. **SEO: PASS med forbehold.** Script-sammenligning baseline vs gren på begge statiske sider og annonce.html: title, description, canonical, robots, og:title/description/image/url, alle JSON-LD, CSP, listing-id, antal h1 = **SAME**. Eneste ændringer er nyt stylesheet-link og brødkrumme/interne links. Eksterne: `noindex, follow` bekræftet; annonce.html `noindex`. Generator kørt på KOPI (mock-endpoint, 18 annoncer) for baseline og gren: præcis 23 diff-linjer pr. side, alle forklarede (css-link, brødkrumme, "Kilometer", "Lignende motorcykler", `an-videre`, "Vis nummer"). **Brødkrumme: synlig 5 led, JSON-LD 3 led (Forside > Classic/Veteran > BMW R45), mismatch indført af strømmen (F-3, P2).** Stylesheetet `p-annonce.css` har ikke `?v=`-stempel i statiske sider.
4. **Layout/a11y: FAIL på ét delpunkt.** scrollWidth==clientWidth ved 320/360/390/768/1024/1180/1440 lys+mørk for alle 9 sider (126/126; eneste element uden for viewport er skip-linket, bevidst). Én h1 overalt. 0 konsolfejl (efter ignorering af Supabase CORS/401). Galleri: pile, tæller og miniaturer helt inden for galleriet ved alle bredder (V-001 regresserer ikke). Kontrast (mål, alle tekstnoder i main, AA 4,5/3): 0 fejl lys og mørk; brødtekst-grå 5,2:1 lys. Tab-rækkefølge logisk, synlig 2 px fokusring overalt, galleriknapper har aria-labels ("Billede 2 af 7"). **Fejl: ekstern sticky bjælke dækker footerens copyright-linje (F-1). Escape lukker ikke kontaktmodal, og fokus flyttes ikke ind (F-2).**
5. **XSS/escaping: PASS.** Titel `<img onerror>`/`<script>` i model og beskrivelse, sælgernavn `<i>`, ekstern titel/model/uddrag: vises som tekst, `window.__xss*` aldrig sat, 0 `img[src=x]`, 0 `script` i main. Lange ubrudte strenge løber dog ud af små kort i Lignende (F-5, P3).
6. **Tests: PASS.** `npm test` 364/364, `node --test js/annonce-skal.test.js` 6/6, `node --check` på js/scripts/crawler uden fejl.
7. **Inline-bjælke i js/annonce.js: PASS m. fejl.** Bjælken bygges (pris + "Gå til annoncen hos X", 69 px, fixed), skjules mens sidebox-CTA er i view. CSP-meta uændret (de ubrugte hashes står stadig). Men flytningen introducerede F-1.
8. **Bagudkompatibilitet: PASS.** `annonce.html?id=<uuid>`, `?id=1001`, statiske `annonce-*.html` med listing-id-meta virker. Ingen `#`-ankre eller fjernede id'er i brug (kun `videre-titel` er væk; ingen referencer).

## Fund
| ID | Pri | Fund | Reproduktion |
|---|---|---|---|
| F-1 | P2 | Ekstern mobilbjælke dækker footerens bundlinje (©/Priser vises i DKK; 69 px). `renderExternalListing()` kalder `classList.remove('har-actionbar')` (js/annonce.js ~l.990) EFTER `anEksternBjaelke()` (l.973) har tilføjet den, så `body` får ingen `padding-bottom` (målt 0 px, egne annoncer 76 px) og `scroll-padding-bottom` mistes. Regression: baseline satte klassen efter render. | 390 eller 768 bredde, åbn en ekstern annonce, rul til bund, bjælke top y=775 over footer-bund y=760-844. Rettelse: fjern/flyt `remove` før bjælken bygges. |
| F-2 | P2 | Kontaktmodal lukker ikke på Escape og fokus flyttes ikke ind i dialogen (aktivt element forbliver åbneknappen). Findes i baseline, kendt af builder (DELT-ønske 4), men `js/annonce.js` er deres egen fil. | Logget ind, "Skriv til sælger", tryk Escape: `modal-overlay open` består. |
| F-3 | P2 | Synlig brødkrumme 5 led vs JSON-LD 3 led (statiske sider: generatoren er strømmens egen fil, så kunne rettes dér; dynamisk: `js/seo.js` delt). | Se `annonce-bmw-r45-…html` BreadcrumbList. |
| F-4 | P3 | Nye statiske sider linker `css/p-annonce.css` uden `?v=` (cache-risiko efter udgivelse; builder noterer allowlist/stempling som DELT-ønske 1). | |
| F-5 | P3 | Lange ubrudte tekststrenge (titel) løber ud af kortbredden i Lignende-kort (kun patologiske data; delt kortkomponent). | Egen annonce med model `<img src=x onerror=...>"><script>…`. |
| F-6 | P3 | Siden håndhæver ikke 200 tegn/ingen kontaktdata på ekstern `description` (afhænger af crawler/DB). Defensiv klipning (`slice(0,200)`) anbefales. | Ekstern række med langt uddrag viser alt. |
| F-7 | P3 | "Gå til annoncen hos MC Syd" knækker til "MC / Syd" i 1440-sidebox; "Kørekort Kørekort A"-chip i delt kort (baseline). Egen sælgerboks viser "2020 / Medlem siden" uden kontekst. | |
| F-8 | P3 | 50 cc "Ikke udelukket A1" (AM er normalt kategorien). | Egen annonce 50 ccm, 3 hk. |

Ingen P0/P1.

## Samlet dom: **ACCEPTER**
Funktion, regler (CLAUDE.md regel 2), SEO-felter, tests og overflow er intakte; ingen P0/P1. Rettes inden udgivelse bør F-1 (lille regression, én linje) og helst F-2/F-3.

## Prioriteret liste "for at komme tættere på billedet"
1. Ret F-1 (bjælke/footer) og F-2 (Escape + fokus i modal).
2. Brødkrumme-JSON-LD til 5 led (generator + `js/seo.js`).
3. Tjek-boksen: tilføj motorcykelbillede/illustration i højre side, og flyt "Kan du køre" + "Det bør du tjekke" ned som to side-om-side-felter på tværs af kolonnerne under fakta/beskrivelse, som i billedet.
4. Sælgerboks (egen): erstat "2020 / Medlem siden" med profiltype + by + sæt "Se sælgerprofil" som sekundær; sæt kontaktknap og evt. "Send besked"/"Ring op" som to-knaprække når sælger har oplyst telefon (kun ægte data).
5. Fuldskærms-/lightbox-knap på galleriet (billedets ⤢) med Escape og piletaster.
6. Header-container 1240 vs side 1440: bring header og krop til samme bredde (builders DELT-ønske 2).
7. Titelblok: reserver plads til mærkelogo kun hvis ægte, ellers behold; ellers lad prisen sidde højrestillet som i billedet.
8. Kortere CTA-tekst i smal sidebox ("Gå til annoncen hos MC Syd" uden linjeskift via mindre skrift eller bredere kolonne).
