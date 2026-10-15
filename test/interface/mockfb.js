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

  // Contas de e-mail e senha em memória.
  const accounts = new Map(); // email -> {uid, pwd, displayName, emailVerified}
  const mail = []; // e-mails "enviados": {tipo, para}
  let user = null, seq = 0; const authSubs = new Set();
  const err = (code) => { const e = new Error(code); e.code = code; return e; };
  function makeUser(a, email) {
    return {
      uid: a.uid, email, get displayName() { return a.displayName; }, get emailVerified() { return a.emailVerified; },
      updateProfile: async (p) => { if (p.displayName != null) a.displayName = p.displayName; },
      sendEmailVerification: async () => { mail.push({ tipo: "verificacao", para: email }); },
      reload: async () => { user = makeUser(a, email); },
      getIdToken: async () => "token",
    };
  }
  const fire = () => authSubs.forEach((f) => f(user));
  const auth = {
    get currentUser() { return user; },
    useEmulator() {}, useDeviceLanguage() {},
    onAuthStateChanged: (f) => { authSubs.add(f); setTimeout(() => f(user), 0); return () => authSubs.delete(f); },
    signInWithEmailAndPassword: async (email, pwd) => {
      const a = accounts.get(String(email).toLowerCase());
      if (!a || a.pwd !== pwd) throw err("auth/invalid-credential");
      user = makeUser(a, email); fire(); return { user };
    },
    createUserWithEmailAndPassword: async (email, pwd) => {
      email = String(email).toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw err("auth/invalid-email");
      if (accounts.has(email)) throw err("auth/email-already-in-use");
      if (String(pwd).length < 6) throw err("auth/weak-password");
      const a = { uid: "u" + (++seq), pwd, displayName: null, emailVerified: false };
      accounts.set(email, a); user = makeUser(a, email); fire(); return { user };
    },
    sendPasswordResetEmail: async (email) => { if (accounts.has(String(email).toLowerCase())) mail.push({ tipo: "senha", para: email }); },
    signOut: async () => { user = null; fire(); },
  };
  const authFn = () => auth;

  window.firebase = { initializeApp: () => ({}), auth: authFn, firestore: () => fs };
  window.__mock = {
    store, emit, log, mail,
    seed: (p, d) => { store.set(p, clone(d)); emit(); },
    get: (p) => (store.has(p) ? clone(store.get(p)) : null),
    addUser: (uid, email, pwd, nome) => accounts.set(email, { uid, pwd, displayName: nome, emailVerified: true }),
    verify: (email) => { accounts.get(email).emailVerified = true; },
  };
})();
