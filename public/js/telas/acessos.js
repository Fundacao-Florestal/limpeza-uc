/* Acessos: pedido de perfil (quem ainda não tem) e gestão de perfis (Administrador). */
"use strict";

function toggle(set,k,on){const v=on===undefined?!set.has(k):on;v?set.add(k):set.delete(k)}
function diag(t,extra){return `<div class="panel" style="max-width:720px"><h2>${t}</h2>${extra}</div>`}
/* Pedido de acesso: a pessoa marca um ou mais papéis. "outro" é só informativo; o Administrador decide. */
const PAPEIS=[
  ["gestor","Gestor(a) de UC","Preencho o diagnóstico das estruturas da minha UC."],
  ["gerente","Gerente","Aprovo os diagnósticos da minha Gerência."],
  ["validador","Validador(a) final","Faço a validação final do que os Gerentes aprovaram."],
  ["final","Consulta","Consulto o painel e exporto os dados já validados."],
  ["outro","Outro","Tenho outra função no processo."]];
const nomeGer=g=>g+(GER_NOMES[g]?" · "+GER_NOMES[g]:"");
function pedNovo(base){
  const b=base||{};
  return{perfis:new Set(b.Perfis||(b.Perfil?[b.Perfil]:[])),ucs:new Set(b.UCs||[]),gers:new Set(b.Gerencias||[]),q:"",outro:b.Outro||"",obs:b.Obs||""};
}
/* Resumo de um pedido ou acesso: papéis e escopo. */
function resumoAcesso(a,html){
  const ps=(a.Perfis&&a.Perfis.length?a.Perfis:(a.Perfil?[a.Perfil]:[]));
  const partes=[];
  if(ps.includes("gestor")){const u=a.UCs||[];partes.push("UCs: "+(u.length?u.slice(0,4).join(", ")+(u.length>4?` e mais ${u.length-4}`:""):"nenhuma"))}
  if(ps.includes("gerente"))partes.push("Gerência: "+((a.Gerencias||[]).join(", ")||"nenhuma"));
  if(ps.includes("validador")&&!ps.includes("gestor")&&!ps.includes("gerente"))partes.push("validação final, todas as UCs");
  if(ps.includes("final")&&ps.length===1)partes.push("consulta ao que tem validação final");
  if(a.Outro)partes.push("Outro: "+a.Outro);
  if(a.Obs)partes.push("Obs.: "+a.Obs);
  const pills=ps.map(p=>`<span class="pill ${p==="gestor"?"ok":p==="gerente"?"info":p==="outro"?"warn":""}">${esc(PERFIS[p]||(p==="outro"?"Outro":p))}</span>`).join(" ");
  return html?{pills,txt:partes.join(" · ")}:partes.join(" · ");
}
function vSolic(){
  if(!S.db)return diag("Base de dados indisponível",`<p class="sub">O Firebase não está configurado nesta instalação. Verifique o arquivo firebase-config.js.</p>`);
  if(S.pedido&&!S.pedEdit){
    const r=resumoAcesso(S.pedido,true);
    return `<div class="panel" style="max-width:760px"><h2>Solicitação enviada</h2><p class="sub">O Administrador vai conferir e liberar o acesso. Esta tela muda sozinha quando isso acontecer.</p><p style="margin:0 0 6px">${r.pills}</p><p class="note" style="margin:0">${esc(r.txt)}</p><div class="bar" style="margin:16px 0 0"><button class="btn" data-act="pedalterar">Alterar pedido</button></div></div>`;
  }
  if(!S.ped)S.ped=pedNovo(S.pedido);
  const d=S.ped,on=k=>d.perfis.has(k);
  const card=([k,t,sub])=>`<button type="button" class="papel" data-rqp="${k}" aria-pressed="${on(k)}"><b>${t}</b><span>${sub}</span></button>`;
  return `<div class="panel" style="max-width:760px"><h2>Solicitar acesso</h2><p class="sub">Marque o que você faz no processo. Pode marcar mais de uma opção, por exemplo gestora de uma UC e gerente da Gerência. O Administrador confere e libera.</p>
  <div class="papeis" role="group" aria-label="Papéis">${PAPEIS.map(card).join("")}</div>
  ${on("gestor")?`<section class="grp"><h3>Suas UCs</h3><p class="sub">Marque as UCs pelas quais você responde.</p><input type="text" id="rqQ" placeholder="Buscar UC ou Gerência" autocomplete="off" value="${esc(d.q)}"><div class="note" id="rqCount" style="margin:6px 0"></div><div class="ucl" id="rqList"></div></section>`:""}
  ${on("gerente")?`<section class="grp"><h3>Sua Gerência</h3><div class="checks">${GER.map(g=>`<label><input type="checkbox" data-rqger="${g}" ${d.gers.has(g)?"checked":""}> ${esc(nomeGer(g))}</label>`).join("")}</div></section>`:""}
  ${on("outro")?`<section class="grp"><h3>Outra função</h3><label class="f wide">Qual a sua função no processo?<input type="text" id="rqOutro" maxlength="200" value="${esc(d.outro)}"></label></section>`:""}
  <label class="f wide" style="margin-top:14px">Observações (opcional)<textarea id="rqObs" rows="2" maxlength="400">${esc(d.obs)}</textarea></label>
  <div id="rqErr" role="alert"></div>
  <div class="bar" style="margin:16px 0 0"><button class="btn pri" data-act="solicitar">Enviar pedido</button>${S.pedido?`<button class="btn" data-act="pedcancelar">Cancelar alteração</button>`:""}</div></div>`;
}
/* Lista de UCs do pedido, filtrada pela busca; a UC marcada fica no topo. */
function renderRqList(){
  const d=S.ped,l=$("#rqList");if(!d||!l)return;
  const t=norm(d.q).split(/\s+/).filter(Boolean);
  const lst=UCS.filter(u=>t.every(x=>norm(u[0]+" "+u[2]+" "+(GER_NOMES[u[2]]||"")).includes(x))).sort((a,b)=>(d.ucs.has(b[0])-d.ucs.has(a[0])));
  l.innerHTML=lst.map(u=>`<label><input type="checkbox" data-rquc="${esc(u[0])}" ${d.ucs.has(u[0])?"checked":""}><span>${esc(u[0])}</span><small style="margin-left:auto;color:var(--ink2)">${u[2]}</small></label>`).join("")||`<div class="hint">Nenhuma UC encontrada.</div>`;
  const c=$("#rqCount");if(c)c.textContent=d.ucs.size?`${d.ucs.size} selecionada(s): ${[...d.ucs].join(", ")}`:"Nenhuma UC selecionada";
}
function pedidoErros(d){
  const e=[];
  if(!d.perfis.size)e.push("Marque ao menos uma opção.");
  if(d.perfis.has("gestor")&&!d.ucs.size)e.push("Marque ao menos uma UC.");
  if(d.perfis.has("gerente")&&!d.gers.size)e.push("Marque a sua Gerência.");
  if(d.perfis.has("outro")&&!d.outro.trim())e.push("Descreva a sua função em \"Outro\".");
  return e;
}
async function solicitar(){
  const d=S.ped;if(!d)return;
  const e=pedidoErros(d),box=$("#rqErr");
  if(e.length){if(box)box.innerHTML=`<div class="banner">${e.map(esc).join(" ")}</div>`;return}
  const ps=PAPEIS.map(p=>p[0]).filter(k=>d.perfis.has(k));
  const doc={Uid:S.me.id,Perfis:ps,Perfil:ps[0],UCs:d.perfis.has("gestor")?[...d.ucs]:[],Gerencias:d.perfis.has("gerente")?[...d.gers]:[],Outro:d.perfis.has("outro")?d.outro.trim().slice(0,200):"",Obs:d.obs.trim().slice(0,400),Em:new Date().toISOString()};
  try{await S.db.doc("pedidos/"+slug(S.me.id)).set(doc);S.ped=null;S.pedEdit=false;S.pedido=doc;render();toast("Pedido enviado.")}
  catch(x){toast(x&&x.code==="permission-denied"?"O banco recusou o pedido. Se você já tem perfil, recarregue a página.":"Não foi possível enviar: "+(x.message||x.code))}
}
function scopeTxt(a){return resumoAcesso(a)||"Sem escopo"}
function vAcc(){
  if(!S.isAdmin)return vSolic();
  if(!S.db)return `<div class="panel empty">A gestão de acessos exige a base compartilhada.</div>`;
  const pend=S.pedidos.filter(p=>!S.accAll.some(a=>a.Uid===p.Uid));
  const email=uid=>{const u=(S.usersAll||[]).find(x=>x.Uid===uid);return u&&u.Email?`<div class="note" style="margin:0">${esc(u.Email)}</div>`:""};
  const linhaPed=p=>{const r=resumoAcesso(p,true),so=perfisPedido(p).length===0;return `<li><div style="min-width:0;flex:1 1 260px"><b>${esc(who(p.Uid))}</b>${email(p.Uid)}<div style="margin:4px 0 2px">${r.pills}</div><div class="note" style="margin:0">${esc(r.txt)}</div></div><div class="bar" style="margin:0"><button class="btn pri sm" data-act="aprovar" data-uid="${esc(p.Uid)}" ${so?"disabled title=\"Pedido só com 'Outro': use Ajustar\"":""}>Aprovar</button><button class="btn sm" data-act="asg" data-uid="${esc(p.Uid)}">Ajustar</button><button class="btn sm" data-act="recusar" data-uid="${esc(p.Uid)}">Recusar</button></div></li>`};
  const linhaAcc=a=>{const r=resumoAcesso(a,true);return `<li><div style="min-width:0;flex:1 1 260px"><b>${esc(who(a.Uid))}</b> ${r.pills}<div class="note" style="margin:0">${esc(r.txt||"Sem escopo")}</div></div><button class="btn sm" data-act="asg" data-uid="${esc(a.Uid)}">Editar</button><button class="btn crit sm" data-act="remover" data-uid="${esc(a.Uid)}">Remover</button></li>`};
  return `<div class="grid g2" style="margin-top:0">
  <section class="panel"><h2>Solicitações pendentes</h2><p class="sub">Cada pessoa informou o que faz e em quais UCs ou Gerências. Antes de aprovar, confira com ela por fora (Teams, telefone): o e-mail não é verificado.</p>
   ${pend.length?`<ul class="lst">${pend.map(linhaPed).join("")}</ul>`:`<div class="empty">Nenhuma solicitação pendente.</div>`}
   <h3 style="font-size:14px;margin:18px 0 6px">Adicionar pessoa</h3>
   <input type="text" id="pSearch" placeholder="Buscar por nome ou e-mail" autocomplete="off"><ul class="lst" id="psRes" style="margin-top:8px"></ul></section>
  <section class="panel"><h2>Pessoas com acesso</h2><p class="sub">Uma pessoa pode ter mais de um perfil, por exemplo Gestor de uma UC e Gerente da Gerência.</p>
   ${S.accAll.length?`<ul class="lst">${S.accAll.map(linhaAcc).join("")}</ul>`:`<div class="empty">Ninguém com perfil atribuído. O administrador enxerga tudo por padrão.</div>`}</section></div>
  <p class="note">Use "Ver como" no topo da página para conferir o que cada perfil enxerga.</p>
  <section class="panel" style="margin-top:16px"><h2>Como liberar o acesso</h2><ol class="note" style="margin:0;padding-left:18px;display:grid;gap:4px"><li>Envie o endereço do sistema. A pessoa cria a conta e, em seguida, marca o que faz (Gestor, Gerente, os dois ou outro) e em quais UCs ou Gerências.</li><li>O pedido aparece em "Solicitações pendentes". <b>Aprovar</b> libera exatamente o que foi pedido; <b>Ajustar</b> abre para corrigir antes.</li><li>Para atribuir sem pedido, busque a pessoa em "Adicionar pessoa". Só aparece quem já entrou no sistema ao menos uma vez.</li></ol></section>`;
}
/* Perfis de um pedido que viram acesso (Outro é só informativo). */
const perfisPedido=p=>(p.Perfis&&p.Perfis.length?p.Perfis:(p.Perfil?[p.Perfil]:[])).filter(k=>ORDEM_PERFIS.includes(k)&&k!=="admin");
function docAcesso(uid,perfis,ucs,gers){
  const ps=ORDEM_PERFIS.filter(k=>perfis.includes(k));
  return{Uid:uid,Perfis:ps,Perfil:ps[0],UCs:ps.includes("gestor")?[...ucs]:[],Gerencias:ps.includes("gerente")?[...gers]:[],Por:S.me.id||"admin",Em:new Date().toISOString()};
}
async function gravarAcesso(doc){
  if(!doc.Perfis.length){toast("Escolha ao menos um perfil.");return false}
  if(doc.Perfis.includes("gestor")&&!doc.UCs.length){toast("Selecione ao menos uma UC para o Gestor.");return false}
  if(doc.Perfis.includes("gerente")&&!doc.Gerencias.length){toast("Selecione ao menos uma Gerência para o Gerente.");return false}
  try{await S.db.doc("acessos/"+slug(doc.Uid)).set(doc);try{await S.db.doc("pedidos/"+slug(doc.Uid)).delete()}catch{}toast("Acesso liberado: "+nomesPerfis(doc.Perfis)+".");return true}
  catch(e){toast("Não foi possível gravar: "+(e.message||e.code));return false}
}
async function aprovarPedido(uid){
  const p=S.pedidos.find(x=>x.Uid===uid);if(!p)return;
  await gravarAcesso(docAcesso(uid,perfisPedido(p),p.UCs||[],p.Gerencias||[]));
}
let psT;
function psSearch(q){
  clearTimeout(psT);
  psT=setTimeout(()=>{
    const box=$("#psRes");if(!box)return;
    const t=norm(q.trim());
    if(!S.db||!t){box.innerHTML="";return}
    const rs=(S.usersAll||[]).filter(u=>norm((u.Nome||"")+" "+(u.Email||"")).includes(t));
    box.innerHTML=rs.length?rs.slice(0,8).map(p=>`<li><div><b>${esc(p.Nome||p.Email||"Usuário")}</b>${p.Nome&&p.Email?`<div class="note" style="margin:0">${esc(p.Email)}</div>`:""}</div><span class="sp"></span><button class="btn sm" data-psel="${esc(p.Uid)}">Atribuir</button></li>`).join(""):`<li class="note">Nenhuma pessoa encontrada. A pessoa precisa entrar no sistema ao menos uma vez.</li>`;
  },200);
}
function openAsg(uid){
  const cur=S.accAll.find(a=>a.Uid===uid),ped=S.pedidos.find(p=>p.Uid===uid);
  const base=cur||ped||{};
  S.asg={uid,perfis:new Set(cur?perfisDoc(cur):ped?perfisPedido(ped):["gestor"]),ucs:new Set(base.UCs||[]),gers:new Set(base.Gerencias||[]),q:""};
  names([uid]).then(()=>{if(S.asg)renderAsg()});
  renderAsg();if(!$("#dlg").open)$("#dlg").showModal();
}
function renderAsg(){
  const a=S.asg;if(!a)return;
  const ped=S.pedidos.find(p=>p.Uid===a.uid),on=k=>a.perfis.has(k);
  const pr=ped?resumoAcesso(ped,true):null;
  $("#dlgBody").innerHTML=`<h2>Atribuir perfil</h2><p class="note" style="margin:2px 0 12px"><b>${esc(who(a.uid))}</b></p>${pr?`<div class="banner" style="background:var(--info-soft);color:var(--ink)"><b>Pedido:</b> ${pr.pills} <span class="note">${esc(pr.txt)}</span></div>`:""}
  <p class="note" style="margin:0 0 6px">Marque um ou mais perfis.</p>
  <div class="chips" role="group" aria-label="Perfis">${["gestor","gerente","validador","final"].map(k=>`<button type="button" data-asgp="${k}" aria-pressed="${on(k)}">${PERFIS[k]}</button>`).join("")}</div>
  <div id="asgScope" style="margin-top:14px">
   ${on("gestor")?`<section class="grp"><h3>UCs do Gestor</h3><p class="sub">Só elas aparecem na lista de preenchimento.</p>
    <div class="chips sm" style="margin-bottom:8px">${GER.map(g=>`<button type="button" data-asgg="${g}">+ todas da ${g}</button>`).join("")}<button type="button" data-asgclear>Limpar</button></div>
    <input type="text" id="asgQ" placeholder="Filtrar UCs" autocomplete="off" value="${esc(a.q)}"><div class="note" id="asgCount" style="margin:6px 0">${a.ucs.size} selecionada(s)</div><div class="ucl" id="asgList"></div></section>`:""}
   ${on("gerente")?`<section class="grp"><h3>Gerências do Gerente</h3><p class="sub">O Gerente aprova os diagnósticos dessas Gerências.</p><div class="checks">${GER.map(g=>`<label><input type="checkbox" data-asgger="${g}" ${a.gers.has(g)?"checked":""}> ${esc(nomeGer(g))} <small class="note" style="margin:0">(${UCS.filter(u=>u[2]===g).length} áreas)</small></label>`).join("")}</div></section>`:""}
   ${on("validador")?`<p class="note">Validador final: vê os diagnósticos aprovados pelas Gerências, de todas as UCs, e faz a validação final.</p>`:""}
   ${on("final")?`<p class="note">Usuário final: vê o painel e exporta os diagnósticos com validação final, de todas as UCs.</p>`:""}
  </div>
  <div class="bar" style="margin:18px 0 0"><button class="btn pri" data-act="asgsalvar">Salvar</button><span class="sp"></span><button class="btn" data-act="fechar">Cancelar</button></div>`;
  renderAsgList();
}
function renderAsgList(){
  const a=S.asg,l=$("#asgList");if(!a||!l){const c=$("#asgCount");if(c&&a)c.textContent=a.ucs.size+" selecionada(s)";return}
  const t=norm(a.q).split(/\s+/).filter(Boolean);
  l.innerHTML=UCS.filter(u=>t.every(x=>norm(u[0]+" "+u[2]).includes(x))).sort((x,y)=>(a.ucs.has(y[0])-a.ucs.has(x[0]))).map(u=>`<label><input type="checkbox" data-asguc="${esc(u[0])}" ${a.ucs.has(u[0])?"checked":""}><span>${esc(u[0])}</span><small style="margin-left:auto;color:var(--ink2)">${u[2]}</small></label>`).join("")||`<div class="hint">Nenhuma UC encontrada.</div>`;
  const c=$("#asgCount");if(c)c.textContent=a.ucs.size+" selecionada(s)";
}
async function saveAsg(){
  const a=S.asg;if(!a)return;
  if(await gravarAcesso(docAcesso(a.uid,[...a.perfis],a.ucs,a.gers))){S.asg=null;$("#dlg").close()}
}
async function removeAcc(uid){try{await S.db.doc("acessos/"+slug(uid)).delete();toast("Acesso removido.")}catch(e){toast("Não foi possível remover.")}}
async function recusar(uid){try{await S.db.doc("pedidos/"+slug(uid)).delete();toast("Solicitação removida.")}catch(e){toast("Não foi possível remover.")}}
