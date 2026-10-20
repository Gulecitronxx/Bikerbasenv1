# Cross-browser-rapport

Genereret 2026-10-20T19:06:56.036Z. Rod: C:\Users\pasca\Desktop\rod\wt\v5-qa

## Kanaler

| Kanal | Version | Mål | Fatal |
|---|---|---|---|
| chromium | 151.0.7922.34 | lokal |  |
| chrome | 155.0.8059.80 | lokal |  |
| msedge | 155.0.4283.62 | lokal |  |

## Funktionsprober (hvad browseren selv svarer)

| Funktion | chromium 151.0.7922.34 | chrome 155.0.8059.80 | msedge 155.0.4283.62 |
|---|---|---|---|
| :has() | ja | ja | ja |
| @container (container-type) | ja | ja | ja |
| color-mix() | ja | ja | ja |
| dvh | ja | ja | ja |
| :is() | ja | ja | ja |
| :focus-visible | ja | ja | ja |
| aspect-ratio | ja | ja | ja |
| inset | ja | ja | ja |
| text-wrap: balance | ja | ja | ja |
| scrollbar-width | ja | ja | ja |
| content-visibility | ja | ja | ja |
| accent-color | ja | ja | ja |
| backdrop-filter | ja | ja | ja |
| mask-image | ja | ja | ja |
| regex lookbehind | ja | ja | ja |
| regex \p{L} | ja | ja | ja |
| crypto.randomUUID | ja | ja | ja |
| inert | ja | ja | ja |
| dialog.showModal | ja | ja | ja |
| IntersectionObserver | ja | ja | ja |
| navigator.clipboard | ja | ja | ja |
| Element.checkVisibility | ja | ja | ja |
| structuredClone | ja | ja | ja |

## Fund

| Niveau | Kanal | Mål | Tjek | Hvor | Detalje |
|---|---|---|---|---|---|
| advarsel | chromium | lokal | ios-zoom-felt | index@375 | felt under 16px (iOS Safari zoomer ind ved fokus): input#hs-query 15px, select#hs-type 15px, select#hs-price 15px |
| advarsel | chromium | lokal | ios-zoom-felt | maerker@375 | felt under 16px (iOS Safari zoomer ind ved fokus): input#mk-hurtigsoeg-input 15px |
| advarsel | chromium | lokal | ios-zoom-felt | maerke-honda@375 | felt under 16px (iOS Safari zoomer ind ved fokus): input#mk-q 15px, select#mk-type 15px, select#mk-pris 15px |
| advarsel | chromium | lokal | usynlig-tekst | maerke-honda@375 | 1: p.foto-tom-titel/Ingen fotos i denne anno (1.17:1) |
| advarsel | chromium | lokal | ios-zoom-felt | type-cruiser@375 | felt under 16px (iOS Safari zoomer ind ved fokus): input#fa-q 15px, select#fa-type 15px, select#fa-pris 15px |
| advarsel | chromium | lokal | ios-zoom-felt | type-classic@375 | felt under 16px (iOS Safari zoomer ind ved fokus): input#fa-q 15px, select#fa-type 15px, select#fa-pris 15px |
| advarsel | chromium | lokal | ios-zoom-felt | type-scooter@375 | felt under 16px (iOS Safari zoomer ind ved fokus): input#fa-q 15px, select#fa-type 15px, select#fa-pris 15px |
| advarsel | chromium | lokal | ios-zoom-felt | index@375m | felt under 16px (iOS Safari zoomer ind ved fokus): input#hs-query 15px, select#hs-type 15px, select#hs-price 15px |
| advarsel | chromium | lokal | ios-zoom-felt | maerker@375m | felt under 16px (iOS Safari zoomer ind ved fokus): input#mk-hurtigsoeg-input 15px |
| advarsel | chromium | lokal | ios-zoom-felt | maerke-honda@375m | felt under 16px (iOS Safari zoomer ind ved fokus): input#mk-q 15px, select#mk-type 15px, select#mk-pris 15px |
| advarsel | chromium | lokal | ios-zoom-felt | type-cruiser@375m | felt under 16px (iOS Safari zoomer ind ved fokus): input#fa-q 15px, select#fa-type 15px, select#fa-pris 15px |
| advarsel | chromium | lokal | ios-zoom-felt | type-classic@375m | felt under 16px (iOS Safari zoomer ind ved fokus): input#fa-q 15px, select#fa-type 15px, select#fa-pris 15px |
| advarsel | chromium | lokal | ios-zoom-felt | type-scooter@375m | felt under 16px (iOS Safari zoomer ind ved fokus): input#fa-q 15px, select#fa-type 15px, select#fa-pris 15px |
| advarsel | chromium | lokal | usynlig-tekst | maerke-honda@1440 | 1: p.foto-tom-titel/Ingen fotos i denne anno (1.17:1) |
| advarsel | chrome | lokal | ios-zoom-felt | index@375 | felt under 16px (iOS Safari zoomer ind ved fokus): input#hs-query 15px, select#hs-type 15px, select#hs-price 15px |
| advarsel | chrome | lokal | ios-zoom-felt | maerker@375 | felt under 16px (iOS Safari zoomer ind ved fokus): input#mk-hurtigsoeg-input 15px |
| advarsel | chrome | lokal | ios-zoom-felt | maerke-honda@375 | felt under 16px (iOS Safari zoomer ind ved fokus): input#mk-q 15px, select#mk-type 15px, select#mk-pris 15px |
| advarsel | chrome | lokal | usynlig-tekst | maerke-honda@375 | 1: p.foto-tom-titel/Ingen fotos i denne anno (1.17:1) |
| advarsel | chrome | lokal | ios-zoom-felt | type-cruiser@375 | felt under 16px (iOS Safari zoomer ind ved fokus): input#fa-q 15px, select#fa-type 15px, select#fa-pris 15px |
| advarsel | chrome | lokal | ios-zoom-felt | type-classic@375 | felt under 16px (iOS Safari zoomer ind ved fokus): input#fa-q 15px, select#fa-type 15px, select#fa-pris 15px |
| advarsel | chrome | lokal | ios-zoom-felt | type-scooter@375 | felt under 16px (iOS Safari zoomer ind ved fokus): input#fa-q 15px, select#fa-type 15px, select#fa-pris 15px |
| advarsel | chrome | lokal | ios-zoom-felt | index@375m | felt under 16px (iOS Safari zoomer ind ved fokus): input#hs-query 15px, select#hs-type 15px, select#hs-price 15px |
| advarsel | chrome | lokal | ios-zoom-felt | maerker@375m | felt under 16px (iOS Safari zoomer ind ved fokus): input#mk-hurtigsoeg-input 15px |
| advarsel | chrome | lokal | ios-zoom-felt | maerke-honda@375m | felt under 16px (iOS Safari zoomer ind ved fokus): input#mk-q 15px, select#mk-type 15px, select#mk-pris 15px |
| advarsel | chrome | lokal | ios-zoom-felt | type-cruiser@375m | felt under 16px (iOS Safari zoomer ind ved fokus): input#fa-q 15px, select#fa-type 15px, select#fa-pris 15px |
| advarsel | chrome | lokal | ios-zoom-felt | type-classic@375m | felt under 16px (iOS Safari zoomer ind ved fokus): input#fa-q 15px, select#fa-type 15px, select#fa-pris 15px |
| advarsel | chrome | lokal | ios-zoom-felt | type-scooter@375m | felt under 16px (iOS Safari zoomer ind ved fokus): input#fa-q 15px, select#fa-type 15px, select#fa-pris 15px |
| advarsel | chrome | lokal | usynlig-tekst | maerke-honda@1440 | 1: p.foto-tom-titel/Ingen fotos i denne anno (1.17:1) |
| advarsel | msedge | lokal | ios-zoom-felt | index@375 | felt under 16px (iOS Safari zoomer ind ved fokus): input#hs-query 15px, select#hs-type 15px, select#hs-price 15px |
| advarsel | msedge | lokal | ios-zoom-felt | maerker@375 | felt under 16px (iOS Safari zoomer ind ved fokus): input#mk-hurtigsoeg-input 15px |
| advarsel | msedge | lokal | ios-zoom-felt | maerke-honda@375 | felt under 16px (iOS Safari zoomer ind ved fokus): input#mk-q 15px, select#mk-type 15px, select#mk-pris 15px |
| advarsel | msedge | lokal | usynlig-tekst | maerke-honda@375 | 1: p.foto-tom-titel/Ingen fotos i denne anno (1.17:1) |
| advarsel | msedge | lokal | ios-zoom-felt | type-cruiser@375 | felt under 16px (iOS Safari zoomer ind ved fokus): input#fa-q 15px, select#fa-type 15px, select#fa-pris 15px |
| advarsel | msedge | lokal | ios-zoom-felt | type-classic@375 | felt under 16px (iOS Safari zoomer ind ved fokus): input#fa-q 15px, select#fa-type 15px, select#fa-pris 15px |
| advarsel | msedge | lokal | ios-zoom-felt | type-scooter@375 | felt under 16px (iOS Safari zoomer ind ved fokus): input#fa-q 15px, select#fa-type 15px, select#fa-pris 15px |
| advarsel | msedge | lokal | ios-zoom-felt | index@375m | felt under 16px (iOS Safari zoomer ind ved fokus): input#hs-query 15px, select#hs-type 15px, select#hs-price 15px |
| advarsel | msedge | lokal | ios-zoom-felt | maerker@375m | felt under 16px (iOS Safari zoomer ind ved fokus): input#mk-hurtigsoeg-input 15px |
| advarsel | msedge | lokal | ios-zoom-felt | maerke-honda@375m | felt under 16px (iOS Safari zoomer ind ved fokus): input#mk-q 15px, select#mk-type 15px, select#mk-pris 15px |
| advarsel | msedge | lokal | ios-zoom-felt | type-cruiser@375m | felt under 16px (iOS Safari zoomer ind ved fokus): input#fa-q 15px, select#fa-type 15px, select#fa-pris 15px |
| advarsel | msedge | lokal | ios-zoom-felt | type-classic@375m | felt under 16px (iOS Safari zoomer ind ved fokus): input#fa-q 15px, select#fa-type 15px, select#fa-pris 15px |
| advarsel | msedge | lokal | ios-zoom-felt | type-scooter@375m | felt under 16px (iOS Safari zoomer ind ved fokus): input#fa-q 15px, select#fa-type 15px, select#fa-pris 15px |
| advarsel | msedge | lokal | usynlig-tekst | maerke-honda@1440 | 1: p.foto-tom-titel/Ingen fotos i denne anno (1.17:1) |

## Ældre-browser-simulering (Chromium med funktionen fjernet fra CSS)

| Variant | Sider med forskel | Ny overflow | Ny usynlig tekst | Højdeændring >2 % |
|---|---|---|---|---|
| kontrol (uændret igen) | 0/44 | 0 | 0 | 0 |
| uden :has() | 4/44 | 0 | 0 | 4 |
| uden @container | 8/44 | 0 | 0 | 8 |
| uden color-mix() | 0/44 | 0 | 0 | 0 |
| uden dvh | 2/44 | 0 | 0 | 2 |
| alt ovenstående | 10/44 | 0 | 0 | 10 |