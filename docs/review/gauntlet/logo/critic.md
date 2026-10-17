# Critic (blind) - Mærkelogosystem, commit c72d7a89 mod origin/main 776ee89

Arbejdskopi: C:\Users\pasca\AppData\Local\Temp\critic-logo-20261017162354 (+ `-base` for 776ee89). Screenshots: `<kopi>\out\` (sheet.png = alle 20 SVG'er, s/, h/, a/, f/, c-fliser-*.png). Port 8990/8991, SUPABASE_SERVICE_ROLE_KEY fjernet.

## DOM: ACCEPTER (med P2-rettelser). Ingen P0/P1.

## Målinger
- smoke-browser (index, maerker, maerke-honda/harley/benelli, annonce, soegning; 320/390/768/1024/1440 x lys+mørk; --cls 0.05 --strikt): 70 målinger, 0 fejl, 0 advarsler (CLS, overflow, h1, konsol/CSP, dødt link, alt).
- `verificer-site --hurtig --med-udgiv`: alle 8 trin grønne (npm test springes over i --hurtig; ikke kørt af mig).
- Mærkelinks: index 12, maerker 29 - 0 døde. Hurtigsøg: harley/hd/h-d, indian, benelli, kawa, bmw rammer rigtigt; "xyz" tom; Enter går til maerke-harley-davidson.html. Søgefilter: ?brands=Honda -> 16 resultater, 0 konsolfejl (filterets logorække er skjult, ingen synlig ændring).
- Resize 1440->768->390->1440: logoantal konstant (6/6), ingen dubletter/tab.
- Kontrast logo/flise: 17,4:1 lys, 15,1:1 mørk (currentColor). Ingen usynlige logoer.
- SVG'er: 20 godkendte, ~221 KB samlet for alle filer; ingen script/ekstern href/style/text/data:/®/™. Ingen producent-slogans.
- Requests (mock, uden throttling; serveren er no-store): index 28->43 (+15, 12 SVG), maerker 14->44 (+30, 26 SVG), annonce 21->26 (2 SVG), soegning 20->23 (0 SVG), maerke-honda 19->24. Bytes: index +68 KB, maerker +129 KB, annonce +36 KB, soegning +23 KB.
- A11y: dekorative skjult (aria-hidden), ikke-dekorative `role=img aria-label="Harley-Davidson-logo"` på annoncens titelrække. OK.

## Fund
- P2 `js/brand-logos.js:161` - hvert logo renderes som synligt billede + `<img class="bl-probe">` med samme URL: dobbelt antal SVG-kald i min måling (maerker 26 SVG til 13 logoer, index 12 til 6). I prod med cache-headere hentes de nok kun én gang, men det er unødig; brug onerror på det synlige billede/mask eller `<img>` direkte.
- P2 maerker.html A-Z-listen blander rigtige logoer og monogramcirkler for GODKENDTE mærker: Kawasaki, KTM, Aprilia, Indian, Benelli, Moto Guzzi, CFMoto får monogram (regel `js/brand-logos.js:142`: bredt ordmærke >1,6 i sm-slot). Samme liste har logo for Honda/Yamaha/BMW osv. Visuelt rodet; ingen af mockuppene viser det. Enten monogram for alle i A-Z eller emblem-varianter til de brede.
- P2 Mærkesidernes hero: logoet er maks. 54 px højt (Yamaha 55x54, Honda 68x54, Indian 88x54) mod mockuppens store logo + ordmærke (~230x50). Indian-scriptet er ulæseligt, Benelli vises som stort ordmærke - ens hero-lockups er ikke ens (HD: logo + stor tekst "HARLEY-DAVIDSON" dobbelt navn; Benelli: kun ordmærke; Indian: lille logo og ingen navn). CTA-panelets logo 40 px.
- P2 Annoncens titelrække: logo 40 px højt (HD 50x40, Indian 65x40, Yamaha 40x40) mod ~120x40 i mockup. Detaljerede mærker (HD, Indian, Triumph, MV, Moto Guzzi) er ikke læselige ved 40-50 px; kun silhuet. Konkurrerer ikke med pris/billede (positivt).
- P3 Forsiden: Harley-Davidsons navn bryder til to linjer og gør fliserne ujævne (også maerker.html). BMW-lockuppen er lille (~8 px tekst) mens Kawasaki fylder tre gange mere i fliserne - ujævn visuel vægt. 6 fliser i én række ved 1440 OK. Mockup har farvede emblemer (rød Honda/Yamaha, grøn KTM) - ensfarvet er en nødvendig afvigelse (tema/kontrast).
- P3 Vektoriseringsstøj: Honda- og HD-bogstaver og vingekanter er bølgede ved 400 px; Triumph "H" smelter sammen med underlinjen.
- Eksisterende forside/mærkeside-data (3 vs 83 annoncer på HD-siden, Ducati-billede på Indian-hero) er før-eksisterende/statisk og ikke logo-relateret.

## Top-5 afvigelser fra mockups
1. Ensfarvet i stedet for farvet logo (nødvendig: currentColor/tema/ingen officielle filer).
2. Hero-logo lille og uens lockup (kan rettes: større hero-slot, ensartet logo+navn).
3. Annoncelogo 40 px vs ~120 px (kan rettes; bredere slot for lockups).
4. Forside-kort: logo over navn+tal i stedet for ren logoflise (acceptabel, bevarer tilgængelig tekst).
5. A-Z/hurtigsøg-liste med logo/monogram-blanding (ikke i mockup; bør ensrettes).

## Logoer pr. mærke (kendt udseende vs. SVG)
| Mærke | Dom | Behold/sluk | Note |
|---|---|---|---|
| Honda | OK/let AFVIGER | behold | Vinge godt; serif-ordmærke bølget |
| Harley-Davidson | AFVIGER (let) | behold med forbehold | Bar&shield, tekst rigtig; fonten kondenseret/bølget; stærkt varemærke - ejeren bærer risikoen |
| Yamaha | OK | behold | Stemmegaffel+ring korrekt; ordmærke smallere end ægte |
| Suzuki | OK | behold | |
| BMW | OK | behold | Roundel monokrom, "MOTORRAD"-lockup |
| Kawasaki | OK | behold | K blokkere end ægte; ordmærke generisk |
| Triumph | AFVIGER (let) | behold; ret H/underline | T-skjold godt; "H" kolliderer med streg |
| KTM | OK | behold | |
| Royal Enfield | AFVIGER (let) | behold | Emblem+ordmærke plausible, ikke officiel form |
| Aprilia | OK/let AFVIGER | behold | |
| Ducati | AFVIGER (let) | behold | Skjold rigtig; skrift/svirp tilnærmet |
| Moto Guzzi | OK | behold | Ørn genkendelig |
| Husqvarna | OK | behold | Krone-H, "MOTORCYCLES" |
| Indian | AFVIGER | sluk eller behold kun stor | Hoved/script plausible men ulæselig <70 px; manifest markerer selv "ubrugelig" |
| MV Agusta | AFVIGER (let) | behold | Vingemotiv forenklet |
| Benelli | ULIGE | SLUK | Kun generisk serif-ordmærke, ingen løve; ægte logo er løve+særligt ordmærke - et forkert logo er værre end tekst |
| CFMoto | OK | behold | |
| Piaggio | OK | behold | |
| GasGas | OK | behold | |
| Zero | OK | behold | |

Anbefaling: sluk Benelli (godkendt:false); overvej Indian. Manifestet markerer HD, Indian, Benelli som `autenticitet:"ubrugelig"` - ejerens godkendelse overstyrer, men det er tre af de fire mest sårbare varemærker.

## Juridisk
Gentegnede AI-udkast af registrerede varemærker (HD, Indian, Ducati, Honda m.fl.): identificerende brug er normalt tilladt, men tegnede/afvigende versioner kan opfattes som forfalskning eller utilbørlig brug; HD og Honda håndhæver aktivt. Ingen ®/™ eller slogans opdigtet. Udskift med officielle filer når muligt.

## Dom: ACCEPTER (P2-rettelser anbefales: probe-dobbeltkald, A-Z-ensretning, større hero/annoncelogo, sluk Benelli).
