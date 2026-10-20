/* V5 mærkekrav (uafhængig kritiker) — de nye krav til mærkedækningen, skrevet som tjek der FEJLER, indtil de andre agenter har
   rettet det. Kaldes af scripts/v4-maerke-dakning.js (gruppe "v5"); fund på listen scripts/v4-maerke-dakning.kendt.json tæller
   ikke i exit-koden (så testsuiten er grøn før merge), men vises og rapporteres.

   KRAV (kontrakten kritikeren tester — afvigelser meldes til Orchestrator, så kontrakten kan rettes i stedet for koden):
     A  "Andet mærke" i opret-annonce
        - #f-brand har en valgmulighed "Andet mærke" (tekst /^Andet( mærke)?$/i).
        - Vælges den, vises et tekstfelt (nyt synligt input/textarea) med tilgængeligt navn (label/aria-label), maxlength <= 60.
        - Tomt, kun mellemrum og en for lang tekst afvises af validateStep() (feltet får aria-invalid="true"); en normal tekst ("Fantasi Motors") accepteres.
        - HTML i feltet bliver aldrig til elementer eller script i siden (ingen XSS i forhåndsvisningen).
        - Teksten går ikke tabt (den står i collectFormData()), men bliver ALDRIG automatisk et offentligt mærke:
          Filtrering.maerkeListe() over en annonce med collectFormData()-mærket må ikke indeholde fritekstmærket, og
          BrandRegistry.valgbare() er uændret. Skifter man tilbage til et rigtigt mærke, forsvinder feltet og teksten.
     B  Levende hydrering af "Flere mærker" på maerker.html
        - Har lageret annoncer for et mærke, der i den statiske HTML står som ikke-klikbar pille (her: en mocket Zero-annonce),
          må mærket ikke blive stående som inert pille: det bliver en række/et link til en side, der findes (maerke-<slug>.html
          eller soegning.html?brands=<mærke>) — eller pillen bliver et link dertil.
        - Efter hydrering stemmer tallene: "Flere mærker (N)", "Disse N mærker", "Historiske mærker (M)" = antal piller, og
          A–Z-rækker + piller = antal registermærker. Hvert mærke står præcis ét sted.
     C  Hurtigsøgningen (#mk-hurtigsoeg-input) på maerker.html finder piller i "Flere mærker"
        - Skrives et mærkenavn eller registeralias, der er en pille, er pillen synlig (checkVisibility); piller der IKKE matcher
          (fold af navn+aliaser indeholder ikke søgningen) er skjult; statusteksten tæller rækker + piller og siger kun
          "Ingen mærker matcher." når intet matcher.
     D  Ukendt ?brands=xyz spejles ikke i H1 (eller title/description): fritekst fra en URL må ikke blive sidens overskrift
        (SEO-spam, forfalskede titler). Kendte mærker (?brands=Honda) står stadig i H1.

   Hvert tjek er en ren funktion over en indlæst Playwright-side; scripts/v5-maerke-krav.test.js kører dem mod små kontrolsider,
   der overholder (skal give 0 fund) og bryder (skal give fund) kontrakten, så tjekkene beviseligt kan både bestå og fejle. */

const path = require('path');
const sb = require('./smoke-browser');
const { egneRaekker, restSvar, PNG_1X1, uuid } = require('./smoke-fixtures');
const { slugify } = require('./slug');

const VAERT = 'bb-qa.test';
const G = 'v5';
const fold = s => slugify(String(s == null ? '' : s));

/* ---------- Mock: en Zero-annonce (mærket står som ikke-klikbar pille i den statiske maerker.html) ---------- */

function zeroRaekke(n = 1) {
  const base = egneRaekker()[0];
  return Array.from({ length: n }, (_, i) => ({
    ...base, id: uuid(950 + i), brand: 'Zero', model: 'SR/F', type: 'naked', year: 2023, km: 1200 + i, ccm: null, power: 82, price: 129900 + i,
    condition: 'God stand', description: 'Mocket testannonce (QA).', photos: [],
  }));
}

async function installerRute(context, { port, ekstraEgne, skrivninger }) {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' };
  await context.route('**/*', async route => {
    const req = route.request();
    let u;
    try { u = new URL(req.url()); } catch (e) { return route.abort('blockedbyclient'); }
    if (u.hostname === VAERT && Number(u.port) === port) return route.continue();
    if (/(^|\.)supabase\.co$/.test(u.hostname)) {
      const m = req.method();
      if (m === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
      if (m !== 'GET' && m !== 'HEAD') { (skrivninger || []).push({ metode: m, sti: u.pathname, body: req.postData() }); return route.abort('blockedbyclient'); }
      if (u.pathname.startsWith('/rest/v1/')) {
        const tabel = u.pathname.slice('/rest/v1/'.length);
        let { status, body } = restSvar(tabel + u.search, u.searchParams);
        if (tabel === 'listings' && ekstraEgne && ekstraEgne.length && !(Number(u.searchParams.get('offset')) > 0) && Array.isArray(body)) body = body.concat(ekstraEgne);
        return route.fulfill({ status, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      }
      if (u.pathname.startsWith('/storage/v1/')) return route.fulfill({ status: 200, headers: { ...cors, 'Content-Type': 'image/png' }, body: PNG_1X1 });
      return route.fulfill({ status: 401, headers: { ...cors, 'Content-Type': 'application/json' }, body: '{"message":"qa: ingen session"}' });
    }
    if (req.resourceType() === 'image') return route.fulfill({ status: 200, headers: { 'Content-Type': 'image/png' }, body: PNG_1X1 });
    return route.abort('blockedbyclient');
  });
}

/* ---------- A: "Andet mærke" i opret-annonce ---------- */

async function tjekAndetMaerke(p, tilfoej) {
  const M = 'Andet mærke';
  const fejl = (tjek, detalje, niveau = 'fejl') => tilfoej(G, tjek, niveau, M, detalje);
  const opt = await p.evaluate(() => [...document.getElementById('f-brand').options].map(o => ({ v: o.value, t: o.textContent.trim() })));
  const andet = opt.find(o => /^(andet|andre)( mærker?)?$/i.test(o.t));
  if (!andet) { fejl('v5-andet-mangler', `#f-brand (${opt.length} valg) har ingen valgmulighed "Andet mærke" — en sælger med et mærke uden for registret kan ikke oprette annoncen`); return; }
  const foer = await p.evaluate(() => ({
    valgbare: BrandRegistry.valgbare().slice(),
    synlige: [...document.querySelectorAll('input:not([type=hidden]):not([type=radio]):not([type=checkbox]):not([type=file]),textarea')].filter(e => e.checkVisibility()).map(e => e.id || e.name),
  }));
  await p.selectOption('#f-brand', { value: andet.v });
  await p.waitForTimeout(200);
  const felt = await p.evaluate(({ synlige }) => {
    const e = [...document.querySelectorAll('input:not([type=hidden]):not([type=radio]):not([type=checkbox]):not([type=file]),textarea')]
      .find(x => x.checkVisibility() && !synlige.includes(x.id || x.name));
    if (!e) return null;
    e.setAttribute('data-qa-andet', '1');
    const navn = (e.labels && e.labels[0] && e.labels[0].textContent.trim()) || e.getAttribute('aria-label') || (e.getAttribute('aria-labelledby') && (document.getElementById(e.getAttribute('aria-labelledby')) || {}).textContent) || '';
    return { id: e.id, required: e.required || e.getAttribute('aria-required') === 'true', maxlength: e.maxLength > 0 ? e.maxLength : null, navn: navn.trim() };
  }, { synlige: foer.synlige });
  if (!felt) { fejl('v5-andet-felt-mangler', 'efter valg af "Andet mærke" vises intet nyt tekstfelt til mærkenavnet'); return; }
  if (!felt.navn) fejl('v5-andet-label', `tekstfeltet ${felt.id || ''} har intet tilgængeligt navn (label/aria-label)`);
  if (!felt.maxlength || felt.maxlength > 60) fejl('v5-andet-maxlength', `tekstfeltet har maxlength ${felt.maxlength} (kræver 1-60)`);

  const sel = '[data-qa-andet]';
  /* Fylder feltet og kører sidens egen validering; aria-invalid="true" på feltet = afvist. */
  const prov = async tekst => {
    await p.fill(sel, tekst);
    await p.dispatchEvent(sel, 'change');
    return p.evaluate(() => {
      try { validateStep(1); } catch (e) { return { fejl: String(e.message) }; }
      const e = document.querySelector('[data-qa-andet]');
      const felt = e.closest('.field') || e.parentElement;
      return { afvist: e.getAttribute('aria-invalid') === 'true' || !!(felt && (felt.classList.contains('has-error') || felt.querySelector('.felt-fejl'))), laengde: e.value.length };
    });
  };
  const tom = await prov('');
  if (tom.fejl) { fejl('v5-andet-validering-fejler', `validateStep kastede: ${tom.fejl}`); return; }
  if (!tom.afvist) fejl('v5-andet-tom-accepteres', 'tomt tekstfelt ved "Andet mærke" afvises ikke af validateStep (annonce uden mærkenavn)');
  const blank = await prov('   ');
  if (!blank.afvist) fejl('v5-andet-blank-accepteres', 'kun mellemrum accepteres som mærkenavn');
  const lang = await prov('M'.repeat(200));
  if (!lang.afvist && lang.laengde > 60) fejl('v5-andet-for-lang', `${lang.laengde} tegn accepteres (maks 60)`);
  await p.evaluate(() => { window.__xss = 0; });
  const html = await prov('<img src=x onerror=window.__xss=1>Moto');
  await p.waitForTimeout(250);
  const xss = await p.evaluate(() => ({ koert: window.__xss, img: document.querySelectorAll('img[src="x"]').length }));
  if (xss.koert || xss.img) fejl('v5-andet-xss', `HTML i mærkefeltet blev til element/script i siden (${JSON.stringify(xss)}; felt afvist: ${html.afvist})`);
  const ok = await prov('Fantasi Motors');
  if (ok.afvist) fejl('v5-andet-gyldig-afvises', 'et normalt mærkenavn ("Fantasi Motors") afvises af validateStep');
  const d = await p.evaluate(() => {
    const data = collectFormData();
    let liste = null, valgbare = BrandRegistry.valgbare();
    try { liste = Filtrering.maerkeListe([{ ...data, id: 'qa-andet', brand: data.brand, model: data.model || 'X' }], []).map(m => (m && m.navn) || m); } catch (e) { liste = ['(maerkeListe kastede: ' + e.message + ')']; }
    return { json: JSON.stringify(data), brand: data.brand, liste, valgbare };
  });
  if (!/Fantasi Motors/.test(d.json)) fejl('v5-andet-tekst-gaar-tabt', 'teksten "Fantasi Motors" findes ikke i collectFormData() — sælgerens mærkenavn gemmes ikke');
  if (/Fantasi Motors/i.test(String(d.brand)) || d.liste.some(n => fold(n) === fold('Fantasi Motors')))
    fejl('v5-andet-bliver-offentligt-maerke', `collectFormData().brand = "${d.brand}", og søgningens mærkeliste ville vise "${d.liste.join(', ')}": fritekst må ikke automatisk blive et offentligt mærke/filter (brug "Andet mærke"/uoplyst + separat felt)`);
  if (JSON.stringify(d.valgbare) !== JSON.stringify(foer.valgbare)) fejl('v5-andet-aendrer-register', 'BrandRegistry.valgbare() ændrede sig, da fritekst blev indtastet');
  /* Tilbage til et rigtigt mærke: feltet og teksten skal væk. */
  const rigtigt = opt.find(o => o.v && !/^(andet|andre)/i.test(o.t));
  await p.selectOption('#f-brand', { value: rigtigt.v });
  await p.waitForTimeout(200);
  const efter = await p.evaluate(() => ({ synligt: !!(document.querySelector('[data-qa-andet]') && document.querySelector('[data-qa-andet]').checkVisibility()), json: JSON.stringify(collectFormData()) }));
  if (efter.synligt) fejl('v5-andet-felt-bliver', 'tekstfeltet bliver stående, efter man har skiftet til et rigtigt mærke');
  if (/Fantasi Motors/.test(efter.json)) fejl('v5-andet-rest-tekst', 'fritekstmærket følger med annoncen, efter man har valgt et rigtigt mærke');
}

/* ---------- B: levende hydrering af "Flere mærker" ---------- */

const laesFlere = (p) => p.evaluate(() => {
  const synlig = e => (e.checkVisibility ? e.checkVisibility() : true);
  const piller = [...document.querySelectorAll('ul.mk-flere > li')].map(li => ({ navn: li.textContent.replace(/\s+/g, ' ').trim(), link: (li.querySelector('a') || {}).getAttribute ? li.querySelector('a').getAttribute('href') : null, hist: !!li.closest('.mk-flere-hist'), synlig: synlig(li) }));
  const raekker = [...document.querySelectorAll('#mk-az-liste li[data-mk-soeg]')].map(li => ({ href: (li.querySelector('a') || {}).getAttribute ? li.querySelector('a').getAttribute('href') : null, tekst: li.textContent.replace(/\s+/g, ' ').trim() }));
  const tal = re => { const m = document.body.innerText.match(re); return m ? Number(m[1]) : null; };
  let lager = null;
  try { const demo = new Set((typeof LISTINGS !== 'undefined' ? LISTINGS : []).map(l => String(l.id))); lager = Store.getAllListings().filter(l => !demo.has(String(l.id))).map(l => l.brand); } catch (e) { /* ingen Store */ }
  return { piller, raekker, lager, overskrift: tal(/Flere mærker \((\d+)\)/), intro: tal(/Disse (\d+) mærker/), hist: tal(/Historiske mærker \((\d+)\)/) };
});

/* opts: { navn:'Zero', antal:1, registerAntal:93, linkFindes:(href)=>bool, ventMs:6000 } */
async function tjekFlereHydrering(p, tilfoej, opts) {
  const { navn, linkFindes } = opts;
  const fejl = (tjek, detalje, niveau = 'fejl') => tilfoej(G, tjek, niveau, navn, detalje);
  const erInert = d => d.piller.some(x => fold(x.navn) === fold(navn) && !x.link);
  let d = await laesFlere(p);
  const slut = Date.now() + (opts.ventMs == null ? 6000 : opts.ventMs);
  while (erInert(d) && Date.now() < slut) { await p.waitForTimeout(250); d = await laesFlere(p); }
  const iLager = d.lager ? d.lager.filter(b => fold(b) === fold(navn)).length : null;
  if (erInert(d)) {
    fejl('v5-flere-ikke-hydreret', `${navn} står stadig som ikke-klikbar pille i "Flere mærker"${iLager == null ? ' (siden indlæser ikke lageret: Store er ikke tilgængelig)' : iLager ? ` selvom lageret har ${iLager} annonce(r) med ${navn}` : ' og lageret har slet ingen annoncer for mærket (siden henter ikke den mockede annonce)'}`);
    return;
  }
  const raekke = d.raekker.find(r => fold(r.tekst).includes(fold(navn)));
  const pille = d.piller.find(x => fold(x.navn) === fold(navn));
  const mål = raekke ? raekke.href : pille ? pille.link : null;
  if (!mål) fejl('v5-flere-forsvundet', `${navn} er hverken A–Z-række, pille eller link efter hydrering (mærket er skjult)`);
  else {
    let ok = false;
    const m = String(mål).match(/^soegning\.html\?(?:.*&)?brands=([^&]+)/);
    if (m) ok = fold(decodeURIComponent(m[1])) === fold(navn);
    else ok = linkFindes ? linkFindes(mål) : true;
    if (!ok) fejl('v5-flere-link-doed', `${navn} linker til "${mål}", som hverken er en eksisterende side eller en søgning efter mærket`);
  }
  if (raekke && pille && !pille.link) fejl('v5-flere-dublet', `${navn} står både som A–Z-række og som pille`);
  const antalPiller = d.piller.length, antalHist = d.piller.filter(x => x.hist).length;
  if (d.overskrift != null && d.overskrift !== antalPiller) fejl('v5-flere-tal-efter-hydrering', `overskriften siger "Flere mærker (${d.overskrift})", men der er ${antalPiller} piller`);
  if (d.intro != null && d.intro !== antalPiller) fejl('v5-flere-tal-efter-hydrering', `introen siger "Disse ${d.intro} mærker", men der er ${antalPiller} piller`);
  if (d.hist != null && d.hist !== antalHist) fejl('v5-flere-tal-efter-hydrering', `"Historiske mærker (${d.hist})" men der er ${antalHist} historiske piller`);
  if (opts.registerAntal && d.raekker.length + antalPiller !== opts.registerAntal) fejl('v5-oversigt-sum-efter-hydrering', `${d.raekker.length} rækker + ${antalPiller} piller ≠ ${opts.registerAntal} registermærker`);
  /* Generelt: ingen pille med annoncer i lageret. */
  if (d.lager) {
    const iLagerSet = new Set(d.lager.filter(Boolean).map(fold));
    for (const x of d.piller) if (!x.link && iLagerSet.has(fold(x.navn))) fejl('v5-flere-pille-har-annoncer', `"${x.navn}" er ikke-klikbar pille, men lageret har annoncer med mærket`);
  }
}

/* ---------- C: hurtigsøgningen finder piller ---------- */

/* piller: [{ navn, aliaser:[...] }] fra registret. Kører al interaktion i siden (ét evaluate), så det er hurtigt. */
async function tjekHurtigsoegPiller(p, tilfoej, opts) {
  const fejl = (tjek, maerke, detalje) => tilfoej(G, tjek, 'fejl', maerke, detalje);
  const har = await p.evaluate(() => !!document.getElementById('mk-hurtigsoeg-input') && !document.getElementById('mk-hurtigsoeg-input').closest('[hidden]'));
  if (!har) { tilfoej(G, 'v5-hurtigsoeg-mangler', 'fejl', 'Flere mærker', 'hurtigsøgningsfeltet findes ikke/er skjult'); return; }
  const res = await p.evaluate(async ({ registerPiller, ekstra, sample }) => {
    const fold = s => String(s).normalize('NFC').toLowerCase().replace(/ø/g, 'oe').replace(/æ/g, 'ae').replace(/å/g, 'aa').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '');
    const synlig = e => (e.checkVisibility ? e.checkVisibility() : !e.hidden);
    const input = document.getElementById('mk-hurtigsoeg-input');
    const status = document.querySelector('.mk-hurtigsoeg-status');
    const pilleEls = [...document.querySelectorAll('ul.mk-flere > li')].map(li => ({ li, navn: li.textContent.replace(/\s+/g, ' ').trim() }));
    const aliasFor = n => ((registerPiller.find(r => fold(r.navn) === fold(n)) || {}).aliaser) || [];
    const soeg = async q => {
      input.value = q; input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, 70));
      const synlige = pilleEls.filter(x => synlig(x.li)).map(x => x.navn);
      const raekker = [...document.querySelectorAll('#mk-az-liste li[data-mk-soeg]')].filter(synlig).length;
      return { q, synlige, raekker, status: status ? status.textContent.trim() : null };
    };
    const forventet = q => pilleEls.filter(x => !q || [x.navn, ...aliasFor(x.navn)].some(n => fold(n).includes(fold(q)))).map(x => x.navn);
    const ud = { navneFejl: [], aliasFejl: [], filter: [], status: [], antalPiller: pilleEls.length, afproevet: 0 };
    for (const x of pilleEls.filter((q, i) => !sample || i % sample === 0 || /zero/i.test(q.navn))) {
      const r = await soeg(x.navn); ud.afproevet++;
      if (!r.synlige.includes(x.navn)) ud.navneFejl.push(x.navn);
      const a = aliasFor(x.navn).find(al => fold(al) !== fold(x.navn));
      if (a) { const ra = await soeg(a); if (!ra.synlige.includes(x.navn)) ud.aliasFejl.push(`${x.navn} ← "${a}"`); }
    }
    for (const q of ['honda', 'zero', 'norton', 'moto', 'zundapp', 'xyzxyzxyz', ...(ekstra || [])]) {
      const r = await soeg(q);
      const fo = forventet(q);
      const forMange = r.synlige.filter(n => !fo.includes(n)), forFaa = fo.filter(n => !r.synlige.includes(n));
      if (forMange.length || forFaa.length) ud.filter.push({ q, forMange: forMange.slice(0, 5), forFaa: forFaa.slice(0, 5) });
      const total = r.raekker + r.synlige.length;
      const tallet = r.status && (r.status.match(/^(\d+)/) || [])[1];
      if (total > 0 && /^Ingen/i.test(r.status || '')) ud.status.push(`"${q}": status "${r.status}" men ${r.raekker} rækker + ${r.synlige.length} piller matcher`);
      else if (total === 0 && r.status && !/^Ingen/i.test(r.status)) ud.status.push(`"${q}": status "${r.status}" men intet matcher`);
      else if (tallet != null && Number(tallet) !== total) ud.status.push(`"${q}": status "${r.status}" men ${r.raekker} rækker + ${r.synlige.length} piller er synlige`);
    }
    input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true }));
    return ud;
  }, { registerPiller: opts.piller, ekstra: opts.ekstraSoegninger, sample: opts.hurtig ? 9 : 0 });
  if (!res.antalPiller) { tilfoej(G, 'v5-hurtigsoeg-ingen-piller', 'info', 'Flere mærker', 'siden har ingen piller (ul.mk-flere > li) at søge i'); return; }
  const nogle = (liste, n = 4) => liste.slice(0, n).join(', ') + (liste.length > n ? ` … (+${liste.length - n})` : '');
  if (res.navneFejl.length) fejl('v5-hurtigsoeg-pille-skjult', 'Flere mærker', `${res.navneFejl.length} af ${res.afproevet} afprøvede piller er ikke synlige, når man skriver deres navn i hurtigsøgningen (feltet finder kun A–Z-rækkerne): ${nogle(res.navneFejl)}`);
  if (res.aliasFejl.length) fejl('v5-hurtigsoeg-pille-alias', 'Flere mærker', `${res.aliasFejl.length} piller findes ikke via registeralias: ${nogle(res.aliasFejl)}`);
  if (res.filter.length) fejl('v5-hurtigsoeg-pille-filter', 'Flere mærker', `${res.filter.length} af 6 testsøgninger giver forkert pille-udvalg, fx "${res.filter[0].q}": piller der burde være skjult er synlige [${res.filter[0].forMange.join(', ')}], piller der burde være synlige mangler [${res.filter[0].forFaa.join(', ')}]`);
  if (res.status.length) fejl('v5-hurtigsoeg-status', 'Flere mærker', `statusteksten stemmer ikke med resultatet i ${res.status.length} søgninger, fx ${res.status[0]}`);
}

/* ---------- D: ukendt ?brands=xyz spejles ikke i H1 ---------- */

/* abn(sti) -> Playwright-side (indlæst); tjekket lukker siderne. */
async function tjekUkendtMaerkeH1(abn, tilfoej, opts = {}) {
  const ukendt = opts.ukendt || 'xyz', kendt = opts.kendt || 'Honda';
  const laes = p => p.evaluate(() => ({
    h1: [...document.querySelectorAll('h1')].map(h => h.textContent.replace(/\s+/g, ' ').trim()).join(' | '),
    title: document.title,
    beskrivelse: (document.querySelector('meta[name="description"]') || {}).content || '',
    ogTitel: (document.querySelector('meta[property="og:title"]') || {}).content || '',
  }));
  const pu = await abn(`soegning.html?brands=${encodeURIComponent(ukendt)}`);
  const u = await laes(pu); await pu.close();
  const spejlet = t => new RegExp(ukendt, 'i').test(t);
  if (spejlet(u.h1)) tilfoej(G, 'v5-ukendt-maerke-i-h1', 'fejl', `?brands=${ukendt}`, `H1 er "${u.h1}": en ukendt mærkeværdi fra URL'en spejles i overskriften`);
  if (spejlet(u.title) || spejlet(u.ogTitel)) tilfoej(G, 'v5-ukendt-maerke-i-title', 'advarsel', `?brands=${ukendt}`, `title "${u.title}" / og:title "${u.ogTitel}" spejler den ukendte mærkeværdi`);
  if (spejlet(u.beskrivelse)) tilfoej(G, 'v5-ukendt-maerke-i-beskrivelse', 'advarsel', `?brands=${ukendt}`, `meta description spejler den ukendte mærkeværdi`);
  const pk = await abn(`soegning.html?brands=${encodeURIComponent(kendt)}`);
  const k = await laes(pk); await pk.close();
  if (!new RegExp(kendt, 'i').test(k.h1)) tilfoej(G, 'v5-kendt-maerke-ikke-i-h1', 'fejl', `?brands=${kendt}`, `H1 er "${k.h1}": et kendt mærke skal stadig stå i overskriften`);
  return { ukendt: u, kendt: k };
}

/* ---------- Kørsel mod en rod ---------- */

/* Starter egen server + Chromium mod `rod` og kører A–D. T: { tilfoej, taelUd } fra v4-maerke-dakning. */
async function koerV5(opt, rod, reg, T) {
  const { tilfoej, taelUd } = T;
  const pw = opt.pw || (await sb.playwrightTilgaengelig()).pw;
  if (!pw) throw new Error((await sb.playwrightTilgaengelig()).grund);
  const fs = require('fs');
  const { server, port } = await sb.startServer(rod);
  const base = `http://${VAERT}:${port}`;
  const browser = await pw.chromium.launch({ headless: true, args: [`--host-resolver-rules=MAP ${VAERT} 127.0.0.1`] });
  const skrivninger = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'da-DK', serviceWorkers: 'block' });
    await context.addInitScript(sb.initScript, { tema: 'light' });
    await installerRute(context, { port, ekstraEgne: zeroRaekke(1), skrivninger });
    const aabn = async (sti, vent = 1500) => {
      const p = await context.newPage();
      const konsol = [];
      p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|Content[- ]Security/i.test(m.text())) konsol.push(m.text().slice(0, 160)); });
      p.on('pageerror', e => konsol.push('pageerror: ' + String((e && e.message) || e).slice(0, 160)));
      await p.goto(`${base}/${sti}`, { waitUntil: 'load', timeout: opt.tid || 25000 });
      await p.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
      await p.waitForFunction(() => !window.DATA_STATUS || (window.DATA_STATUS.eksterne !== 'ikke-hentet' && window.DATA_STATUS.egne !== 'ikke-hentet'), null, { timeout: 8000 }).catch(() => {});
      await p.waitForTimeout(vent);
      p.konsolfejl = konsol;
      return p;
    };
    const piller = reg.maerker.map(e => ({ navn: e.navn, aliaser: e.aliaser }));

    /* A */
    const op = await aabn('opret-annonce.html', 600);
    taelUd('v5Andet');
    try { await tjekAndetMaerke(op, tilfoej); } catch (e) { tilfoej(G, 'v5-andet-kunne-ikke-koere', 'fejl', 'Andet mærke', String(e.message).split('\n')[0]); }
    for (const f of op.konsolfejl) tilfoej(G, 'v5-opret-konsolfejl', 'fejl', 'Andet mærke', f);
    await op.close();

    /* B + C (samme side, B først: hydreringen ændrer pillerne C søger i) */
    const o = await aabn('maerker.html', 800);
    taelUd('v5FlereHydrering');
    try { await tjekFlereHydrering(o, tilfoej, { navn: 'Zero', registerAntal: reg.maerker.length, linkFindes: h => fs.existsSync(path.join(rod, String(h).split('?')[0].split('#')[0])) }); }
    catch (e) { tilfoej(G, 'v5-flere-kunne-ikke-koere', 'fejl', 'Zero', String(e.message).split('\n')[0]); }
    taelUd('v5Hurtigsoeg');
    try { await tjekHurtigsoegPiller(o, tilfoej, { piller, hurtig: !!opt.hurtig }); }
    catch (e) { tilfoej(G, 'v5-hurtigsoeg-kunne-ikke-koere', 'fejl', 'Flere mærker', String(e.message).split('\n')[0]); }
    for (const f of o.konsolfejl) tilfoej(G, 'v5-oversigt-konsolfejl', 'fejl', 'Flere mærker', f);
    await o.close();

    /* D */
    taelUd('v5UkendtH1');
    try { await tjekUkendtMaerkeH1(sti => aabn(sti, 500), tilfoej); } catch (e) { tilfoej(G, 'v5-h1-kunne-ikke-koere', 'fejl', '?brands=xyz', String(e.message).split('\n')[0]); }
    await context.close();
  } finally {
    await Promise.race([browser.close().catch(() => {}), new Promise(r => setTimeout(r, 8000))]);
    server.close();
  }
  if (skrivninger.length) tilfoej(G, 'supabase-skrivning-forsoegt', 'fejl', '*', `${skrivninger.length} ikke-GET-kald mod Supabase blev AFVIST: ${[...new Set(skrivninger.map(s => s.metode + ' ' + s.sti))].slice(0, 5).join(', ')}`);
  return { skrivninger: skrivninger.length };
}

module.exports = { koerV5, tjekAndetMaerke, tjekFlereHydrering, tjekHurtigsoegPiller, tjekUkendtMaerkeH1, zeroRaekke, installerRute };
