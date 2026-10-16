/* Lokal mock-backend til sælger-flowene (opret annonce, mine annoncer, login, favoritter).

   INGEN forespørgsel forlader maskinen: Playwright `context.route` besvarer alle kald til *.supabase.co
   (auth, PostgREST, storage, functions) fra et lille hukommelseslager. Al data er syntetisk og ingen
   rigtige konti/nøgler bruges. Bruges af js/w9-saelger.test.js og af manuelle skærmbilledetests.

   const { lavBackend, lavPng } = require('../scripts/w9-saelger-mock');
   const bak = lavBackend({ loggetInd: true });
   await bak.installer(context);              // route + (hvis loggetInd) fiktiv session i localStorage

   bak.tilstand.tabeller.listings  — rækker (med indlejret photos + seller som PostgREST)
   bak.tilstand.log                — [{ metode, tabel, status }] over alle backend-kald
   bak.tilstand.fejl               — { 'POST listings': { status: 500, besked: '...' } }  (engangs eller fast, se `gentag`)
*/

const crypto = require('node:crypto');
const zlib = require('node:zlib');

const REF = 'hkcjrwglwurdjnobewzb';          // kun for localStorage-nøglens navn; der rettes aldrig kald dertil
const BRUGER_ID = 'aaaaaaaa-0000-4000-8000-0000000000a1';
const uuid = () => crypto.randomUUID();

/* Minimal PNG-encoder (RGB, gradient) så uploadtests har rigtige, afkodbare billeder uden filer i repoet. */
function lavPng(bredde = 640, hoejde = 480, farve = [200, 90, 40]){
  const raekker = [];
  for (let y = 0; y < hoejde; y++){
    const r = Buffer.alloc(1 + bredde * 3);
    for (let x = 0; x < bredde; x++){
      r[1 + x * 3] = Math.min(255, farve[0] + Math.floor(x / bredde * 50));
      r[2 + x * 3] = Math.min(255, farve[1] + Math.floor(y / hoejde * 80));
      r[3 + x * 3] = farve[2];
    }
    raekker.push(r);
  }
  const crcTabel = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = buf => { let c = 0xffffffff; for (const b of buf) c = crcTabel[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const klump = (type, data) => {
    const l = Buffer.alloc(4); l.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([l, td, c]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(bredde, 0); ihdr.writeUInt32BE(hoejde, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), klump('IHDR', ihdr),
    klump('IDAT', zlib.deflateSync(Buffer.concat(raekker))), klump('IEND', Buffer.alloc(0))]);
}
const PNG_LILLE = lavPng(16, 12);

function lavBackend(opts = {}){
  const bruger = { id: BRUGER_ID, aud: 'authenticated', role: 'authenticated', email: 'test.saelger@example.test',
    email_confirmed_at: '2026-01-01T00:00:00Z', app_metadata: {}, user_metadata: {}, identities: [{}], created_at: '2026-01-01T00:00:00Z' };
  const profil = { id: BRUGER_ID, name: 'Test Sælger', is_dealer: !!opts.forhandler, city: 'Odense', company: null,
    verified: false, member_since: 2026, created_at: '2026-01-01T00:00:00Z' };
  const tilstand = {
    bruger, loggetInd: !!opts.loggetInd,
    tabeller: {
      profiles: [profil], public_profiles: [profil],
      profiles_private: [{ id: BRUGER_ID, phone: null, vis_telefon: false }],
      listings: [], listing_photos: [], favorites: [], saved_searches: [], listing_stats: [], krav: [], eksterne_annoncer: [],
    },
    fejl: {}, log: [], uploads: [], slettedeFiler: [], auth: [],
    login: opts.login || null,   // (email, password) => { fejl?: {status, msg}} for login-tests
  };
  (opts.annoncer || []).forEach(a => tilstand.tabeller.listings.push(lavAnnonce(a)));

  function lavAnnonce(a){
    const id = a.id || uuid();
    return Object.assign({
      id, seller_id: BRUGER_ID, brand: 'Yamaha', model: 'MT-07', type: 'naked', year: 2021, km: 12500, ccm: 689, power: 74,
      price: 69900, condition: 'Brugt', description: 'Testannonce.', postnr: 5000, city: 'Odense', region: 'Syddanmark',
      status: 'active', created_at: new Date(Date.now() - 86400000 * (a.dageGammel || 1)).toISOString(),
      photos: [], seller: profil,
    }, a, { id });
  }
  function session(){
    const nu = Math.floor(Date.now() / 1000);
    const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
    const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: BRUGER_ID, aud: 'authenticated', role: 'authenticated', exp: nu + 3600, iat: nu })}.mock`;
    return { access_token: jwt, token_type: 'bearer', expires_in: 3600, expires_at: nu + 3600, refresh_token: 'mock-refresh', user: bruger };
  }

  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*',
    'access-control-expose-headers': 'content-range' };
  const json = (route, status, body, extra) => route.fulfill({ status, headers: { ...cors, 'content-type': 'application/json', ...(extra || {}) }, body: body === undefined ? '' : JSON.stringify(body) });

  /* Én PostgREST-filterrække: kolonne=op.værdi */
  function filtrer(raekker, params){
    let r = raekker.slice();
    for (const [k, v] of params){
      if (['select', 'order', 'limit', 'offset', 'columns', 'on_conflict'].includes(k)) continue;
      const m = /^(eq|neq|in|gte|lte|gt|lt|is)\.(.*)$/.exec(v); if (!m) continue;
      const [, op, val] = m;
      const tal = x => (x === null || x === undefined || x === '' ? NaN : Number(x));
      r = r.filter(x => {
        const c = x[k];
        if (op === 'eq') return String(c) === val;
        if (op === 'neq') return String(c) !== val;
        if (op === 'is') return val === 'null' ? c == null : String(c) === val;
        if (op === 'in') return val.replace(/^\(|\)$/g, '').split(',').map(s => s.replace(/^"|"$/g, '')).includes(String(c));
        if (op === 'gte') return String(c) >= val || tal(c) >= tal(val);
        if (op === 'lte') return String(c) <= val || tal(c) <= tal(val);
        if (op === 'gt') return String(c) > val;
        if (op === 'lt') return String(c) < val;
        return true;
      });
    }
    return r;
  }
  function sorter(r, order){
    if (!order) return r;
    const [kol, retn] = order.split('.');
    return r.slice().sort((a, b) => (a[kol] > b[kol] ? 1 : a[kol] < b[kol] ? -1 : 0) * (retn === 'desc' ? -1 : 1));
  }
  /* Forside-listings har indlejrede photos; hold listing_photos-tabellen i takt */
  const fotos = () => tilstand.tabeller.listings.flatMap(l => l.photos.map(p => ({ ...p, listing_id: l.id })));

  /* Engangs-/fast fejl: nøgle "METODE tabel". gentag: true = bliv ved. */
  function tagFejl(nogle){
    const f = tilstand.fejl[nogle]; if (!f) return null;
    if (!f.gentag) delete tilstand.fejl[nogle];
    return f;
  }

  async function rest(route, req, url){
    const tabel = decodeURIComponent(url.pathname.replace('/rest/v1/', ''));
    const metode = req.method();
    const accept = req.headers()['accept'] || '';
    const prefer = req.headers()['prefer'] || '';
    const enkelt = /vnd\.pgrst\.object/.test(accept);
    const log = status => tilstand.log.push({ metode, tabel, status });
    const f = tagFejl(`${metode} ${tabel}`);
    if (f){ log(f.status); return json(route, f.status, { message: f.besked || 'mock-fejl', code: 'MOCK' }); }

    if (tabel.startsWith('rpc/')){
      const navn = tabel.slice(4); log(200);
      if (navn === 'my_listing_saves') return json(route, 200, []);
      return json(route, 200, null);
    }
    const lager = tilstand.tabeller[tabel];
    if (!lager && tabel !== 'listing_photos'){ log(404); return json(route, 404, { message: 'ukendt tabel i mock: ' + tabel }); }
    let body = null; try { body = req.postDataJSON(); } catch (e) { body = null; }
    const svar = (status, raekker) => {
      log(status);
      if (/count=exact/.test(prefer) && req.method() === 'HEAD') return route.fulfill({ status: 200, headers: { ...cors, 'content-range': `*/${raekker.length}` }, body: '' });
      const hdr = /count=exact/.test(prefer) ? { 'content-range': `0-${Math.max(0, raekker.length - 1)}/${raekker.length}` } : {};
      if (enkelt){
        if (raekker.length !== 1) return json(route, 406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: `The result contains ${raekker.length} rows` });
        return json(route, status, raekker[0], hdr);
      }
      return json(route, status, raekker, hdr);
    };

    if (tabel === 'listing_photos'){
      const params = [...url.searchParams];
      if (metode === 'GET') return svar(200, filtrer(fotos(), params));
      if (metode === 'POST'){
        const ny = { id: uuid(), storage_path: body.storage_path, position: body.position };
        const l = tilstand.tabeller.listings.find(x => x.id === body.listing_id);
        if (!l){ log(409); return json(route, 409, { message: 'fk violation', code: '23503' }); }
        l.photos.push(ny); return svar(201, [{ ...ny, listing_id: l.id }]);
      }
      if (metode === 'DELETE'){
        const rammer = filtrer(fotos(), params);
        tilstand.tabeller.listings.forEach(l => { l.photos = l.photos.filter(p => !rammer.some(r => r.id === p.id)); });
        return svar(204, []);
      }
    }
    if (metode === 'GET' || metode === 'HEAD'){
      let r = filtrer(lager, [...url.searchParams]);
      r = sorter(r, url.searchParams.get('order'));
      const lim = Number(url.searchParams.get('limit')); if (lim) r = r.slice(0, lim);
      return svar(200, r);
    }
    if (metode === 'POST'){
      const nye = (Array.isArray(body) ? body : [body]).map(b => {
        if (tabel === 'listings') return lavAnnonce({ ...b, id: b.id || uuid(), photos: [] });
        return { id: uuid(), created_at: new Date().toISOString(), ...b };
      });
      if (/merge-duplicates/.test(prefer)){
        for (const n of nye){ const e = lager.find(x => x.id === n.id); if (e) Object.assign(e, n); else lager.push(n); }
      } else lager.push(...nye);
      return /return=representation/.test(prefer) ? svar(201, nye) : (log(201), route.fulfill({ status: 201, headers: cors, body: '' }));
    }
    if (metode === 'PATCH'){
      const rammer = filtrer(lager, [...url.searchParams]);
      rammer.forEach(x => Object.assign(x, body));
      return /return=representation/.test(prefer) ? svar(200, rammer) : (log(204), route.fulfill({ status: 204, headers: cors, body: '' }));
    }
    if (metode === 'DELETE'){
      const rammer = filtrer(lager, [...url.searchParams]);
      tilstand.tabeller[tabel] = lager.filter(x => !rammer.includes(x));
      return /return=representation/.test(prefer) ? svar(200, rammer) : (log(204), route.fulfill({ status: 204, headers: cors, body: '' }));
    }
    log(405); return json(route, 405, { message: 'metode ikke støttet i mock' });
  }

  async function haandter(route){
    const req = route.request();
    const url = new URL(req.url());
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const p = url.pathname;
    if (p.startsWith('/rest/v1/')) return rest(route, req, url);
    if (p.startsWith('/auth/v1/')){
      let body = null; try { body = req.postDataJSON(); } catch (e) { /* tom */ }
      const gren = p.replace('/auth/v1/', '');
      tilstand.auth.push({ gren, metode: req.method(), grant: url.searchParams.get('grant_type') });
      const f = tagFejl(`AUTH ${gren}`);
      if (f) return json(route, f.status, { code: f.status, error_code: f.kode || 'mock', msg: f.besked || 'mock-fejl', message: f.besked || 'mock-fejl' });
      if (gren === 'user') return tilstand.loggetInd ? json(route, 200, bruger) : json(route, 401, { msg: 'ikke logget ind' });
      if (gren === 'token'){
        if (url.searchParams.get('grant_type') === 'password'){
          const nej = tilstand.login && tilstand.login(body.email, body.password);
          if (nej) return json(route, nej.status || 400, { code: nej.status || 400, error_code: nej.kode || 'invalid_credentials', msg: nej.msg || 'Invalid login credentials' });
        }
        tilstand.loggetInd = true; return json(route, 200, session());
      }
      if (gren === 'signup') return json(route, 200, { ...bruger, email: body && body.email, identities: [{}] });
      if (gren === 'logout'){ tilstand.loggetInd = false; return route.fulfill({ status: 204, headers: cors, body: '' }); }
      if (gren === 'recover' || gren === 'resend') return json(route, 200, {});
      if (gren === 'user' || gren === 'otp') return json(route, 200, {});
      return json(route, 200, {});
    }
    if (p.startsWith('/storage/v1/')){
      if (req.method() === 'GET') return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'image/png' }, body: PNG_LILLE });
      const f = tagFejl(`${req.method()} storage`);
      if (f) return json(route, f.status, { statusCode: String(f.status), error: 'mock', message: f.besked || 'mock-fejl' });
      if (req.method() === 'DELETE'){
        let b = null; try { b = req.postDataJSON(); } catch (e) { /* tom */ }
        (b && b.prefixes || []).forEach(s => tilstand.slettedeFiler.push(s));
        return json(route, 200, []);
      }
      const sti = p.replace('/storage/v1/object/', '');
      tilstand.uploads.push({ sti, stoerrelse: (req.postDataBuffer() || Buffer.alloc(0)).length, type: req.headers()['content-type'] });
      return json(route, 200, { Key: sti, Id: uuid() });
    }
    if (p.startsWith('/functions/v1/')) return json(route, 200, { talt: true });
    return json(route, 404, { message: 'mock: ukendt sti ' + p });
  }

  return {
    tilstand,
    /* Aktiverer mock på en Playwright-context. Alt andet end lokal server og *.supabase.co afvises. */
    async installer(context, { lokalPort, tema = 'lys', cookie = true } = {}){
      await context.route('**/*', route => {
        const req = route.request();
        let u; try { u = new URL(req.url()); } catch (e) { return route.abort('blockedbyclient'); }
        if (u.hostname === '127.0.0.1' || u.hostname === 'localhost') return route.continue();
        if (/\.supabase\.co$/.test(u.hostname)) return haandter(route);
        if (u.protocol === 'data:' || u.protocol === 'blob:') return route.continue();
        return route.abort('blockedbyclient');
      });
      await context.addInitScript(({ ref, ses, tema, cookie }) => {
        try {
          if (tema) localStorage.setItem('bb_theme', tema);
          if (cookie) localStorage.setItem('bb_cookie_consent', JSON.stringify({ level: 'necessary', date: new Date().toISOString() }));
          if (ses && !sessionStorage.getItem('__w9seed')){ sessionStorage.setItem('__w9seed', '1'); localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(ses)); }
        } catch (e) { /* blokeret lager */ }
      }, { ref: REF, ses: tilstand.loggetInd ? session() : null, tema, cookie });
    },
    lavAnnonce,
  };
}

module.exports = { lavBackend, lavPng, BRUGER_ID, REF };
