# DOM — annoncedetalje, runde 1

Dømt blindt mod `bar/03-annonce-detalje-{desktop-1440,mobil-390}.png`, branding beskåret
på begge sider. Målt på egne annoncer `annonce.html?id=1003` (forhandler) og `?id=1021`
(privat), 1440x900 og 390x844.

**Indekseret ekstern annonce kunne ikke dømmes:** de indekserede kort på søgesiden linker
direkte til `mcsyd.dk`. Der findes ingen detaljeside hos os for dem.

VINDER: findbarhed=os tillid=Bilbasen hastighed=Bilbasen dansk=os
LIGHTHOUSE: ydelse=68 a11y=96 LCP=7.1s CLS=0.00 (FCP 3,6 s · TBT 82 ms · mobil-emulering)
STØRSTE HUL: Galleriet opdigter fotos — en annonce uden ét eneste billede vises som "1 / 4" med pil-frem, fire miniaturer og knapper mærket "Billede 1–4", der alle er den samme tegnede motorcykel, mens samme annonces kort i søgeresultatet ærligt siger "Intet foto"; erstat karrusellen med ét felt der siger "Ingen fotos i denne annonce", når der er nul billeder.

## Hvorfor, én sætning pr. kategori

- **Findbarhed — os:** Kørekort A-badget, Type-feltet med ccm/hk og brødkrummen der går til
  `soegning.html?type=adventure` plus tre reelle "Lignende annoncer" besvarer "må jeg køre
  den, og vis mig flere som den" på ét klik — noget en bilside strukturelt ikke kan.
- **Tillid — Bilbasen:** Referencen viser 17 rigtige fotos af den faktiske maskine, sælgerens
  navn, adresse, hjemmeside, CVR og telefonnummer uden login; vores viser en tegnet motorcykel
  udgivet for at være fire fotos, ingen sælgernavn, og en "Ring op"-knap der er en login-væg.
- **Hastighed — Bilbasen (på forfald):** Vores side falder under det ikke-forhandlelige gulv —
  ydelse 68 og a11y 96 mod kravet 95/100, og LCP på 7,1 s fordi hele annoncen først hentes fra
  Supabase efter at supabase-js er downloadet fra jsdelivr; CLS 0,002 er det eneste grønne tal.
- **Dansk følelse — os:** `201.000 kr.`, `25. jul. 2026`, `1.254 ccm`, `Adventure/Enduro`,
  `Kørekort A`, "Forbrugerkøbelovens reklamationsret gælder ikke mellem private" og
  "slå det op i CVR-registret" er skrevet af en dansker til MC-folk, uden ét engelsk lån.

## Noter der ikke passede i formatet

- `annonce.html?id=99999` giver en ren, dansk tom-tilstand ("Annoncen findes ikke — den er
  måske solgt og fjernet") med vej videre. Stærkt.
- "CVR oplyst af sælger: 93053726 — slå det op i CVR-registret" er en bedre tillidsformulering
  end referencens egen. Behold den.
- Forhandlernavnet er ikke et link: ingen vej til forhandlerens øvrige annoncer, adresse eller
  hjemmeside. Referencen har alle tre.
- Desktop: højre spalte er tom fra ca. y=1000 og ned; ~50 % af siden er dødt hvidt felt ved siden
  af beskrivelsen. Specifikationstabellen har en tom grå celle i sidste række.
- a11y-fejlene er præcise og små: `.avatar` har kontrast 4,19 (#c6420e på #ffe6d9), og
  bundbjælkens knap hedder "Ring op" men har `aria-label="Vis telefonnummer"`.
- Mobil: den faste bundbjælke med "Skriv til sælger"/"Ring op" er et bedre mønster end
  referencens knapper i toppen — men begge fører til login, så gevinsten er teoretisk.
- Beskrivelsesteksten er ordret den samme skabelon på tværs af annoncer (kun modelnavnet skifter).
