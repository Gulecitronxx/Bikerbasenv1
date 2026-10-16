# DOM — sælgerprofil, runde 1

Kritiker isoleret. Læst først: `bar/RUBRIC.md`, `bar/GAPS.md` (gap 4 noteret:
baren `04-forhandlerprofil-*.png` er en FORHANDLERprofil og gælder kun vores
forhandlerside; privat sælgerprofil har ingen reference).

Ingen kode læst. Ingen andre domme, DECISIONS.md eller LIGHTHOUSE.md læst.

## Sådan blev siden nået (købervejen)

`soegning.html` → klik annonce → sælgerkort i højre kolonne.

- **Forhandlerannonce** (Yamaha MT-09, id 1001): knappen **"Se sælgerprofil"**
  står under kontakt-CTA'en. Ét klik → `forhandler.html?id=Motorcykel Centret ApS`.
  Vejen findes og er tydelig.
- **Privat annonce**: ingen vej. Kontrolleret på fire private annoncer
  (id 1002, 1007, 1021, 1049) — sælgerkortet viser navnetype, by, stjerner,
  antal anmeldelser og "Medlem siden", men **intet link til en profil**.
  Der findes heller ingen forhandleroversigt/"find en forhandler" nogen steder
  på sitet. Bilbasen har `find-en-forhandler/`.

Bedømt: forhandlerprofil (Motorcykel Centret ApS) + tom-profil-tilstanden
(Bikerbasen Test ApS) + fejltilstand (`?id=findes-ikke-12345`).

## Værktøj

- `resize_window` **virker ikke** i dette Chrome-vindue: efter resize til
  390×844 renderede siden fortsat ~1536 px desktop-layout, og `read_page`
  meldte uændret `Viewport: 1536x639`. 390 px blev i stedet fanget med en
  midlertidig iframe-ramme (slettet igen).
- Branding beskåret på begge sider før dommen; rækkefølgen blandet.
- Lighthouse ikke målt.

## Fakta-optælling — hvad kan siden bakke op?

**Vores forhandlerprofil**

Kan bakkes op (10): Sælgertype · By · Medlem siden 2019 · Aktive annoncer 4
(tæl kortene: 4) · Seneste annonce 12. jul. 2026 · de fire annoncers pris/km/ccm/
kørekort · "Ingen af oplysningerne er kontrolleret af Bikerbasen…" ·
"Forhandlerannonce — reklamationsret i op til 24 måneder" (gældende dansk ret) ·
sikkerhedsbjælken · Anmeld profil.

Kan **ikke** bakkes op (1, og den står øverst):
**"4,5 ★ 1 anmeldelse"**. Den eneste anmeldelse på siden — Anders P.,
4. feb. 2026 — er på **fem** stjerner. Gennemsnittet af én femstjernet
anmeldelse er 5,0, ikke 4,5. Sammenfatningsrækken tegner desuden fem fyldte
stjerner ved siden af tallet 4,5. Samme mønster på annoncerne:
3,8★ af 2 anmeldelser, 3,5★ af 2, 4,3★ af 2, 3,9★ af 4 — ingen af dem er
mulige gennemsnit af hele stjerner ved det antal. Tallene er genereret, ikke
regnet.

Dertil: anmeldelsesformularen ("Har du handlet med sælgeren?") er åben for en
udlogget besøgende med kun navn + kommentar. Ingen login, ingen handelsbevis.
Siden gør altså et ukontrollerbart tal til overskrift, samtidig med at den
selv skriver at intet er kontrolleret.

Tomme/manglende tillidsfelter (6): ingen adresse, intet telefonnummer, ingen
åbningstider, intet kort, ingen hjemmeside, **intet CVR** — selv om CVR står
ét klik væk på annoncen ("CVR oplyst af sælger: 60996224 — slå det op i
CVR-registret"). Profilen taber det bedste kort, den allerede har på hånden.

Ustabilt felt: ved landing vises "Firmanavn: Ikke oplyst" og "Navn på profilen"
i Om sælgeren; ~2 s senere fjernes begge rækker igen og alt nedenunder rykker op.

**Bilbasen (NBC Biler ApS)**

Kan bakkes op (9): navn · logo · Lodbrogsvej 7, 3400 Hillerød · Se på kort ·
Vis åbningstider · to telefonnumre uden login · link til egen hjemmeside ·
"44 biler" · den sorterbare tabel med Dato/Km/l/Kilometer/Modelår/Pris.

Pynt (3): fluebenene "✔ Vi tilbyder Finansiering / ✔ Søndags åbent 11-15 /
✔ www.nbcbiler.dk". Et flueben læses som platformens godkendelse; det er
forhandlerens egen indtastede reklame, uden ét ord forbehold. Men: nul
umulige tal, nul tomme felter på siden.

## Dommen

VINDER: findbarhed=os tillid=Bilbasen hastighed=Bilbasen dansk=os

LIGHTHOUSE: ikke målt

- **Findbarhed — os.** Ét mærket klik ("Se sælgerprofil") fra forhandlerannoncen
  til en profil, hvor hver maskine bærer kørekortbadge (A/A2), ccm, km og
  UNDER MARKEDSPRIS-flag, og hvor listen stadig er læsbar ved 390 px — mens
  referencens 44-rækkers biltabel flyder vandret ud over skærmkanten på mobil;
  det opvejer at private sælgere slet ingen profilvej har (og Bilbasen har
  heller ingen, jf. gap 4).
- **Tillid — Bilbasen.** Vi skriver ærligere om hvad vi *ikke* ved, men til
  80.000 kr. svarer referencen på hvem, hvor og hvordan man ringer — adresse,
  kort, to numre uden login — hvor vi svarer med et stjernetal, der modsiger
  den eneste anmeldelse på siden, og et gættet felt vejer per rubrikken
  tungere end et manglende.
- **Hastighed — Bilbasen.** På uthrottlet localhost maler vores profil først
  en tom skal (header, brødkrumme, en nøgen "Annoncer"-overskrift) i 1-3 s,
  hvorefter hele siden fyldes ud, overskriften skifter til "4 motorcykler til
  salg", og Om sælgeren-panelet går fra 7 til 5 rækker — to synlige
  layoutskift efter tegning, uden skeletter.
- **Dansk følelse — os.** Samme korrekte danske tal- og datoformat som
  referencen (100.500 kr., 12. jul. 2026), men dertil det ordforråd en dansk
  motorcyklist rent faktisk søger på — Kørekort A/A2, ccm, hk, Naked,
  Adventure/Enduro — plus en sætning ingen oversætter skriver:
  "reklamationsret i op til 24 måneder efter købelovens regler for
  erhvervsmæssigt salg". (Eneste skår: footerens "Priser vises i DKK.")

STØRSTE HUL: Stjernetallet på sælgerprofilen og på alle annoncekort er
opdigtet — "4,5 af 1 anmeldelse" står over én femstjernet anmeldelse, og
3,8/3,5/4,3 af 2 og 3,9 af 4 er aritmetisk umulige gennemsnit — så beregn
bedømmelsen ud fra de faktiske anmeldelser, skjul den helt under f.eks. tre
anmeldelser, og luk den åbne udlogget-anmeldelsesformular, der lader hvem
som helst fodre tallet.
