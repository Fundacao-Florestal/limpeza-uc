/* Valor referencial mensal pela tabela CadTerc Vol. 03: valores unitários, produtividades e o cálculo por tipo de serviço (valorar). */
"use strict";

const ITEMS=[["frio","Pisos frios","int"],["acarp","Pisos acarpetados","int"],["lab","Laboratórios","int"],["almox","Almoxarifados / galpões","int"],["ofic","Oficinas","int"],["saguao","Saguão, hall e salão","int"],["sanGC","Sanitários de grande circulação","int"],["pav","Pisos pavimentados adjacentes","ext"],["varr","Varrição de passeios e arruamentos","ext"],["patAlta","Pátios e áreas verdes · alta frequência","ext"],["patMedia","Pátios e áreas verdes · média frequência","ext"],["patBaixa","Pátios e áreas verdes · baixa frequência","ext"]];
const ITENS=["A_acarp","A_lab","A_almox","A_ofic","A_saguao","A_pav","A_varr","A_patAlta","A_patMedia","A_patBaixa"];
Object.assign(LBL,{A_acarp:"Pisos acarpetados",A_lab:"Laboratórios",A_almox:"Almoxarifados / galpões",A_ofic:"Oficinas",A_saguao:"Saguão, hall e salão",A_pav:"Pisos pavimentados adjacentes",A_varr:"Varrição de passeios e arruamentos",A_patAlta:"Pátios · alta frequência",A_patMedia:"Pátios · média frequência",A_patBaixa:"Pátios · baixa frequência"});

const VDEF={Versao:"CadTerc Vol. 03 · data-base jan/2023 (versão 02, set/2023)",Regime:"ampla",Fator:1,LimitePequena:750,
 ampla:{
  geral:{frio:6.82,acarp:6.82,lab:12.39,almox:3.03,ofic:3.41,saguao:5.11,sanGC:8.38,pav:3.41,varr:0.72,patAlta:0.65,patMedia:0.32,patBaixa:0.17},
  pequena:{frio:10.05,acarp:10.05,lab:18.25,almox:4.46,ofic:5.02,saguao:7.54,sanGC:13.16,pav:5.02,varr:1.04,patAlta:0.87,patMedia:0.44,patBaixa:0.22},
  parque:{varr:0.90,posto8:7922.18,posto16:15844.36}},
 restrita:{
  geral:{frio:6.38,acarp:6.38,lab:11.58,almox:2.83,ofic:3.19,saguao:4.79,sanGC:7.79,pav:3.19,varr:0.67,patAlta:0.60,patMedia:0.30,patBaixa:0.16},
  pequena:{frio:9.52,acarp:9.52,lab:17.29,almox:4.23,ofic:4.76,saguao:7.14,sanGC:12.34,pav:4.76,varr:0.99,patAlta:0.82,patMedia:0.42,patBaixa:0.21},
  parque:{varr:0.84,posto8:7360.82,posto16:14721.64}}};
function dm(a,b){const o=clone(a);if(!b||typeof b!=="object")return o;for(const k of Object.keys(o)){const x=b[k];if(x==null)continue;if(o[k]&&typeof o[k]==="object")o[k]=dm(o[k],x);else if(typeof o[k]==="number"){if(isFinite(Number(x)))o[k]=Number(x)}else o[k]=x}return o}
/* Coeficientes de participação do CadTerc Vol. 03 (m² por funcionário) e jornadas de referência. Uso gerencial, não é exigência contratual (item 1.11). */
const PROD={
 geral:{frio:750,acarp:750,lab:413,almox:1688,ofic:1500,saguao:1000,sanGC:750,pav:1500,varr:7500},
 pequena:{frio:375,acarp:375,lab:206.5,almox:844,ofic:750,saguao:500,sanGC:375,pav:750,varr:3750},
 pat:{geral:1500,pequena:750},patH:{geral:[34.8,17.4,8.7],pequena:[17.4,8.7,4.35]},
 jor:{geral:{hs:44,dias:6},pequena:{hs:24,dias:6},parque:{hs:44,dias:7}},ENC:0.03};

/* Cálculo do valor referencial mensal: área × valor unitário do CadTerc por tipo de serviço. */
function valorar(r,x,v){
  v=v||S.val;
  const T=v[v.Regime]||v.ampla,ai=Number(r.AreaInterna)||0,ae=Number(r.AreaExterna)||0,as=Number(r.AreaSanitaria)||0;
  const pequena=(ai+ae)<=v.LimitePequena,U=pequena?T.pequena:T.geral,parque=r.Categoria==="Parque Estadual",fator=v.Fator>0?v.Fator:1;
  const tb=pequena?"pequena":"geral",hpm=PROD.jor[tb].hs*4.35;
  const base={v:2,tabela:tb,regime:v.Regime,fator,versao:v.Versao,limite:v.LimitePequena,parque,jornada:pequena?"24 h por semana (meio período), 2ª a sábado":"44 h por semana, 2ª a sábado"};
  if(Number(r.Dias)===0)return{...base,linhas:[],total:0,semUso:true,eq:0,enc:0,hm:0,dias:0};
  const g=k=>Math.max(0,Number(r["A_"+k])||0),L=[];
  const R=(n,d)=>Math.round(n*d)/d;
  const add=(k,rot,a,pr,uni)=>{const t=R(a*pr*fator,100);if(!(a>0))return;
    let eq=0,hm=0,dias=PROD.jor[tb].dias;const pi=["patAlta","patMedia","patBaixa"].indexOf(k);
    if(pi>=0){hm=a/PROD.pat[tb]*PROD.patH[tb][pi];eq=hm/hpm}
    else if(k==="varr"&&parque){eq=a/PROD.geral.varr;hm=eq*PROD.jor.parque.hs*4.35;dias=PROD.jor.parque.dias}
    else if(PROD[tb][k]){eq=a/PROD[tb][k];hm=eq*hpm}
    L.push({k,r:rot,a:R(a,100),pr,t,uni:uni||"m²",eq:R(eq,1000),hm:R(hm,10),dias})};
  const sanQ=r.Sanitario===1&&r.Publico===1&&(x.ClasseSan==="SAN-3"||x.ClasseSan==="SAN-4");
  const sanA=sanQ?as:0;
  const remI=Math.max(0,ai-g("acarp")-g("lab")-g("almox")-g("ofic")-g("saguao")-sanA);
  const galpao=r.Tipo==="Galpão / oficina";
  add("frio","Pisos frios",galpao?0:remI,U.frio);
  add("acarp","Pisos acarpetados",g("acarp"),U.acarp);
  add("lab","Laboratórios",g("lab"),U.lab);
  add("almox","Almoxarifados / galpões",g("almox")+(galpao?remI:0),U.almox);
  add("ofic","Oficinas",g("ofic"),U.ofic);
  add("saguao","Saguão, hall e salão",g("saguao"),U.saguao);
  if(sanQ){
    if(parque){const s16=x.ClasseSan==="SAN-4",pr=s16?T.parque.posto16:T.parque.posto8;L.push({k:"sanGC",r:"Posto sanitário em parque ("+(s16?"16":"8")+" h diárias)",a:0,pr,t:Math.round(pr*fator*100)/100,uni:"posto",eq:s16?2:1,hm:R((s16?16:8)*30.42,10),dias:7})}
    else add("sanGC","Sanitários de grande circulação",sanA,U.sanGC);
  }
  const remE=x.FrequenciaExterna==="Não se aplica"?0:Math.max(0,ae-g("pav")-g("varr")-g("patAlta")-g("patMedia")-g("patBaixa"));
  const pk=x.FrequenciaExterna==="Semanal"?"patAlta":x.FrequenciaExterna==="Quinzenal"?"patMedia":"patBaixa";
  add("pav","Pisos pavimentados adjacentes",g("pav"),U.pav);
  add("varr","Varrição de passeios e arruamentos",g("varr"),parque?T.parque.varr:U.varr);
  add("patAlta","Pátios e áreas verdes · alta frequência",g("patAlta")+(pk==="patAlta"?remE:0),U.patAlta);
  add("patMedia","Pátios e áreas verdes · média frequência",g("patMedia")+(pk==="patMedia"?remE:0),U.patMedia);
  add("patBaixa","Pátios e áreas verdes · baixa frequência",g("patBaixa")+(pk==="patBaixa"?remE:0),U.patBaixa);
  const eqT=R(L.reduce((s,l)=>s+l.eq,0),1000),hmT=R(L.reduce((s,l)=>s+l.hm,0),10);
  return{...base,linhas:L,total:Math.round(L.reduce((s,l)=>s+l.t,0)*100)/100,semUso:false,eq:eqT,enc:R(eqT*PROD.ENC,1000),hm:hmT,dias:L.reduce((m,l)=>Math.max(m,l.dias),0)};
}
function valorRec(x){if(!hasRes(x))return null;if(x.ValorJSON){try{const j=JSON.parse(x.ValorJSON);if(j&&j.v===2&&typeof j.total==="number")return j}catch{}}return valorar(x,x,S.val)}
function valTable(vv){
  if(!vv)return"";
  if(vv.semUso)return `<p class="note">Estrutura sem uso atual (0 dia por semana): valor referencial zero.</p>`;
  const q=l=>l.uni==="posto"?"1 posto":f2(l.a)+" m²";
  return `<h3 style="font-size:14px;margin-top:14px">Valor referencial mensal</h3><div class="tw"><table><thead><tr><th>Serviço</th><th class="n">Quantidade</th><th class="n">Unitário</th><th class="n">R$/mês</th></tr></thead><tbody>${vv.linhas.map(l=>`<tr><td>${esc(l.r)}</td><td class="n">${q(l)}</td><td class="n">${f2(l.pr*vv.fator)}</td><td class="n">${f2(l.t)}</td></tr>`).join("")||`<tr><td colspan="4" class="empty">Sem áreas informadas.</td></tr>`}</tbody><tfoot><tr><td colspan="3">Total</td><td class="n">${f2(vv.total)}</td></tr></tfoot></table></div><p class="note">Tabela ${vv.tabela==="pequena"?`de pequenas áreas (construído e externo até ${f0(vv.limite)} m²)`:"geral"} · ${vv.regime==="ampla"?"participação ampla":"participação restrita a ME/EPP"} · fator de reajuste ${vv.fator} · ${esc(vv.versao)}. Estimativa de referência, não é preço contratado.</p>${vv.semUso?"":`<p class="note">Equipe e horas: estimativa gerencial pelos coeficientes de participação do CadTerc (jornada de referência: ${esc(vv.jornada)}; 1 encarregado para 30 profissionais). Não deve constar do edital (item 1.11 do documento).</p>`}`;
}
