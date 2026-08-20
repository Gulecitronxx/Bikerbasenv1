# DOM — Sælger-/forhandlerprofil (forhandler.html), runde 3

Frisk dommer. Jeg har ikke læst `work/DECISIONS.md`, ingen runde 1- eller
runde 2-dom og ingen kildekode. Jeg har læst `bar/GAPS.md` og set
`bar/desktop/03-listing.png`. Alt nedenfor er målt i en browser, logget ud.

## 0. Opsætning — så tallene kan efterprøves

| Forhold | Værdi |
|---|---|
| Egen server (projektets egen) | `PORT=8573 python scripts/dev-server.py` — **ikke** 8532, den var optaget |
| Spejlserver med gzip | egen node-server på 8574, samme filer, `Content-Encoding: gzip` |
| Tilstand | **demo-katalog TIL** — 443 annoncer: 51 egne + 332 MC Syd + 60 Gul og Gratis |
| Produktion (oplyst) | 0 egne + 392 indekserede. Det ændrer dommen, se §3 |
| Session | ny kontekst pr. måling, localStorage tom, cookievæg lukket med "Kun nødvendige" |
| innerWidth målt **inde i siden** | 1440 og 390 — bekræftet med `evaluate(() => innerWidth)` |
| Værktøj | Playwright 1.62, axe-core 4.x, Lighthouse 12.8.2 |
| Målt profil | `forhandler.html?id=Roskilde%20Motorcykler%20ApS` (+ 5 andre forhandlere) |

---

## 1. Geometri og gulv — målt, ikke påstået

| Mål | 1440×900 | 390×844 |
|---|---|---|
| `innerWidth` inde i siden | 1440 | 390 |
| `documentElement.scrollWidth` | 1440 | **390** |
| `body.scrollWidth` | 1440 | **390** |
| Elementer der stikker ud over viewport | **0** | **0** |
| Sidens højde | 2781 px | 5289 px |
| axe-core overtrædelser (hele siden) | **0** | **0** |

Vandret scroll: ingen. Dokumentbredden er præcis 390. Det er rent.

### Lighthouse (mobil, 4× CPU-throttling, 3 kørsler)

| Server | ydelse | a11y | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|---|
| Projektets egen dev-server (8573, **ingen komprimering**) | 84 / 84 / 84 | 100 | 1,8 s | **4,4 s** | 20–70 ms | 0,035 |
| Spejl med gzip (8574, som GitHub Pages leverer) | 97 / 98 / 96 | 100 | 1,1 s | **2,5 / 2,6 / 2,8 s** | 10–20 ms | 0,035 |

Jeg fører den gzippede kørsel som hovedtal, fordi produktionen komprimerer.
Men to ting skal stå tydeligt:

1. **LCP-elementet er cookiebanneret.** I alle seks kørsler er LCP
   `body.cookie-banner-vises > div#cookie-banner > div.cookie-banner-text > p`.
   90 % af LCP er *Render Delay* (3.901 ms af 4.352 ms i den ukomprimerede
   kørsel). Sidens eget indhold er ikke det, der er langsomt — samtykkevæggen er.
   Måler jeg med samtykke allerede givet (CPU 4×, uden netthrottling), falder
   LCP fra 1.016 ms til **360 ms**. Førstegangsbesøget betaler hele regningen.
2. **Median-LCP 2,6 s er stadig over 2,5 s-grænsen.** Gulvet i `bar/GAPS.md`
   siger LCP < 2,5 s. Den her side rammer det ikke — heller ikke i sin bedste
   opsætning. Ydelse 97 og a11y 100 er derimod i mål.

Lighthouse peger også på 341 KiB, der leveres ukomprimeret af projektets egen
server, og 193 KiB ubrugt CSS. Det første er en artefakt af `dev-server.py`.
Det andet er ægte: `css/styles.css` er 217 KB, og profilsiden bruger en brøkdel.

### Referencen, målt med samme opskrift

| Side | ydelse | a11y | FCP | LCP | CLS |
|---|---|---|---|---|---|
| Vores forhandlerprofil (gzip) | **97** | **100** | 1,1 s | 2,6 s | 0,035 |
| bilbasen.dk/find-en-forhandler | 57 | 84 | 7,0 s | **9,8 s** | 0 |

Det er ikke tæt. På hastighed og tilgængelighed er den diskussion færdig.

---

## 2. Kan en køber se forhandler fra privat — uden at klikke?

Talt på side 1 af søgeresultatet (24 kort) og på annoncesiderne:

| Sælgertype | Kort i SRP | Mærkning på kortet | På annoncesiden | Profil? |
|---|---|---|---|---|
| Egen forhandler | 3 | sort badge **FORHANDLER** | "Forhandlerannonce" + sælgerboks | **Ja**, 1 klik |
| Egen privat | 0 på side 1 (findes, fx id 1002) | tekst "Privat sælger" | "Privat annonce" | **Nej** |
| MC Syd (indekseret forhandler) | 19 | "Forhandler · mcsyd.dk" | "Forhandlerannonce" + "DU KØBER AF" | **Nej** |
| Gul og Gratis (indekseret privat) | 2 | "Privat sælger · guloggratis.dk" | "DU KØBER AF" | **Nej** |
| Kort helt uden sælgertype | **0** | — | — | — |

**Det virker.** Nul kort uden sælgertype. Fire kilder, fire formuleringer, alle
korrekte. Det er bedre end de fleste danske markedspladser.

Men mærkningen taler ikke ét sprog: egne forhandlere får et **badge**,
indekserede får en **tekstlinje**. En køber, der scanner, ser to visuelle
klasser af det samme faktum.

---

## 3. Findbarhed — her falder det fra hinanden i produktion

| Vej til en sælgerprofil | Findes? | Klik |
|---|---|---|
| Fra et SRP-kort direkte til sælgeren | **Nej** — intet kort linker til `forhandler.html` | — |
| Fra en egen forhandlerannonce ("Se sælgerprofil") | Ja | **1** |
| Fra en egen privat annonce | **Nej** — knappen findes ikke | — |
| Fra en MC Syd-annonce | **Nej** | — |
| Fra en Gul og Gratis-annonce | **Nej** | — |
| Forhandleroversigt / "find en forhandler" | **Findes ikke på sitet** | — |
| `forhandler.html?id=MC%20Syd` | "Vi kunne ikke finde sælgeren" | — |

Regnestykket:

| Tilstand | Annoncer i alt | Annoncer med klikbar sælgerprofil | Andel |
|---|---|---|---|
| Demo (det jeg målte) | 443 | 21 egne forhandlerannoncer | **4,7 %** |
| Produktion (oplyst) | 392 | **0** | **0 %** |

I produktion er `forhandler.html` en side uden emner. Alle 392 annoncer er
indekserede, ingen af dem linker til en profil, og der er ingen
forhandleroversigt at gå ind ad. Siden er teknisk fejlfri og praktisk død.

Bilbasen har til sammenligning både `find-en-forhandler` (jeg indlæste den og
målte den — den er langsom, men den er der) **og** en forhandlerblok på hver
annonce med "Se forhandlerens 97 annoncer". Vi har ingen af delene i produktion.

Tomtilstanden er i øvrigt god: `forhandler.html` uden `id`, med ukendt `id` og
med `id=MC Syd` giver alle tre samme rene side — titel "Sælgeren findes ikke",
"Profilen er måske slettet, eller linket er forkert" og en vej videre til
søgningen. Ingen tom skal, ingen JavaScript-fejl.

---

## 4. Hvad beviser profilen egentlig? — påstande talt op

Profilen for Roskilde Motorcykler ApS indeholder præcis disse påstande:

| # | Påstand | Kilde | Kan **Bikerbasen** efterprøve den? | Kan **køberen** efterprøve den? |
|---|---|---|---|---|
| 1 | Sælgertype: Forhandler | selvindtastet | Nej | Nej |
| 2 | By: Roskilde | selvindtastet | Nej | Nej |
| 3 | Medlem siden 2021 | egen database | Ja | Nej |
| 4 | Aktive annoncer: 3 | egen database | **Ja** (jeg talte 3 kort — passer) | Ja, på siden |
| 5 | Seneste annonce: 26. jul. 2026 | egen database | **Ja** | Ja |
| 6 | Bedømmelse 3,2 | brugerskrevet | Nej | Nej |
| 7 | 5 anmeldelser | egen database | Ja (antallet) | Ja (de står der) |
| — | CVR-nummer | **findes ikke** | — | — |
| — | Adresse, telefon, åbningstider, hjemmeside | **findes ikke** | — | — |

To af syv påstande siger noget om sælgeren, som en køber kan bruge til at
vurdere risiko (antal annoncer, hvor længe der er handlet). Resten er
selvindtastet tekst eller brugerskrevne meninger. Profilen kan ikke pege på ét
eneste eksternt register.

Til sammenligning, fra `bar/desktop/03-listing.png` — Bilbasens forhandlerblok
på **annoncesiden**, logget ud, uden profilklik:

| Oplysning hos Bilbasen | Kan køberen efterprøve den udefra? |
|---|---|
| Forhandlerlogo + navn "Van Mossel Greve" | — |
| **CVR-nr.: 20560010** | **Ja — slå op i CVR-registret** |
| Vejadresse: Ventrupparken 1B, 2670 Greve | **Ja — kør derhen** |
| "Besøg forhandlerens hjemmeside" | **Ja** |
| "Vis telefonnummer" (ét klik, ingen login) | **Ja** |
| "Se forhandlerens 97 annoncer" | Ja |
| "Om Van Mossel Greve" med foto og tekst | Nej |
| 4,5 ★ · 90 omtaler | Nej |

Bilbasens annonceside giver tre eksternt kontrollerbare fakta om sælgeren.
Vores dedikerede profilside giver nul. Det er den ubehagelige konklusion i
runde 3: **vi har bygget en pænere side om en tyndere sælger.**

Til vores forsvar — og det er reelt — er ærligheden konsekvent og velskrevet:

> "Ingen af oplysningerne er kontrolleret af Bikerbasen. De er tastet ind af
> sælgeren selv. Vi slår ikke op i CVR- eller MitID-registret, så læs dem som
> en oplysning — ikke som en godkendelse."

Og afsnittet "Efterprøv forhandleren selv" fortæller køberen, hvad han selv
skal gøre, og hvorfor felterne mangler. Det er bedre skrevet end noget, jeg har
set på en dansk markedsplads. Men en ærlig forklaring på, at man ikke ved
noget, er ikke det samme som at vide noget.

---

## 5. CVR — behandles det ens på alle flader? **Nej.**

| Flade | Hvad står der om CVR / verificering |
|---|---|
| `forhandler.html` | "Vi slår ikke op i CVR- eller MitID-registret" · "Der står ikke noget CVR-nummer på denne profil" |
| `index.html` | "vi sætter ikke et 'Verificeret'-stempel på oplysninger, vi ikke har slået op" |
| `sikkerhed.html` | "Vi slår ikke op i CVR- eller MitID-registret, og **der findes derfor heller ikke et 'Verificeret'-mærkat nogen steder på siden**" |
| `sikkerhed.html` | "står der et CVR-nummer på **en annonce**, står der et link ved siden af til CVR-registret" |
| `annonce.html` (forhandler, id 1032) | **Intet CVR, intet link, intet forbehold** — kun "3,2 ★ / 5 Anmeldelser / Medlem siden 2021" præsenteret som bare fakta |
| `vilkaar.html` §2 | "Du kan frivilligt bekræfte din identitet med MitID for at få badget **'Verificeret sælger'**. Kommercielle konti (forhandlere) skal gennemgå en **udvidet verificering (CVR-nummer og virksomhedsoplysninger)**, før de kan opnå badget **'Verificeret forhandler'**." |
| `vilkaar.html` §10 | Forhandleren "bekræfter, at oplysningerne i din virksomhedsprofil (CVR-nummer, virksomhedsnavn) er korrekte" |

**Det er en flad selvmodsigelse.** Sikkerhedssiden siger, at der ikke findes et
"Verificeret"-mærkat nogen steder på siden. Vilkårene — det juridisk bindende
dokument, der er linket i bunden af hver eneste side — beskriver to sådanne
mærkater og en CVR-verificeringsproces, forhandlere skal igennem. Én af de to
tekster lyver for køberen om præcis det spørgsmål, profilsiden findes for at
besvare.

Dertil: sikkerhedssiden lover et link til CVR-registret ved siden af et
CVR-nummer på en annonce. Jeg åbnede alle 51 egne annoncer. **Nul** af dem
viser et CVR-nummer, og nul viser et link. En dokumenteret funktion med nul
forekomster.

Samme mønster to steder mere:

- `sikkerhed.html`: "Ved dyre motorcykler kan du bruge **Bikerbasens 'sikker
  betaling'-flow**, så pengene først frigives til sælger, når du har bekræftet
  modtagelsen." `vilkaar.html` §8 beskriver det som et rigtigt produkt med "en
  ekstern, PCI-certificeret betalingspartner". Jeg gik hele købsflowet igennem
  logget ud — forside, søgning, annonce, profil, kontakt. **Der findes ingen
  betalingsflade nogen steder.** Køberen får at vide, at der er en escrow at
  gribe fat i ved en dyr motorcykel. Det er der ikke.
- `sikkerhed.html` henviser til et **"Under markedspris"-mærke** på annoncer.
  Jeg fandt det på **0** af 24 kort på SRP-side 1 og på 0 annoncesider.

En trustflade, der lover mere, end den leverer, er værre end en, der lover
mindre. Her gør den samme side begge dele.

---

## 6. Reklamationsret — den her er rigtig

Jeg åbnede alle 51 egne annoncer og tjekkede den juridiske sætning:

| Sælgertype | Antal | Tekst |
|---|---|---|
| Egen forhandler | 21 | "Forhandlerannonce. Du har som privatperson **reklamationsret i op til 24 måneder** efter købelovens regler for erhvervsmæssigt salg." |
| Egen privat | 30 | "Privat annonce. Forbrugerkøbelovens reklamationsret **gælder ikke** mellem private. Aftal et grundigt eftersyn og prøvetur, før du køber." |
| MC Syd (forhandler) | stikprøve | forhandlersætningen — **korrekt**, det er erhvervsmæssigt salg |
| Gul og Gratis (privat) | stikprøve | **ingen** reklamationssætning |
| `forhandler.html` | 6 af 6 profiler | forhandlersætningen |

**0 fejl i 51 annoncer + 6 profiler.** Ingen privat annonce bærer en
erhvervsgaranti, ingen forhandlerannonce mangler den. Sikkerhedssiden gentager
reglen ordret ("Står der Forhandler ... Står der Privat sælger, gælder den ret
ikke"). Det er det bedst udførte enkeltpunkt på hele trustfladen, og det er
også det, der koster mest, hvis man tager fejl. Ros — målt.

Ét hul: Gul og Gratis-annoncerne siger *ingenting* om reklamationsret. Formelt
korrekt (privat salg), men en køber, der lige har læst forhandlersætningen på
den forrige annonce, får ikke at vide, at den ikke gælder her.

---

## 7. Anmeldelser — hvor kommer de fra, og kan de spilles?

Målt på alle 6 forhandlerprofiler og alle 51 annoncer:

| Profil | Snit | Anmeldelser | Aktive annoncer |
|---|---|---|---|
| Fyns MC Center ApS | 3,9 | 14 | 4 |
| Nordjysk MC Handel ApS | 3,9 | 12 | 3 |
| Aarhus Motorcykelhus ApS | 3,7 | 9 | 4 |
| Hovedstadens MC Depot ApS | 4,1 | 8 | 5 |
| Roskilde Motorcykler ApS | 3,2 | 5 | 3 |
| Sønderjysk MC Service ApS | **intet snit** | 2 | 2 |

**Reglen om tre.** Under tre anmeldelser vises der intet gennemsnit, og der
står hvorfor:

> "Der er 2 anmeldelser af denne sælger, og vi regner først et gennemsnit fra 3.
> Et snit af to meninger ser ud som en karakter, men er det ikke. Læs dem i
> stedet — de står her."

Jeg testede, om reglen også holder på annoncesiden, hvor pladsen er trang og
fristelsen størst. Den holder: id 1008 (privat, 2 anmeldelser) og id 1025
(forhandler, 2 anmeldelser) viser antal uden snit. Det er ægte disciplin.
Ros — målt.

**Men provenienser oplyses ikke, og påstanden om misbrug holder ikke.**
Der står:

> "Kun indloggede brugere kan bedømme en sælger. Det er dét, der holder antallet
> af opdigtede anmeldelser nede — og gør de anmeldelser, der står her, noget værd."

En profil er gratis, oprettes med e-mail eller ét klik på "Fortsæt med Google",
og siden reklamerer selv med "Opret gratis profil" tre steder. En login-væg
foran en gratis konto er ikke en spærring mod opdigtede anmeldelser — den er en
formalitet. Og der står **intet** om, hvorvidt anmelderen faktisk har handlet
med sælgeren: ingen "handel bekræftet", ingen kobling til en annonce, ingen
handelsdato. "Gør de anmeldelser, der står her, noget værd" er den eneste
sætning på hele trustfladen, der lover for meget — og den står lige under fem
anmeldelser, en køber ikke kan efterprøve.

To ting i demodataene ser ud som en generator: to af fem anmeldelser af
Roskilde Motorcykler ApS er skrevet af "Louise L." og "Louise H.", og en
anmeldelse af et **ApS** lyder "Aftalt tid og sted, og så dukkede **han** ikke
op" — privatpersonssprog om en virksomhed.

**Privat sælger får en karakter, ingen kan læse.** På en privat annonce (id
1002) står "Privat sælger · Vejle · **3,7 ★** · 3 Anmeldelser · Medlem siden
2019" — og der er **ingen "Se sælgerprofil"-knap**. Køberen får et tal uden
adgang til de tre tekster, tallet er lavet af. Det er den sælgertype, hvor
tilliden er sværest, og det er dér, vi viser mindst.

---

## 8. Kontakt — holder løftet fra forsiden?

Flowet, fulgt til ende, logget ud:

1. Annonce → "Log ind og skriv til sælger" → `login.html?redirect=annonce.html%3Fid%3D1032`.
2. Loginsiden viser en kontekstboks: "**Kontakt sælgeren** — Log ind for at se
   sælgerens navn og kontaktoplysninger. Det beskytter både køber og sælger."
3. Profil → "Skriv om en annonce" → `annonce.html?id=1029` (sælgerens nyeste
   annonce), med forklaringen "Kontakt går gennem annoncen, så sælgeren kan se,
   hvilken motorcykel du spørger til."

Redirect-parameteren bevares, og loginsiden ved, hvorfor man er der. Pænt
gjort. Selve beskeden er auth-gated og kan ikke dømmes uden konto —
`bar/GAPS.md` siger, at Bilbasen har samme spærring, så her er der **ikke**
noget at sammenligne.

**Men de to løfter er ikke det samme løfte:**

| Flade | Formulering |
|---|---|
| Forsiden | "Din kontaktinfo er skjult, **indtil du selv deler den**" |
| Forsiden | "Dit telefonnummer og din e-mail deles først, **når du selv vælger det**" |
| Annoncen | "Kontaktoplysninger er kun synlige for **indloggede brugere**" |
| Loginsiden | "**Log ind** for at se sælgerens navn og kontaktoplysninger" |

Forsiden lover sælgeren, at *sælgeren* bestemmer. Annonce- og loginsiden siger,
at *login* er porten. Det er to forskellige mekanismer. Enten kan enhver med en
gratis konto se sælgerens navn og telefonnummer — og så er forsidens løfte
forkert — eller også kan de ikke, og så er loginsidens tekst forkert. Jeg kan
ikke afgøre hvilken uden en konto, men de kan ikke begge være rigtige.

Bilbasen viser til sammenligning "Vis telefonnummer" på annoncen **uden login**
(`bar/desktop/03-listing.png`). Vores model er mere privatlivsvenlig. Den er
bare ikke beskrevet ens to steder.

---

## 9. Sikkerhedsråd — findbare, men ikke motorcykelspecifikke nok

Profilen har en orange stribe: "Mød op personligt · Betal aldrig forud · Skriv
via Bikerbasen · Læs gode råd →", der linker til `sikkerhed.html`. Den ligger
over folden på desktop (y = 400) og på y = 1591 på mobil.

`sikkerhed.html` er 4.157 tegn. Ordscanning:

| Motorcykelspecifikt ord | Findes? |
|---|---|
| registreringsattest | **Ja** |
| motorcykel/motorcykler | Ja |
| **stelnummer** | **Nej** |
| prøvetur (som køberåd) | Nej — kun "prøvekør" |
| nummerplade / DMR / SKAT-opslag | **Nej** |
| synsrapport | Nej |

Rådene er gode og konkrete (svindelmønstre, MobilePay, "aflever kun mod
bekræftet betaling", forudbetalingsadvarsel). Men **stelnummeret** — det ene
tal, der afgør, om en brugt motorcykel er stjålet — nævnes ikke i
sikkerhedsguiden. Ironisk nok nævner MC Syd-annoncerne det: "Se motorcyklen
fysisk, og få **stelnummeret**, før du betaler noget som helst." Rådet findes
altså på siden — bare ikke på den side, der hedder "Sikkerhed & gode råd", og
ikke på profilen.

---

## 10. Mobil 390 — hvad er over folden ved 844 px?

| Element | y-position (px) | Over folden? |
|---|---|---|
| Sælgerens navn (h1) | 135 | Ja |
| Badge "FORHANDLER" + by | ~180 | Ja |
| "Medlem siden 2021" | ~230 | Ja |
| Bedømmelse "3,2 ★ 5 anmeldelser" | 313 | Ja |
| Knap "Skriv om en annonce" | 355 | Ja |
| "Om sælgeren"-tabellen | 586 | Ja (starten) |
| "Ingen af oplysningerne er kontrolleret" | 838 | **Kun 6 px synlige** |
| "Efterprøv forhandleren selv" / CVR-afsnit | 1031 | Nej |
| Reklamationsret | 1352 | Nej |
| "3 motorcykler til salg" | 1539 | Nej |
| Sikkerhedsstriben | 1591 | Nej |
| Første anmeldelse | 3175 | Nej (3,8 folder nede) |
| Sidens bund | 5289 | — |

Folden er velvalgt: navn, sælgertype, by, anciennitet, karakter og
kontaktknappen — alt det, en køber åbner siden for. Ingen scroll-jagt.

To indvendinger:

1. **Den vigtigste sætning på siden ligger lige under kanten.** Forbeholdet
   "Ingen af oplysningerne er kontrolleret af Bikerbasen" begynder ved 838 px af
   844. Karakteren 3,2 og badge'et FORHANDLER står derimod øverst som fakta.
   Køberen ser påstanden over folden og forbeholdet under den.
2. **Der går 1.539 px, før man ser en motorcykel.** På mobil kommer hele
   tillidspanelet før lageret. Det kan forsvares på en tillidsside — men 1,8
   folder er meget for en køber, der klikkede fra en annonce netop for at se,
   hvad forhandleren ellers har stående.

---

## 11. Dansk

Ordscanning af profilsiden mod 18 engelske ord (dealer, seller, listing,
review, rating, profile, contact, verified, member since, ads, price, search,
home, loading, sold, more, view): **0 fund.** Sproget er skrevet, ikke oversat,
og forklaringerne er usædvanligt gode ("Et snit af to meninger ser ud som en
karakter, men er det ikke").

Fejl, jeg fandt:

| Fejl | Hvor | Alvor |
|---|---|---|
| **"Gul og Gratiss egen annonce"** og "Gul og Gratiss kontaktoplysninger" — genitiv af navn på -s skal være "Gul og Gratis'" | alle Gul og Gratis-annoncer (60 i demo, 60 i produktion) | Ægte sprogfejl, står midt på trustfladen |
| Anmeldelsesdialogen på **profilen** har overskriften "**Anmeld annonce**" og tilbyder "FORMODET STJÅLET MOTORCYKEL" / "FALSK ELLER VILDLEDENDE ANNONCE" — mens brødteksten siger "Du anmelder: Roskilde Motorcykler ApS" | `forhandler.html` | Dialogen modsiger sin egen kontekst |
| Bedømmelse vises som "**4 ★**" i stedet for "4,0 ★" (id 1015); de øvrige viser 3,7 / 4,7 / 2,8 | annonceside | Dansk taltypografi |
| Avataren er "RM"-monogram på annoncen, men et butiksikon på profilen | annonce vs. profil | Kosmetisk |

Bilbasens annonceside (`bar/desktop/03-listing.png`) bærer til sammenligning
"HIGHLIGHTS:" som overskrift midt i den danske beskrivelse, "50 Comfort 5d",
"EV Luxury 5d" og en rå udstyrsliste med pipe-tegn direkte fra forhandlerens
system. Vi skriver bedre dansk end referencen — også med vores fire fejl.

---

## 12. Hvad jeg ikke kan sammenligne

`bar/GAPS.md` fastslår, at Bilbasens sælgerprofil ikke er rent tilgængelig
logget ud, og at beskeder er auth-gated hos dem. Det betyder:

- **Profil mod profil:** ingen sammenligning mulig. Jeg opfinder ikke en.
- **Beskedflow:** ingen sammenligning mulig — begge sider kræver konto.
- **Forhandlerblok på annoncen:** her *kan* jeg sammenligne, og det har jeg
  gjort i §4 og §8. Den sammenligning falder ikke ud til vores fordel.

---

## 13. Det, der er godt nok til at forsvare

Ikke ros for indsatsen — kun for det, jeg har målt:

- 0 axe-overtrædelser ved både 1440 og 390. Dokumentbredde præcis 390, ingen
  vandret scroll.
- Ydelse 97, a11y 100 mod referencens 57 / 84 på den nærmeste analoge side.
- 51 af 51 annoncer har korrekt reklamationsretstekst. 0 fejl.
- 24 af 24 kort på SRP-side 1 er mærket med sælgertype. 0 umærkede.
- Reglen "intet gennemsnit under 3 anmeldelser" håndhæves på både profil og
  annonceside — verificeret på to sælgere med præcis 2 anmeldelser.
- Forbeholdet om manglende CVR-/MitID-opslag står på 6 af 6 forhandlerprofiler
  og er ærligt formuleret.
- Login-redirect bevarer kontekst og forklarer hvorfor.
- Tomtilstanden for ukendt sælger er ren og har en vej videre.

## 14. Det, der skal rettes, i rækkefølge

1. **Vilkårene modsiger trustfladen** om "Verificeret"-badges, MitID- og
   CVR-verificering og om "sikker betaling"-flowet. Ret vilkårene, eller byg
   funktionerne. Så længe de står der, lyver siden om sig selv.
2. **Ingen profil er nåelig i produktion** (0 af 392 annoncer). Enten skal
   MC Syd have en profilside — den ville kunne bære både adresse, CVR og
   åbningstider fra deres eget site — eller også skal siden ikke findes.
3. **Ingen eksternt kontrollerbare fakta.** Bed forhandlere om CVR ved
   oprettelse, slå det op mod CVR-registret, og vis nummeret med link. Det er
   ét opslag mod et gratis, offentligt register.
4. **"Under markedspris"-mærket og CVR-linket** er dokumenteret på
   sikkerhedssiden med 0 forekomster i virkeligheden. Fjern eller byg.
5. **Anmeldelser uden handelskobling** markedsføres som troværdige. Enten kobl
   en anmeldelse til en besked eller en annonce, eller drop sætningen om, at
   login gør dem "noget værd".
6. **Privat sælger har karakter uden profil.** Enten skjul karakteren, eller
   giv privatsælgere en profil med anmeldelserne på.
7. **Cookiebanneret er LCP** i 6 af 6 kørsler og koster ~2,3 s. Server det
   statisk i HTML i stedet for at indsætte det med JS.
8. Genitiven "Gul og Gratiss" → "Gul og Gratis'". Anmeldelsesdialogen på
   profilen → overskrift "Anmeld profil" med profilrelevante årsager.
   "4 ★" → "4,0 ★".
9. **Stelnummer** hører til i `sikkerhed.html` og på sikkerhedsstriben.

---

VINDER: findbarhed=Bilbasen tillid=Bilbasen hastighed=os dansk=os
LIGHTHOUSE: ydelse=97 a11y=100 LCP=2.6s CLS=0.035
STØRSTE HUL: Vilkårene lover "Verificeret sælger"- og "Verificeret forhandler"-badges efter MitID- og CVR-verificering samt et escrow-agtigt "sikker betaling"-flow, mens profilen, forsiden og sikkerhedssiden siger, at intet af det findes — ret vilkårene til virkeligheden i dag, og byg derefter det ene, der faktisk betyder noget: et CVR-nummer på forhandlerprofilen, slået op mod CVR-registret og vist med link.
