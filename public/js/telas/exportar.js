/* Exportação: montagem da tabela para Excel/CSV e o CSV completo da aba Registros. */
"use strict";

const MEAS=[["AreaInterna","Área interna (m²)","sum"],["AreaExterna","Área externa (m²)","sum"],["A_varr","Varrição (m²)","sum"],["AreaSanitaria","Área sanitária (m²)","sum"],["Pessoas","Pessoas na equipe","sum"],["Visitantes","Visitantes por dia","sum"],["Pico","Pico de visitantes","sum"],["Vasos","Vasos","sum"],["Mictorios","Mictórios","sum"],["Lavatorios","Lavatórios","sum"],["Chuveiros","Chuveiros","sum"],["Leitos","Leitos","sum"],["Quartos","Quartos","sum"],["Hospedes","Hóspedes no mês","sum"],["Trocas","Trocas no mês","sum"],["Lixeiras","Lixeiras","sum"],["Dias","Dias de uso por semana","avg"],["Horas","Horas de uso por dia","avg"],["IUP","IUP","avg"],["IPS","IPS","avg"],["IHOS","IHOS","avg"],["CargaTecnica","Carga técnica relativa","sum"],["ValorMensal","Valor referencial (R$/mês)","sum"],["Equipe","Equipe equivalente (postos)","sum"],["HorasMes","Horas de serviço por mês","sum"]];
const CATG=[["FaixaIUP","Faixa do IUP"],["ClasseSan","Classe sanitária"],["Modalidade","Modalidade indicada"],["Compartilhamento","Compartilhamento"],["FrequenciaExterna","Frequência externa"]];
const MGROUPS=[["Áreas",["AreaInterna","AreaExterna","A_varr","AreaSanitaria"]],["Uso e equipe",["Pessoas","Visitantes","Pico","Dias","Horas"]],["Sanitários",["Vasos","Mictorios","Lavatorios","Chuveiros"]],["Hospedagem",["Leitos","Quartos","Hospedes","Trocas"]],["Exterior",["Lixeiras"]],["Indicadores",["IUP","IPS","IHOS","CargaTecnica"]],["Valor e equipe estimada (CadTerc)",["ValorMensal","Equipe","HorasMes"]]];
function expInit(){if(!S.exp)S.exp={lvl:"uc",ger:new Set(),st:new Set(["Homologado"]),meas:new Set(["AreaInterna","AreaExterna","CargaTecnica"]),cats:new Set(),resp:false,items:new Set()}}
const itemMeas=e=>ITEMS.filter(i=>e.items.has(i[0])).flatMap(i=>[["I:a:"+i[0],"Área · "+i[1]+" (m²)","sum"],["I:v:"+i[0],"R$/mês · "+i[1],"sum"]]);
function expPreset(k){
  const e=S.exp;e.items=new Set();
  if(k==="anexo"){e.lvl="uc";e.meas=new Set(["AreaInterna","AreaExterna","ValorMensal"]);e.items=new Set(ITEMS.map(i=>i[0]));e.cats=new Set()}
  else if(k==="ger"){e.lvl="ger";e.meas=new Set(["AreaInterna","AreaExterna","CargaTecnica"]);e.cats=new Set()}
  else if(k==="uc"){e.lvl="uc";e.meas=new Set(["AreaInterna","AreaExterna","Visitantes","IUP","CargaTecnica"]);e.cats=new Set()}
  else{e.lvl="est";e.meas=new Set(MEAS.map(m=>m[0]));e.cats=new Set(CATG.map(c=>c[0]))}
  vExpRefresh();
}
function expRows(){
  const e=S.exp,fin=soPerfil("final");
  return S.recs.filter(x=>inScope(x)&&(!e.ger.size||e.ger.has(x.Gerencia))&&(fin||!e.st.size||e.st.has(x.Status))&&!(S.hideDemo&&x.Exemplo));
}
const rnd=v=>v==null?null:Math.round(v*10000)/10000;
function expBuild(){
  const e=S.exp,rows=expRows(),meas=[...MEAS.filter(m=>e.meas.has(m[0])),...itemMeas(e)],cats=CATG.filter(c=>e.cats.has(c[0]));
  const val=(x,k)=>{let v;if(k==="ValorMensal")v=valorRec(x)?.total;else if(k==="Equipe")v=valorRec(x)?.eq;else if(k==="HorasMes")v=valorRec(x)?.hm;else if(k.startsWith("I:")){const[,t,ik]=k.split(":"),vv=valorRec(x);v=vv?vv.linhas.filter(l=>l.k===ik).reduce((a,l)=>a+(t==="a"?l.a:l.t),0):undefined}else if(k==="AreaExterna")v=areaExt(x);else v=x[k];return typeof v==="number"&&isFinite(v)?v:null};
  let head,body;
  if(e.lvl==="est"){
    head=["Gerência","UC","Categoria","Estrutura","Uso principal",...(e.resp?["Responsável"]:[]),"Situação",...meas.map(m=>m[1]),...cats.map(c=>c[1])];
    body=rows.slice().sort((a,b)=>(a.Gerencia+a.UC+a.Estrutura).localeCompare(b.Gerencia+b.UC+b.Estrutura)).map(x=>[x.Gerencia,x.UC,x.Categoria||"",x.Estrutura,x.Tipo,...(e.resp?[x.Responsavel||""]:[]),sl(x.Status),...meas.map(m=>rnd(val(x,m[0]))),...cats.map(c=>x[c[0]]??"")]);
  }else{
    const key=e.lvl==="uc"?"UC":"Gerencia",gr=new Map();
    rows.forEach(x=>{const k=x[key]||"(sem valor)";if(!gr.has(k))gr.set(k,[]);gr.get(k).push(x)});
    const agg=(a,m)=>{const v=a.map(x=>val(x,m[0])).filter(n=>n!=null);if(!v.length)return null;const s=v.reduce((p,q)=>p+q,0);return rnd(m[2]==="avg"?s/v.length:s)};
    const mh=meas.map(m=>m[1]+(m[2]==="avg"?" — média":" — soma"));
    if(e.lvl==="uc"){head=["Gerência","UC","Categoria","Nº de estruturas",...mh];
      body=[...gr].sort((a,b)=>(a[1][0].Gerencia+a[0]).localeCompare(b[1][0].Gerencia+b[0])).map(([k,a])=>[a[0].Gerencia,k,a[0].Categoria||"",a.length,...meas.map(m=>agg(a,m))])}
    else{head=["Gerência","UCs no cadastro","UCs com diagnóstico","Nº de estruturas",...mh];
      body=[...gr].sort((a,b)=>a[0].localeCompare(b[0])).map(([k,a])=>[k,UCS.filter(u=>u[2]===k).length,new Set(a.map(x=>x.UC)).size,a.length,...meas.map(m=>agg(a,m))])}
  }
  return{head,body};
}
function expPreview(){
  const box=$("#expPrev");if(!box||!S.exp)return;
  const{head,body}=expBuild(),fmt=v=>v==null||v===""?"":typeof v==="number"?Number(v).toLocaleString("pt-BR",{maximumFractionDigits:2}):esc(v);
  box.innerHTML=`<p class="note" style="margin:0 0 8px"><b>${f0(body.length)}</b> linha(s) · ${head.length} coluna(s)${body.length>10?" · mostrando as 10 primeiras":""}</p>`+(body.length?`<div class="tw"><table><thead><tr>${head.map((c,i)=>`<th class="${i>=head.length-(head.length)&&false?"n":""}">${esc(c)}</th>`).join("")}</tr></thead><tbody>${body.slice(0,10).map(r=>`<tr>${r.map(v=>`<td class="${typeof v==="number"?"n":""}">${fmt(v)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`:`<div class="empty">Nenhum diagnóstico com estes critérios.${soPerfil("final")?" Só entram diagnósticos com validação final.":""}</div>`);
  const b=[$("#bXlsx"),$("#bECsv")];b.forEach(x=>x&&(x.disabled=!body.length));
}
function vExpRefresh(){const m=$("#main");vExp(m)}
function vExp(m){
  expInit();const e=S.exp,fin=soPerfil("final"),est=e.lvl==="est";
  m.innerHTML=`<div class="bar"><h2 style="font-size:20px">Exportar para Excel</h2><span class="sp"></span><span class="note" style="margin:0">Atalhos:</span><button class="btn sm" data-epre="ger">Resumo por Gerência</button><button class="btn sm" data-epre="uc">Resumo por UC</button><button class="btn sm" data-epre="est">Tudo por estrutura</button><button class="btn sm" data-epre="anexo">Modelo Anexo II (por UC)</button></div>
  <div>
   <section class="sec"><h2>1. Nível da tabela</h2><p class="sub">Cada linha representa:</p><div class="seg" role="group" aria-label="Nível">${[["est","Estrutura"],["uc","UC"],["ger","Gerência"]].map(([k,t])=>`<button type="button" data-elvl="${k}" aria-pressed="${e.lvl===k}">${t}</button>`).join("")}</div>
    <p class="note" style="margin-bottom:0">${est?"Uma linha por estrutura, com os valores do diagnóstico.":"Valores somados (quantidades) ou em média (dias, horas, IUP, IPS, IHOS) por "+(e.lvl==="uc"?"UC":"Gerência")+"."}</p></section>
   <section class="sec"><h2>2. Recorte</h2><p class="sub">Sem seleção, entram todas as Gerências.</p><div class="chips sm" role="group" aria-label="Gerências">${gersVis().map(g=>`<button type="button" data-eg="${g}" aria-pressed="${e.ger.has(g)}">${g}</button>`).join("")}</div>
    ${fin?`<p class="note">Entram apenas diagnósticos com <b>validação final</b>.</p>`:`<div class="chips sm" style="margin-top:10px" role="group" aria-label="Situação">${STATUS.map(s=>`<button type="button" data-est="${s}" aria-pressed="${e.st.has(s)}">${sl(s)}</button>`).join("")}</div><p class="note" style="margin-bottom:0">Rascunhos e devolvidos não têm indicadores calculados.</p>`}</section>
   <section class="sec"><h2>3. Quantitativos</h2><p class="sub">Marque o que deve virar coluna.</p>
    ${MGROUPS.map(([t,ks])=>`<h3 style="font-size:13px;margin:12px 0 4px">${t}</h3><div class="checks">${ks.map(k=>{const m=MEAS.find(x=>x[0]===k);return `<label><input type="checkbox" data-em="${k}" ${e.meas.has(k)?"checked":""}> ${m[1]}</label>`}).join("")}</div>`).join("")}
    <h3 style="font-size:13px;margin:16px 0 4px">Áreas e valores por tipo de serviço <small class="note">(cada item gera duas colunas: m² e R$/mês)</small></h3><div class="checks">${ITEMS.map(i=>`<label><input type="checkbox" data-ei="${i[0]}" ${e.items.has(i[0])?"checked":""}> ${i[1]}</label>`).join("")}</div>
    <h3 style="font-size:13px;margin:16px 0 4px">Classificações ${est?"":'<small class="note">(somente no nível Estrutura)</small>'}</h3><div class="checks">${CATG.map(([k,t])=>`<label><input type="checkbox" data-ec="${k}" ${e.cats.has(k)?"checked":""} ${est?"":"disabled"}> ${t}</label>`).join("")}${est?`<label><input type="checkbox" id="eResp" ${e.resp?"checked":""}> Responsável pelo preenchimento</label>`:""}</div></section>
  </div>
  <section class="panel"><h2>Prévia</h2><div id="expPrev"></div>
   <div class="bar" style="margin:16px 0 0"><button class="btn pri" id="bXlsx" data-act="xlsx">Baixar Excel (.xlsx)</button><button class="btn" id="bECsv" data-act="ecsv">CSV</button><span class="note" style="margin:0">A planilha inclui uma aba "Critérios" com filtros, data e versão da regra.</span></div></section>`;
  expPreview();
}
async function loadXlsx(){
  if(window.XLSX)return window.XLSX;
  await new Promise((ok,no)=>{const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";s.onload=ok;s.onerror=no;document.head.appendChild(s)});
  if(!window.XLSX)throw 0;return window.XLSX;
}
const expName=ext=>"limpeza_uc_"+S.exp.lvl+"_"+new Date().toISOString().slice(0,10)+"."+ext;
async function saveFile(name,data){
  try{downloadFile(name,data,"text/csv;charset=utf-8");toast("Arquivo salvo.")}
  catch(e){if(e&&e.code==="declined")return;toast("Download indisponível nesta visualização.")}
}
async function exportXlsx(){
  const{head,body}=expBuild();if(!body.length)return;
  let X;try{X=await loadXlsx()}catch{toast("Biblioteca de Excel indisponível. Exportando em CSV.");return exportExpCsv()}
  const e=S.exp,wb=X.utils.book_new(),ws=X.utils.aoa_to_sheet([head,...body]);
  ws["!cols"]=head.map((c,i)=>({wch:Math.min(42,Math.max(10,c.length+2,...body.slice(0,60).map(r=>String(r[i]??"").length+2)))}));
  X.utils.book_append_sheet(wb,ws,"Dados");
  const crit=[["Limpeza das UCs · exportação"],["Gerado em",new Date().toLocaleString("pt-BR")],["Gerado por",S.me.name||""],["Perfil",nomesPerfis()],["Nível",{est:"Estrutura",uc:"UC",ger:"Gerência"}[e.lvl]],["Gerências",e.ger.size?[...e.ger].join(", "):"Todas"],["Situação",soPerfil("final")?"Validado final":(e.st.size?[...e.st].map(sl).join(", "):"Todas")],["Linhas",body.length],["Versão da regra",S.params.VersaoRegra],["Cadastro de UCs","Notion (Áreas protegidas), sincronizado em "+SYNC],["Tabela de valores",S.val.Versao],["Regime de licitação",S.val.Regime==="ampla"?"Participação ampla":"Participação restrita a ME/EPP"],["Fator de reajuste",S.val.Fator],["Observação","Valor referencial = área × valor unitário do CadTerc Vol. 03 por tipo de serviço; é estimativa, não preço contratado. Carga técnica é índice comparativo, não é nº de postos nem preço. Somas e médias ignoram campos vazios."]];
  X.utils.book_append_sheet(wb,X.utils.aoa_to_sheet(crit),"Critérios");
  const out=X.write(wb,{bookType:"xlsx",type:"array"});
  await saveFile(expName("xlsx"),new Blob([out],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}));
}
async function exportExpCsv(){
  const{head,body}=expBuild();
  const q=v=>{if(v==null)return"";const s=typeof v==="number"?String(v).replace(".",","):String(v);return /[;"\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};
  await saveFile(expName("csv"),"﻿"+head.map(q).join(";")+"\n"+body.map(r=>r.map(q).join(";")).join("\n"));
}

async function exportCsv(){
  const cols=[...TXT.filter(k=>!["Observacoes","UCTipo","UCCadastro","Responsavel","Contato"].includes(k)),...NUM,...ITENS,"Observacoes","Status",...RES,"ValorMensal","VersaoRegra"];
  const q=v=>{if(v==null)return"";const s=typeof v==="number"?String(v).replace(".",","):String(v);return /[;"\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};
  const csv="﻿"+cols.join(";")+"\n"+filtered().map(x=>cols.map(k=>q(k==="AreaExterna"?areaExt(x):x[k])).join(";")).join("\n");
  try{downloadFile("diagnostico_limpeza_uc_"+new Date().toISOString().slice(0,10)+".csv",csv,"text/csv;charset=utf-8");toast("Arquivo salvo.")}
  catch(e){if(e&&e.code==="declined")return;toast("Exportação indisponível nesta visualização.")}
}
