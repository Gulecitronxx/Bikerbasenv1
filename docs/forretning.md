# Bikerbasen.dk — Product & Business Overview

*Internal working document, revised against the repo (aggregator, claim flow, live features)
25.08.2026. Contains forward-looking features that are not yet built. Any public-facing
version must be stripped to what actually exists today. Lives in `docs/`, which is
deliberately outside the publish allowlist (`scripts/udgiv.js`) — this file never ships.*

---

## 1. What it is

Bikerbasen.dk is a Danish marketplace for used motorcycles, built around one organising idea: **you search by the licence you hold, not by engine displacement.**

Supply comes from three layers:
- **Indexed listings** — motorcycles aggregated from external sources **with documented per-source consent** (see section 4). This is the bootstrap supply and currently the entire inventory.
- **Private sellers** — free native listings at launch. Pricing may change later, so the flexibility must be protected in the copy: public-facing text says *gratis*, never *altid gratis* or *gratis for evigt*. A promise of "always free" would make future pricing a broken promise instead of a business decision. (Verified 25.08.2026: the current site copy complies.)
- **Dealers** — subscription accounts with bulk inventory upload, reached partly through the claim flow on indexed listings (section 4.3).

---

## 2. The problem

### 2.1 Licence class is the buyer's real constraint — and no marketplace treats it that way

A Danish rider with an A2 licence cannot legally ride most of what a "600–800cc" filter returns. The binding constraints are power, power-to-weight ratio, and restriction origin — not cc:

| Class | Constraints |
|---|---|
| **A1** | Max 125 cm³, max 11 kW, max 0.1 kW/kg |
| **A2** | Max 35 kW, max 0.2 kW/kg, and not restricted down from a machine with more than double that power |
| **A** | No power restriction |

*(Minimum ages are implemented in the product as 18 / 20 / 24 (`js/data.js`) with the kW limits correctly converted. Before ages appear in marketing copy, cite Færdselsstyrelsen as the source on the page itself — consistent with the data-source rule in 3.2.)*

On today's sites the buyer has to do this arithmetic themselves: find the bike, look up the kerb weight, look up the kW, divide, then work out whether the seller's "A2" claim survives the derivation rule. Most don't bother. Some buy the wrong bike.

The hardest case is the one the market handles worst: the **same model sold in both restricted and unrestricted versions**. A listing that says "A2" is often the seller's guess, or a copy-paste from another listing, or wishful thinking.

### 2.2 Technical data on used-bike listings is unreliable

Power and weight figures in existing listings are frequently wrong, rounded, taken from the wrong model year, or invented. A buyer cannot distinguish a verified figure from a guessed one, so the "A2-egnet" label carries no information.

### 2.3 Supply is fragmented

Motorcycles sit as an afterthought sub-category on a car portal, mixed into general classifieds on DBA, or scattered across small specialist sites. There is no destination that treats motorcycles as the primary object. The aggregation layer (section 4) is the direct answer to this: "samlet ét sted" is now literally the homepage promise.

---

## 3. What Bikerbasen does differently

### 3.1 Licence class as the primary search mechanic

The first filter on the page is A1 / A2 / A — live today as the hero mechanic. Everything else — price, year, mileage, brand, type, geography — narrows within that.

**What the filter can honestly promise — and what it can't.** The filter knows registered power. It can therefore guarantee one thing: a bike that is *excluded on power* never appears in an A1 or A2 result. It cannot certify that a bike *is* A2, because A2 also requires the weight ratio and the derivation rule — and those are not in a typical listing. The code already states this correctly ("vi kan aldrig love at en mc ER A2 — kun at den ikke er udelukket på effekt"). The public copy must match it. Two-level labelling makes the distinction usable:

| Label | Meaning |
|---|---|
| **Mulig A2** | Not excluded on power. Weight ratio and derivation not confirmed. |
| **A2 bekræftet** | Power, weight ratio and derivation rule all documented. |

**Hero copy fix — done 25.08.2026.** The hero line previously read *"Kørekort A1/A2/A ud fra hk og ccm — aldrig gættet"*, promising more than a power-only filter can deliver. It now reads **"Kørekortfilteret bygger på oplyst effekt og ccm — aldrig på gæt"**, and the explainer under the licence selector was extended: *"Vi gætter aldrig: er effekten ikke oplyst, siger vi det. A2 afhænger også af vægt og afledningsregel — filteret frasorterer kun det, der er udelukket på effekt og ccm."*

**Licence landing pages — fixed same day.** The generated intros (`koerekort-a1/a2.html`), the licence-link blocks on the homepage and search page, and the brand-page FAQ all made affirmative "må køres" claims from power alone. The generators (`scripts/build-facet-pages.js`, `scripts/build-brand-pages.js`) now state the limits and the gap — "ikke udelukket … ud fra det, annoncerne oplyser" — and the A1 page's "cannot be confirmed or excluded" count was corrected to include bikes with known ccm but unknown power (12 → 27). No "må køres" / "du faktisk må køre" phrasing remains in published pages.

### 3.2 "Vi gætter aldrig"

This is the product, not a slogan.

- Verified technical data is shown as verified, with its source stated.
- Unverified data is shown as unverified, visibly and unambiguously. **All indexed listings are source-stated data and therefore unverified by default.**
- **Missing data is shown as missing.** We do not estimate a kerb weight to complete a ratio calculation. We do not infer power from displacement.
- A machine is not labelled *A2 bekræftet* unless every constraint is confirmed, including the derivation rule. Anything else is at most *Mulig A2*.

The competitive moat here is not technical — it is that a marketplace optimising for listing volume cannot afford to tell users that a third of its inventory has unknown specs. We can, because our promise is accuracy rather than size.

---

## 4. Supply strategy: consent-based aggregation and the claim flow

*This section describes what the repo already is — an aggregator for Danish MC listings — and gives it the place in the business model the document previously lacked.*

### 4.1 What exists

A crawler indexes listings from external sources under a hard per-source consent requirement (`tilladelse_modtaget`). Currently **4 active sources — MC Syd, Gul og Gratis, Rydbergs MC, Jensens MC — yielding ~602 listings after deduplication** (616 raw). This is not competitor scraping; no source is crawled without documented permission. But it is also not the pure own-listings marketplace the earlier version of this document described, and the difference matters legally, strategically and for the brand promise.

### 4.2 Why aggregation, strategically

It breaks the cold-start loop this document previously called unsolvable-by-SEO: real listings → real indexable pages → Google presence → buyers → a reason for dealers to engage. Six hundred listings on day one is the difference between an empty site and a usable one. For sources, inclusion is free distribution — that is the consent pitch, and it costs them nothing.

### 4.3 The claim flow: aggregation as the top of the dealer funnel

Dealers discover their own inventory indexed on Bikerbasen and **claim it** ("Bliv forhandler" flow, `krav` table, dashboard — the frontend claim flow is live in `js/dashboard.js`: search own listings, submit, follow status). A claimed dealer has an account, a relationship, and a reason to upgrade: direct feed integration, profile page, statistics — the subscription tiers in section 7. Aggregation is therefore not a separate product; it is the acquisition channel for the primary revenue stream. Every indexed dealer listing is a warm lead.

Approval is manual-only by design for now (`service_role`; self-approval is closed at the database level, migration 018). The automated verification paths — e-mail domain match, code on the seller's own site — are not built yet; until they are, the integrity of a claim rests on the human approver actually verifying ownership.

### 4.4 Rules that keep aggregation compatible with the brand

- **Consent is per source, documented, and revocable.** A written consent register: who agreed, to what scope, when, and how to withdraw. `tilladelse_modtaget` in config is the enforcement point; the register is the paper trail behind it. *(The register itself is still to be written — the config flag exists, the paper trail does not.)*
- **Source attribution is visible on every indexed listing.** *Built and test-locked:* every external card carries a footer line with source name and domain (`card-kildelinje`), enforced by `js/eksternt-kort.test.js`; listing pages deep-link out to the source.
- **Indexed data is unverified by definition** and labelled per 3.2. The licence filter applies only the power exclusion to indexed listings — never an affirmative A2 claim.
- **Link out for contact where the source requires it.** The listing is theirs; we are the discovery layer.
- **De-index on request, promptly.** Consent withdrawn means listings gone, without argument (`aktiv: false` in `sources/<domæne>.yaml`).

### 4.5 The open legal question — resolve before scaling sources

Source consent covers the database-rights and markedsføringsloven exposure the guardrails were written for. It does **not** by itself provide a GDPR legal basis for processing **private sellers' personal data** inside indexed listings — names, phone numbers, addresses. Gul og Gratis is the acute case, since its listings are largely private. The platform's permission is theirs to give; the sellers' personal data is not.

**Minimised mode is not a plan — it is the implemented state.** The crawler's field whitelist (`crawler/db.js`) stores vehicle data only; `uddrag` is forced to `null` (no listing text at all, stricter than the stated rule); and `fjernPersonoplysninger()` (`crawler/normalize.js`) strips phone numbers, e-mail addresses and street addresses from titles before anything is stored. No seller contact data is persisted, and buyers reach the seller via the outbound deeplink.

What remains open is the formal side, with counsel (alongside the trademark question):
- Confirm that vehicle-data-only indexing plus link-out keeps private-seller sources outside the GDPR surface, or
- if any personal data is deemed processed, establish its basis (likely legitimate interest, with a documented assessment, privacy notice and objection route).

Until resolved: dealer sources are low-risk; private-seller sources stay in minimised mode.

### 4.6 The decision this document takes

**Aggregation is scaffolding and a funnel — not the end state.** The destination remains a marketplace of native listings and consented dealer feeds, where "vi gætter aldrig" can be enforced at the data level. Indexed listings bootstrap traffic and dealer acquisition, and may run indefinitely as a long-tail discovery layer, but the product's centre of gravity moves toward supply Bikerbasen controls. If this is wrong — if the strategy is to be a permanent metasearch for Danish MC listings — the business model, the verification promise, and the dealer pitch all change shape, and this document should be rewritten around that instead. Deciding by default is the only wrong option.

---

## 5. Features

### Live
- Consent-based aggregation pipeline: crawler, 4 sources, deduplication (~602 indexed listings)
- Licence-class filter (A1 / A2 / A) as the homepage hero mechanic — with hero copy that matches what the filter can prove (3.1, fixed 25.08.2026)
- Source attribution on every indexed card, test-locked (4.4)
- Dealer claim flow: "Bliv forhandler", claims (`krav`) submission and status in the dashboard; approval manual-only (4.3)
- Søgeagenter with email alerts (including unsubscribe and mine-annoncer)
- Standard secondary filters: price, year, mileage, brand and model, type, geography
- Homepage copy without volume claims ("samlet ét sted") — the earlier "hundredvis af annoncer" problem is fixed

### Next
- Registreringsnummer field on listings, linking to nummerplade.net vehicle lookup (see below)
- **A2 model database** — a reference page per model and year: kW, weight, kW/kg, whether a restricted version exists, and whether it can legally be drosled to A2 or fails the derivation rule. Currently the repo has brand pages only, not model/year references. Targets constantly-searched questions ("kan jeg køre en MT-07 på A2?"), works independently of inventory, and funnels into live listings. The single highest-leverage content feature available — and the natural backbone for upgrading indexed listings from *Mulig A2* to *A2 bekræftet*.
- **Slutseddel generator** — free, prefilled købskontrakt PDF for private motorcycle sales: parties, stelnummer, price, sold-as-seen terms, ownership-transfer checklist for Motorregistret. Cheap to build, unmatched by DBA and Facebook, natural email-capture point.
- **Klub- og træf-kalender** — directory of Danish MC clubs and events. Evergreen traffic from exactly the right audience.
- Complete dealer onboarding and account management (claim flow exists; subscription conversion and account depth do not)
- Dealer inventory import via consent-based XML / stock feed from dealer management systems
- Dealer profile pages
- Native private-seller listing flow

### Later
- Donor bikes and used parts (see section 6)
- **"Drosling dokumenteret" badge** — sellers upload syn/registration documentation proving an A2 restriction is registered, not just claimed; feeds the *A2 bekræftet* label. Turns the strictest data rule into a selling advantage.
- **Listing completeness score** — a meter nudging sellers toward reg number, service history, and full photos; improves data quality without enforcement.
- **In-platform messaging** with basic fraud-pattern warnings, so first contact doesn't happen over email where scams live. (Applies to native listings; indexed listings link out per 4.4.)
- **Compare view** — two or three listings side by side on the verified spec block; nearly free given the structured data.
- **Watchlist with price-drop alerts** — extends søgeagenterne, second email-capture hook.
- **Days-on-market and price-change history** on listings — transparency competitors avoid because it embarrasses stale inventory, which is exactly why it fits this brand.
- Insurance and financing modules on listing pages
- Dealer-facing statistics: views, saves, enquiries per listing
- Editorial content: licence-class buying guides beyond the A2 database

### Decided but deferred
- **MitID-verified sellers.** Will be built — the strongest trust differentiator available against DBA and Facebook, where seller fraud is the number-one buyer fear. Deferred for now: the integration is heavy, and a verification badge only means something once enough native sellers exist to carry it. Revisit once private listings are flowing.

### Deliberately not built yet
- **Price valuation / "fair price" indicator** — with no transaction data it would be a guess wearing a badge, the one thing this brand cannot publish. Waits for real sold-price data. (The indexed corpus will eventually make honest price *statistics* possible — asking-price distributions per model — which is a different, defensible feature.)
- **Dealer reviews** — genuine trust value, but moderation burden and defamation exposure make it wrong for a solo founder at this stage.

### Registreringsnummer-opslag via nummerplade.net

Sellers enter the registration number when creating a listing. The listing page then shows a one-click "Tjek køretøjet på nummerplade.net" button — the buyer never types anything.

This is "vi gætter aldrig" made operational. Rather than asking buyers to trust our data, we hand them the official register: a nummerplade.net lookup shows synsrapporter, kilometer history, tinglyst gæld and pant via Bilbogen, and the registered technical specifications — including effekt (kW) and vægt, the two figures the entire A1/A2 promise rests on. The Bilbogen debt check is particularly valuable in private sales, where unpaid debt secured against the vehicle can follow it to the buyer.

Implementation notes:
- Reg number entered by the **seller** at listing creation; optional for private sellers but strongly encouraged, with the trust benefit explained in the flow. Applies to native listings; indexed listings rarely carry reg numbers.
- Lookups also work by **stelnummer**, so donor bikes — typically afmeldt, without plates — get the same button via the stelnummer field required on donor listings
- Verify the deep-link URL format during implementation; if prefilled links are unsupported, fall back to a plain link plus the number displayed for copy-paste
- **Link out only.** No scraping, no embedding of their data — consistent with the guardrails in section 8, and zero maintenance burden
- Longer term, official DMR data access could let us verify kW and weight ourselves at listing creation; the outbound link is v1

---

## 6. Donorcykler og brugte reservedele

A second listing category: whole bikes sold for parts or as project machines, and individual used parts. **Positioning is settled: bikes are the product, parts is an extra feature.** Bikerbasen is a motorcycle marketplace with a parts section — never a parts site with bikes attached. Everything below is designed under that constraint.

### 6.1 What the extra feature contributes

Subordinate does not mean unimportant — parts is a hard-working feature:

- **Supply activates faster.** Nobody has a spare motorcycle to sell this month, but plenty of riders have a takeoff exhaust and a box of fairings they'd list tonight.
- **It generates long-tail indexable pages.** "Brugt udstødning Yamaha MT-07", "donorcykel Honda CBR" — low-competition search terms, each a real page. That authority feeds the domain the bike listings live on.
- **Parts buyers return weekly during a rebuild; bike buyers visit once every three years.** Repeat traffic makes search agents and email capture worth building — and every parts visitor is a rider who will eventually buy a bike.
- **It reaches MC-ophuggere and parts traders**, identifiable via CVR, served badly by everyone.

The point of all four: parts exists to feed the bike marketplace with traffic, supply-side habit, and email addresses. Its success is measured by what it sends to the bike side, not by its own volume.

### 6.2 How the hierarchy is enforced in the product

"Main focus on bikes" has to be structural, or the feature will drift toward equal billing:

- **Homepage belongs to bikes.** The licence-class search is the hero. Parts gets one modest entry point — a single nav item, *Reservedele & donorcykler* — not a homepage section.
- **Default search is bike search.** Parts and donor listings never appear in main results. The parts section is somewhere you deliberately go, not something you stumble into.
- **URL structure signals the hierarchy.** Bike listings live at the root of the site's structure; everything else sits under `/reservedele/` and `/donorcykler/`. Search engines and users read the same message: this is a motorcycle site.
- **Cross-links flow toward bikes.** A parts page for an MT-07 exhaust links to rideable MT-07s for sale. A donor bike page links to køreklar versions of the same model. The reverse link — bike page to parts — is small and secondary.
- **Scope stays "extra feature"-sized.** Version one is a simple category tree and plain listings. No compatibility engine, no part-number database, no ambitions that compete with the bike roadmap for build time.

### 6.3 Scope guardrail

The counter-argument to building this at all: a parts marketplace has different taxonomy, search behaviour, and fraud profile, and Facebook groups dominate Danish used MC parts for free. A solo founder building two marketplaces at once ends up with two empty ones. The hierarchy rules above are the answer — parts is bounded so it can never absorb the effort the bike side needs. It ships after dealer onboarding and the first native bike inventory, not before.

### 6.4 Three listing types, not one

The bike side currently assumes every listing is a rideable motorcycle. That assumption has to be made explicit before a second type can exist:

| Type | Description |
|---|---|
| **Køreklar motorcykel** | Rideable. Licence-class filter applies. |
| **Donorcykel** | Whole bike, not roadworthy — crashed, project, or for parts. Licence class does **not** apply. |
| **Reservedel** | Individual part. Licence class does not apply. |

**This is a structural point, not a cosmetic one.** The licence-class filter is the core mechanic, and a donor bike has no licence class — it is not a machine anyone will ride in its current state. Labelling a crashed CBR600 as "A2" would be exactly the kind of misleading precision the site exists to eliminate. Donor and parts listings must be excluded from licence filtering, and must not appear mixed into main search results. Separate tab, separate result set.

### 6.5 Fields that matter

**Donorcykel**
- Stelnummer (frame number) — **required**, see 6.6
- Model, årgang, km
- Papirstatus: registreringsattest present / absent, afmeldt or still registered. This changes the value of a donor bike more than anything else, because it determines whether it can be rebuilt and re-registered or only stripped.
- What is damaged, what is intact — structured, not free text
- Whether the engine turns over

**Reservedel**
- Category tree: motor, undervogn, kåber og plast, udstødning, elektrik, hjul og bremser, styretøj, sæde
- OEM varenummer where known
- **"Passer til"** — which models it fits. This is the hard field and the valuable one. It is also seller-stated, and must be labelled as seller-stated. We do not verify parts compatibility, and per "vi gætter aldrig" we say so plainly rather than implying a verification we haven't done.
- Condition, and whether it is OEM or aftermarket

### 6.6 The risk that has to be designed for up front

Used motorcycle parts markets attract stolen goods. This is the single largest threat this feature carries — not to revenue, but to the brand. A site whose entire promise is trustworthy data cannot become the convenient place to move a stolen frame.

Mitigations to build in from day one, not retrofit:
- **Stelnummer required on every donor bike listing**, displayed publicly. No exceptions, no "unknown" option.
- Terms requiring sellers to confirm legal ownership and right to sell
- A visible reporting mechanism, and a documented process for cooperating with politiet on enquiries
- Consider flagging engine and frame listings for manual review before publication

### 6.7 To verify before building

- Whether Danish miljøbehandling / certified-dismantler requirements for end-of-life vehicles extend to motorcycles, or apply only to cars and vans. This determines whether private individuals may lawfully advertise a whole bike for dismantling, and it is not a question to answer from memory.
- Brugtmoms treatment for dealers selling used parts
- Whether any parts categories carry safety-related resale restrictions

---

## 7. How we make money

**Primary — dealer subscriptions, fed by the claim flow.**
Monthly flat fee, unlimited listings, no per-listing charge and no binding period. This is a deliberate inversion of the Bilbasen model, where per-listing economics punish dealers with slow-moving inventory. Tiering by feature rather than volume: feed integration, profile page, statistics, promoted placement. Acquisition runs through section 4.3: indexed listing → claim → account → subscription. The free indexed tier is the top of the funnel, not a leak in it.

**Secondary — affiliate and lead generation.**
Insurance quotes, financing, extended warranty, transport, gear. Commission per qualified lead. Placed contextually on listing pages, where the buyer's intent is already specific enough to make the lead valuable.

**Deferred — display advertising.**
Not until traffic is meaningful. Ads on a thin site cost credibility and earn little.

**Kept open — private listing fees.**
Free at launch, because private supply is the scarce resource and any friction now costs listings the site cannot spare. But it is a launch-phase decision, not a permanent one — once the marketplace has liquidity, options include paid promoted placement for private listings or a fee on premium features while the basic listing stays free. The copy rule in section 1 exists to keep this door open.

**Parts and donor bikes — free for private sellers, subscription for dismantlers.**
Free private listings, on the same logic as bikes: this category's job is supply and traffic, not direct revenue. MC-ophuggere and parts traders get their own subscription tier, priced below the bike-dealer tier since their per-listing value is lower and their listing count far higher. Shipping integration is a plausible affiliate line here that does not exist on the bike side — parts get posted, motorcycles don't.

**Explicitly ruled out — consumer subscriptions.**
Charging buyers to search would destroy the supply-side flywheel before it starts.

---

## 8. Honest current state

**~602 indexed listings live** from 4 consented sources (616 raw before deduplication). **Zero native listings.** The site is no longer empty — but every listing on it is borrowed supply, indexed under consent, where the seller relationship belongs to the source. The cold-start problem is half-solved: pages and inventory exist; owned supply and owned seller relationships do not.

Already fixed (previously listed as critical — all verified against repo and live site 25.08.2026):
- Homepage volume claim removed — copy now says "samlet ét sted", no fabricated numbers
- Copy rule respected: no occurrence of "altid gratis" / "gratis for evigt"
- Canonical tag: `index.html` canonicalises to the bare root (`https://bikerbasen.dk`), not `/index.html`
- Empty category pages carry `noindex, follow` (all `maerke-*.html`)
- `om-indeksering` (the crawler User-Agent's contact URL) exists and answers 200 live
- Hero line rewritten to match the power-only filter (3.1)
- Dealer onboarding partially exists: "Bliv forhandler" flow and claims section live
- Licence filter and søgeagenter, previously listed as future, are live

Sequencing (step 1, the licence-copy fix, completed 25.08.2026 — see 3.1):

1. **Formalise the aggregation layer** (4.4–4.5): written consent register per source; counsel confirmation of the GDPR position (minimised mode is already enforced in code); keep private-seller sources minimised until confirmed.
2. **Complete the dealer funnel:** claim → account → subscription conversion, then feeds and profile pages. Build the automated claim-verification paths (domain match, code on site) before claim volume makes manual approval a bottleneck or a risk.
3. **A2 model database and slutseddel generator** — owned content and utility that work regardless of inventory mix, and the backbone for *A2 bekræftet*.
4. **Grow supply:** more consented sources, dealer feeds via CVR outreach, first native private listings.
5. **Drive traffic** to real pages; expand email capture beyond the live søgeagenter.
6. **Donor bikes and used parts** as a second supply and traffic engine.
7. **Monetisation infrastructure** on top of the claim funnel.

**Honest copy and data integrity before design polish. Owned supply as the destination, indexed supply as the bridge.**

### Hard guardrails
- **No fabricated or placeholder listings, under any circumstances.** A fake listing on a site whose promise is verified data is a self-inflicted mortal wound.
- **No indexing without documented, per-source, revocable consent.** This replaces the earlier blanket "no scraping" wording with what the crawler actually enforces (`tilladelse_modtaget`) — the legal rationale is unchanged: ophavsretsloven § 71 and the EU database directive for the sources' rights, markedsføringsloven for the competitive relationship, and GDPR for private sellers' personal data, which source consent alone does not cover (4.5). Competitor sites without consent remain fully off-limits.
- **Indexed data is never presented as verified.** Source-stated is unverified until confirmed against a named source.

### Open risks
- The name's proximity to **MCbasen.dk** is an unresolved brand-confusion and trademark question. Danish IP counsel should be engaged before meaningful brand equity accumulates — the cost of a rename rises every month.
- **GDPR basis for private-seller data in indexed listings** (4.5) — same counsel engagement, same urgency. Mitigated in code (minimised mode enforced), not yet confirmed on paper.
