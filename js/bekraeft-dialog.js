/* V3: bekræftelsesdialog til destruktive handlinger (slet annonce, slet kladde, fjern billede, markér solgt).
   Erstatter window.confirm(): den native boks har browserens tekst, kan ikke navngive annoncen, kan ikke
   sige hvad knapperne gør ("OK"/"Annuller"), og den blokerer hele fanen. Her står handlingen på knappen
   ("Slet annonce"), fokus lander på det sikre valg, Escape og klik udenfor annullerer, og fokus går tilbage.

   bekraeft({ titel, tekst, ok, farlig, annuller }) -> Promise<boolean>   (aldrig reject)
   Uden <dialog>.showModal() (meget gamle browsere) falder den tilbage til window.confirm. */
(function(){
  function bekraeft(opt){
    const o = Object.assign({ titel: 'Er du sikker?', tekst: '', ok: 'Ja', annuller: 'Annuller', farlig: false }, opt || {});
    const foer = document.activeElement;
    if (typeof HTMLDialogElement === 'undefined' || typeof document.createElement('dialog').showModal !== 'function'){
      return Promise.resolve(window.confirm(o.titel + (o.tekst ? '\n\n' + o.tekst : '')));
    }
    return new Promise(resolve => {
      const d = document.createElement('dialog');
      d.className = 'bb-bekraeft' + (o.farlig ? ' bb-bekraeft-farlig' : '');
      d.setAttribute('aria-labelledby', 'bb-bekraeft-titel');
      if (o.tekst) d.setAttribute('aria-describedby', 'bb-bekraeft-tekst');
      const h = document.createElement('h2'); h.id = 'bb-bekraeft-titel'; h.textContent = o.titel;
      d.appendChild(h);
      if (o.tekst){ const p = document.createElement('p'); p.id = 'bb-bekraeft-tekst'; p.textContent = o.tekst; d.appendChild(p); }
      const rk = document.createElement('div'); rk.className = 'bb-bekraeft-knapper';
      const nej = document.createElement('button'); nej.type = 'button'; nej.className = 'btn btn-outline'; nej.setAttribute('data-bekraeft-nej', ''); nej.textContent = o.annuller;
      const ja = document.createElement('button'); ja.type = 'button'; ja.className = 'btn ' + (o.farlig ? 'btn-danger' : 'btn-primary'); ja.setAttribute('data-bekraeft-ok', ''); ja.textContent = o.ok;
      rk.appendChild(nej); rk.appendChild(ja); d.appendChild(rk);
      let svar = false;
      nej.addEventListener('click', () => d.close());
      ja.addEventListener('click', () => { svar = true; d.close(); });
      d.addEventListener('click', e => { if (e.target === d) d.close(); });   // klik på mørkt felt = annuller
      d.addEventListener('close', () => {
        d.remove();
        try { if (foer && foer.isConnected) foer.focus({ preventScroll: true }); } catch (e) { /* fokus er kun en hjælp */ }
        resolve(svar);
      });
      document.body.appendChild(d);
      d.showModal();
      (o.farlig ? nej : ja).focus();   // destruktivt: fokus på det sikre valg, så Enter ikke sletter
    });
  }
  window.bekraeft = bekraeft;
})();
