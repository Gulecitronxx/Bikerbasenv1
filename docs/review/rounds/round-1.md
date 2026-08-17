# Runde 1 — verifikation

**Rolle:** `critic`, anden opgave (verifikation). Jeg retter ikke.
**Målt:** 17.08.2026, kl. 19:03–19:30 (CEST).
**Verificeret på:** `4e518a0` = `origin/main` = det, der ligger i drift.
Fikserne `6ab87fe`, `6d150fb`, `baa7add`, `5ca02d8`, `f7dbe76` er alle
efterprøvet som forfædre til `origin/main` (`git merge-base --is-ancestor`).

**Ingen produktionsfil er rørt.** Ingen skrivning til databasen — de 332 rækker
er læst med anonyme GET mod REST-API'et og hashen genberegnet lokalt.
Værn-afprøvningen af `scripts/udgiv.js` er kørt på en `git archive`-kopi i
scratchpad, ikke i arbejdstræet, og kopien er slettet efter.

**Note om arbejdstræet:** kl. 19:24–19:26 dukkede `scripts/shared.js`,
`scripts/build-brand-pages.js` og `_maal.js` op som ændrede/utrackede — det er
en anden agents igangværende arbejde (C-014/D-009 og et kontrastmåleværktøj).
Ikke mit, ikke rørt. Mine målinger af `_site/` er fra kl. 19:05, altså før de
ændringer.

**Metode:** dev-serveren på `:55559` (som serverer dette worktree, efterprøvet
på md5 af `js/components.js`) er brugt som den var. Ingen ny server startet,
ingen lukket. `:55945` er stadig død. Klik og tastetryk er RIGTIGE mus- og
tastaturhændelser gennem Playwright, ikke `element.focus()` eller
`element.click()`.

---

## Facit

| ID | dev's melding | min dom |
|---|---|---|
| D-003 | rettet i `6ab87fe` | **verificeret** |
| C-001 | rettet i `6d150fb` | **verificeret** |
| C-011 | rettet i `baa7add` | **GENÅBNET** |
| D-006 | rettet i `5ca02d8` | **verificeret** |
| C-010 | afvist i `f7dbe76` | **afvisning accepteret** |

Fire af fem holder. Den femte er ikke løst, og den er stadig P1.

---

## D-003 — verificeret

**Påstand:** kortet peger nu på `annonce.html?id=<uuid>`, kilde-CTA'en er
304×24 px = 3,6 % af kortet, ordlyd og `rel=nofollow` uændret, samme rettelse i
listevisningen.

**Efterprøvet med rigtige museklik, 390×844, `soegning.html` (20 eksterne kort,
4 egne):**

| Handling | Resultat |
|---|---|
| Klik midt på kortet (`a.card-link`, 342×602, 99,3 % af kortet, `target` = ingen) | Landede på `http://localhost:55559/annonce.html?id=0098fee2-…` — **vores egen side** |
| Klik på CTA-linjen (`a.card-external-cta`) | Ny fane til `mcsyd.dk/Produkter/…/180898`. Vores fane blev stående på `soegning.html` |
| Klik på rækkefladen i listevisning (`a.row-link`, 342×298) | `annonce.html?id=0098fee2-…` |

**Tegner vores side den eksterne annonce?** Ja. `.external-detail` findes,
`<h1>` = "Honda CB 1000 Hornet Street", `<title>` = "Honda CB 1000 Hornet
Street hos MC Syd — Bikerbasen", dokumentet er 5.743 px, og kørekortdommen står
med sit regnestykke: *"Regnet ud fra 1.000 ccm og 152 hk … få det bekræftet hos
MC Syd."* Det er præcis den oplysning, findingen sagde ingen køber kunne komme
frem til. `<meta name="robots">` er stadig `noindex, follow`, som den skal være.

**Er CTA'en 24 px høj?** Ja. Målt 310×24 px = 7.440 px² af kortets 343×603 =
206.829 px² → **3,60 %**. Dev skrev 304×24 = 3,6 %; procenten er præcis, bredden
6 px ved siden af (rullebjælke). SC 2.5.8 kræver 24×24 CSS px for et mål, der
ikke er inline i en sætning — 24 er nået, ikke overskredet. I listevisningen er
`.row-cta` 101×24, samme dom.

**Ordlyd og attributter uændret:** teksten er "Se annoncen hos MC Syd",
`target="_blank"`, `rel="noopener noreferrer nofollow"`. `aria-label`en er
delt rigtigt: kortfladen siger nu "Se annonce: … — hos MC Syd" (uden "åbner i
ny fane", som den ikke længere gør), CTA'en beholder "(åbner i ny fane)".

**Lagdelingen holder:** CTA'en har `z-index: 2`, kortfladen `z-index: 1`, og en
hit-test midt på CTA-linjen returnerer CTA'en. Et fejlklik ved siden af rammer
kortet — altså vores egen side — og det er den rigtige vej at fejle.

Swipe-visningen bruger samme `externalCardHTML()` og har derfor samme to links.
Alle tre visninger giver nu ét og samme svar på "hvor fører et klik hen".

---

## C-001 — verificeret

**Påstand:** `path: .` → `path: _site` bygget af `scripts/udgiv.js`, som følger
hver lokal reference og afbryder, hvis en mangler.

### 1. Hvad ligger i `_site`

`node scripts/udgiv.js` → `_site: 60 filer, 14 HTML-sider` (rod 24, css 1,
fonts 2, img 13, js 20), exit 0.

Ingen af de forbudte mapper er med. Efterprøvet én for én:
`supabase/`, `crawler/`, `sources/`, `work/`, `docs/`, `.claude/`, `.github/`,
`scripts/`, `node_modules/`, `bar/` — **alle fraværende**.
`find _site -name "*.test.js"` → **0**.
Ingen `.sql`, `.md`, `.yaml`, `.yml`, `.env`, `.pem`, `.key` i `_site`.

### 2. Er alt, siderne har brug for, med

`js/` (20 filer) og `img/` (13 filer, inkl. `img/type/`) er identiske med
repoets, når `*.test.js` er fraregnet. Alle 14 rod-HTML-sider,
`CNAME`, `.nojekyll`, `robots.txt`, `sitemap.xml`, favicons, logoer,
`og-image.png` er med. Af repoets sporede rodfiler er kun `.gitignore`,
`package.json` og `package-lock.json` udeladt, og ingen af dem refereres af en
side. Der er ingen fil i `_site`, som ikke er i git.

### 3. Værnet, afprøvet

Kørt på en `git archive HEAD`-kopi, så arbejdstræet ikke blev rørt:

| Prøve | Exit | Melding |
|---|---|---|
| `js/data.js` flyttet væk | **1** | AFBRUDT, 14 referencer listet (`soegning.html → js/data.js` …) |
| `img/hero-800.webp` flyttet væk | **1** | AFBRUDT, `index.html → img/hero-800.webp` |
| `img/type/sport.webp` flyttet væk | **1** | AFBRUDT, `opret-annonce.html → img/type/sport.webp` |
| `css/styles.css` flyttet væk | **1** | crasher på `scandir _site/css` i stedet for at afbryde pænt — buildet fejler stadig, men meldingen er en stak, ikke en liste |
| `js/hemmelighed.sql` plantet | 0 | ikke kopieret (allowlisten på `js/` er `\.js$`), ikke udgivet |
| `HEMMELIG.md` plantet i roden | 0 | ikke kopieret (matcher ingen `RODMOENSTRE`), ikke udgivet |
| baseline igen | 0 | 60 filer, alle referencer på plads |

Værnet fanger altså det, det skal. To bemærkninger, ingen af dem blokerende:

- `FORBUDTE_TYPER` er i praksis uopnåelig kode. En `.sql` i `js/` filtreres
  væk af `tillad`-mønsteret, før dobbeltbunden kan se den, og en `.md` i roden
  matcher ingen `RODMOENSTRE`. Det er ikke et hul — allowlisten stopper dem —
  men listen beskytter ikke mod noget, der kan nå den.
- Referencescanneren læser kun HTML- og CSS-attributter. `img/type/*.webp`
  bygges også i en template-streng i `js/home.js:387`; den slags fanges ikke.
  Det gør ingen skade i dag, fordi `img/` kopieres HEL, men et nyt asset, der
  KUN nævnes fra JS og lever uden for de fire mapper, ville slippe forbi
  værnet. Sig det i kommentaren, hvis det skal blive ved at være sandt.

### 4. Drift

`origin/main` fik fikserne kl. **19:03:27 +0200**. Målt kl. **19:07:51–19:08**,
altså 4½ minut efter push:

| Kode | Adresse |
|---|---|
| **404** | `supabase/schema.sql` |
| **404** | `supabase/016_luk_skrivehul.sql` |
| **404** | `sources/mcsyd.yaml` |
| **404** | `crawler/config.js` |
| **404** | `work/DECISIONS.md` |
| **404** | `docs/review/BACKLOG.md`, `docs/review/runde-1-critic.md` |
| **404** | `scripts/shared.js`, `scripts/udgiv.js`, `package.json`, `js/eksternt-kort.test.js` |
| 200 | `index.html`, `css/styles.css`, `js/components.js`, `robots.txt`, `sitemap.xml`, `img/type/sport.webp` |

Alle fem læk fra findingen er lukkede, og auditrapporterne — som var på vej ud
ved næste push — er lukkede før de kom ud.

**At deployet ER det nye, og ikke et gammelt:** `js/components.js` og
`css/styles.css` fra drift har md5 identisk med `git show 4e518a0:` på samme
filer, og drift-kopien af `components.js` indeholder
`<a href="annonce.html?id=${l.id}" class="card-link"` — D-003's rettelse. Det er
altså HEAD, der ligger på domænet, målt 4½ minut efter push.

---

## C-011 — GENÅBNET

**Påstand:** `markerBorte()` kræver nu mindst 60 % af det højeste fund i de tre
sammenlignede kørsler, værnet ligger i `db.js`, og ved fundet=0 og fundet=100
sendes der slet ikke et UPDATE.

**Dev's egne påstande holder.** Efterprøvet med en attrap-klient, der
registrerer om der overhovedet sendes et `update`, mod den RIGTIGE
`db.markerBorte()`:

| fundet | historik | UPDATE sendt |
|---|---|---|
| 0 | 332, 332, 332 | **NEJ** — "kørslen fandt nul annoncer" |
| 100 | 332, 332, 332 | **NEJ** — "fandt 100 … op til 332 (30 % — grænsen er 60 %)" |
| 200 | 332, 332, 332 | JA |
| 330 | 332, 332, 332 | JA |

Grænsen ligger, hvor den er skrevet: 199 mod 332 blokerer, 200 markerer.
Referencen ER maksimum, ikke medianen (150 mod `[332, 200, 180]` blokerer).
Værnet ligger i `db.js` og fyrer før skrivningen. Alt det er sandt.

**Og findingen er alligevel ikke løst.** Værnet har en omvej, og den er ét
gennemløb fra den fejl, findingen beskrev:

```
fundet=0  historik=[332,332,332]  -> BLOKERER   (kørsel 1 efter DOM-skiftet)
fundet=0  historik=[0,332,332]    -> BLOKERER   (kørsel 2)
fundet=0  historik=[0,0,332]      -> BLOKERER   (kørsel 3)
fundet=5  historik=[0,0,0]        -> UPDATE {status:'borte'} SENDT, 327 rækker
fundet=1  historik=[0,0,0]        -> UPDATE {status:'borte'} SENDT, 327 rækker
```

Mekanikken, linje for linje:

1. `crawler/pipeline.js:216` kalder `afslutKoersel()` også for en kørsel, hvor
   værnet sprang markeringen over. Kørslen skrives derfor til `crawl_koersler`
   med `afsluttet` sat og `fundet: 0`.
2. Efter tre nul-kørsler er de tre nyeste afsluttede kørsler `[0, 0, 0]`.
3. `bortemarkeringVurdering()` i `crawler/db.js:255` filtrerer historikken med
   `.filter(n => n > 0)`. De tre nuller ryger ud, `kendte` er tom, og den tomme
   mængde læses som *"ingen tidligere kørsel med fund at sammenligne med"* →
   `tilladt: true`.
4. Den fjerde kørsel behøver kun at finde ÉN annonce. `graense` bliver starten
   på den tredjesidste kørsel; alle 332 rækker har `sidst_set` ældre end det,
   og 327 af dem får `status = 'borte'`. Politikken "ekstern: offentlig
   laesning" (`status <> 'borte'`) skjuler dem.

Det er C-011's udfald ordret — "Sitet går fra 332 annoncer til 0" — bare med et
gennemløb mere på vejen. Og udløseren er stadig et omdøbt CSS-navn hos MC Syd:
et selector-skift, der giver nul kort, efterfulgt af én kørsel hvor en enkelt
annonce parser igennem (én side med gammelt markup, et cache-svar, en delvis
rettelse af selectoren). Fire kørsler i stedet for tre.

Værnet PRODUCERER selv den historik, der åbner omvejen. Det er det, der gør det
til et hul og ikke et hjørne: jo længere værnet holder, jo tættere kommer
historikken på `[0,0,0]`.

**Testen låser hullet fast.** `crawler/borte.test.js:65-72`:

```
test('en helt ny kilde uden tidligere fund må markere', () => {
  const dom = bortemarkeringVurdering(48, [0, 0, 0]);
  assert.equal(dom.tilladt, true);
```

Begrundelsen i testen er reel — en kilde, hvis tre første kørsler alle stod på
0, skal kunne komme videre. Men koden kan ikke skelne "helt ny kilde, der aldrig
har fundet noget" fra "kendt kilde med 332 rækker, hvis parser brækkede for tre
kørsler siden". De to producerer den samme historik, og vurderingen får ikke
noget at skelne på.

**Det, der mangler, er det tal, findingen faktisk handler om:** hvor mange
rækker kilden HAR i dag. En helt ny kilde har nul aktive rækker; MC Syd har 332.
Sammenlignes fundet med antallet af aktive rækker for `kilde_id` — og ikke kun
med hvad tidligere kørsler fandt — forsvinder omvejen, og den ægte nye kilde
kan stadig markere. Samme forespørgsel, samme funktion, ét ekstra tal.

**Sideordnet, ikke grunden til genåbningen** — svaret på "kan tre faldende
kørsler stadig glide igennem?": nej, tre kan ikke, men tolv kan. Værnet er en
hastighedsbegrænser, ikke et gulv. Med maksimum af et vindue på tre kan hvert
40 %-fald passere efter tre kørsler på plateauet:

```
vindue[332,332,332] max=332 -> lavest tilladte fund = 200
vindue[200,200,200] max=200 -> lavest tilladte fund = 120
vindue[120,120,120] max=120 -> lavest tilladte fund =  72
vindue[ 72, 72, 72] max= 72 -> lavest tilladte fund =  44
vindue[ 44, 44, 44] max= 44 -> lavest tilladte fund =  27
```

332 → 27 over fjorten kørsler, med markering tilladt hele vejen. Dev's egen
formulering ("55 % tre gange = 17 % glider igennem") er sand for tre kørsler i
træk og kun for tre. Det er formentlig acceptabelt og delvis med vilje — et
ægte fald skal kunne anerkendes til sidst, og loggen siger det højt — men det
skal stå rigtigt et sted, ikke som "gradvis udhuling er lukket".

Andet, jeg målte og som er i orden: `null`, `undefined`, `''`, `NaN`, `'mange'`
og `-5` som `fundet` afvises alle. Færre end tre afsluttede kørsler markerer
ikke. Skrald i historikken løfter ikke referencen. Loggens ordlyd bærer tallene.
Én kosmetik: ved fundet=199 mod 332 skriver begrundelsen "(60 % — grænsen er
60 %)", fordi den runder — en operatør læser det som "den var på grænsen og
blev afvist alligevel".

---

## D-006 — verificeret

**Påstand:** `scroll-padding-top` globalt og `scroll-padding-bottom` scopet med
`html:has(body.har-actionbar)`, fokus efter rettelsen på y 399-437 med overlap 0
i begge retninger.

**Efterprøvet med RIGTIGE tastetryk** (`page.keyboard.press`, ikke
`element.focus()`), `annonce.html?id=1021`, 390×844. Header 0-68 sticky,
handlingsbjælken 775-844 (69 px høj), `scroll-padding-top: 68px`,
`scroll-padding-bottom: 76px`.

| Retning | Tastetryk | Fokusringe dækket af header eller bjælke |
|---|---|---|
| **Tab** fra dokumentets start | 35 | **0** |
| **Shift+Tab** fra dokumentets slutning | 42 | **0** |

Tre tilfælde ser i en rå måling ud som overlap og er det ikke:

- "Skriv til sælger" og "Vis nummer" (786-834) overlapper bjælken 775-844 med
  48 px — de ER bjælkens egne knapper. De ligger oven på, ikke bagved.
- Skip-linket "Gå til indhold" (0-44) overlapper headeren 0-68 med 44 px. Det
  har `z-index: 1000` mod headerens 100, og en hit-test midt i dets egen kasse
  returnerer skip-linket selv. Synligt, ikke skjult.

Findingens to konkrete elementer, samme side, samme taster:
"Alle BMW til salg" landede på **y 399-437**, overlap 0 begge veje — dev's tal
præcist. "Motorcykler til A-kørekort", som før stod 800-838 bag bjælken, landede
på **y 439-477**, overlap 0.

**Holder scopet?** Ja, og det er efterprøvet på alle 15 sider (de 14 plus
`404.html`) i to viewports, med `getComputedStyle(document.documentElement)`:

| | `scroll-padding-top` | `scroll-padding-bottom` |
|---|---|---|
| Alle 15 sider, 390×844 | **68px** | `auto` — undtagen `annonce.html?id=1021` |
| `annonce.html?id=1021`, 390×844 (bjælke synlig, 69 px) | 68px | **76px** |
| `annonce.html?id=<uuid>` (EKSTERN annonce, ingen bjælke), 390×844 | 68px | `auto` |
| Alle 15 sider, 1280×800 | 68px | `auto` |
| `annonce.html?id=1021`, 1280×800 (bjælken `display:none`) | 68px | `auto` |

Ingen side uden handlingsbjælke holder 76 px fri af ingenting — heller ikke den
eksterne annonceside, som HAR `annonce.html` som skabelon men ikke får
`body.har-actionbar`. Topreglen gælder alle sider, som findingen krævede.
`--actionbar-h` bruges både af `body.har-actionbar{padding-bottom}` og af
`scroll-padding-bottom`, så højden står ét sted. `npm test` 147/147 grønne,
heraf tre nye vagthunde i `js/scroll-padding.test.js`.

**D-006 som skrevet er løst.** Begge ender, som findingen navngav, er fri.

### Et selvstændigt forhold, samme succeskriterium

Ikke en genåbning af D-006, og dev har selv skrevet det i kommentaren i
`css/styles.css`: cookiebanneret er også `position: fixed` i bunden, på ALLE
sider, indtil man har svaret. Jeg målte det, fordi det afgør om man kan sige
"SC 2.4.11 er opfyldt" eller kun "de to rapporterede ender er lukkede".

Målt på `annonce.html?id=1021`, 390×844, tømt storage, rigtige Tab-tryk:
banneret er **187 px** (y 658-844), `--cookie-h: 187px`,
`scroll-padding-bottom` er stadig 76px. **5 af 30 Tab-stop lander delvis eller
helt bag banneret** — "Se sælgerprofil" (699-747) har alle 48 px af sin
blækkasse bag banneret, altså fuldstændigt skjult; "Log ind og skriv til
sælger" 31 px; tre annoncekort 110-111 px.

Det er første besøg på hver af de 14 sider. Højden ligger i `--cookie-h` på
`document.body`, og et `html`-regelsæt kan ikke læse en variabel på `body` — så
det er ikke en linje mere i samme rettelse, det er et selvstændigt valg
(flyt variablen til `:root`, eller sæt `scroll-padding-bottom` fra JS samtidig
med `--cookie-h`). Skrevet her med målingen, så runde 2 kan tage stilling til
den. Den hører hos et menneske, ikke hos mig.

---

## C-010 — afvisningen accepteres

**Er målingen rigtig?** Ja. Genmålt uafhængigt kl. 19:19 med anonyme GET mod
`/rest/v1/eksterne_annoncer` og hashen genberegnet med `crawler/normalize.js`s
egen `fingerprint()`:

| | dev | min måling |
|---|---|---|
| aktive rækker | 332 | **332** |
| rækker uden `fingerprint` | — | **0** |
| lokal hash ≠ gemt kolonne | 0 af 332 | **0 af 332** |
| unikke `fingerprint` | 238 | **238** |
| grupper der deler nøgle | 41 | **41** |
| rækker involveret | 135 = 40,7 % | **135 = 40,7 %** |
| største gruppe | 13 | **13** |
| af de 135 med `stand: 'ny'` | 128 | **128** |
| grupper hvor alle `kilde_annonce_id` er forskellige | 41 af 41 | **41 af 41** |
| samme måling med `km` i nøglen | 37 grupper, 126 rækker | **37 grupper, 126 rækker** |

Hver enkelt tal reproducerer. Og de to eksempler i DECISIONS.md er rigtige: syv
Honda CMX 500 Rebel Cruiser 2024 til 84.995 kr. og seks Honda NX 500 Adventure
2024 til 89.995 kr. Den største gruppe er 13 × Honda CMX 1100 D Rebel Cruiser
2024 til 184.995 kr. med lagernumrene 130125, 130124, 119894, 130126, 141114,
102674, 151774, 102623, 130123, 102622, 113717, 162791, 101727 — tretten
forskellige numre, identiske titler, ingen kilometerstand.

`kilder` har **én** række (MC Syd, `aktiv: true`), og alle 332 aktive annoncer
har samme `kilde_id`. Så påstanden "de 41 grupper er alle inden for MC Syd" er
ikke en antagelse, den er efterprøvet.

**Følger konklusionen af målingen?** Ja. Tretten Honda CMX 1100 D Rebel 2024
til samme listepris hos samme forhandler er tretten motorcykler med hvert sit
lagernummer, ikke én annonce set tretten steder. En sammenlægning på
`fingerprint` ville gøre 332 til 238 og skjule 94 maskiner, en forhandler har
til salg, bag et kort der påstod "13 kilde-links". Det er det, "Ærlighed slår
fuldstændighed" er skrevet imod, og det er en større fejl end den, findingen
pegede på. At tage `km` med retter det ikke: kun 7 af de 135 kolliderende
rækker har en km at skelne på, fordi 128 er nye.

**Og findingens egen kerne er lukket, ikke afvist.** C-010 tilbød to udgange, og
dev tog den anden: kommentaren i `crawler/normalize.js:484` beskriver nu det,
koden gør — en kandidatnøgle, ikke en identitet — med målingen i sig og med
hvad der skulle til for at kunne slå sammen (stelnummer, nummerplade,
billedmatch, ingen af dem i felt-whitelisten). Målingen er låst i
`crawler/normalize.test.js` ("fingerprint kan IKKE skelne ens nyt lager").
Den tilstand, findingen kaldte "den værste af de tre" — et løfte med et indeks
bag og ingen logik — findes ikke længere.

**En afvisning må godt stå, når den er begrundet. Denne er målt, målingen
reproducerer, og konklusionen følger af den. Jeg accepterer den.**

To ting bør bæres videre, og de er begge dev's egne:

- `sources/guloggratis.yaml` står stadig med `aktiv: true` og
  `tilladelse_modtaget: true` i filen, men er ikke i `kilder`-tabellen. Den dag
  den er, får vi to kort til samme motorcykel. DECISIONS.md siger det selv:
  "Findes et sådant felt en dag, er sammenlægningen den rigtige rettelse."
  Det er ikke løst, det er udskudt med en begrundelse — og det er den rigtige
  rækkefølge.
- Ét greb er ikke målt: at slå sammen KUN når `km > 0` og de to rækker kommer
  fra forskellige kilder. 128 af de 135 kollisioner er km-løse nye maskiner, så
  netop den delmængde, der ville kunne slås sammen, er også den, der næsten
  aldrig kolliderer. Det er en kandidat til den dag, kilde nummer to er live —
  ikke en indvending mod afvisningen i dag.

---

## Kan runde 1 lukkes?

**Nej — ikke helt.** Fire af de fem er færdige: D-003, C-001 og D-006 er
verificeret i den kørende side, og C-010's afvisning er efterprøvet og
accepteret.

**C-011 er genåbnet og er stadig P1.** Radius er uændret fra runde 1: hele
kataloget, 332 annoncer, udløst af at MC Syd omdøber en CSS-klasse. Værnet
holder tre kørsler og lukker så op selv, fordi det filtrerer sine egne nuller
ud af sin egen reference. Rettelsen er lille — sammenlign med antallet af
aktive rækker for kilden, ikke kun med hvad tidligere kørsler fandt — men den
skal laves, og dens test skal skrives om, fordi den i dag låser omvejen fast.

Runde 1 kan lukkes, når C-011 er rettet og efterprøvet igen. De øvrige 26
findings fra runde 1 er ikke taget med i denne runde og står stadig åbne.
