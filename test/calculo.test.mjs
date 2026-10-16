// Testes da validação do formulário e do cálculo do valor (sem navegador, sem Firebase).
// Rode com: node --test test/calculo.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const ctx = { console, document: { querySelector: () => null }, window: {} };
vm.createContext(ctx);
for (const f of ["nucleo/util", "nucleo/constantes", "dados/ucs", "regras/valor-referencial", "regras/indicadores"]) {
  vm.runInContext(readFileSync(new URL(`../public/js/${f}.js`, import.meta.url), "utf8"), ctx);
}
const { check, calc, valorar, VDEF, DEF } = vm.runInContext("({check,calc,valorar,VDEF,DEF})", ctx);

// Estrutura completa e consistente: 1.000 m² internos (900 frio + 100 saguão), 2.000 m² externos.
const base = () => ({
  UC: "APA BANHADO", Gerencia: "GVPM", Estrutura: "Sede", Tipo: "Sede administrativa", Responsavel: "Ana", Categoria: "Estação Ecológica",
  AreaInterna: 1000, A_frio: 900, A_acarp: 0, A_lab: 0, A_almox: 0, A_ofic: 0, A_saguao: 100,
  AreaExterna: 2000, A_pav: 500, A_varr: 1500, A_patAlta: 0, A_patMedia: 0, A_patBaixa: 0,
  Dias: 5, Horas: 8, Pessoas: 2, Visitantes: 0, Pico: 0, Sazonalidade: 0,
  Sanitario: 0, Publico: 0, Vasos: 0, Mictorios: 0, Lavatorios: 0, Chuveiros: 0, AreaSanitaria: 0, HorasSan: 0, Reposicao: 0,
  Hospedaria: 0, Leitos: 0, Quartos: 0, Hospedes: 0, Trocas: 0, Lavanderia: 0, Residuos: 0, Lixeiras: 0,
  Vidros: 0, A_vidro: 0, VidroFreq: 0, VidroRisco: 0,
});
const erros = (r) => check(r, [], false);
const linhas = (r) => { const x = calc(r, DEF); return valorar({ ...r, ...x }, x, VDEF); };
const linha = (v, k) => v.linhas.find((l) => l.k === k);

test("registro consistente passa sem pendências", () => {
  const c = erros(base());
  assert.equal(c.blank.length, 0, String(c.blank));
  assert.equal(c.err.length, 0, String(c.err));
});

test("detalhamento interno menor que o total é barrado, com quanto falta", () => {
  const c = erros({ ...base(), A_frio: 800 });
  const e = c.err.find((t) => t.startsWith("Áreas internas"));
  assert.ok(e, "deveria haver erro de área interna");
  assert.match(e, /soma 900 m².*total declarado é 1\.000 m².*Faltam 100 m²/);
});

test("detalhamento interno maior que o total também é barrado", () => {
  const e = erros({ ...base(), A_saguao: 300 }).err.find((t) => t.startsWith("Áreas internas"));
  assert.match(e, /Sobram 200 m²/);
});

test("detalhamento externo tem de bater com a área externa", () => {
  const e = erros({ ...base(), A_varr: 1000 }).err.find((t) => t.startsWith("Áreas externas"));
  assert.match(e, /Faltam 500 m²/);
  assert.equal(erros({ ...base(), AreaExterna: 0, A_pav: 0, A_varr: 0 }).err.length, 0);
});

test("varrição é valorada só como área externa, separada da interna", () => {
  const v = linhas(base());
  assert.equal(linha(v, "frio").a, 900);
  assert.equal(linha(v, "saguao").a, 100);
  assert.equal(linha(v, "varr").a, 1500);
  assert.equal(linha(v, "varr").pr, VDEF.ampla.geral.varr);
  assert.equal(linha(v, "pav").a, 500);
  assert.equal(v.linhas.reduce((s, l) => s + (l.uni === "m²" ? l.a : 0), 0), 3000);
});

test("vidros: exige área e frequência quando há vidros", () => {
  const c = erros({ ...base(), Vidros: 1, A_vidro: 0, VidroFreq: 0 });
  assert.ok(c.err.some((t) => t.includes("área de vidros")));
  assert.ok(c.err.some((t) => t.includes("trimestral ou semestral")));
  assert.ok(erros({ ...base(), Vidros: 0, A_vidro: 50 }).err.some((t) => t.includes("vidros sem vidros")));
});

test("vidros: preço por frequência e risco, nas tabelas geral e de pequenas áreas", () => {
  const tri = linha(linhas({ ...base(), Vidros: 1, A_vidro: 200, VidroFreq: 1, VidroRisco: 0 }), "vidTriS");
  assert.equal(tri.pr, 2.71);
  assert.equal(tri.t, 542);
  const risco = linha(linhas({ ...base(), Vidros: 1, A_vidro: 200, VidroFreq: 2, VidroRisco: 1 }), "vidSemR");
  assert.equal(risco.pr, 2.89);
  const pequena = { ...base(), AreaInterna: 300, A_frio: 300, A_saguao: 0, AreaExterna: 0, A_pav: 0, A_varr: 0, Vidros: 1, A_vidro: 40, VidroFreq: 1, VidroRisco: 1 };
  const vp = linhas(pequena);
  assert.equal(vp.tabela, "pequena");
  assert.equal(linha(vp, "vidTriR").pr, 4.13);
  assert.ok(linha(vp, "vidTriR").hm > 0, "vidros entram na estimativa de horas");
});

test("vidros não entram no limite de 750 m² das pequenas áreas", () => {
  const r = { ...base(), AreaInterna: 700, A_frio: 700, A_saguao: 0, AreaExterna: 0, A_pav: 0, A_varr: 0, Vidros: 1, A_vidro: 500, VidroFreq: 1 };
  assert.equal(linhas(r).tabela, "pequena");
});

test("galpão com pisos frios declarados mantém pisos frios", () => {
  const v = linhas({ ...base(), Tipo: "Galpão / oficina", A_frio: 400, A_almox: 500 });
  assert.equal(linha(v, "frio").a, 400);
  assert.equal(linha(v, "almox").a, 500);
});

test("registro antigo sem pisos frios declarados continua sendo valorado como antes", () => {
  const antigo = { ...base(), A_frio: undefined, A_saguao: 0, Tipo: "Galpão / oficina" };
  const v = linhas(antigo);
  assert.equal(linha(v, "almox").a, 1000);
  assert.equal(linha(v, "frio"), undefined);
});

test("área sanitária tem de caber nos pisos frios", () => {
  const r = { ...base(), Sanitario: 1, Vasos: 2, AreaSanitaria: 950, HorasSan: 8 };
  assert.ok(erros(r).err.some((t) => t.includes("área sanitária faz parte dos pisos frios")));
  assert.ok(!erros({ ...r, AreaSanitaria: 50 }).err.some((t) => t.includes("área sanitária")));
});
