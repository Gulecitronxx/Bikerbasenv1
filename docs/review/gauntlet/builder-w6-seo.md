# Builder w6-seo — acceptkriterier (skrevet FØR koden)

## K1 Brødkrumme + knaprække server-renderet (scripts/build-listing-pages.js)
- K1a `side(l)` kan kaldes uden netværk (fil kan `require`s uden at bygge).
- K1b Hvert `.bc-sep` i brødkrummen indeholder chevron-SVG'en fra js/icons.js i det statiske markup.
- K1c Sidste led har `aria-current="page"` og samme tekst som js/annonce.js `anBrodkrumme` (mærke+model, "Annonce" som fald-tilbage, "Ukendt" mærke udelades, `&amp;` i href).
- K1d `#an-actions` indeholder Del/Sammenlign (og Gem som favorit kun for ikke-eksterne) med de samme klasser/attributter som `anAktioner`.
- K1e Test: integrationstest renderer på fixture og tjekker K1b-d uden JS. Rapport lister overflødige CSS-regler.

## K2 llms.txt
- K2a `scripts/build-llms.js` skriver `llms.txt` deterministisk (to kørsler = identiske bytes), ingen netværk.
- K2b Kun sande ikke-tal-påstande; ingen cifre i tekst om antal annoncer; links til sitemap, guides, søgning, om/kontakt.
- K2c `/^llms\.txt$/,` i udgiv.js allowlist; trinnet registreret i build.js.
- K2d Test dækker K2a-c; alle links i filen peger på filer der findes.

## K3 Critic-P3
- K3a distinkt-nøgle med manglende pris/årgang/km: 5 ens-tomme annoncer tæller ikke som 1 "identisk lagerenhed".
- K3b `&amp;` i modelsiders "Se alle"-href.
- K3c medianårgang vises konsekvent og ærligt (ingen skjult afrunding 2015,5 -> 2016).
- Hver rettelse låst af test; ligger fixet uden for ejerfiler beskrives det i stedet.

## Bevis
Tilføjes pr. kriterium nedenfor efterhånden.
