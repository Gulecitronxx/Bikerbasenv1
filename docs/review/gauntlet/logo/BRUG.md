# Mærkelogoer — sådan bruges og udvides systemet

Kilde: `img/brands/manifest.json`. Kerne: `js/brand-logos.js` (+ genereret `js/brand-logos-data.js`). Stilark: `css/p-brand-logo.css`.
Standard er tekst (monogram/ordmærke). Et logo vises først, når manifestet siger `godkendt:true` og filen findes.

## Tilføj et logo til et mærke

1. Læg SVG'en i `img/brands/<slug>.svg` (slug = mærkets `slug` i manifestet).
2. I manifestet: sæt `fil: "img/brands/<slug>.svg"`, `variant` (`emblem` | `lockup` | `ordmaerke`), `ensfarvet` (true = ét-farvet, vises som maske i
   tekstfarven; false = flerfarvet, vises som `<img>`), `kilde` (URL eller beskrivelse), `licens`, `godkendt: true`, `godkendt_af: "ejer"` og
   `godkendt_dato` (ÅÅÅÅ-MM-DD). Ejerens beslutning, ikke Builderens.
3. Kør `node scripts/brand-logos-gen.js` — den validerer, udfylder `hash`/`bredde`/`hoejde` ud fra filen og skriver `js/brand-logos-data.js`.
   `--tjek` (gaten) fejler, hvis data-filen er ude af trit; `--opdater` overskriver hash/mål, hvis filen med vilje er ændret.
4. Kør generatorerne (`node scripts/build.js` — Orchestrator) så mærkesider og `maerker.html` får logoet. Klientens sider (forside, søgning,
   annonce) bruger `BrandLogos.logoHTML(...)` direkte og får det uden bygning.

Nyt mærke uden for listen: tilføj en post (slug, navn, aliaser, monogram, `fallback:"ordmaerke"`, `godkendt:false`, `fil:null`). Ukendte mærker
virker allerede: de får automatisk ordmærke/monogram af navnet.

## Krav til SVG

- `viewBox` påkrævet (forholdet bruges til fast slot → ingen CLS). Gerne også `width`/`height` på `<svg>`.
- Under 6 KB (`< 6144` bytes). Tæt beskåret viewBox (ingen tom margin). Ingen `<script>`, `on*=`, `<foreignObject>`, `<image>`, `<style>@import`,
  DOCTYPE/ENTITY, `javascript:`, ekstern `href`/`url()` — kun interne `#id`-referencer. Gen-scriptet afviser det.
- Ensfarvet: ethvert fyld duer (kun formen/alfa bruges; farven kommer fra temaet). Flerfarvet: sæt `ensfarvet:false`.
- Ingen slogans eller tagline-lockups. Kun emblem/ordmærke.

## Proveniens-felter (pr. mærke)

`kilde`, `licens`, `hash` (sha256 over indhold med LF-linjeskift), `godkendt`, `godkendt_af`, `godkendt_dato`. Uden kilde+licens afviser gen-scriptet en fil.
Mærker, hvor en officiel fil kræves (fx Harley-Davidson, Benelli, Indian), forbliver `godkendt:false`.

## API (browser: global `BrandLogos`; Node: `require('./js/brand-logos.js')`)

- `normaliser(navn)` → slug eller `null` (`Ukendt`, `andet mærke`, tomt → `null`).
- `logoFor(navn)` → `{ slug, navn, harLogo, src, bredde, hoejde, emblem: { src, bredde, hoejde } | null, monogram, variant, fallback, ensfarvet, aliaser }`.
- `logoHTML(navn, { storrelse: 'sm|md|lg|xl|hero', variant, form: 'emblem|fuld', decorative, fallback, statisk })` → markup med fast slot. `decorative` (standard true) = navnet står som
  tekst ved siden af (alt tom + `aria-hidden`; fallback = monogram). `decorative:false` = logoet står alene (`aria-label="<Mærke>-logo"`; fallback = ordmærke).
- Klient: link `css/p-brand-logo.css`, `js/brand-logos-data.js` og `js/brand-logos.js` (i den rækkefølge) før koden, der kalder `logoHTML`. Et logo, der ikke kan
  hentes, skifter automatisk til fallback (`bl--fejl`).
- **Én hentning pr. fil.** Et ensfarvet logo er en CSS-mask, og en maske kan ikke selv melde 404. Klienten (`js/brand-logos.js`) henter derfor hver unik fil én gang
  med `fetch` (HTTP-cachen gælder), lægger SVG'en som blob-URL og bruger den som maske på alle elementer med samme fil (`.bl--klar`). Svarer filen ikke 200 med en
  `<svg>`, får elementerne `bl--fejl` og fallback tager over. Masken er `visibility:hidden`, til filen er klar. Elementer uden for layoutet (foldet panel) hentes først,
  når de vises (IntersectionObserver); dynamisk indsat markup opdages af en MutationObserver. Der er INGEN skjult probe-`<img>` ved siden af masken (det gav 2 kald pr. logo).
- `statisk: true` (kun generatorerne): tilføjer en skjult, `loading="lazy"` `<img class="bl-ref">` med filens sti, så `scripts/udgiv.js` ser referencen og afbryder ved en
  manglende fil. Den henter intet. Generatorerne lægger desuden en `<noscript>`-regel, så ordmærke/monogram vises uden JavaScript.
- Størrelser (px, maks. højde × maks. bredde; k = √maks. areal, `SLOT` i kernen = CSS): sm 22×56 · md 30×60 · lg 40×120 · xl 64×160 (annoncens titelrække; 44×110 under
  1180 px, 34×88 under 700 px) · hero 72×280 (48×200 på mobil). Bredden er `min(maks. bredde, maks. højde · forhold, k · √forhold)`: smalle, kvadratiske og brede logoer får næsten
  samme AREAL (ens visuel vægt, testet ≤ 2,2; målt 1,4–1,9 på de 20 godkendte). Et logo, der ved slottens mål ville blive lavere end 12 px, bliver monogram.
  Wrap sm-logoer i `.bl-spalte.bl-spalte--sm` (56 px bred kolonne, logoer venstrestillet) for fast venstrekant i lister (A–Z, søgefilter).
- **Varianter pr. størrelse.** `varianter.emblem` i manifestet (`{ fil, hash, bredde, hoejde }`, tekniske felter — ikke en godkendelse; filen `img/brands/<slug>-emblem.svg`) er
  samme tegning uden ordmærke. `sm` vælger emblemet (`bl--emblem`), når det findes og forholdet er ≤ 3; ellers hovedfilen skaleret ned til den brede slot. `form:'emblem'` /
  `form:'fuld'` tvinger valget. Mærker uden emblem-fil (Ducati, Harley-Davidson, Indian, KTM, Aprilia, Benelli) bruger hovedfilen. Gen-scriptet validerer varianten som hovedfilen.
- **Lockup eller emblem?** `variant:'emblem'` betyder, at tegningen IKKE bærer navnet (hero skriver da navnet ved siden af). Bærer filen navnet (skjoldene til Harley-Davidson og Ducati,
  ordmærker, lockups), så sæt `variant:'lockup'` eller `'ordmaerke'` — ellers står navnet to gange i hero.
