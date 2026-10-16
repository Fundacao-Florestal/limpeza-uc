/* Troca de telas, endereço de cada aba (#/painel, #/registros/<ID>…) e desenho da página (render). */
"use strict";

function onData(){
  if(S.view==="form"||$("#dlg").open)return;
  if(S.view==="exp"&&S.exp){renderTabs();renderWho();expPreview();return}
  render();
}

/* Cada aba tem um endereço com "#": o GitHub Pages sempre entrega o mesmo index.html e o app lê o resto.
   Ex.: #/registros, #/acessos, #/painel/APA-BANHADO-01-X7K (abre o detalhe da estrutura). */
const ROTAS={minha:"minhas-ucs",painel:"painel",form:"preenchimento",reg:"registros",exp:"exportar",acc:"acessos",par:"parametros",guia:"guia"};
const ROTA_VIEW=Object.fromEntries(Object.entries(ROTAS).map(([v,r])=>[r,v]));
function lerRota(){
  const p=location.hash.replace(/^#\/?/,"").split("/").map(x=>{try{return decodeURIComponent(x)}catch{return x}});
  return{view:ROTA_VIEW[p[0]]||null,id:p.slice(1).join("/")||null};
}
function rotaAtual(){
  let h="#/"+(ROTAS[S.view]||S.view);
  if(S.openId&&$("#dlg").open)h+="/"+encodeURIComponent(S.openId);
  return h;
}
/* push: cria uma entrada no histórico (troca de aba); senão só corrige o endereço atual. */
function syncRota(push){const h=rotaAtual();if(location.hash!==h)history[push?"pushState":"replaceState"](null,"",h)}
/* Botões voltar/avançar ou endereço digitado. Antes do login não faz nada: a rota é aplicada ao entrar. */
function aplicarRota(){
  if(S.auth&&!S.me.id)return;
  const r=lerRota();
  if($("#dlg").open&&!r.id)$("#dlg").close();
  if(r.view&&r.view!==S.view){
    if(r.view!=="form"){S.form=null;S.edit=null}
    S.view=r.view;render();window.scrollTo({top:0});
  }
  if(r.id&&r.id!==S.openId){S.pendingRec=r.id;abrirPendente()}
}
/* Abre o detalhe pedido no endereço assim que a estrutura estiver carregada. */
function abrirPendente(){
  const id=S.pendingRec;
  if(!id||$("#dlg").open||!S.recs.some(x=>x.ID===id))return;
  S.pendingRec=null;openRec(id);
}

function go(v){S.view=v;S._push=true;render();window.scrollTo({top:0})}
function renderTabs(){
  const tb=tabsFor();if(!tb.some(t=>t[0]===S.view))S.view=tb[0][0];
  $("#tabs").innerHTML=tb.map(([k,l])=>`<button role="tab" data-view="${k}" aria-selected="${k===S.view}">${l}</button>`).join("");
}
function render(){
  const m=$("#main");
  if(S.auth&&!S.authReady){$("#tabs").innerHTML="";m.innerHTML='<div class="panel empty">Conectando…</div>';return}
  if(S.auth&&!S.me.id){$("#tabs").innerHTML="";$("#whoami").innerHTML="";m.innerHTML=vLogin();return}
  if(!S.isOwner&&S.db&&S.me.id&&!S.accReady){$("#tabs").innerHTML="";renderWho();m.innerHTML='<div class="panel empty">Carregando perfil…</div>';return}
  if(!S.started){
    S.started=true;
    const r=lerRota();
    if(r.view)S.view=r.view;else if(tem("gestor"))S.view="minha";
    if(r.id)S.pendingRec=r.id;
  }
  renderTabs();renderWho();
  syncRota(S._push);S._push=false;
  if(S.view==="minha")m.innerHTML=vMinha();
  else if(S.view==="painel")m.innerHTML=vPainel();
  else if(S.view==="exp")vExp(m);
  else if(S.view==="acc"){m.innerHTML=vAcc();renderRqList();if(S.isAdmin&&S.db){names([...S.pedidos.map(p=>p.Uid),...S.accAll.map(a=>a.Uid)]).then(f=>{if(f&&S.view==="acc"&&!$("#dlg").open&&document.activeElement?.id!=="pSearch")$("#main").innerHTML=vAcc()})}}
  else if(S.view==="form")vForm(m);
  else if(S.view==="reg")m.innerHTML=vReg();
  else if(S.view==="par")m.innerHTML=vPar();
  else m.innerHTML=vGuia();
  abrirPendente();
}
