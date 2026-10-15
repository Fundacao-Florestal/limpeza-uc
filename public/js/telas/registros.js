/* Registros: lista de estruturas, detalhe de um registro e mudança de situação (aprovar, devolver, validar). */
"use strict";

function vReg(){
  const q=S.fQ.toLowerCase();
  const rows=filtered().filter(x=>!q||[x.ID,x.UC,x.Estrutura,x.Responsavel].some(t=>String(t||"").toLowerCase().includes(q))).sort((a,b)=>(b.AtualizadoEm||"").localeCompare(a.AtualizadoEm||""));
  return `<div class="bar filters"><input type="text" id="fQ" placeholder="Buscar por UC, estrutura ou responsável" value="${esc(S.fQ)}" aria-label="Buscar"><select id="fGer" aria-label="Gerência"><option value="">Todas as Gerências</option>${gersVis().map(g=>`<option ${S.fGer===g?"selected":""}>${g}</option>`).join("")}</select>
   <select id="fSt" aria-label="Situação"><option value="">Todas as situações</option>${STATUS.map(g=>`<option value="${g}" ${S.fSt===g?"selected":""}>${sl(g)}</option>`).join("")}</select><span class="sp"></span>
   <label class="sync"><input type="checkbox" id="fDemo" ${S.hideDemo?"checked":""} style="width:auto;min-height:0"> Ocultar exemplos</label>${perfil()==="admin"?`<button class="btn" data-act="csv">Exportar CSV (modelo)</button>`:""}${canFill()?`<button class="btn pri" data-act="novo">Novo diagnóstico</button>`:""}</div>
  <div class="panel"><div class="tw"><table><thead><tr><th>Estrutura</th><th>UC / Gerência</th><th>Situação</th><th>Responsável</th><th>IUP</th><th>Classe san.</th><th>Modalidade</th><th class="n">Valor ref. (R$/mês)</th><th>Atualizado</th></tr></thead><tbody>
  ${rows.map(x=>`<tr class="click" data-open="${esc(x.ID)}"><td>${esc(x.Estrutura)}${x.Exemplo?' <span class="pill">Exemplo</span>':""}</td><td>${esc(x.UC)}<div class="note" style="margin:0">${esc(x.Gerencia)}</div></td><td>${stPill(x.Status)}</td><td>${esc(x.Responsavel||"—")}</td><td>${hasRes(x)?iupPill(x.FaixaIUP)+' <span class="mono">'+x.IUP+'</span>':"—"}</td><td>${hasRes(x)?esc(x.ClasseSan):"—"}</td><td>${hasRes(x)?esc(x.Modalidade):"—"}</td><td class="n">${hasRes(x)?f2(valorRec(x).total):"—"}</td><td>${fdt(x.AtualizadoEm)}</td></tr>`).join("")||`<tr><td colspan="8" class="empty">Nenhum registro para o filtro.</td></tr>`}
  </tbody></table></div></div>`;
}
async function openRec(id){
  const x=S.recs.find(r=>r.ID===id);if(!x)return;
  await names([x.CriadoPor,...(x.Hist||[]).map(h=>h.por)]);
  const kv=(l,v)=>`<div><span>${l}</span><b>${v}</b></div>`;
  const canV=canApprove(x),canH=canHomolog(x),canE=canEditRec(x),vv=valorRec(x);
  $("#dlgBody").innerHTML=`<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start"><div><h2>${esc(x.Estrutura)}</h2><p class="note" style="margin:2px 0 0">${esc(x.UC)} · ${esc(x.Gerencia)} · <span class="mono">${esc(x.ID)}</span> · revisão ${x.Revisao||1}</p><p class="note" style="margin:2px 0 0">Responsável pelo preenchimento: <b>${esc(x.Responsavel||"—")}</b>${x.Contato?" · "+esc(x.Contato):""}</p></div>${stPill(x.Status)}</div>
  ${hasRes(x)?`<div class="kv">${kv("IUP",x.IUP+" · "+esc(x.FaixaIUP))}${kv("IPS / classe",x.IPS+" · "+esc(x.ClasseSan))}${kv("IHOS",f2(x.IHOS))}${kv("Frequência externa",esc(x.FrequenciaExterna))}${kv("Modalidade",esc(x.Modalidade))}${kv("Compartilhamento",esc(x.Compartilhamento))}${kv("Carga técnica relativa",f2(x.CargaTecnica))}${kv("Área interna / externa",f0(x.AreaInterna)+" / "+f0(x.AreaExterna)+" m²")}${kv("Versão da regra",esc(x.VersaoRegra))}${kv("Valor referencial total",brl(vv.total))}${kv("Equipe equivalente",f2(vv.eq)+" postos + "+f2(vv.enc)+" enc.")}${kv("Horas de serviço por mês",f0(vv.hm))}${kv("Dias de serviço",vv.dias?vv.dias+" por semana":"—")}</div>${valTable(vv)}`:`<p class="note">Rascunho sem indicadores. Conclua o preenchimento para calcular.</p>`}
  ${x.Status==="Devolvido"&&x.MotivoDevolucao?`<div class="banner">Devolvido: ${esc(x.MotivoDevolucao)}</div>`:""}
  ${x.Observacoes?`<p class="note">Observações: ${esc(x.Observacoes)}</p>`:""}
  <h3 style="font-size:14px;margin-top:14px">Histórico</h3><ul class="hist">${(x.Hist||[]).slice().reverse().map(h=>`<li><b>${esc(sl(h.de))} → ${esc(sl(h.para))}</b> · ${esc(who(h.por))} · ${fdt(h.em)}${h.motivo?"<br>"+esc(h.motivo):""}</li>`).join("")||"<li>Sem eventos.</li>"}</ul>
  ${canV||canH?`<label class="f" style="margin-top:14px">Motivo (obrigatório para devolver)<textarea id="motivo" rows="2"></textarea></label>`:""}
  <div class="bar" style="margin:16px 0 0">${canE?`<button class="btn" data-act="edit" data-id="${esc(x.ID)}">Editar</button><button class="btn" data-act="dup" data-id="${esc(x.ID)}">Duplicar</button>`:""}${canV?`<button class="btn pri" data-act="validar" data-id="${esc(x.ID)}">Aprovar</button><button class="btn crit" data-act="devolver" data-id="${esc(x.ID)}">Devolver</button>`:""}${canH?`<button class="btn pri" data-act="homologar" data-id="${esc(x.ID)}">Validar (final)</button><button class="btn crit" data-act="devolver" data-id="${esc(x.ID)}">Devolver ao gestor</button>`:""}${canE&&x.Status==="Rascunho"?`<button class="btn crit" data-act="excluir" data-id="${esc(x.ID)}">Excluir rascunho</button>`:""}<span class="sp"></span><button class="btn" data-act="fechar">Fechar</button></div>
  ${!canV&&x.Status==="Em validação"?`<p class="note">Aprovar e devolver são ações do Gerente da respectiva Gerência.</p>`:""}${!canH&&x.Status==="Validado"?`<p class="note">A validação final é ação do Validador final.</p>`:""}`;
  $("#dlg").showModal();
}
async function transition(id,para,motivo){
  const x=S.recs.find(r=>r.ID===id);if(!x)return;
  const okG=canApprove(x)&&(para==="Validado"||para==="Devolvido"),okH=canHomolog(x)&&(para==="Homologado"||para==="Devolvido");
  if(!okG&&!okH){toast(x.Status==="Validado"?"Ação restrita ao Validador final.":"Ação restrita ao Gerente da Gerência.");return}
  if(para==="Devolvido"&&!motivo.trim()){toast("Informe o motivo da devolução.");return}
  const d={...x,Status:para,MotivoDevolucao:para==="Devolvido"?motivo.trim():null,AtualizadoEm:new Date().toISOString(),Hist:[...(x.Hist||[]),{de:x.Status,para,por:S.me.id||"anon",em:new Date().toISOString(),motivo:para==="Devolvido"?motivo.trim():""}].slice(-40)};
  try{await saveRec(d);$("#dlg").close();toast(para==="Validado"?"Estrutura aprovada pela Gerência.":para==="Homologado"?"Estrutura com validação final.":"Estrutura devolvida ao gestor.");render()}catch(e){toast("Não foi possível gravar: "+(e.message||e.code))}
}
