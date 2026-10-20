# Cross-browser-rapport

Genereret 2026-10-20T19:17:54.343Z. Rod: C:\Users\pasca\Desktop\rod\wt\v5-qa

## Kanaler

| Kanal | Version | Mål | Fatal |
|---|---|---|---|
| chromium | 151.0.7922.34 | live |  |
| chrome | 155.0.8059.80 | live |  |
| msedge | 155.0.4283.62 | live |  |

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
| advarsel | chromium | live | ios-zoom-felt | index@375 | felt under 16px (iOS Safari zoomer ind ved fokus): input#hs-query 15px, select#hs-type 15px, select#hs-price 15px |
| advarsel | chromium | live | ekstern-forespoergsel | soegning@375 | net::ERR_BLOCKED_BY_ORB assets.guloggratis.dk/images/c73303ca-ce20-47a7-9e01-ebd963c8 |
| advarsel | chromium | live | ekstern-forespoergsel | soegning@375 | net::ERR_BLOCKED_BY_ORB assets.guloggratis.dk/images/c73303ca-ce20-47a7-9e01-ebd963c8 |
| advarsel | chromium | live | ios-zoom-felt | maerker@375 | felt under 16px (iOS Safari zoomer ind ved fokus): input#mk-hurtigsoeg-input 15px |
| advarsel | chromium | live | ios-zoom-felt | maerke-honda@375 | felt under 16px (iOS Safari zoomer ind ved fokus): input#mk-q 15px, select#mk-type 15px, select#mk-pris 15px |
| advarsel | chromium | live | ios-zoom-felt | type-cruiser@375 | felt under 16px (iOS Safari zoomer ind ved fokus): input#fa-q 15px, select#fa-type 15px, select#fa-pris 15px |
| advarsel | chromium | live | ios-zoom-felt | index@375m | felt under 16px (iOS Safari zoomer ind ved fokus): input#hs-query 15px, select#hs-type 15px, select#hs-price 15px |
| advarsel | chromium | live | ekstern-forespoergsel | soegning@375m | net::ERR_BLOCKED_BY_ORB assets.guloggratis.dk/images/c73303ca-ce20-47a7-9e01-ebd963c8 |
| advarsel | chromium | live | ekstern-forespoergsel | soegning@375m | net::ERR_BLOCKED_BY_ORB assets.guloggratis.dk/images/c73303ca-ce20-47a7-9e01-ebd963c8 |
| advarsel | chromium | live | ios-zoom-felt | maerker@375m | felt under 16px (iOS Safari zoomer ind ved fokus): input#mk-hurtigsoeg-input 15px |
| advarsel | chromium | live | ios-zoom-felt | maerke-honda@375m | felt under 16px (iOS Safari zoomer ind ved fokus): input#mk-q 15px, select#mk-type 15px, select#mk-pris 15px |
| advarsel | chromium | live | ios-zoom-felt | type-cruiser@375m | felt under 16px (iOS Safari zoomer ind ved fokus): input#fa-q 15px, select#fa-type 15px, select#fa-pris 15px |
| advarsel | chromium | live | ekstern-forespoergsel | soegning@1440 | net::ERR_BLOCKED_BY_ORB assets.guloggratis.dk/images/c73303ca-ce20-47a7-9e01-ebd963c8 |
| advarsel | chromium | live | ekstern-forespoergsel | soegning@1440 | net::ERR_BLOCKED_BY_ORB assets.guloggratis.dk/images/c73303ca-ce20-47a7-9e01-ebd963c8 |
| advarsel | chromium | live | ekstern-forespoergsel | soegning@1440m | net::ERR_BLOCKED_BY_ORB assets.guloggratis.dk/images/c73303ca-ce20-47a7-9e01-ebd963c8 |
| advarsel | chromium | live | ekstern-forespoergsel | soegning@1440m | net::ERR_BLOCKED_BY_ORB assets.guloggratis.dk/images/c73303ca-ce20-47a7-9e01-ebd963c8 |
| advarsel | chrome | live | ios-zoom-felt | index@375 | felt under 16px (iOS Safari zoomer ind ved fokus): input#hs-query 15px, select#hs-type 15px, select#hs-price 15px |
| advarsel | chrome | live | ekstern-forespoergsel | soegning@375 | net::ERR_BLOCKED_BY_ORB assets.guloggratis.dk/images/c73303ca-ce20-47a7-9e01-ebd963c8 |
| advarsel | chrome | live | ekstern-forespoergsel | soegning@375 | net::ERR_BLOCKED_BY_ORB assets.guloggratis.dk/images/c73303ca-ce20-47a7-9e01-ebd963c8 |
| advarsel | chrome | live | ios-zoom-felt | maerker@375 | felt under 16px (iOS Safari zoomer ind ved fokus): input#mk-hurtigsoeg-input 15px |
| advarsel | chrome | live | ios-zoom-felt | maerke-honda@375 | felt under 16px (iOS Safari zoomer ind ved fokus): input#mk-q 15px, select#mk-type 15px, select#mk-pris 15px |
| advarsel | chrome | live | ios-zoom-felt | type-cruiser@375 | felt under 16px (iOS Safari zoomer ind ved fokus): input#fa-q 15px, select#fa-type 15px, select#fa-pris 15px |
| advarsel | chrome | live | ios-zoom-felt | index@375m | felt under 16px (iOS Safari zoomer ind ved fokus): input#hs-query 15px, select#hs-type 15px, select#hs-price 15px |
| advarsel | chrome | live | ekstern-forespoergsel | soegning@375m | net::ERR_BLOCKED_BY_ORB assets.guloggratis.dk/images/c73303ca-ce20-47a7-9e01-ebd963c8 |
| advarsel | chrome | live | ekstern-forespoergsel | soegning@375m | net::ERR_BLOCKED_BY_ORB assets.guloggratis.dk/images/c73303ca-ce20-47a7-9e01-ebd963c8 |
| advarsel | chrome | live | ios-zoom-felt | maerker@375m | felt under 16px (iOS Safari zoomer ind ved fokus): input#mk-hurtigsoeg-input 15px |
| advarsel | chrome | live | ios-zoom-felt | maerke-honda@375m | felt under 16px (iOS Safari zoomer ind ved fokus): input#mk-q 15px, select#mk-type 15px, select#mk-pris 15px |
| advarsel | chrome | live | ios-zoom-felt | type-cruiser@375m | felt under 16px (iOS Safari zoomer ind ved fokus): input#fa-q 15px, select#fa-type 15px, select#fa-pris 15px |
| advarsel | chrome | live | ekstern-forespoergsel | soegning@1440 | net::ERR_BLOCKED_BY_ORB assets.guloggratis.dk/images/c73303ca-ce20-47a7-9e01-ebd963c8 |
| advarsel | chrome | live | ekstern-forespoergsel | soegning@1440 | net::ERR_BLOCKED_BY_ORB assets.guloggratis.dk/images/c73303ca-ce20-47a7-9e01-ebd963c8 |
| advarsel | chrome | live | ekstern-forespoergsel | soegning@1440m | net::ERR_BLOCKED_BY_ORB assets.guloggratis.dk/images/c73303ca-ce20-47a7-9e01-ebd963c8 |
| advarsel | chrome | live | ekstern-forespoergsel | soegning@1440m | net::ERR_BLOCKED_BY_ORB assets.guloggratis.dk/images/c73303ca-ce20-47a7-9e01-ebd963c8 |
| advarsel | msedge | live | ios-zoom-felt | index@375 | felt under 16px (iOS Safari zoomer ind ved fokus): input#hs-query 15px, select#hs-type 15px, select#hs-price 15px |
| advarsel | msedge | live | ekstern-forespoergsel | soegning@375 | net::ERR_BLOCKED_BY_ORB assets.guloggratis.dk/images/c73303ca-ce20-47a7-9e01-ebd963c8 |
| advarsel | msedge | live | ekstern-forespoergsel | soegning@375 | net::ERR_BLOCKED_BY_ORB assets.guloggratis.dk/images/c73303ca-ce20-47a7-9e01-ebd963c8 |
| advarsel | msedge | live | ios-zoom-felt | maerker@375 | felt under 16px (iOS Safari zoomer ind ved fokus): input#mk-hurtigsoeg-input 15px |
| advarsel | msedge | live | ios-zoom-felt | maerke-honda@375 | felt under 16px (iOS Safari zoomer ind ved fokus): input#mk-q 15px, select#mk-type 15px, select#mk-pris 15px |
| advarsel | msedge | live | ios-zoom-felt | type-cruiser@375 | felt under 16px (iOS Safari zoomer ind ved fokus): input#fa-q 15px, select#fa-type 15px, select#fa-pris 15px |
| advarsel | msedge | live | ios-zoom-felt | index@375m | felt under 16px (iOS Safari zoomer ind ved fokus): input#hs-query 15px, select#hs-type 15px, select#hs-price 15px |
| advarsel | msedge | live | ekstern-forespoergsel | soegning@375m | net::ERR_BLOCKED_BY_ORB assets.guloggratis.dk/images/c73303ca-ce20-47a7-9e01-ebd963c8 |
| advarsel | msedge | live | ekstern-forespoergsel | soegning@375m | net::ERR_BLOCKED_BY_ORB assets.guloggratis.dk/images/c73303ca-ce20-47a7-9e01-ebd963c8 |
| advarsel | msedge | live | ios-zoom-felt | maerker@375m | felt under 16px (iOS Safari zoomer ind ved fokus): input#mk-hurtigsoeg-input 15px |
| advarsel | msedge | live | ios-zoom-felt | maerke-honda@375m | felt under 16px (iOS Safari zoomer ind ved fokus): input#mk-q 15px, select#mk-type 15px, select#mk-pris 15px |
| advarsel | msedge | live | ios-zoom-felt | type-cruiser@375m | felt under 16px (iOS Safari zoomer ind ved fokus): input#fa-q 15px, select#fa-type 15px, select#fa-pris 15px |
| advarsel | msedge | live | ekstern-forespoergsel | soegning@1440 | net::ERR_BLOCKED_BY_ORB assets.guloggratis.dk/images/c73303ca-ce20-47a7-9e01-ebd963c8 |
| advarsel | msedge | live | ekstern-forespoergsel | soegning@1440 | net::ERR_BLOCKED_BY_ORB assets.guloggratis.dk/images/c73303ca-ce20-47a7-9e01-ebd963c8 |
| advarsel | msedge | live | ekstern-forespoergsel | soegning@1440m | net::ERR_BLOCKED_BY_ORB assets.guloggratis.dk/images/c73303ca-ce20-47a7-9e01-ebd963c8 |
| advarsel | msedge | live | ekstern-forespoergsel | soegning@1440m | net::ERR_BLOCKED_BY_ORB assets.guloggratis.dk/images/c73303ca-ce20-47a7-9e01-ebd963c8 |