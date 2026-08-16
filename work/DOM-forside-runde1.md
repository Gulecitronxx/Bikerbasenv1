# DOM — forside, runde 1

Dømt mod bar/01-forside-{desktop-1440,mobil-390}.png. Branding beskaaret paa
begge (oeverste ~72 px) foer sammenligning. Ingen kode laest.

VINDER: findbarhed=os tillid=os hastighed=Bilbasen dansk=os
LIGHTHOUSE: ydelse=63 a11y=100 LCP=6.9s CLS=0.00 (mobil-emulering, 4x CPU)
STOERSTE HUL: Forsiden falder som den eneste kategori under det maalte gulv — H1 er selv LCP-element ved 6,9 s fordi CSS/JS er render-blokerende og ukomprimeret (263 KiB at spare) og alle otte type-billeder hentes eagerly; inline kritisk CSS, preload de to woff2, minificer+defer JS og saet loading="lazy" paa /img/type/*.webp, saa H1 maler under 1,8 s.

## Hvorfor, en saetning pr. kategori

- **Findbarhed (os):** To klik fra forside til "A2 under 60.000 kr." = 14 traeffere
  med A1/A2/A over folden paa baade 1440 og 390, praecise MC-typer, levende
  taeller og en resultatlinje der siger hvad der er skjult og hvorfor —
  referencen bruger sin fold paa en deaktiveret "Model"-dropdown.
- **Tillid (os):** Vores tal staar stille (383 i overskrift = 383 paa knappen,
  identisk over tre genindlaesninger), saelgertype staar paa hvert kort uden
  klik, og "Vi gaetter aldrig"-linjen navngiver de 332 annoncer uden
  hk-oplysning — referencen modsiger sig selv paa samme skaerm (50.356 annoncer
  i overskriften mod "Vis 40.476 biler" paa knappen).
- **Hastighed (Bilbasen):** Gulvet er ikke til forhandling, og vi rammer 63 i
  ydelse med LCP 6,9 s; dertil staar taellerlinjen tom i ~2,2 s og headeren
  viser "Mine annoncer"/"Opret annonce" til en udlogget bruger i de foerste
  ~2 s, foer de forsvinder.
- **Dansk foelelse (os):** `12.000 kr.`, "3 uger siden", A1/A2/A og praecis den
  MC-taksonomi danskere bruger (Sport, Touring, Cruiser, Naked,
  Adventure/Enduro, Scooter, Classic/Veteran, Cross/MX) — ingen
  oversaettervendinger.

## Noter til naeste runde (ikke en del af dommen)

- "UNDER MARKEDSPRIS" paa en 1968 Nimbus til 12.000 kr. er praecis det gaettede
  felt, rubrikken vejer tungest imod — og det modsiger "Vi gaetter aldrig".
- "Nyeste annoncer / Lige landet paa Bikerbasen": alle otte kort siger
  "3 uger siden".
- Forsiden siger "53 annoncer mangler den oplysning"; ét klik senere siger
  resultatsiden "75 annoncer er ikke vist". To tal for samme foelelse.
- Ca. halvdelen af kortene i "Nyeste annoncer" er "Intet foto".
- CLS = 0, plads til taelleren er reserveret, a11y = 100. Det er solidt.
