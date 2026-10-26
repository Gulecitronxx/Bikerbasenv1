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

   V7 (beskeder): flere brugere mod ÉT fælles lager, så "send som køber, modtag som sælger, svar" kan testes ende-til-ende.
     await bak.installer(ctxSaelger);                       // standardbrugeren (BRUGER_ID, "Test Sælger")
     await bak.installer(ctxKoeber, { som: 'koeber' });      // 'koeber' | 'koeber2' | 'uverificeret'
   De database-funktioner, supabase/025_beskeder.sql definerer (send_besked, svar_besked, mine_samtaler, hent_samtale,
   ulaeste_samtaler, bloker_modpart, fjern_blokering, rapporter_samtale, hent/saet_besked_mail), er gen-implementeret her med
   SAMME regler (koder, grænser, låsning). Mocken beviser altså frontendens flow, ikke SQL'en — SQL'en tjekkes statisk i
   js/v7-besked-sql.test.js og skal køres på staging før aktivering.
   bak.tilstand.tabeller.samtaler / beskeder / besked_blokeringer, bak.tilstand.notifikationer (hvad triggeren ville sende).
*/

const crypto = require('node:crypto');
const zlib = require('node:zlib');

const REF = 'hkcjrwglwurdjnobewzb';          // kun for localStorage-nøglens navn; der rettes aldrig kald dertil
const BRUGER_ID = 'aaaaaaaa-0000-4000-8000-0000000000a1';
const KOEBER_ID = 'aaaaaaaa-0000-4000-8000-0000000000a2';
const KOEBER2_ID = 'aaaaaaaa-0000-4000-8000-0000000000a3';
const UVERIFICERET_ID = 'aaaaaaaa-0000-4000-8000-0000000000a4';
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
const PNG_STOR = lavPng(480, 360, [70, 78, 92]);   // kun til screenshots (opts.stortFoto): synlige, neutrale pladsholdere

function lavBackend(opts = {}){
  const bruger = { id: BRUGER_ID, aud: 'authenticated', role: 'authenticated', email: 'test.saelger@example.test',
    email_confirmed_at: '2026-01-01T00:00:00Z', app_metadata: {}, user_metadata: {}, identities: [{}], created_at: '2026-01-01T00:00:00Z' };
  const profil = { id: BRUGER_ID, name: 'Test Sælger', is_dealer: !!opts.forhandler, city: 'Odense', company: null,
    verified: false, member_since: 2026, created_at: '2026-01-01T00:00:00Z' };
  /* V7: ekstra testbrugere (alle syntetiske, example.test). Sælgeren er standardbrugeren ovenfor. */
  const lavBruger = (id, email, navn, bekraeftet = true) => ({
    bruger: Object.assign({}, bruger, { id, email, email_confirmed_at: bekraeftet ? '2026-01-01T00:00:00Z' : null }),
    profil: { id, name: navn, is_dealer: false, city: 'Aarhus', company: null, verified: false, member_since: 2026, created_at: '2026-01-01T00:00:00Z' },
  });
  const ekstra = {
    saelger: { bruger, profil },
    koeber: lavBruger(KOEBER_ID, 'test.koeber@example.test', 'Test Køber'),
    koeber2: lavBruger(KOEBER2_ID, 'test.koeber2@example.test', 'Anden Køber'),
    uverificeret: lavBruger(UVERIFICERET_ID, 'test.uverificeret@example.test', 'Ny Bruger', false),
  };
  const tilstand = {
    bruger, loggetInd: !!opts.loggetInd,
    tabeller: {
      profiles: [profil], public_profiles: [profil],
      profiles_private: [{ id: BRUGER_ID, phone: null, vis_telefon: false }],
      listings: [], listing_photos: [], favorites: [], saved_searches: [], listing_stats: [], krav: [], eksterne_annoncer: [],
      samtaler: [], beskeder: [], besked_blokeringer: [], besked_indstillinger: [], reports: [],
    },
    notifikationer: [],
    fejl: {}, log: [], uploads: [], slettedeFiler: [], auth: [],
    saves: opts.saves || null,
    login: opts.login || null,   // (email, password) => { fejl?: {status, msg}} for login-tests
  };
  (opts.annoncer || []).forEach(a => tilstand.tabeller.listings.push(lavAnnonce(a)));
  for (const k of ['koeber', 'koeber2', 'uverificeret']){
    tilstand.tabeller.profiles.push(ekstra[k].profil); tilstand.tabeller.public_profiles.push(ekstra[k].profil);
    tilstand.tabeller.profiles_private.push({ id: ekstra[k].profil.id, phone: null, vis_telefon: false });
  }

  function lavAnnonce(a){
    const id = a.id || uuid();
    return Object.assign({
      id, seller_id: BRUGER_ID, brand: 'Yamaha', model: 'MT-07', type: 'naked', year: 2021, km: 12500, ccm: 689, power: 74,
      price: 69900, condition: 'Brugt', description: 'Testannonce.', postnr: 5000, city: 'Odense', region: 'Syddanmark',
      status: 'active', created_at: new Date(Date.now() - 86400000 * (a.dageGammel || 1)).toISOString(),
      photos: [], seller: profil,
    }, a, { id });
  }
  function session(aktuel){
    const u = aktuel ? aktuel.bruger : bruger;
    const nu = Math.floor(Date.now() / 1000);
    const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
    const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: u.id, aud: 'authenticated', role: 'authenticated', exp: nu + 3600, iat: nu })}.mock`;
    return { access_token: jwt, token_type: 'bearer', expires_in: 3600, expires_at: nu + 3600, refresh_token: 'mock-refresh', user: u };
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

  /* ---- V7: database-funktionerne fra supabase/025_beskeder.sql, samme regler ---- */
  const T = () => tilstand.tabeller;
  const HOUR = 3600e3, DAG = 24 * HOUR;
  const nuMs = () => Date.now();
  const rens = t => String(t == null ? '' : t).replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  const antalLinks = t => { const x = String(t || '').toLowerCase(); return (x.split('http').length - 1) + (x.split('www.').length - 1); };
  const erBlokeret = (a, b) => T().besked_blokeringer.some(r => (r.blokerer_id === a && r.blokeret_id === b) || (r.blokerer_id === b && r.blokeret_id === a));
  const navnFor = id => { const p = T().profiles.find(x => x.id === id); return p && String(p.name || '').trim() ? p.name : null; };
  const annonceStatus = sam => !sam.listing_id ? 'slettet' : ((T().listings.find(l => l.id === sam.listing_id) || {}).status || 'slettet');
  const ulaestFor = (sam, uid) => {
    if (!sam.last_sender_id || sam.last_sender_id === uid) return false;
    const laest = uid === sam.seller_id ? sam.seller_last_read_at : sam.buyer_last_read_at;
    return !laest || laest < sam.last_message_at;
  };
  const verificeret = uid => { const u = Object.values(ekstra).find(x => x.bruger.id === uid); return !!(u && u.bruger.email_confirmed_at); };
  function noterNotifikation(besked, sam){
    const modtager = besked.afsender_id === sam.seller_id ? sam.buyer_id : sam.seller_id;
    const felt = besked.afsender_id === sam.seller_id ? 'buyer_notificeret_at' : 'seller_notificeret_at';
    if (sam[felt] && nuMs() - sam[felt] < 30 * 60e3) return;
    sam[felt] = nuMs();
    tilstand.notifikationer.push({ besked_id: besked.id, samtale_id: sam.id, modtager });   // triggeren kalder Edge Function; mailen har aldrig teksten
  }
  function tjekTekst(tekst){
    const t = rens(tekst);
    if (t.length < 2 || t.length > 1000) return { kode: 'ugyldig_tekst' };
    if (antalLinks(t) > 2) return { kode: 'for_mange_links' };
    return { t };
  }
  function laegBesked(sam, uid, t){
    const b = { id: uuid(), samtale_id: sam.id, afsender_id: uid, tekst: t, created_at: nuMs() };
    T().beskeder.push(b);
    sam.last_message_at = nuMs(); sam.last_sender_id = uid;
    if (uid === sam.seller_id) sam.seller_last_read_at = nuMs(); else sam.buyer_last_read_at = nuMs();
    noterNotifikation(b, sam);
    return b;
  }
  const iso = ms => new Date(ms).toISOString();
  function rpcBesked(navn, a, uid){
    if (!/^(send_besked|svar_besked|mine_samtaler|hent_samtale|ulaeste_samtaler|bloker_modpart|fjern_blokering|rapporter_samtale|hent_besked_mail|saet_besked_mail)$/.test(navn)) return undefined;
    const nej = kode => ({ ok: false, kode });
    if (!uid) return navn === 'mine_samtaler' ? [] : navn === 'ulaeste_samtaler' ? 0 : navn === 'hent_besked_mail' ? null : nej('ikke_logget_ind');
    const deltager = sam => sam && (sam.seller_id === uid || sam.buyer_id === uid);
    if (navn === 'send_besked'){
      if (String(a.p_honning || '').trim()) return { ok: true };
      if (!verificeret(uid)) return nej('ikke_verificeret');
      const v = tjekTekst(a.p_tekst); if (v.kode) return nej(v.kode);
      const l = T().listings.find(x => x.id === a.p_listing);
      if (!l) return nej('annonce_findes_ikke');
      if (l.status !== 'active') return nej('annonce_ikke_aktiv');
      if (l.seller_id === uid) return nej('egen_annonce');
      if (erBlokeret(l.seller_id, uid)) return nej('blokeret');
      const mine = T().beskeder.filter(b => b.afsender_id === uid);
      if (mine.filter(b => nuMs() - b.created_at < HOUR).length >= 20 || mine.filter(b => nuMs() - b.created_at < DAG).length >= 100) return nej('for_mange');
      const pr = mine.filter(b => nuMs() - b.created_at < HOUR && (T().samtaler.find(s => s.id === b.samtale_id) || {}).listing_id === l.id);
      if (pr.length >= 5) return nej('for_mange_pr_annonce');
      let sam = T().samtaler.find(s => s.listing_id === l.id && s.buyer_id === uid);
      if (!sam){
        if (T().samtaler.filter(s => s.buyer_id === uid && nuMs() - s.created_at < DAG).length >= 10) return nej('for_mange_samtaler');
        sam = { id: uuid(), listing_id: l.id, annonce_titel: `${l.brand} ${l.model}${l.year != null ? ` (${l.year})` : ''}`.slice(0, 160), seller_id: l.seller_id, buyer_id: uid,
          created_at: nuMs(), last_message_at: nuMs(), last_sender_id: null, seller_last_read_at: null, buyer_last_read_at: null };
        T().samtaler.push(sam);
      } else if (T().beskeder.some(b => b.samtale_id === sam.id && b.afsender_id === uid && b.tekst === v.t && nuMs() - b.created_at < 10 * 60e3)) return nej('dublet');
      laegBesked(sam, uid, v.t);
      return { ok: true, samtale_id: sam.id };
    }
    if (navn === 'svar_besked'){
      const sam = T().samtaler.find(s => s.id === a.p_samtale);
      if (!deltager(sam)) return nej('findes_ikke');
      if (!verificeret(uid)) return nej('ikke_verificeret');
      const v = tjekTekst(a.p_tekst); if (v.kode) return nej(v.kode);
      if (annonceStatus(sam) !== 'active') return nej('annonce_ikke_aktiv');
      const modpart = uid === sam.seller_id ? sam.buyer_id : sam.seller_id;
      if (erBlokeret(uid, modpart)) return nej('blokeret');
      const mine = T().beskeder.filter(b => b.afsender_id === uid);
      if (mine.filter(b => nuMs() - b.created_at < HOUR).length >= 30 || mine.filter(b => nuMs() - b.created_at < DAG).length >= 150) return nej('for_mange');
      if (mine.filter(b => b.samtale_id === sam.id && nuMs() - b.created_at < HOUR).length >= 20) return nej('for_mange_pr_annonce');
      if (mine.some(b => b.samtale_id === sam.id && b.tekst === v.t && nuMs() - b.created_at < 10 * 60e3)) return nej('dublet');
      laegBesked(sam, uid, v.t);
      return { ok: true, samtale_id: sam.id };
    }
    if (navn === 'mine_samtaler'){
      return T().samtaler.filter(sam => deltager(sam)).sort((x, y) => y.last_message_at - x.last_message_at).slice(0, 100).map(sam => {
        const modpart = uid === sam.seller_id ? sam.buyer_id : sam.seller_id;
        const sidste = T().beskeder.filter(b => b.samtale_id === sam.id).sort((x, y) => y.created_at - x.created_at)[0];
        return { samtale_id: sam.id, listing_id: sam.listing_id, annonce_titel: sam.annonce_titel, annonce_status: annonceStatus(sam),
          rolle: uid === sam.seller_id ? 'saelger' : 'koeber', modpart_navn: navnFor(modpart), sidste_tekst: sidste ? sidste.tekst.slice(0, 140) : null,
          sidste_fra_mig: sam.last_sender_id === uid, sidste_tidspunkt: iso(sam.last_message_at), ulaest: ulaestFor(sam, uid), blokeret: erBlokeret(uid, modpart) };
      });
    }
    if (navn === 'ulaeste_samtaler') return T().samtaler.filter(s => deltager(s) && ulaestFor(s, uid)).length;
    if (navn === 'hent_samtale'){
      const sam = T().samtaler.find(s => s.id === a.p_samtale);
      if (!deltager(sam)) return nej('findes_ikke');
      const modpart = uid === sam.seller_id ? sam.buyer_id : sam.seller_id;
      const bs = T().beskeder.filter(b => b.samtale_id === sam.id).sort((x, y) => y.created_at - x.created_at).slice(0, 200).reverse()
        .map(b => ({ id: b.id, fra_mig: b.afsender_id === uid, tekst: b.tekst, oprettet: iso(b.created_at) }));
      const svar = { ok: true, samtale: { samtale_id: sam.id, listing_id: sam.listing_id, annonce_titel: sam.annonce_titel, annonce_status: annonceStatus(sam),
        rolle: uid === sam.seller_id ? 'saelger' : 'koeber', modpart_navn: navnFor(modpart), blokeret: erBlokeret(uid, modpart),
        jeg_har_blokeret: T().besked_blokeringer.some(r => r.blokerer_id === uid && r.blokeret_id === modpart) }, beskeder: bs };
      if (a.p_marker_laest !== false){ if (uid === sam.seller_id) sam.seller_last_read_at = nuMs(); else sam.buyer_last_read_at = nuMs(); }
      return svar;
    }
    if (navn === 'bloker_modpart' || navn === 'fjern_blokering'){
      const sam = T().samtaler.find(s => s.id === a.p_samtale);
      if (!deltager(sam)) return nej('findes_ikke');
      const modpart = uid === sam.seller_id ? sam.buyer_id : sam.seller_id;
      if (navn === 'bloker_modpart'){ if (!T().besked_blokeringer.some(r => r.blokerer_id === uid && r.blokeret_id === modpart)) T().besked_blokeringer.push({ blokerer_id: uid, blokeret_id: modpart }); }
      else T().besked_blokeringer = T().besked_blokeringer.filter(r => !(r.blokerer_id === uid && r.blokeret_id === modpart));
      return { ok: true };
    }
    if (navn === 'rapporter_samtale'){
      if (!['svindel', 'upassende', 'andet'].includes(a.p_aarsag)) return nej('ugyldig_aarsag');
      const sam = T().samtaler.find(s => s.id === a.p_samtale);
      if (!deltager(sam)) return nej('findes_ikke');
      const modpart = uid === sam.seller_id ? sam.buyer_id : sam.seller_id;
      T().reports.push({ id: uuid(), reporter_id: uid, target_type: 'profile', target_id: modpart, reason: a.p_aarsag, comment: `Besked-traad ${sam.id}. ${String(a.p_kommentar || '').trim()}`.slice(0, 2000) });
      return { ok: true };
    }
    if (navn === 'hent_besked_mail'){ const r = T().besked_indstillinger.find(x => x.user_id === uid); return r ? r.mail_ved_ny_besked : true; }
    if (navn === 'saet_besked_mail'){
      const r = T().besked_indstillinger.find(x => x.user_id === uid);
      if (r) r.mail_ved_ny_besked = !!a.p_til; else T().besked_indstillinger.push({ user_id: uid, mail_ved_ny_besked: !!a.p_til });
      return true;
    }
    return undefined;
  }

  async function rest(route, req, url, aktuel){
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
      let rpcBody = null; try { rpcBody = req.postDataJSON(); } catch (e) { rpcBody = null; }
      const besked = rpcBesked(navn, rpcBody || {}, (aktuel ? aktuel.bruger.id : (tilstand.loggetInd ? BRUGER_ID : null)));
      if (besked !== undefined) return json(route, 200, besked);
      if (navn === 'my_listing_saves') return json(route, 200, tilstand.saves || []);   // [{ listing, saves }] — sæt i tests/screenshots
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

  async function haandter(route, aktuel){
    const req = route.request();
    const url = new URL(req.url());
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const p = url.pathname;
    /* V7: en kontekst med `som` har sin egen indloggede bruger; uden `som` er det standardbrugeren (tilstand.loggetInd). */
    const erInde = () => aktuel ? aktuel.loggetInd : tilstand.loggetInd;
    const saetInde = v => { if (aktuel) aktuel.loggetInd = v; else tilstand.loggetInd = v; };
    const denBruger = aktuel ? aktuel.bruger : bruger;
    if (p.startsWith('/rest/v1/')) return rest(route, req, url, aktuel);
    if (p.startsWith('/auth/v1/')){
      let body = null; try { body = req.postDataJSON(); } catch (e) { /* tom */ }
      const gren = p.replace('/auth/v1/', '');
      tilstand.auth.push({ gren, metode: req.method(), grant: url.searchParams.get('grant_type') });
      const f = tagFejl(`AUTH ${gren}`);
      if (f) return json(route, f.status, { code: f.status, error_code: f.kode || 'mock', msg: f.besked || 'mock-fejl', message: f.besked || 'mock-fejl' });
      if (gren === 'user') return erInde() ? json(route, 200, denBruger) : json(route, 401, { msg: 'ikke logget ind' });
      if (gren === 'token'){
        if (url.searchParams.get('grant_type') === 'password'){
          const nej = tilstand.login && tilstand.login(body.email, body.password);
          if (nej) return json(route, nej.status || 400, { code: nej.status || 400, error_code: nej.kode || 'invalid_credentials', msg: nej.msg || 'Invalid login credentials' });
        }
        saetInde(true); return json(route, 200, session(aktuel));
      }
      if (gren === 'signup') return json(route, 200, { ...bruger, email: body && body.email, identities: [{}] });
      if (gren === 'logout'){ saetInde(false); return route.fulfill({ status: 204, headers: cors, body: '' }); }
      if (gren === 'recover' || gren === 'resend') return json(route, 200, {});
      if (gren === 'user' || gren === 'otp') return json(route, 200, {});
      return json(route, 200, {});
    }
    if (p.startsWith('/storage/v1/')){
      if (req.method() === 'GET') return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'image/png' }, body: opts.stortFoto ? PNG_STOR : PNG_LILLE });
      const f = tagFejl(`${req.method()} storage`);
      if (f) return json(route, f.status, { statusCode: String(f.status), error: 'mock', message: f.besked || 'mock-fejl' });
      if (req.method() === 'DELETE'){
        let b = null; try { b = req.postDataJSON(); } catch (e) { /* tom */ }
        (b && b.prefixes || []).forEach(s => tilstand.slettedeFiler.push(s));
        return json(route, 200, []);
      }
      const sti = p.replace('/storage/v1/object/', '');
      const raa = req.postDataBuffer() || Buffer.alloc(0);
      const del = /content-type:\s*(image\/[a-z0-9.+-]+)/i.exec(raa.toString('latin1', 0, Math.min(raa.length, 600)));
      tilstand.uploads.push({ sti, stoerrelse: raa.length, type: del ? del[1].toLowerCase() : req.headers()['content-type'] });
      return json(route, 200, { Key: sti, Id: uuid() });
    }
    if (p.startsWith('/functions/v1/')) return json(route, 200, { talt: true });
    return json(route, 404, { message: 'mock: ukendt sti ' + p });
  }

  return {
    tilstand,
    /* Aktiverer mock på en Playwright-context. Alt andet end lokal server og *.supabase.co afvises. */
    async installer(context, { lokalPort, tema = 'lys', cookie = true, som } = {}){
      /* V7: `som` giver denne kontekst sin egen bruger (se øverst). Uden `som` er alt som før. */
      if (som && !ekstra[som]) throw new Error('ukendt testbruger: ' + som);
      const aktuel = som ? { bruger: ekstra[som].bruger, profil: ekstra[som].profil, loggetInd: true } : null;
      await context.route('**/*', route => {
        const req = route.request();
        let u; try { u = new URL(req.url()); } catch (e) { return route.abort('blockedbyclient'); }
        if (u.hostname === '127.0.0.1' || u.hostname === 'localhost') return route.continue();
        if (/\.supabase\.co$/.test(u.hostname)) return haandter(route, aktuel);
        if (u.protocol === 'data:' || u.protocol === 'blob:') return route.continue();
        return route.abort('blockedbyclient');
      });
      await context.addInitScript(({ ref, ses, tema, cookie }) => {
        try {
          if (tema) localStorage.setItem('bb_theme', tema);
          if (cookie) localStorage.setItem('bb_cookie_consent', JSON.stringify({ level: 'necessary', date: new Date().toISOString() }));
          if (ses && !sessionStorage.getItem('__w9seed')){ sessionStorage.setItem('__w9seed', '1'); localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(ses)); }
        } catch (e) { /* blokeret lager */ }
      }, { ref: REF, ses: (aktuel || tilstand.loggetInd) ? session(aktuel) : null, tema: ({ lys: 'light', light: 'light', moerk: 'dark', mørk: 'dark', dark: 'dark' })[tema] || tema, cookie });
    },
    lavAnnonce,
  };
}

module.exports = { lavBackend, lavPng, BRUGER_ID, KOEBER_ID, KOEBER2_ID, UVERIFICERET_ID, REF };
