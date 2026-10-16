/* Minhas UCs: resumo das UCs do Gestor e suas estruturas. */
"use strict";

function ucSum(rs){const o={n:0,val:0,eq:0,enc:0,hm:0,dias:0,jor:new Set()};rs.filter(x=>x.Status!=="Rascunho").forEach(x=>{const v=valorRec(x);if(!v)return;o.n++;o.val+=v.total;o.eq+=v.eq||0;o.enc+=v.enc||0;o.hm+=v.hm||0;o.dias=Math.max(o.dias,v.dias||0);if(!v.semUso)o.jor.add(v.jornada)});return o}
function kpiStrip(o){
  if(!o.n)return `<p class="note" style="margin:0 0 8px">Ainda não há estrutura enviada com valor calculado.</p>`;
  return `<div class="kpis" style="margin:8px 0 12px"><div class="kpi"><div class="l">Valor mensal alocado</div><div class="v">${brl(o.val)}</div><div class="s">${brl0(o.val*12)} em 12 meses</div></div>
  <div class="kpi"><div class="l">Equipe à disposição</div><div class="v">${f1(o.eq)}</div><div class="s">postos equivalentes, mais ${f2(o.enc)} de encarregado</div></div>
  <div class="kpi"><div class="l">Tempo de serviço</div><div class="v">${f0(o.hm)} h</div><div class="s">de trabalho por mês, ${f0(o.hm*12)} h em 12 meses</div></div>
  <div class="kpi"><div class="l">Dias de serviço</div><div class="v">${o.dias||"—"} por semana</div><div class="s">${[...o.jor].map(esc).join("; ")||"sem uso atual"}</div></div></div>
  <p class="note" style="margin:0 0 8px">Considera ${o.n} estrutura(s) enviada(s), exceto rascunhos. Equipe e horas são estimativas gerenciais pelos coeficientes do CadTerc Vol. 03, e não podem ser exigidas no edital (item 1.11).</p>`;
}
function resumoUCs(ucs){
  const rs=S.recs.filter(x=>ucs.includes(x.UC)&&!(S.hideDemo&&x.Exemplo));
  return `<section class="panel" style="margin-bottom:14px"><h2 style="font-size:18px">Resumo das minhas UCs</h2><p class="sub">${ucs.length} UC(s). Valor, equipe e tempo estimados a partir das áreas informadas.</p>${kpiStrip(ucSum(rs))}</section>`;
}
function vMinha(){
  let ucs=tem("gestor")&&!tester()?[...myUCs()]:[...new Set(S.recs.filter(inScope).map(x=>x.UC))];
  ucs.sort((a,b)=>a.localeCompare(b));
  if(!ucs.length)return `<div class="panel empty">Nenhuma UC atribuída ao seu perfil. Solicite a atribuição ao administrador.</div>`;
  return `<p class="note" style="margin:0 0 12px">Cada UC pode ter várias estruturas. Use <b>Adicionar estrutura</b> para cadastrar a próxima; no formulário, <b>Enviar e cadastrar outra</b> mantém a mesma UC.</p>`+resumoUCs(ucs)+ucs.map(uc=>{
    const rs=S.recs.filter(x=>x.UC===uc).sort((a,b)=>(a.Estrutura||"").localeCompare(b.Estrutura||"")),u=UCS.find(z=>z[0]===uc);
    const c=s=>rs.filter(x=>x.Status===s).length,n=rs.length,dev=c("Devolvido");
    return `<section class="panel" style="margin-bottom:14px"><div class="bar" style="margin:0 0 8px"><h2 style="font-size:18px">${esc(uc)}</h2>${u?`<span class="pill ok">${u[2]}</span><span class="pill">${esc(CATS[u[1]])}</span>`:""}<span class="sp"></span><button class="btn pri" data-act="novaUc" data-nuc="${esc(uc)}">Adicionar estrutura</button></div>
    <p class="note" style="margin:0 0 8px">${n?`${n} estrutura(s): ${c("Validado")} aprovada(s) pela Gerência, ${c("Homologado")} com validação final, ${c("Em validação")} em aprovação, ${c("Rascunho")} rascunho(s), ${dev} devolvida(s).`:"Nenhuma estrutura cadastrada ainda."}</p>
    ${n?kpiStrip(ucSum(rs)):""}
    ${dev?`<div class="banner">${dev} estrutura(s) devolvida(s) aguardando correção.</div>`:""}
    ${n?`<div class="tw"><table><thead><tr><th>Estrutura</th><th>Situação</th><th>Responsável</th><th class="n">Valor (R$/mês)</th><th class="n">Equipe eq.</th><th>Atualizado</th></tr></thead><tbody>${rs.map(x=>`<tr class="click" data-open="${esc(x.ID)}"><td>${esc(x.Estrutura)}${x.Exemplo?' <span class="pill">Exemplo</span>':""}${x.Status==="Devolvido"&&x.MotivoDevolucao?`<div class="note" style="margin:0">${esc(x.MotivoDevolucao)}</div>`:""}</td><td>${stPill(x.Status)}</td><td>${esc(x.Responsavel||"—")}</td><td class="n">${hasRes(x)?f2(valorRec(x).total):"—"}</td><td class="n">${hasRes(x)?f2(valorRec(x).eq):"—"}</td><td>${fdt(x.AtualizadoEm)}</td></tr>`).join("")}</tbody></table></div>`:""}</section>`}).join("");
}
