/* V7 QA: preload til `npm test` (node --require ./scripts/test-preload.js). Gør EN ting: page.goto() i alle browsertests tages om (op til 3 forsøg) når
   Windows' loopback løber tør for bufferplads (net::ERR_NO_BUFFER_SPACE) eller en forbindelse nulstilles/afvises under mange samtidige Chromium.
   Det er OS-støj, ikke en sidefejl: samme regel som `gaaTil()` i scripts/smoke-browser.js, men gældende for de ca. 60 testfiler, der kalder page.goto direkte.
   Andre fejl (timeout, 404, scriptfejl) kastes uændret, og ingen grænse eller assert berøres. Slå fra med BB_TEST_UDEN_GENFORSOEG=1. */
'use strict';
if (!process.env.BB_TEST_UDEN_GENFORSOEG) {
  const Module = require('module');
  const OS_FEJL = /ERR_NO_BUFFER_SPACE|ERR_CONNECTION_(RESET|REFUSED)/;
  const pause = ms => new Promise(ok => setTimeout(ok, ms));

  const medGenforsoeg = (side) => {
    if (!side || side.__bbGenforsoeg || typeof side.goto !== 'function') return side;
    const original = side.goto.bind(side);
    side.goto = async (...args) => {
      for (let forsoeg = 1; ; forsoeg++) {
        try { return await original(...args); }
        catch (e) {
          if (forsoeg >= 3 || !OS_FEJL.test(String(e && e.message))) throw e;
          await pause(400 * forsoeg);
        }
      }
    };
    side.__bbGenforsoeg = true;
    return side;
  };
  const kontekst = (ctx) => {
    if (!ctx || ctx.__bbGenforsoeg || typeof ctx.newPage !== 'function') return ctx;
    const nySide = ctx.newPage.bind(ctx);
    ctx.newPage = async (...a) => medGenforsoeg(await nySide(...a));
    ctx.__bbGenforsoeg = true;
    return ctx;
  };
  const browser = (b) => {
    if (!b || b.__bbGenforsoeg || typeof b.newContext !== 'function') return b;
    const nyKontekst = b.newContext.bind(b), nySide = b.newPage.bind(b);
    b.newContext = async (...a) => kontekst(await nyKontekst(...a));
    b.newPage = async (...a) => medGenforsoeg(await nySide(...a));
    b.__bbGenforsoeg = true;
    return b;
  };
  const patch = (pw) => {
    if (!pw || !pw.chromium || pw.__bbPatched || typeof pw.chromium.launch !== 'function') return pw;
    const launch = pw.chromium.launch.bind(pw.chromium);
    pw.chromium.launch = async (...a) => browser(await launch(...a));
    Object.defineProperty(pw, '__bbPatched', { value: true });
    return pw;
  };
  const load = Module._load;
  Module._load = function (request, parent, isMain) {
    const ud = load.apply(this, arguments);
    if (/^playwright(-core)?$/.test(request) || /[\\/]playwright(-core)?([\\/]index\.js)?$/.test(String(request))) return patch(ud);
    return ud;
  };
}
