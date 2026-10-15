# Critic guides 2 (blind) — branch gauntlet/guides, HEAD 140e6c5, dato 15.10.2026

DOM: **ACCEPTER** (ingen P0/P1). 4 x P2 (ordlyd/udeladelser i privatkøb og sidebjælke), anbefales rettet.

## Primærkilder hentet (renderet via Playwright, retsinformation er en SPA)
- Færdselsloven LBK 118/2026: https://www.retsinformation.dk/eli/lta/2026/118
- Synsbekendtgørelsen BEK 1685/2025 + ændring BEK 259/2026: .../eli/lta/2025/1685 og .../2026/259
- Kørekortbekendtgørelsen BEK 550/2026: .../eli/lta/2026/550
- Købeloven LBK 1853/2021 (udskrevet 15.10.2026, "Gældende"): https://www.retsinformation.dk/api/pdf/224254
- forbrug.dk (brugte varer, brugt bil, reklamationsfrist, "købt som beset"), borger.dk (kørekort mc, ejerskifte, afgifter), lifeindenmark.borger.dk (Bilbogen)

## Opgavens præmis, der er forkert
"Købeloven § 19 'som beset'" findes ikke: § 19 handler om aktieudbytte. Købeloven har ingen "som beset"-paragraf for civilkøb. Grundlaget er § 1 (loven er deklaratorisk, "for så vidt ikke andet er udtrykkeligt aftalt"), § 47 (undersøgelse før køb), § 52 (reklamation "uden ugrundet ophold"), § 54 (2 års absolut frist; falder bort ved svig/længere indestående). Guiderne nævner ikke § 19 — korrekt.

## Faktatabel
| # | Påstand (guide) | Dom | Kilde / citat |
|---|---|---|---|
| a1 | Forhandler: forbrugerkøb, 2 års reklamationsret også brugt, løber fra levering | BEKRÆFTET | forbrug.dk/emner/biler/koeb-af-brugt-bil: "Når du køber en brugt bil hos en bilforhandler, har du altid to års reklamationsret"; "løber fra leveringen". Købeloven § 83 stk. 1 |
| a2 | Forhandler kan ikke fraskrive sig med generelle forbehold | BEKRÆFTET | forbrug.dk forbehold-koebt-som-beset: "Generelle forbehold som fx 'købt som beset' ... er ikke gyldige" (forbrugerkøb) |
| a3 | Privat: forbrugerbeskyttende regler gælder ikke | BEKRÆFTET | forbrug.dk: "gælder de forbrugerbeskyttende regler ikke"; købeloven § 1 a stk. 2 (§§ 72-87 kun forbrugerkøb) |
| a4 | Privat: "ifølge Forbrugerstyrelsen som udgangspunkt også to års reklamationsret, hvis I ikke har aftalt noget andet" | BEKRÆFTET, men VILDLEDENDE-RISIKO (P2-1) | forbrug.dk brugte-varer-generelt: "Har I ikke aftalt noget, har du også her to års reklamationsret". Men forbrug.dk's biler-side siger: "kan ikke stille krav om at få rettet fejl, som sælgeren ikke havde kendskab til". Kilderne er indbyrdes spændte; juridisk er 2 år kun en yderfrist (§ 54), den operative frist er "uden ugrundet ophold" (§ 52). |
| a5 | "som beset"/uden reklamationsret er almindeligt ved privat salg; få det på skrift | BEKRÆFTET | forbrug.dk: "meget almindeligt, at en vare sælges som beset og uden reklamationsret" |
| a6 | Fejl skal reklameres inden rimelig tid | BEKRÆFTET | købeloven § 52 stk. 1 |
| b1 | Syn ved ejerskifte "til og med 31.12.2026", ophævet fra 1.1.2027 (BEK 259/2026) | BEKRÆFTET | BEK 259 § 1 nr. 6: "§§ 63 og 64 ophæves"; § 2: "træder i kraft den 1. januar 2027". Ingen yderligere senere ændring fundet |
| b2 | Tærskler: reg. 5-10 år siden og sidst synet >2 år siden; >10 år og >1 år | BEKRÆFTET | BEK 1685 § 63 stk. 2: "mellem 5 og 10 år siden ... mere end 2 år siden"; "mere end 10 år siden ... mere end 1 år siden" |
| b3 | 3 ugers frist, medmindre afmeldt først | BEKRÆFTET | § 63 stk. 1: "snarest muligt og senest inden 3 uger ... medmindre køretøjet afmeldes forinden" |
| b4 | Undtagelse ægtefæller "fx" | BEKRÆFTET (ufuldstændig, men "fx" dækker) | § 63 stk. 3: ægtefæller/registrerede partnere, samboende 5 år, dødsfald m.fl. |
| b5 | Gælder motorcykler; mc ikke omfattet af periodisk syn, undtagen øvelseskørsel | BEKRÆFTET | § 63 stk. 2 "køretøj, der ikke er underkastet periodisk syn, bortset fra knallert"; § 43 stk. 1 nr. 1 motorcykler til øvelseskørsel |
| c1 | Hjelm: fører + passagerer fra 15 år | BEKRÆFTET | § 81 stk. 1: "enhver passager, som er fyldt 15 år, skal under kørsel anvende fastspændt styrthjelm" |
| c2 | Fører sørger for passagerer 5-15 år | BEKRÆFTET | § 81 stk. 3 (med undtagelse hvis sikkerhedssele — udeladt, P3) |
| c3 | Ansvarsforsikring, selskab med Finanstilsynets tilladelse | BEKRÆFTET | § 105 stk. 1 |
| d1 | A1 18 / A2 20 / A 24 år; A 22 år efter 2 år A2 + prøve | BEKRÆFTET | BEK 550 §§ 35, 36, 37 stk. 1-2; borger.dk |
| d2 | A1: 125 cm³, 11 kW, 0,1 kW/kg | BEKRÆFTET | § 11 stk. 1 nr. 1 |
| d3 | A2: 35 kW, 0,2 kW/kg, ikke afledt af mc med >dobbelt effekt; ingen cm³-grænse | BEKRÆFTET | § 12 stk. 1 nr. 1 |
| d4 | Køreklar vægt; ellers egenvægt + 15 kg | BEKRÆFTET | § 12 stk. 2 |
| d5 | Regneeksempel 175 kg -> 35 kW; 35 kW ≈ 47,6 hk | BEKRÆFTET (aritmetik) | 0,2 x 175 = 35; 35/0,7355 = 47,6 |
| d6 | A: trehjulede over 15 kW | BEKRÆFTET | § 13 stk. 1 nr. 2 |
| d7 | Særregel forsvar/mekanikere fra 18 år, kun tjeneste til 20 | BEKRÆFTET (mekaniker-del ikke læst nøje) | § 36 stk. 2-3 |
| d8 | Lægeattest højst 6 mdr. ved ansøgning | BEKRÆFTET | borger.dk: "ikke ... mere end 6 måneder gammel"; BEK 550 stk. 5 |
| d9 | 1.600 kr. prøve+kort; 520 kr. udvidelse | BEKRÆFTET | borger.dk: "koster 1.600 kr." / "520 kr." (2026) |
| d10 | Omregistrering inden 4 hverdage, 340 kr. i 2026, app/Motorregistret, MitID | BEKRÆFTET | borger.dk: "indenfor 4 hverdage fra købet"; "340 kr. (2025 og 2026)" |
| d11 | Bilbogen: kun pant + ejendomsforbehold, ikke ejerregister, opslag på tinglysning.dk | BEKRÆFTET | lifeindenmark: "only shows debts secured by a mortgage"; "not a register of owners". Dækning af motorcykler står ikke eksplicit på siden — IKKE VERIFICERBAR for mc-delen (P3) |
| d12 | Afgift brugt mc = som ny, nedsat efter værdi; import: registreringsafgift | BEKRÆFTET | borger.dk afgifter: "For brugte motorcykler beregnes afgiften på samme måde som for nye" |
| d13 | Tabel: A1/A2-rækker nævner kun tohjulede | P3 | § 11/12 giver også trehjulede ≤15 kW; tabellen er "hovedregler" og siger det |
| e | Sidebjælke, se nedenfor | | |

## Fund
**P0:** ingen.
**P1:** ingen. Intet jeg fandt kan føre en læser til en direkte forkert juridisk beslutning, forudsat de læser hele afsnittet.

**P2-1 Privatkøb, "to års reklamationsret" kan overvurderes.** Ordlyden følger forbrug.dk, men 2 år er kun en yderfrist; reel frist er "uden ugrundet ophold" (§ 52), og forbrug.dk's egen biler-side siger køber ikke kan kræve rettet fejl sælger ikke kendte. Forslag: "Ved privatkøb er din beskyttelse svagere og afhænger af aftalen; to år er højst-fristen, og du skal reklamere straks, du opdager fejlen."
**P2-2 "Som beset" — manglende afgrænsning.** Guiden siger ikke, at forbeholdet ikke dækker svig, bevidst fortiede fejl eller urigtige oplysninger/tilsikrede egenskaber i annoncen (§ 42 stk. 2, § 53). Det er den vigtigste ting en privatkøber bør vide. Forslag: én sætning + "gem annoncen som skærmbillede".
**P2-3 Forhandler: "to års reklamationsret" uden slid-forbehold.** På brugt mc dækker retten mangler til stede ved levering, ikke normal slitage (forbrug.dk: "almindeligt slid ... afhænger af hvor gammel og slidt"). Teksten kan læses som "alt dækket i 2 år". Tilføj kort forbehold.
**P2-4 Sidebjælken kan i fremtidige builds vise ikke-tohjulede/ikke-vejgående eller scootere.** Filteret `IKKE_TOHJULET` er navnebaseret, og `type !== 'scooter'` virker kun hvor typen er sat. I de rå data (616 eksterne, 58 med hk ≤ 47) passerer filteret bl.a. Honda NSS 300 Forza, Suzuki AN 400 Burgman, BMW C 400 GT (maxi-scootere, typen er null) og Triumph TF 250-E (el-crosser, ikke vejgående) — Yamaha Tricity 300 udelukkes korrekt. Maxi-scootere er juridisk tohjulede mc (A2 ok), så det er ikke "forkert", men det strider mod notens og kodekommentarens løfte om at scootere udelades. Ingen knallert/ATV/sidevogn fundet i datasættet. Nuværende render (3 kort: Honda CMX 500 Rebel, Sym XS 125, Honda CBR 250 R) er alle ægte tohjulede mc. Fix: whitelist på kendt mc-type frem for blacklist, og udeluk el/off-road ("TF 250-E").

**Stikprøve (15+ annoncer, rå hk ≤ 47):** vist 3 (Rebel 46 hk, Sym XS 125 11 hk, CBR 250 R 26 hk); udelukket korrekt: 2 x Tricity 300; ikke udelukket men ville kvalificere: Forza, Burgman, C 400 GT, TF 250-E; øvrige (CL 500, Rebel, RE 650, Monkey, Dax, MSX 125, 390 Duke, G 310, R3, VT 750, CRF 300 L m.fl.) er almindelige mc. Overskrift "Oplyst effekt under A2-grænsen" + note ("kun kildens effekt, ikke vægt eller afledning, ikke en garanti for A2. Tjek attesten") er ærlig. Misforståelsesrisiko lav-moderat: linket "Se alle" går til ?koerekort=A2, og 125 cm³-kort (A1) vises under en A2-lignende overskrift. Note er lille tekst; overvej at gøre den lige så synlig som overskriften.

**P3:** § 81 stk. 3-undtagelse (sikkerhedssele) udeladt; hjelmpligt ikke på parkeringsplads (stk. 4) udeladt; tabel nævner ikke trehjulede ≤15 kW under A1/A2; "Udvalg pr. 24. august 2026" på en side dateret 15. okt. kan se forældet ud; syn-afsnit: handler man sidst i dec. 2026 er 3-ugersfristen uafklaret — guiden henviser til Færdselsstyrelsen (rimeligt); Bilbogens mc-dækning ikke eksplicit på kilden.

## Teknik
- 1 x h1 på alle 4 sider; title/description/canonical OK (canonical uden .html, https://bikerbasen.dk/...).
- JSON-LD parser: guides = CollectionPage+BreadcrumbList; de tre guides = Article+BreadcrumbList.
- TOC: 8 ankre pr. guide, 0 brudte; scroll-margin-top 84px på sektioner.
- Vandret overflow: 0 px ved 320/390/768/1024/1440, lys og mørk, alle 4 sider.
- Kontrast: 0 tekstelementer under AA (4,5/3,0) i lys og mørk (automatisk måling; tekst over hero-foto ikke målt pixel for pixel).
- Konsol: ingen fejl. Kun "requestfailed" for hero-960/1600.webp under viewport-skift (afbrudt srcset; filerne svarer 200).
- `node --test scripts/guides.test.js`: 30/30. `npm test`: 364/364.

## Design 0-5 mod billede 10
| Element | Score | For at komme tættere |
|---|---|---|
| Header/breadcrumb | 4 | Match nav: Motorcykler/Mærker/Kørekort/Artikler/Viden (billedet har hvid topbar, vi har mørk) |
| Hero m. foto, "GUIDE"-label, h1, ingress | 3,5 | Billedets rytter er i frame; vores crop viser kun maskinens hjørne. Større h1 og fotoet skarpere til højre |
| Forfatter/dato/læsetid-række | 4 | Ærligt uden opdigtet person (bevidst afvigelse) |
| Kort fortalt-boks i grøn m. ✓ og CTA | 4,5 | Meget tæt; CTA i brandfarve er korrekt override |
| Indholdsfortegnelse (to kolonner, nummereret) | 4,5 | Tæt på |
| Typefliser m. foto (5) | 4 | Billedet har kortere flise og tydeligere hvid kortkant/skygge; ens højde |
| Sidebjælke: CTA-panel m. foto | 4 | Tæt på; tekst-overlay ens |
| Sidebjælke: kortliste | 3,5 | Billedet viser hjerte + større billeder + "Se alle"; vi har kilde-badge (bedre ærlighed) |
| Kørekorttabel / brødtekst | 3,5 | Mere luft/hvidt rum mellem sektioner; billedets h2 er større og tungere |
| Kilder/footer | 4 | Ærlig; ikke i billedet |
Samlet ca. 4,0/5. Største løft: hero-crop med rytter, tungere h2-typografi, kortskygge/kant på flisen, lyst topbar-look.

## Dom
**ACCEPTER.** Alle kontrollerede fakta er bekræftet mod primærkilderne og aktuelle pr. 15.10.2026; ingen P0/P1. Ret P2-1 til P2-4 i næste runde (privatkøb er der, hvor en læser reelt kan træffe en dårlig beslutning).
