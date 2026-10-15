/* Acessos: pedido de perfil (quem ainda não tem) e gestão de perfis (Administrador). */
"use strict";

function toggle(set,k,on){const v=on===undefined?!set.has(k):on;v?set.add(k):set.delete(k)}
function diag(t,extra){return `<div class="panel" style="max-width:720px"><h2>${t}</h2>${extra}</div>`}
function msgAdm(){return "Solicito acesso ao sistema Limpeza das UCs. Nome: "+(S.me.name||"[informar]")+". Perfil desejado: [Gestor / Gerente / Validador final / Usuário final]. UC ou Gerência: [informar]."}
function vSolic(){
  if(!S.db)return diag("Base de dados indisponível",`<p class="sub">O Firebase não está configurado nesta instalação. Verifique o arquivo firebase-config.js.</p>`);
  if(S.pedido)return `<div class="panel"><h2>Solicitação enviada</h2><p class="sub">Perfil solicitado: <b>${esc(PERFIS[S.pedido.Perfil]||S.pedido.Perfil)}</b>. O administrador irá atribuir o acesso. Esta tela é atualizada automaticamente.</p>${S.pedido.Obs?`<p class="note">Informado: ${esc(S.pedido.Obs)}</p>`:""}</div>`;
  return `<div class="panel" style="max-width:640px"><h2>Solicitar acesso</h2><p class="sub">Você ainda não tem perfil neste sistema. Informe o perfil desejado e a UC ou Gerência a que se refere. O administrador fará a atribuição.</p>
  <div class="fields"><label class="f wide">Perfil<select id="rqPerfil"><option value="gestor">Gestor: preencho o diagnóstico da minha UC</option><option value="gerente">Gerente: aprovo os diagnósticos da minha Gerência</option><option value="validador">Validador final: faço a validação final dos diagnósticos aprovados pelos Gerentes</option><option value="final">Usuário final: consulto e exporto os dados validados</option></select></label>
  <label class="f wide">UC(s) ou Gerência<textarea id="rqObs" rows="2" placeholder="Ex.: PE Cantareira e PE Alberto Löfgren"></textarea></label></div>
  <div class="bar" style="margin:16px 0 0"><button class="btn pri" data-act="solicitar">Solicitar acesso</button></div></div>`;
}
async function solicitar(){
  try{await S.db.doc("pedidos/"+slug(S.me.id)).set({Uid:S.me.id,Perfil:$("#rqPerfil").value,Obs:$("#rqObs").value.trim().slice(0,400),Em:new Date().toISOString()});toast("Solicitação enviada.")}
  catch(e){toast(e&&e.code==="permission-denied"?"O banco recusou a solicitação. Se você já tem perfil, recarregue a página.":"Não foi possível enviar: "+(e.message||e.code))}
}
function scopeTxt(a){
  if(a.Perfil==="gestor"){const n=(a.UCs||[]).length;return n+" UC(s): "+(a.UCs||[]).slice(0,3).join(", ")+(n>3?"…":"")}
  if(a.Perfil==="gerente")return "Gerência(s): "+(a.Gerencias||[]).join(", ");
  return a.Perfil==="validador"?"Validação final, todas as UCs":"Diagnósticos com validação final, todas as UCs";
}
function vAcc(){
  if(!S.isAdmin)return vSolic();
  if(!S.db)return `<div class="panel empty">A gestão de acessos exige a base compartilhada.</div>`;
  const pend=S.pedidos.filter(p=>!S.accAll.some(a=>a.Uid===p.Uid));
  return `<div class="grid g2" style="margin-top:0">
  <section class="panel"><h2>Solicitações pendentes</h2><p class="sub">Pessoas que abriram o sistema sem perfil.</p>
   ${pend.length?`<ul class="lst">${pend.map(p=>`<li><div><b>${esc(who(p.Uid))}</b><div class="note" style="margin:0">${esc(PERFIS[p.Perfil]||p.Perfil)}${p.Obs?" · "+esc(p.Obs):""}</div></div><span class="sp"></span><button class="btn pri sm" data-act="asg" data-uid="${esc(p.Uid)}">Atribuir</button><button class="btn sm" data-act="recusar" data-uid="${esc(p.Uid)}">Recusar</button></li>`).join("")}</ul>`:`<div class="empty">Nenhuma solicitação pendente.</div>`}
   <h3 style="font-size:14px;margin:18px 0 6px">Adicionar pessoa</h3>
   <input type="text" id="pSearch" placeholder="Buscar por nome ou e-mail" autocomplete="off"><ul class="lst" id="psRes" style="margin-top:8px"></ul></section>
  <section class="panel"><h2>Pessoas com acesso</h2><p class="sub">Gestor por UC, Gerente por Gerência; Validador final e Usuário final sem escopo.</p>
   ${S.accAll.length?`<ul class="lst">${S.accAll.map(a=>`<li><div><b>${esc(who(a.Uid))}</b> <span class="pill ${a.Perfil==="gestor"?"ok":a.Perfil==="gerente"?"info":""}">${esc(PERFIS[a.Perfil]||a.Perfil)}</span><div class="note" style="margin:0">${esc(scopeTxt(a))}</div></div><span class="sp"></span><button class="btn sm" data-act="asg" data-uid="${esc(a.Uid)}">Editar</button><button class="btn crit sm" data-act="remover" data-uid="${esc(a.Uid)}">Remover</button></li>`).join("")}</ul>`:`<div class="empty">Ninguém com perfil atribuído. O administrador enxerga tudo por padrão.</div>`}</section></div>
  <p class="note">Use "Ver como" no topo da página para conferir o que cada perfil enxerga.</p>
  <section class="panel" style="margin-top:16px"><h2>Como liberar o acesso</h2><ol class="note" style="margin:0;padding-left:18px;display:grid;gap:4px"><li>Envie o endereço do sistema. A pessoa cria a conta com e-mail e senha, confirma o e-mail e solicita o perfil; o pedido aparece em "Solicitações pendentes".</li><li>Para atribuir antes do pedido, busque a pessoa em "Adicionar pessoa". Só aparece quem já entrou no sistema ao menos uma vez.</li><li>O perfil vale assim que é gravado: o banco passa a liberar exatamente o escopo atribuído (UCs do Gestor, Gerências do Gerente).</li></ol></section>`;
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
  S.asg={uid,perfil:cur?.Perfil||ped?.Perfil||"gestor",ucs:new Set(cur?.UCs||[]),gers:new Set(cur?.Gerencias||[]),q:""};
  names([uid]).then(()=>{if(S.asg)renderAsg()});
  renderAsg();if(!$("#dlg").open)$("#dlg").showModal();
}
function renderAsg(){
  const a=S.asg;if(!a)return;
  const ped=S.pedidos.find(p=>p.Uid===a.uid);
  $("#dlgBody").innerHTML=`<h2>Atribuir perfil</h2><p class="note" style="margin:2px 0 12px"><b>${esc(who(a.uid))}</b>${ped&&ped.Obs?" · pediu: "+esc(ped.Obs):""}</p>
  <div class="chips" role="group" aria-label="Perfil">${["gestor","gerente","validador","final"].map(k=>`<button type="button" data-asgp="${k}" aria-pressed="${a.perfil===k}">${PERFIS[k]}</button>`).join("")}</div>
  <div id="asgScope" style="margin-top:14px">${a.perfil==="gestor"?`<p class="note" style="margin:0 0 8px">UCs sob responsabilidade do Gestor. Só elas aparecerão na lista de preenchimento.</p>
   <div class="chips sm" style="margin-bottom:8px">${GER.map(g=>`<button type="button" data-asgg="${g}">+ todas da ${g}</button>`).join("")}<button type="button" data-asgclear>Limpar</button></div>
   <input type="text" id="asgQ" placeholder="Filtrar UCs" autocomplete="off" value="${esc(a.q)}"><div class="note" id="asgCount" style="margin:6px 0">${a.ucs.size} selecionada(s)</div><div class="ucl" id="asgList"></div>`
   :a.perfil==="gerente"?`<p class="note" style="margin:0 0 8px">Gerências cujos diagnósticos o Gerente aprova.</p><div class="checks">${GER.map(g=>`<label><input type="checkbox" data-asgger="${g}" ${a.gers.has(g)?"checked":""}> ${g} <small class="note" style="margin:0">(${UCS.filter(u=>u[2]===g).length} áreas)</small></label>`).join("")}</div>`
   :a.perfil==="validador"?`<p class="note" style="margin:0">Sem escopo: o Validador final vê os diagnósticos aprovados pelas Gerências, de todas as UCs, e faz a validação final.</p>`:`<p class="note" style="margin:0">Sem escopo: o Usuário final vê o painel e exporta os diagnósticos com validação final, de todas as UCs.</p>`}</div>
  <div class="bar" style="margin:18px 0 0"><button class="btn pri" data-act="asgsalvar">Salvar</button><span class="sp"></span><button class="btn" data-act="fechar">Cancelar</button></div>`;
  renderAsgList();
}
function renderAsgList(){
  const a=S.asg,l=$("#asgList");if(!a||!l){const c=$("#asgCount");if(c&&a)c.textContent=a.ucs.size+" selecionada(s)";return}
  const t=norm(a.q).split(/\s+/).filter(Boolean);
  l.innerHTML=UCS.filter(u=>t.every(x=>norm(u[0]+" "+u[2]).includes(x))).map(u=>`<label><input type="checkbox" data-asguc="${esc(u[0])}" ${a.ucs.has(u[0])?"checked":""}><span>${esc(u[0])}</span><small style="margin-left:auto;color:var(--ink2)">${u[2]}</small></label>`).join("")||`<div class="hint">Nenhuma UC encontrada.</div>`;
  const c=$("#asgCount");if(c)c.textContent=a.ucs.size+" selecionada(s)";
}
async function saveAsg(){
  const a=S.asg;
  if(a.perfil==="gestor"&&!a.ucs.size){toast("Selecione ao menos uma UC.");return}
  if(a.perfil==="gerente"&&!a.gers.size){toast("Selecione ao menos uma Gerência.");return}
  const doc={Uid:a.uid,Perfil:a.perfil,UCs:a.perfil==="gestor"?[...a.ucs]:[],Gerencias:a.perfil==="gerente"?[...a.gers]:[],Por:S.me.id||"admin",Em:new Date().toISOString()};
  try{await S.db.doc("acessos/"+slug(a.uid)).set(doc);try{await S.db.doc("pedidos/"+slug(a.uid)).delete()}catch{}S.asg=null;$("#dlg").close();toast("Perfil atribuído.")}
  catch(e){toast("Não foi possível gravar: "+(e.message||e.code))}
}
async function removeAcc(uid){try{await S.db.doc("acessos/"+slug(uid)).delete();toast("Acesso removido.")}catch(e){toast("Não foi possível remover.")}}
async function recusar(uid){try{await S.db.doc("pedidos/"+slug(uid)).delete();toast("Solicitação removida.")}catch(e){toast("Não foi possível remover.")}}
