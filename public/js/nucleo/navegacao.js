/* Troca de telas e desenho da página (render). */
"use strict";

function onData(){
  if(S.view==="form"||$("#dlg").open)return;
  if(S.view==="exp"&&S.exp){renderTabs();renderWho();expPreview();return}
  render();
}

function go(v){S.view=v;render();window.scrollTo({top:0})}
function renderTabs(){
  const tb=tabsFor();if(!tb.some(t=>t[0]===S.view))S.view=tb[0][0];
  $("#tabs").innerHTML=tb.map(([k,l])=>`<button role="tab" data-view="${k}" aria-selected="${k===S.view}">${l}</button>`).join("");
}
function render(){
  const m=$("#main");
  if(S.auth&&!S.authReady){$("#tabs").innerHTML="";m.innerHTML='<div class="panel empty">Conectando…</div>';return}
  if(S.auth&&!S.me.id){$("#tabs").innerHTML="";$("#whoami").innerHTML="";m.innerHTML=vLogin();return}
  if(!S.isOwner&&S.db&&S.me.id&&!S.accReady){$("#tabs").innerHTML="";renderWho();m.innerHTML='<div class="panel empty">Carregando perfil…</div>';return}
  if(!S.started){S.started=true;if(perfil()==="gestor")S.view="minha"}
  renderTabs();renderWho();
  if(S.view==="minha")m.innerHTML=vMinha();
  else if(S.view==="painel")m.innerHTML=vPainel();
  else if(S.view==="exp")vExp(m);
  else if(S.view==="acc"){m.innerHTML=vAcc();if(S.isAdmin&&S.db){names([...S.pedidos.map(p=>p.Uid),...S.accAll.map(a=>a.Uid)]).then(f=>{if(f&&S.view==="acc"&&!$("#dlg").open&&document.activeElement?.id!=="pSearch")$("#main").innerHTML=vAcc()})}}
  else if(S.view==="form")vForm(m);
  else if(S.view==="reg")m.innerHTML=vReg();
  else if(S.view==="par")m.innerHTML=vPar();
  else m.innerHTML=vGuia();
}
