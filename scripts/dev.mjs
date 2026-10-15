// Modo local com hot reload: sobe os emuladores e avisa o navegador quando algo em public/ muda.
// Mudança em .css troca só o estilo; qualquer outra recarrega a página.
// O aviso vai por http://localhost:35729 (Server-Sent Events); o trecho que escuta fica no index.html.
// Também cria no emulador a conta de desenvolvimento (Administrador, e-mail já confirmado), com a qual o app entra sozinho.
import { spawn } from "node:child_process";
import { readdirSync, statSync, watch } from "node:fs";
import { join } from "node:path";
import { createServer } from "node:http";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const PORTA = 35729;
const clientes = new Set();

createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Access-Control-Allow-Origin": "*",
  });
  res.write(": ok\n\n");
  clientes.add(res);
  req.on("close", () => clientes.delete(res));
}).listen(PORTA);

// O macOS (sobretudo com iCloud) avisa "change" até quando o arquivo só é lido, e cada recarga lê o index.html de novo.
// Por isso só conta como mudança se a data de modificação mudou de fato.
const versoes = new Map();
const versao = (arquivo) => { try { return statSync(join("public", arquivo)).mtimeMs; } catch { return null; } };
for (const a of readdirSync("public", { recursive: true })) versoes.set(a, versao(a));

let espera;
const mudados = new Set();
watch("public", { recursive: true }, (_evento, arquivo) => {
  if (!arquivo || arquivo.split(/[\\/]/).some((p) => p.startsWith("."))) return;
  const v = versao(arquivo);
  if (versoes.get(arquivo) === v) return;
  versoes.set(arquivo, v);
  mudados.add(arquivo);
  clearTimeout(espera);
  espera = setTimeout(() => {
    const soCss = [...mudados].every((a) => a.endsWith(".css"));
    console.log(`[hot reload] ${[...mudados].join(", ")}`);
    mudados.clear();
    for (const c of clientes) c.write(`data: ${soCss ? "css" : "reload"}\n\n`);
  }, 100);
});

const emuladores = spawn("firebase", ["emulators:start", "--project", "demo-limpeza-uc"], { stdio: "inherit" });
// Ctrl+C chega também aos emuladores; espera eles fecharem antes de sair.
process.on("SIGINT", () => {});
process.on("SIGTERM", () => emuladores.kill("SIGTERM"));
emuladores.on("exit", (codigo) => process.exit(codigo ?? 0));

// Mesmos dados de DEV_LOGIN em js/dados/firebase.js.
const DEV = { email: "dev@sp.gov.br", senha: "dev-local-123", nome: "Dev (local)" };
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";

async function pronto(url) {
  for (;;) {
    try { await fetch(url); return; } catch { await new Promise((r) => setTimeout(r, 500)); }
  }
}
async function contaDev() {
  await Promise.all([pronto("http://127.0.0.1:9099/"), pronto("http://127.0.0.1:8080/")]);
  initializeApp({ projectId: "demo-limpeza-uc" });
  const auth = getAuth();
  const u = await auth.getUserByEmail(DEV.email).catch(() =>
    auth.createUser({ email: DEV.email, password: DEV.senha, displayName: DEV.nome, emailVerified: true }));
  await getFirestore().doc("acessos/" + u.uid).set({ Uid: u.uid, Perfil: "admin", UCs: [], Gerencias: [], Por: "dev", Em: new Date().toISOString() });
  console.log(`[dev] Entrando como ${DEV.email} (Administrador). Use "Ver como" no topo para ver como Gestor.`);
}
contaDev().catch((e) => console.error("[dev] Não foi possível criar a conta de desenvolvimento:", e.message));
