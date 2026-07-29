/* ============ Local persistence ============ */
const Store = {
  KEYS: {
    favorites: 'bb_favorites', myListings: 'bb_my_listings', theme: 'bb_theme', user: 'bb_user', draft: 'bb_draft',
    reviews: 'bb_reviews', reports: 'bb_reports', cookieConsent: 'bb_cookie_consent',
    savedSearches: 'bb_saved_searches', viewMode: 'bb_view_mode', recentSearches: 'bb_recent_searches',
  },

  getFavorites(){
    try { return JSON.parse(localStorage.getItem(this.KEYS.favorites)) || []; } catch(e){ return []; }
  },
  isFavorite(id){ return this.getFavorites().includes(id); },
  /* Synkron af hensyn til UI'et; skrivningen til databasen sker i baggrunden,
     så hjertet reagerer med det samme. */
  toggleFavorite(id){
    // Sikkerhedsnet: knappen skjules på egne annoncer, men DOM kan manipuleres.
    const target = this.getAllListings().find(l => String(l.id) === String(id));
    if (target && typeof isOwnListing === 'function' && isOwnListing(target)){
      if (typeof toast === 'function') toast('Du kan ikke gemme din egen annonce');
      return this.isFavorite(id);
    }

    let favs = this.getFavorites();
    const nowFavorite = !favs.includes(id);
    favs = nowFavorite ? [...favs, id] : favs.filter(f => f !== id);
    localStorage.setItem(this.KEYS.favorites, JSON.stringify(favs));
    document.dispatchEvent(new CustomEvent('bb:favorites-changed', { detail: favs }));

    if (isUuid(id) && typeof db !== 'undefined' && db.enabled && this.getUser()?.remote){
      (nowFavorite ? db.addFavorite(id) : db.removeFavorite(id))
        .then(r => { if (r?.error) console.warn('Favorit blev ikke gemt i databasen:', r.error.message); });
    }
    return nowFavorite;
  },

  /* Annoncer der kun ligger i browseren. Stammer fra tiden før databasen og
     bruges stadig, hvis backend ikke er sat op. */
  getLocalListings(){
    try { return JSON.parse(localStorage.getItem(this.KEYS.myListings)) || []; } catch(e){ return []; }
  },

  /* Brugerens egne annoncer.

     Efter annoncerne flyttede til Supabase kiggede denne kun i localStorage,
     så "Mine annoncer" stod tom selv når man havde annoncer i databasen.
     Nu samles begge kilder. */
  getMyListings(){
    const local = this.getLocalListings();
    const user = this.getUser();
    if (!user?.remote) return local;
    const mine = (window.REMOTE_LISTINGS || []).filter(l => l.seller?.id === user.id);
    return [...mine, ...local];
  },
  addMyListing(listing){
    const mine = this.getLocalListings();
    mine.unshift(listing);
    localStorage.setItem(this.KEYS.myListings, JSON.stringify(mine));
    return mine;
  },
  removeMyListing(id){
    const mine = this.getLocalListings().filter(l => String(l.id) !== String(id));
    localStorage.setItem(this.KEYS.myListings, JSON.stringify(mine));
    return mine;
  },

  /* Rigtige annoncer fra databasen først, derefter lokale kladder og til sidst
     demodataene — så et nyt site ikke ser tomt ud, mens databasen fyldes op.
     Her bruges getLocalListings, ellers ville brugerens egne databaseannoncer
     tælle med to gange. */
  getAllListings(){
    const remote = window.REMOTE_LISTINGS || [];
    return [...remote, ...this.getLocalListings(), ...LISTINGS];
  },
  getListingById(id){
    return this.getAllListings().find(l => String(l.id) === String(id));
  },

  getTheme(){ return localStorage.getItem(this.KEYS.theme); },
  setTheme(t){ localStorage.setItem(this.KEYS.theme, t); },

  getUser(){
    try { return JSON.parse(localStorage.getItem(this.KEYS.user)); } catch(e){ return null; }
  },
  setUser(u){ localStorage.setItem(this.KEYS.user, JSON.stringify(u)); },
  logout(){ localStorage.removeItem(this.KEYS.user); },

  saveDraft(step, data){
    const draft = this.getDraft();
    draft[step] = data;
    localStorage.setItem(this.KEYS.draft, JSON.stringify(draft));
  },
  getDraft(){
    try { return JSON.parse(localStorage.getItem(this.KEYS.draft)) || {}; } catch(e){ return {}; }
  },
  clearDraft(){ localStorage.removeItem(this.KEYS.draft); },

  /* ============ Reviews ============ */
  getLiveReviews(sellerKey){
    try {
      const all = JSON.parse(localStorage.getItem(this.KEYS.reviews)) || {};
      return all[sellerKey] || [];
    } catch(e){ return []; }
  },
  getReviews(sellerKey){
    const seeded = (typeof SEED_REVIEWS !== 'undefined' && SEED_REVIEWS[sellerKey]) || [];
    return [...this.getLiveReviews(sellerKey), ...seeded].sort((a,b) => new Date(b.date) - new Date(a.date));
  },
  addReview(sellerKey, review){
    let all;
    try { all = JSON.parse(localStorage.getItem(this.KEYS.reviews)) || {}; } catch(e){ all = {}; }
    all[sellerKey] = all[sellerKey] || [];
    all[sellerKey].unshift(review);
    localStorage.setItem(this.KEYS.reviews, JSON.stringify(all));
  },
  getAverageRating(sellerKey, fallback){
    const reviews = this.getReviews(sellerKey);
    if (!reviews.length) return fallback ?? null;
    const avg = reviews.reduce((s,r) => s + Number(r.rating), 0) / reviews.length;
    return Math.round(avg * 10) / 10;
  },

  /* ============ Reports (notice-and-action) ============ */
  addReport(report){
    let reports = [];
    try { reports = JSON.parse(localStorage.getItem(this.KEYS.reports)) || []; } catch(e){}
    reports.unshift({ ...report, id: Date.now(), createdAt: new Date().toISOString(), status: 'Afventer gennemgang' });
    localStorage.setItem(this.KEYS.reports, JSON.stringify(reports));
  },

  /* ============ Cookie consent (GDPR) ============ */
  getCookieConsent(){
    try { return JSON.parse(localStorage.getItem(this.KEYS.cookieConsent)); } catch(e){ return null; }
  },
  setCookieConsent(level){
    localStorage.setItem(this.KEYS.cookieConsent, JSON.stringify({ level, date: new Date().toISOString() }));
  },

  /* ============ Saved searches (søgeagenter) ============ */
  getSavedSearches(){
    try { return JSON.parse(localStorage.getItem(this.KEYS.savedSearches)) || []; } catch(e){ return []; }
  },
  addSavedSearch(search){
    const all = this.getSavedSearches();
    if (all.some(s => s.query === search.query)) return { added: false, all };
    all.unshift({ ...search, id: Date.now(), createdAt: new Date().toISOString(), notify: true });
    localStorage.setItem(this.KEYS.savedSearches, JSON.stringify(all));
    return { added: true, all };
  },
  removeSavedSearch(id){
    const all = this.getSavedSearches().filter(s => s.id !== id);
    localStorage.setItem(this.KEYS.savedSearches, JSON.stringify(all));
    return all;
  },
  toggleSavedSearchNotify(id){
    const all = this.getSavedSearches().map(s => s.id === id ? { ...s, notify: !s.notify } : s);
    localStorage.setItem(this.KEYS.savedSearches, JSON.stringify(all));
    return all;
  },

  /* Seneste søgninger — kun lokalt, vises som genveje på forsiden. */
  getRecentSearches(){
    try { return JSON.parse(localStorage.getItem(this.KEYS.recentSearches)) || []; } catch(e){ return []; }
  },
  addRecentSearch(query, label){
    if (!query) return;
    let all = this.getRecentSearches().filter(s => s.query !== query);
    all.unshift({ query, label, at: Date.now() });
    localStorage.setItem(this.KEYS.recentSearches, JSON.stringify(all.slice(0, 5)));
  },

  getViewMode(){ return localStorage.getItem(this.KEYS.viewMode) || 'grid'; },
  setViewMode(m){ localStorage.setItem(this.KEYS.viewMode, m); },

  /* ============ GDPR self-service erasure ============ */
  deleteAllData(){
    Object.values(this.KEYS).forEach(k => localStorage.removeItem(k));
  },
};

function initTheme(){
  const saved = Store.getTheme();
  if (saved) document.documentElement.setAttribute('data-theme', saved);
}
function toggleTheme(){
  const current = document.documentElement.getAttribute('data-theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  Store.setTheme(next);
}
initTheme();
