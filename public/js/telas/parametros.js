/* Parâmetros: limites da regra dos indicadores e tabela de valores do CadTerc (Administrador). */
"use strict";

function vPar(){
  const p=S.params,ed=S.isAdmin||!S.db;
  return `<div class="panel"><h2>Parâmetros da regra</h2><p class="sub">Novos diagnósticos usam estes valores e guardam uma cópia (versão da regra). Registros já concluídos mantêm os valores da época. Os pesos e cortes são propostas de teste, sem aprovação institucional.</p>
  ${ed?"":`<div class="banner">Somente o perfil administrador altera parâmetros.</div>`}
  <div class="fields" style="margin-top:8px"><label class="f wide">Versão da regra<input type="text" id="p_VersaoRegra" value="${esc(p.VersaoRegra)}" ${ed?"":"disabled"}></label>
  ${Object.keys(PLBL).map(k=>`<label class="f">${PLBL[k]}<input type="number" step="any" id="p_${k}" value="${p[k]}" ${ed?"":"disabled"} class="mono"></label>`).join("")}</div>
  <div id="perr" class="chk" style="margin-top:12px"></div>
  <div class="bar" style="margin:16px 0 0"><button class="btn pri" data-act="salvarpar" ${ed?"":"disabled"}>Publicar versão</button><button class="btn" data-act="padrao" ${ed?"":"disabled"}>Restaurar padrão</button></div>
  <p class="note">Os limites do IPS (30, 300, 100, 800) e os cortes de dias e horas do IUP são fixos na regra e só mudam com nova versão do código.</p></div>`+vVal();
}

function vVal(){
  const v=S.val,ed=S.isAdmin||!S.db,inp=(id,val)=>`<input type="number" step="any" min="0" class="mono" id="${id}" value="${val}" ${ed?"":"disabled"}>`;
  const cols=[["ampla","geral","Ampla · geral"],["ampla","pequena","Ampla · pequenas áreas"],["restrita","geral","Restrita · geral"],["restrita","pequena","Restrita · pequenas áreas"]];
  return `<div class="panel" style="margin-top:16px"><h2>Tabela de valores referenciais (CadTerc)</h2><p class="sub">Base do cálculo final: valor mensal = área × valor unitário do tipo de serviço. Valores em R$/m²/mês, data-base indicada abaixo. Conforme o item 1.12 do documento, o reajuste segue o Decreto Estadual 48.326/2003: atualize o fator e a data-base quando houver nova versão do CadTerc.</p>
  ${ed?"":`<div class="banner">Somente o perfil administrador altera a tabela.</div>`}
  <div class="fields"><label class="f wide">Versão da tabela<input type="text" id="v_Versao" value="${esc(v.Versao)}" ${ed?"":"disabled"}></label>
  <label class="f">Regime de licitação<select id="v_Regime" ${ed?"":"disabled"}><option value="ampla" ${v.Regime==="ampla"?"selected":""}>Participação ampla (acima de R$ 80 mil/ano)</option><option value="restrita" ${v.Regime==="restrita"?"selected":""}>Participação restrita a ME/EPP</option></select></label>
  <label class="f">Fator de reajuste (1 = data-base)${inp("v_Fator",v.Fator)}</label>
  <label class="f">Limite de pequenas áreas (m², construído + externo)${inp("v_LimitePequena",v.LimitePequena)}</label></div>
  <div class="tw vt" style="margin-top:12px"><table><thead><tr><th>Serviço (R$/m²/mês)</th>${cols.map(c=>`<th class="n">${c[2]}</th>`).join("")}</tr></thead><tbody>
  ${ITEMS.map(i=>`<tr><td>${i[1]}</td>${cols.map(([rg,tb])=>`<td class="n">${inp(`v_${rg}_${tb}_${i[0]}`,v[rg][tb][i[0]])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
  <div class="tw vt" style="margin-top:12px"><table><thead><tr><th>Parques estaduais (Apêndice 3)</th><th class="n">Ampla</th><th class="n">Restrita</th></tr></thead><tbody>
  ${[["varr","Varrição de passeios e arruamentos (R$/m²/mês)"],["posto8","Posto sanitário 8 h diárias (R$/posto/mês)"],["posto16","Posto sanitário 16 h diárias (R$/posto/mês)"]].map(([k,t])=>`<tr><td>${t}</td>${["ampla","restrita"].map(rg=>`<td class="n">${inp(`v_${rg}_parque_${k}`,v[rg].parque[k])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
  <div id="verr" class="chk" style="margin-top:12px"></div>
  <div class="bar" style="margin:16px 0 0"><button class="btn pri" data-act="salvarval" ${ed?"":"disabled"}>Publicar tabela</button><button class="btn" data-act="padraoval" ${ed?"":"disabled"}>Restaurar CadTerc jan/2023</button></div></div>`;
}
function readVal(){
  const v={Versao:$("#v_Versao").value.trim()||VDEF.Versao,Regime:$("#v_Regime").value,Fator:Number($("#v_Fator").value),LimitePequena:Number($("#v_LimitePequena").value)};
  ["ampla","restrita"].forEach(rg=>{v[rg]={geral:{},pequena:{},parque:{}};["geral","pequena"].forEach(tb=>ITEMS.forEach(i=>v[rg][tb][i[0]]=Number($(`#v_${rg}_${tb}_${i[0]}`).value)));["varr","posto8","posto16"].forEach(k=>v[rg].parque[k]=Number($(`#v_${rg}_parque_${k}`).value))});
  return v;
}
function valErr(v){
  const e=[],all=[];["ampla","restrita"].forEach(rg=>["geral","pequena","parque"].forEach(tb=>Object.values(v[rg][tb]).forEach(n=>all.push(n))));
  if(all.some(n=>!isFinite(n)||n<0))e.push("Todos os valores devem ser números não negativos.");
  if(!(v.Fator>0))e.push("O fator de reajuste deve ser positivo.");
  if(!(v.LimitePequena>0))e.push("O limite de pequenas áreas deve ser positivo.");
  return e;
}
async function saveVal(){
  const v=readVal(),e=valErr(v);$("#verr").innerHTML=e.map(t=>`<li>${esc(t)}</li>`).join("");if(e.length)return;
  try{if(S.db)await S.db.doc("config/valores").set(v);S.val=dm(VDEF,v);toast("Tabela de valores publicada. Vale para novos envios; registros já enviados mantêm o valor da época.");render()}catch(x){toast("Não foi possível gravar: "+(x.message||x.code))}
}
function fillVal(v){$("#v_Versao").value=v.Versao;$("#v_Regime").value=v.Regime;$("#v_Fator").value=v.Fator;$("#v_LimitePequena").value=v.LimitePequena;["ampla","restrita"].forEach(rg=>{["geral","pequena"].forEach(tb=>ITEMS.forEach(i=>$(`#v_${rg}_${tb}_${i[0]}`).value=v[rg][tb][i[0]]));["varr","posto8","posto16"].forEach(k=>$(`#v_${rg}_parque_${k}`).value=v[rg].parque[k])})}

async function savePar(){
  const p={VersaoRegra:$("#p_VersaoRegra").value.trim()||DEF.VersaoRegra};
  Object.keys(PLBL).forEach(k=>p[k]=Number($("#p_"+k).value));
  const e=paramErr(p);$("#perr").innerHTML=e.map(t=>`<li>${esc(t)}</li>`).join("");
  if(e.length)return;
  try{if(S.db)await S.db.doc("config/parametros").set(p);S.params={...DEF,...p};toast("Versão da regra publicada.");render()}catch(x){toast("Não foi possível gravar: "+(x.message||x.code))}
}
