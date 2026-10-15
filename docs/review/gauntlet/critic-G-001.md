# Critic G-001 — mobil: ingen vandret sidescroll på forsiden (blind review)

Testet: HEAD ebbea8e (fix 3c5306b) på :8700 mod baseline d199417 (git worktree i temp, :8701, nu fjernet).
Playwright/chromium, cookie-banner afvist med "Kun nødvendige". Scripts i temp, kun denne rapport skrevet i repoet.
Ændringen i css/ er præcis én linje: `.section-eftertekst{ padding: var(--space-6) 0 }` -> `padding-block: var(--space-6)`.

## Krav 1 — index.html, scrollWidth <= clientWidth: PASS
Bredder 320, 360, 375, 390, 414, 600, 768, 1024, 1440, 1920 x lys + mørk = 20/20 med scrollWidth == clientWidth (bodyScrollWidth også lig).
Før (d199417): 320 -> 336, 375 (mobile-emu) -> 391, 390 -> 406, 360 -> 376 (alle +16 px). Bug reproduceret og rettet.
Ekstra: landscape 667x375 = 667/667; isMobile+touch 375 og 390 = OK; fin sweep 280-1300 px i trin á 7 px: 0 overflow.

## Krav 2 — øvrige sider (360, 390, 768, 1440): PASS
soegning, koerekort-a2, type-sport, maerke-yamaha, maerker, region-hovedstaden, opret-annonce, om-bikerbasen, 404: 36/36 kombinationer scrollWidth == clientWidth. Ingen side at rapportere.

## Krav 3 — visuel regression i .section-eftertekst: PASS
- Tekst/overskrifter/links: venstrekant 16 px ved 320/360/390 (maks højrekant 304/344/374 = 16 px margen); 1440: 132 px. Container-padding 16 px / 32 px intakt.
- Chip-/kort-rækken ("Søg efter type", .tiles-grid) kan stadig rulles inde i sektionen: 390 px scrollWidth 956 / clientWidth 390, scrollLeft nåede 566; sidste kort slutter x=374 (16 px højremargen) når rækken er rullet til enden; rækkens egen ramme 0..390 (bevidst edge-to-edge-bleed, uændret).
- Screenshots af sektionen fra "Søg efter type" og ned (390 lys, 360 mørk) er byte-identiske før/efter. Overfladen er visuelt uændret; kun den skjulte 16 px højre-overhæng er fjernet.
- Sektionens højde uændret (283/303/567 px før og efter), docHeight uændret.

## Krav 4 — dark/light, layoutspring desktop: PASS
- 1440 lys og mørk: nederste del af forsiden (fra sektionen til footer) er byte-identiske PNG'er før/efter; doc-højde 7861/7864 identisk; ingen layoutspring.
- Ingen farver/baggrunde/skrifter ændret i diffen (kun padding-block), så ingen kontrastregression er mulig fra ændringen; mørk-screenshot 360 læst og ser korrekt ud.

## Nye fund
1. (Info, allerede eksisterende, ikke forårsaget af ændringen) Under ca. 269 px viewport (svarer til 200 % browser-zoom på 540 px, eller 195 px ved 200 % zoom af 390) er der vandret scroll: scrollWidth 269 > 195. Årsag: `.header-actions` (højre kant 281) og `.spor.spor-koeber` (269) i headeren ikke klippet. Identisk før og efter. Under WCAG 320 CSS-px-reflowgrænsen; 200 % tekst-zoom (root font-size 200 %) ved 320 og 390 giver 0 overflow. Anbefaling: lav prioritet.
2. (Info) Fixet løser årsagen (shorthand der nulstillede .container-sidepadding), ikke symptomet — bedre end overflow-x:hidden. Andre steder med `padding: X 0` på et element der også er `.container` og indeholder en negativ-margin-række er ikke fundet at give overflow på de testede sider.
3. Ingen blokerende fund.

## Samlet dom: ACCEPTER
Alle fire krav PASS med måltal; regression ikke fundet; kun ét CSS-linjeskifte; før/efter-visuals byte-identiske bortset fra den fjernede 16 px overflow.
