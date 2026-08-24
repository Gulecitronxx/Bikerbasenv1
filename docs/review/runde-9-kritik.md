# Runde 9 — blind efterprøvning af runde 8 mod Bilbasen.dk (AUDIT ONLY)

Ingen kodeændringer. Denne fil er det eneste, runden har skrevet.

Rollen er marketplace-UX-kritiker. Sæt A er Bilbasen.dk (`work/runde5/bilbasen-*`,
mærkesiden i `work/runde5/efter2/`). Sæt B er Bikerbasen.dk LIVE efter runde 8 +
D8-M3 + telefon-RPC (`work/runde9/bikerbasen-*`, optaget 24.08.2026 kl. 16:31–16:32,
med rul så lazy-billeder er hentet; `bikerbasen-srp-side2-*` er sideinddelingens
side 2). `work/runde5/efter3/` (runde 8-før) er kun brugt til udvikling.

Læst først: `CLAUDE.md` (aggregator, alt sandt, 541 viste / 548 rå annoncer fra
4 kilder, 0 egne, regel 1–6), `docs/review/DECISIONS.md` (D6-S4, D7-F2, D7-A5,
O3-1b telefon-samtykke — ingen af dem efterprøves om), `work/DECISIONS.md`,
`docs/review/runde-8-kritik.md` og `docs/review/BACKLOG.md` (runde 8) — de to
sidste som påstande, der skal efterprøves på B-billederne, ikke som facit.

**Én ting øverst, for den farver stadig alt: lageret er nu 4–8 dage gammelt.**
Målt via REST med sitets egen offentlige nøgle, 24.08: MC Syd 332 annoncer
`sidst_set` **16.08 (8 dage, 61 % af lageret)**; Gul og Gratis 118 fra
19.–20.08; Rydbergs 74 og Jensens 24 fra 20.08. Ingen kørsel siden 20.08.
`.github/workflows/crawl.yml` findes nu med nat-cron og fejler kontrolleret
uden nøglen — **den venter alene på repo-secret `SUPABASE_SERVICE_ROLE_KEY`,
og den kan kun mennesket sætte.** Annoncesiden siger det ærligt selv: "sidst
bekræftet for **8 dage siden**" (B-vdp-d 303–322). Det tal vokser med én hver
dag, nogen ikke sætter nøglen.

---

## 0. Sådan er der målt

Billeder læst som billeder (Read; fuldsider skåret i striber med PIL) og målt
med PIL/numpy: brand-farvede rækker (Bilbasen `#FF4D00`, Bikerbasen `#C6420E`,
tolerance 18) for primære knapper; baggrundsafvigelse (>60 sum-diff mod
`#F7F5F2`) for indholdsudstrækning pr. spalte; billedbredde for vandret
overløb; sidste lyse tekstrække i footeren mod dokumentbunden for tomrum.
"≈" hvor aflæst i udsnit (±6 px). Viewports 390×844 og 1366×850; Bilbasens
fuldsider er 1 463–1 495 px brede (takeover).

Målt uden for billederne (kun læsning, ingen klik med sideeffekt):
(1) `sidst_set` pr. kilde + Honda-facettal via REST med anon-nøglen;
(2) kode/byggede sider: `js/search.js`, `js/mine-annoncer.js`,
`js/backend-bridge.js`, `js/home.js`, `css/styles.css`, `soegning.html`,
`annonce.html`, `index.html`, `maerke-honda.html`,
`scripts/build-brand-pages.js`, `.github/workflows/crawl.yml`.

Måleartefakter, der ikke er dømt som design: (a) Bilbasens mærkeside ligger
under deres cookie-modal i begge viewports — dømt på det, der ligger under.
(b) Bikerbasens footer er sort flade i SRP-fuldsiderne
(`content-visibility:auto`, kendt fra runde 8; pladsholderen er nu 860 px,
D8-S7). (c) I SRP-desktop-fuldsiden mangler filterpanelets Pris/Type-sektioner
— se D9-S1, kan være en optageartefakt.

---

## 1. Blind dom pr. side og skærm

Afsagt på billederne, før kode blev åbnet. "Tæt på" er ikke en dom.

| Side / skærm | Vinder | Hvorfor — det, en blind dommer ser først |
|---|---|---|
| **Forside, mobil** | **Bikerbasen, klart** (runde 8: snævert) | Første skærm: foto-hero, sand underrubrik, fire søgefelter, CTA **655–706** mod 674–717. Første kort ≈1 155 mod ≈1 530. De kompakte kort har nu **to hele titellinjer med ellipse** ("Harley-Davidson / FLHTCUI Electra…") — runde 8's klippede titler uden ellipse er væk, og kilderne i de 8 kort er 4 MC Syd · 2 GG · 1 Rydbergs · 1 Triumph/GG = **4 af 8 = løftet "højst halvdelen" holdt**. Det, der før holdt dommen på "snævert", er rettet. Bilbasen har stadig ≈30 kort mod 8 — det er nu deres eneste tilbageværende argument. |
| **Forside, desktop** | **Bikerbasen, klart** (uændret) | Bilbasen: OK-ladeboks-takeover, formular klemt i midten, CTA 622–665. Os: h1, sandt tal, tre felter + kørekortvælger, CTA **≈577–628**, chips, tryghedslinjer, motorcykel. Første kort ≈930 mod ≈1 200. 6 kort = **3 MC Syd · 3 GG = 50 %** — underrubrikken "højst halvdelen fra samme kilde" er nu SAND på begge skærme (runde 8: 67 % og falsk). Mærkechips i 5 spalter, "Harley-Davidson · 72" og "Royal Enfield · 7" hele. 0 px tomrum under footeren i denne optagelse (runde 8: 454). |
| **Søgning (SRP), mobil** | **Bikerbasen, klart** (runde 8: snævert) | h1 hedder nu **"Motorcykler til salg i Danmark"** — runde 8's "Brugte" over 172 fabriksnye er væk, og det var det, der kostede "klart". Første kort ≈280 mod 284, første pris ≈525 mod 684, 1,9 kort pr. skærm mod 1,1. Bilbasens kort bærer logo/galleriprikker/video/hjerte — aktiver, regel 2 forbyder. Rest: "(Eurosport)" i undertitel-slotten (D8-S4, åben). |
| **Søgning (SRP), desktop** | **Bikerbasen, klart** (uændret) | Første kort 323 mod 527; Mærke først med tal, Kørekort med tal og "Hvorfor er A hele lageret?"; kildelinjen 332+111+98 = 541; ingen Polestar-tapet, ingen modal. Sideinddelingen er nu **rigtige `<a href>`** med "Side 1 af 23", og side 2-billederne beviser, at den virker og endda siger "Blandet udbud: 7 uden foto fordelt jævnt — 1 på denne side". Trækker fra: venstre spalte er tom fra ≈940 ned til SEO-sektionerne (D9-S1). |
| **Annonce (VDP), mobil** | **Bikerbasen, klart** (uændret) | Kildeflag 118–156 → foto 182–445 → titel 516 → pris 616 → CTA **695–743** → nøgletallenes første række under folden-kanten. Bilbasen: tre knapper FØR bilen, "4,4 · 58 anmeldelser", Lendo-ydelse ved prisen. Rest hos os: kilden nævnt 5 gange i 844 px (D8-A2, åben) og "sidst bekræftet for **8** dage siden" — sandt og pinligt (D8-F2). |
| **Annonce (VDP), desktop** | **Bikerbasen, klart** (uændret) | CTA **236–283** mod 311–350; titel 557, pris 672, alle fem nøgletal over folden; "Du køber af MC Syd" + "Søg videre" med fem sande tal (332 · 256 · 541 · 348 · 541). "Beskrivelse"-h2'en over et fravær er væk — sætningen står nu som linje i "Før du kører derhen" (D8-A3 lukket). Bilbasen: bil ved 311, pris ≈978, spalten er Lendo/forsikring. |
| **Mærkeside (Honda), mobil** | **Bilbasen, snævert** (runde 8: klart) | Vandret rul er VÆK (fuldside 390 px; runde 8: 440) og siden har nu kørekort/pris/type-facetter med tal + sortérlinks. Men de fire rækker koster: første kort **≈890** (runde 8: 630; mål ≤620; Bilbasen ≈282 under modalen). Facetchips klippes i kanten ("Unde…") uden rul-affordance. Bilbasens mærkeside er stadig en fuld SRP med filtre, sortering og "Side 1 af 5" — men afstanden er nu funktionel lille og visuelt et spørgsmål om, hvor varerne begynder. |
| **Mærkeside (Honda), desktop** | **Bikerbasen, snævert** (runde 8: snævert tabt — **dommen er vendt**) | Det, der afgjorde runde 8 ("deres side kan bruges som en søgning, vores skal forlades"), er halvt væk: kørekort-, pris- og typefacetter med tal + tre sortérlinks står over gitteret, alle som crawlbare adresser ind i søgningen, og "Honda på A2" er nu ét klik. Overskrift og "Alle 256 i søgningen" står på én række; tallene er efterprøvet (afsnit 3, D8-M3). Bilbasen vinder stadig på kombinationer (A2 OG under 60.000 i samme visning) og på første kort (≈527 mod **≈835**) — derfor kun snævert, og D9-M1 er prisen, der skal betales tilbage. |

**Samlet: 7–1 til Bikerbasen — stillingen HAR flyttet sig fra runde 8's 6–2.**
Mærkesiden desktop er vendt fra snævert tabt til snævert vundet (facetlinks +
sand overskriftsrække), og tre af de vundne sider er gået fra "snævert" til
"klart", fordi runde 8's falske påstande (halvdelen-løftet, "Brugte" over nye)
er væk. Mærkesiden mobil tabes stadig — nu snævert, på ét tal: første kort
≈890 mod ≈282. Det eneste, der trækker den anden vej på tværs af alle otte
domme, er friskheden: "8 dage siden" står på hver eneste annonce.

---

## 2. Pixelfakta (A = Bilbasen, B = Bikerbasen efter runde 8 + D8-M3)

### Forside

| | A 390 | B 390 | A 1366 | B 1366 |
|---|---|---|---|---|
| Primær CTA (y) | 674–717 | **655–706** | 622–665 | **≈577–628** |
| Første annoncekort (y) | ≈1 530 | **≈1 155** | ≈1 200 | **≈930** |
| Kort under hero'en | ≈30 | 8 kompakte | ≈28 | 6 |
| Kilder bag kortene | blandet | **4 MC Syd · 3 GG · 1 Rydbergs = 50 %** ✓ | blandet | **3 MC Syd · 3 GG = 50 %** ✓ (runde 8: 67 % og falsk) |
| Titel klippet uden ellipse | — | **0 af 8** (runde 8: 3 af 8) — to linjer + ellipse | — | 0 af 6 |
| Mærkechips klippet | — | — | — | **0** (runde 8: "Harley-Da…", "Royal Enfi…"); 5 pr. række |
| Tomrum under footer | 0 | 0 | 0 | **0** i denne optagelse (runde 8: 454; sidste tekst 5 412, dok 5 435) |
| Sidehøjde | 7 589 | 7 458 | 4 384 | 5 435 |

### Søgeside

| | A 390 | B 390 | A 1366 | B 1366 |
|---|---|---|---|---|
| h1 | ingen | **"Motorcykler til salg i Danmark"** (runde 8: "Brugte …") | ingen | samme |
| Første kort (y) | 284 | ≈280 | 527 | **323** |
| Sideinddeling | URL-adresser | **`<a href>` "‹ 1 2 3 4 … 23 ›" + "Side 1 af 23"** | samme | samme |
| Side 2 virker | — | ✓ (`srp-side2-m`: nye kort, "… — 1 på denne side") | — | ✓ |
| Filterpanel i fuldside | modal | skuffe (ikke optaget i runde 9) | modal | Mærke + Kørekort; **Pris/Type mangler i optagelsen** (D9-S1) |
| Sidehøjde | 17 647 | 12 470 | 6 540 | 5 114 |

### Annonceside

| | A 390 | B 390 | A 1366 | B 1366 |
|---|---|---|---|---|
| Primær CTA (y) | 77–116 | **695–743** | 311–350 | **236–283** |
| Titel / pris | 638 / 743 | **516 / 616** | ≈950 / ≈978 | **557 / 672** |
| Nøgletal over folden | ≈1 090+ | række 1 (Kørekort · Årgang) | — | **5 af 5** |
| Kilden nævnt i første skærm | logo + 3 knapper | **5×** (uændret — D8-A2) | logo + KT-S | 3× |
| Friskhed | ingen dato | "sidst bekræftet for **8 dage siden**" | ingen | samme |
| "Beskrivelse"-h2 over fravær | — | **væk** (linje i "Før du kører derhen") | — | samme |
| Sidehøjde | 7 845 | 6 040 | 5 194 | 3 288 |

### Mærkeside (Honda)

| | A 390 | B 390 | A 1366 | B 1366 |
|---|---|---|---|---|
| Vandret overløb | 0 | **0** (runde 8: +50 px) | 0 | 0 |
| Facetter / sortering | fulde filtre | **KØREKORT · PRIS · TYPE med tal + SORTÉR ×3** (links) | fulde filtre + "Side 1 af 5" | samme |
| Første kort (y) | ≈282 | **≈890** (runde 8: 630 — facetrækkerne kostede ≈260 px) | ≈527 | **≈835** (runde 8: 589) |
| Modelchips | uden tal | **"GL 1800 Gold Wing · 18" osv.** | — | samme |
| Overskrift + "Alle 256" | — | stacket | — | **én række** |
| Sidehøjde | 18 987 | 14 876 | 6 818 | 6 301 |

---

## 3. Runde 8's findings — én for én, med bevis

| ID | Status | Bevis |
|---|---|---|
| D8-F1 halvdelen-løftet falsk på desktop | **lukket** | Talt på billederne: 1366 → 6 kort = 3 MC Syd (Honda CB, Kawasaki ZR-7, Aprilia) · 3 GG (Suzuki, Yamaha, Triumph) = 50 %; 390 → 8 kort = 4 MC Syd · 4 andre. Underrubrikken siger nu også antallet ærligt: "Seks/8 af de 527 annoncer med foto og modelnavn". |
| D8-F2 "lige nu" på gamle data / ingen cron | **delvist — resten KRÆVER MENNESKET** | (1) Drift: `.github/workflows/crawl.yml` findes, cron `0 3 * * *`, springer kontrolleret over uden `SUPABASE_SERVICE_ROLE_KEY` — secret'en er ikke sat: REST 24.08 viser MC Syd `sidst_set` 16.08 (8 dage), ingen kørsel siden 20.08. (2) Tekst: "lige nu" er væk fra forsidens og mærkesidens intro ✓, men `build-brand-pages.js:842` skriver stadig "**256 annoncer til salg nu**" på alle 26 mærkesider, og "senest opdateret {dato}"-linjen findes ingen steder (grep: 0 træf på "senest opdateret" i js/, scripts/, *.html). VDP'ens "for 8 dage siden" er sitets eneste dato — og den tæller opad. |
| D8-F3 kompakt titel klippet uden ellipse | **lukket** | `B-fors-m-full` y≈2 270: "Harley-Davidson / FLHTCUI Electra…" — to rigtige linjer MED ellipse; "Honda CB 1000 Hornet" og "Suzuki Gs katana 650 cc" ombryder helt. 0 af 8 klippet. |
| D8-F4 mærkechips "Harley-Da…" | **lukket** | `B-fors-d-full` y≈2 690–2 960: 5 chips pr. række, "Harley-Davidson · 72", "Royal Enfield · 7" hele. 0 ellipser. |
| D8-F5 tomrum under footeren (cookie-var) | **ikke reproduceret — mekanismen urørt** | Denne optagelse: sidste tekstrække 5 412, dokument 5 435 → **0 px tomrum** (runde 8: 454). Men koden er uændret (`css/styles.css:179` `body:has(...){padding-bottom:var(--cookie-h)}`; `js/components.js:1107`), så fundet er ikke *lukket* — det udeblev under disse optagevilkår. Sticky-refaktoren fra runde 8-fixet står stadig som den rigtige lukning, P3. |
| D8-F6 "brugte" i title/tagline; footer uden om-links | **delvist** | Title ("Bikerbasen — motorcykler til salg i Danmark, nye og brugte") ✓, footer-tagline omskrevet ✓, "Om Bikerbasen" + "Om indekseringen" i footeren (index.html:494–495) ✓. MEN `index.html:9/19` meta/og:description siger stadig "samler **brugte** motorcykler … og **egne annoncer**" (0 egne, 172/548 nye), og JSON-LD `WebSite.description` (`index.html:67`) siger stadig "Danmarks mødested for køb og salg af **brugte** motorcykler" → D9-F1. |
| D8-S1 SRP "Brugte" over 172 nye | **lukket** | `soegning.html:13` title "Motorcykler til salg — nye og brugte", `:306` h1 "Motorcykler til salg i Danmark"; description uden "brugte" som eneste kategori. Billedet bekræfter h1'en i begge viewports. |
| D8-S2 sideinddeling = knapper + replaceState | **lukket** | `js/search.js:1797/1801`: `<a … href="${sideHref(n)}" data-page>`; klik går gennem `pushFilterState`. Billeder: "‹ 1 2 3 4 … 23 ›" + "Side 1 af 23" (`B-srp-d-full` y≈3 945), og `srp-side2-{m,d}` viser side 2 med andre kort og linjen "Blandet udbud: 7 uden foto fordelt jævnt — 1 på denne side". |
| D8-S3 søgeagenten talte aldrig nye | **lukket (kode)** | `js/mine-annoncer.js:217`: `new Date(l.indekseretFoerste \|\| l.createdAt \|\| 0)` — tæller fra `foerst_set`, som findes på alle 541. Ikke synligt i billederne (kræver login). |
| D8-S4 undertitel-slot skifter betydning | **ikke lukket** | `B-srp-d` kort 2: "(Eurosport)" med parenteser; `B-fors-m-full`: "virago" med småt. Slotten er stadig snart type, snart rå variant. |
| D8-S5 model-rest (årstal/cc/småt) | **ikke lukket** | "Suzuki Gs katana **650 cc**" (forside + SRP), "Honda **vf750f**" (`B-maerke-d-full` kort 4) med "1983 · **59 km**" stadig uden forbehold. |
| D8-S6 "Nulstil" ×2 i skuffen | **ikke lukket** | Kode uændret: `soegning.html:323` (panelhoved) og `:566` (skuffefod) — begge hedder "Nulstil", ingen CSS skjuler hovedets i skuffetilstand. Ingen skuffe-optagelse i runde 9 til at se det. |
| D8-S7 footer-pladsholder 1 014 px | **lukket** | `soegning.html:76`: `contain-intrinsic-size:auto 860px` (<768). Den sorte flade i `B-srp-m-full` er ≈945 px inkl. margen — inden for ≈90 px af det reelle, mod ≈160 før. |
| D8-A1 delte links lovede billeder/kontakt | **lukket** | `annonce.html:8–26`: title "Annonce — Bikerbasen", description "Pris, årgang, km, ccm og kørekortkategori … handlen sker hos kilden"-formen, og:image = generisk og-image.png. Ingen "billeder", ingen "kontaktoplysninger", ingen "brugt" — nær én rest: `og:image:alt` (`:23`) siger stadig "køb og sælg brugte motorcykler" → D9-A1. |
| D8-A2 kilden ×5 på mobil-førsteskærm | **ikke lukket** | `B-vdp-m`: flag 118–156, fototekst ≈478, "hos MC Syd" ved prisen 616, "Forhandlerannonce" 585, CTA 695–743 — fem omtaler i 844 px, uændret fra runde 8. |
| D8-A3 h2 "Beskrivelse" over et fravær | **lukket** | `B-vdp-m-full` y≈2 430: sætningen "Beskrivelse, udstyrsliste og flere billeder står i MC Syds egen annonce — teksten er deres, og vi gemmer den ikke her" er nu en (i)-linje i "Før du kører derhen". Ingen Beskrivelse-h2 på siden. |
| D8-M1 vandret rul på mærkesiden | **lukket** | `B-maerke-m-full` er **390 px** bred (runde 8: 440). PIL-målt på hele fuldsiden; 0 indhold uden for 390. |
| D8-M2 luft + første kort ≥630 | **delvist — og målet er flyttet den forkerte vej** | Luften chips→overskrift er væk, overskrift og "Alle 256 i søgningen" står på én række (desktop) ✓. Men D8-M3's facetrækker har skubbet første kort til **≈890 (390) / ≈835 (1366)** mod runde 8's 630/589 og målet ≤620. "256" står stadig tre gange før første kort. → D9-M1. |
| D8-M3 mærkesiden uden søgningens håndtag | **lukket — og tallene stemmer** | Billede: KØREKORT A1·10 A2·29 A·256; PRIS <30.000·12 <60.000·33 <100.000·90; TYPE Adventure/Enduro·52 Cruiser·39 Naked·38 Touring·31 Sport·10 Classic/Veteran·2; SORTÉR ×3. Hrefs efterprøvet i `maerke-honda.html`: `soegning.html?brands=Honda&koerekort=A1` osv. — søgesidens rigtige filterkæde. Tal efterprøvet mod REST 24.08 (Honda rå 262, viste 256 efter D7-F2-dubletter): pris 13/34/92 rå → 12/33/90 viste (−6 dubletter, konsistent); type-mapping præcis: Adventure 36 + Offroader 16 = 52, Street 38 = Naked, Touring 20 + Sportstouring 11 = 31, Cruiser 39, Sport 10, Klassiker 2 ✓; 165 "ny" ✓ = intro'ens "165 fabriksnye"; 91 + 165 = 256 ✓. |
| D8-M4 "til salg på Bikerbasen" / "lige nu" | **delvist** | Intro'en er omskrevet efter opskriften: "Der er 256 Honda motorcykler til salg hos danske forhandlere og markedspladser, indekseret på Bikerbasen — 91 brugte og 165 fabriksnye — fra 4.000 kr." ✓. Men "Senest opdateret {dato}" mangler (delen, der kræver D8-F2's dataløsning), og h2'ens "til salg **nu**" står (D9-M2). |
| D8-M5 modelchips uden tal | **lukket** | "GL 1800 Gold Wing · 18", "CRF 1100 L Africa · 17" … "NC 750 X · 6" — 12 chips, alle med tal, samme komponent som "Andre mærker". |

**Tælling: 12 lukket (F1, F3, F4, S1, S2, S3, S7, A1, A3, M1, M3, M5),
4 delvist (F2, F6, M2, M4), 4 ikke lukket (S4, S5, S6, A2),
1 ikke reproduceret (F5).** Af de fire delvise kræver F2's kerne mennesket
(repo-secret); resten er små tekststrenge. De fire åbne er alle P3-kosmetik
på nær A2 (P3-grænseland: ≈50 px førsteskærm på VDP-mobil).

---

## 4. Nye findings — runde 9

Severity: P1 = falsk/udokumenteret påstand eller brudt funktion; P2 = mærkbar
forskel til Bilbasen med konkret konsekvens; P3 = kosmetik. Vi er dybt i halen:
**ingen P1 tilbage på nogen side** — det er første runde, det kan skrives.

### Forside

| ID | Sev. | Fil / selector | Måling | Konkret fix |
|---|---|---|---|---|
| **D9-F1** | **P2** | `index.html:9` (meta description), `:19` (og:description), `:67` (JSON-LD `WebSite.description`) | Sidens synlige tekster blev gjort sande i runde 8 — men de tre maskinlæsbare siger stadig "samler **brugte** motorcykler … fra forhandlere, markedspladser og **egne annoncer**" og "Danmarks **mødested** for køb og salg af **brugte** motorcykler". 172 af 548 rå rækker er fabriksnye; egne annoncer: 0. Det er Google-snippet og delingskortet — de mest læste sætninger, sitet har. | Samme sandhed som footer-taglinen: "Motorcykler til salg fra danske forhandlere og markedspladser — nye og brugte, samlet ét sted. Kilden står på hvert kort." i alle tre felter. Én fil, tre strenge. |
| **D9-F2** | P3 | `index.html` hero-hurtigchips; `css/styles.css` chip-rækken | 390: chip 2 klippes ved skærmkanten ("Under 50.000 k…") — rækken ruller vandret, men intet viser det (ingen scrollbar, ingen fade). Samme mønster som D9-M4. | Fade-kant (`mask-image: linear-gradient`) på rullerækker, eller kortere chiptekster ("A2 · <60.000", "<50.000") så to chips står helt. |
| **D9-F3** | P3 | `js/home.js` kompaktkort (390-udgaven) | Mobilkortets fodnote viser kun domænet ("mcsyd.dk"); desktop viser "Rødding · Forhandler · mcsyd.dk". Byen er oplyst data på alle otte og en købsfaktor på en mc (afhentning). | Tag byen med på mobilkortet, når den findes: "Rødding · mcsyd.dk". Koster én tekstlinje, 0 px (linjen findes allerede). |

### Søgeside

| ID | Sev. | Fil / selector | Måling | Konkret fix |
|---|---|---|---|---|
| **D9-S1** | P3 (P2 hvis ægte) | `soegning.html:387/420` (Pris- og Type-sektionerne), filterpanelet | I `B-srp-d-full` slutter filterpanelet ved y≈940 — **Pris og Type mangler helt** i optagelsen (kun Mærke + Kørekort + "Hvorfor er A hele lageret?"), og venstre spalte står tom fra ≈940 til SEO-sektionerne ved ≈3 950 (≈3 000 px). Viewport-optagelsen når ikke langt nok ned til at afgøre, om det er en optageartefakt (lukkede `<details>`/hydreringsrækkefølge) eller ægte. | Efterprøv i browser: er Pris/Type synlige på en ren indlæsning ved 1366? Hvis ja: kun tomrums-delen består — gør panelet sticky (samme to-lags mønster som `.listing-aside`/`.listing-aside-inner`, der allerede virker på VDP). Hvis nej: hydreringshul, P2. |
| **D9-S2** | P3 | `js/search.js` tallinjen; `renderPagination` | På side 2 siger intet over folden, at man står på side 2: "541 annoncer fundet" og h1 er identiske med side 1 ("Side 2 af 23" står kun ved sideinddelingen i bunden). Tilbage-knappen virker nu (D8-S2), så orienteringstabet er lille — men en delt `?page=7`-adresse åbner midt i lageret uden forklaring. | "541 annoncer fundet · side 2 af 23" i tallinjen, når `state.page > 1`, og samme i `document.title`. To strenge. |
| **D9-S3** | P3 | `soegning.html` klokke-ikonknappen ved søgefeltet (390) | Mobil: knappen mellem søgefelt og "Filtre" er kun et klokkeikon — desktop-udgaven hedder "Gem søgning". Ikon uden etiket for sitets eneste agent-funktion. | `aria-label` er ikke nok for seende: enten teksten "Gem" ved siden af ikonet, eller flyt "Gem søgning" ind i filterskuffens fod, hvor der er plads. |

Søgesiden er derudover **færdig nok**: resterne er D8-S4/S5/S6, alle P3-tekst
og -kosmetik. Endnu en hel SRP-runde giver aftagende udbytte.

### Annonceside

| ID | Sev. | Fil / selector | Måling | Konkret fix |
|---|---|---|---|---|
| **D9-A1** | P3 | `annonce.html:23` (`og:image:alt`); samme streng i `index.html`s og:image:alt | "Bikerbasen — køb og sælg **brugte** motorcykler i Danmark" — sidste rest af "brugte"-familien (D8-A1/F6), læses op af skærmlæsere på delingskortet. | "Bikerbasen — motorcykler til salg i Danmark, samlet fra danske forhandlere og markedspladser." Samme streng begge steder. |
| **D9-A2** | P3 | `js/annonce.js` nøgletalsgitteret + "Detaljer"-tabellen | Årgang, Kilometer, Kubik, Effekt og Kørekort står ordret to gange med ≈400 px mellemrum (gitteret ≈790–850, tabellen ≈1 290–1 470 på 1366): tolv tabelrækker, hvoraf fem er gentagelser. Bilbasen har én specifikationstabel. | Lad Detaljer-tabellen starte ved de felter, gitteret ikke har (Type, Stand, Salgsvilkår, Sælger, Sted, Annonce-id) — siden bliver ≈250 px kortere, og ingen oplysning forsvinder. |
| **D9-A3** | P3 | `js/annonce.js` `.external-detail-head` (D8-A2's flag) | Gentagelse med ny måling: skjules flaget "Annonce hos MC Syd — det er dem, du køber af" på <960 (CTA'en og "hos MC Syd" ved prisen bærer samme besked), rykker alt ≈50 px op, og nøgletalsrække 1 står helt over folden med luft — den billigste enkeltgevinst, siden har tilbage. | Som D8-A2 foreskrev: `@media (max-width:959px){ .external-detail-head{display:none} }` — flaget beholdes ≥960. |

Annoncesiden vinder klart på begge skærme. Det eneste, der reelt kan flytte
den, er **crawlen** — "sidst bekræftet for 8 dage siden" er ikke en
kodefejl, det er en manglende nøgle.

### Mærkeside

| ID | Sev. | Fil / selector | Måling | Konkret fix |
|---|---|---|---|---|
| **D9-M1** | **P2** | `scripts/build-brand-pages.js` `facetLinksFor()` + `.brand-facetter` (css:2831) | D8-M3's fire rækker (KØREKORT/PRIS/TYPE/SORTÉR) koster ≈260 px lodret: første kort ≈890 (390) og ≈835 (1366) mod runde 8's 630/589, mål ≤620 og Bilbasen 282/527. Funktionen er vundet; varerne er røget under folden for den. | Desktop: SORTÉR op på overskriftsrækken (til venstre for "Alle 256 i søgningen") og de tre facetrækker i ét 2-kolonne-grid → ≈700. Mobil: facetterne i ÉN vandret rulleliste med gruppeskilleord (KØREKORT-chips ▸ PRIS-chips ▸ TYPE-chips) → ≈700, eller flyt facetblokken ned under de første 6 kort. Mål før/efter ved 390 og 1366. |
| **D9-M2** | P3 | `scripts/build-brand-pages.js:842` | h2 "256 annoncer til salg **nu** — de første 24 her" på data, hvor største kilde er 8 dage gammel. Sidste "nu" på sitet uden dato bag sig (D8-F2's tekstlag). | "256 annoncer — de første 24 her" + én dato-linje af `max(sidst_set)`, når crawl-datoen kan hentes ved build ("Senest opdateret 20. aug."). Første halvdel kan gøres i dag; anden halvdel hører sammen med crawl-cron'en. |
| **D9-M3** | P3 | `scripts/build-brand-pages.js` TYPE-facetrækken | Typefacetterne dækker 172 af 256 — de 84 uden oplyst type har hverken link eller forklaring. Forsiden siger det ærligt ("245 af 541 … ingen type oplyst og ligger derfor ikke bag nogen af fliserne"); mærkesiden siger ingenting. | Én sætning efter TYPE-rækken: "84 uden oplyst type — dem finder du i den fulde søgning." Tallet regnes allerede (256 − sum af typerne). |
| **D9-M4** | P3 | `css/styles.css:2836` (`.brand-facet-raekke` <640: `overflow-x:auto; scrollbar-width:none`) | Mobil: PRIS-rækkens tredje chip klippes ved kanten ("Unde…") — rullelisten har ingen affordance (skjult scrollbar, ingen fade). Den klippede chip er det eneste hint. | Fade-kant på ruller-rækkerne (delt regel med D9-F2), eller `scrollbar-width:thin` på touch. |

---

## 5. Kopiér IKKE fra Bilbasen

Runde 5–8's liste står ved magt i sin helhed (takeover-annoncer, Køb/Leasing,
Lendo-ydelser ved prisen, "4,4 · 58 anmeldelser"-stjerner, billedstribe/
galleri/video/logo på kortet, hjerte på eksterne, "Book en prøvetur"/"Vis
telefonnummer" på indekserede, nyhedsbrev, "Danmarks største", cookie-modalen,
grå silhuetter, "Brugte …" som h1 over et blandet lager, leasingpris i
købskort-format, tomme "-"-rækker). **Runde 9 tilføjer intet nyt** — der er
ikke længere huller på de fire sider, et Bilbasen-element kunne fylde. Det,
der stadig gerne må kopieres, er formen "50.355 annoncer **i dag**": et tal
med en tidsangivelse, der kan holdes — den venter på crawl-cron'ens nøgle.

---

## 6. Den ene ændring pr. side — og anbefalingen

**Forside — D9-F1: gør de tre maskinlæsbare beskrivelser sande.** Én fil, tre
strenge. Siden vinder blindt på begge skærme; dens Google-snippet påstår
stadig "brugte" og "egne annoncer".

**Søgeside — ingenting stort.** Siden er færdig nok; D8-S4's undertitel-slot
(én betydning i slot 2) er den største rest, og den er P3. Efterprøv D9-S1's
Pris/Type-spørgsmål i browser, før noget bygges om.

**Annonceside — D9-A3/D8-A2: skjul kildeflaget på <960.** Én medie-regel,
≈50 px, nøgletalsrække 1 helt fri af folden. Alt andet på siden venter reelt
på crawlen.

**Mærkeside — D9-M1: betal facetternes pixelregning tilbage.** D8-M3 vandt
dommen på desktop; komprimér de fire rækker, så første kort kommer under
≈700, og mobildommen kan også vende næste runde.

**Samlet anbefaling: næste runde er MENNESKETS NØGLER, ikke en kode-runde.**
Den ene finding, der farver alle otte domme — "sidst bekræftet for 8 dage
siden" — lukkes af ét repo-secret (`SUPABASE_SERVICE_ROLE_KEY`), hvorefter
crawl.yml kører hver nat af sig selv, og dato-linjerne (D9-M2's anden
halvdel, D8-F2's tekstlag) kan skrives oven på friske tal. Resend (søgeagent-
mail), Stripe (betaling) og Cloudflare (WAF/Turnstile, A3) står i samme kø.
Kodemæssigt er resten af listen P3-kosmetik plus to P2'er (D9-F1: tre strenge;
D9-M1: én CSS/skabelon-omlægning) — en halv dags arbejde, ikke en runde. Kør
nøglerne først; lad næste kritikrunde dømme et site, der kan sige "i dag".

---

## Resumé

1. Blind dom: **7–1 til Bikerbasen** — flyttet fra runde 8's 6–2. Mærkeside
   desktop er VENDT (facetlinks med efterprøvede tal); forside mobil, SRP
   mobil op til "klart". Kun mærkeside mobil tabes, nu snævert (første kort
   ≈890 mod ≈282).
2. D8-status: 12 lukket, 4 delvist (F2, F6, M2, M4), 4 ikke lukket (S4, S5,
   S6, A2 — alle P3/småt), 1 ikke reproduceret (F5: 0 px i denne optagelse,
   kode urørt). D8-M3's facettal er efterprøvet mod REST: de stemmer.
3. Ingen nye P1. To P2: D9-F1 (forsidens meta/JSON-LD siger stadig "brugte"
   + "egne annoncer") og D9-M1 (facetrækkerne kostede ≈260 px — første kort
   890/835 mod mål ≤620). Resten er P3-kosmetik.
4. Det ene tal, der farver alt: MC Syd (61 % af lageret) er **8 dage**
   gammel. crawl.yml + cron er klar og venter ALENE på menneskets
   `SUPABASE_SERVICE_ROLE_KEY`.
5. Anbefaling: næste runde er menneskets nøgler (crawl-secret først; Resend/
   Stripe/Cloudflare i kø) — kode-resterne er en halv dag, ikke en runde.
