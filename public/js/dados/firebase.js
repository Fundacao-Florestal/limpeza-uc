/* Conexão com o Firebase: início, sessão do usuário, leituras do Firestore conforme o perfil e gravação das estruturas.
   As permissões reais ficam em firestore.rules; aqui só se abre o que o perfil pode ler. */
"use strict";

function setSync(ok,msg){$("#sync").innerHTML=`<span class="dot ${ok?"":"off"}"></span><span>${esc(msg)}</span>`}
/* Firebase: login pelo Firebase Authentication e dados no Firestore.
   Coleções: estruturas/<ID> (um documento por estrutura), acessos/<uid>, pedidos/<uid>, usuarios/<uid>, config/{valores,parametros}.
   As permissões de cada perfil são aplicadas pelo banco (firestore.rules); a interface só espelha o que o banco libera. */
const ST_VALIDADOR=["Validado","Homologado","Devolvido"];
let FB_SUBS=[],FB_ROLE_SUBS=[],FB_ROLE_KEY=null;
function fbStop(a){a.forEach(f=>{try{f()}catch{}});a.length=0}
function fbConfigured(){const c=window.FIREBASE_CONFIG;return !!(window.firebase&&c&&c.apiKey&&!/COLE_AQUI/.test(c.apiKey))}
async function boot(){
  /* Com USE_EMULATORS, usa um projeto de demonstração local, sem tocar no projeto real (npm run dev). */
  const emu=!!window.USE_EMULATORS&&["localhost","127.0.0.1"].includes(location.hostname);
  if(!emu&&!fbConfigured()){S.db=null;setSync(false,"Modo local: Firebase não configurado; os dados valem só para esta sessão");onData();render();return}
  try{
    firebase.initializeApp(emu?{apiKey:"demo-key",authDomain:"localhost",projectId:"demo-limpeza-uc"}:window.FIREBASE_CONFIG);
    S.auth=firebase.auth();S.db=firebase.firestore();
    if(emu){S.auth.useEmulator("http://localhost:9099",{disableWarnings:true});S.db.useEmulator("localhost",8080)}
  }catch(e){S.db=null;S.auth=null;setSync(false,"Falha ao iniciar o Firebase");onData();render();return}
  try{S.auth.useDeviceLanguage()}catch{}
  render();
  S.auth.onAuthStateChanged(u=>fbSession(u));
}
function fbDomains(){return (window.ALLOWED_EMAIL_DOMAINS||[]).map(d=>String(d).toLowerCase().trim().replace(/^@/,"")).filter(Boolean)}
function fbDomainOk(email){const d=fbDomains(),e=String(email||"").toLowerCase();return !d.length||d.some(x=>e.endsWith("@"+x))}
function fbReset(){
  fbStop(FB_SUBS);fbStop(FB_ROLE_SUBS);FB_ROLE_KEY=null;
  Object.assign(S,{me:{id:null,canEdit:false,name:"",email:"",verified:false},isAdmin:false,isOwner:false,acc:null,accReady:false,accAll:[],pedidos:[],pedido:null,recs:[],usersAll:[],viewAs:"",started:false,valDoc:false,paramsDoc:false,params:{...DEF}});
  S.val=clone(VDEF);
}
function fbSession(u){
  fbReset();S.authReady=true;
  if(!u){setSync(false,"Entre com sua conta para continuar");render();return}
  if(!fbDomainOk(u.email)){S.loginErr="O e-mail "+(u.email||"usado")+" não pertence a um domínio autorizado. Use o e-mail institucional.";S.auth.signOut();return}
  S.loginErr="";S.loginMode="entrar";
  const nome=u.displayName||S.pendingName||"";
  S.me.id=u.uid;S.me.name=nome||u.email||"";S.me.email=u.email||"";S.me.verified=!!u.emailVerified;S.names[u.uid]=S.me.name||"Usuário";
  /* Sem e-mail confirmado o banco não libera nada (firestore.rules); fica só a tela de confirmação. */
  if(!u.emailVerified){setSync(false,"Confirme seu e-mail para continuar");render();return}
  setSync(true,"Base conectada");
  S.db.doc("usuarios/"+u.uid).set({Uid:u.uid,Nome:nome,Email:u.email||"",UltimoAcesso:new Date().toISOString()},{merge:true}).catch(()=>{});
  FB_SUBS.push(S.db.doc("acessos/"+u.uid).onSnapshot(sn=>{S.acc=sn.exists?sn.data():null;S.accReady=true;fbRole()},()=>{S.acc=null;S.accReady=true;fbRole()}));
  FB_SUBS.push(S.db.doc("pedidos/"+u.uid).onSnapshot(sn=>{S.pedido=sn.exists?sn.data():null;onData()},()=>{}));
  FB_SUBS.push(S.db.doc("config/valores").onSnapshot(sn=>{S.val=sn.exists?dm(VDEF,sn.data()):clone(VDEF);S.valDoc=sn.exists;onData()},()=>{}));
  FB_SUBS.push(S.db.doc("config/parametros").onSnapshot(sn=>{if(sn.exists){const d=sn.data();S.params={...DEF,...d};S.paramsDoc=true}else{S.params={...DEF};S.paramsDoc=false}onData()},()=>{}));
  render();
}
/* Abre as leituras que o perfil permite. Cada consulta corresponde a uma regra de firestore.rules. */
function fbRole(){
  const a=S.acc||{},p=a.Perfil||null;
  S.isAdmin=S.isOwner=S.me.canEdit=(p==="admin");
  const key=JSON.stringify([p,a.UCs||[],a.Gerencias||[]]);
  if(key===FB_ROLE_KEY){onData();return}
  FB_ROLE_KEY=key;fbStop(FB_ROLE_SUBS);S.recs=[];S.accAll=[];S.pedidos=[];S.usersAll=[];
  if(!S.isAdmin)S.viewAs="";
  const col=S.db.collection("estruturas"),parts=new Map();
  const errR=e=>{console.warn(e);setSync(false,"Leitura interrompida"+(e&&e.code?" ("+e.code+")":""))};
  const watch=(q,k)=>FB_ROLE_SUBS.push(q.onSnapshot(sn=>{
    parts.set(k,sn.docs.map(d=>d.data()));
    const m=new Map();parts.forEach(arr=>arr.forEach(x=>{if(x&&x.ID&&!x.Excluido)m.set(x.ID,x)}));
    S.recs=[...m.values()];setSync(true,"Base conectada");onData();
  },errR));
  if(p==="admin")watch(col,"todos");
  else if(p==="gerente")(a.Gerencias||[]).forEach((g,i)=>watch(col.where("Gerencia","==",g),"g"+i));
  else if(p==="validador")ST_VALIDADOR.forEach((st,i)=>watch(col.where("Status","==",st),"v"+i));
  else if(p==="final")watch(col.where("Status","==","Homologado"),"f");
  else if(p==="gestor")watch(col.where("CriadoPor","==",S.me.id),"o");
  if(p==="admin"){
    FB_ROLE_SUBS.push(S.db.collection("acessos").onSnapshot(sn=>{S.accAll=sn.docs.map(d=>d.data());onData()},()=>{}));
    FB_ROLE_SUBS.push(S.db.collection("pedidos").onSnapshot(sn=>{S.pedidos=sn.docs.map(d=>d.data());onData()},()=>{}));
    FB_ROLE_SUBS.push(S.db.collection("usuarios").onSnapshot(sn=>{S.usersAll=sn.docs.map(d=>d.data());S.usersAll.forEach(x=>{S.names[x.Uid]=x.Nome||x.Email||"Usuário"});onData()},()=>{}));
  }
  onData();
}

async function saveRec(doc){
  if(!S.db){const i=S.recs.findIndex(x=>x.ID===doc.ID);if(i>=0)S.recs[i]=doc;else S.recs.push(doc);return}
  await S.db.doc("estruturas/"+slug(doc.ID)).set(JSON.parse(JSON.stringify(doc)));
}
async function delRec(x){
  if(!S.db){S.recs=S.recs.filter(r=>r.ID!==x.ID);return}
  await saveRec({...x,Excluido:true,AtualizadoEm:new Date().toISOString()});
}
async function names(ids){
  const need=[...new Set(ids.filter(i=>i&&!(i in S.names)))];
  if(!need.length||!S.db)return false;
  await Promise.all(need.map(async i=>{try{const sn=await S.db.doc("usuarios/"+slug(i)).get();const d=sn.exists?sn.data():null;S.names[i]=(d&&(d.Nome||d.Email))||"Usuário"}catch{S.names[i]="Usuário"}}));
  return true;
}
const who=id=>id?(S.names[id]||"Usuário"):"—";
