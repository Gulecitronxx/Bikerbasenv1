/* ============ Local persistence ============ */
const Store = {
  KEYS: {
    favorites: 'bb_favorites', myListings: 'bb_my_listings', theme: 'bb_theme', user: 'bb_user', draft: 'bb_draft',
    reviews: 'bb_reviews', reports: 'bb_reports', cookieConsent: 'bb_cookie_consent',
  },

  getFavorites(){
    try { return JSON.parse(localStorage.getItem(this.KEYS.favorites)) || []; } catch(e){ return []; }
  },
  isFavorite(id){ return this.getFavorites().includes(id); },
  toggleFavorite(id){
    let favs = this.getFavorites();
    if (favs.includes(id)) favs = favs.filter(f => f !== id);
    else favs.push(id);
    localStorage.setItem(this.KEYS.favorites, JSON.stringify(favs));
    document.dispatchEvent(new CustomEvent('bb:favorites-changed', { detail: favs }));
    return favs.includes(id);
  },

  getMyListings(){
    try { return JSON.parse(localStorage.getItem(this.KEYS.myListings)) || []; } catch(e){ return []; }
  },
  addMyListing(listing){
    const mine = this.getMyListings();
    mine.unshift(listing);
    localStorage.setItem(this.KEYS.myListings, JSON.stringify(mine));
    return mine;
  },
  removeMyListing(id){
    const mine = this.getMyListings().filter(l => l.id !== id);
    localStorage.setItem(this.KEYS.myListings, JSON.stringify(mine));
    return mine;
  },

  getAllListings(){
    return [...this.getMyListings(), ...LISTINGS];
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
