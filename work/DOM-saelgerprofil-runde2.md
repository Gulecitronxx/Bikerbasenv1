# DOM — sælgerprofil, runde 2 (frisk kritiker, udlogget)

Målt 16.08.2026 på http://localhost:60745. Bar: `bar/04-forhandlerprofil-desktop-1440.png`
og `-mobil-390.png` (NBC Biler ApS), branding beskåret før sammenligning.
GAP 4 respekteret: baren er en FORHANDLERprofil. Vores private sælger dømmes på
eget flow + gulvet.

## Vejen som køber

- `soegning.html` → 383 annoncer, heraf **51 på Bikerbasen og 332 indekseret hos MC Syd**.
- Forhandlerannonce (`annonce.html?id=1008`, Honda CBR600RR) → **to** mærkede veje til
  profilen: sælgernavnet er et link, og en knap "Se sælgerprofil".
  → `forhandler.html?id=Bike%20House%20Aarhus`. Fandt den uden at tænke.
- Privatannonce (`annonce.html?id=1032` og `?id=1010`) → **ingen vej overhovedet**.
  Sælgerboksen har kun "Log ind og skriv til sælger" og "Opret gratis profil".
  Ingen profil-link, intet navn, ingen anmeldelser at klikke på.
- MC Syd-annoncer (332 af 383) → kortet fører ud af sitet. `forhandler.html?id=MC Syd`
  giver "Vi kunne ikke finde sælgeren" (pæn dansk tom-tilstand med vej videre).

## 1. Tallene siden viser om sælgeren — hvor mange kan efterprøves?

**Forhandlerprofilen: 4 ud af 5.**

| Tal | Kan det efterprøves på siden selv? |
|---|---|
| Bedømmelse **4,2** | ✅ 3+5+4+4+4+5 = 25 · 25/6 = 4,17 → 4,2. Regnestykket passer. |
| **6** anmeldelser | ✅ seks anmeldelser står listet. |
| Aktive annoncer **2** | ✅ overskriften siger "2 motorcykler til salg", to kort. |
| Seneste annonce **17. jul. 2026** | ✅ matcher annonce 1008's oprettelsesdato. |
| Medlem siden **2017** | ❌ intet på siden bakker det op. Ældste anmeldelse er 13. mar. 2026. |

Det er stærkt — gennemsnittet kan regnes efter af køberen selv. **Men indholdet
undergraver tallet:** sætningen *"Lidt langsom til at svare, men ærlig omkring
standen."* står **ordret 4 af 6 gange**, og stjernerne modsiger teksten
(Jonas H. ★★★ til ren ros; Anders M. ★★★★★ til en klage). En dansker læser det
som opdigtet på fem sekunder — netop dét, som gate-teksten under ("holder antallet
af opdigtede anmeldelser nede") lover at forhindre.

**Privatannonce (id=1010): 0 ud af 3.** Boksen viser "3,8 ★ Bedømmelse · 5 Anmeldelser
· 2018 Medlem siden" — og der er ingen profilside, ingen liste, intet link. Et tal
uden dækning vejer tungere imod end et manglende felt.

## 2. Modsigelser mellem to klik

- **CVR forsvinder.** Annoncen: "CVR oplyst af sælger: 95854101 — slå det op i
  CVR-registret" (link til datacvr.virk.dk). Profilen: **intet CVR**. Det eneste
  efterprøvelige identitetsfelt findes kun ét klik væk fra der, hvor man leder.
- **CVR'et kan ikke findes.** 95854101 fejler modulus-11-kontrolcifferet
  (9·2+5·7+8·6+5·5+4·4+1·3+0·2+1·1 = 146; 146 mod 11 = 3 ≠ 0). Opslagslinket —
  sidens eneste verifikations-affordance — kan ikke give et resultat.
  (Ved ét enkelt, ikke-reproducerbart load af id=1044 stod der 76827486 i stedet;
  kunne ikke gentages over 10 loads, så det tæller ikke i dommen.)
- **By vs. navn vs. annoncer.** "Bike House Aarhus", profilen siger By: Næstved,
  og de to annoncer ligger i Næstved og Hillerød. Ingen af de tre er Aarhus, og
  profilens ene "By" dækker ikke to regioner. Intet forklarer det.
- **Enige om resten:** by (Næstved), medlem siden (2017), 4,2 og 6 anmeldelser er
  identiske på annonce og profil. Ingen konflikt der.
- **Forbeholdet er selv forkert.** "Ingen af oplysningerne er kontrolleret af
  Bikerbasen. De er tastet ind af sælgeren selv." — men Medlem siden, Aktive
  annoncer, Seneste annonce og bedømmelsen er platformens egne tal, ikke sælgerens.
  Ærligheden er rigtig, formuleringen er det ikke.

## 3. Anmeldelsesformularen (udlogget)

Rigtigt bygget. Der er **ingen formular** — der er en port:
"Har du handlet med sælgeren? · Kun indloggede brugere kan bedømme en sælger …" +
knappen "Log ind og bedøm" → `login.html?redirect=forhandler.html%3Fid%3DBike%2520House%2520Aarhus`
(korrekt dobbelt-encodet, fører tilbage til samme profil).
**Kravet står FØR man skriver**, ikke bagefter. Ingen spildt tastning, ingen
"nå, du skulle have været logget ind". Det er bedre end baren, som slet ikke har
anmeldelser.

## 4. Layout mod baren

- **Mobil 390×844: vi vinder klart.** Baren (NBC Biler) klipper beskrivelsesteksten
  af i højre kant og propper en desktop-tabel med 7 kolonner ind på 390px, så
  modelnavnene løber ud over skærmen med vandret scroll. Vores er ét rent
  spor: sælgerkort → "Om sælgeren" → stablede annoncekort. Ingen vandret overløb.
- **Desktop 1440×900: baren er tættere.** Vores anmeldelses-sektion bruger kun
  venstre halvdel, så ~700px højre kolonne står helt tom under sidebaren.
- **Det baren har, som vi ikke har:** gadeadresse (Lodbrogsvej 7, 3400 Hillerød),
  "Se på kort", "Vis åbningstider", to telefonnumre, link til forhandlerens
  hjemmeside, fritekst-beskrivelse. Vi har kun bynavnet "Næstved".
  **Det vi har, som baren ikke har:** bedømmelse, anmeldelser, medlem siden,
  antal aktive annoncer, seneste annonce, og et eksplicit "intet er kontrolleret".

## 5. Gulvet

Lighthouse 12.8.2, mobil-emulering, simuleret throttling, to kørsler, identiske:
`forhandler.html?id=Bike House Aarhus` → **ydelse 65, tilgængelighed 97,
LCP 6,1 s, CLS 0, FCP 4,8 s, TBT 50 ms**.

- Gulvet (≥95 / =100 / grøn CWV) er **ikke** nået. Kategorien er tabt pr. rubrikken.
- CLS 0 er den ene gode nyhed — intet flytter sig efter det er tegnet.
- LCP-elementet er **cookiebannerets tekst**. Det største, en køber ser på en
  sælgerprofil, er cookiebeskeden.
- A11y-fejlen er konkret og rammer præcis det tillidskritiske: `aria-prohibited-attr`
  på 7 elementer — `<span class="review-stars" aria-label="4,2 ud af 5 stjerner">`.
  aria-label på en bar span uden rolle bliver ignoreret, så en skærmlæser får
  **ingen** stjernevurdering, hverken gennemsnittet eller de seks enkelte.
- Reelle app-tal bag ydelsen: 188 KiB ubrugt CSS, 40 KiB ubrugt JS. (Dev-serveren
  komprimerer ikke — 302 KiB af "besparelsen" er serverartefakt — men gulvet er
  ikke til forhandling.)

---

VINDER: findbarhed=os tillid=Bilbasen hastighed=Bilbasen dansk=os
LIGHTHOUSE: ydelse=65 a11y=97 LCP=6.1s CLS=0.00
STØRSTE HUL: Forhandlerprofilen har ingen fysisk identitet at efterprøve — CVR'et
står kun på annoncen og fejler sit eget kontrolciffer, og profilen mangler
gadeadresse, åbningstider, telefon og hjemmeside, som baren giver på første skærm.
