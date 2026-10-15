/* Painel gerencial: indicadores, gráficos de barras e listas de atenção. */
"use strict";

function filtered(){return S.recs.filter(x=>inScope(x)&&(!S.fGer||x.Gerencia===S.fGer)&&(!S.fSt||x.Status===S.fSt)&&!(S.hideDemo&&x.Exemplo))}
function hbars(rows,fmt,alt){
  const mx=Math.max(...rows.map(r=>r.v),0)||1;
  return `<div class="hb">`+rows.map(r=>`<div class="lab">${esc(r.l)}</div><div class="track"><span class="fill ${alt?"alt":""}" style="width:${(r.v/mx*100).toFixed(1)}%"></span></div><div class="val">${fmt(r.v)}</div>`).join("")+`</div>`;
}
function filtersBar(){
  return `<div class="bar filters"><select id="fGer" aria-label="Gerência"><option value="">Todas as Gerências</option>${gersVis().map(g=>`<option ${S.fGer===g?"selected":""}>${g}</option>`).join("")}</select>
  <select id="fSt" aria-label="Situação"><option value="">Todas as situações</option>${STATUS.map(g=>`<option value="${g}" ${S.fSt===g?"selected":""}>${sl(g)}</option>`).join("")}</select>
  <span class="sp"></span><label class="sync"><input type="checkbox" id="fDemo" ${S.hideDemo?"checked":""} style="width:auto;min-height:0"> Ocultar exemplos</label><span class="sync">Regra: <span class="mono">${esc(S.params.VersaoRegra)}</span></span></div>`;
}
function vPainel(){
  const all=filtered(),R=all.filter(hasRes);
  if(!S.recs.length)return filtersBar()+`<div class="panel empty">Nenhum diagnóstico registrado. Use <b>Preenchimento</b> para cadastrar a primeira estrutura, quando o seu perfil permitir.</div>`;
  const cnt=s=>all.filter(x=>x.Status===s).length;
  const catN=new Set(UCS.filter(u=>ucInScope(u)&&(!S.fGer||u[2]===S.fGer)).map(u=>u[0]));const cov=new Set(all.filter(x=>catN.has(x.UC)).map(x=>x.UC)).size;
  const sumA=k=>R.reduce((a,x)=>a+(x[k]||0),0);
  const vtot=R.reduce((a,x)=>a+(valorRec(x)?.total||0),0);
  const valid=cnt("Validado")+cnt("Homologado"), hom=cnt("Homologado"), tot=all.length;
  const kp=`<div class="kpis">
    <div class="kpi"><div class="l">Estruturas registradas</div><div class="v">${f0(tot)}</div><div class="s">${f0(cov)} de ${f0(catN.size)} UCs do cadastro</div></div>
    <div class="kpi"><div class="l">Aprovadas pela Gerência</div><div class="v">${tot?Math.round(valid/tot*100):0}%</div><div class="s">${f0(valid)} de ${f0(tot)} · ${f0(hom)} com validação final</div></div>
    <div class="kpi"><div class="l">Aguardando aprovação</div><div class="v">${f0(cnt("Em validação"))}</div><div class="s">${f0(cnt("Devolvido"))} devolvidas</div></div>
    <div class="kpi"><div class="l">Área interna (m²)</div><div class="v">${f0(sumA("AreaInterna"))}</div><div class="s">registros concluídos</div></div>
    <div class="kpi"><div class="l">Área externa (m²)</div><div class="v">${f0(sumA("AreaExterna"))}</div><div class="s">registros concluídos</div></div>
    <div class="kpi"><div class="l">Valor referencial (R$/mês)</div><div class="v">${brl0(vtot)}</div><div class="s">CadTerc Vol. 03 · ${S.val.Regime==="ampla"?"participação ampla":"ME/EPP"}</div></div></div>`;
  const stk=`<div class="stack" role="img" aria-label="Andamento por situação">`+STATUS.map(s=>{const c=cnt(s);return c?`<span class="${stCls(s)}" style="flex:${c}">${c}</span>`:""}).join("")+`</div><div class="legend">`+STATUS.map(s=>`<span><span class="pill ${s==="Validado"||s==="Homologado"?"ok":s==="Devolvido"?"warn":s==="Em validação"?"info":""}">${sl(s)}</span> <b>${cnt(s)}</b></span>`).join("")+`</div>`;
  const byG=gersVis().map(g=>{const a=all.filter(x=>x.Gerencia===g),r=a.filter(hasRes);return{g,u:UCS.filter(u=>u[2]===g&&ucInScope(u)).length,uc:new Set(a.map(x=>x.UC).filter(n=>UCS.some(u=>u[0]===n))).size,n:a.length,v:a.filter(x=>x.Status==="Validado"||x.Status==="Homologado").length,p:a.filter(x=>x.Status==="Rascunho"||x.Status==="Devolvido").length,ai:r.reduce((s,x)=>s+x.AreaInterna,0),ae:r.reduce((s,x)=>s+x.AreaExterna,0),c:r.reduce((s,x)=>s+x.CargaTecnica,0),vr:r.reduce((s,x)=>s+(valorRec(x)?.total||0),0)}});
  const cg=hbars(byG.filter(x=>x.vr>0).sort((a,b)=>b.vr-a.vr).map(x=>({l:x.g,v:x.vr})),brl0);
  const cnts=(key,order)=>hbars(order.map(o=>({l:o,v:R.filter(x=>x[key]===o).length})),f0,true);
  const aten=R.filter(x=>x.IUP>=7||x.IPS>=6).sort((a,b)=>b.CargaTecnica-a.CargaTecnica).slice(0,8);
  const pend=all.filter(x=>x.Status==="Devolvido"||x.Status==="Rascunho").sort((a,b)=>(b.AtualizadoEm||"").localeCompare(a.AtualizadoEm||"")).slice(0,8);
  const fila=S.recs.filter(canApprove).length;
  const filaH=S.recs.filter(canHomolog).length;
  const bn2=filaH&&(perfil()==="validador"||perfil()==="admin")?`<div class="banner" style="background:var(--info-soft);color:var(--info)"><b>${filaH}</b> estrutura(s) aprovada(s) pela Gerência aguardando validação final. <button class="btn sm" data-act="filaH">Abrir fila</button></div>`:"";
  const bn=fila&&(perfil()==="gerente"||perfil()==="admin")?`<div class="banner" style="background:var(--info-soft);color:var(--info)"><b>${fila}</b> estrutura(s) aguardando aprovação. <button class="btn sm" data-act="fila">Abrir fila</button></div>`:"";
  return filtersBar()+bn+bn2+kp+`
  <div class="grid g2">
    <section class="panel"><h2>Andamento do preenchimento</h2><p class="sub">Situação de todas as estruturas do filtro</p>${stk}<p class="note">Só entram nos indicadores as estruturas concluídas (com resultado calculado).</p></section>
    <section class="panel"><h2>Valor referencial por Gerência</h2><p class="sub">Soma mensal dos registros concluídos, pela tabela do CadTerc</p>${cg||'<div class="empty">Sem registros concluídos.</div>'}</section>
  </div>
  <div class="grid g3">
    <section class="panel"><h2>Intensidade de uso (IUP)</h2><p class="sub">Estruturas por faixa, escala 0–13</p>${cnts("FaixaIUP",["Baixo","Moderado","Intenso","Muito intenso"])}</section>
    <section class="panel"><h2>Modalidade indicada</h2><p class="sub">Hipótese de atendimento, a confirmar</p>${cnts("Modalidade",["Regular com cobertura","Regular","Compartilhado","Volante","Sem uso atual"])}</section>
    <section class="panel"><h2>Classe sanitária</h2><p class="sub">Uso interno a intenso</p>${cnts("ClasseSan",["SAN-1","SAN-2","SAN-3","SAN-4","Não se aplica"])}</section>
  </div>
  <section class="panel" style="margin-top:16px"><h2>Situação por Gerência</h2><p class="sub">Cobertura do diagnóstico e dimensão do escopo</p><div class="tw"><table>
    <thead><tr><th>Gerência</th><th class="n">UCs no cadastro</th><th class="n">UCs com diagnóstico</th><th class="n">Estruturas</th><th class="n">Aprovadas</th><th class="n">Pendentes</th><th class="n">Área int. m²</th><th class="n">Área ext. m²</th><th class="n">Valor ref. R$/mês</th></tr></thead><tbody>
    ${byG.map(x=>`<tr class="${x.n?"":"zero"}"><td>${x.g}</td><td class="n">${x.u}</td><td class="n">${x.uc}</td><td class="n">${x.n}</td><td class="n">${x.v}</td><td class="n">${x.p}</td><td class="n">${f0(x.ai)}</td><td class="n">${f0(x.ae)}</td><td class="n">${f0(x.vr)}</td></tr>`).join("")}
    </tbody></table></div><p class="note">Cadastro: relação do Notion ("Áreas protegidas"), sincronizada em ${SYNC}. Gerência sem registro aparece em cinza: lacuna de cobertura, não ausência de estruturas.</p></section>
  <div class="grid g2">
    <section class="panel"><h2>Estruturas que exigem atenção</h2><p class="sub">IUP a partir de 7 ou IPS a partir de 6, por carga</p>
      ${aten.length?`<div class="tw"><table><thead><tr><th>Estrutura</th><th>UC</th><th>IUP</th><th class="n">IPS</th><th class="n">Carga</th></tr></thead><tbody>${aten.map(x=>`<tr class="click" data-open="${esc(x.ID)}"><td>${esc(x.Estrutura)}</td><td>${esc(x.UC)}</td><td>${iupPill(x.FaixaIUP)} <span class="mono">${x.IUP}</span></td><td class="n">${x.IPS}</td><td class="n">${f2(x.CargaTecnica)}</td></tr>`).join("")}</tbody></table></div>`:'<div class="empty">Nenhuma estrutura no filtro atende ao critério.</div>'}</section>
    <section class="panel"><h2>Pendências de preenchimento</h2><p class="sub">Rascunhos e registros devolvidos</p>
      ${pend.length?`<div class="tw"><table><thead><tr><th>Estrutura</th><th>Gerência</th><th>Situação</th></tr></thead><tbody>${pend.map(x=>`<tr class="click" data-open="${esc(x.ID)}"><td>${esc(x.Estrutura||x.ID)}<div class="note" style="margin:0">${esc(x.UC)}${x.MotivoDevolucao&&x.Status==="Devolvido"?" · "+esc(x.MotivoDevolucao):""}</div></td><td>${esc(x.Gerencia)}</td><td>${stPill(x.Status)}</td></tr>`).join("")}</tbody></table></div>`:'<div class="empty">Sem pendências.</div>'}</section>
  </div>
  <p class="note">O valor referencial é a estimativa mensal pela tabela do CadTerc (Vol. 03), aplicada às áreas informadas. Não é preço contratado. A carga técnica relativa é apenas índice comparativo, sem equivalência a trabalhadores nem a preço. Parâmetros e pesos marcados como proposta dependem de aprovação institucional.</p>`;
}
