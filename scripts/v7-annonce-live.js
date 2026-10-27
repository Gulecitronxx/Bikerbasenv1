/* V7 QA fase 2: v7-annonce-live. Kun laesning mod https://bikerbasen.dk (GET af sider; ingen login, ingen formularer). Kør fra repo-roden: node scripts/v7-annonce-live.js */
const pw = require('playwright');
(async () => {
  const b = await pw.chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'da-DK' });
  const p = await ctx.newPage();
  const reqs = [];
  p.on('request', r => reqs.push(r.url().replace('https://bikerbasen.dk','')));
  await p.goto('https://bikerbasen.dk/annonce-bmw-r45-1979-59d3a9a1.html', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  console.log('SIMILAR:', await p.evaluate(() => { const s = document.querySelector('.similar-strip'); return s ? s.innerText.replace(/\s+/g,' ').slice(0,700) : 'ingen'; }));
  console.log('TYPE i fakta:', await p.evaluate(() => (document.body.innerText.match(/Type[^\n]*\n[^\n]*/)||[''])[0]));
  console.log('beskeder-requests:', reqs.filter(u => /besked|message/i.test(u)));
  console.log('js/css:', reqs.filter(u => /\.(js|css)(\?|$)/.test(u) && !/supabase/.test(u)).map(u => u.split('?')[0]).join(' '));
  console.log('flag:', await p.evaluate(() => typeof BB_FLAGS !== 'undefined' ? JSON.stringify(BB_FLAGS) : window.BB_FLAGS ? JSON.stringify(window.BB_FLAGS) : 'ingen'));
  console.log('formular/textarea:', await p.evaluate(() => ({ f: document.querySelectorAll('form').length, t: document.querySelectorAll('textarea').length, tel: document.querySelectorAll('a[href^=tel]').length, besk: [...document.querySelectorAll('a,button')].filter(e => /send besked|kontakt sælger|skriv til/i.test(e.textContent)).map(e=>e.textContent.trim()) })));
  await b.close();
})();
