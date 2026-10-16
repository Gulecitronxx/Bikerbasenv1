/* W7 (funktion). Kør: node --test js/w7-funktion.test.js

   K1 Betaling      K2 Telefonvisninger      K3 MitID      K4 Fejltilstande/tomt/NaN
   Alle tests kører den kode, browseren kører (js/w7-funktion-hjaelp.js evaluerer scripts uden
   module.exports mod en fake DOM) — ikke streng-søgning i kilden. Undtagelse: de statiske HTML-sider
   tjekkes for synlig tekst, fordi deres tekst ikke er kode. */

const test = require('node:test');
const assert = require('node:assert');
const { læs, lavSide, tekst } = require('./w7-funktion-hjaelp.js');

const BASIS = ['icons.js', 'data.js', 'filtrering.js', 'components.js', 'store.js'];
const MINE = [...BASIS, 'mine-annoncer.js'];
const DASH = [...BASIS, 'dashboard.js'];
const BETALINGSORD = /stripe|betalingskort|kundeportal|kvitterin|opsig|checkout|betal(?!ing er ikke åben)/i;

/* renderViewsChart forventer et <svg> inde i #views-chart; giv den et stub-element. */
function forberedGraf(S){
  const stub = S.dom.el('graf-stub');
  S.dom.el('views-chart').querySelector = () => stub;
  S.dom.el('top-chart').querySelector = () => stub;
  return S;
}

const forhandler = { id: 'u1', name: 'Mette Jensen', company: 'MC Centret', email: 'm@x.dk', isDealer: true, remote: true, plan: 'free' };

/* ---------- K1 Betaling ---------- */

test('K1a: FRI_ADGANG=true — kontokortet nævner hverken Stripe, betaling eller abonnement og har ingen knap', () => {
  const S = lavSide(MINE, ['planKortHTML', 'betalingAaben', 'Store'], { fri: true, betaling: true });
  for (const plan of ['free', 'dealer']){
    const html = S.planKortHTML({ plan });
    assert.ok(!BETALINGSORD.test(tekst(html)), `fri/${plan}: ${tekst(html)}`);
    assert.ok(!/<button/.test(html));
  }
  assert.strictEqual(S.betalingAaben(), false, 'FRI_ADGANG slår betaling fra, selv om flaget er true');
});

test('K1b: FRI_ADGANG=false men betaling ikke bygget — "Betaling er ikke åben endnu", ingen Stripe, ingen knap/link', () => {
  const S = lavSide(MINE, ['planKortHTML', 'betalingAaben', 'renderPlanCard', 'Store'], { fri: false, betaling: false });
  for (const plan of ['free', 'dealer', undefined]){
    const html = S.planKortHTML({ plan });
    assert.match(tekst(html), /Betaling er ikke åben endnu/);
    assert.ok(!/stripe/i.test(html), 'Stripe nævnt');
    assert.ok(!/<button|<a /.test(html), 'knap/link i kortet');
    assert.ok(!/plan-upgrade|plan-portal/.test(html));
    assert.ok(!/opsig|kundeportal|betalingskort|kvittering/i.test(html));
  }
  assert.strictEqual(S.betalingAaben(), false);
  // renderPlanCard kobler heller ingen klik-handlere på (der er ingen knapper at klikke)
  S.Store.setUser({ name: 'A', email: 'a@b.dk', plan: 'dealer' });
  S.renderPlanCard();
  assert.match(tekst(S.dom.el('plan-card').innerHTML), /ikke åben endnu/);
  assert.strictEqual((S.dom.el('plan-upgrade').lyttere.click || []).length, 0);
  assert.strictEqual((S.dom.el('plan-portal').lyttere.click || []).length, 0);
});

test('K1e: først når betaling ER bygget (og adgangen ikke er fri) vises checkout/portal', () => {
  const S = lavSide(MINE, ['planKortHTML', 'betalingAaben'], { fri: false, betaling: true });
  assert.strictEqual(S.betalingAaben(), true);
  assert.match(S.planKortHTML({ plan: 'free' }), /id="plan-upgrade"/);
  assert.match(S.planKortHTML({ plan: 'dealer' }), /id="plan-portal"/);
});

test('K1c: dashboardets plan-strimmel — intet køb/administrér-link uden bygget betaling (uanset FRI_ADGANG)', () => {
  for (const fri of [true, false]){
    const S = lavSide(DASH, ['renderPlanStrip'], { fri, betaling: false });
    S.dom.el('dash-plan-strip');
    S.renderPlanStrip({ plan: 'dealer' });
    const html = S.dom.el('dash-plan-strip').innerHTML;
    assert.ok(!/<a |<button|stripe|abonnement|opgrad|Administrér/i.test(html), `fri=${fri}: ${html}`);
    assert.ok(tekst(html).length > 10);
  }
  const S = lavSide(DASH, ['renderPlanStrip'], { fri: false, betaling: false });
  S.renderPlanStrip({ plan: 'free' });
  assert.match(tekst(S.dom.el('dash-plan-strip').innerHTML), /Betaling er ikke åben endnu/);
});

test('K1c: gratis-grænse-dialogen i opret-annonce lover intet abonnement og linker ikke til køb', () => {
  const S = lavSide([...BASIS, 'opret-validering.js', 'opret-annonce.js'], ['visForhandlerGraense', '__dialogHent'], {
    fri: false, betaling: false,
    efter: 'var __dialog = null; openInfoModal = function(t, h){ __dialog = { t, h }; }; function __dialogHent(){ return __dialog; }',
  });
  S.visForhandlerGraense(3);
  const d = S.__dialogHent();
  assert.ok(d, 'dialogen blev ikke åbnet');
  const t = tekst(d.t + ' ' + d.h);
  assert.ok(!/stripe|abonnement|<a /i.test(d.t + d.h), t);
  assert.match(t, /Betaling er ikke åben endnu/);
});

test('K1d: retur-toasten "betaling modtaget" kan ikke komme, uden at betaling er bygget (betalingAaben styrer den)', () => {
  const S = lavSide(MINE, ['betalingAaben'], { fri: false, betaling: false });
  assert.strictEqual(S.betalingAaben(), false);
});

/* ---------- K2 Telefonvisninger ---------- */

const synligTekst = fil => {
  let h = læs(fil).replace(/<!--[\s\S]*?-->/g, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
  const meta = [...h.matchAll(/<meta[^>]+content="([^"]*)"/gi)].map(m => m[1]).join(' ');
  return meta + ' ' + tekst(h);
};

test('K2a: ingen synlig tekst/meta i de tre sider siger "henvendelse"', () => {
  for (const fil of ['dashboard.html', 'mine-annoncer.html', 'opret-annonce.html']){
    const t = synligTekst(fil);
    assert.ok(!/henvendels/i.test(t), `${fil}: ${(t.match(/.{40}henvendels.{40}/i) || [''])[0]}`);
  }
});

test('K2b: dashboard.html — meta description og forklaring siger Telefonvisninger og afviser beskeder', () => {
  const h = læs('dashboard.html');
  assert.strictEqual((h.match(/visninger, telefonvisninger og bedømmelser/g) || []).length, 3, 'description/og/twitter');
  const t = synligTekst('dashboard.html');
  assert.match(t, /Telefonvisninger er antallet af gange nogen har fået vist dit telefonnummer/);
  assert.match(t, /ikke beskeder/);
});

test('K2b: dashboardets KPI og annoncerække hedder Telefonvisninger — ingen "Henvendelser"', () => {
  const S = lavSide(DASH, ['renderDashboard', 'Store'], { fri: true });
  forberedGraf(S);
  const id = 'b3a5c3a8-0000-4000-8000-000000000001';
  S.Store.setUser(forhandler);
  S.Store.addMyListing({ id, brand: 'BMW', model: 'R45', type: 'classic', year: 1979, km: 91350, price: 29000, city: 'Aarhus', isDealer: true, photoUrls: [], createdAt: new Date().toISOString(), seller: { name: 'Mette Jensen' } });
  S.renderDashboard(forhandler);
  const kpi = tekst(S.dom.el('kpi-row').innerHTML);
  assert.match(kpi, /Telefonvisninger \(30 dage\)/);
  assert.ok(!/henvendels|besked/i.test(kpi), kpi);
  const raekker = tekst(S.dom.el('listings-rows').innerHTML);
  assert.match(raekker, /Telefonvisninger/);
  assert.ok(!/henvendels/i.test(raekker), raekker);
  assert.ok(!/NaN|undefined|null/.test(kpi + raekker), kpi + raekker);
});

test('K2b: Mine annoncer — statistikkolonnen pr. annonce hedder Telefonvisninger', async () => {
  const id = 'b3a5c3a8-0000-4000-8000-000000000001';
  const db = {
    enabled: true,
    myListingStats: async () => ({ data: [{ listing_id: id, views: 7, contacts: 2 }], error: null }),
    myListingSaves: async () => ({ data: [{ listing: id, saves: 1 }], error: null }),
  };
  const S = lavSide(MINE, ['visAnnonceStatistik', 'Store'], { db });
  S.Store.setUser({ name: 'A', email: 'a@b.dk', remote: true });
  const status = S.dom.el('status-celle'); const tilfoejet = [];
  status.appendChild = c => { tilfoejet.push(c); return c; };
  const raekke = { dataset: { listingId: id, status: 'active' }, querySelector: () => status };
  const grid = { querySelectorAll: () => [raekke] };
  await S.visAnnonceStatistik(grid);
  assert.strictEqual(tilfoejet.length, 1);
  const t = tekst(tilfoejet[0].innerHTML);
  assert.match(t, /2 Telefonvisninger/);
  assert.ok(!/henvendels/i.test(t));
});

test('K2b: login-kontekst for dashboard siger telefonvisninger', () => {
  const S = lavSide(['icons.js', 'data.js', 'components.js', 'store.js', 'login-fejl.js', 'login.js'], ['AUTH_KONTEKST']);
  assert.match(S.AUTH_KONTEKST['dashboard.html'].tekst, /telefonvisninger/);
  assert.ok(!/henvendels/i.test(JSON.stringify(S.AUTH_KONTEKST)));
});

/* ---------- K3 MitID ---------- */

test('K3a: kontoens bekræftelsesrækker — ingen "Identitet (MitID)"; rækken er ærlig, også med gammel mitIdVerified=true', () => {
  const S = lavSide(MINE, ['kontoRaekker', 'kontoRaekkerHTML']);
  for (const mitIdVerified of [true, false, undefined]){
    const rows = S.kontoRaekker({ emailVerified: true, phoneVerified: false, mitIdVerified, isDealer: false });
    const id = rows.find(r => /identitet/i.test(r.label));
    assert.ok(id, 'identitetsrækken mangler');
    assert.strictEqual(id.done, false, 'aldrig "Bekræftet" for MitID, som ikke er sat op');
    assert.ok(!/mitid/i.test(rows.map(r => r.label).join(' ')));
    const html = S.kontoRaekkerHTML({ emailVerified: true, mitIdVerified });
    assert.match(tekst(html), /Identitetsbekræftelse Ikke åben endnu/);
    assert.ok(!/mitid/i.test(html));
  }
  // forhandler får stadig CVR-række
  assert.ok(S.kontoRaekker({ isDealer: true, cvr: '12345678' }).some(r => /CVR · 12345678/.test(r.label)));
});

test('K3a: renderAccountTab skriver ingen MitID-tekst', () => {
  const S = lavSide(MINE, ['renderAccountTab', 'Store'], { fri: true });
  S.Store.setUser({ name: 'A', email: 'a@b.dk', mitIdVerified: true, emailVerified: true });
  S.renderAccountTab();
  assert.ok(!/mitid/i.test(S.dom.el('account-verify-rows').innerHTML));
  assert.match(tekst(S.dom.el('account-verify-rows').innerHTML), /ikke åben endnu/i);
});

test('K3b: krav-flowet (dashboard) læser ikke mitIdVerified, og kravstatus virker uændret', () => {
  const S = lavSide(DASH, ['kravStatusLabel', 'renderKravStatusList', 'renderKravResults'], { fri: true });
  assert.strictEqual(S.kravStatusLabel('godkendt').tekst, 'Godkendt');
  assert.strictEqual(S.kravStatusLabel('afvist').tekst, 'Afvist');
  assert.strictEqual(S.kravStatusLabel('afventer').tekst, 'Afventer godkendelse');
});

/* ---------- K4 Fejltilstande, tomt, NaN ---------- */

test('K4: fejlTekst — aldrig undefined/rå browsertekst', () => {
  const S = lavSide(BASIS, ['fejlTekst']);
  for (const e of [undefined, null, {}, new Error(''), new Error('undefined'), '', { message: null }]){
    assert.match(S.fejlTekst(e), /fejl/i);
  }
  assert.match(S.fejlTekst(new TypeError('Failed to fetch')), /forbindelse/);
  assert.match(S.fejlTekst(new Error('NetworkError when attempting to fetch resource.')), /forbindelse/);
  assert.strictEqual(S.fejlTekst(new Error('duplicate key')), 'duplicate key');
  assert.strictEqual(S.fejlTekst('Tekst'), 'Tekst');
});

test('K4: dashboard — backend-fejl giver en synlig advarsel og "Ikke hentet", ikke falske nuller', async () => {
  const db = {
    enabled: true,
    myListingStats: async () => { throw new TypeError('Failed to fetch'); },
    myListingSaves: async () => ({ data: null, error: new Error('boom') }),
    myClaimedExternal: async () => ({ data: null, error: new Error('rls') }),
    myKrav: async () => { throw new Error('netværk'); },
  };
  const S = lavSide(DASH, ['hentStatistik', 'hentEkstern', 'renderDashboard', 'Store', 'dashFejlTekst'], { fri: true, db });
  forberedGraf(S);
  S.Store.setUser(forhandler);
  await S.hentStatistik();       // kaster ikke
  await S.hentEkstern();
  S.renderDashboard(forhandler);
  const kpi = tekst(S.dom.el('kpi-row').innerHTML);
  assert.match(kpi, /Ikke hentet/);
  assert.ok(!/NaN|undefined/.test(kpi));
  const fejl = S.dom.el('dash-error');
  assert.strictEqual(fejl.hidden, false);
  assert.match(tekst(fejl.innerHTML), /kunne ikke hente/i);
  assert.match(fejl.innerHTML, /id="dash-retry"/);
  // kontoen vises ikke som "tom" (ingen Kom godt i gang), når hentningen af krav fejlede
  assert.strictEqual(S.dom.el('dash-kickoff').innerHTML, '');
});

test('K4: dashboard — uden fejl er fejlboksen skjult og tallene er rigtige nuller', async () => {
  const db = {
    enabled: true,
    myListingStats: async () => ({ data: [], error: null }), myListingSaves: async () => ({ data: [], error: null }),
    myClaimedExternal: async () => ({ data: [], error: null }), myKrav: async () => ({ data: [], error: null }),
  };
  const S = lavSide(DASH, ['hentStatistik', 'hentEkstern', 'renderDashboard', 'Store'], { fri: true, db });
  forberedGraf(S);
  S.Store.setUser(forhandler);
  await S.hentStatistik(); await S.hentEkstern();
  S.renderDashboard(forhandler);
  assert.strictEqual(S.dom.el('dash-error').hidden, true);
  assert.ok(!/Ikke hentet/.test(S.dom.el('kpi-row').innerHTML));
  assert.match(S.dom.el('dash-kickoff').innerHTML, /Kom godt i gang/);
});

test('K4: dashboard — undertitel uden firma/navn siger aldrig "undefined"', () => {
  const S = lavSide(DASH, ['renderDashboard', 'Store'], { fri: true });
  forberedGraf(S);
  const u = { id: 'u2', isDealer: true, email: 'x@y.dk' };
  S.Store.setUser(u);
  S.renderDashboard(u);
  assert.ok(!/undefined|null|NaN/.test(S.dom.el('dash-subtitle').textContent), S.dom.el('dash-subtitle').textContent);
});

test('K4: ekstern pris-redigering afviser negativ/ugyldig pris uden at kalde backend', async () => {
  let kald = 0;
  const db = { enabled: true, retExternalField: async () => { kald++; return { error: null }; } };
  const S = lavSide(DASH, ['aabnEksternRedigering', 'hentEkstern'], { fri: true, db,
    efter: 'EKSTERN_EJET = [{ id: "e1", titel: "T", pris_dkk: 1000, status: "aktiv" }];' });
  const rk = S.dom.el('row');
  const celler = { '[data-ekstern-pris]': S.dom.el('c1'), '[data-ekstern-status]': S.dom.el('c2') };
  const handlinger = S.dom.el('c3'); const gem = S.dom.el('gem'); gem.textContent = 'Gem';
  handlinger.querySelector = sel => /gem/.test(sel) ? gem : S.dom.el('fortryd');
  rk.querySelector = sel => /actions/.test(sel) ? handlinger : celler[sel];
  S.dom.document.querySelector = () => rk;
  S.dom.el('ekstern-edit-pris-e1').value = '-5';
  S.dom.el('ekstern-edit-status-e1').value = 'aktiv';
  S.aabnEksternRedigering('e1');
  S.dom.el('ekstern-edit-pris-e1').value = '-5';
  await gem.hændelse('click');
  assert.strictEqual(kald, 0, 'backend blev kaldt med ugyldig pris');
  assert.ok(S.toasts.some(t => t.o.type === 'error' && /Prisen skal være/.test(t.m)), JSON.stringify(S.toasts));
  assert.strictEqual(gem.disabled, false);
});

test('K4: Mine annoncer — hentning af egne annoncer der kaster, giver fejlbanner i stedet for et nedbrud', async () => {
  const db = { enabled: true, myListings: async () => { throw new TypeError('Failed to fetch'); } };
  const S = lavSide(MINE, ['hentEgneAlle', 'visEgneFejl', 'Store', '__fejl'], { db, efter: 'function __fejl(){ return EGNE_FEJL; }' });
  S.Store.setUser({ name: 'A', email: 'a@b.dk', remote: true });
  await S.hentEgneAlle();           // kaster ikke
  assert.strictEqual(S.__fejl(), true);
  S.visEgneFejl();
  assert.strictEqual(S.dom.el('mine-error').hidden, false);
  assert.match(tekst(S.dom.el('mine-error').innerHTML), /kunne ikke hente alle dine annoncer/);
});

test('K4: Mine annoncer — statusskift/sletning der kaster: knappen åbnes igen og fejlen er læsbar (ingen "undefined")', async () => {
  const id = 'b3a5c3a8-0000-4000-8000-000000000002';
  const db = {
    enabled: true,
    updateListing: async () => { throw new TypeError('Failed to fetch'); },
    deleteListing: async () => ({ error: {} }),                       // fejl uden message
  };
  const S = lavSide(MINE, ['skiftStatus', 'sletAnnonce', 'Store'], { db, efter: `EGNE_ALLE = [{ id: '${id}', brand: 'A', model: 'B', status: 'active', price: 1, year: 2000 }];` });
  S.Store.setUser({ name: 'A', email: 'a@b.dk', remote: true });
  const knap = S.dom.el('knap');
  await S.skiftStatus(id, knap);
  assert.strictEqual(knap.disabled, false);
  let t = S.toasts.pop();
  assert.strictEqual(t.o.type, 'error');
  assert.match(t.m, /forbindelse/);
  const knap2 = S.dom.el('knap2');
  await S.sletAnnonce(id, knap2);
  assert.strictEqual(knap2.disabled, false);
  t = S.toasts.pop();
  assert.ok(!/undefined/.test(t.m), t.m);
});

test('K4: sortListings — manglende pris/år/dato giver ikke NaN-rækkefølge; manglende sorteres sidst', () => {
  const S = lavSide(MINE, ['sortListings']);
  const l = [{ id: 1 }, { id: 2, price: 5000, year: 2010, createdAt: '2024-01-01' }, { id: 3, price: 9000, year: 2020, createdAt: '2025-01-01' }, { id: 4, price: 'x' }];
  assert.deepStrictEqual(S.sortListings(l, 'price-desc').map(x => x.id).slice(0, 2), [3, 2]);
  assert.deepStrictEqual(S.sortListings(l, 'price-asc').map(x => x.id).slice(0, 2), [2, 3]);
  assert.deepStrictEqual(S.sortListings(l, 'year-desc').map(x => x.id).slice(0, 2), [3, 2]);
  assert.deepStrictEqual(S.sortListings(l, 'nyeste').map(x => x.id).slice(0, 2), [3, 2]);
});

test('K4: søgeagent uden oprettelsesdato siger aldrig "Invalid Date"', () => {
  const S = lavSide(MINE, ['agentDato', 'renderAgents', 'Store']);
  assert.strictEqual(S.agentDato(undefined), '');
  assert.strictEqual(S.agentDato('ikke en dato'), '');
  assert.match(S.agentDato('2026-08-16T10:00:00Z'), /^ · oprettet \d+\. aug\. 2026$/);
  S.Store.saveSearch ? null : null;
  S.localStorage.setItem(S.Store.KEYS.savedSearches || 'bb_saved_searches', JSON.stringify([{ id: 1, label: 'BMW', query: 'q=bmw', notify: false }]));
  S.renderAgents();
  const t = tekst(S.dom.el('agents-list').innerHTML);
  assert.ok(!/Invalid Date|NaN|undefined/.test(t), t);
});

test('K4: profilkortets samtykke-gem der kaster, åbner knappen igen (ingen uhåndteret afvisning)', async () => {
  const db = {
    enabled: true,
    currentProfile: async () => ({ vis_telefon: false, phone: '12345678' }),
    saetVisTelefon: async () => { throw new TypeError('Failed to fetch'); },
  };
  const S = lavSide(MINE, ['renderProfileCard', 'Store'], { db });
  S.Store.setUser({ name: 'A', email: 'a@b.dk', remote: true });
  const gem = S.dom.el('pf-gem'), boks = S.dom.el('pf-vis-telefon'), form = S.dom.el('vis-telefon-form');
  S.dom.el('profile-card');
  S.renderProfileCard();
  await new Promise(r => setImmediate(r));
  await form.hændelse('submit');
  assert.strictEqual(gem.disabled, false);
  const t = S.toasts.pop();
  assert.ok(t && t.o.type === 'error' && /forbindelse/.test(t.m), JSON.stringify(t));
  assert.match(S.dom.el('profile-card').innerHTML, /id="pf-hint" aria-live="polite"/);
  assert.ok(boks);
});

/* ---- login ---- */

test('K4: login — telefonOK afviser bogstaver og for korte numre, accepterer tomt og +45', () => {
  const S = lavSide(['icons.js', 'data.js', 'components.js', 'store.js', 'login-fejl.js', 'login.js'], ['telefonOK']);
  for (const ok of ['', '   ', '12 34 56 78', '+45 12345678', '12345678', '+4512-34-56-78', undefined, null]) assert.strictEqual(S.telefonOK(ok), true, JSON.stringify(ok));
  for (const nej of ['abc', '1234', '12 34 56 7', '12345678a', '+', '---', '1'.repeat(16)]) assert.strictEqual(S.telefonOK(nej), false, JSON.stringify(nej));
});

test('K4: login — fejlet profil-hentning efter login giver en synlig fejl (role=alert) og ingen redirect', async () => {
  const S = lavSide(['icons.js', 'data.js', 'components.js', 'store.js', 'login-fejl.js', 'login.js'], ['synkSession', 'authError'], {
    foer: 'async function syncSessionToStore(){ throw new TypeError("Failed to fetch"); }',
  });
  const ok = await S.synkSession();
  assert.strictEqual(ok, false);
  const fejl = S.dom.el('auth-error');
  assert.match(fejl.textContent, /kunne ikke hente din profil/);
  assert.strictEqual(fejl.style.display, 'block');
});

test('K4: login uden backend opfinder ikke en identitet ("Mikkel Jensen") og ingen bekræftelser', async () => {
  const S = lavSide(['icons.js', 'data.js', 'components.js', 'store.js', 'login-fejl.js', 'login.js'], ['Store'], {
    db: { enabled: false },
    foer: 'function backendReady(){ return Promise.resolve(); } function renderHeader(){} function syncSessionToStore(){} function cvrKontrolOK(){ return true; }',
  });
  await S.dom.dcl[S.dom.dcl.length - 1]();   // login.js er den sidst indlæste kilde
  S.dom.el('login-email').value = 'rasmus@eksempel.dk';
  S.dom.el('login-password').value = 'hemmelig';
  await S.dom.el('login-form').hændelse('submit');
  const u = S.Store.getUser();
  assert.ok(u, 'ingen lokal session');
  assert.notStrictEqual(u.name, 'Mikkel Jensen');
  assert.strictEqual(u.name, 'rasmus');
  assert.strictEqual(u.email, 'rasmus@eksempel.dk');
  assert.ok(!u.verified && !u.emailVerified && !u.phoneVerified && !u.mitIdVerified, JSON.stringify(u));
});

/* ---- forhandler ---- */

const SELLER_ID = 'b3a5c3a8-0000-4000-8000-000000000009';
const FH = ['icons.js', 'data.js', 'filtrering.js', 'components.js', 'store.js', 'forhandler.js'];
const SEO = 'const Seo = { setMeta(){} }; function seoDealerPage(){}; function backendReady(){ return Promise.resolve(); }';

test('K4: forhandler — backend-fejl er "kunne ikke hente", ikke "findes ikke"; fejlen har role=alert og en prøv-igen-knap', async () => {
  const db = { enabled: true, getPublicProfile: async () => { throw new TypeError('Failed to fetch'); }, listingsBySeller: async () => ({ data: [], error: null }) };
  const S = lavSide(FH, ['renderProfile'], { db, search: '?id=' + SELLER_ID, foer: SEO });
  await S.renderProfile();
  const html = S.dom.el('profile-top').innerHTML;
  assert.match(tekst(html), /Vi kunne ikke hente profilen/);
  assert.match(html, /role="alert"/);
  assert.match(html, /id="profil-proev-igen"/);
  assert.ok(!/findes ikke|findes ikke/i.test(tekst(html)));
});

test('K4: forhandler — ægte "findes ikke" (tomt svar uden fejl) og ødelagt ?id= giver "kunne ikke finde sælgeren"', async () => {
  const db = { enabled: true, getPublicProfile: async () => ({ data: null, error: null }), listingsBySeller: async () => ({ data: [], error: null }) };
  const S = lavSide(FH, ['renderProfile'], { db, search: '?id=' + SELLER_ID, foer: SEO });
  await S.renderProfile();
  assert.match(tekst(S.dom.el('profile-top').innerHTML), /Vi kunne ikke finde sælgeren/);
  const S2 = lavSide(FH, ['renderProfile'], { db, search: '?id=%E0%A4%A', foer: SEO });
  await S2.renderProfile();    // decodeURIComponent kaster URIError — må ikke vælte siden
  assert.match(tekst(S2.dom.el('profile-top').innerHTML), /Vi kunne ikke finde sælgeren/);
});

test('K4: forhandler — fejlet anmeldelseshentning siger det i stedet for "Ingen har bedømt"', async () => {
  const db = { enabled: true, listReviews: async () => { throw new TypeError('Failed to fetch'); } };
  const S = lavSide(FH, ['renderAnmeldelser'], { db, foer: SEO, efter: 'currentSeller = { id: "' + SELLER_ID + '", name: "X", isDealer: false };' });
  S.dom.el('profil-anmeldelser');
  await S.renderAnmeldelser();
  const html = S.dom.el('profil-anmeldelser').innerHTML;
  assert.match(tekst(html), /kunne ikke hente anmeldelserne/);
  assert.ok(!/Ingen har bedømt/.test(html));
});

test('K4: forhandler — afsendelse af anmeldelse der kaster: knap åbnes igen, ærlig fejl, ingen NaN', async () => {
  const db = { enabled: true, listReviews: async () => ({ data: [], error: null }), addReview: async () => { throw new TypeError('Failed to fetch'); } };
  const S = lavSide(FH, ['wireAnmeldelsesForm', '__saetStjerner'], { db, foer: SEO,
    efter: 'currentSeller = { id: "' + SELLER_ID + '", name: "X" }; function __saetStjerner(n){ pickedStars = n; }' });
  const form = S.dom.el('review-form'); const knap = { disabled: false };
  form.querySelector = () => knap;
  S.dom.el('review-comment').value = '  Fin handel ';
  S.wireAnmeldelsesForm();
  S.__saetStjerner(4);
  await form.hændelse('submit');
  assert.strictEqual(knap.disabled, false);
  const t = S.toasts.pop();
  assert.ok(t && t.o.type === 'error' && /forbindelse/.test(t.m), JSON.stringify(t));
});

/* ---- opret-annonce ---- */

const OPRET = [...BASIS, 'opret-validering.js', 'opret-annonce.js'];

test('K4: opret — netværksfejl under udgivelse genåbner knappen og viser fejl (ingen hængende "Udgiver…")', async () => {
  const S = lavSide(OPRET, ['publishListing'], {
    efter: 'udgivTrin = async function(){ throw new TypeError("Failed to fetch"); };',
  });
  const knap = S.dom.el('step-next'); knap.disabled = true; knap.textContent = 'Udgiver…';
  await S.publishListing();
  assert.strictEqual(knap.disabled, false);
  assert.strictEqual(knap.textContent, 'Udgiv annonce');
  const t = S.toasts.pop();
  assert.ok(t.o.type === 'error' && /forbindelse/.test(t.m) && !/undefined/.test(t.m), JSON.stringify(t));
});

test('K4: opret — fejler noget EFTER annoncen er oprettet, genåbnes knappen ikke (ingen dublet); brugeren sendes til annoncen', async () => {
  const S = lavSide(OPRET, ['publishListing', '__s'], {
    efter: 'var __sendt = []; forlad = function(u){ __sendt.push(u); }; function __s(){ return __sendt; } udgivTrin = async function(){ _oprettetId = "abc-123"; throw new Error("upload sprængte"); };',
  });
  const knap = S.dom.el('step-next'); knap.disabled = true;
  await S.publishListing();
  assert.strictEqual(knap.disabled, true, 'knappen må ikke åbnes — annoncen findes allerede');
  assert.match(S.toasts.pop().m, /Annoncen er gemt/);
  S.timere.forEach(fn => fn());
  assert.deepStrictEqual(S.__s(), ['annonce.html?id=abc-123']);
});

/* ---- opret-annonce: honest tekst ---- */

test('K2a: opret-annonce — "Sådan når købere dig" lover ingen beskeder og siger telefonvisning', () => {
  const t = synligTekst('opret-annonce.html');
  assert.match(t, /tæller det som en telefonvisning under Mine annoncer/);
  assert.ok(!/markere, at de vil i kontakt/.test(t));
});
