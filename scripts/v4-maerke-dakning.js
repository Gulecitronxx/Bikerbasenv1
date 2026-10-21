/* V4 mærkedækningsrunner (uafhængig kritiker) — kontrollerer, at ALLE mærker i lageret hænger sammen på tværs af
   søgning, mærkesider, oversigt, logoer og annonceoprettelse, og at ingen eksisterende annonce er skiftet mærke.

   Kør:  node scripts/v4-maerke-dakning.js                              (alle mærker, offline fixtures, 1440 px)
         node scripts/v4-maerke-dakning.js --hurtig                     (delmængde: 7 mærker, få sider — bruges af testen)
         node scripts/v4-maerke-dakning.js --maerker "Honda,BMW"         (kun disse mærker i de browserdrevne tjek)
         node scripts/v4-maerke-dakning.js --rod C:\sti\til\build --data live --snapshot work/v4-live-snapshot.json
         node scripts/v4-maerke-dakning.js --register img/brands/manifest.json   (mærkeregister; standard se nedenfor)
         node scripts/v4-maerke-dakning.js --baseline docs/review/gauntlet/v4/qa/maerke-baseline-live.json
         node scripts/v4-maerke-dakning.js --gem-baseline <fil>         (skriv baseline: annonce-id -> mærke + sider)
         node scripts/v4-maerke-dakning.js --kendt scripts/v4-maerke-dakning.kendt.json   (kendte fund tæller ikke i exit)
         node scripts/v4-maerke-dakning.js --rapport work/v4-maerke.json --strikt

   DATA.  --data fixtures (standard): Supabase besvares af scripts/smoke-fixtures.js; intet forlader maskinen.
          --data live: runneren LÆSER lageret fra produktions-Supabase (kun GET, som siden selv gør; hver adresse hentes
          én gang pr. kørsel og serveres derefter fra cache til alle sider). ALLE andre metoder mod *.supabase.co afvises
          og tælles som overtrædelse (skal være 0). --snapshot <fil> gemmer/genbruger svarene (offline genkørsel).
          Siden serveres på værten bb-qa.test (ikke localhost), så SHOW_DEMO_DATA er false som i drift: lageret er det
          samme som besøgende ser, uden demoannoncer.

   REGISTER. Standard: img/brands/register.json eller js/brand-register.json hvis de findes, ellers img/brands/manifest.json
          (nuværende mærkeliste). Format: { maerker:[{ slug, navn, aliaser[], fil|null, godkendt, varianter{}, hash }] } eller
          et array. Valgfrit pr. mærke: opret:false (ikke relevant i opret-annonce). Når Agent 1's register har et andet
          format, tilpasses KUN normaliserRegister() herunder.

   TJEK (grupper svarer til opgavens punkt 1-6):
     1 filter   mærket findes i søgningens mærkefilter, kan vælges (søg + afkryds) og giver det antal annoncer, lageret har;
                mærkesiden (hydreret [data-mk-n]) og oversigtens tal er det samme; statisk tal i live-tilstand
     2 alias    navn/alias/slug virker i søgningens fritekst (syntetisk annonce for alle registermærker, rigtig annonce
                for kerne-aliasser) og i hurtigsøgningen på maerker.html
     3 logo     manifest-slug, fil (findes, hash), generated logo-data i synk, link maerke-<slug>.html, mærkenavn og alt-tekst
     4 opret    #f-brand i opret-annonce har alle relevante registermærker og alle lagermærker, også uden annoncer
     5 regress  hvert annonce-id har samme mærke som i baseline (gem baseline fra gauntlet/master 95df5046)
     6 side     ingen dubletter (slug, navn, alias, stavemåde, sider), ingen ødelagte mærkesider, URL'er bevares, tomme
                mærkesider er noindex
     7 v5       (scripts/v5-maerke-krav.js) "Andet mærke" i opret-annonce, levende hydrering af "Flere mærker" (mocket Zero-annonce),
                hurtigsøgningen finder piller, ukendt ?brands=xyz spejles ikke i H1. Kendte fund: --kendt. --uden-v5 springer over,
                --streng-v5 tæller v5-krav som nye fejl, selvom de står i kendt-listen (brug efter merge).

   Niveauer: fejl (exit 1), advarsel (kun med --strikt), info. Fund i --kendt-listen tælles ikke (men vises).
   Exit 0 = ingen (nye) fejl, 1 = fejl fundet, 2 = kunne ikke køre.

   Brug som modul:  const { koer } = require('./v4-maerke-dakning'); const r = await koer({ hurtig: true }); */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const sb = require('./smoke-browser');
const { slugify } = require('./slug');
const { restSvar, PNG_1X1 } = require('./smoke-fixtures');

const REPO = path.join(__dirname, '..');
const VAERT = 'bb-qa.test';
const HURTIG_MAERKER = ['Honda', 'Harley-Davidson', 'BMW', 'MV Agusta', 'Lauge Jensen', 'CFMoto', 'Zero'];
/* Kerne-aliasser fra opgaven: skal virke i fritekst. [søgeord, registerslug] */
const KERNE_ALIAS = [
  ['cf moto', 'cfmoto'], ['CFMOTO', 'cfmoto'], ['cfmoto', 'cfmoto'], ['cf-moto', 'cfmoto'],
  ['harley', 'harley-davidson'], ['Harley-Davidson', 'harley-davidson'], ['hd', 'harley-davidson'], ['harley davidson', 'harley-davidson'],
  ['zero', 'zero'], ['Zero Motorcycles', 'zero'],
  ['mv agusta', 'mv-agusta'], ['MV AGUSTA', 'mv-agusta'], ['mvagusta', 'mv-agusta'],
];
const UKENDT = new Set(['ukendt', 'andet-maerke', 'andet', 'ukendt-maerke', 'ikke-oplyst']);

const fold = s => slugify(String(s == null ? '' : s));
const afkod = s => String(s).replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const laes = (rod, rel) => { try { return fs.readFileSync(path.join(rod, rel), 'utf8'); } catch (e) { return null; } };
const findes = (rod, rel) => { try { return fs.statSync(path.join(rod, rel)).isFile(); } catch (e) { return false; } };

/* ---------- Fund ---------- */

function nyFundliste() {
  const fund = [];
  const daekning = {};
  const tilfoej = (gruppe, tjek, niveau, maerke, detalje) => fund.push({ gruppe, tjek, niveau, maerke: maerke || '*', detalje: String(detalje).slice(0, 400) });
  const taelUd = (noegle, n = 1) => { daekning[noegle] = (daekning[noegle] || 0) + n; };
  return { fund, tilfoej, daekning, taelUd };
}

/* ---------- Register ---------- */

function normaliserRegister(raa, kilde) {
  const liste = Array.isArray(raa) ? raa : (raa && (raa.maerker || raa.brands)) || [];
  const maerker = liste.map(e => {
    const navn = String(e.navn || e.name || e.n || '').trim();
    const logo = e.logo && typeof e.logo === 'object' ? e.logo : null;
    return {
      slug: String(e.slug || e.s || fold(navn)),
      navn,
      aliaser: (e.aliaser || e.aliases || e.a || []).map(String),
      fil: e.fil !== undefined ? e.fil : (logo ? logo.fil : null) || null,
      godkendt: e.godkendt !== undefined ? !!e.godkendt : !!(e.fil || logo),
      varianter: e.varianter || {},
      hash: e.hash || null,
      opret: e.opret !== false && e.skjult !== true,
    };
  });
  return { kilde, maerker };
}

/* V4: det RIGTIGE register er js/brands-registry.js (Agent 1): alle() = poster med navn/slug/aliaser/periode/kilder/logo,
   valgbare() = navne i opret-annonce. Logofil/hash/godkendelse hentes fra img/brands/manifest.json via logo-nøglen. */
function indlaesRegistry(rod) {
  const sti = path.join(rod, 'js', 'brands-registry.js');
  if (!fs.existsSync(sti)) return null;
  delete require.cache[require.resolve(sti)];
  const BR = require(sti);
  let manifest = { maerker: [] };
  try { manifest = JSON.parse(fs.readFileSync(path.join(rod, 'img/brands/manifest.json'), 'utf8')); } catch (e) { /* ingen logoer */ }
  const mi = new Map((manifest.maerker || []).map(m => [m.slug, m]));
  const maerker = BR.alle().map(p => {
    const nk = p.logo || p.slug;
    const m = mi.get(nk) || {};
    return { slug: p.slug, navn: p.navn, aliaser: (p.aliaser || []).slice(), fil: m.fil || null, godkendt: !!(m.fil && m.godkendt), varianter: m.varianter || {}, hash: m.hash || null, opret: true, periode: p.periode, logoNoegle: nk, offentlig: p.offentlig !== false };
  });
  return { kilde: 'js/brands-registry.js (logoer fra img/brands/manifest.json)', maerker, registry: BR, valgbare: BR.valgbare() };
}

function indlaesRegister(rod, registerArg) {
  if (!registerArg) { const r = indlaesRegistry(rod); if (r) return r; }
  const kandidater = registerArg
    ? [path.isAbsolute(registerArg) ? registerArg : path.resolve(registerArg)]
    : ['img/brands/manifest.json'].map(r => path.join(rod, r));
  for (const k of kandidater) {
    try { return normaliserRegister(JSON.parse(fs.readFileSync(k, 'utf8')), path.relative(rod, k) || k); } catch (e) { /* næste */ }
  }
  throw new Error(`Intet mærkeregister fundet (prøvede ${kandidater.join(', ')}).`);
}

function opslagFraRegister(reg) {
  const m = new Map();
  for (const e of reg.maerker) {
    for (const n of [e.slug, e.navn, ...e.aliaser]) { const k = fold(n); if (k && !m.has(k)) m.set(k, e); }
  }
  return m;
}
const registerMaerkeFor = (opslag, navn) => opslag.get(fold(navn)) || null;
/* Sidens filnavn følger registrets slug (ekstra.slug kan afvige fra slugify(navn) for at bevare URL'er). */
const sideFil = (opslag, navn) => { const e = opslag.get(fold(navn)); return `maerke-${e ? e.slug : slugify(navn)}.html`; };

/* ---------- Statiske tjek (ingen browser) ---------- */

function parsMaerkeSide(rod, fil) {
  const h = laes(rod, fil) || '';
  const tag = re => { const m = h.match(re); return m ? afkod(m[1]) : null; };
  const h1 = [...h.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)].map(m => afkod(m[1].replace(/<[^>]+>/g, '')).trim());
  const bl = [...h.matchAll(/<span class="bl [^"]*"[^>]*data-bl="([^"]+)"[^>]*>/g)].map(m => ({ slug: m[1], tag: m[0] }));
  const srcs = [...h.matchAll(/data-bl-src="([^"]+)"/g)].map(m => m[1]);
  const alt = [...h.matchAll(/<img class="bl-(?:ref|img)"[^>]*alt="([^"]*)"/g)].map(m => afkod(m[1]));
  const statisk = h.match(/<span data-mk-n>([\d.]+)<\/span>/);
  return {
    fil, html: h,
    brand: tag(/<body[^>]*data-mk-brand="([^"]*)"/),
    canonical: tag(/<link rel="canonical" href="([^"]*)"/),
    noindex: /<meta name="robots" content="[^"]*noindex/i.test(h),
    h1, bl, srcs, alt,
    statiskAntal: statisk ? Number(statisk[1].replace(/\./g, '')) : null,
    soeglink: [...h.matchAll(/href="soegning\.html\?brands=([^"&]+)"/g)].map(m => decodeURIComponent(m[1])),
  };
}

function parsOversigt(rod) {
  const h = laes(rod, 'maerker.html');
  if (h == null) return null;
  const raekker = [...h.matchAll(/<li data-mk-soeg="([^"]*)"><a href="([^"]+)">([\s\S]*?)<\/a><\/li>/g)].map(m => {
    const navn = m[3].match(/<span>([^<]+)<\/span><\/span><span class="mk-az-n">([\d.]+)<\/span>/);
    return {
      soeg: m[1].split('|'), href: m[2], navn: navn ? afkod(navn[1]) : null, antal: navn ? Number(navn[2].replace(/\./g, '')) : null,
      bl: (m[3].match(/data-bl="([^"]+)"/) || [])[1] || null, src: (m[3].match(/data-bl-src="([^"]+)"/) || [])[1] || null,
    };
  });
  const alleLinks = [...h.matchAll(/href="(maerke-[^"#?]+\.html)"/g)].map(m => m[1]);
  /* "Flere mærker": ikke-klikbare piller (<ul class="mk-flere">) for registermærker uden annoncer/side. */
  const piller = [];
  for (const m of h.matchAll(/<ul class="(mk-flere[^"]*)"[^>]*>([\s\S]*?)<\/ul>/g)) {
    const historisk = /mk-flere-hist/.test(m[1]);
    for (const li of m[2].matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)) piller.push({ navn: afkod(li[1].replace(/<[^>]+>/g, '')).trim(), historisk, link: /<a\b/i.test(li[1]) });
  }
  /* V5: tallene står i <span data-mk-flere-n>/<span data-mk-alle> (js/maerker-lager.js kan opdatere dem); teksten læses uden spans. */
  const hTekst = h.replace(/<span data-mk-(?:flere-n|alle)>([^<]*)<\/span>/g, '$1');
  const tal = re => { const x = hTekst.match(re); return x ? Number(x[1]) : null; };
  const flere = { piller, overskrift: tal(/Flere mærker \((\d+)\)/), intro: tal(/Disse (\d+) mærker/), historisk: tal(/Historiske mærker \((\d+)\)/), uoplyst: tal(/(\d+) annoncer? (?:oplyser ikke et mærke|har intet mærke fra vores liste)/), alle: tal(/Søg blandt alle (\d+) annoncer/) };
  return { raekker, alleLinks, flere };
}

function sitemapMaerker(rod) {
  const x = laes(rod, 'sitemap.xml');
  if (x == null) return null;
  return [...x.matchAll(/<loc>([^<]*)<\/loc>/g)].map(m => m[1]).filter(u => /\/maerke-[^/]+$/.test(u) || /\/maerker$/.test(u));
}

function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }

function statiskeTjek(rod, reg, opslag, T) {
  const { tilfoej } = T;
  const G = 'side';
  /* --- register: dubletter --- */
  const slugs = new Map(), navne = new Map(), aliasEjer = new Map();
  for (const e of reg.maerker) {
    if (!e.navn) tilfoej(G, 'register-uden-navn', 'fejl', e.slug, 'registerrække uden navn');
    if (slugs.has(e.slug)) tilfoej(G, 'dublet-slug', 'fejl', e.navn, `slug "${e.slug}" bruges af både ${slugs.get(e.slug)} og ${e.navn}`);
    slugs.set(e.slug, e.navn);
    if (e.slug !== slugify(e.navn) && e.slug !== fold(e.navn)) tilfoej(G, 'slug-afviger-fra-navn', reg.registry ? 'info' : 'advarsel', e.navn, `slug "${e.slug}" ≠ slugify("${e.navn}") = "${slugify(e.navn)}" — maerke-<slug>.html og logoets data-bl kan glide fra hinanden`);
    const nk = fold(e.navn);
    if (navne.has(nk)) tilfoej(G, 'dublet-navn', 'fejl', e.navn, `navnet foldes til samme nøgle som ${navne.get(nk)}`);
    navne.set(nk, e.navn);
  }
  for (const e of reg.maerker) {
    for (const a of e.aliaser) {
      const k = fold(a);
      if (!k) { tilfoej(G, 'alias-tomt', 'advarsel', e.navn, `tomt/ugyldigt alias "${a}"`); continue; }
      if (navne.has(k) && navne.get(k) !== e.navn) tilfoej(G, 'alias-kolliderer-med-navn', 'fejl', e.navn, `alias "${a}" er også navnet på ${navne.get(k)}`);
      if (aliasEjer.has(k) && aliasEjer.get(k) !== e.navn) tilfoej(G, 'alias-to-maerker', 'fejl', e.navn, `alias "${a}" ejes også af ${aliasEjer.get(k)}`);
      aliasEjer.set(k, e.navn);
    }
  }

  /* --- det rigtige register (js/brands-registry.js): egne invarianter, valgbarhed, normalisering --- */
  if (reg.registry) {
    const BR = reg.registry;
    for (const d of BR.dubletter || []) tilfoej(G, 'register-dublet', 'fejl', '*', d);
    const valg = new Set(reg.valgbare || []);
    for (const e of reg.maerker) {
      if (!valg.has(e.navn)) tilfoej('opret', 'register-ikke-valgbar', 'fejl', e.navn, 'BrandRegistry.valgbare() mangler mærket — mærker uden annoncer skal kunne vælges i opret-annonce');
      for (const v of new Set([e.navn, e.navn.toUpperCase(), e.slug, e.slug.replace(/-/g, ' '), ...e.aliaser])) {
        if (BR.normalise(v) !== e.navn) tilfoej('alias', 'register-normalise', 'fejl', e.navn, `BrandRegistry.normalise("${v}") = ${BR.normalise(v)}, forventet ${e.navn}`);
      }
      const fs2 = BR.fraSlug(e.slug);
      if (!fs2 || fs2.navn !== e.navn) tilfoej(G, 'register-fraSlug', 'fejl', e.navn, `fraSlug("${e.slug}") giver ikke mærket`);
    }
    for (const v of BR.UKENDT_ALIASER || []) if (BR.normalise(v) !== BR.UKENDT) tilfoej(G, 'register-uoplyst', 'fejl', v, `"${v}" skal normaliseres til ${BR.UKENDT}`);
  }

  /* --- logo: fil, hash, godkendt --- */
  for (const e of reg.maerker) {
    if (e.fil) {
      if (!findes(rod, e.fil)) tilfoej('logo', 'logo-fil-mangler', 'fejl', e.navn, `${e.fil} findes ikke`);
      else if (e.hash) {
        const buf = fs.readFileSync(path.join(rod, e.fil));
        const lf = Buffer.from(buf.toString('utf8').replace(/\r\n/g, '\n'));
        if (sha256(buf) !== e.hash && sha256(lf) !== e.hash) tilfoej('logo', 'logo-hash', 'advarsel', e.navn, `${e.fil}: SHA-256 afviger fra registret (filen er ændret uden at registret er opdateret)`);
      }
      for (const [v, d] of Object.entries(e.varianter || {})) {
        if (d && d.fil && !findes(rod, d.fil)) tilfoej('logo', 'logo-variant-mangler', 'fejl', e.navn, `${v}: ${d.fil} findes ikke`);
      }
    } else if (e.godkendt) {
      tilfoej('logo', 'godkendt-uden-fil', 'fejl', e.navn, 'godkendt:true men ingen fil — siden ville vise et logo, der ikke findes');
    }
  }
  /* genereret logodata i synk med registret (kun når registret ER manifestet; ellers sammenlignes på slug/navn/aliaser/fil) */
  try {
    const dataSti = path.join(rod, 'js/brand-logos-data.js'), kernSti = path.join(rod, 'js/brand-logos.js');
    for (const s of [dataSti, kernSti]) delete require.cache[require.resolve(s)];
    const BL = require(kernSti);
    for (const e of reg.maerker) {
      const l = BL.logoFor(e.navn);
      const nk = e.logoNoegle || e.slug;
      if (l.slug !== nk) tilfoej('logo', 'logo-slug', 'fejl', e.navn, `BrandLogos.normaliser("${e.navn}") = ${l.slug}, registret siger ${nk}`);
      if (l.navn !== e.navn) tilfoej('logo', 'logo-navn', 'fejl', e.navn, `BrandLogos viser navnet "${l.navn}" (ordmærke/monogram-fallback og logo-tekst), registret "${e.navn}"`);
      if (l.harLogo !== !!(e.fil && e.godkendt)) tilfoej('logo', 'logo-status', 'fejl', e.navn, `harLogo=${l.harLogo}, men registret har fil=${e.fil} godkendt=${e.godkendt} (generated js/brand-logos-data.js er ikke i synk — kør node scripts/brand-logos-gen.js)`);
      else if (l.harLogo && l.src !== e.fil) tilfoej('logo', 'logo-src', 'fejl', e.navn, `BrandLogos peger på ${l.src}, registret på ${e.fil}`);
      for (const a of e.aliaser) {
        const sl = BL.normaliser(a);
        if (sl !== nk) tilfoej('logo', 'logo-alias', reg.registry ? 'advarsel' : 'fejl', e.navn, `BrandLogos.normaliser("${a}") = ${sl}, forventet ${nk}`);
      }
    }
    for (const m of BL.version !== undefined ? require(dataSti).m : []) {
      if (!reg.maerker.some(e => (e.logoNoegle || e.slug) === m.s)) tilfoej('logo', 'logodata-uden-register', 'advarsel', m.n, `js/brand-logos-data.js har ${m.s}, som ikke findes i registret`);
    }
  } catch (e) {
    tilfoej('logo', 'logo-kerne', 'advarsel', '*', `kunne ikke indlæse js/brand-logos.js: ${String(e.message).split('\n')[0]}`);
  }

  /* --- mærkesider --- */
  const filer = fs.readdirSync(rod).filter(f => /^maerke-.+\.html$/.test(f)).sort();
  const sider = filer.map(f => parsMaerkeSide(rod, f));
  const perCanon = new Map(), perBrand = new Map();
  for (const s of sider) {
    const e = s.brand ? registerMaerkeFor(opslag, s.brand) : null;
    const navn = s.brand || s.fil;
    if (!s.brand) tilfoej(G, 'side-uden-data-mk-brand', 'fejl', s.fil, '<body data-mk-brand> mangler');
    if (s.brand && !e) tilfoej(G, 'side-uden-register', 'fejl', s.brand, `${s.fil}: mærket findes ikke i registret`);
    if (s.brand && fold(s.brand) && sideFil(opslag, s.brand) !== s.fil) tilfoej(G, 'side-filnavn', 'fejl', s.brand, `filen hedder ${s.fil}, men ${sideFil(opslag, s.brand)} forventes ud fra navnet (URL ≠ mærke)`);
    if (e && s.brand !== e.navn) tilfoej(G, 'side-navn', 'fejl', s.brand, `siden bruger "${s.brand}", registret "${e.navn}"`);
    const forventetCanon = `https://bikerbasen.dk/${s.fil.replace(/\.html$/, '')}`;
    if (s.canonical !== forventetCanon) tilfoej(G, 'side-canonical', 'fejl', navn, `canonical ${s.canonical} ≠ ${forventetCanon}`);
    if (s.h1.length !== 1) tilfoej(G, 'side-h1', 'fejl', navn, `${s.h1.length} h1-elementer`);
    else if (s.brand && !fold(s.h1[0]).includes(fold(s.brand))) tilfoej(G, 'side-h1-navn', 'fejl', navn, `h1 "${s.h1[0]}" nævner ikke mærket`);
    if (s.brand && !s.soeglink.some(x => fold(x) === fold(s.brand))) tilfoej(G, 'side-soeglink', 'fejl', navn, `intet link soegning.html?brands=${s.brand}`);
    if (s.statiskAntal === 0 && !s.noindex) tilfoej(G, 'tom-side-indekserbar', 'fejl', navn, `${s.fil} viser 0 annoncer men er ikke noindex (regel: ingen tomme indekserbare mærkesider)`);
    if (s.statiskAntal == null) tilfoej(G, 'side-uden-antal', 'advarsel', navn, `${s.fil}: intet [data-mk-n] — antallet kan ikke tjekkes`);
    for (const b of s.bl) if (e && b.slug !== (e.logoNoegle || e.slug)) tilfoej('logo', 'side-logo-slug', 'fejl', navn, `${s.fil}: logo data-bl="${b.slug}", registret ${e.logoNoegle || e.slug}`);
    for (const src of s.srcs) if (!findes(rod, src)) tilfoej('logo', 'side-logo-fil', 'fejl', navn, `${s.fil}: ${src} findes ikke`);
    /* alt-tekst: dekorativt (aria-hidden + tom alt) ELLER alt nævner mærket */
    for (const b of s.bl) if (!/aria-hidden="true"/.test(b.tag)) tilfoej('logo', 'side-logo-a11y', 'advarsel', navn, `${s.fil}: logo ${b.slug} er hverken aria-hidden eller har alt`);
    for (const a of s.alt) if (a && s.brand && !fold(a).includes(fold(s.brand))) tilfoej('logo', 'side-logo-alt', 'fejl', navn, `${s.fil}: alt "${a}" nævner ikke mærket`);
    const ck = s.canonical || s.fil;
    perCanon.set(ck, [...(perCanon.get(ck) || []), s.fil]);
    const bk = fold(s.brand || s.fil);
    perBrand.set(bk, [...(perBrand.get(bk) || []), s.fil]);
  }
  for (const [k, l] of perCanon) if (l.length > 1) tilfoej(G, 'dublet-side-canonical', 'fejl', k, `samme canonical på ${l.join(', ')}`);
  for (const [k, l] of perBrand) if (l.length > 1) tilfoej(G, 'dublet-side-maerke', 'fejl', k, `flere sider for samme mærke: ${l.join(', ')}`);

  /* --- oversigt (maerker.html) --- */
  const ov = parsOversigt(rod);
  if (!ov) tilfoej(G, 'oversigt-mangler', 'fejl', '*', 'maerker.html findes ikke');
  else {
    const set = new Set(), dubl = new Set();
    for (const l of ov.alleLinks) { if (!findes(rod, l)) tilfoej(G, 'oversigt-doedt-link', 'fejl', l, `maerker.html linker til ${l}, som ikke findes`); }
    for (const r of ov.raekker) {
      if (set.has(r.href)) dubl.add(r.href);
      set.add(r.href);
      const e = r.navn ? registerMaerkeFor(opslag, r.navn) : null;
      const n = r.navn || r.href;
      if (!e) { tilfoej(G, 'oversigt-uden-register', 'fejl', n, `oversigten viser "${r.navn}", der ikke findes i registret`); continue; }
      if (r.navn !== e.navn) tilfoej(G, 'oversigt-navn', 'fejl', e.navn, `oversigten viser "${r.navn}"`);
      if (r.href !== `maerke-${e.slug}.html`) tilfoej(G, 'oversigt-link', 'fejl', e.navn, `link ${r.href} ≠ maerke-${e.slug}.html`);
      if (r.bl && r.bl !== (e.logoNoegle || e.slug)) tilfoej('logo', 'oversigt-logo-slug', 'fejl', e.navn, `data-bl="${r.bl}" ≠ ${e.logoNoegle || e.slug}`);
      if (r.src && !findes(rod, r.src)) tilfoej('logo', 'oversigt-logo-fil', 'fejl', e.navn, `${r.src} findes ikke`);
      if (r.src && !e.fil) tilfoej('logo', 'oversigt-logo-uden-register', 'fejl', e.navn, `oversigten tegner ${r.src}, men registret har ingen logofil`);
      if (r.src && e.fil && ![e.fil, ...Object.values(e.varianter || {}).map(v => v && v.fil)].includes(r.src)) tilfoej('logo', 'oversigt-logo-anden-fil', 'fejl', e.navn, `${r.src} er ikke registrets fil/variant (${e.fil})`);
      if (!e.fil && r.bl && r.src == null && e.godkendt) tilfoej('logo', 'oversigt-logo-mangler', 'advarsel', e.navn, 'godkendt logo, men oversigten viser monogram');
      for (const a of e.aliaser) if (!r.soeg.some(x => fold(x) === fold(a))) tilfoej('alias', 'oversigt-alias-mangler', 'advarsel', e.navn, `alias "${a}" mangler i data-mk-soeg på maerker.html (hurtigsøgningen finder det ikke)`);
      if (!findes(rod, r.href)) tilfoej(G, 'oversigt-side-mangler', 'fejl', e.navn, `${r.href} findes ikke`);
    }
    for (const d of dubl) tilfoej(G, 'dublet-oversigt', 'fejl', d, 'samme mærke to gange i A–Z-listen');
    /* "Flere mærker": registermærker uden side vises som piller, aldrig som link; hvert registermærke står præcis ét sted. */
    const fl = ov.flere;
    if (reg.registry) {
      const iListe = new Set(ov.raekker.map(r => r.navn && fold(r.navn)));
      const iPiller = new Map();
      for (const p of fl.piller) {
        const e = registerMaerkeFor(opslag, p.navn);
        if (p.link) tilfoej(G, 'flere-pille-er-link', 'fejl', p.navn, 'pillen i "Flere mærker" er et link, men mærket har ingen side (ingen blindgyde/tom side)');
        if (!e) { tilfoej(G, 'flere-pille-uden-register', 'fejl', p.navn, 'pillen er ikke i registret'); continue; }
        if (e.navn !== p.navn) tilfoej(G, 'flere-pille-navn', 'fejl', e.navn, `pillen skriver "${p.navn}"`);
        if (iPiller.has(fold(p.navn))) tilfoej(G, 'dublet-flere-pille', 'fejl', p.navn, 'mærket står to gange i "Flere mærker"');
        iPiller.set(fold(p.navn), p);
        if (iListe.has(fold(p.navn))) tilfoej(G, 'maerke-baade-raekke-og-pille', 'fejl', p.navn, 'mærket er både A–Z-række (med link) og "Flere mærker"-pille');
        if (findes(rod, `maerke-${e.slug}.html`)) tilfoej(G, 'pille-med-side', 'fejl', p.navn, `maerke-${e.slug}.html findes, men mærket vises som pille uden link`);
        if ((e.periode === 'historisk') !== p.historisk) tilfoej(G, 'flere-pille-periode', 'fejl', p.navn, `pillen står under ${p.historisk ? 'historiske' : 'aktuelle'}, registret siger ${e.periode}`);
      }
      for (const e of reg.maerker) if (e.offentlig !== false && !iListe.has(fold(e.navn)) && !iPiller.has(fold(e.navn))) tilfoej(G, 'maerke-ikke-paa-oversigt', 'fejl', e.navn, 'registermærket står hverken som A–Z-række eller "Flere mærker"-pille (skjult mærke)');
      const hist = fl.piller.filter(p => p.historisk).length;
      if (fl.overskrift != null && fl.overskrift !== fl.piller.length) tilfoej(G, 'flere-tal', 'fejl', '*', `overskriften siger ${fl.overskrift}, men der er ${fl.piller.length} piller`);
      if (fl.intro != null && fl.intro !== fl.piller.length) tilfoej(G, 'flere-tal', 'fejl', '*', `introen siger ${fl.intro}, men der er ${fl.piller.length} piller`);
      if (fl.historisk != null && fl.historisk !== hist) tilfoej(G, 'flere-tal', 'fejl', '*', `"Historiske mærker" siger ${fl.historisk}, men der er ${hist} historiske piller`);
      /* V5: mærker uden belæg (offentlig:false: Daelim, Super Soco, TM Racing) står ikke offentligt, medmindre de har annoncer og dermed en række. */
      const forventet = reg.maerker.filter(e => e.offentlig !== false || iListe.has(fold(e.navn))).length;
      if (ov.raekker.length + fl.piller.length !== forventet) tilfoej(G, 'oversigt-sum', 'fejl', '*', `${ov.raekker.length} rækker + ${fl.piller.length} piller ≠ ${forventet} offentlige registermærker`);
      for (const e of reg.maerker) if (e.offentlig === false && iPiller.has(fold(e.navn))) tilfoej(G, 'ubelagt-maerke-offentligt', 'fejl', e.navn, 'mærket har intet belæg (offentlig:false), men står som pille på maerker.html');
    }
    for (const s of sider) if (!set.has(s.fil) && !s.noindex) tilfoej(G, 'side-ikke-i-oversigt', 'advarsel', s.brand || s.fil, `${s.fil} er indekserbar men ikke i maerker.html`);
  }
  /* --- sitemap --- */
  const sm = sitemapMaerker(rod);
  if (sm) {
    const set = new Set();
    for (const u of sm) { if (set.has(u)) tilfoej(G, 'dublet-sitemap', 'fejl', u, 'URL to gange i sitemap.xml'); set.add(u); }
    for (const u of sm) {
      const f = u.replace(/^https:\/\/bikerbasen\.dk\//, '');
      if (f && f !== 'maerker' && !findes(rod, f + '.html')) tilfoej(G, 'sitemap-doedt', 'fejl', f, `sitemap.xml peger på ${u}, men ${f}.html findes ikke`);
      const s = sider.find(x => x.fil === f + '.html');
      if (s && s.noindex) tilfoej(G, 'sitemap-noindex', 'fejl', f, 'noindex-side i sitemap.xml');
    }
  }
  return { sider, oversigt: ov, sitemap: sm };
}

/* ---------- Baseline ---------- */

function git(rod, ...args) {
  try { const r = spawnSync('git', args, { cwd: rod, encoding: 'utf8' }); return r.status === 0 ? r.stdout.trim() : null; } catch (e) { return null; }
}

function byggBaseline(rod, statisk, lager, dataTilstand) {
  const annoncer = {};
  const antal = {};
  for (const l of lager.liste) { annoncer[l.id] = l.brand; antal[l.brand] = (antal[l.brand] || 0) + 1; }
  const sider = {};
  for (const s of statisk.sider) sider[s.fil] = { brand: s.brand, canonical: s.canonical, noindex: s.noindex, statiskAntal: s.statiskAntal };
  return {
    version: 1,
    meta: {
      commit: git(rod, 'rev-parse', 'HEAD'), gren: git(rod, 'rev-parse', '--abbrev-ref', 'HEAD'), dato: new Date().toISOString(),
      data: dataTilstand, antalAnnoncer: lager.liste.length,
      beskrivelse: 'annonce-id -> mærke som siden klassificerer det (Store.getAllListings, demoannoncer fraregnet), plus mærkesider og deres URL/canonical/noindex.',
    },
    annoncer, maerkeAntal: antal, sider,
    oversigt: (statisk.oversigt ? statisk.oversigt.raekker.map(r => r.href) : []),
    sitemap: statisk.sitemap || [],
  };
}

function sammenlignBaseline(base, lager, statisk, T, dataTilstand) {
  const { tilfoej, taelUd } = T;
  const G = 'regress';
  taelUd('baselineAnnoncer', Object.keys(base.annoncer || {}).length);
  if (base.meta && base.meta.data && base.meta.data !== dataTilstand) {
    tilfoej(G, 'baseline-datatype', 'info', '*', `baseline er gemt med --data ${base.meta.data}, kørslen bruger ${dataTilstand}; id-sammenligning gælder kun overlap`);
  }
  const nu = new Map(lager.liste.map(l => [l.id, l.brand]));
  let uaendret = 0, fjernet = 0, ny = 0;
  const stat = { uaendret: 0, fjernet: 0, nye: 0, skiftet: 0, tilUkendt: 0, franUkendt: 0, stavning: 0 };
  for (const [id, brand] of Object.entries(base.annoncer || {})) {
    if (!nu.has(id)) { fjernet++; continue; }
    const nyt = nu.get(id);
    if (nyt === brand) { uaendret++; continue; }
    const ukendt = b => b == null || UKENDT.has(fold(b));
    if (ukendt(nyt)) { stat.tilUkendt++; tilfoej(G, 'annonce-mistet-maerke', 'fejl', brand, `${id}: "${brand}" -> "${nyt}"`); }
    else if (ukendt(brand)) { stat.franUkendt++; tilfoej(G, 'annonce-fik-maerke', 'advarsel', nyt, `${id}: "${brand}" -> "${nyt}" (skal valideres: mærker oprettes ikke automatisk ud fra modelnavne/parserfejl)`); }
    else if (fold(brand) === fold(nyt)) { stat.stavning++; tilfoej(G, 'annonce-maerke-stavning', 'advarsel', brand, `${id}: "${brand}" -> "${nyt}" (kun stavemåde/versaler)`); }
    else { stat.skiftet++; tilfoej(G, 'annonce-skiftet-maerke', 'fejl', brand, `${id}: "${brand}" -> "${nyt}"`); }
  }
  for (const id of nu.keys()) if (!(base.annoncer || {})[id]) ny++;
  Object.assign(stat, { uaendret, fjernet, nye: ny });
  if (fjernet) tilfoej(G, 'annonce-forsvundet', dataTilstand === 'live' ? 'info' : 'fejl', '*', `${fjernet} annonce-id fra baseline findes ikke længere${dataTilstand === 'live' ? ' (levende lager: crawleren fjerner/tilføjer løbende)' : ''}`);
  if (ny) tilfoej(G, 'annonce-nye', 'info', '*', `${ny} annoncer er nye siden baseline`);
  /* mærker, der forsvinder helt fra lageret, mens deres annoncer lever videre under andet navn, er fanget ovenfor. Her: tal pr. mærke. */
  const nuAntal = {};
  for (const l of lager.liste) nuAntal[l.brand] = (nuAntal[l.brand] || 0) + 1;
  for (const [b, n] of Object.entries(base.maerkeAntal || {})) {
    if (!nuAntal[b] && n > 0 && dataTilstand !== 'live') tilfoej(G, 'maerke-forsvundet', 'fejl', b, `"${b}" havde ${n} annoncer i baseline og har 0 nu`);
  }
  /* URL'er bevares */
  for (const [fil, d] of Object.entries(base.sider || {})) {
    const nuSide = statisk.sider.find(s => s.fil === fil);
    if (!nuSide) { tilfoej('side', 'url-forsvundet', 'fejl', d.brand || fil, `${fil} fandtes i baseline, men findes ikke længere (URL brudt, ingen redirect-mekanisme i repoet)`); continue; }
    if (d.canonical && nuSide.canonical !== d.canonical) tilfoej('side', 'url-canonical-aendret', 'fejl', d.brand || fil, `canonical ${d.canonical} -> ${nuSide.canonical}`);
    if (d.brand && nuSide.brand !== d.brand) tilfoej('side', 'url-maerke-aendret', 'advarsel', d.brand, `${fil}: mærkenavn "${d.brand}" -> "${nuSide.brand}"`);
    if (!d.noindex && nuSide.noindex && (d.statiskAntal || 0) > 0) tilfoej('side', 'url-blev-noindex', 'advarsel', d.brand || fil, `${fil} var indekserbar i baseline (${d.statiskAntal} annoncer) og er nu noindex`);
  }
  if (base.sitemap && statisk.sitemap) {
    const nuSet = new Set(statisk.sitemap);
    const manglende = base.sitemap.filter(u => !nuSet.has(u));
    if (manglende.length) tilfoej('side', 'sitemap-url-forsvundet', 'advarsel', '*', `${manglende.length} sitemap-URL'er fra baseline mangler: ${manglende.slice(0, 5).join(', ')}`);
  }
  return stat;
}

/* ---------- Browser ---------- */

function cacheNoegle(req) { return `${req.method()} ${req.url()}`; }

async function installerRute(context, opt) {
  const { port, data, cache, overtraedelser, blokeret } = opt;
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' };
  await context.route('**/*', async route => {
    const req = route.request();
    let u;
    try { u = new URL(req.url()); } catch (e) { return route.abort('blockedbyclient'); }
    if (u.hostname === VAERT && Number(u.port) === port) return route.continue();
    if (/(^|\.)supabase\.co$/.test(u.hostname)) {
      const m = req.method();
      if (m === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
      if (m !== 'GET' && m !== 'HEAD') { overtraedelser.push(`${m} ${u.pathname}`); return route.abort('blockedbyclient'); }
      if (u.pathname.startsWith('/rest/v1/')) {
        if (data === 'live') {
          const k = cacheNoegle(req);
          let c = cache.get(k);
          if (!c) {
            try {
              const r = await route.fetch();
              c = { status: r.status(), body: (await r.body()).toString('base64'), type: r.headers()['content-type'] || 'application/json' };
            } catch (e) { return route.abort('connectionfailed'); }
            cache.set(k, c);
          }
          return route.fulfill({ status: c.status, headers: { ...cors, 'Content-Type': c.type }, body: Buffer.from(c.body, 'base64') });
        }
        const { status, body } = restSvar(u.pathname.slice('/rest/v1/'.length) + u.search, u.searchParams);
        return route.fulfill({ status, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      }
      if (u.pathname.startsWith('/storage/v1/')) return route.fulfill({ status: 200, headers: { ...cors, 'Content-Type': 'image/png' }, body: PNG_1X1 });
      return route.fulfill({ status: 401, headers: { ...cors, 'Content-Type': 'application/json' }, body: '{"message":"qa: ingen session"}' });
    }
    if (req.resourceType() === 'image') return route.fulfill({ status: 200, headers: { 'Content-Type': 'image/png' }, body: PNG_1X1 });
    blokeret[u.hostname] = (blokeret[u.hostname] || 0) + 1;
    return route.abort('blockedbyclient');
  });
}

async function aabnSide(context, base, sti, port, tid) {
  const p = await context.newPage();
  const fejl = [];
  p.on('console', m => {
    if (m.type() !== 'error') return;
    const loc = m.location() || {};
    let fremmed = false;
    try { const u = new URL(loc.url); fremmed = !(u.hostname === VAERT && Number(u.port) === port) && /^https?:/.test(u.protocol); } catch (e) { /* ingen url */ }
    if (fremmed && /Failed to load resource/i.test(m.text())) return;
    if (/Content[- ]Security[- ]Policy/i.test(m.text())) return;
    fejl.push('console: ' + m.text().slice(0, 160));
  });
  p.on('pageerror', e => fejl.push('pageerror: ' + String((e && e.message) || e).slice(0, 160)));
  const hentet404 = [];
  p.on('response', r => {
    try { const u = new URL(r.url()); if (u.hostname === VAERT && r.status() >= 400 && !r.request().isNavigationRequest()) hentet404.push(`${r.status()} ${u.pathname}`); } catch (e) { /* data: */ }
  });
  /* V6: ERR_NO_BUFFER_SPACE (Windows-loopback under last) er OS-støj: tag navigationen om (op til 3 forsøg). */
  let svar;
  for (let forsoeg = 1; ; forsoeg++) {
    try { svar = await p.goto(`${base}/${sti}`, { waitUntil: 'load', timeout: tid }); break; }
    catch (e) { if (forsoeg >= 3 || !/ERR_NO_BUFFER_SPACE|ERR_CONNECTION_(RESET|REFUSED)/.test(String(e.message))) throw e; await p.waitForTimeout(400 * forsoeg); }
  }
  await p.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await p.waitForFunction(() => !window.DATA_STATUS || (window.DATA_STATUS.eksterne !== 'ikke-hentet' && window.DATA_STATUS.egne !== 'ikke-hentet'), null, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(350);
  return { p, fejl, hentet404, status: svar ? svar.status() : 0 };
}

async function laesLager(p) {
  return p.evaluate(() => {
    const demo = new Set((typeof LISTINGS !== 'undefined' ? LISTINGS : []).map(l => String(l.id)));
    const alle = Store.getAllListings().filter(l => !demo.has(String(l.id)));
    return {
      demo: demo.size, status: window.DATA_STATUS || null, harHele: typeof Store.harHeleLageret === 'function' ? Store.harHeleLageret() : null,
      liste: alle.map(l => ({ id: String(l.id), brand: l.brand == null ? null : String(l.brand), model: l.model == null ? null : String(l.model), egen: !!l.isRemote })),
    };
  });
}

const tilTal = t => { const m = String(t || '').match(/^\s*([\d.]+)/); return m ? Number(m[1].replace(/\./g, '')) : null; };

async function ventTaelling(p, forventet, tid = 1800) {
  const slut = Date.now() + tid;
  let sidst = null;
  while (Date.now() < slut) {
    sidst = tilTal(await p.evaluate(() => (document.getElementById('results-count') || {}).textContent));
    if (sidst === forventet) return sidst;
    await p.waitForTimeout(80);
  }
  return sidst;
}

async function browserTjek(opt, rod, reg, opslag, statisk, T, matrix) {
  const { tilfoej, taelUd } = T;
  const pw = opt.pw || (await sb.playwrightTilgaengelig()).pw;
  if (!pw) throw new Error((await sb.playwrightTilgaengelig()).grund);
  const { server, port } = await sb.startServer(rod);
  const base = `http://${VAERT}:${port}`;
  const browser = await pw.chromium.launch({ headless: true, args: [`--host-resolver-rules=MAP ${VAERT} 127.0.0.1`] });
  const cache = new Map(), overtraedelser = [], blokeret = {};
  if (opt.data === 'live' && opt.snapshot && fs.existsSync(opt.snapshot)) {
    try { for (const [k, v] of Object.entries(JSON.parse(fs.readFileSync(opt.snapshot, 'utf8')))) cache.set(k, v); } catch (e) { /* ugyldig snapshot: hent forfra */ }
  }
  const out = { lager: null, overtraedelser, snapshot: null };
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'da-DK', serviceWorkers: 'block' });
    await context.addInitScript(sb.initScript, { tema: 'light' });
    await installerRute(context, { port, data: opt.data, cache, overtraedelser, blokeret });
    const tid = opt.tid || 25000;

    /* === Lager + søgning === */
    const s = await aabnSide(context, base, 'soegning.html', port, tid);
    if (s.status >= 400) tilfoej('filter', 'soegning-indlaesning', 'fejl', '*', `soegning.html svarede ${s.status}`);
    for (const f of s.fejl) tilfoej('filter', 'soegning-konsolfejl', 'fejl', '*', f);
    const lager = await laesLager(s.p);
    out.lager = lager;
    if (!lager.liste.length) { tilfoej('filter', 'lager-tomt', 'fejl', '*', `intet lager hentet (status ${JSON.stringify(lager.status)}) — øvrige tjek er ikke meningsfulde`); return out; }
    if (opt.data === 'live' && lager.demo) tilfoej('filter', 'demo-i-live', 'fejl', '*', `${lager.demo} demoannoncer i lageret`);
    if (lager.harHele === false) tilfoej('filter', 'lager-ikke-komplet', 'advarsel', '*', 'Store.harHeleLageret() = false: hentningen ramte ikke hele lageret, antal kan afvige');

    const pr = new Map();    // lowercase brand -> {navne:Set, n}
    for (const l of lager.liste) {
      if (!l.brand) continue;
      const k = l.brand.toLowerCase();
      const e = pr.get(k) || { navne: new Set(), n: 0 };
      e.navne.add(l.brand); e.n++; pr.set(k, e);
    }
    const lagerMaerker = [...pr.values()].map(e => ({ navn: [...e.navne][0], navne: [...e.navne], n: e.n })).filter(m => !UKENDT.has(fold(m.navn)));
    const ukendt = lager.liste.filter(l => !l.brand || UKENDT.has(fold(l.brand))).length;
    if (ukendt) tilfoej('filter', 'lager-ukendt-maerke', 'info', 'Ukendt', `${ukendt} af ${lager.liste.length} annoncer har ukendt mærke (vises ikke som mærkefilter/mærkeside)`);
    /* dubletter: samme mærke i flere stavemåder (inkl. kun versaler: "SYM"/"Sym", "Royal Enfield"/"Royal-enfield") */
    const perFold = new Map();
    for (const l of lager.liste) if (l.brand) { const k = fold(l.brand); const e = perFold.get(k) || new Map(); e.set(l.brand, (e.get(l.brand) || 0) + 1); perFold.set(k, e); }
    for (const [k, e] of perFold) if (e.size > 1 && !UKENDT.has(k)) tilfoej('side', 'dublet-maerke-stavning', 'fejl', [...e.keys()][0], `lageret har flere former af samme mærke: ${[...e].map(([n, c]) => `${n} (${c})`).join(' / ')} — to filterrækker/sider for ét mærke`);

    const hurtigSet = new Set((opt.maerker || HURTIG_MAERKER).map(fold));
    const maalMaerker = lagerMaerker.filter(m => !opt.hurtig || hurtigSet.has(fold(m.navn)));
    for (const m of lagerMaerker) {
      const e = registerMaerkeFor(opslag, m.navn);
      const mx = (matrix[fold(m.navn)] = matrix[fold(m.navn)] || { navn: m.navn });
      mx.lager = m.n;
      if (!e) tilfoej('filter', 'lagermaerke-uden-register', 'fejl', m.navn, `lageret har ${m.n} annonce(r) med mærket "${m.navn}", men det findes ikke i registret (ingen logo/alias/mærkeside-beslutning)`);
      else if (e.navn !== m.navn) tilfoej('filter', 'lagermaerke-navn', 'fejl', m.navn, `lageret skriver "${m.navn}", registret "${e.navn}"`);
      if (!statisk.sider.some(x => x.brand && fold(x.brand) === fold(m.navn))) tilfoej('side', 'lagermaerke-uden-side', opt.data === 'live' ? 'fejl' : 'info', m.navn, `${m.n} annonce(r), men ingen ${sideFil(opslag, m.navn)} (mærket kan ikke nås via oversigten)`);
    }

    /* mærkefilteret: findes, kan vælges, giver lagerets antal */
    const p = s.p;
    const filterNavne = await p.evaluate(() => [...document.querySelectorAll('#filter-brands input[data-brand]')].map(c => c.dataset.brand));
    const topNavne = await p.evaluate(() => [...((document.getElementById('so-brand') || { options: [] }).options)].map(o => o.value).filter(Boolean));
    for (const m of lagerMaerker) {
      if (!filterNavne.includes(m.navn)) tilfoej('filter', 'filter-mangler-maerke', 'fejl', m.navn, `#filter-brands har ingen afkrydsning for "${m.navn}" (${m.n} annoncer)`);
      if (topNavne.length && !topNavne.includes(m.navn)) tilfoej('filter', 'topvaelger-mangler-maerke', 'fejl', m.navn, `#so-brand har ingen mulighed for "${m.navn}"`);
    }
    for (const f of filterNavne) if (UKENDT.has(fold(f))) tilfoej('filter', 'filter-viser-ukendt', 'info', f, `filteret har en række "${f}" (${ukendt} annoncer) — et ikke-mærke i mærkelisten`); else if (!lagerMaerker.some(m => m.navn === f)) tilfoej('filter', 'filter-uden-lager', 'advarsel', f, `filteret viser "${f}", men lageret har ingen annoncer med mærket`);
    /* To veje, som en besøgende har: topvælgeren #so-brand (ét mærke) og afkrydsningslisten bag "Tilføj flere mærker". */
    if (await p.evaluate(() => { const b = document.getElementById('so-more'); return !!b && b.hidden; })) await p.click('#so-more-btn');
    for (const m of maalMaerker) {
      const mx = matrix[fold(m.navn)];
      if (topNavne.includes(m.navn)) {
        try {
          await p.selectOption('#so-brand', { value: m.navn }, { timeout: 4000 });
          const n = await ventTaelling(p, m.n);
          mx.vaelger = n; taelUd('filterVaelger');
          if (n !== m.n) tilfoej('filter', 'filter-antal', 'fejl', m.navn, `søgningen viser ${n} efter valg af "${m.navn}" i #so-brand; lageret har ${m.n}`);
        } catch (e) {
          mx.vaelger = 'fejl';
          tilfoej('filter', 'filter-kan-ikke-vaelges', 'fejl', m.navn, `#so-brand: ${String(e.message).split('\n')[0]}`);
        }
        await p.selectOption('#so-brand', { value: '' }).catch(() => {});
        await ventTaelling(p, lager.liste.length, 1500);
      }
      if (!filterNavne.includes(m.navn)) { mx.filter = 'mangler'; continue; }
      const loc = p.locator(`#filter-brands input[data-brand=${JSON.stringify(m.navn)}]`);
      try {
        await p.fill('#brand-search', m.navn, { timeout: 4000 });
        await loc.check({ timeout: 4000 });
        const n = await ventTaelling(p, m.n);
        mx.filter = n; taelUd('filterAfkrydsning');
        if (n !== m.n) tilfoej('filter', 'filter-antal', 'fejl', m.navn, `søgningen viser ${n} efter afkrydsning af "${m.navn}"; lageret har ${m.n}`);
        await loc.uncheck({ timeout: 4000 });
      } catch (e) {
        mx.filter = 'kan-ikke-vaelges';
        tilfoej('filter', 'filter-kan-ikke-vaelges', 'fejl', m.navn, `afkrydsning kunne ikke vælges: ${String(e.message).split('\n')[0]}`);
      }
      await p.fill('#brand-search', '', { timeout: 4000 }).catch(() => {});
    }
    /* mærke uden annoncer i URL: tom tilstand uden fejl */
    const tomt = reg.maerker.find(e => !pr.has(e.navn.toLowerCase()) && e.navn);
    if (tomt) {
      const t = await aabnSide(context, base, `soegning.html?brands=${encodeURIComponent(tomt.navn)}`, port, tid);
      const n = tilTal(await t.p.evaluate(() => (document.getElementById('results-count') || {}).textContent));
      if (n !== 0) tilfoej('filter', 'tomt-maerke-soegning', 'fejl', tomt.navn, `?brands=${tomt.navn} (ingen annoncer) viser "${n}" i stedet for 0`);
      for (const f of t.fejl) tilfoej('filter', 'tomt-maerke-konsolfejl', 'fejl', tomt.navn, f);
      await t.p.close();
    }

    /* === Alias i fritekst === */
    const synt = await p.evaluate(({ reg }) => {
      const fejl = [];
      let antal = 0;
      for (const e of reg) {
        const varianter = new Set([e.navn, e.navn.toUpperCase(), e.navn.toLowerCase(), e.slug, e.slug.replace(/-/g, ' '), ...e.aliaser]);
        for (const v of varianter) {
          const l = [{ brand: e.navn, model: 'Testmodel 700', type: null }];
          const hit = Filtrering.anvendFiltre(l, { q: v }).length === 1; antal++;
          if (!hit) fejl.push({ navn: e.navn, q: v, alias: e.aliaser.includes(v) });
        }
      }
      return { fejl, antal };
    }, { reg: reg.maerker.map(e => ({ navn: e.navn, slug: e.slug, aliaser: e.aliaser })) });
    taelUd('aliasSyntetisk', synt.antal);
    for (const f of synt.fejl) {
      const kerne = KERNE_ALIAS.some(([q, s2]) => q === f.q && reg.maerker.find(e => e.slug === s2 && e.navn === f.navn));
      tilfoej('alias', 'alias-fritekst', reg.registry || kerne || !f.alias ? 'fejl' : 'advarsel', f.navn, `fritekst "${f.q}" finder ikke en annonce med mærket ${f.navn}${f.alias ? ' (registeralias)' : ''}`);
      const mx = matrix[fold(f.navn)];
      if (mx) mx.aliasFejl = (mx.aliasFejl || 0) + 1;
    }
    for (const [q, slug] of KERNE_ALIAS) {
      const e = reg.maerker.find(x => x.slug === slug);
      if (!e) { tilfoej('alias', 'kernealias-maerke-mangler', 'fejl', slug, `registret har intet mærke med slug "${slug}" (kræves for "${q}")`); continue; }
      const mx = lagerMaerker.find(m => fold(m.navn) === fold(e.navn));
      if (!mx) continue;   // intet lager: syntetisk tjek ovenfor dækker det
      await p.fill('#filter-q', q);
      const n = await ventTaelling(p, mx.n, 2200);
      const ok = n != null && n >= mx.n; taelUd('aliasFritekstUI');
      if (!ok) tilfoej('alias', 'alias-fritekst-ui', 'fejl', e.navn, `søgefeltet viser ${n} for "${q}"; ${e.navn} har ${mx.n} annoncer i lageret`);
    }
    await p.fill('#filter-q', '');
    await p.close();

    /* === maerker.html: hydreret oversigt + hurtigsøgning === */
    /* "Flere mærker"-piller må ikke have annoncer (så skulle de have en side); totaler på siden = lageret. */
    if (statisk.oversigt && statisk.oversigt.flere) {
      const fl = statisk.oversigt.flere;
      for (const pi of fl.piller) {
        const m = lagerMaerker.find(x => fold(x.navn) === fold(pi.navn));
        if (m) tilfoej('filter', 'pille-har-annoncer', opt.data === 'live' ? 'fejl' : 'info', pi.navn, `"${pi.navn}" står som ikke-klikbar pille (ingen annoncer, ingen side), men lageret har ${m.n} annonce(r)`);
      }
      if (opt.data === 'live') {
        if (fl.alle != null && fl.alle !== lager.liste.length) tilfoej('filter', 'oversigt-total', 'advarsel', '*', `maerker.html siger ${fl.alle} annoncer i alt; lageret har ${lager.liste.length} (statisk tal fra byggetidspunktet)`);
        if (fl.uoplyst != null && fl.uoplyst !== ukendt) tilfoej('filter', 'oversigt-uoplyst', 'advarsel', 'Ukendt', `maerker.html siger ${fl.uoplyst} annoncer uden mærke; lageret har ${ukendt}`);
      }
    }
    const o = await aabnSide(context, base, 'maerker.html', port, tid);
    for (const f of o.fejl) tilfoej('side', 'oversigt-konsolfejl', 'fejl', 'maerker.html', f);
    for (const f of o.hentet404) tilfoej('side', 'oversigt-ressource-404', 'fejl', 'maerker.html', f);
    const ovr = await o.p.evaluate(() => [...document.querySelectorAll('#mk-az-liste li[data-mk-soeg]')].map(li => ({
      href: li.querySelector('a').getAttribute('href'), n: Number((li.querySelector('.mk-az-n') || {}).textContent.replace(/\./g, '')), soeg: li.dataset.mkSoeg,
    })));
    const flise = await o.p.evaluate(() => [...document.querySelectorAll('.mk-brandtile')].map(t => ({ href: (t.getAttribute('href') || (t.querySelector('a') || {}).href || ''), n: (t.querySelector('.mk-brandtile-n') || {}).textContent || '' })));
    for (const m of lagerMaerker) {
      const href = sideFil(opslag, m.navn);
      const r = ovr.find(x => x.href === href);
      const mx = matrix[fold(m.navn)];
      if (!r) { tilfoej('filter', 'oversigt-mangler-maerke', opt.data === 'live' ? 'fejl' : 'info', m.navn, `maerker.html har ingen række for ${m.navn} (${m.n} annoncer)`); if (mx) mx.oversigt = 'mangler'; continue; }
      if (mx) mx.oversigt = r.n;
      if (opt.data === 'live' && r.n !== m.n) tilfoej('filter', 'oversigt-antal', 'advarsel', m.navn, `oversigten viser ${r.n}, lageret har ${m.n} (statisk tal fra byggetidspunktet — crawleren kan have ændret lageret siden)`);
      if (opt.data !== 'live' && r.n !== m.n && ovr.some(x => x.href === href)) { /* fixtures har andre antal end det statiske byg — sammenlignes ikke */ }
    }
    for (const r of ovr) {
      const e = reg.maerker.find(x => `maerke-${x.slug}.html` === r.href);
      if (e && !pr.has(e.navn.toLowerCase()) && r.n > 0 && opt.data === 'live') tilfoej('filter', 'oversigt-viser-annoncer-uden-lager', 'fejl', e.navn, `oversigten viser ${r.n} annoncer, men lageret har 0`);
    }
    if (flise.length && opt.data === 'live') for (const f of flise) {
      const m = f.href.match(/maerke-[^/"]+\.html/);
      const row = m && ovr.find(x => x.href === m[0]);
      const n = tilTal(f.n);
      if (row && n != null && n !== row.n) tilfoej('filter', 'oversigt-flise-vs-liste', 'fejl', m[0], `flise ${n} ≠ A–Z-række ${row.n} på samme side`);
    }
    /* hurtigsøgning: hvert registeralias finder sin række */
    const hs = await o.p.evaluate(() => {
      const input = document.getElementById('mk-hurtigsoeg-input');
      if (!input) return null;
      const fold = s => String(s).normalize('NFC').toLowerCase().replace(/ø/g, 'oe').replace(/æ/g, 'ae').replace(/å/g, 'aa').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '');
      const raekker = [...document.querySelectorAll('#mk-az-liste li[data-mk-soeg]')];
      const res = [];
      for (const li of raekker) {
        for (const q of li.dataset.mkSoeg.split('|')) {
          input.value = q; input.dispatchEvent(new Event('input', { bubbles: true }));
          res.push({ q, href: li.querySelector('a').getAttribute('href'), synlig: !li.hidden });
        }
      }
      input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true }));
      return { total: res.length, fejl: res.filter(r => !r.synlig) };
    });
    if (hs === null) tilfoej('alias', 'hurtigsoeg-mangler', 'advarsel', 'maerker.html', 'hurtigsøgningsfeltet findes ikke');
    else { taelUd('hurtigsoegAlias', hs.total); for (const r of hs.fejl) tilfoej('alias', 'hurtigsoeg-alias', 'fejl', r.href, `"${r.q}" skjuler sin egen række på maerker.html`); }
    const hs2 = await o.p.evaluate(({ qs }) => {
      const input = document.getElementById('mk-hurtigsoeg-input');
      if (!input) return [];
      const ud = [];
      for (const [q, slug] of qs) {
        input.value = q; input.dispatchEvent(new Event('input', { bubbles: true }));
        const synlige = [...document.querySelectorAll('#mk-az-liste li[data-mk-soeg]')].filter(li => !li.hidden).map(li => li.querySelector('a').getAttribute('href'));
        ud.push({ q, slug, synlige });
      }
      input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true }));
      return ud;
    }, { qs: KERNE_ALIAS.map(([q, s2]) => [q, s2]) });
    for (const r of hs2) {
      const e = reg.maerker.find(x => x.slug === r.slug);
      if (!e) continue;
      const href = `maerke-${e.slug}.html`;
      const iOversigt = ovr.some(x => x.href === href);
      if (iOversigt && !r.synlige.includes(href)) tilfoej('alias', 'hurtigsoeg-kernealias', 'fejl', e.navn, `hurtigsøgningen på maerker.html finder ikke ${e.navn} for "${r.q}" (viser: ${r.synlige.join(', ') || 'intet'})`);
      if (!iOversigt) tilfoej('alias', 'kernemaerke-uden-oversigtsraekke', 'info', e.navn, `${e.navn} har ingen række på maerker.html (kun mærker med annoncer vises) — "${r.q}" kan ikke findes dér`);
    }
    await o.p.close();

    /* === mærkesider i browseren === */
    const sider = opt.hurtig ? statisk.sider.filter(x => hurtigSet.has(fold(x.brand || ''))) : statisk.sider;
    for (const sd of sider) {
      const mx = (matrix[fold(sd.brand || sd.fil)] = matrix[fold(sd.brand || sd.fil)] || { navn: sd.brand || sd.fil });
      mx.side = sd.fil; taelUd('maerkesider');
      let r;
      try { r = await aabnSide(context, base, sd.fil, port, tid); } catch (e) { tilfoej('side', 'side-indlaesning', 'fejl', sd.brand, `${sd.fil}: ${String(e.message).split('\n')[0]}`); continue; }
      const nu = await r.p.evaluate(() => ({
        h1: document.querySelectorAll('h1').length,
        n: [...document.querySelectorAll('[data-mk-n]')].map(x => (x.textContent || '').trim()),
        brand: document.body.dataset.mkBrand || null,
        afbrud: !!document.getElementById('data-afbrud'),
        kort: document.querySelectorAll('.card[data-listing-id]').length,
        tekst: /(^|[^\p{L}\p{N}_])(null|undefined|NaN)(?![\p{L}\p{N}_])|\[object Object\]/u.test(document.body.innerText),
        doedeLogoer: [...document.images].filter(i => i.complete && i.naturalWidth === 0 && i.currentSrc && !/^data:/.test(i.currentSrc) && /img\/brands\//.test(i.currentSrc)).map(i => i.currentSrc.split('/').pop()),
      }));
      if (r.status >= 400) tilfoej('side', 'side-http', 'fejl', sd.brand, `${sd.fil} svarede ${r.status}`);
      for (const f of r.fejl) tilfoej('side', 'side-konsolfejl', 'fejl', sd.brand, `${sd.fil}: ${f}`);
      for (const f of r.hentet404) tilfoej('side', 'side-ressource-404', 'fejl', sd.brand, `${sd.fil}: ${f}`);
      if (nu.h1 !== 1) tilfoej('side', 'side-h1-browser', 'fejl', sd.brand, `${sd.fil}: ${nu.h1} h1`);
      if (nu.afbrud) tilfoej('side', 'side-dataafbrud', 'fejl', sd.brand, `${sd.fil} viser dataafbrud-banneret`);
      if (nu.tekst) tilfoej('side', 'side-tekst-null', 'fejl', sd.brand, `${sd.fil}: null/undefined/NaN i synlig tekst`);
      for (const d of nu.doedeLogoer) tilfoej('logo', 'side-logo-brudt', 'fejl', sd.brand, `${sd.fil}: logobilledet ${d} kunne ikke hentes`);
      const m = lagerMaerker.find(x => fold(x.navn) === fold(sd.brand || ''));
      const antal = new Set(nu.n);
      if (antal.size > 1) tilfoej('filter', 'maerkeside-flere-tal', 'fejl', sd.brand, `${sd.fil} viser flere forskellige antal: ${[...antal].join(', ')}`);
      const vist = tilTal([...antal][0]);
      mx.side = `${sd.fil} (${vist})`;
      if (m) {
        if (vist !== m.n) tilfoej('filter', 'maerkeside-antal', 'fejl', sd.brand, `${sd.fil} viser ${vist} efter hydrering; lageret har ${m.n}`);
        if (nu.kort === 0) tilfoej('filter', 'maerkeside-uden-kort', 'fejl', sd.brand, `${sd.fil}: lageret har ${m.n} annoncer, men siden viser ingen annoncekort`);
        if (opt.data === 'live' && sd.statiskAntal != null && sd.statiskAntal !== m.n) tilfoej('filter', 'maerkeside-statisk-antal', 'advarsel', sd.brand, `statisk HTML (uden JS) siger ${sd.statiskAntal}, lageret har ${m.n} (byggetidspunkt vs. nu)`);
      } else if (opt.data === 'live') {
        tilfoej('side', 'maerkeside-uden-lager', sd.noindex ? 'info' : 'fejl', sd.brand, `${sd.fil} (${sd.noindex ? 'noindex' : 'INDEKSERBAR'}) findes, men lageret har ingen annoncer med mærket; siden viser ${vist}`);
      }
      await r.p.close();
    }

    /* === opret-annonce === */
    const op = await aabnSide(context, base, 'opret-annonce.html', port, tid);
    for (const f of op.fejl) tilfoej('opret', 'opret-konsolfejl', 'fejl', 'opret-annonce.html', f);
    const mulige = await op.p.evaluate(() => [...document.getElementById('f-brand').options].map(o => o.value).filter(Boolean));
    if (reg.registry) for (const n of mulige) if (n !== '__andet' && !reg.maerker.some(e => e.navn === n)) tilfoej('opret', 'opret-ekstra-maerke', 'advarsel', n, `#f-brand har "${n}", som ikke er i registret (BRANDS_BY_MODEL ude af trit med registret)`);
    const krav = new Map();
    for (const e of reg.maerker) if (e.opret && e.navn) krav.set(e.navn, 'register');
    for (const m of lagerMaerker) krav.set(m.navn, 'lager');
    for (const sd of statisk.sider) if (sd.brand) krav.set(sd.brand, krav.get(sd.brand) || 'side');
    const udenAnnoncer = new Set(reg.maerker.filter(e => !pr.has(e.navn.toLowerCase())).map(e => e.navn));
    for (const [navn, hvorfor] of krav) {
      if (opt.hurtig && !hurtigSet.has(fold(navn))) continue;
      taelUd('opretMaerker');
      const mx = (matrix[fold(navn)] = matrix[fold(navn)] || { navn });
      if (!mulige.includes(navn)) {
        const kunRegister = hvorfor === 'register';
        mx.opret = 'mangler';
        tilfoej('opret', kunRegister ? 'opret-mangler-registermaerke' : 'opret-mangler-maerke', kunRegister && !reg.registry ? 'advarsel' : 'fejl', navn, `opret-annonce kan ikke vælge "${navn}" (${hvorfor}${udenAnnoncer.has(navn) ? ', mærke uden annoncer' : ''}) — #f-brand har ${mulige.length} mærker`);
      } else mx.opret = 'ok';
    }
    const accept = await op.p.evaluate(({ navne }) => {
      const sel = document.getElementById('f-brand');
      const fejl = [];
      for (const n of navne) {
        try {
          sel.value = n; sel.dispatchEvent(new Event('change', { bubbles: true }));
          if (sel.value !== n) fejl.push(`${n}: værdien blev ikke sat`);
          else if (!sel.checkValidity()) fejl.push(`${n}: select ugyldig efter valg`);
        } catch (e) { fejl.push(`${n}: ${e.message}`); }
      }
      return fejl;
    }, { navne: mulige.filter(n => !opt.hurtig || hurtigSet.has(fold(n))) });
    for (const f of accept) tilfoej('opret', 'opret-accepterer-ikke', 'fejl', f.split(':')[0], f);
    await op.p.close();

    await context.close();
  } finally {
    await Promise.race([browser.close().catch(() => {}), new Promise(r => setTimeout(r, 8000))]);
    server.close();
  }
  if (opt.data === 'live' && opt.snapshot && cache.size) {
    try { fs.mkdirSync(path.dirname(opt.snapshot), { recursive: true }); fs.writeFileSync(opt.snapshot, JSON.stringify(Object.fromEntries(cache))); out.snapshot = opt.snapshot; } catch (e) { /* ikke kritisk */ }
  }
  if (overtraedelser.length) tilfoej('side', 'supabase-skrivning-forsoegt', 'fejl', '*', `${overtraedelser.length} ikke-GET-kald mod Supabase blev AFVIST: ${[...new Set(overtraedelser)].slice(0, 5).join(', ')}`);
  return out;
}

/* ---------- Samlet kørsel ---------- */

function kendtNoegle(f) { return `${f.tjek}|${f.maerke}`; }

async function koer(opt = {}) {
  const rod = path.resolve(opt.rod || REPO);
  opt = { data: 'fixtures', hurtig: false, ...opt };
  if (opt.maerker) opt.hurtig = true;
  if (!['fixtures', 'live'].includes(opt.data)) throw new Error('--data skal være fixtures eller live');
  const T = nyFundliste();
  const reg = indlaesRegister(rod, opt.register);
  const opslag = opslagFraRegister(reg);
  const matrix = {};
  for (const e of reg.maerker) matrix[fold(e.navn)] = { navn: e.navn, slug: e.slug, aliaser: e.aliaser.length, logo: e.fil && e.godkendt ? 'logo' : 'monogram' };
  const statisk = statiskeTjek(rod, reg, opslag, T);
  T.taelUd('registerMaerker', reg.maerker.length); T.taelUd('statiskeSider', statisk.sider.length);
  const b = await browserTjek(opt, rod, reg, opslag, statisk, T, matrix);
  /* V5: nye krav (Andet mærke, levende Flere mærker, hurtigsøgning af piller, ukendt ?brands i H1). Egen server/browser, altid fixtures. */
  if (!opt.udenV5) { const v5 = await require('./v5-maerke-krav').koerV5(opt, rod, reg, T); b.overtraedelser = (b.overtraedelser || []).concat(new Array(v5.skrivninger).fill('v5')); }
  let baselineStat = null, nyBaseline = null;
  if (b.lager && b.lager.liste.length) {
    if (opt.baseline) {
      try { baselineStat = sammenlignBaseline(JSON.parse(fs.readFileSync(opt.baseline, 'utf8')), b.lager, statisk, T, opt.data); }
      catch (e) { T.tilfoej('regress', 'baseline-ulaeselig', 'fejl', '*', `${opt.baseline}: ${String(e.message).split('\n')[0]}`); }
    } else T.tilfoej('regress', 'ingen-baseline', 'info', '*', 'ingen --baseline: regressionstjekket (punkt 5) er sprunget over');
    if (opt.gemBaseline) {
      nyBaseline = byggBaseline(rod, statisk, b.lager, opt.data);
      fs.mkdirSync(path.dirname(path.resolve(opt.gemBaseline)), { recursive: true });
      fs.writeFileSync(opt.gemBaseline, JSON.stringify(nyBaseline, null, 1) + '\n');
    }
  }
  let kendt = new Set();
  if (opt.kendt) { try { kendt = new Set(JSON.parse(fs.readFileSync(opt.kendt, 'utf8')).map(String).filter(k => !(opt.strengV5 && /^v5-/.test(k)))); } catch (e) { /* ingen */ } }   // --streng-v5: v5-krav er IKKE længere "kendte" (fase 2, efter merge)
  for (const f of T.fund) f.kendt = kendt.has(kendtNoegle(f)) || kendt.has(`${f.tjek}|*`);
  const taelling = { fejl: 0, advarsel: 0, info: 0, nyeFejl: 0, nyeAdvarsler: 0 };
  for (const f of T.fund) { taelling[f.niveau]++; if (!f.kendt && f.niveau === 'fejl') taelling.nyeFejl++; if (!f.kendt && f.niveau === 'advarsel') taelling.nyeAdvarsler++; }
  const gruppeTal = {};
  for (const f of T.fund) { const g = (gruppeTal[f.gruppe] = gruppeTal[f.gruppe] || { fejl: 0, advarsel: 0, info: 0 }); g[f.niveau]++; }
  return {
    rod, data: opt.data, hurtig: !!opt.hurtig, register: { kilde: reg.kilde, antal: reg.maerker.length },
    lager: b.lager ? { antal: b.lager.liste.length, maerker: new Set(b.lager.liste.map(l => l.brand)).size } : null,
    sider: statisk.sider.length, taelling, gruppeTal, baselineStat, fund: T.fund, matrix: Object.values(matrix).sort((a, c) => a.navn.localeCompare(c.navn, 'da')),
    daekning: T.daekning, overtraedelser: b.overtraedelser ? b.overtraedelser.length : 0, snapshot: b.snapshot || null, kommando: process.argv.slice(2).join(' '),
  };
}

function udskriv(r, { detaljer = 12, stille = false } = {}) {
  const ud = [];
  ud.push(`V4 mærkedækning — rod ${r.rod}`);
  ud.push(`data: ${r.data}${r.hurtig ? ' (hurtig delmængde)' : ''} | register: ${r.register.kilde} (${r.register.antal} mærker) | lager: ${r.lager ? `${r.lager.antal} annoncer, ${r.lager.maerker} mærkenavne` : 'ikke hentet'} | mærkesider: ${r.sider}`);
  ud.push(`dækning: ${Object.entries(r.daekning || {}).map(([k, v]) => `${k} ${v}`).join(', ')} | Supabase-skrivninger afvist: ${r.overtraedelser}`);
  if (r.baselineStat) ud.push(`baseline: ${Object.entries(r.baselineStat).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  ud.push('');
  const grupper = { filter: '1 filter/antal', alias: '2 alias', logo: '3 logo/navn/link', opret: '4 opret-annonce', regress: '5 regression', side: '6 sider/dubletter/URL', v5: '7 V5-krav' };
  for (const [g, navn] of Object.entries(grupper)) {
    const t = r.gruppeTal[g] || { fejl: 0, advarsel: 0, info: 0 };
    ud.push(`${navn.padEnd(26)} fejl ${String(t.fejl).padStart(3)}  advarsel ${String(t.advarsel).padStart(3)}  info ${String(t.info).padStart(3)}`);
  }
  ud.push('');
  const pr = {};
  for (const f of r.fund) { const k = `${f.niveau}|${f.tjek}`; (pr[k] = pr[k] || []).push(f); }
  const orden = { fejl: 0, advarsel: 1, info: 2 };
  for (const [k, l] of Object.entries(pr).sort((a, b) => orden[a[0].split('|')[0]] - orden[b[0].split('|')[0]] || b[1].length - a[1].length)) {
    const [niv, tjek] = k.split('|');
    ud.push(`[${niv}] ${tjek} × ${l.length}${l.every(x => x.kendt) ? ' (kendt)' : l.some(x => x.kendt) ? ' (delvist kendt)' : ''}`);
    if (!stille) for (const f of l.slice(0, detaljer)) ud.push(`    ${f.maerke}: ${f.detalje}${f.kendt ? '  [kendt]' : ''}`);
    if (l.length > detaljer) ud.push(`    … ${l.length - detaljer} flere (se --rapport)`);
  }
  ud.push('');
  ud.push(`I ALT: ${r.taelling.fejl} fejl (${r.taelling.nyeFejl} nye), ${r.taelling.advarsel} advarsler (${r.taelling.nyeAdvarsler} nye), ${r.taelling.info} info`);
  return ud.join('\n');
}

function parseArgs(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const nxt = () => argv[++i];
    if (a === '--rod') o.rod = nxt();
    else if (a === '--register') o.register = nxt();
    else if (a === '--data') o.data = nxt();
    else if (a === '--hurtig') o.hurtig = true;
    else if (a === '--uden-v5') o.udenV5 = true;
    else if (a === '--streng-v5') o.strengV5 = true;
    else if (a === '--maerker') o.maerker = nxt().split(',').map(x => x.trim()).filter(Boolean);
    else if (a === '--snapshot') o.snapshot = path.resolve(nxt());
    else if (a === '--baseline') o.baseline = path.resolve(nxt());
    else if (a === '--gem-baseline') o.gemBaseline = path.resolve(nxt());
    else if (a === '--kendt') o.kendt = path.resolve(nxt());
    else if (a === '--skriv-kendt') o.skrivKendt = path.resolve(nxt());
    else if (a === '--rapport') o.rapport = path.resolve(nxt());
    else if (a === '--strikt') o.strikt = true;
    else if (a === '--stille') o.stille = true;
    else if (a === '--tid') o.tid = Number(nxt());
    else if (a === '--pw') process.env.PLAYWRIGHT_PATH = nxt();
    else if (a === '--help' || a === '-h') o.hjaelp = true;
    else throw new Error(`Ukendt argument: ${a}`);
  }
  return o;
}

async function main() {
  let opt;
  try { opt = parseArgs(process.argv.slice(2)); } catch (e) { console.error(e.message); process.exit(2); }
  if (opt.hjaelp) { console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].replace(/^\/\* /, '')); return; }
  let r;
  try { r = await koer(opt); } catch (e) { console.error('Kunne ikke køre: ' + (e && e.message || e)); process.exit(2); }
  console.log(udskriv(r, { stille: opt.stille }));
  if (opt.rapport) { fs.mkdirSync(path.dirname(opt.rapport), { recursive: true }); fs.writeFileSync(opt.rapport, JSON.stringify(r, null, 1) + '\n'); console.log(`Rapport: ${opt.rapport}`); }
  if (opt.gemBaseline) console.log(`Baseline gemt: ${opt.gemBaseline}`);
  if (opt.skrivKendt) {
    let gamle = [];
    try { gamle = JSON.parse(fs.readFileSync(opt.skrivKendt, 'utf8')); } catch (e) { /* ny fil */ }
    const nog = [...new Set([...gamle, ...r.fund.filter(f => f.niveau !== 'info').map(kendtNoegle)])].sort();
    fs.writeFileSync(opt.skrivKendt, JSON.stringify(nog, null, 1) + '\n');
    console.log(`Kendt-liste skrevet: ${opt.skrivKendt} (${nog.length} nøgler)`);
  }
  const fejl = r.taelling.nyeFejl + (opt.strikt ? r.taelling.nyeAdvarsler : 0);
  process.exit(fejl ? 1 : 0);
}

module.exports = { koer, udskriv, nyFundliste, opslagFraRegister, indlaesRegister, normaliserRegister, statiskeTjek, parsMaerkeSide, parsOversigt, byggBaseline, sammenlignBaseline, KERNE_ALIAS, HURTIG_MAERKER };

if (require.main === module) main();
