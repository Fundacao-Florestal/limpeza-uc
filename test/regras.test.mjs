// Testes das regras do Firestore. Rode com: npm test (sobe o emulador sozinho; precisa de Java).
import { test, before, after, beforeEach } from "node:test";
import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs,
} from "firebase/firestore";

let env;

const ACESSOS = {
  adm: { Uid: "adm", Perfil: "admin" },
  gest: { Uid: "gest", Perfil: "gestor", UCs: ["PE Cantareira"] },
  gest2: { Uid: "gest2", Perfil: "gestor", UCs: ["PE Cantareira"] },
  ger: { Uid: "ger", Perfil: "gerente", Gerencias: ["GLN"] },
  gerS: { Uid: "gerS", Perfil: "gerente", Gerencias: ["GLS"] },
  val: { Uid: "val", Perfil: "validador" },
  fin: { Uid: "fin", Perfil: "final" },
};

const base = (o = {}) => ({
  ID: "CANT-01-ABC", UC: "PE Cantareira", Gerencia: "GLN", Estrutura: "Sede",
  AreaInterna: 200, Status: "Rascunho", CriadoPor: "gest", Hist: [], MotivoDevolucao: null,
  AtualizadoEm: "2026-10-14T00:00:00.000Z", ...o,
});

const db = (uid, verificado = true) =>
  uid
    ? env.authenticatedContext(uid, { email: uid + "@ff.test", email_verified: verificado }).firestore()
    : env.unauthenticatedContext().firestore();

async function seed(id, data) {
  await env.withSecurityRulesDisabled(async (c) => setDoc(doc(c.firestore(), "estruturas", id), data));
}

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-limpeza-uc",
    firestore: { rules: readFileSync(new URL("../firestore.rules", import.meta.url), "utf8") },
  });
});
after(async () => env && env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (c) => {
    for (const [uid, a] of Object.entries(ACESSOS)) await setDoc(doc(c.firestore(), "acessos", uid), a);
  });
});

test("sem login não lê nada", async () => {
  await seed("e1", base());
  await assertFails(getDoc(doc(db(null), "estruturas", "e1")));
  await assertFails(getDoc(doc(db(null), "config", "valores")));
});

test("e-mail não confirmado entra, mas sem perfil só pede acesso", async () => {
  await seed("e1", base());
  await assertSucceeds(setDoc(doc(db("novo", false), "usuarios", "novo"), { Uid: "novo", Nome: "N", Email: "n@x", UltimoAcesso: "x" }));
  await assertSucceeds(setDoc(doc(db("novo", false), "pedidos", "novo"), { Uid: "novo", Perfil: "gestor", Obs: "", Em: "x" }));
  await assertSucceeds(getDoc(doc(db("novo", false), "config", "valores")));
  await assertFails(getDoc(doc(db("novo", false), "estruturas", "e1")));
  await assertFails(getDocs(collection(db("novo", false), "estruturas")));
  await assertFails(setDoc(doc(db("novo", false), "acessos", "novo"), { Uid: "novo", Perfil: "admin" }));
  await assertSucceeds(getDoc(doc(db("adm", false), "estruturas", "e1")));
});

test("gestor cria e edita só o que é dele, nas UCs dele", async () => {
  await assertSucceeds(setDoc(doc(db("gest"), "estruturas", "e1"), base()));
  await assertFails(setDoc(doc(db("gest"), "estruturas", "e2"), base({ ID: "X", UC: "PE Jaraguá" })));
  await assertFails(setDoc(doc(db("gest"), "estruturas", "e3"), base({ ID: "Y", CriadoPor: "outro" })));
  await assertFails(setDoc(doc(db("gest"), "estruturas", "e4"), base({ ID: "Z", Status: "Homologado" })));
  await assertSucceeds(setDoc(doc(db("gest"), "estruturas", "e1"), base({ Status: "Em validação" })));
  await assertFails(setDoc(doc(db("gest2"), "estruturas", "e1"), base({ CriadoPor: "gest2" })));
});

test("gestor não aprova o próprio diagnóstico, mas pode reabrir e excluir", async () => {
  await seed("e1", base({ Status: "Em validação" }));
  await assertFails(updateDoc(doc(db("gest"), "estruturas", "e1"), { Status: "Validado" }));
  await seed("e2", base({ ID: "B", Status: "Homologado" }));
  await assertSucceeds(updateDoc(doc(db("gest"), "estruturas", "e2"), { Status: "Em validação", AreaInterna: 250 }));
  await seed("e3", base({ ID: "C", Status: "Homologado" }));
  await assertSucceeds(updateDoc(doc(db("gest"), "estruturas", "e3"), { Excluido: true }));
  await assertFails(deleteDoc(doc(db("gest"), "estruturas", "e3")));
});

test("gestor lista só os próprios envios", async () => {
  await seed("e1", base());
  await seed("e2", base({ ID: "B", CriadoPor: "gest2" }));
  const own = await assertSucceeds(getDocs(query(collection(db("gest"), "estruturas"), where("CriadoPor", "==", "gest"))));
  if (own.size !== 1) throw new Error("esperava 1 documento, veio " + own.size);
  await assertFails(getDocs(collection(db("gest"), "estruturas")));
  await assertFails(getDoc(doc(db("gest"), "estruturas", "e2")));
});

test("gerente lê só a própria Gerência e só muda o andamento", async () => {
  await seed("e1", base({ Status: "Em validação" }));
  await seed("e2", base({ ID: "S", Gerencia: "GLS", Status: "Em validação" }));
  const r = await assertSucceeds(getDocs(query(collection(db("ger"), "estruturas"), where("Gerencia", "==", "GLN"))));
  if (r.size !== 1) throw new Error("esperava 1 documento, veio " + r.size);
  await assertFails(getDocs(collection(db("ger"), "estruturas")));
  await assertFails(getDoc(doc(db("ger"), "estruturas", "e2")));
  await assertFails(updateDoc(doc(db("ger"), "estruturas", "e1"), { Status: "Validado", AreaInterna: 1 }));
  await assertFails(updateDoc(doc(db("ger"), "estruturas", "e1"), { Status: "Homologado" }));
  await assertFails(updateDoc(doc(db("gerS"), "estruturas", "e1"), { Status: "Validado" }));
  await assertSucceeds(updateDoc(doc(db("ger"), "estruturas", "e1"), { Status: "Validado", Hist: [{ para: "Validado" }] }));
  await assertFails(updateDoc(doc(db("ger"), "estruturas", "e1"), { Status: "Devolvido" }));
});

test("gerente devolve com motivo", async () => {
  await seed("e1", base({ Status: "Em validação" }));
  await assertSucceeds(updateDoc(doc(db("ger"), "estruturas", "e1"), { Status: "Devolvido", MotivoDevolucao: "Faltou área" }));
});

test("validador só faz a validação final de algo aprovado", async () => {
  await seed("e1", base({ Status: "Validado" }));
  await seed("e2", base({ ID: "R", Status: "Rascunho" }));
  const r = await assertSucceeds(getDocs(query(collection(db("val"), "estruturas"), where("Status", "==", "Validado"))));
  if (r.size !== 1) throw new Error("esperava 1 documento, veio " + r.size);
  await assertFails(getDocs(query(collection(db("val"), "estruturas"), where("Status", "==", "Rascunho"))));
  await assertFails(getDoc(doc(db("val"), "estruturas", "e2")));
  await assertFails(updateDoc(doc(db("val"), "estruturas", "e1"), { Status: "Homologado", ValorMensal: 0 }));
  await assertSucceeds(updateDoc(doc(db("val"), "estruturas", "e1"), { Status: "Homologado" }));
});

test("usuário final lê apenas o homologado e não grava", async () => {
  await seed("e1", base({ Status: "Homologado" }));
  await seed("e2", base({ ID: "V", Status: "Validado" }));
  await assertSucceeds(getDocs(query(collection(db("fin"), "estruturas"), where("Status", "==", "Homologado"))));
  await assertFails(getDoc(doc(db("fin"), "estruturas", "e2")));
  await assertFails(updateDoc(doc(db("fin"), "estruturas", "e1"), { Status: "Devolvido" }));
});

test("perfis: só o admin atribui; cada um lê o próprio acesso", async () => {
  await assertSucceeds(getDoc(doc(db("gest"), "acessos", "gest")));
  await assertFails(getDoc(doc(db("gest"), "acessos", "ger")));
  await assertFails(setDoc(doc(db("gest"), "acessos", "gest"), { Uid: "gest", Perfil: "admin" }));
  await assertFails(setDoc(doc(db("novo"), "acessos", "novo"), { Uid: "novo", Perfil: "admin" }));
  await assertSucceeds(setDoc(doc(db("adm"), "acessos", "novo"), { Uid: "novo", Perfil: "gestor", UCs: [] }));
  await assertSucceeds(getDocs(collection(db("adm"), "acessos")));
});

test("pedido de acesso: só quem não tem perfil, só para si", async () => {
  const p = { Uid: "novo", Perfil: "gestor", Obs: "PE Cantareira", Em: "2026-10-14" };
  await assertSucceeds(setDoc(doc(db("novo"), "pedidos", "novo"), p));
  await assertFails(setDoc(doc(db("novo"), "pedidos", "outro"), { ...p, Uid: "outro" }));
  await assertFails(setDoc(doc(db("novo2"), "pedidos", "novo2"), { ...p, Uid: "novo2", Perfil: "admin" }));
  await assertFails(setDoc(doc(db("gest"), "pedidos", "gest"), { ...p, Uid: "gest" }));
  await assertFails(getDocs(collection(db("novo"), "pedidos")));
  await assertSucceeds(getDocs(collection(db("adm"), "pedidos")));
});

test("parâmetros e tabela: todos leem, só o admin grava", async () => {
  await assertSucceeds(getDoc(doc(db("fin"), "config", "valores")));
  await assertFails(setDoc(doc(db("ger"), "config", "valores"), { Fator: 2 }));
  await assertSucceeds(setDoc(doc(db("adm"), "config", "valores"), { Fator: 2 }));
});

test("usuarios: cada um grava só o próprio cadastro", async () => {
  const u = { Uid: "gest", Nome: "Ana", Email: "ana@x", UltimoAcesso: "2026-10-14" };
  await assertSucceeds(setDoc(doc(db("gest"), "usuarios", "gest"), u));
  await assertFails(setDoc(doc(db("gest"), "usuarios", "ger"), { ...u, Uid: "ger" }));
  await assertFails(setDoc(doc(db("gest"), "usuarios", "gest"), { ...u, Perfil: "admin" }));
});
