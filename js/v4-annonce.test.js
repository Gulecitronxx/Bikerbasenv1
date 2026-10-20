/* V4 annonce: browsertest af de nye layoutgreb (info-panel, sticky sidepanel, kildekort, foto med kredit, kopiér link, slank lignende-stribe).
   Mod lokal mock (scripts/smoke-browser.js + smoke-fixtures.js) — intet netværk, ingen produktion. Springes over uden Playwright/Chromium.
   Dokumentation: docs/review/gauntlet/v4/annonce.md */
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const sb = require(path.join(REPO, 'scripts', 'smoke-browser.js'));
const { uuid } = require(path.join(REPO, 'scripts', 'smoke-fixtures.js'));

const EKSTERN = `annonce.html?id=${uuid(1)}`;      // MC Syd, forhandler, foto
const GUL = `annonce.html?id=${uuid(13)}`;         // Gul og Gratis (markedsplads)
const EGEN = `annonce.html?id=${uuid(901)}`;       // egen annonce, tre fotos
let H = null;
const blok = {};
test.before(async () => {
  const kan = await sb.playwrightTilgaengelig();
  if (!kan.ok) { console.log(`# v4-annonce.test: SKIPPER (${kan.grund})`); return; }
  const { server, port } = await sb.startServer(REPO);
  H = { server, port, browser: await kan.pw.chromium.launch({ headless: true }), base: `http://127.0.0.1:${port}` };
});
test.after(async () => { if (H) { await H.browser.close(); H.server.close(); } });

async function side(vp, url, fn, { tema = 'light', reducedMotion = 'no-preference', hoejde } = {}) {
  const c = await H.browser.newContext({ viewport: { width: vp, height: hoejde || (vp >= 1024 ? 900 : 844) }, colorScheme: tema, locale: 'da-DK', serviceWorkers: 'block', reducedMotion });
  await c.addInitScript(sb.initScript, { tema });
  await sb.installerMock(c, H.port, blok);
  await c.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: H.base }).catch(() => {});
  const p = await c.newPage();
  const fejl = []; p.on('pageerror', e => fejl.push(e.message));
  try {
    await p.goto(`${H.base}/${url}`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(450);
    const r = await fn(p);
    assert.deepStrictEqual(fejl, [], 'ingen sidefejl');
    return r;
  } finally { await c.close(); }
}

test('1440: info-panelet er ét kort om chips, titel, pris, nøgletal og beskrivelse; kørekortkortet står uden for det', { timeout: 60000 }, async t => {
  if (!H) return t.skip('Playwright mangler');
  for (const url of [EKSTERN, EGEN]) {
    const r = await side(1440, url, p => p.evaluate(() => {
      const panel = document.querySelector('.an-panel'), cs = getComputedStyle(panel);
      return { display: cs.display, kant: parseFloat(cs.borderTopWidth), radius: parseFloat(cs.borderTopLeftRadius),
        head: panel.contains(document.querySelector('.an-head')), desc: panel.contains(document.querySelector('.an-desc')),
        h1: panel.contains(document.querySelector('h1')), kkUde: !panel.contains(document.querySelector('.an-kk')),
        antal: document.querySelectorAll('.an-panel').length,
        stats: [...document.querySelectorAll('.an-panel .an-stats li')].map(l => Math.round(l.getBoundingClientRect().top)),
        over: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    }));
    assert.strictEqual(r.display, 'block', url);
    assert.ok(r.kant >= 1 && r.radius >= 6, `${url}: panelet er et kort (kant ${r.kant}, radius ${r.radius})`);
    assert.ok(r.head && r.desc && r.h1 && r.kkUde, `${url}: indhold i panelet`);
    assert.strictEqual(r.antal, 1);
    assert.strictEqual(new Set(r.stats).size, 1, `${url}: alle nøgletal står i én række: ${r.stats}`);
    assert.strictEqual(r.over, 0);
  }
});

test('under 1180 px er panelet gennemsigtigt (display:contents), så tablet- og mobillayout er uændret', { timeout: 60000 }, async t => {
  if (!H) return t.skip('Playwright mangler');
  for (const vp of [390, 768, 1024]) {
    const d = await side(vp, EKSTERN, p => p.evaluate(() => getComputedStyle(document.querySelector('.an-panel')).display));
    assert.strictEqual(d, 'contents', `ved ${vp}`);
  }
});

test('1440: sidepanelet (kilde + handl trygt) klæber under headeren, når man ruller', { timeout: 60000 }, async t => {
  if (!H) return t.skip('Playwright mangler');
  const r = await side(1440, GUL, async p => {
    const pos = await p.evaluate(() => getComputedStyle(document.querySelector('.an-side')).position);
    const foer = await p.evaluate(() => document.querySelector('.an-side').getBoundingClientRect().top);
    await p.evaluate(() => window.scrollTo(0, 220)); await p.waitForTimeout(150);
    const efter = await p.evaluate(() => document.querySelector('.an-side').getBoundingClientRect().top);
    return { pos, foer, efter };
  });
  assert.strictEqual(r.pos, 'sticky');
  assert.ok(r.efter > 60 && r.efter < r.foer, `top før ${r.foer}, efter rul ${r.efter}`);
  assert.ok(r.efter <= 80, `klæber ved headerens underkant + luft (${r.efter})`);
});

test('ekstern annonce: ét foto med kredit-pille og vej til kildens billeder — intet galleri, ingen tæller, ingen miniaturer, ingen kontaktdata', { timeout: 60000 }, async t => {
  if (!H) return t.skip('Playwright mangler');
  const r = await side(1440, EKSTERN, p => p.evaluate(() => {
    const fig = document.querySelector('.an-photo-ext'), link = fig.querySelector('.an-photo-link'), cta = document.querySelector('.an-cta');
    const rc = e => e.getBoundingClientRect();
    return {
      pille: fig.querySelector('figcaption').textContent.trim(), billeder: fig.querySelectorAll('img').length,
      galleri: document.querySelectorAll('.gallery, .gallery-thumbs, .gallery-counter, .gallery-nav, .gallery-expand, #an-lightbox, .prerender-gallery').length,
      link: { href: link.href, target: link.target, rel: link.rel, navn: link.getAttribute('aria-label'), b: rc(link).width, h: rc(link).height },
      cta: cta.href, ctaAntal: document.querySelectorAll('.an-cta').length, primaere: document.querySelectorAll('.an-seller-wrap .btn-primary').length,
      kontakt: document.querySelectorAll('a[href^="tel:"], a[href^="mailto:"]:not(.footer-kontakt a)').length,
      pilleVenstre: rc(fig.querySelector('figcaption')).left < rc(fig).left + 40,
      imgIAlt: document.querySelectorAll('.an-gallery img, .an-photo img').length,
    };
  }));
  assert.match(r.pille, /^Foto: MC Syd( — flere billeder i deres annonce)?$/);
  assert.strictEqual(r.billeder, 1, 'ét foto');
  assert.strictEqual(r.galleri, 0, 'intet galleri på eksterne annoncer');
  assert.strictEqual(r.link.target, '_blank');
  assert.match(r.link.rel, /noopener/); assert.match(r.link.rel, /nofollow/);
  assert.strictEqual(r.link.href, r.cta, 'knappen på fotoet fører til samme deeplink som kilde-CTA');
  assert.match(r.link.navn, /MC Syd.*ny fane/);
  assert.ok(r.link.b >= 40 && r.link.h >= 40, 'tap-mål');
  assert.strictEqual(r.ctaAntal, 1);
  assert.strictEqual(r.primaere, 1, 'kun én primærknap i kildekortet');
  assert.strictEqual(r.kontakt, 0, 'ingen tel:/mailto: på eksterne annoncer');
  assert.ok(r.pilleVenstre);
});

test('kildekortet: primær CTA, to sekundærhandlinger, én sætning om hvem man handler med; fuld forklaring bag "Mere om salget"', { timeout: 60000 }, async t => {
  if (!H) return t.skip('Playwright mangler');
  const mc = await side(1440, EKSTERN, p => p.evaluate(() => {
    const k = document.querySelector('.an-seller'), sek = [...k.querySelectorAll('.an-seller-sek > *')];
    const d = k.querySelector('.an-seller-mere');
    return { sek: sek.map(e => e.textContent.trim()), alle: (k.querySelector('.an-seller-sek a') || {}).href || '', kort: k.querySelector('.an-seller-kort').textContent.trim(),
      aaben: d.open, tekst: d.textContent.replace(/\s+/g, ' '), ctaTop: k.querySelector('.an-cta').getBoundingClientRect().top, sekTop: k.querySelector('.an-seller-sek').getBoundingClientRect().top };
  }));
  assert.deepStrictEqual(mc.sek, ['Alle fra MC Syd', 'Kopiér link']);
  assert.match(mc.alle, /soegning\.html\?kilde=mcsyd\.dk$/);
  assert.strictEqual(mc.kort, 'Du handler direkte med MC Syd.');
  assert.strictEqual(mc.aaben, false);
  assert.match(mc.tekst, /Du handler direkte med MC Syd — de svarer på dine spørgsmål/);
  assert.ok(mc.sekTop > mc.ctaTop, 'sekundærhandlinger under primærknappen');
  const gul = await side(1440, GUL, p => p.evaluate(() => ({ kort: document.querySelector('.an-seller-kort').textContent.trim(), tekst: document.querySelector('.an-seller-mere').textContent.replace(/\s+/g, ' ') })));
  assert.strictEqual(gul.kort, 'Du handler med sælgeren bag annoncen, ikke med Gul og Gratis.');
  assert.match(gul.tekst, /annoncestedet/);
});

test('"Kopiér link": kvittering på knappen ("Link kopieret" + hak-farve) og gendannelse; skærmlæser hører toasten', { timeout: 60000 }, async t => {
  if (!H) return t.skip('Playwright mangler');
  const r = await side(1440, EKSTERN, async p => {
    p.on('dialog', d => d.dismiss());
    const knap = p.locator('#copy-link-btn');
    await knap.click(); await p.waitForTimeout(150);
    const under = { tekst: (await knap.innerText()).trim(), klasse: await knap.getAttribute('class'), toast: (await p.locator('.toast[role="status"]').innerText().catch(() => '')).trim() };
    await p.waitForTimeout(2500);
    return { under, efter: (await knap.innerText()).trim(), klasseEfter: await knap.getAttribute('class') };
  });
  assert.strictEqual(r.under.tekst, 'Link kopieret');
  assert.match(r.under.klasse, /an-kopieret/);
  assert.match(r.under.toast, /Link kopieret/);
  assert.strictEqual(r.efter, 'Kopiér link');
  assert.doesNotMatch(r.klasseEfter, /an-kopieret/);
});

test('favorit på egen annonce: popper og skifter tekst + aria-pressed; hovedhjertet på eksterne er kun-lokalt (V5, D-008 revideret)', { timeout: 60000 }, async t => {
  if (!H) return t.skip('Playwright mangler');
  const e = await side(1440, EGEN, async p => {
    const f = p.locator('.an-fav');
    await f.click(); await p.waitForTimeout(100);
    return { pop: /an-pop/.test(await f.getAttribute('class')), pressed: await f.getAttribute('aria-pressed'), tekst: (await f.innerText()).trim(),
      anim: await p.evaluate(() => getComputedStyle(document.querySelector('.an-fav svg')).animationName) };
  });
  assert.ok(e.pop); assert.strictEqual(e.pressed, 'true'); assert.match(e.tekst, /Gemt som favorit/); assert.strictEqual(e.anim, 'an-pop');
  /* V5 (D-008 revideret): en indekseret annonce har nu også "Gem som favorit", men mærket som kun-lokal (gemmes aldrig i databasen) — se js/v5-favoritter.test.js. */
  const x = await side(1440, EKSTERN, p => p.evaluate(() => { const b = document.querySelector('.an-fav'); return b ? { ext: b.getAttribute('data-fav-ext'), titel: b.title } : null; }));
  assert.deepStrictEqual(x, { ext: '1', titel: 'Gemmes i denne browser' });
});

test('prefers-reduced-motion slukker overgange og popper-animationen', { timeout: 60000 }, async t => {
  if (!H) return t.skip('Playwright mangler');
  const r = await side(1440, EGEN, async p => {
    await p.locator('.an-fav').click(); await p.waitForTimeout(80);
    return p.evaluate(() => ({ act: getComputedStyle(document.querySelector('.an-act')).transitionDuration,
      anim: getComputedStyle(document.querySelector('.an-fav svg')).animationName }));
  }, { reducedMotion: 'reduce' });
  /* styles.css nulstiller varigheden til 1e-6 s under reduced motion; ingen mærkbar overgang tilbage */
  assert.ok(parseFloat(r.act) < 0.01, 'transition: ' + r.act); assert.strictEqual(r.anim, 'none');
});

test('faktatabel (ekstern): Sælger og Sted står ikke to gange (de er i kildekortet), og ingen række brækker over to linjer', { timeout: 60000 }, async t => {
  if (!H) return t.skip('Playwright mangler');
  const r = await side(1440, EKSTERN, p => p.evaluate(() => ({
    etiketter: [...document.querySelectorAll('.an-fact dt')].map(e => e.textContent.trim()),
    hoejder: [...document.querySelectorAll('.an-fact')].map(e => Math.round(e.getBoundingClientRect().height)),
  })));
  assert.ok(!r.etiketter.includes('Sælger') && !r.etiketter.includes('Sted'), r.etiketter.join(','));
  assert.ok(r.etiketter.includes('Annonce-id'));
  assert.strictEqual(new Set(r.hoejder).size, 1, 'ens rækkehøjde: ' + r.hoejder);
});

test('mobil 390: kildekortet står lige efter nøgletallene og før kørekortet; sticky bjælken er der stadig', { timeout: 60000 }, async t => {
  if (!H) return t.skip('Playwright mangler');
  for (const url of [EKSTERN, EGEN]) {
    const r = await side(390, url, p => p.evaluate(() => {
      const top = s => document.querySelector(s).getBoundingClientRect().top + scrollY;
      return { head: top('.an-head'), sel: top('.an-seller-wrap'), kk: top('.an-kk'), selTop: document.querySelector('.an-seller-wrap').getBoundingClientRect().top + scrollY,
        stats: document.querySelector('.an-stats').getBoundingClientRect().bottom + scrollY, over: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    }));
    assert.ok(r.sel > r.stats - 1 && r.sel < r.kk, `${url}: kilde efter nøgletal (${r.stats}) og før kørekort (${r.kk}): ${r.sel}`);
    assert.ok(r.sel - r.stats < 60, `${url}: kilden følger umiddelbart efter nøgletallene`);
    assert.strictEqual(r.over, 0);
  }
  const bar = await side(390, EKSTERN, p => p.evaluate(() => { const b = document.getElementById('ekstern-actionbar'); return !!b; }));
  assert.ok(bar);
});

test('lignende motorcykler: højst to chips pr. kort (kørekort + kubik), kortet er slankere end på søgesiden', { timeout: 60000 }, async t => {
  if (!H) return t.skip('Playwright mangler');
  const r = await side(1440, EKSTERN, p => p.evaluate(() => ({
    kort: document.querySelectorAll('#similar-listings .card').length,
    chips: [...document.querySelectorAll('#similar-listings .card')].map(k => [...k.querySelectorAll('.rk-chip')].filter(c => c.offsetParent).length),
    kk: [...document.querySelectorAll('#similar-listings .card')].every(k => k.querySelector('.rk-kk')),
  })));
  assert.ok(r.kort >= 4);
  assert.ok(r.chips.every(n => n <= 2 && n >= 1), r.chips.join(','));
  assert.ok(r.kk, 'kørekortchippen bliver på alle kort');
});

/* ---------- Mobil-CTA "Vis nummer" må ikke love et nummer, som måske ikke findes (QA-note til Agent 2) ----------
   Nummeret findes kun hos RPC'en hent_saelger_telefon (kun indloggede; null hvis sælgeren ikke viser det). Før stod der "Vis nummer" for
   alle udloggede på alle database-annoncer, et tryk sendte til login, og bagefter kunne svaret være tomt. */
const { lavBackend } = require(path.join(REPO, 'scripts', 'w9-saelger-mock.js'));
const FREMMED = 'cccccccc-0000-4000-8000-0000000000c1';
const ANN_ID = '00000000-0000-4000-8000-0000000000e9';
const fremmedAnnonce = () => ({ id: ANN_ID, brand: 'Yamaha', model: 'MT-07', type: 'naked', year: 2023, km: 16300, ccm: 689, power: 73, price: 69900, description: 'Velholdt.',
  seller_id: FREMMED, seller: { id: FREMMED, name: 'Anders', is_dealer: false, city: 'Odense', member_since: 2024 },
  photos: [{ id: 'p0', storage_path: 't/0.png', position: 0 }] });

async function mobil(loggetInd, rpcSvar, fn) {
  const bak = lavBackend({ loggetInd, annoncer: [fremmedAnnonce()] });
  const c = await H.browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'da-DK', serviceWorkers: 'block' });
  await bak.installer(c, { tema: 'lys' });
  if (rpcSvar !== undefined) await c.route(/rpc\/hent_saelger_telefon/, r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: rpcSvar }));
  const p = await c.newPage();
  const fejl = []; p.on('pageerror', e => fejl.push(e.message));
  try {
    await p.goto(`${H.base}/annonce.html?id=${ANN_ID}`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(500);
    const r = await fn(p);
    assert.deepStrictEqual(fejl, []);
    return r;
  } finally { await c.close(); }
}
const barTekst = p => p.evaluate(() => { const b = document.getElementById('bar-phone'); return b ? { tekst: b.innerText.replace(/\s+/g, ' ').trim(), h: Math.round(document.getElementById('listing-actionbar').getBoundingClientRect().height) } : null; });

test('udlogget på database-annonce: bjælken siger "Log ind for at se nummer" + at ikke alle sælgere viser et — ikke bare "Vis nummer"', { timeout: 60000 }, async t => {
  if (!H) return t.skip('Playwright mangler');
  const r = await mobil(false, undefined, async p => ({ bar: await barTekst(p), side: await p.evaluate(() => document.querySelector('.an-seller-wrap').innerText) }));
  assert.match(r.bar.tekst, /^Log ind for at se nummer Ikke alle sælgere viser et$/);
  assert.doesNotMatch(r.bar.tekst, /^Vis nummer/);
  assert.ok(r.bar.h <= 76, `bjælken er højst --actionbar-h (76 px): ${r.bar.h}`);
  assert.match(r.side, /Log ind for at se, om sælgeren har valgt at vise sit telefonnummer/);
});

test('udlogget: tryk på bjælken sender til login med redirect tilbage (det sker, som knappen siger)', { timeout: 60000 }, async t => {
  if (!H) return t.skip('Playwright mangler');
  const url = await mobil(false, undefined, async p => {
    await Promise.all([p.waitForURL(/login\.html/, { timeout: 8000 }), p.click('#bar-phone')]);
    return p.url();
  });
  assert.match(url, /login\.html\?redirect=%2Fannonce\.html/);
});

test('logget ind: bjælken siger "hvis sælgeren viser det"; er svaret tomt, fjernes bjælken og siden siger det ærligt', { timeout: 60000 }, async t => {
  if (!H) return t.skip('Playwright mangler');
  const r = await mobil(true, 'null', async p => {
    const foer = await barTekst(p);
    await p.click('#bar-phone');
    await p.waitForFunction(() => !document.getElementById('listing-actionbar'), null, { timeout: 5000 });
    return { foer, note: await p.evaluate(() => document.querySelector('.an-seller-wrap').innerText), knap: await p.locator('#reveal-phone-btn').count() };
  });
  assert.match(r.foer.tekst, /^Vis nummer hvis sælgeren viser det$/);
  assert.match(r.note, /Sælgeren viser ikke sit telefonnummer/);
  assert.strictEqual(r.knap, 0);
});

test('logget ind med nummer: tryk på bjælken viser nummeret', { timeout: 60000 }, async t => {
  if (!H) return t.skip('Playwright mangler');
  const nr = await mobil(true, '"12345678"', async p => {
    await p.click('#bar-phone');
    await p.waitForSelector('.phone-reveal', { timeout: 5000 });
    return p.locator('.phone-reveal').innerText();
  });
  assert.match(nr, /12345678/);
});

test('ekstern annonce har aldrig telefonknap eller telefonbjælke', { timeout: 60000 }, async t => {
  if (!H) return t.skip('Playwright mangler');
  const r = await side(390, EKSTERN, p => p.evaluate(() => ({ bar: !!document.getElementById('bar-phone'), reveal: !!document.getElementById('reveal-phone-btn'),
    listingBar: !!document.getElementById('listing-actionbar'), tel: document.querySelectorAll('a[href^="tel:"]').length, tekst: /Vis nummer|Vis telefonnummer/.test(document.body.innerText) })));
  assert.deepStrictEqual(r, { bar: false, reveal: false, listingBar: false, tel: 0, tekst: false });
});
