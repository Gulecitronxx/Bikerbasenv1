# Cloudflare foran GitHub Pages

GitHub Pages kan ikke sætte egne svar-headere og låser cache til
`max-age=600`. Audit 23.08.2026 (A3): ingen HSTS, nosniff, frame-ancestors,
Permissions-Policy; hashede filer genhentes hvert 10. minut; gzip, ikke Brotli.
En gratis Cloudflare-zone foran løser det hele uden at flytte sitet — GitHub
Pages bliver ved med at bygge og servere, Cloudflare står bare foran.

To ting er manuelle (konto og nameservere). Resten er kode:

```
node scripts/cloudflare-setup.js --dry-run   # vis hvad der sættes
node scripts/cloudflare-setup.js             # sæt det (idempotent)
node scripts/tjek-headers.js                 # efterprøv (kun læsning) — i dag 6/15
```

## Udgangspunkt (målt 23.08.2026)

| | |
| --- | --- |
| DNS/nameservere | **one.com** (`ns01.one.com`, `ns02.one.com`) |
| Apex `bikerbasen.dk` | A → 185.199.108–111.153 (GitHub Pages) |
| `www` | CNAME → `gulecitronxx.github.io` |
| MX | `0 .` (null MX — **domænet modtager ingen mail**, se "Bonus" nederst) |
| TXT/SPF/DKIM | ingen |
| Certifikat | Let's Encrypt via GitHub, udløber 8. nov 2026 |

## 1. Opret zonen (manuelt, 5 min)

1. Opret en konto på dash.cloudflare.com (Free-plan rækker).
2. **Add a site** → `bikerbasen.dk` → Free.
3. Cloudflare scanner DNS'en hos one.com og importerer de fire A-records og `www`.
   Tjek at de står der; scriptet retter dem alligevel i trin 3.
4. Notér de to nameservere, Cloudflare giver dig (fx `ada.ns.cloudflare.com`,
   `bob.ns.cloudflare.com`).

## 2. Skift nameservere hos one.com (manuelt, 2 min + op til 24 t udbredelse)

one.com → Kontrolpanel → domænet → **DNS-indstillinger** → *Brug andre
nameservere* (wording varierer) → indsæt de to fra trin 1.

Ingen mail at miste: MX er null, så der er ikke noget mailsetup at flytte med.
Sitet er oppe hele vejen — begge nameserversæt peger på GitHub, indtil
Cloudflare-zonen er aktiv og proxyen tager over.

## 3. Kør opsætningen (kode)

Lav et API-token: dash.cloudflare.com → My Profile → API Tokens → *Create
Token* → *Create Custom Token* med:

- Zone · Zone Settings · **Edit**
- Zone · Zone · **Read**
- Zone · DNS · **Edit**
- Zone · Transform Rules · **Edit**
- Zone · Cache Rules · **Edit**

Zone Resources: *Include · Specific zone · bikerbasen.dk*.

```powershell
$env:CLOUDFLARE_API_TOKEN = "..."
node scripts/cloudflare-setup.js --dry-run
node scripts/cloudflare-setup.js
```

Det sætter:

| Hvad | Værdi | Hvorfor |
| --- | --- | --- |
| SSL/TLS | **Full (strict)** | GitHub har et gyldigt cert. *Aldrig* Flexible: redirect-løkke mod GitHubs "Enforce HTTPS". |
| Always Use HTTPS, Automatic HTTPS Rewrites | on | |
| Min TLS 1.2, TLS 1.3, Brotli, Early Hints | on | |
| Rocket Loader, Email Obfuscation | **off** | De injicerer scripts/ændrer markup; sitet har en CSP og minificerer selv. |
| HSTS | 1 år, includeSubDomains, preload | Zone-indstilling (ikke Transform Rule), så headeren kun står én gang. |
| DNS | A ×4 → GitHub, `www` CNAME → `gulecitronxx.github.io`, **proxied** | Uden proxy sker intet af det her. |
| Transform Rule "sikkerhedsheadere" | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy: frame-ancestors 'none'`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy: same-origin-allow-popups` | Header-CSP'en indeholder **kun** frame-ancestors; sidens fulde CSP bliver i `<meta>`. Begge gælder. |
| Transform Rule "versionerede filer" | `Cache-Control: public, max-age=31536000, immutable` på `?v=`-stemplede css/js/woff2 | Indholdet skifter adresse, når det ændres (`scripts/stamp-version.js`). |
| Cache Rule | samme filer: edge-TTL og browser-TTL 1 år | HTML caches ikke (Cloudflares standard) — deploys slår igennem med det samme. |

Scriptet er idempotent og skriver kun det, der afviger. Har zonen allerede
Transform/Cache Rules, som ikke er lavet af scriptet, siger den det, før den
erstatter dem.

## 4. Efterprøv

```
node scripts/tjek-headers.js
```

Alle 15 linjer skal stå `OK` (cf-ray, HSTS, nosniff, XFO, frame-ancestors,
Permissions-Policy, Referrer-Policy, meta-CSP intakt, Brotli, immutable på
css, HTML ikke langtidscachet, http→https, www→apex, `/soegning` 200, ukendt
sti 404). Når den er grøn: tilmeld domænet på hstspreload.org.

## Hvis noget går galt

- **526/525 efter skiftet**: GitHubs cert er ikke gyldigt for origin → sæt
  SSL midlertidigt til *Full* (ikke strict) i Cloudflare og kig i repoets
  Settings → Pages om certifikatet er fornyet. GitHub fornyer via HTTP-01
  gennem proxyen; det virker med *Full*/*Full (strict)*.
- **Redirect-løkke**: nogen har sat SSL til Flexible. Sæt Full (strict).
- **Rulle tilbage helt**: skift nameserverne hos one.com tilbage til
  `ns01/ns02.one.com` (DNS'en der er urørt). Eller slå proxyen fra på de fem
  records (grå sky) — så svarer GitHub direkte igen, uden headerne.
- GitHub → Settings → Pages kan vise en gul DNS-advarsel, når A-records'ene
  bag proxyen ikke er GitHubs egne. Det er kosmetisk; sitet serveres stadig.

## Bonus: `kontakt@bikerbasen.dk` findes ikke

MX er `0 .` (null MX). Privatlivspolitikken, om-indeksering.html og
CLAUDE.md's regel 4 henviser til `kontakt@bikerbasen.dk` — mails dertil
afvises i dag. Når zonen er på Cloudflare: **Email → Email Routing** (gratis)
→ tilføj `kontakt@` → videresend til en rigtig postkasse → Cloudflare sætter
MX/SPF selv. Det er ikke en del af scriptet (kræver klik på en
bekræftelsesmail).
