/* ============================================================
   Datalag mod Supabase.

   Alle funktioner er async og returnerer { data, error }-agtige resultater,
   så kaldsstedet kan håndtere fejl eksplicit i stedet for at antage succes.

   Hvis Supabase ikke er konfigureret, er db.enabled === false, og siden
   kører videre på det eksisterende localStorage-lag.
   ============================================================ */

const db = (function(){
  let client = null;

  function init(){
    if (client) return client;
    if (!isSupabaseConfigured()) return null;
    if (typeof supabase === 'undefined' || !supabase.createClient){
      console.warn('Supabase-biblioteket blev ikke indlæst.');
      return null;
    }
    client = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    return client;
  }

  /* ---------- Billeder: fjern EXIF/GPS før upload ----------
     Metadata i et foto kan indeholde de præcise GPS-koordinater for,
     hvor billedet er taget — altså typisk sælgers hjemmeadresse.
     Ved at tegne billedet om på et canvas og re-encode det, ryger alle
     EXIF-felter med. Filen krympes samtidig til rimelig web-størrelse. */
  /* Tegner billedet om på et canvas: EXIF (herunder GPS-position fra
     telefonen) forsvinder, og filen bliver mindre.

     WebP frem for JPEG: annoncefotoet er LCP-elementet på både søgesiden,
     mærkesiderne og annoncesiden, og Supabase' billedtransformation er ikke
     slået til på planen — så vægten skal ned her, ved uploaden. WebP giver
     ~30% mindre fil ved samme kvalitet og understøttes af alle browsere,
     der overhovedet kan køre resten af siden. Falder toBlob tilbage til
     JPEG (meget gamle browsere), fortsætter uploaden bare med det. */
  async function stripExifAndResize(file, maxEdge = 1600, quality = 0.82){
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;
    if (Math.max(width, height) > maxEdge){
      const s = maxEdge / Math.max(width, height);
      width = Math.round(width * s);
      height = Math.round(height * s);
    }
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const blob = await new Promise(res => canvas.toBlob(res, 'image/webp', quality))
      || await new Promise(res => canvas.toBlob(res, 'image/jpeg', quality));
    if (!blob) throw new Error('Billedet kunne ikke behandles.');
    return blob;
  }

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
  const MAX_BYTES = 12 * 1024 * 1024; // 12 MB før komprimering

  /* Endelse → MIME, brugt når filen ikke selv oplyser en type.
     Windows har ingen registrering for .heic, så et iPhone-foto lagt over
     på en pc kommer med `file.type === ''`. Uden det her gardin blev det
     afvist som "Filtypen understøttes ikke", selvom typen aldrig var oplyst
     — vi afviste altså på en oplysning, vi ikke havde. */
  const ENDELSE_TIL_TYPE = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    webp: 'image/webp', heic: 'image/heic', heif: 'image/heif',
  };

  function billedType(file){
    if (file.type) return file.type;
    const e = (file.name || '').split('.').pop().toLowerCase();
    return ENDELSE_TIL_TYPE[e] || '';
  }

  function validateImage(file){
    if (!ALLOWED_TYPES.includes(billedType(file))) return 'Filtypen understøttes ikke. Brug JPG, PNG eller WebP.';
    if (file.size > MAX_BYTES) return 'Billedet er for stort (maks. 12 MB).';
    return null;
  }

  return {
    get enabled(){ return Boolean(init()); },
    get raw(){ return init(); },

    /* ---------- Auth ---------- */
    async signUp({ email, password, name, phone, isDealer, company, cvr }){
      const c = init(); if (!c) return { error: { message: 'Backend er ikke konfigureret.' } };
      return c.auth.signUp({
        email, password,
        options: { data: { name, phone, is_dealer: !!isDealer, company: company || null, cvr: cvr || null } },
      });
    },
    async signIn({ email, password }){
      const c = init(); if (!c) return { error: { message: 'Backend er ikke konfigureret.' } };
      return c.auth.signInWithPassword({ email, password });
    },
    async signOut(){
      const c = init(); if (!c) return { error: null };
      return c.auth.signOut();
    },

    /* Sender bekræftelsesmailen igen. Findes, fordi der IKKE var nogen vej
       herfra før: en bruger der lukkede fanen efter signUp() (eller hvis mail
       aldrig kom frem) kunne hverken logge ind (ubekræftet) eller oprette på
       ny (e-mailen findes allerede) — kun sidde fast. Se js/login.js. */
    async resend({ email }){
      const c = init(); if (!c) return { error: { message: 'Backend er ikke konfigureret.' } };
      return c.auth.resend({ type: 'signup', email });
    },

    /* Sender et link til at vælge en ny adgangskode. Supabase svarer succes
       uanset om e-mailen findes i systemet — ellers kunne formularen bruges
       til at afsløre, hvem der har en profil, og det skal js/login.js IKKE
       modsige med sin egen fejlbesked. redirectTo skal stå i projektets
       Auth → URL Configuration → Redirect URLs, ellers afvises linket. */
    async resetPasswordForEmail(email, redirectTo){
      const c = init(); if (!c) return { error: { message: 'Backend er ikke konfigureret.' } };
      return c.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);
    },

    /* Sætter den nye adgangskode. Kræver en "recovery"-session, som Supabase
       selv opretter, når brugeren lander her via linket fra resetPasswordForEmail. */
    async updatePassword(password){
      const c = init(); if (!c) return { error: { message: 'Backend er ikke konfigureret.' } };
      return c.auth.updateUser({ password });
    },

    async currentUser(){
      const c = init(); if (!c) return null;
      const { data } = await c.auth.getUser();
      return data?.user || null;
    },
    async currentProfile(){
      const c = init(); if (!c) return null;
      const user = await this.currentUser();
      if (!user) return null;
      const { data } = await c.from('profiles').select('*').eq('id', user.id).single();
      return data || null;
    },

    /* ---------- Annoncer ---------- */
    async listListings(filters = {}){
      const c = init(); if (!c) return { data: [], error: null };
      let q = c.from('listings')
        // Nøglen navngives eksplicit: efter at favorites kom til, findes der
        // to mulige veje fra listings til public_profiles, og PostgREST
        // afviser forespørgslen (PGRST201) hvis man ikke peger på den rigtige.
        .select('*, seller:public_profiles!listings_seller_id_fkey(*), photos:listing_photos(id, storage_path, position)')
        .eq('status', 'active');

      if (filters.brands?.length)     q = q.in('brand', filters.brands);
      if (filters.types?.length)      q = q.in('type', filters.types);
      if (filters.regions?.length)    q = q.in('region', filters.regions);
      if (filters.conditions?.length) q = q.in('condition', filters.conditions);
      if (filters.priceMin != null)   q = q.gte('price', filters.priceMin);
      if (filters.priceMax != null)   q = q.lte('price', filters.priceMax);
      if (filters.yearMin != null)    q = q.gte('year', filters.yearMin);
      if (filters.yearMax != null)    q = q.lte('year', filters.yearMax);
      if (filters.kmMax != null)      q = q.lte('km', filters.kmMax);
      if (filters.ccmMin != null)     q = q.gte('ccm', filters.ccmMin);
      if (filters.ccmMax != null)     q = q.lte('ccm', filters.ccmMax);
      if (filters.q)                  q = q.or(`brand.ilike.%${filters.q}%,model.ilike.%${filters.q}%`);

      const sorts = {
        'date-desc':  ['created_at', false],
        'price-asc':  ['price', true],
        'price-desc': ['price', false],
        'year-desc':  ['year', false],
        'km-asc':     ['km', true],
      };
      const [col, asc] = sorts[filters.sort] || sorts['date-desc'];
      q = q.order(col, { ascending: asc });
      if (filters.limit) q = q.limit(filters.limit);

      return q;
    },

    /* ---------- Indekserede annoncer fra andre sider ----------
       Vi hoster dem ikke. De ligger i eksterne_annoncer, og køberen sendes
       videre til kilden. Læsning kræver ingen login: politikken i 014 gør
       aktive annoncer fra aktive kilder offentlige, og kun dem.

       status filtreres ikke her — politikken skjuler allerede 'borte', og en
       ekstra .eq('status','aktiv') ville låse os ude af 'solgt', som stadig
       er værd at vise med et mærke. */
    async listExternalListings(filters = {}){
      const c = init(); if (!c) return { data: [], error: null };
      let q = c.from('eksterne_annoncer')
        /* Kolonnerne står eksplicit frem for '*', og listen skal udvides i
           SAMME ombæring som den migration, der tilføjer kolonnen — aldrig før.

           Grunden er målt: beder vi om en kolonne, der ikke findes endnu,
           svarer PostgREST 42703, og loadExternalListings() fanger fejlen ved
           at returnere []. Så forsvinder alle 332 annoncer fra hele sitet på
           én gang. Fejlen ligner ikke en fejl — den ligner et tomt katalog.

           hk, type, stand, variant, salgsmarkoerer og udledte_felter kom med
           i 015. */
        .select('id, kilde_annonce_id, url, titel, maerke, model, variant, type, ' +
                'aargang, km, ccm, hk, pris_dkk, stand, salgsmarkoerer, udledte_felter, ' +
                'by, postnr, saelgertype, thumbnail_url, uddrag, status, foerst_set, sidst_set, ' +
                'kilde:kilder(navn, domaene)')
        .eq('status', 'aktiv');

      if (filters.brands?.length) q = q.in('maerke', filters.brands);
      if (filters.priceMin != null) q = q.gte('pris_dkk', filters.priceMin);
      if (filters.priceMax != null) q = q.lte('pris_dkk', filters.priceMax);

      q = q.order('sidst_set', { ascending: false });
      if (filters.limit) q = q.limit(filters.limit);
      return q;
    },

    async getListing(id){
      const c = init(); if (!c) return { data: null, error: null };
      return c.from('listings')
        // Nøglen navngives eksplicit: efter at favorites kom til, findes der
        // to mulige veje fra listings til public_profiles, og PostgREST
        // afviser forespørgslen (PGRST201) hvis man ikke peger på den rigtige.
        .select('*, seller:public_profiles!listings_seller_id_fkey(*), photos:listing_photos(id, storage_path, position)')
        .eq('id', id).single();
    },

    /* Én sælgers offentlige profil. public_profiles udstiller kun de felter,
       en køber må se — ikke telefonnummer, CVR eller e-mail. */
    async getPublicProfile(sellerId){
      const c = init(); if (!c) return { data: null, error: null };
      return c.from('public_profiles').select('*').eq('id', sellerId).single();
    },

    /* Alle aktive annoncer fra én sælger. Hentes direkte frem for at filtrere
       den indlæste side — ellers ville en sælger med mange annoncer kun vise
       dem, der tilfældigvis var med i de første 200. */
    async listingsBySeller(sellerId){
      const c = init(); if (!c) return { data: [], error: null };
      return c.from('listings')
        .select('*, seller:public_profiles!listings_seller_id_fkey(*), photos:listing_photos(id, storage_path, position)')
        .eq('seller_id', sellerId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
    },

    async myListings(){
      const c = init(); if (!c) return { data: [], error: null };
      const user = await this.currentUser();
      if (!user) return { data: [], error: null };
      return c.from('listings')
        .select('*, photos:listing_photos(id, storage_path, position)')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });
    },

    async createListing(listing){
      const c = init(); if (!c) return { error: { message: 'Backend er ikke konfigureret.' } };
      const user = await this.currentUser();
      if (!user) return { error: { message: 'Du skal være logget ind.' } };
      // seller_id sættes serverside-agtigt: RLS afviser alt andet end auth.uid()
      return c.from('listings').insert({ ...listing, seller_id: user.id }).select().single();
    },

    /* Antal aktive annoncer for den indloggede bruger — bruges til at vise
       gratis-grænsen, før serveren afviser den. */
    async myActiveListingCount(){
      const c = init(); if (!c) return 0;
      const user = await this.currentUser();
      if (!user) return 0;
      const { count } = await c.from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', user.id).eq('status', 'active');
      return count || 0;
    },

    /* Starter Stripe-betalingen: kalder create-checkout-funktionen, som
       returnerer en URL til Stripes hostede checkout. */
    async startCheckout(){
      const c = init(); if (!c) return { error: { message: 'Backend er ikke konfigureret.' } };
      return c.functions.invoke('create-checkout', { body: {} });
    },

    /* Åbner Stripes kundeportal, hvor forhandleren selv kan opsige, skifte
       kort og se kvitteringer. */
    async openBillingPortal(){
      const c = init(); if (!c) return { error: { message: 'Backend er ikke konfigureret.' } };
      return c.functions.invoke('create-portal', { body: {} });
    },

    /* DEV: skift egen plan uden betaling. Kun til test indtil Stripe er koblet
       på — funktionen fjernes fra databasen før lancering. */
    async devSetPlan(plan){
      const c = init(); if (!c) return { error: { message: 'Backend er ikke konfigureret.' } };
      return c.rpc('dev_set_plan', { p_plan: plan });
    },

    async updateListing(id, patch){
      const c = init(); if (!c) return { error: { message: 'Backend er ikke konfigureret.' } };
      // Ingen ejer-tjek nødvendig i klienten — RLS afviser fremmede rækker.
      return c.from('listings').update(patch).eq('id', id).select().single();
    },

    /* Sletter annoncen OG dens billedfiler.

       listing_photos-rækkerne forsvinder af sig selv (fremmednøgle med
       on delete cascade), men filerne i storage gjorde ikke — de blev
       liggende for evigt og kostede lagerplads for billeder, ingen kunne se.
       Målt: efter en slettet annonce svarede fotoets offentlige URL stadig 200.

       Rækken slettes først. RLS afgør dér, om man overhovedet må slette
       annoncen; går det galt, har vi ikke rørt filerne. Fejler oprydningen
       bagefter, står vi tilbage med en forældreløs fil frem for en række,
       der peger på ingenting. */
    async deleteListing(id){
      const c = init(); if (!c) return { error: { message: 'Backend er ikke konfigureret.' } };

      const { data: fotos } = await c.from('listing_photos').select('storage_path').eq('listing_id', id);
      const { error } = await c.from('listings').delete().eq('id', id);
      if (error) return { error };

      const stier = (fotos || []).map(f => f.storage_path).filter(Boolean);
      if (stier.length){
        const { error: filFejl } = await c.storage.from('listing-photos').remove(stier);
        // Annoncen ER væk for brugeren; en fil der ikke kunne fjernes må ikke
        // få sletningen til at se mislykket ud.
        if (filFejl) console.warn('Annoncen er slettet, men billedfilerne blev ikke ryddet:', filFejl.message);
      }
      return { error: null };
    },

    /* ---------- Statistik ---------- */

    /* Tæller en visning eller en kontaktafsløring. Fejl sluges bevidst:
       et statistikkald må aldrig ødelægge siden for den besøgende. */
    async recordListingEvent(listingId, kind){
      const c = init(); if (!c || !isUuid(listingId)) return;
      const { error } = await c.rpc('record_listing_event', { p_listing: listingId, p_kind: kind });
      if (error) console.debug('Statistik ikke registreret:', error.message);
    },

    /* Dagstotaler for brugerens egne annoncer. RLS sørger for, at man kun
       får sine egne — der er ingen grund til at filtrere i klienten. */
    async myListingStats(days = 30){
      const c = init(); if (!c) return { data: [], error: null };
      const fra = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);
      return c.from('listing_stats').select('*').gte('stat_day', fra).order('stat_day', { ascending: true });
    },

    async myListingSaves(){
      const c = init(); if (!c) return { data: [], error: null };
      return c.rpc('my_listing_saves');
    },

    /* ---------- Billeder ---------- */
    async uploadListingPhoto(listingId, file, position = 0){
      const c = init(); if (!c) return { error: { message: 'Backend er ikke konfigureret.' } };
      const user = await this.currentUser();
      if (!user) return { error: { message: 'Du skal være logget ind.' } };

      const invalid = validateImage(file);
      if (invalid) return { error: { message: invalid } };

      let clean;
      try { clean = await stripExifAndResize(file); }
      catch (e) {
        /* Sig hvilken fil, og hvad sælgeren kan gøre. HEIC/HEIF er tilladt,
           men kun Safari kan afkode formatet — i Chrome og Firefox kaster
           createImageBitmap. "Billedet kunne ikke behandles." fortalte
           hverken hvilket af tolv billeder det var, eller at problemet har
           en løsning. */
        const heic = /heic|heif/i.test(billedType(file));
        return { error: { message: `"${file.name}" kunne ikke læses som billede.`
          + (heic ? ' HEIC-billeder fra iPhone virker ikke i alle browsere — gem det som JPG først.' : '') } };
      }

      // Mappen SKAL starte med brugerens id — storage-politikken kræver det.
      // Endelsen følger det, stripExifAndResize faktisk gav os (webp, eller
      // jpeg hvis browseren ikke kunne webp) — ellers serverer Supabase
      // filen med forkert Content-Type.
      const ext = clean.type === 'image/webp' ? 'webp' : 'jpg';
      const path = `${user.id}/${listingId}/${crypto.randomUUID()}.${ext}`;
      const up = await c.storage.from('listing-photos')
        .upload(path, clean, { contentType: clean.type, upsert: false });
      if (up.error) return { error: up.error };

      return c.from('listing_photos')
        .insert({ listing_id: listingId, storage_path: path, position })
        .select().single();
    },

    /* Fjerner ét billede fra en annonce. Rækken slettes først — RLS afviser
       den, hvis annoncen ikke er brugerens, og så rører vi ikke filen.
       Selve filen ryddes bagefter, så der ikke bliver betalt for lagerplads
       på billeder ingen kan se. */
    async deleteListingPhoto(photoId, storagePath){
      const c = init(); if (!c) return { error: { message: 'Backend er ikke konfigureret.' } };
      const { error } = await c.from('listing_photos').delete().eq('id', photoId);
      if (error) return { error };
      await c.storage.from('listing-photos').remove([storagePath]);
      return { error: null };
    },

    photoUrl(storagePath){
      const c = init(); if (!c || !storagePath) return null;
      return c.storage.from('listing-photos').getPublicUrl(storagePath).data.publicUrl;
    },

    /* ---------- Favoritter ----------
       Returnerer { ids, error } og ikke bare en liste. Forskellen er ikke
       kosmetisk: en tom liste fra en fejlet læsning så før ud præcis som
       "brugeren har ingen favoritter", og syncFavorites() i
       js/backend-bridge.js flettede den tomme liste ind i localStorage som
       om den var sandheden. Hjerterne slukkede, og "Gemte" stod tom.
       Rækkerne var der stadig i basen — det var visningen, der forsvandt,
       uden at nogen fik en fejlbesked.

       "Ingen session" er også en fejl her og ikke et tomt svar. Kaldes
       funktionen, når vi tror, brugeren er logget ind, og auth så svarer
       null, er der intet at flette MED — og en sammenfletning ud fra det
       ville slette lige så meget som en netværksfejl. */
    async listFavorites(){
      const c = init();
      if (!c) return { ids: [], error: { message: 'Backend er ikke konfigureret.' } };
      const user = await this.currentUser();
      if (!user) return { ids: [], error: { message: 'Ingen aktiv session — favoritterne kunne ikke læses.' } };
      const { data, error } = await c.from('favorites').select('listing_id').eq('user_id', user.id);
      if (error) return { ids: [], error };
      return { ids: (data || []).map(r => r.listing_id), error: null };
    },
    async addFavorite(listingId){
      const c = init(); if (!c) return { error: { message: 'Backend mangler.' } };
      const user = await this.currentUser();
      if (!user) return { error: { message: 'Log ind for at gemme annoncer på tværs af enheder.' } };
      return c.from('favorites').insert({ user_id: user.id, listing_id: listingId });
    },
    async removeFavorite(listingId){
      const c = init(); if (!c) return { error: { message: 'Backend mangler.' } };
      const user = await this.currentUser();
      if (!user) return { error: { message: 'Ikke logget ind.' } };
      return c.from('favorites').delete().eq('user_id', user.id).eq('listing_id', listingId);
    },

    /* ---------- Anmeldelser ---------- */
    async listReviews(sellerId){
      const c = init(); if (!c) return { data: [], error: null };
      return c.from('reviews')
        .select('*, author:public_profiles!reviews_author_id_fkey(name)')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });
    },
    async sellerRating(sellerId){
      const c = init(); if (!c) return null;
      const { data } = await c.from('seller_ratings').select('*').eq('seller_id', sellerId).maybeSingle();
      return data || null;
    },
    async addReview(sellerId, rating, comment){
      const c = init(); if (!c) return { error: { message: 'Backend mangler.' } };
      const user = await this.currentUser();
      if (!user) return { error: { message: 'Log ind for at skrive en anmeldelse.' } };
      if (user.id === sellerId) return { error: { message: 'Du kan ikke bedømme dig selv.' } };
      return c.from('reviews')
        .insert({ seller_id: sellerId, author_id: user.id, rating, comment })
        .select().single();
    },

    /* ---------- Søgeagenter ---------- */
    async listSavedSearches(){
      const c = init(); if (!c) return [];
      const user = await this.currentUser();
      if (!user) return [];
      const { data } = await c.from('saved_searches').select('*').eq('user_id', user.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    async addSavedSearch(query, label){
      const c = init(); if (!c) return { error: { message: 'Backend mangler.' } };
      const user = await this.currentUser();
      if (!user) return { error: { message: 'Log ind for at gemme en søgeagent.' } };
      return c.from('saved_searches').insert({ user_id: user.id, query, label }).select().single();
    },
    async removeSavedSearch(id){
      const c = init(); if (!c) return { error: { message: 'Backend mangler.' } };
      return c.from('saved_searches').delete().eq('id', id);
    },
    async setSavedSearchNotify(id, notify){
      const c = init(); if (!c) return { error: { message: 'Backend mangler.' } };
      return c.from('saved_searches').update({ notify }).eq('id', id);
    },

    /* ---------- Indberetninger ---------- */
    async addReport({ targetType, targetId, reason, comment }){
      const c = init(); if (!c) return { error: { message: 'Backend mangler.' } };
      const user = await this.currentUser();
      return c.from('reports').insert({
        reporter_id: user ? user.id : null,
        target_type: targetType, target_id: String(targetId), reason, comment: comment || '',
      });
    },

  };
})();
