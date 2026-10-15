#!/usr/bin/env node
// Importa para o Firestore os diagnósticos exportados da versão anterior (botão "Exportar CSV (modelo)" da aba Registros).
//
// Uso:
//   node scripts/importar.mjs --csv exportacao.csv --chave chave-servico.json [--donos donos.csv] [--seco]
//
//   --csv     arquivo exportado (separador ";", decimais com vírgula)
//   --chave   chave de conta de serviço do projeto (Console > Configurações do projeto > Contas de serviço > Gerar nova chave privada).
//             Não commite esse arquivo.
//   --donos   opcional: CSV "UC;uid" dizendo de qual Gestor fica cada UC importada. Sem ele, os registros ficam com
//             CriadoPor = "importado" e aparecem para Administrador, Gerentes e Validador, mas não na lista do Gestor.
//   --seco    só mostra o que seria importado, sem gravar.
//
// Registros com o mesmo ID são substituídos, então rodar duas vezes não duplica nada.

import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const NUM = ["AreaInterna", "AreaExterna", "Dias", "Horas", "Pessoas", "Visitantes", "Pico", "Sazonalidade", "Sanitario", "Publico",
  "Vasos", "Mictorios", "Lavatorios", "Chuveiros", "AreaSanitaria", "HorasSan", "Reposicao", "Hospedaria", "Leitos", "Quartos",
  "Hospedes", "Trocas", "Lavanderia", "Residuos", "Lixeiras",
  "A_acarp", "A_lab", "A_almox", "A_ofic", "A_saguao", "A_pav", "A_varr", "A_patAlta", "A_patMedia", "A_patBaixa",
  "IUP", "IPS", "IH", "IR", "IHOS", "FatorExterno", "CargaTecnica", "ValorMensal"];
const STATUS = ["Rascunho", "Em validação", "Validado", "Homologado", "Devolvido"];

function args(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--seco") o.seco = true;
    else if (a.startsWith("--")) o[a.slice(2)] = argv[++i];
  }
  return o;
}

// CSV com ";" e aspas duplas, como o app exporta.
function parseCsv(text) {
  text = text.replace(/^﻿/, "");
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ";") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

const slug = (id) => String(id).trim().replace(/[^A-Za-z0-9_\-.~:@+]/g, "_").slice(0, 150);
const num = (v) => {
  const t = String(v ?? "").trim();
  if (t === "") return null;
  const n = Number(t.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

const o = args(process.argv.slice(2));
if (!o.csv || (!o.chave && !o.seco)) {
  console.error("Uso: node scripts/importar.mjs --csv exportacao.csv --chave chave-servico.json [--donos donos.csv] [--seco]");
  process.exit(1);
}

const [head, ...linhas] = parseCsv(readFileSync(o.csv, "utf8"));
if (!head || !head.includes("ID") || !head.includes("UC")) {
  console.error("O CSV não tem as colunas ID e UC. Use o \"Exportar CSV (modelo)\" da aba Registros da versão anterior.");
  process.exit(1);
}

const donos = new Map();
if (o.donos) {
  for (const [uc, uid] of parseCsv(readFileSync(o.donos, "utf8"))) {
    if (uc && uid && uc.trim() !== "UC") donos.set(uc.trim(), uid.trim());
  }
}

const agora = new Date().toISOString();
const docs = [], problemas = [];
for (const [n, cols] of linhas.entries()) {
  const r = {};
  head.forEach((k, i) => {
    const v = cols[i] ?? "";
    r[k] = NUM.includes(k) ? num(v) : String(v).trim();
  });
  if (!r.ID) { problemas.push(`linha ${n + 2}: sem ID, ignorada`); continue; }
  if (!STATUS.includes(r.Status)) { problemas.push(`linha ${n + 2} (${r.ID}): status "${r.Status}" desconhecido, importado como Rascunho`); r.Status = "Rascunho"; }
  Object.assign(r, {
    CriadoPor: donos.get(r.UC) || "importado",
    Revisao: 1,
    Exemplo: false,
    MotivoDevolucao: null,
    ValorJSON: null,
    ParamsJSON: null,
    AtualizadoEm: agora,
    Hist: [{ de: null, para: r.Status, por: "importacao", em: agora, motivo: "Importado da versão anterior" }],
  });
  docs.push(r);
}

const porStatus = docs.reduce((a, d) => ((a[d.Status] = (a[d.Status] || 0) + 1), a), {});
console.log(`${docs.length} estruturas lidas de ${o.csv}`);
console.log("Por situação:", porStatus);
console.log(`Com Gestor definido: ${docs.filter((d) => d.CriadoPor !== "importado").length}; sem Gestor: ${docs.filter((d) => d.CriadoPor === "importado").length}`);
problemas.forEach((p) => console.warn("Aviso:", p));

if (o.seco) {
  console.log("Modo --seco: nada foi gravado. Exemplo do primeiro registro:");
  console.log(JSON.stringify(docs[0], null, 2));
  process.exit(0);
}

initializeApp({ credential: cert(JSON.parse(readFileSync(o.chave, "utf8"))) });
const db = getFirestore();
for (let i = 0; i < docs.length; i += 400) {
  const lote = db.batch();
  docs.slice(i, i + 400).forEach((d) => lote.set(db.collection("estruturas").doc(slug(d.ID)), d));
  await lote.commit();
}
console.log(`Importação concluída: ${docs.length} estruturas gravadas em "estruturas".`);
