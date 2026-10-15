// Firebase "compat" em memória, só para testar a ligação da interface (não aplica regras de segurança).
(function () {
  const store = new Map(); // caminho -> dados
  const subs = new Set();
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const emit = () => subs.forEach((f) => { try { f(); } catch (e) { console.error(e); } });
  const docSnap = (path) => ({ exists: store.has(path), id: path.split("/").pop(), data: () => (store.has(path) ? clone(store.get(path)) : undefined) });
  const merge = (a, b) => { const o = { ...a }; for (const k in b) { const v = b[k]; o[k] = v && typeof v === "object" && !Array.isArray(v) && o[k] && typeof o[k] === "object" ? merge(o[k], v) : v; } return o; };
  const log = [];

  function docRef(path) {
    return {
      path,
      get: async () => docSnap(path),
      set: async (d, opt) => { log.push(["set", path]); store.set(path, opt && opt.merge && store.has(path) ? merge(store.get(path), clone(d)) : clone(d)); emit(); },
      update: async (d) => { if (!store.has(path)) throw { code: "not-found" }; store.set(path, merge(store.get(path), clone(d))); emit(); },
      delete: async () => { store.delete(path); emit(); },
      onSnapshot: (ok) => { const f = () => ok(docSnap(path)); subs.add(f); setTimeout(f, 0); return () => subs.delete(f); },
    };
  }
  function queryRef(col, filters) {
    const run = () => [...store.keys()]
      .filter((p) => p.startsWith(col + "/") && p.split("/").length === 2)
      .filter((p) => filters.every(([f, op, v]) => { const x = store.get(p)[f]; return op === "==" ? x === v : op === "in" ? v.includes(x) : false; }))
      .map((p) => docSnap(p));
    return {
      where: (f, op, v) => { log.push(["where", col, f, op, v]); return queryRef(col, [...filters, [f, op, v]]); },
      get: async () => ({ docs: run() }),
      onSnapshot: (ok) => { const f = () => ok({ docs: run() }); subs.add(f); setTimeout(f, 0); return () => subs.delete(f); },
    };
  }
  const fs = { doc: (p) => docRef(p), collection: (c) => queryRef(c, []), useEmulator() {} };

  let user = null; const authSubs = new Set();
  const auth = {
    get currentUser() { return user; },
    useEmulator() {},
    getRedirectResult: async () => ({ user: null }),
    onAuthStateChanged: (f) => { authSubs.add(f); setTimeout(() => f(user), 0); return () => authSubs.delete(f); },
    signInWithPopup: async (prov) => { user = clone(window.__nextUser); window.__lastProvider = prov; authSubs.forEach((f) => f(user)); return { user }; },
    signInWithRedirect: async () => {},
    signOut: async () => { user = null; authSubs.forEach((f) => f(null)); },
  };
  function OAuthProvider(id) { this.providerId = id; this.setCustomParameters = (p) => { this.params = p; }; }
  function GoogleAuthProvider() { OAuthProvider.call(this, "google.com"); }
  const authFn = () => auth; authFn.OAuthProvider = OAuthProvider; authFn.GoogleAuthProvider = GoogleAuthProvider;

  window.firebase = { initializeApp: () => ({}), auth: authFn, firestore: () => fs };
  window.__mock = { store, emit, log, seed: (p, d) => { store.set(p, clone(d)); emit(); }, get: (p) => (store.has(p) ? clone(store.get(p)) : null) };
})();
