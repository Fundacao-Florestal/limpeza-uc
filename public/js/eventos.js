/* Cliques, digitação e mudanças na página, ligados às funções de cada tela. Por último, inicia o app (boot). */
"use strict";

document.addEventListener("click",e=>{
  const t=e.target.closest("button,tr[data-open]");if(!t)return;
  if(t.dataset.view){go(t.dataset.view);return}
  if(t.dataset.open){openRec(t.dataset.open);return}
  if(t.dataset.flag){setFlag(t.dataset.flag,Number(t.dataset.v));return}
  if(t.dataset.uc!==undefined){pickUc(Number(t.dataset.uc));return}
  if(t.dataset.tipo){pickTipo(t.dataset.tipo);return}
  if(t.dataset.ucg!==undefined){S.ucG=t.dataset.ucg;renderUcBox();return}
  if(t.dataset.eg){toggle(S.exp.ger,t.dataset.eg);vExpRefresh();return}
  if(t.dataset.est){toggle(S.exp.st,t.dataset.est);vExpRefresh();return}
  if(t.dataset.elvl){S.exp.lvl=t.dataset.elvl;vExpRefresh();return}
  if(t.dataset.epre){expPreset(t.dataset.epre);return}
  if(t.dataset.asgp){S.asg.perfil=t.dataset.asgp;renderAsg();return}
  if(t.dataset.asgg){UCS.filter(u=>u[2]===t.dataset.asgg).forEach(u=>S.asg.ucs.add(u[0]));renderAsgList();return}
  if(t.dataset.asgclear!==undefined){S.asg.ucs.clear();renderAsgList();return}
  if(t.dataset.psel){openAsg(t.dataset.psel);return}
  const a=t.dataset.act;if(!a)return;
  if(a==="fila"){S.fSt="Em validação";S.fGer="";go("reg")}
  else if(a==="filaH"){S.fSt="Validado";S.fGer="";go("reg")}
  else if(a==="homologar")transition(t.dataset.id,"Homologado","");
  else if(a==="novo"){S.form=newForm();S.edit=null;go("form")}
  else if(a==="cancelar"){const was=!!S.edit;S.form=null;S.edit=null;go(was?(perfil()==="gestor"?"minha":"reg"):(perfil()==="gestor"?"minha":"painel"))}
  else if(a==="rascunho")submit(false);
  else if(a==="concluir")submit(true);
  else if(a==="concluirmais")submit(true,true);
  else if(a==="novaUc"){S.form=newForm();applyUc(S.form,t.dataset.nuc);S.edit=null;S.ucManual=false;go("form")}
  else if(a==="csv")exportCsv();
  else if(a==="trocaruc"){S.form.UC="";S.form.Gerencia="";S.form.Categoria="";S.form.UCTipo="";S.ucQ="";S.ucG="";renderUcBox();refreshCheck();const q=$("#ucQ");q&&q.focus()}
  else if(a==="ucmanual"){S.ucManual=true;S.form.UC="";S.form.Gerencia="";S.form.Categoria="";S.form.UCTipo="";S.form.UCCadastro="Manual";renderUcBox();refreshCheck()}
  else if(a==="ucvoltar"){S.ucManual=false;S.form.UC="";S.form.Gerencia="";S.form.Categoria="";S.form.UCTipo="";S.form.UCCadastro="Notion";renderUcBox();refreshCheck()}
  else if(a==="dup"){const x=S.recs.find(r=>r.ID===t.dataset.id);if(!x)return;S.form={...blankRec(),...Object.fromEntries([...TXT,...NUM,...ITENS].map(k=>[k,x[k]??(NUMK(k)?null:"")]))};S.form.ID="";S.form.Observacoes="";S.form.Responsavel=S.me.name||S.form.Responsavel;S.form.Estrutura=x.Estrutura+" (cópia)";S.edit=null;S.ucManual=false;$("#dlg").close();go("form")}
  else if(a==="fechar")$("#dlg").close();
  else if(a==="outra"){$("#dlg").close();S.form=newForm();Object.assign(S.form,S._keep||{});S.ucManual=false;S.view="form";render();window.scrollTo({top:0})}
  else if(a==="edit"){const x=S.recs.find(r=>r.ID===t.dataset.id);if(!x)return;S.form={...blankRec(),...Object.fromEntries([...TXT,...NUM,...ITENS].map(k=>[k,x[k]??(NUMK(k)?null:"")]))};S.edit=x;$("#dlg").close();go("form")}
  else if(a==="validar")transition(t.dataset.id,"Validado","");
  else if(a==="devolver")transition(t.dataset.id,"Devolvido",$("#motivo")?.value||"");
  else if(a==="excluir"){const id=t.dataset.id;(async()=>{try{const x=S.recs.find(r=>r.ID===id);if(!x)return;await delRec(x);$("#dlg").close();toast("Rascunho excluído.");render()}catch(x){toast("Não foi possível excluir.")}})()}
  else if(a==="salvarpar")savePar();
  else if(a==="salvarval")saveVal();
  else if(a==="padraoval")fillVal(VDEF);
  else if(a==="asg")openAsg(t.dataset.uid);
  else if(a==="asgsalvar")saveAsg();
  else if(a==="remover")removeAcc(t.dataset.uid);
  else if(a==="recusar")recusar(t.dataset.uid);
  else if(a==="solicitar")solicitar();
  else if(a==="copiarmsg"){const m=$("#rqMsg");try{navigator.clipboard.writeText(m.value).then(()=>toast("Mensagem copiada."),()=>{m.select();toast("Selecione e copie a mensagem.")})}catch{m.select();toast("Selecione e copie a mensagem.")}}
  else if(a==="xlsx")exportXlsx();
  else if(a==="ecsv")exportExpCsv();
  else if(a==="padrao"){Object.keys(PLBL).forEach(k=>$("#p_"+k).value=DEF[k]);$("#p_VersaoRegra").value=DEF.VersaoRegra}
});
document.addEventListener("input",e=>{
  const el=e.target;
  if(el.id==="ucQ"){S.ucQ=el.value;renderUcList();return}
  if(el.id==="asgQ"){S.asg.q=el.value;renderAsgList();return}
  if(el.id==="pSearch"){psSearch(el.value);return}
  if(el.dataset&&el.dataset.k&&S.form){const k=el.dataset.k;
    if(el.max!==""&&el.value!==""&&Number(el.value)>Number(el.max))el.value=el.max;
    if(NUMK(k)){S.form[k]=el.value===""?null:Number(el.value)}else S.form[k]=el.value;
    if(el.dataset.sel&&NUMK(k))S.form[k]=el.value===""?null:Number(el.value);
    refreshCheck();return}
  if(el.id==="fQ"){S.fQ=el.value;const p=el.selectionStart;render();const n=$("#fQ");n.focus();n.setSelectionRange(p,p)}
});
document.addEventListener("change",e=>{
  const el=e.target;
  if(el.id==="vAs"){S.viewAs=el.value;S.form=null;S.edit=null;S.view=el.value==="gestor"?"minha":"painel";render()}
  else if(el.dataset&&el.dataset.em){toggle(S.exp.meas,el.dataset.em,el.checked);vExpRefresh()}
  else if(el.dataset&&el.dataset.ei){toggle(S.exp.items,el.dataset.ei,el.checked);vExpRefresh()}
  else if(el.dataset&&el.dataset.ec){toggle(S.exp.cats,el.dataset.ec,el.checked);vExpRefresh()}
  else if(el.id==="eResp"){S.exp.resp=el.checked;vExpRefresh()}
  else if(el.dataset&&el.dataset.asguc){toggle(S.asg.ucs,el.dataset.asguc,el.checked);const c=$("#asgCount");if(c)c.textContent=S.asg.ucs.size+" selecionada(s)"}
  else if(el.dataset&&el.dataset.asgger){toggle(S.asg.gers,el.dataset.asgger,el.checked)}
  else if(el.id==="fDemo"){S.hideDemo=el.checked;render()}
  else if(el.id==="fGer"){S.fGer=el.value;render()}
  else if(el.id==="fSt"){S.fSt=el.value;render()}
  else if(el.dataset&&el.dataset.sel&&S.form){const k=el.dataset.k;S.form[k]=NUMK(k)?(el.value===""?null:Number(el.value)):el.value;if(k==="Categoria"){const ci=CATS.indexOf(el.value);S.form.UCTipo=ci>=0?CAT_TIPO[ci]:""}refreshCheck()}
});
document.addEventListener("keydown",e=>{if(e.target.id==="ucQ"&&e.key==="Enter"){e.preventDefault();const m=ucMatches(S.ucQ);if(m.length===1)pickUc(m[0][1])}});
$("#dlg").addEventListener("close",()=>{S.asg=null;S.openId=null;if(S.view!=="form")render();else syncRota(false)});
window.addEventListener("hashchange",aplicarRota);
window.addEventListener("popstate",aplicarRota);
document.addEventListener("click",e=>{const m=e.target.closest("[data-fbmode]");if(m){fbMode(m.dataset.fbmode);return}const t=e.target.closest("[data-fb]");if(t&&t.dataset.fb==="logout"&&S.auth){S.loginOk="";S.auth.signOut()}});
document.addEventListener("submit",e=>{const f=e.target.closest("[data-fbform]");if(!f)return;e.preventDefault();fbEmail(f.dataset.fbform)});
boot();
