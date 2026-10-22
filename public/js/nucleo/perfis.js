/* O que cada perfil vê e pode fazer na interface: escopo de UCs e Gerências, permissões de ação e abas visíveis.
   Uma pessoa pode ter mais de um perfil (ex.: Gestor de uma UC e Gerente da Gerência). O acesso gravado em
   acessos/<uid> tem a lista Perfis; registros antigos têm só o campo Perfil, que vale como lista de um item. */
"use strict";

const ORDEM_PERFIS=["admin","gerente","gestor","validador","final"];
const perfisDoc=a=>{if(!a||a.Revogado)return[];const l=Array.isArray(a.Perfis)&&a.Perfis.length?a.Perfis:(a.Perfil?[a.Perfil]:[]);return ORDEM_PERFIS.filter(p=>l.includes(p))};
/* Perfis em uso agora. "Ver como" (Administrador testando) simula um perfil só. */
function perfisAtivos(){
  if(S.viewAs&&S.isAdmin)return[S.viewAs];
  if(S.isOwner)return["admin"];
  if(!S.db)return["admin"];
  return perfisDoc(S.acc);
}
const tem=p=>perfisAtivos().includes(p);
const soPerfil=p=>{const l=perfisAtivos();return l.length===1&&l[0]===p};
/* Perfil principal: o primeiro na ordem acima. Usado só onde é preciso escolher um (aba inicial, textos). */
function perfil(){return perfisAtivos()[0]||null}
const nomesPerfis=l=>(l||perfisAtivos()).map(p=>PERFIS[p]||p).join(" + ");

const tester=()=>!!(S.viewAs&&S.isAdmin);
const allUC=()=>new Set(UCS.map(u=>u[0]));
/* UCs do Gestor e Gerências do Gerente. Administrador, e quem está em "Ver como", enxerga todas. */
function myUCs(){if(tem("admin")||(tem("gestor")&&tester()))return allUC();return tem("gestor")?new Set((S.acc&&S.acc.UCs)||[]):new Set()}
function myGer(){if(tem("admin")||(tem("gerente")&&tester()))return new Set(GER);return tem("gerente")?new Set((S.acc&&S.acc.Gerencias)||[]):new Set()}
function ucInScope(u){
  if(tem("admin")||tem("validador")||tem("final"))return true;
  return (tem("gestor")&&myUCs().has(u[0]))||(tem("gerente")&&myGer().has(u[2]));
}
function inScope(x){
  if(tem("admin"))return true;
  return (tem("gestor")&&myUCs().has(x.UC)&&(tester()||x.CriadoPor===S.me.id))
    ||(tem("gerente")&&myGer().has(x.Gerencia))
    ||(tem("validador")&&(x.Status==="Validado"||x.Status==="Homologado"||x.Status==="Devolvido"))
    ||(tem("final")&&x.Status==="Homologado");
}
const canFill=()=>tem("admin")||tem("gestor");
const canEditRec=x=>tem("admin")||(tem("gestor")&&myUCs().has(x.UC)&&x.CriadoPor===S.me.id);
const canHomolog=x=>x.Status==="Validado"&&(tem("admin")||tem("validador"));
const canApprove=x=>x.Status==="Em validação"&&(tem("admin")||(tem("gerente")&&myGer().has(x.Gerencia)));
const gersVis=()=>GER.filter(g=>UCS.some(u=>u[2]===g&&ucInScope(u)));
/* Abas: a união das abas de cada perfil, na ordem fixa abaixo. */
function tabsFor(){
  const ps=perfisAtivos();if(!ps.length)return[["acc","Acesso"]];
  const M={admin:["painel","form","reg","exp","acc","par","guia"],gestor:["minha","painel","form","reg","guia"],gerente:["painel","reg","guia"],validador:["painel","reg","exp","guia"],final:["painel","exp","guia"]};
  const vis=new Set(ps.flatMap(p=>M[p]||[]));
  const reg=soPerfil("gerente")?"Aprovações":soPerfil("validador")?"Validação final":"Registros";
  const T={minha:"Minhas UCs",painel:"Painel gerencial",form:"Preenchimento",reg,exp:"Exportar",acc:"Acessos",par:"Parâmetros",guia:"Guia do painel"};
  return ["minha","painel","form","reg","exp","acc","par","guia"].filter(k=>vis.has(k)).map(k=>[k,T[k]]);
}
function renderWho(){
  const ps=perfisAtivos();let h="";
  if(ps.length)h=(S.me.name?esc(S.me.name)+" · ":"")+ps.map(p=>`<span class="pill info">${PERFIS[p]}${tester()?" (teste)":""}</span>`).join(" ");
  else h="Sem perfil atribuído";
  if(S.isAdmin&&S.db)h+=` <select class="vas" id="vAs" aria-label="Ver como">${[["","Administrador"],["gestor","Ver como Gestor"],["gerente","Ver como Gerente"],["validador","Ver como Validador final"],["final","Ver como Usuário final"]].map(([v,t])=>`<option value="${v}" ${S.viewAs===v?"selected":""}>${t}</option>`).join("")}</select>`;
  if(S.auth&&S.me.id)h+=`<span class="note" style="margin:0">${esc(S.me.email||"")}</span> <button class="btn sm" data-fb="logout">Sair</button>`;
  $("#whoami").innerHTML=h;
}
