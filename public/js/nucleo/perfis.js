/* O que cada perfil vê e pode fazer na interface: escopo de UCs e Gerências, permissões de ação e abas visíveis. */
"use strict";

function perfil(){
  if(S.viewAs&&S.isAdmin)return S.viewAs;
  if(S.isOwner)return "admin";
  if(S.isAdmin&&!(S.acc&&S.acc.Perfil))return "admin";
  if(!S.db)return "admin";
  return (S.acc&&S.acc.Perfil)||null;
}
const tester=()=>!!(S.viewAs&&S.isAdmin);
const allUC=()=>new Set(UCS.map(u=>u[0]));
function myUCs(){return perfil()==="gestor"&&!tester()?new Set((S.acc&&S.acc.UCs)||[]):allUC()}
function myGer(){return perfil()==="gerente"&&!tester()?new Set((S.acc&&S.acc.Gerencias)||[]):new Set(GER)}
function ucInScope(u){const p=perfil();if(p==="gestor")return myUCs().has(u[0]);if(p==="gerente")return myGer().has(u[2]);return true}
function inScope(x){const p=perfil();if(p==="gestor")return myUCs().has(x.UC)&&(tester()||x.CriadoPor===S.me.id);if(p==="gerente")return myGer().has(x.Gerencia);if(p==="final")return x.Status==="Homologado";if(p==="validador")return x.Status==="Validado"||x.Status==="Homologado"||x.Status==="Devolvido";return true}
const canFill=()=>{const p=perfil();return p==="admin"||p==="gestor"};
const canEditRec=x=>{const p=perfil();return p==="admin"||(p==="gestor"&&myUCs().has(x.UC)&&x.CriadoPor===S.me.id)};
const canHomolog=x=>{const p=perfil();return x.Status==="Validado"&&(p==="admin"||p==="validador")};
const canApprove=x=>{const p=perfil();return x.Status==="Em validação"&&(p==="admin"||(p==="gerente"&&myGer().has(x.Gerencia)))};
const gersVis=()=>GER.filter(g=>UCS.some(u=>u[2]===g&&ucInScope(u)));
function tabsFor(){
  const p=perfil();if(!p)return[["acc","Acesso"]];
  const T={minha:"Minhas UCs",painel:"Painel gerencial",form:"Preenchimento",reg:p==="gerente"?"Aprovações":p==="validador"?"Validação final":"Registros",exp:"Exportar",acc:"Acessos",par:"Parâmetros",guia:"Guia do painel"};
  const m={admin:["painel","form","reg","exp","acc","par","guia"],gestor:["minha","painel","form","reg","guia"],gerente:["painel","reg","guia"],validador:["painel","reg","exp","guia"],final:["painel","exp","guia"]}[p];
  return m.map(k=>[k,T[k]]);
}
function renderWho(){
  const p=perfil();let h="";
  if(p)h=(S.me.name?esc(S.me.name)+" · ":"")+`<span class="pill info">${PERFIS[p]}${tester()?" (teste)":""}</span>`;
  else h="Sem perfil atribuído";
  if(perfil()==="admin"&&S.isAdmin&&S.db)h+=` <select class="vas" id="vAs" aria-label="Ver como">${[["","Administrador"],["gestor","Ver como Gestor"],["gerente","Ver como Gerente"],["validador","Ver como Validador final"],["final","Ver como Usuário final"]].map(([v,t])=>`<option value="${v}" ${S.viewAs===v?"selected":""}>${t}</option>`).join("")}</select>`;
  if(S.auth&&S.me.id)h+=`<span class="note" style="margin:0">${esc(S.me.email||"")}</span> <button class="btn sm" data-fb="logout">Sair</button>`;
  $("#whoami").innerHTML=h;
}
