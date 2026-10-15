/* Validação do formulário e indicadores calculados (IUP, IPS, classe sanitária, IHOS, frequência externa, modalidade, carga técnica). */
"use strict";

function check(r,recs,isEdit){
  const blank=[],err=[];
  ["UC","Gerencia","Estrutura","Tipo","Responsavel"].forEach(k=>{if(!String(r[k]??"").trim())blank.push(k)});
  NUM.forEach(k=>{const x=nv(r,k);if(Number.isNaN(x))blank.push(k);else if(x<0)err.push(LBL[k]+" não pode ser negativo.")});
  const g=k=>nv(r,k);
  if(r.UC&&r.Estrutura&&recs.some(x=>x.ID!==r.ID&&x.UC===r.UC&&norm(x.Estrutura)===norm(r.Estrutura)))err.push("Já existe uma estrutura com este nome nesta UC.");
  if(g("Dias")>7)err.push("Dias de uso deve estar entre 0 e 7.");
  if(g("Horas")>24)err.push("Horas de uso deve estar entre 0 e 24.");
  if(g("HorasSan")>24)err.push("Horas sanitárias devem estar entre 0 e 24.");
  if(g("Sazonalidade")>2||g("Reposicao")>2)err.push("Sazonalidade e reposição aceitam 0 a 2.");
  if(g("Residuos")>3)err.push("Resíduos aceita 0 a 3.");
  if(FLAGS.some(k=>g(k)>1))err.push("Indicadores Sim/Não aceitam apenas 0 ou 1.");
  if(g("Pico")<g("Visitantes"))err.push("Pico não pode ser menor que a visitação normal.");
  if(g("AreaSanitaria")>g("AreaInterna"))err.push("Área sanitária não pode superar a área interna.");
  if(g("Hospedaria")===1&&(g("Leitos")<=0||g("Quartos")<=0))err.push("Hospedaria exige leitos e quartos positivos.");
  if(g("Sanitario")===0&&DEP_SAN.some(k=>g(k)>0))err.push("Há dados sanitários sem sanitário informado.");
  if(g("Hospedaria")===0&&DEP_HOSP.some(k=>g(k)>0))err.push("Há dados de hospedagem sem hospedaria informada.");
  ITENS.forEach(k=>{if(nv(r,k)<0)err.push(LBL[k]+" não pode ser negativo.")});
  const sI=["A_acarp","A_lab","A_almox","A_ofic","A_saguao"].reduce((a,k)=>a+(nv(r,k)||0),0),sE=["A_pav","A_varr","A_patAlta","A_patMedia","A_patBaixa"].reduce((a,k)=>a+(nv(r,k)||0),0);
  if(sI>(g("AreaInterna")||0))err.push("A soma das áreas internas detalhadas supera a área interna.");
  if(sE>(g("AreaExterna")||0))err.push("A soma das áreas externas detalhadas supera a área externa.");
  return{blank,err};
}
function paramErr(p){
  const e=[];
  if(!(p.ProdInterna>0)||!(p.ProdExterna>0))e.push("As produtividades devem ser positivas.");
  if(!(p.V1<p.V2&&p.V2<p.V3&&p.P1<p.P2&&p.P2<p.P3))e.push("Os limites de faixas devem ser estritamente crescentes.");
  if(!(p.PequenaArea>0))e.push("A área de pequeno porte deve ser positiva.");
  return e;
}
function calc(r,p){
  const v=r.Visitantes,pk=r.Pico,d=r.Dias,h=r.Horas;
  const IUP=(v<=0?0:v<=p.V1?1:v<=p.V2?2:v<=p.V3?3:4)+(pk<=p.P1?0:pk<=p.P2?1:pk<=p.P3?2:3)+(d<=3?0:d<=5?1:2)+(h<=4?0:h<=8?1:2)+r.Sazonalidade;
  const FaixaIUP=IUP<=3?"Baixo":IUP<=6?"Moderado":IUP<=9?"Intenso":"Muito intenso";
  const IPS=r.Sanitario===0?0:r.Publico*2+(v<=30?0:v<=300?1:2)+(pk<=100?0:pk<=800?1:2)+(r.HorasSan<=4?0:r.HorasSan<=8?1:2)+((r.Vasos+r.Mictorios)<=2?0:(r.Vasos+r.Mictorios)<=8?1:2)+r.Reposicao;
  const ClasseSan=r.Sanitario===0?"Não se aplica":r.Publico===0?"SAN-1":IPS<=5?"SAN-2":r.HorasSan<=8?"SAN-3":"SAN-4";
  const IH=r.Hospedaria===0?0:r.Hospedes/r.Leitos, IR=r.Hospedaria===0?0:r.Trocas/r.Quartos, IHOS=IH+IR;
  const FrequenciaExterna=r.AreaExterna===0?"Não se aplica":(r.Residuos>=2||IUP>=7)?"Semanal":(r.Residuos===1||IUP>=4)?"Quinzenal":"Mensal";
  const FatorExterno=r.AreaExterna===0?0:FrequenciaExterna==="Semanal"?1:FrequenciaExterna==="Quinzenal"?0.5:0.25;
  const cob=(IPS>=6||IUP>=7);
  const Modalidade=d===0?"Sem uso atual":cob?"Regular com cobertura":(r.AreaInterna<=p.PequenaArea&&d<=3)?"Volante":r.AreaInterna<=p.PequenaArea?"Compartilhado":"Regular";
  const Compartilhamento=d===0?"A avaliar":cob?"Baixo":r.AreaInterna<=p.PequenaArea?"Alto":"A avaliar";
  const CargaTecnica=((r.AreaInterna/p.ProdInterna)*(d/7)+(r.AreaExterna/p.ProdExterna)*FatorExterno)*(1+IUP*p.PesoIUP+IPS*p.PesoIPS+IHOS*p.PesoIHOS);
  return{IUP,FaixaIUP,IPS,ClasseSan,IH,IR,IHOS,FrequenciaExterna,FatorExterno,Modalidade,Compartilhamento,CargaTecnica};
}
