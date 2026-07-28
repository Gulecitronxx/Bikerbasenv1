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
  async function stripExifAndResize(file, maxEdge = 1800, quality = 0.85){
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
    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', quality));
    if (!blob) throw new Error('Billedet kunne ikke behandles.');
    return blob;
  }

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
  const MAX_BYTES = 12 * 1024 * 1024; // 12 MB før komprimering

  function validateImage(file){
    if (!ALLOWED_TYPES.includes(file.type)) return 'Filtypen understøttes ikke. Brug JPG, PNG eller WebP.';
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
        .select('*, seller:public_profiles!listings_seller_id_fkey(*), photos:listing_photos(storage_path, position)')
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

    async getListing(id){
      const c = init(); if (!c) return { data: null, error: null };
      return c.from('listings')
        // Nøglen navngives eksplicit: efter at favorites kom til, findes der
        // to mulige veje fra listings til public_profiles, og PostgREST
        // afviser forespørgslen (PGRST201) hvis man ikke peger på den rigtige.
        .select('*, seller:public_profiles!listings_seller_id_fkey(*), photos:listing_photos(storage_path, position)')
        .eq('id', id).single();
    },

    async myListings(){
      const c = init(); if (!c) return { data: [], error: null };
      const user = await this.currentUser();
      if (!user) return { data: [], error: null };
      return c.from('listings')
        .select('*, photos:listing_photos(storage_path, position)')
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

    async updateListing(id, patch){
      const c = init(); if (!c) return { error: { message: 'Backend er ikke konfigureret.' } };
      // Ingen ejer-tjek nødvendig i klienten — RLS afviser fremmede rækker.
      return c.from('listings').update(patch).eq('id', id).select().single();
    },

    async deleteListing(id){
      const c = init(); if (!c) return { error: { message: 'Backend er ikke konfigureret.' } };
      return c.from('listings').delete().eq('id', id);
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
      catch (e) { return { error: { message: 'Billedet kunne ikke behandles.' } }; }

      // Mappen SKAL starte med brugerens id — storage-politikken kræver det.
      const path = `${user.id}/${listingId}/${crypto.randomUUID()}.jpg`;
      const up = await c.storage.from('listing-photos')
        .upload(path, clean, { contentType: 'image/jpeg', upsert: false });
      if (up.error) return { error: up.error };

      return c.from('listing_photos')
        .insert({ listing_id: listingId, storage_path: path, position })
        .select().single();
    },

    photoUrl(storagePath){
      const c = init(); if (!c || !storagePath) return null;
      return c.storage.from('listing-photos').getPublicUrl(storagePath).data.publicUrl;
    },

    /* ---------- Favoritter ---------- */
    async listFavorites(){
      const c = init(); if (!c) return [];
      const user = await this.currentUser();
      if (!user) return [];
      const { data } = await c.from('favorites').select('listing_id').eq('user_id', user.id);
      return (data || []).map(r => r.listing_id);
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

    async deleteListingPhoto(photoId, storagePath){
      const c = init(); if (!c) return { error: { message: 'Backend er ikke konfigureret.' } };
      await c.storage.from('listing-photos').remove([storagePath]);
      return c.from('listing_photos').delete().eq('id', photoId);
    },
  };
})();
