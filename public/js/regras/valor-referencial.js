/* Valor referencial mensal pela tabela CadTerc Vol. 03: valores unitários, produtividades e o cálculo por tipo de serviço (valorar). */
"use strict";

const ITEMS=[["frio","Pisos frios","int"],["acarp","Pisos acarpetados","int"],["lab","Laboratórios","int"],["almox","Almoxarifados / galpões","int"],["ofic","Oficinas","int"],["saguao","Saguão, hall e salão","int"],["sanGC","Sanitários de grande circulação","int"],["pav","Pisos pavimentados adjacentes","ext"],["varr","Varrição de passeios e arruamentos","ext"],["patAlta","Pátios e áreas verdes · alta frequência","ext"],["patMedia","Pátios e áreas verdes · média frequência","ext"],["patBaixa","Pátios e áreas verdes · baixa frequência","ext"],["vidTriS","Vidros externos · trimestral, sem risco","vid"],["vidSemS","Vidros externos · semestral, sem risco","vid"],["vidTriR","Vidros externos · trimestral, com risco","vid"],["vidSemR","Vidros externos · semestral, com risco","vid"]];
/* Detalhamento das áreas. Internas: a soma tem de bater com a área interna; externas: com a área externa. */
const ITENS_INT=["A_frio","A_acarp","A_lab","A_almox","A_ofic","A_saguao"],ITENS_EXT=["A_pav","A_patAlta","A_patMedia","A_patBaixa"];
/* Varrição é um serviço à parte no CadTerc, como vidros: não entra na área externa.
   Registros anteriores a essa separação (sem VarrSep) tinham a varrição dentro da área externa. */
const areaExt=r=>r.AreaExterna==null?null:r.VarrSep===1?Number(r.AreaExterna)||0:Math.max(0,(Number(r.AreaExterna)||0)-(Number(r.A_varr)||0));
const ITENS=["A_frio","A_acarp","A_lab","A_almox","A_ofic","A_saguao","A_pav","A_varr","A_patAlta","A_patMedia","A_patBaixa"];
Object.assign(LBL,{A_frio:"Pisos frios",A_acarp:"Pisos acarpetados",A_lab:"Laboratórios",A_almox:"Almoxarifados / galpões",A_ofic:"Oficinas",A_saguao:"Saguão, hall e salão",A_pav:"Pisos pavimentados adjacentes",A_varr:"Varrição de passeios e arruamentos",A_patAlta:"Pátios · alta frequência",A_patMedia:"Pátios · média frequência",A_patBaixa:"Pátios · baixa frequência"});

/* Valores do CadTerc Vol. 03, versão 1 (agosto/2026), data-base janeiro/2026, em R$/m²/mês (postos em R$/posto/mês).
   ampla: Quadro 38 (geral), Quadro 161 (pequenas áreas, Apêndice 4), Quadro 145 (parques, Apêndice 3).
   vidTriS/vidSemS/vidTriR/vidSemR: vidros externos, trimestral ou semestral, sem (S) ou com (R) exposição a risco.
   restrita (ME/EPP): Quadro 84 (geral), Quadro 178 (pequenas áreas), Quadro 154 (parques). */
const VDEF={Versao:"CadTerc Vol. 03 · data-base jan/2026 (versão 1, ago/2026)",Regime:"ampla",Fator:1,LimitePequena:750,
 ampla:{
  geral:{frio:8.89,acarp:8.89,lab:16.15,almox:3.95,ofic:4.45,saguao:6.68,sanGC:10.84,pav:4.45,varr:0.91,patAlta:0.83,patMedia:0.42,patBaixa:0.21,vidTriS:2.71,vidSemS:2.53,vidTriR:3.45,vidSemR:2.89},
  pequena:{frio:11.71,acarp:11.71,lab:21.26,almox:5.21,ofic:5.85,saguao:8.78,sanGC:15.60,pav:5.85,varr:1.20,patAlta:1.00,patMedia:0.50,patBaixa:0.25,vidTriS:3.27,vidSemS:3.04,vidTriR:4.13,vidSemR:3.47},
  parque:{varr:1.15,posto8:10247.16,posto16:20494.32}},
 restrita:{
  geral:{frio:8.31,acarp:8.31,lab:15.08,almox:3.69,ofic:4.16,saguao:6.23,sanGC:10.07,pav:4.16,varr:0.85,patAlta:0.78,patMedia:0.38,patBaixa:0.20,vidTriS:2.54,vidSemS:2.36,vidTriR:3.22,vidSemR:2.70},
  pequena:{frio:10.92,acarp:10.92,lab:19.83,almox:4.85,ofic:5.46,saguao:8.19,sanGC:14.44,pav:5.46,varr:1.12,patAlta:0.93,patMedia:0.47,patBaixa:0.23,vidTriS:3.05,vidSemS:2.83,vidTriR:3.85,vidSemR:3.23},
  parque:{varr:1.07,posto8:9517.19,posto16:19034.38}}};
function dm(a,b){const o=clone(a);if(!b||typeof b!=="object")return o;for(const k of Object.keys(o)){const x=b[k];if(x==null)continue;if(o[k]&&typeof o[k]==="object")o[k]=dm(o[k],x);else if(typeof o[k]==="number"){if(isFinite(Number(x)))o[k]=Number(x)}else o[k]=x}return o}
/* Coeficientes de participação do CadTerc Vol. 03 (m² por funcionário) e jornadas de referência. Uso gerencial, não é exigência contratual (item 1.11). */
const PROD={
 geral:{frio:750,acarp:750,lab:413,almox:1688,ofic:1500,saguao:1000,sanGC:750,pav:1500,varr:7500},
 pequena:{frio:375,acarp:375,lab:206.5,almox:844,ofic:750,saguao:500,sanGC:375,pav:750,varr:3750},
 pat:{geral:1500,pequena:750},patH:{geral:[34.8,17.4,8.7],pequena:[17.4,8.7,4.35]},
 jor:{geral:{hs:44,dias:6},pequena:{hs:24,dias:6},parque:{hs:44,dias:7}},ENC:0.03,
 /* Vidros (Quadros 42 e 43): face interna 275 m²/h, 17,40 h/mês; face externa 275 m²/h sem risco ou 138 com risco,
    2,90 h/mês trimestral ou 1,45 semestral. Horas = área ÷ produtividade × horas do mês. */
 vid:{int:{prod:275,h:17.40},ext:{S:275,R:138},h:{1:2.90,2:1.45}}};

/* Cálculo do valor referencial mensal: área × valor unitário do CadTerc por tipo de serviço. */
function valorar(r,x,v){
  v=v||S.val;
  const T=v[v.Regime]||v.ampla,ai=Number(r.AreaInterna)||0,ae=areaExt(r)||0,as=Number(r.AreaSanitaria)||0;
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
  /* Registros antigos, sem pisos frios declarados: em galpão/oficina o restante vira almoxarifado. */
  const galpao=r.Tipo==="Galpão / oficina"&&r.A_frio==null;
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
  const remE=x.FrequenciaExterna==="Não se aplica"?0:Math.max(0,ae-g("pav")-g("patAlta")-g("patMedia")-g("patBaixa"));
  const pk=x.FrequenciaExterna==="Semanal"?"patAlta":x.FrequenciaExterna==="Quinzenal"?"patMedia":"patBaixa";
  add("pav","Pisos pavimentados adjacentes",g("pav"),U.pav);
  add("varr","Varrição de passeios e arruamentos",g("varr"),parque?T.parque.varr:U.varr);
  add("patAlta","Pátios e áreas verdes · alta frequência",g("patAlta")+(pk==="patAlta"?remE:0),U.patAlta);
  add("patMedia","Pátios e áreas verdes · média frequência",g("patMedia")+(pk==="patMedia"?remE:0),U.patMedia);
  add("patBaixa","Pátios e áreas verdes · baixa frequência",g("patBaixa")+(pk==="patBaixa"?remE:0),U.patBaixa);
  /* Vidros externos: área de uma face, valor conforme frequência e risco. */
  const av=Math.max(0,Number(r.A_vidro)||0);
  if(Number(r.Vidros)===1&&av>0&&(r.VidroFreq==1||r.VidroFreq==2)){
    const risco=Number(r.VidroRisco)===1,tri=Number(r.VidroFreq)===1,k=(tri?"vidTri":"vidSem")+(risco?"R":"S");
    const hm=av/PROD.vid.int.prod*PROD.vid.int.h+av/PROD.vid.ext[risco?"R":"S"]*PROD.vid.h[tri?1:2];
    L.push({k,r:"Vidros externos · "+(tri?"trimestral":"semestral")+(risco?", com risco (balancim/andaime)":", sem risco"),a:R(av,100),pr:U[k],t:R(av*U[k]*fator,100),uni:"m²",eq:R(hm/hpm,1000),hm:R(hm,10),dias:PROD.jor[tb].dias});
  }
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
