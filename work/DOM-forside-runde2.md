# DOM — forside, runde 2

Dømt udlogget mod `bar/01-forside-desktop-1440.png` og `bar/01-forside-mobil-390.png`.
Cookievæg klikket væk med "Kun nødvendige". localStorage ryddet før førstegangs-testen.
Ingen kode læst.

## Beviser

**Tal der ikke passer (forside → søgeside, samme filter)**

| Filter sat på forsiden | Forsiden lover | Forsiden om skjulte | soegning.html siger | Skjulte dér |
|---|---|---|---|---|
| ingen | Vis 383 motorcykler | (intet) | 383 annoncer fundet | – |
| Kørekort A2 | Vis 60 motorcykler | 113 (kørekort) | 60 annoncer fundet | 113 (kørekort) |
| Kørekort A1 | Vis 15 motorcykler | 12 (kørekort) | 15 annoncer fundet | 12 (kørekort) |
| **A2 + maks. 60.000 kr.** | **Vis 60 motorcykler** | **113** | **29 annoncer fundet** | **43** |
| **Type Scooter** | **Vis 383 motorcykler** | **(intet)** | 8 | 48 |
| **Scooter + maks. 30.000 kr.** | **Vis 383 motorcykler** | **(intet)** | **6 annoncer fundet** | **48** |

Sidste række er kørt ende til ende: knappen sagde "Vis 383 motorcykler", jeg klikkede,
og jeg landede på `soegning.html?types=scooter&priceMax=30000` → "6 annoncer fundet /
48 annoncer er ikke vist". Filtrene overføres korrekt — kun løftet er forkert.
Tælleren reagerer kun på fritekstfeltet og Kørekort-radioen; Type og Maks. pris
ignoreres af både tallet og "ikke talt med"-linjen.

**Mærkater**
- Ingen prispåstande ("under markedspris" el.lign.) nogen steder. Godt.
- Veteran/klassiker på forsiden er ærligt håndteret: Triumph Daytona 1200 (1993, effekt
  ukendt) får hele sætningen "Over 125 ccm kræver mindst A2. Effekten står ikke i
  annoncen hos kilden, så vi kan ikke afgøre, om den også kan køres på A2."
- Men to af de otte kort i "Nyeste annoncer" bærer et kørekortmærkat, siden ikke kan
  bakke op: **KTM RC 390** (373 ccm) er mærket "Kan føres på A-kørekort" fordi annoncen
  påstår 56 hk, og **Harley-Davidson Iron 883** er mærket "Kan føres på A2-kørekort" med
  48 hk oplyst på annoncesiden — 48 hk er 35,3 kW og altså over A2-loftet på 35 kW.
  Samme motor (373 ccm) får A på RC 390 og A2 på Husqvarna Svartpilen 401.
- På søgesiden komprimeres den ærlige sætning til mærkatet "Kørekort mindst A2" — det
  sidder bl.a. på en Honda GL 1100 Gold Wing (1.100 ccm, effekt ukendt), og de samme
  annoncer filtreres samtidig FRA under Kørekort A2. Mærkat og filter er uenige.

**Overskrifter mod indhold**
- "Udvalgte annoncer — Et udpluk af de dyrere modeller": billigste kort er 62.200 kr.,
  mens sidens eget prisfacet tæller 137 annoncer over 150.000 kr. Alle fire kort er fra
  samme forhandler i Rødding, to af dem er fabriksnye (2024/2025) på en side, hvis titel
  er "Køb og sælg **brugte** motorcykler", og ét kort hedder bare "Honda" — ingen model —
  til 609.995 kr.
- "Nyeste annoncer — den nyeste er fra 25. jul. 2026", altså tre uger gammel, under en
  hero der siger "383 motorcykler til salg **i dag**". Alle otte kort siger "3 uger
  siden" til "1 måned siden", og alle otte siger "Ingen fotos i denne annonce".
- "Søg efter type" lover otte typer, men kortene lige under bruger kildens ordforråd:
  "Street", "Offroader", "Sportstouring", "Klassiker" — ord der ikke findes i vores eget
  Type-filter.

**Mobil over folden (390×844, målt med getBoundingClientRect)**
Alt inden for 844 px: header, "Kun motorcykler — intet andet", H1, "383 motorcykler til
salg i dag", fritekst (264), Type (369), Maks. pris (450), Kørekort A1/A2/A som ét tryk
(535), ærlighedslinjen (586), CTA "Vis 383 motorcykler" (630–684), chip-rækken (698–742)
og to tryghedspunkter (784–836). Søgevejen er færdig over folden — referencens mobil
bruger folden på syv grå dropdowns og ingen tryghed. Ingen vandret scroll (390 = 390).

**Målt**
Lighthouse 12.8.2, mobil-emulering, simuleret 4x CPU: ydelse 100, tilgængelighed 100,
FCP 0,3 s, LCP 0,6 s, CLS 0,007, TBT 0 ms. Ingen a11y-fejl. Tilbage-knappen fra en
annonce genskaber både filter og scrollposition (y=1800).

**Dansk**
`35.500 kr.`, `25. jul. 2026`, A1/A2/A, de otte danske MC-typer. Eneste engelske ord på
siden er "DKK" i footeren ("Priser vises i DKK.") plus de importerede typenavne ovenfor.

---

VINDER: findbarhed=os tillid=Bilbasen hastighed=os dansk=os
LIGHTHOUSE: ydelse=100 a11y=100 LCP=0.6s CLS=0.01
STØRSTE HUL: Forsidens tællerknap regner kun på fritekst og Kørekort — Type og Maks. pris ignoreres af både tallet og "ikke talt med"-linjen, så "Vis 383 motorcykler" lander på "6 annoncer fundet / 48 ikke vist"; lad knappen og statuslinjen kalde præcis samme filterberegning som soegning.html, så de to sider aldrig kan sige to forskellige tal.
