/* Erstatter 'unsafe-inline' i hver sides script-src med sha256-hashes af
   sidens egne inline-scripts. Koerer SIDST i scripts/build.js — efter alle
   inline-*.js-trin, saa det er de bytes, der faktisk serveres, der hashes.

   Hvorfor (audit 23.08.2026, B1): CSP'en havde script-src 'self' 'unsafe-inline'.
   'unsafe-inline' slaar praecis den beskyttelse fra, en CSP skulle give mod
   XSS: et injiceret <script> eller onclick= ville koere. Sidens inline-
   scripts er faa og statiske (tema-bootstrap, GA4 bag samtykke, cookiebanner,
   annonce-prefetch), saa de kan hashes ved build. En hash matcher kun det
   noejagtige indhold — aendres et inline-script uden at build.js koeres igen,
   naegter browseren at koere det (og siger det i konsollen). Det er meningen:
   byggekaeden er sandheden, ikke haandredigering.

   Regler:
   - Kun <script> UDEN src og uden type="application/ld+json" (JSON-LD koeres
     ikke og kraever ingen hash). Hashen er sha256 over ALT mellem > og
     </script> med linjeskift normaliseret til LF, praecis som HTML-parseren
     goer det foer browseren hasher (se hash()). Filen skrives kun, hvis
     CSP'en aendrer sig.
   - 'unsafe-inline' fjernes fra script-src. Eksisterende 'sha256-…' smides ud
     og beregnes forfra (idempotent).
   - Inline event-handlere (onclick= osv.) og javascript:-URL'er daekkes IKKE
     af hashes uden 'unsafe-hashes'. Scriptet AFBRYDER, hvis det finder nogen —
     de skal bindes i js/ i stedet (addEventListener), som resten af sitet goer.
   - style-src roeres ikke: style="…"-attributter bruges overalt, og det er
     ikke den her runde.

   Koer:  node scripts/csp-hashes.js   (build.js goer det selv) */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CSP_RE = /(<meta http-equiv="Content-Security-Policy" content=")([^"]+)(")/;
const SCRIPT_RE = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
const HANDLER_RE = /\son[a-z]+\s*=\s*["']/i;
const JSURL_RE = /\b(?:href|src|action|formaction)\s*=\s*["']\s*javascript:/i;

/* HTML-parseren normaliserer CR LF og CR til LF, FOER browseren hasher et
   inline-script (HTML-standardens "preprocessing the input stream"). Hashes
   skal derfor regnes over det normaliserede indhold — ellers passer de kun,
   naar filen tilfaeldigvis er ren LF. Fundet 23.08.2026: arbejdskopien paa
   Windows har CRLF (git autocrlf), og afmeld.html's tredje inline-script blev
   afvist af Chromium, mens de LF-skrevne blokke fra inline-*.js gik igennem. */
function hash(indhold){
  const normaliseret = String(indhold).replace(/\r\n?/g, '\n');
  return `'sha256-${crypto.createHash('sha256').update(normaliseret, 'utf8').digest('base64')}'`;
}

/* Inline-scripts i en side: [{attrs, body}] — kun dem, browseren vil koere. */
function inlineScripts(html){
  const ud = [];
  for (const m of html.matchAll(SCRIPT_RE)){
    const attrs = m[1] || '';
    if (/\bsrc\s*=/i.test(attrs)) continue;
    if (/type\s*=\s*["']application\/ld\+json["']/i.test(attrs)) continue;
    if (/type\s*=\s*["'](?!module\b|text\/javascript\b|application\/javascript\b)[^"']+["']/i.test(attrs)) continue; // fx text/template
    ud.push({ attrs, body: m[2] });
  }
  return ud;
}

/* Ny script-src-vaerdi: 'self' + hashes + de vaertskilder, der stod der i
   forvejen (googletagmanager osv.). Uden 'unsafe-inline', uden gamle hashes. */
function nyScriptSrc(gammelScriptSrc, hashes){
  const behold = gammelScriptSrc.split(/\s+/).filter(Boolean)
    .filter(t => t !== "'unsafe-inline'" && !/^'sha(256|384|512)-/.test(t) && t !== "'self'");
  return ["'self'", ...hashes, ...behold].join(' ');
}

/* Hele CSP-strengen med script-src udskiftet. Returnerer null, hvis der ingen
   script-src er (saa default-src gaelder — rør den ikke uden at vide hvorfor). */
function opdaterCsp(csp, hashes){
  const dir = csp.split(';').map(s => s.trim()).filter(Boolean);
  const i = dir.findIndex(d => /^script-src\b/.test(d));
  if (i === -1) return null;
  const gammel = dir[i].replace(/^script-src\s*/, '');
  dir[i] = `script-src ${nyScriptSrc(gammel, hashes)}`;
  return dir.join('; ');
}

/* Én side: returnerer { html, hashes, aendret } eller kaster ved forbudte moenstre. */
function behandlSide(html, navn = ''){
  const uden = html.replace(SCRIPT_RE, '').replace(/<!--[\s\S]*?-->/g, '');
  if (HANDLER_RE.test(uden)) throw new Error(`${navn}: inline event-handler (on*=) fundet — bind den i js/ i stedet, hashes daekker den ikke.`);
  if (JSURL_RE.test(uden)) throw new Error(`${navn}: javascript:-URL fundet — fjern den, hashes daekker den ikke.`);
  const m = html.match(CSP_RE);
  if (!m) return { html, hashes: [], aendret: false, ingenCsp: true };
  const hashes = [...new Set(inlineScripts(html).map(s => hash(s.body)))];
  const ny = opdaterCsp(m[2], hashes);
  if (ny === null) return { html, hashes, aendret: false, ingenScriptSrc: true };
  const ud = html.replace(CSP_RE, (_, a, _b, c) => `${a}${ny}${c}`);
  return { html: ud, hashes, aendret: ud !== html };
}

function koer(root){
  let sider = 0, aendrede = 0, uden = [];
  for (const fil of fs.readdirSync(root).filter(f => f.endsWith('.html')).sort()){
    const p = path.join(root, fil);
    const html = fs.readFileSync(p, 'utf8');
    const r = behandlSide(html, fil);
    if (r.ingenCsp){ uden.push(fil); continue; }
    sider++;
    if (r.aendret){ fs.writeFileSync(p, r.html, 'utf8'); aendrede++; }
  }
  console.log(`csp-hashes: script-src uden 'unsafe-inline' paa ${sider} sider (${aendrede} skrevet).` + (uden.length ? ` Uden CSP: ${uden.join(', ')}` : ''));
}

module.exports = { hash, inlineScripts, nyScriptSrc, opdaterCsp, behandlSide };
if (require.main === module) koer(path.join(__dirname, '..'));
