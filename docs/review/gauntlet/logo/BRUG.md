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
- `logoFor(navn)` → `{ slug, navn, harLogo, src, bredde, hoejde, monogram, variant, fallback, ensfarvet, aliaser }`.
- `logoHTML(navn, { storrelse: 'sm|md|lg|hero', variant, decorative, fallback })` → markup med fast slot. `decorative` (standard true) = navnet står som
  tekst ved siden af (alt tom + `aria-hidden`; fallback = monogram). `decorative:false` = logoet står alene (`aria-label="<Mærke>-logo"`; fallback = ordmærke).
- Klient: link `css/p-brand-logo.css`, `js/brand-logos-data.js` og `js/brand-logos.js` (i den rækkefølge) før koden, der kalder `logoHTML`. Et logo, der ikke kan
  hentes, skifter automatisk til fallback (`bl--fejl`).
- Størrelser (px, maks. højde × bredde): sm 18×28 · md 30×60 · lg 40×120 · hero 54×235 (40×170 på mobil). Wrap sm-logoer i `.bl-spalte.bl-spalte--sm`
  for fast venstrekant i lister.
