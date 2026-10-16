'use strict';
/* Ærlighedsinvarianter for de håndskrevne tekstsider (acceptkriterier i
   docs/review/gauntlet/builder-w6-tekst.md). Kun indholdsdelen (<main>) læses. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const SIDER = ['privatlivspolitik', 'vilkaar', 'om-bikerbasen', 'om-indeksering', 'sikkerhed'];
function indhold(navn) {
  const h = fs.readFileSync(path.join(__dirname, '..', navn + '.html'), 'utf8');
  const m = h.match(/<main[\s\S]*?<\/main>/);
  assert.ok(m, navn + ' mangler <main>');
  return m[0].replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
}
const TEKST = Object.fromEntries(SIDER.map((s) => [s, indhold(s)]));

test('ingen løfter om betaling, beskedlevering eller "helt nyt"', () => {
  const forbudt = [
    /skriv via bikerbasen/i, /send (en )?besked/i, /skriv til s[æe]lger(en)? her/i,
    /helt nyt/i, /f[øo]rste (af sin art|i danmark)/i,
    /verificeret (s[æe]lger|forhandler) (badge|-?m[æe]rkat)? ?(f[åa]s|kan du)/i,
  ];
  for (const [side, t] of Object.entries(TEKST)) {
    for (const re of forbudt) assert.ok(!re.test(t), `${side}: matcher ${re}`);
  }
});

test('"sikker betaling" og escrow nævnes kun som noget, der IKKE findes', () => {
  for (const [side, t] of Object.entries(TEKST)) {
    for (const m of t.matchAll(/sikker betaling|escrow/gi)) {
      const ctx = t.slice(Math.max(0, m.index - 140), m.index + 160).toLowerCase();
      assert.match(ctx, /intet|ingen|findes ikke|ikke |advarsel/, `${side}: "${m[0]}" uden negation`);
    }
  }
});

test('privatlivssiden: localStorage, Supabase, kontaktvej, GA-samtykke, rettigheder, opt-out, claim', () => {
  const t = TEKST.privatlivspolitik;
  for (const ord of ['localStorage', 'sessionStorage', 'Supabase', 'kontakt@bikerbasen.dk', 'Datatilsynet',
    'Google Analytics', 'samtykke', 'databehandler', 'Dataansvarlig', 'bb_cookie_consent', 'indeksering']) {
    assert.ok(t.toLowerCase().includes(ord.toLowerCase()), 'mangler: ' + ord);
  }
  assert.match(t, /verificeret ejerskab/i);
  assert.match(t, /ret til at (få indsigt|slette)|indsigt i, rette/i);
  const html = fs.readFileSync(path.join(__dirname, '..', 'privatlivspolitik.html'), 'utf8');
  assert.match(html, /href="mailto:kontakt@bikerbasen\.dk"/);
  assert.match(html, /href="om-indeksering\.html"/);
});

test('privatlivssidens localStorage-liste dækker alle nøgler i js/store.js', () => {
  const store = fs.readFileSync(path.join(__dirname, '..', 'js', 'store.js'), 'utf8');
  const blok = store.match(/KEYS:\s*\{([\s\S]*?)\}/)[1];
  const nøgler = [...blok.matchAll(/'(bb_[a-z_]+)'/g)].map((m) => m[1]);
  assert.ok(nøgler.length >= 10);
  for (const n of nøgler) assert.ok(TEKST.privatlivspolitik.includes(n), 'privatlivspolitik mangler ' + n);
});

test('claim kræver verificeret ejerskab og manuel godkendelse (vilkår)', () => {
  assert.match(TEKST.vilkaar, /verificeret ejerskab/i);
  assert.match(TEKST.vilkaar, /manuelt/i);
});

test('indeksering: kontaktvej og opt-out beskrevet', () => {
  const t = TEKST['om-indeksering'];
  assert.match(t, /kontakt@bikerbasen\.dk/);
  assert.match(t, /robots\.txt/);
  assert.match(t, /holde op|stopper/);
});

test('ingen opdigtede virksomhedsoplysninger (CVR/adresse) på tekstsiderne', () => {
  for (const [side, t] of Object.entries(TEKST)) {
    assert.ok(!/CVR[- ]?(nr\.?|nummer)?:? ?\d{8}/i.test(t), side + ': hardcodet CVR');
    const mails = t.match(/[\w.+-]+@[\w-]+\.[a-z.]+/gi) || [];
    for (const m of mails) assert.strictEqual(m.toLowerCase(), 'kontakt@bikerbasen.dk', side + ': ukendt mail ' + m);
  }
});

/* ============ w7: invarianter mod kildekode-fakta ============ */
const ROD = path.join(__dirname, '..');
const kilde = (f) => fs.readFileSync(path.join(ROD, f), 'utf8');
const jsFiler = () => fs.readdirSync(path.join(ROD, 'js')).filter((f) => f.endsWith('.js') && !f.endsWith('.test.js'));

test('hvert tredjeparts-domæne i privatlivssidens CSP er nævnt i teksten (eller dækket af sin leverandør)', () => {
  const html = kilde('privatlivspolitik.html');
  const csp = html.match(/Content-Security-Policy" content="([^"]+)"/)[1];
  const vaerter = new Set([...csp.matchAll(/https:\/\/([a-z0-9*.-]+)/gi)].map((m) => m[1].replace(/^\*\./, '')));
  const t = TEKST.privatlivspolitik.toLowerCase();
  // domæner, der har et leverandørnavn i teksten; alle andre skal stå ordret
  const leverandoer = { 'supabase.co': 'supabase', 'googletagmanager.com': 'google analytics', 'google-analytics.com': 'google analytics', 'analytics.google.com': 'google analytics' };
  assert.ok(vaerter.size >= 5);
  for (const v of vaerter) {
    const nøgle = Object.keys(leverandoer).find((k) => v === k || v.endsWith('.' + k));
    if (nøgle) assert.ok(t.includes(leverandoer[nøgle]), `${v}: leverandør "${leverandoer[nøgle]}" ikke nævnt`);
    else assert.ok(t.includes(v.toLowerCase()), `CSP-domænet ${v} er ikke nævnt på privatlivssiden`);
  }
});

test('alle sessionStorage-/localStorage-nøgler i js/ er nævnt på privatlivssiden', () => {
  const t = TEKST.privatlivspolitik;
  const nøgler = new Set();
  for (const f of jsFiler()) for (const m of kilde('js/' + f).matchAll(/['"`](bb_[a-z_]+)/g)) nøgler.add(m[1].replace(/_$/, ''));
  assert.ok(nøgler.has('bb_srp_position') && nøgler.has('bb_set'), 'sessionStorage-nøgler fundet i koden');
  for (const n of nøgler) assert.ok(t.includes(n), 'privatlivssiden mangler nøglen ' + n);
  assert.match(kilde('js/backend-bridge.js'), /sb-\$\{[^}]+\}-auth-token/);
  assert.match(t, /sb-…-auth-token/);
});

test('IP-hash-tælling: hvis koden hasher IP, beskriver siden det (hash, IP, dato, sletning) og lover ikke mere end koden', () => {
  const ts = kilde('supabase/functions/haendelse/index.ts');
  const sql = kilde('supabase/022_anonym_skrivegulv.sql');
  assert.match(ts, /crypto\.subtle\.digest\('SHA-256'/);
  assert.match(sql, /delete from public\.skrive_taeller where dag < current_date - 1/);
  const t = TEKST.privatlivspolitik;
  assert.match(t, /IP-adresse/);
  assert.match(t, /hash \(SHA-256\)/);
  assert.match(t, /dagens dato/);
  assert.match(t, /slettes automatisk/);
  assert.match(t, /før i går/); // current_date - 1: rækker ældre end i går
  assert.match(t, /ikke selve IP-adressen/); // koden gemmer ikke rå IP
  assert.doesNotMatch(t, /ingen (oplysninger|data) om dig/i);
});

test('søgeord: sender js/maaling.js search_term, nævner siden det og at det kræver samtykke', () => {
  assert.match(kilde('js/maaling.js'), /search_term:\s*klip\(state\.q, 80\)/);
  const t = TEKST.privatlivspolitik;
  assert.match(t, /search_term/);
  assert.match(t, /søgeord/);
  assert.match(t, /80 tegn/);
});

test('samtykke: tilbagekald beskrives som det er (ingen indstillingsknap, nulstilling findes i koden)', () => {
  const t = TEKST.privatlivspolitik;
  assert.ok(!/(skift|ændr)\s+(dit )?valg\s+(i|under)\s+(cookie)?indstillinger/i.test(t));
  assert.ok(!kilde('js/components.js').match(/cookie-indstillinger|cookie-settings/i), 'siden tilbyder pludselig cookieindstillinger — opdatér teksten');
  assert.match(t, /ingen indstillingsknap/);
  // "Ryd mine data" nulstiller cookievalget, fordi nøglen er i Store.KEYS, som deleteAllData rydder
  assert.match(kilde('js/store.js'), /cookieConsent: 'bb_cookie_consent'/);
  assert.match(kilde('js/store.js'), /deleteAllData\(\)\{\s*Object\.values\(this\.KEYS\)/);
  assert.match(t, /nulstiller også dit cookievalg/);
  assert.match(t, /Målecookies, Google allerede har sat/);
});

test('region og leverandør-lande: intet land uden kilde, OPSAETNING.md og siden siger det samme', () => {
  const t = TEKST.privatlivspolitik;
  const ops = kilde('supabase/OPSAETNING.md');
  assert.match(ops, /eu-west-1/);
  assert.doesNotMatch(ops, /Frankfurt/);
  assert.doesNotMatch(t, /Frankfurt|Tyskland/);
  if (/Irland/.test(t)) assert.match(ops, /Ireland/); // landet på siden skal stå i opsætningsguiden
  // overførselsgrundlag kan ikke belægges i repoet
  assert.doesNotMatch(t, /Data Privacy Framework|standardkontraktbestemmelser/i);
});

test('Resend: bruger koden Resend, står det på siden, og er det ikke kaldt "ikke i brug"', () => {
  assert.match(kilde('supabase/functions/notify-saved-searches/index.ts'), /api\.resend\.com/);
  assert.match(kilde('supabase/013_soegeagenter.sql'), /unsubscribe_saved_search/);
  const t = TEKST.privatlivspolitik;
  assert.match(t, /Resend/);
  assert.match(t, /afmeldingslink/);
  for (const m of t.matchAll(/ikke i brug/gi)) {
    const saetning = t.slice(0, m.index + 20).split(/[.:] /).pop() + t.slice(m.index, m.index + 60).split(/. /)[0];
    assert.doesNotMatch(saetning, /Resend|søgeagent|mail/i, '"ikke i brug" om Resend/søgeagenter');
  }
  assert.match(kilde('afmeld.html'), /unsubscribe_saved_search/);
});

test('kilde-billeder: hver billedhost i CSP-img-src nævnes som kilde, og hotlinking forklares', () => {
  const csp = kilde('privatlivspolitik.html').match(/img-src ([^;]+);/)[1];
  const t = TEKST.privatlivspolitik;
  for (const m of csp.matchAll(/https:\/\/((?:images|assets)\.[a-z0-9.-]+)/g)) assert.ok(t.includes(m[1]), 'billedhost ikke nævnt: ' + m[1]);
  assert.match(t, /direkte fra kildens egen billedserver/);
  assert.match(t, /kan derfor se din IP-adresse/);
});

test('ingen interne "her stod"-kommentarer i de udgivne tekstsider', () => {
  for (const s of [...SIDER, 'afmeld', '404']) {
    const h = kilde(s + '.html');
    for (const c of h.match(/<!--[\s\S]*?-->/g) || []) assert.doesNotMatch(c, /\bher stod\b/i, `${s}: intern kommentar: ${c.slice(0, 60)}`);
  }
});

test('vilkår: "konto kan spærres" ved falsk claim hænger sammen med spærringsafsnittet', () => {
  const raa = kilde('vilkaar.html');
  assert.match(TEKST.vilkaar, /uden at eje annoncen[^.]*konto kan spærres, jf\. punkt 7/);
  assert.match(raa, /<h2 id="anmeldelse">7\. Anmeldelse og fjernelse af indhold<\/h2>/);
  const afsnit7 = TEKST.vilkaar.slice(TEKST.vilkaar.indexOf('7. Anmeldelse'), TEKST.vilkaar.indexOf('8. Betaling'));
  assert.match(afsnit7, /spærre konti, der overtræder disse vilkår/);
});

test('ingen placeholders i HTML-siderne (de ligger i docs/ejer-skal-levere.md)', () => {
  for (const s of [...SIDER, 'afmeld', '404']) {
    assert.doesNotMatch(TEKST[s] || indhold(s), /\[(JURIDISK NAVN|CVR|ADRESSE|ANTAL)[^\]]*\]|TODO|XXX|lorem ipsum/i, s);
  }
  const udkast = kilde('docs/ejer-skal-levere.md');
  assert.match(udkast, /UDKAST/);
  assert.match(udkast, /\[JURIDISK NAVN\]/);
});
