/* Formulário de preenchimento de uma estrutura, incluindo a escolha da UC e o nome automático da estrutura. */
"use strict";

function blankRec(){const r={};TXT.forEach(k=>r[k]="");NUM.forEach(k=>r[k]=null);ITENS.forEach(k=>r[k]=null);FLAGS.forEach(k=>r[k]=0);[...DEP_SAN,...DEP_HOSP].forEach(k=>{if(!FLAGS.includes(k))r[k]=0});r.Sazonalidade=null;r.Reposicao=0;r.Residuos=null;r.Gerencia="";r.Tipo="";r.UCCadastro="Notion";return r}
function fNum(k,unit,opts={}){return `<label class="f" data-w="${k}"><span>${LBL[k]}${unit?` <small>(${unit})</small>`:""}</span><input type="number" inputmode="decimal" id="f_${k}" data-k="${k}" min="0" step="${opts.step||"any"}" ${opts.max!=null?`max="${opts.max}"`:""}></label>`}
function fSel(k,opts){return `<label class="f" data-w="${k}">${LBL[k]}<select id="f_${k}" data-k="${k}" data-sel><option value="">Selecione</option>${opts.map(([v,t])=>`<option value="${v}">${t}</option>`).join("")}</select></label>`}
function fFlag(k){return `<div class="f" data-w="${k}"><span style="font-size:12.5px;font-weight:500;color:var(--ink2)">${LBL[k]}</span><div class="seg" role="group" aria-label="${LBL[k]}"><button type="button" data-flag="${k}" data-v="1" id="f_${k}_1">Sim</button><button type="button" data-flag="${k}" data-v="0" id="f_${k}_0">Não</button></div></div>`}
function fTxt(k,ph,list){return `<label class="f" data-w="${k}">${LBL[k]}<input type="text" id="f_${k}" data-k="${k}" ${list?`list="${list}"`:""} placeholder="${ph||""}" autocomplete="off"></label>`}
function vForm(m){
  if(!S.form){S.form=newForm();S.edit=null}
  const isE=!!S.edit, st=S.edit?S.edit.Status:"Rascunho";
  m.innerHTML=`<div class="bar"><h2 style="font-size:20px">${isE?"Editar estrutura":"Nova estrutura"}</h2>${isE?stPill(st):""}<span class="sp"></span><button class="btn" data-act="cancelar">${isE?"Cancelar":"Limpar"}</button></div>
  <div class="formgrid"><div>
   <section class="sec"><h2>Quem está preenchendo</h2><p class="sub">Nome de quem levantou as informações. Fica registrado no diagnóstico e aparece para o Gerente na aprovação. Seu envio não é visível para outros preenchedores.</p><div class="fields">${fTxt("Responsavel","Nome completo")}${fTxt("Contato","E-mail ou telefone (opcional)")}</div></section>
   <section class="sec"><h2>Onde fica</h2><p class="sub">Escolha a UC ou área protegida na relação abaixo. Gerência e categoria vêm do cadastro do Notion (${UCS.length} áreas, sincronizado em ${SYNC}).</p><div id="ucBox" class="ucbox"></div></section>
   <section class="sec"><h2>Estrutura e área</h2><p class="sub">Uma linha por estrutura. A área sanitária já faz parte da área interna.</p>
     <div class="f" style="margin-bottom:12px"><span style="font-size:12.5px;font-weight:500;color:var(--ink2)">Uso principal</span><div class="chips" role="group" aria-label="Uso principal">${TIPOS.map(t=>`<button type="button" data-tipo="${esc(t)}" aria-pressed="false">${esc(t)}</button>`).join("")}</div></div>
     <div class="fields">${fTxt("Estrutura","Nome da estrutura")}${fNum("AreaInterna","m²")}${fNum("AreaExterna","m²")}</div>
     <details class="det" ${ITENS.some(k=>S.form[k]!=null)?"open":""}><summary>Detalhar áreas por tipo de serviço (opcional)</summary>
      <p class="sub">Serve para aplicar o valor certo a cada tipo de piso. Sem detalhamento, a área interna é valorada como piso frio (ou almoxarifado, se o uso for galpão/oficina) e a externa como pátio, conforme a frequência calculada. O sanitário de grande circulação é separado automaticamente.</p>
      <h3 style="font-size:13px;margin:6px 0">Áreas internas (m²)</h3><div class="fields">${fNum("A_acarp","m²")}${fNum("A_lab","m²")}${fNum("A_almox","m²")}${fNum("A_ofic","m²")}${fNum("A_saguao","m²")}</div>
      <h3 style="font-size:13px;margin:12px 0 6px">Áreas externas (m²)</h3><div class="fields">${fNum("A_pav","m²")}${fNum("A_varr","m²")}${fNum("A_patAlta","m²")}${fNum("A_patMedia","m²")}${fNum("A_patBaixa","m²")}</div></details></section>
   <section class="sec"><h2>Uso</h2><p class="sub">Rotina semanal, visitação e sazonalidade.</p><div class="fields">
     ${fNum("Dias","0 a 7",{max:7})}${fNum("Horas","0 a 24",{max:24})}${fNum("Pessoas","nº")}${fNum("Visitantes","por dia")}${fNum("Pico","por dia")}${fSel("Sazonalidade",[[0,"0 · Nenhuma"],[1,"1 · Eventual"],[2,"2 · Intensa"]])}</div></section>
   <section class="sec"><h2>Sanitários</h2><p class="sub">Informe os equipamentos somente se existirem.</p><div class="fields">${fFlag("Sanitario")}</div>
     <div id="sec_san" class="fields" style="margin-top:12px">${fFlag("Publico")}${fNum("Vasos","nº")}${fNum("Mictorios","nº")}${fNum("Lavatorios","nº")}${fNum("Chuveiros","nº")}${fNum("AreaSanitaria","m², já na área interna")}${fNum("HorasSan","0 a 24",{max:24})}${fSel("Reposicao",[[0,"0 · Rara"],[1,"1 · Às vezes"],[2,"2 · Frequente"]])}</div></section>
   <section class="sec"><h2>Hospedagem</h2><p class="sub">Leitos e quartos precisam ser positivos quando houver hospedaria.</p><div class="fields">${fFlag("Hospedaria")}</div>
     <div id="sec_hosp" class="fields" style="margin-top:12px">${fNum("Leitos","nº")}${fNum("Quartos","nº")}${fNum("Hospedes","no mês típico")}${fNum("Trocas","entradas no mês")}${fFlag("Lavanderia")}</div></section>
   <section class="sec"><h2>Exterior e particularidades</h2><div class="fields">${fSel("Residuos",[[0,"0 · Poucos"],[1,"1 · Fins de semana"],[2,"2 · Diários"],[3,"3 · Pico intenso"]])}${fNum("Lixeiras","nº")}
     <label class="f wide" data-w="Observacoes">Observações e situações não previstas<textarea id="f_Observacoes" data-k="Observacoes" rows="3"></textarea></label></div></section>
  </div>
  <aside class="side"><section class="panel"><h2>Conferência</h2><div id="chk"></div></section>
   <section class="panel"><h2>Indicadores</h2><div id="ind"></div></section>
   <div class="bar" style="margin:0"><button class="btn" id="bRasc" data-act="rascunho" ${isE&&st!=="Rascunho"?"hidden":""}>Salvar rascunho</button><button class="btn pri" id="bConc" data-act="concluir">${isE&&st!=="Rascunho"?"Salvar e reenviar":"Enviar"}</button>${isE?"":`<button class="btn pri" id="bMais" data-act="concluirmais">Enviar e cadastrar outra</button>`}</div></aside></div>`;
  renderUcBox();refreshInputs();refreshCheck();
}
function refreshInputs(){
  const r=S.form;
  document.querySelectorAll("#main [data-k]").forEach(el=>{const v=r[el.dataset.k];el.value=v==null?"":v});
  FLAGS.forEach(k=>{document.querySelectorAll(`[data-flag="${k}"]`).forEach(b=>b.setAttribute("aria-pressed",String(Number(b.dataset.v)===r[k])))});
  document.querySelectorAll("[data-tipo]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.tipo===r.Tipo)));
  $("#sec_san")&&($("#sec_san").hidden=r.Sanitario!==1);$("#sec_hosp")&&($("#sec_hosp").hidden=r.Hospedaria!==1);
}
function refreshCheck(){
  const r=S.form,c=check(r,S.recs,!!S.edit);
  document.querySelectorAll("#main [data-w]").forEach(l=>l.classList.toggle("bad",false));
  const bl=c.blank.map(k=>LBL[k]);
  let h="";
  if(bl.length)h+=`<p class="note" style="margin:0 0 4px"><b>${bl.length}</b> campo(s) obrigatório(s) pendente(s)</p><ul class="chk">${bl.slice(0,6).map(t=>`<li class="w">${esc(t)}</li>`).join("")}${bl.length>6?`<li class="w">e mais ${bl.length-6}</li>`:""}</ul>`;
  if(c.err.length)h+=`<p class="note" style="margin:8px 0 4px"><b>${c.err.length}</b> inconsistência(s)</p><ul class="chk">${c.err.map(t=>`<li>${esc(t)}</li>`).join("")}</ul>`;
  if(!bl.length&&!c.err.length)h=`<p style="margin:0;color:var(--ok);font-weight:500">Pronto para concluir.</p>`;
  $("#chk").innerHTML=h;
  const ok=!bl.length&&!c.err.length;
  if(ok){const x=calc(r,S.params),vv=valorar({...r,...x},x,S.val);$("#ind").innerHTML=`<p class="note" style="margin:0">Prévia com a regra ${esc(S.params.VersaoRegra)}. Só é gravada ao concluir.</p><dl class="ind"><dt>IUP</dt><dd>${x.IUP} · ${x.FaixaIUP}</dd><dt>IPS</dt><dd>${x.IPS} · ${x.ClasseSan}</dd><dt>IHOS</dt><dd>${f2(x.IHOS)}</dd><dt>Frequência externa</dt><dd>${x.FrequenciaExterna}</dd><dt>Modalidade</dt><dd>${x.Modalidade}</dd><dt>Compartilhamento</dt><dd>${x.Compartilhamento}</dd><dt>Carga relativa</dt><dd>${f2(x.CargaTecnica)}</dd><dt>Valor referencial</dt><dd>${vv.semUso?"sem uso atual":brl(vv.total)+"/mês"}</dd></dl>`}
  else $("#ind").innerHTML=`<p class="note" style="margin:0">Os indicadores aparecem quando o registro estiver completo e consistente.</p>`;
  const b=$("#bConc");if(b)b.disabled=!ok||S.saving;const b2=$("#bMais");if(b2)b2.disabled=!ok||S.saving;
}
function setFlag(k,v){
  const r=S.form;r[k]=v;
  if(k==="Sanitario"){DEP_SAN.forEach(d=>r[d]=v===0?0:(FLAGS.includes(d)?0:null))}
  if(k==="Hospedaria"){DEP_HOSP.forEach(d=>r[d]=v===0?0:(FLAGS.includes(d)?0:null))}
  if(k==="Sanitario"&&v===1)r.Reposicao=null;
  refreshInputs();refreshCheck();
}
function buildDoc(concl){
  const r=S.form,old=S.edit,now=new Date().toISOString(),me=S.me.id||"anon";
  const doc={};TXT.forEach(k=>doc[k]=String(r[k]??"").trim());NUM.forEach(k=>doc[k]=r[k]==null?null:Number(r[k]));ITENS.forEach(k=>doc[k]=r[k]==null?null:Number(r[k]));
  RES.forEach(k=>doc[k]=null);doc.ValorMensal=null;doc.ValorJSON=null;doc.VersaoRegra=null;doc.ParamsJSON=null;doc.MotivoDevolucao=null;
  doc.Exemplo=!!old?.Exemplo;doc.CriadoPor=old?.CriadoPor||me;doc.AtualizadoEm=now;
  let rev=old?.Revisao||1,para="Rascunho";
  if(concl){Object.assign(doc,calc(r,S.params));{const vv=valorar(doc,doc,S.val);doc.ValorMensal=vv.total;doc.ValorJSON=JSON.stringify(vv)}doc.VersaoRegra=S.params.VersaoRegra;doc.ParamsJSON=JSON.stringify(S.params);para="Em validação";if(old?.Status==="Validado"||old?.Status==="Homologado")rev++}
  doc.Revisao=rev;doc.Status=para;
  const h=[...(old?.Hist||[])];
  if(!old||old.Status!==para||concl)h.push({de:old?old.Status:"—",para,por:me,em:now,motivo:old&&(old.Status==="Validado"||old.Status==="Homologado")?"Nova revisão "+rev:""});
  doc.Hist=h.slice(-40);
  return doc;
}
async function submit(concl,again){
  const r=S.form,c=check(r,S.recs,!!S.edit);
  if(perfil()==="gestor"&&!tester()&&r.UC&&!myUCs().has(r.UC)){toast("A UC selecionada não está atribuída ao seu perfil.");return}
  if(concl&&(c.blank.length||c.err.length)){toast("Corrija as pendências da conferência.");return}
  if(!concl&&(!String(r.UC).trim()||!String(r.Estrutura).trim())){toast("Informe ao menos a UC e o nome da estrutura para salvar o rascunho.");return}
  if(!concl&&S.recs.some(x=>x.ID!==r.ID&&x.UC===r.UC&&norm(x.Estrutura)===norm(r.Estrutura))){toast("Já existe uma estrutura com este nome nesta UC.");return}
  S.saving=true;refreshCheck();
  try{if(!String(r.ID||"").trim())r.ID=await freshId(r);const doc=buildDoc(concl);await saveRec(doc);const keep={UC:r.UC,Gerencia:r.Gerencia,Categoria:r.Categoria,UCTipo:r.UCTipo,UCCadastro:r.UCCadastro,Responsavel:r.Responsavel,Contato:r.Contato};
    S.edit=null;S.saving=false;S._keep=keep;
    if(again){S.form=newForm();Object.assign(S.form,keep);S.ucManual=false;S.view="form";render();window.scrollTo({top:0});toast("Envio registrado (protocolo "+doc.ID+"). Cadastre a próxima estrutura de "+keep.UC+".")}
    else if(concl){S.form=null;S.view=perfil()==="gestor"?"minha":"reg";render();confirmDlg(doc)}
    else{toast("Rascunho salvo.");S.form=null;S.view=perfil()==="gestor"?"minha":"reg";render()}}
  catch(e){S.saving=false;refreshCheck();toast("Não foi possível gravar: "+(e.message||e.code||"erro"))}
}
function confirmDlg(d){
  const priv=perfil()==="gestor"?"Seu envio fica visível apenas para você e para quem analisa os diagnósticos. Outros participantes não têm acesso a ele.":"O envio foi gravado na base compartilhada.";
  $("#dlgBody").innerHTML=`<div role="status"><h2 style="color:var(--ok)">Envio registrado com sucesso</h2>
  <p style="margin:8px 0 0">A estrutura <b>${esc(d.Estrutura)}</b> de <b>${esc(d.UC)}</b> foi enviada para aprovação do Gerente da Gerência ${esc(d.Gerencia)}.</p>
  <div class="kv"><div><span>Protocolo</span><b>${esc(d.ID)}</b></div><div><span>Enviado em</span><b>${fdt(d.AtualizadoEm)}</b></div><div><span>Responsável</span><b>${esc(d.Responsavel||"—")}</b></div><div><span>Situação</span><b>${esc(sl(d.Status))}</b></div></div>
  <p class="note" style="margin-top:0">${priv} Guarde o protocolo para consulta. Se a estrutura for devolvida, o motivo aparece em "Minhas UCs".</p>
  ${canFill()?`<div class="bar" style="margin:16px 0 0"><button class="btn pri" data-act="outra">Cadastrar outra estrutura</button><span class="sp"></span><button class="btn" data-act="fechar">Fechar</button></div>`:`<div class="bar" style="margin:16px 0 0"><span class="sp"></span><button class="btn pri" data-act="fechar">Fechar</button></div>`}</div>`;
  $("#dlg").showModal();
}

function applyUc(r,name){
  const i=UCS.findIndex(u=>u[0]===name);if(i<0)return false;
  r.UC=name;r.Gerencia=UCS[i][2];r.Categoria=CATS[UCS[i][1]];r.UCTipo=CAT_TIPO[UCS[i][1]];r.UCCadastro="Notion";return true;
}
function newForm(){const r=blankRec();r.Responsavel=S.me.name||"";
  try{const u=localStorage.getItem("lastUC");if(u&&myUCs().has(u))applyUc(r,u)}catch{}
  if(!r.UC&&perfil()==="gestor"&&myUCs().size===1)applyUc(r,[...myUCs()][0]);
  S.ucQ="";S.ucG="";S.ucManual=false;S.autoName="";return r}
function ucPool(){const s=myUCs();return UCS.map((u,i)=>[u,i]).filter(([u])=>s.has(u[0]))}
function ucMatches(q){
  const t=norm(q).split(/\s+/).filter(Boolean);
  return ucPool().filter(([u])=>{if(S.ucG&&u[2]!==S.ucG)return false;const s=norm(u[0]+" "+CATS[u[1]]+" "+u[2]);return t.every(x=>s.includes(x))});
}
function renderUcList(){
  const l=$("#ucList");if(!l)return;const m=ucMatches(S.ucQ),tot=ucPool().length;
  l.innerHTML=m.length?m.map(([u,i])=>`<button type="button" data-uc="${i}"><span>${esc(u[0])}</span><small>${esc(u[2])} · ${esc(CATS[u[1]])}</small></button>`).join(""):`<div class="hint">${tot?"Nenhuma área encontrada com este filtro.":"Nenhuma UC está atribuída ao seu perfil. Solicite a atribuição ao administrador."}</div>`;
  const c=$("#ucCount");if(c)c.textContent=m.length===tot?`${tot} áreas na relação`:`${m.length} de ${tot} áreas`;
}
function renderUcBox(){
  const b=$("#ucBox");if(!b||!S.form)return;const r=S.form;
  if(S.ucManual){
    b.innerHTML=`<div class="fields"><label class="f wide">Nome da UC ou área<input type="text" id="f_UC" data-k="UC" autocomplete="off"></label><label class="f">Gerência<select id="f_Gerencia" data-k="Gerencia" data-sel><option value="">Selecione</option>${GER.map(g=>`<option>${g}</option>`).join("")}</select></label><label class="f">Categoria<select id="f_Categoria" data-k="Categoria" data-sel><option value="">Selecione</option>${CATS.map(c=>`<option>${esc(c)}</option>`).join("")}</select></label></div><button type="button" class="btn sm" data-act="ucvoltar" style="width:max-content">Voltar para a relação</button>`;
    refreshInputs();return;
  }
  if(r.UC){
    b.innerHTML=`<div class="ucard"><b>${esc(r.UC)}</b>${r.Categoria?`<span class="pill">${esc(r.Categoria)}</span>`:""}${r.UCTipo?`<span class="pill info">${esc(r.UCTipo.replace("Unidade de Conservação de ","UC de "))}</span>`:""}<span class="pill ok">${esc(r.Gerencia||"—")}</span>${r.UCCadastro==="Manual"?'<span class="pill warn">Fora do cadastro</span>':""}<span class="sp"></span><button type="button" class="btn sm" data-act="trocaruc">Trocar</button></div>${(()=>{const ex=S.recs.filter(x=>x.UC===r.UC&&x.ID!==r.ID);return ex.length?`<p class="note" style="margin:8px 0 0">Já cadastradas nesta UC (${ex.length}):</p><div class="chips sm" style="margin-top:6px">${ex.map(x=>`<span class="pill ${x.Status==="Validado"?"ok":x.Status==="Devolvido"?"warn":x.Status==="Em validação"?"info":""}">${esc(x.Estrutura)} · ${esc(sl(x.Status))}</span>`).join("")}</div>`:`<p class="note" style="margin:8px 0 0">Nenhuma estrutura cadastrada ainda nesta UC.</p>`})()}`;
    return;
  }
  const gs=[...new Set(ucPool().map(([u])=>u[2]))].sort();
  b.innerHTML=`<label class="f">Filtrar a relação<input type="text" id="ucQ" placeholder="Digite parte do nome ou a sigla (ex.: PE Cantareira)" autocomplete="off" value="${esc(S.ucQ)}"></label>
  ${gs.length>1?`<div class="chips sm" role="group" aria-label="Gerência"><button type="button" data-ucg="" aria-pressed="${!S.ucG}">Todas</button>${gs.map(g=>`<button type="button" data-ucg="${g}" aria-pressed="${S.ucG===g}">${g}</button>`).join("")}</div>`:""}
  <div class="note" id="ucCount" style="margin:0"></div><div class="ucl" id="ucList" role="listbox"></div>
  ${perfil()==="admin"?`<button type="button" class="btn sm" data-act="ucmanual" style="width:max-content">Área fora da relação: cadastrar manualmente</button>`:`<p class="note" style="margin:0">Área fora da relação? Solicite ao administrador a inclusão no cadastro.</p>`}`;
  renderUcList();
}
function pickUc(i){
  const r=S.form;const auto=isAutoName(r,r.Tipo);applyUc(r,UCS[i][0]);if(auto&&r.Tipo)r.Estrutura=uniqueName(r,r.Tipo);try{localStorage.setItem("lastUC",UCS[i][0])}catch{}
  renderUcBox();refreshCheck();
}
const isAutoName=(r,tipo)=>{const n=String(r.Estrutura||"").trim();return !n||(!!tipo&&(n===tipo||new RegExp("^"+tipo.replace(/[.*+?^${}()|[\]\\\/]/g,"\\$&")+" \\d+$").test(n)))};
function uniqueName(r,base){
  const taken=n=>S.recs.some(x=>x.UC===r.UC&&x.ID!==r.ID&&norm(x.Estrutura)===norm(n));
  if(!r.UC||!taken(base))return base;
  for(let i=2;i<100;i++){if(!taken(base+" "+i))return base+" "+i}
  return base;
}
function pickTipo(t){
  const r=S.form;const auto=isAutoName(r,r.Tipo);r.Tipo=t;
  if(auto)r.Estrutura=uniqueName(r,t);
  refreshInputs();refreshCheck();
}
async function freshId(r){
  const base=norm(r.UC).replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").toUpperCase().slice(0,30)||"UC";
  /* sufixo do autor: evita colisão de IDs entre pessoas que não enxergam os envios umas das outras */
  let h=0;for(const c of String(S.me.id||"x"))h=(h*31+c.charCodeAt(0))>>>0;
  const sfx=h.toString(36).toUpperCase().slice(-3).padStart(3,"0");
  for(let n=1;n<500;n++){
    const id=base+"-"+String(n).padStart(2,"0")+"-"+sfx;
    if(S.recs.some(x=>x.ID===id))continue;
    return id;
  }
  return base+"-"+Date.now().toString(36).toUpperCase();
}
