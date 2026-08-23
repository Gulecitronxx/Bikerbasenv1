# Runde 5 — annoncesiden (VDP) blindt mod Bilbasen (AUDIT ONLY)

Ingen kodeændringer. Ingen produktionsfil er rørt. Denne fil er det eneste,
runden har skrevet.

Rækkerne i afsnit 3 er klar til at flettes ind i `BACKLOG.md`.

---

## Sådan er der målt (læs den her først, tallene afhænger af den)

**Grundlag.** Fire viewport-skærmbilleder og fire fuldsideoptagelser i
`work/runde5/`: `bilbasen-vdp-{m,d}(-full).png` (reference — Skoda Roomster,
`bilbasen.dk/brugt/bil/skoda/roomster/12-12v-classic-5d/6907258`) og
`bikerbasen-vdp-{m,d}(-full).png` (vores — Honda NT 1100 A, **indekseret fra
Gul og Gratis**; 100 % af lageret i drift er indekseret, så det er den gren,
der tæller: `renderExternalListing()` i `js/annonce.js:347`, ikke
`renderListing()`). Mobil 390×844, desktop 1366×850.

**Pixeltal er aflæst af billederne, ikke af DOM'en** — alle y-værdier er
derfor "≈" og skal regnes med ±6 px. Hvor det gav mening, er udsnit skaleret
2× for at sætte folden præcist (den faste bjælke på vores mobilside står ved
**y≈772–844**; kørekortpanelets overkant titter frem ved ≈765 og forsvinder
under bjælken — det er altså ikke et artefakt af fuldsideoptagelsen, det er
første skærm).

**Bilbasens fuldside-desktop er 1495 px bred** (scrollbar/viewport-forskel
i optagelsen), men de lodrette koordinater stemmer med 1366-billedet
(header 190–262, foto 311–795 i begge), så de er brugt direkte.

**Bilbasens "Lignende biler" og "Finansiering" viste spinnere i optagelsen**
(lazy load, ikke færdig). Det er bedømt på det, der kunne læses: titler,
modelår, km, pris. Vores "Lignende" på mobil havde to af tre kort med en grå,
tom billedflade i optagelsen; på desktop var alle tre billeder fremme — det
er også et indlæsningsartefakt, men det nævnes under D5-A5, for det er det,
en langsom mobilforbindelse ser.

**Reglerne, fundene holder sig inden for:** `CLAUDE.md` regel 2 (kun
titel/mærke/model/årgang/km/ccm/pris/postnummer/sælgertype/ét thumbnail/
kildelink — ingen tekst, intet galleri, ingen kontaktoplysninger),
`docs/review/DECISIONS.md` "Låst" ("Ærlighed slår fuldstændighed", "Kilden ejer
sine billeder") og "Afvist" (ingen silhuet, ingen billedproxy, ingen favorit
på eksterne kort — D-008). Ærlighedsteksterne ("Ikke oplyst", "Vi viser ikke
en tegning i stedet") bliver stående i alle forslag. Sammenlign ER tilladt på
eksterne (D-008: lokal, ingen database), og `reports.target_id` er `text` uden
fremmednøgle (`supabase/002_favorites_reviews.sql:47-56`), så "Meld fejl"
kræver ingen migration.

---

## 1. Blind dom

**Mobil: Bilbasen vinder klart.** Deres første skærm er *handling → foto →
identitet → pris* på 743 px; vores er *brødkrumme → 112 px grå forbeholdskasse
→ foto → 2 linjers billedkredit → titel → pris*, og så dækker vores egen
faste bjælke det, der skulle have været vores trumf (kørekortet). Bilbasen
viser sin sælger-identitet som et logo med adresse og antal annoncer; vi viser
vores som fire forskellige formuleringer af "det her er ikke os". **Desktop:
jævnere end man skulle tro** — Bilbasen spilder 190 px på en tom annonceplads
over headeren og har titel (≈950) og pris (≈978) *under* folden på 850, mens
vores pris lige akkurat rammer folden (≈835). Men deres højre spalte er en
*rækkefølge af ting at gøre* (3 CTA'er → forhandler → finansiering →
forsikring → byttepris → om forhandleren), og vores er én knap efterfulgt af
fem linjers forbehold og fire grå links. Vores side læses som en velskrevet
ansvarsfraskrivelse med et foto; deres læses som en side, der vil sælge bilen.
Skulle jeg vælge side uden at kende afsenderen, valgte jeg Bilbasen på begge
breakpoints — på mobil uden at tøve.

---

## 2. Pixelfakta

| Måling | Bilbasen 390 | Bikerbasen 390 | Bilbasen 1366 | Bikerbasen 1366 |
|---|---|---|---|---|
| y første foto (overkant) | ≈213 (til ≈507, kant til kant) | ≈253 (til ≈545, kant til kant) | ≈311 (til ≈795, 646 px bred) | ≈220 (til ≈660, 703 px bred, 16:10) |
| y titel | ≈638 ("Skoda Roomster", ~30 px) | ≈628 ("Honda NT 1100 A", 26 px) | ≈950 — **under folden** | ≈728 |
| y pris | ≈743 ("Kontantpris · 44.900 kr.", samme linje) | ≈722 (etiket ≈695 + tal 30 px) | ≈978 — **under folden** | ≈835 (etiket ≈802; tallet rammer kanten ved 850) |
| y primær CTA | ≈97 ("Book en prøvetur", øverst, fuld bredde, 42 px) | ≈810 (fast bjælke ≈772–844, knap 48 px) | ≈330 ("Book en prøvetur" i højre spalte) | ≈259 ("Se annoncen hos Gul og Gratis" i højre spalte) |
| Varsel/banner FØR fotoet (højde) | 0 px varsel (CTA-blok 76–165 = ≈90 px er handling, ikke forbehold) | **≈112 px** grå stiplet `.external-detail-flag` (118–230) + brødkrumme | 0 px (men ≈190 px tom annonceplads over headeren) | **≈65 px** `.external-detail-flag` (130–195) i fuld spaltebredde |
| Pris over folden? | ja (743 < 844) | ja (722 < 772) | **nej** (978 > 850) | **lige akkurat** (tallets overkant ≈820, underkant ≈850) |
| Kørekort / år / km / ccm over folden? | (n/a — detaljer ≈1090+) | **nej**: kørekortpanel ≈765 (skjult af bjælken), nøgletal ≈990–1140 | (n/a — detaljer ≈1087+) | **nej**: kørekort ≈880–1000, nøgletal ≈1027–1110 |
| Højre spalte, top→bund | — | — | Sammenlign · Print · Anmeld (≈286) → **Book prøvetur / Skriv til sælger / Vis telefonnummer** (311–446) → forhandlerkort: logo, navn, "Se forhandlerens 46 annoncer", adresse, hjemmeside, CVR (463–785) → Finansiering m. månedlig ydelse (800–1260) → Sammenlign tilbud/Forsikre (1275–1420) → Byttehandel (nummerplade-formular, 1445–1735) → Om KT-S (1750–2350) | "DU KØBER AF / Gul og Gratis / guloggratis.dk" (155–215) → **Se annoncen hos Gul og Gratis** (236–283) → 5 linjers forklaring (300–420) → "hentet 20. aug. 2026" (458) → "kontaktoplysninger står på deres egen side" (500–520) → kort slut ≈553 → "Søg videre på Bikerbasen": 4 grå links (570–805) → **tomt** (spalten er sticky, så det er fint på rul, men der er intet mere at give) |

---

## 3. Findings

| ID | severity | fil | problem (måling) | hvad Bilbasen gør | forslag (konkret, inden for reglerne) | status |
|---|---|---|---|---|---|---|
| D5-A1 | P1 | `js/annonce.js:651-657` (`.external-detail-flag` i `renderExternalListing()`), `css/styles.css:1634-1642` | **Det første, køberen ser, er 112 px forbehold.** På 390 står `.external-detail-flag` fra ≈118 til ≈230: to fede linjer ("Annoncen ligger på Gul og Gratis, guloggratis.dk.") og to linjer forklaring ("Gul og Gratis er en markedsplads, og du køber af sælgeren bag annoncen."). Fotoet begynder derfor ved ≈253, 40 px senere end Bilbasens — som har tre knapper foran sit. På desktop fylder kassen ≈65 px i fuld spaltebredde (130–195), mens den samme oplysning står **tre gange til** i højre spalte 20 px derfra ("DU KØBER AF Gul og Gratis", brødteksten "Gul og Gratis er en markedsplads, og motorcyklen står hos sælgeren. Du handler med sælgeren bag annoncen, ikke med Gul og Gratis…", og "Gul og Gratiss kontaktoplysninger … står på deres egen side"). Fire formuleringer af samme sætning, inden prisen er nået. Det er ikke ærlighed, det er gentagelse — og gentagelsen koster præcis den højde, kørekortet mangler (D5-A2). | Bilbasen sætter *hvem* i brødkrummen og forhandlerkortet og bruger ingen plads over fotoet på at sige, hvad siden ikke er. (`bilbasen-vdp-m.png` 76–213, `-d.png` 286–311.) | Behold flaget — det er det eneste ærlighedssignal over folden på mobil, hvor kildekortet ligger ved ≈2390 — men gør det til **én linje, ≤ 40 px**: `${Icon.store} Annonce hos <b>Gul og Gratis</b> · du køber af sælgeren bag den`. Anden sætning (`hvemKoeberDuAf`) går ud af flaget; den står allerede ordret i `.external-detail-source-body`. CSS: `.external-detail-flag{ padding:8px var(--space-3); font-size:13px; margin-bottom: var(--space-3); }` og `white-space:nowrap; overflow:hidden; text-overflow:ellipsis` på `span`'en under 560 px. **På ≥960 px: `.external-detail-flag{ display:none }`** — højre spalte siger det samme 20 px til højre, med knappen under. Nettogevinst: ≈72 px på mobil, ≈85 px (inkl. margin) på desktop, og brødkrummen "Forside › Honda › NT 1100 A" + kildekortet dækker stadig "hvem" på begge. | åben |
| D5-A2 | P1 | `js/annonce.js:567-572` (`noegletal`), `:683-718` (rækkefølgen `header` → `koerekortPanel` (708) → `.external-detail-stats` (711)), `css/styles.css:1704-1712`, `:1734-1748`, `:1759-1780` | **Vores ene strukturelle fordel står under vores egen bjælke.** 390×844: pris ≈722 (ok), men kørekortpanelet begynder ≈765 og den faste CTA-bjælke dækker ≈772–844 — panelet er synligt som 7 px orange kant. Nøgletallene (Årgang 2023 · 1.100 ccm · 100 hk) står ≈990–1140, halvanden skærm nede. Desktop: kørekort ≈880–1000, nøgletal ≈1027–1110, begge under folden ved 850. Og rækkefølgen er forkert i sig selv: det 120 px høje forklaringspanel ("A har ingen effektgrænse og dækker hele lageret … Regnet ud fra 1.100 ccm og 100 hk og vejledende — en mc kan være en effektbegrænset udgave…") står FØR de tre tal, det regner på. Prisen har desuden en 12 px versal-etiket ("PRIS HOS GUL OG GRATIS", 18 px + margin) over sig, der på mobil koster en linje for at sige det, flaget og knappen allerede siger. | Bilbasen: titel ≈638 → variant → pris ≈743 som én linje ("Kontantpris … 44.900 kr.") → månedlig ydelse ≈775 → alt inden for 844. Etiketten står på linjen med tallet, ikke over det. (`bilbasen-vdp-m.png`.) | (1) **Kørekortet ind i nøgletalsgitteret som første celle**: `noegletal.unshift([Icon.license, 'Kørekort', kk ? `${kk} <small>vejl.</small>` : 'Kan ikke afgøres'])` — samme `.external-detail-stat`, og gitteret (`.external-detail-stats`) flyttes i markuppen op **lige under `.external-detail-price-block`**, FØR `koerekortPanel`. Panelet med regnestykket bliver stående, men under gitteret (det er forklaringen, ikke overskriften). (2) Etiketten på linje med tallet: `.external-detail-price-block{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}` og `.external-detail-price-label` efter tallet som "hos Gul og Gratis" (12 px) — sparer ≈18 px. (3) `figcaption` til én linje: `white-space:nowrap;overflow:hidden;text-overflow:ellipsis` — "Foto: Gul og Gratis · flere billeder i deres annonce" (sparer ≈16 px). Budget på 390 efter D5-A1 (−72) + (2) (−18) + (3) (−16): titel ≈522, pris ≈600, gitter ≈640–780 med 2 rækker (Kørekort · Årgang / Kubik · Effekt) — **kørekort, årgang, ccm, hk og pris på første skærm, over bjælken ved 772**. På 1366 med flaget skjult (−85) og `aspect-ratio:16/9` på `.external-detail-photo img` ≥700 px (−44 px): titel ≈600, pris ≈705, gitter ≈745–830. Efterprøv i browseren, ikke på papiret — de 10 px margin afgør det. | åben |
| D5-A3 | P2 | `js/annonce.js:614-648` (`kildeKort`), `css/styles.css:1817-1852` | **Højre spalte holder op med at svare efter knappen.** Under "Se annoncen hos Gul og Gratis" (236–283) står 120 px brødtekst i 13 px grå, to metalinjer, og så "Søg videre" som fire links i `font-size:14px`, `color` = brødtekst, uden chevron, uden tal — grafisk identiske med en punktopstilling. Ingen af de fire siger, hvad der venter bag dem. Datoen "Annoncen blev hentet 20. aug. 2026" står som fodnote (458) i stedet for som det friskhedssignal, den er. Sætningen "Pris og udstyr kan være ændret, siden vi hentede annoncen" står i spalten (≈395) OG som første punkt under "Før du kører derhen" (≈2120 mobil / ≈603 desktop) — samme advarsel to gange på samme side. | Bilbasens spalte er en liste over ting, køberen kan *gøre*, hver med ikon, link-farve og et tal: "Se forhandlerens 46 annoncer", "Kobbervej 16, 6000 Kolding", "Besøg forhandlerens hjemmeside". (`bilbasen-vdp-d.png` 463–785.) | (a) `.external-detail-source-body` ned til **to sætninger** (`hvorStaarDen` + `hvemHandlerDuMed`); "Pris og udstyr kan være ændret…" slettes her og bliver i "Før du kører derhen". (b) Datoen op under knappen som friskhed: `Hentet hos Gul og Gratis 20. aug. — for 3 dage siden` (dagsantallet er `Date.now() - indekseretFoerste`, ingen ny data). (c) `.external-detail-next a{ color: var(--color-primary); display:flex; justify-content:space-between }` + `Icon.chevronRight` + **et tal pr. link** fra `Store.getAllListings()`: "Alle Honda til salg · 41", "Motorcykler til A-kørekort · 212", "Motorcykler i Hovedstaden · 58". Tallene findes allerede lokalt (samme kilde som søgesidens tæller). Så læses spalten som fire veje videre, ikke som en kolofon. | åben |
| D5-A4 | P2 | `js/annonce.js:683` (`<header class="external-detail-head">`), `js/components.js:1178` (global `[data-compare-toggle]`-delegation), `:1002` (`openReportModal`), `js/annonce.js:1155-1165` (share-handler, kun i egen-gren) | **Ingen handlingsrække.** Den eksterne side har nul knapper ud over "Se annoncen hos …": ingen sammenlign (selvom `.card-compare` findes på de samme annoncers kort og toggles globalt via `[data-compare-toggle]`), ingen del (selvom `#share-listing-btn`-handleren med `navigator.share`/kopiér-link ligger 450 linjer nede i samme fil, kun for egne annoncer), ingen "meld fejl" (selvom `openReportModal('listing', …, id)` tager et vilkårligt `target_id` og tabellen ingen fremmednøgle har). En køber, der vil holde NT 1100'en op mod en Tracer 9, skal tilbage til søgesiden og finde kortet igen. | Bilbasen har "Sammenlign · Print · Anmeld" som en stille rad øverst til højre (≈286) og et hjerte på fotoet; på mobil er det en ⋮-menu ved brødkrummen (≈192). (`bilbasen-vdp-d.png`, `-m.png`.) | Ny `<div class="external-detail-actions">` i `external-detail-head`, højrestillet på ≥700 px, under titlen på mobil: `<button class="btn btn-ghost btn-sm" data-compare-toggle="${listing.id}" aria-pressed="…">${Icon.chart} Sammenlign</button>` (virker uden ny JS), `<button id="share-listing-btn">${Icon.share} Del</button>` (flyt handleren ud af `renderListing()` til en fælles `wireShare(titel, url)`), `<button class="report-link" id="report-listing-btn">${Icon.flag} Meld fejl i oplysningerne</button>` → `openReportModal('listing', fuldTitel, listing.id)` med forvalgt `reason:'andet'`. **Ingen favorit** (D-008 afvist, fremmednøglen). Samme knapper gentages ikke i den faste bjælke — den skal blive ved én handling. | åben |
| D5-A5 | P2 | `js/annonce.js:777-797` (`lignende`, 780-787), `js/components.js` `listingCardHTML()` | **"Lignende motorcykler" er ikke lignende.** Til en 2023 Honda NT 1100 A til 164.995 kr. viser striben: Honda CX 650 E **1983**, 20.000 kr.; Honda CBR 600 F **1993**, 20.000 kr.; Honda GL 1800 Gold Wing, **575.000 kr.** Algoritmen er `[...sammeMaerke, ...naerKubik].slice(0,3)` — mærket vinder over alt, og pris/årgang/type tæller nul. De tre kort er 88 %, 88 % og +250 % fra prisen. Oven i det: på mobil-optagelsen havde kort 2 og 3 en **≈300 px grå, tom billedflade** (ikke indlæst), og kortet siger "Annonce fra Gul og Gratis · Privat sælger" over et foto med "MC SYD"-facade og en titel med "MC-SYD 5 ÅRS GARANTI" — sælgertypen er mindst tvivlsom på to af tre. Striben er det sidste, køberen ser, før footeren, og den siger "vi har ikke rigtig noget". | Bilbasen: tre gange *samme model* (Roomster 2011–2014, 64.900–69.900 kr.), derefter samme klasse (MPV: 5008, 3008, Grand Scénic, C-Max, Berlingo) i 24.990–79.900 kr. omkring en pris på 44.900 — altså model → segment → prisbånd. (`bilbasen-vdp-m-full.png` ≈4400–7800.) | Score i stedet for rækkefølge, stadig kun med felter vi har: `+3` samme model, `+2` samme mærke, `+3` pris inden for ±40 %, `+2` ccm inden for ±35 %, `+1` årgang inden for ±6, `+2` samme `type`; sortér faldende, tag 3, **kræv score ≥ 4** (ellers skjul striben — tom er ærligere end 1983 mod 2023). Skriv reglen i overskriften så den læses som en hensigt: "Lignende: Honda · 700–1.500 ccm · 100–230 t.kr." (`overskrift.textContent`). Kortene: `loading="lazy"` på striben er rigtigt, men sæt `fetchpriority="low"` + behold `aspect-ratio`, og lad "Privat sælger"-pillen kun vises, når `isDealer === false` er sat af kilden (ikke når feltet mangler) — ellers "Sælger: ikke oplyst". | åben |
| D5-A6 | P3 | `js/annonce.js:602` (`raekke('Annonce-id hos …')`), `css/styles.css:1789-1797` | **En UUID i specs-tabellen.** Sidste række i "Detaljer" er "Annonce-id hos Gul og Gratis: 8f888ed0-3aaa-4ba6-a124-0ee7591cb3fb". På 390 ombryder etiketten til fire linjer ("Annonce-/id hos/Gul og/Gratis") og værdien til to (≈1590–1680 i fuldsiden) — en 90 px høj række med et tal, ingen køber kan bruge til noget, mellem "Sted" og forbeholdsnoten. På desktop er den 36 tegn bred i fed. Gul og Gratis' id'er er UUID'er; MC Syds er korte tal (fx 137963), hvor rækken giver mening at citere i telefonen. | Bilbasen viser intet internt id i "Detaljer" (≈1090–1600, `bilbasen-vdp-m-full.png`); annonce-nummeret står i URL'en. | Rækken kun når id'et er **≤ 12 tegn** (`listing.sourceListingId.length <= 12`) — ellers ud af tabellen og ned som 12 px `.external-detail-source-meta` i kildekortet: "Ref. hos Gul og Gratis: 8f888ed0…" med `title`-attributten på hele id'et. `.external-detail-row dt{ white-space:nowrap }` på ≥560 px, så ingen etiket nogensinde bliver fire linjer. | åben |
| D5-A7 | P3 | `css/styles.css:1552-1560` (`.listing-actionbar`), `annonce.html` (inline `byggBjaelke()`), `:1666-1671` (`figcaption`) | **Bjælken skjuler, men siger ikke, hvad den skjuler.** Den faste bjælke (≈772–844) er 72 px høj med én knap på 48 px — 24 px luft — og dækker på første skærm kørekortpanelets overkant. Ingen "scroll-hint", ingen pris i bjælken. Bilbasen løser det ved at lægge handlingerne øverst og lade indholdet stå frit nedenunder; vi valgte sticky (rigtigt — deres knapper forsvinder ved rul), men bjælken bærer ingen oplysning med ned gennem 5.900 px side. Efter D5-A2 ligger kørekortet over bjælken, men på en annonce UDEN pris/kørekort rammer samme problem igen, bare for nøgletallene. | Bilbasens mobilbjælke (uden for optagelsen, kendt adfærd) gentager pris + "Skriv til sælger"; i optagelsen ses princippet i deres topblok: 3 handlinger, 90 px, ingen luft. (`bilbasen-vdp-m.png` 76–165.) | Gør bjælken til **pris + knap**: i `byggBjaelke()` tilføj `<span class="listing-actionbar-pris">164.995 kr. <small>hos Gul og Gratis</small></span>` læst fra `.external-detail-price` (findes allerede i DOM'en, når bjælken bygges), og `.listing-actionbar{padding:8px 16px calc(8px + env(safe-area-inset-bottom))}` (−4 px). Vis bjælken først, når `.external-detail-price-block` er rullet ud af viewporten (`IntersectionObserver` på blokken → `bar.hidden = entry.isIntersecting`), så første skærm er fri, og prisen følger med fra anden skærm. Det er ét observer-kald i det script, der allerede bor i `annonce.html`. | åben |

---

## 4. Kopiér IKKE fra Bilbasen

| Bilbasen-element | hvorfor ikke |
|---|---|
| **"Book en prøvetur" / "Skriv til sælger" / "Ring op"** øverst (mobil 76–165, desktop 311–446) | Vi gemmer ingen kontaktoplysninger (`CLAUDE.md` regel 2) og har ingen relation til sælgeren bag en Gul og Gratis-annonce. En knap, der hedder "Skriv til sælger" og åbner guloggratis.dk, er en løgn i knapstørrelse — vores ene knap siger, hvad den gør. |
| **Finansiering / "Månedlig ydelse 921 kr." (Lendo)** (mobil 775–840, desktop 800–1260) | Ingen partner, og en ydelse regnet på en pris, vi selv skriver "kan være ændret, siden vi hentede annoncen", er et løfte på en andens tal. Det er præcis den slags afledt påstand, "Ærlighed slår fuldstændighed" blev skrevet imod. |
| **Stjerner "4,4 · 58 anmeldelser"** under titlen (mobil ≈703, desktop ≈1015) | Vi har ingen anmeldelser af tredjepartssælgere, og et stjernegennemsnit, der ikke kan udledes, var en af de tre fejl, der kostede tillidskategorien hos tre blinde kritikere (DECISIONS, "Ærlighed slår fuldstændighed"). |
| **Billedstribe "+11"** under hovedfotoet (mobil 513–605, desktop 800–915) | Ét thumbnail, ingen gallerier — "Kilden ejer sine billeder" (låst). En stribe med ét billede og "+0" er værre end ingen stribe; figcaptionen "Flere billeder … i deres annonce" ER vores stribe. |
| **Byttehandel: "Indtast nummerplade / Vurder min bil"** (mobil 1290–1560, desktop 1445–1735) | Ingen værdiansættelsesdata, og en formular, der samler nummerplader ind uden et formål, er persondata uden grund. Giver også nul for en køber, der er sendt videre til en anden side. |
| **Den tomme 190 px annonceplads over headeren** (desktop 0–190) | Bilbasen betaler for den med, at titel og pris ligger under folden på 1366×850. Det er det ene sted, vi i dag slår dem på desktop — behold det. |

---

## 5. Den ene ændring

**Flaget til én linje, og nøgletalsgitteret — med Kørekort A som første celle — flyttet op lige under prisen, foran forklaringspanelet (D5-A1 + D5-A2):** så står pris, kørekort, årgang, ccm og hk på første skærm på både 390 og 1366, over vores egen bjælke, og siden åbner med et svar i stedet for et forbehold.
