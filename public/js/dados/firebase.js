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
  /* No npm run dev (emulador de Hosting, porta 5050) ou com USE_EMULATORS, usa um projeto de demonstração local, sem tocar no projeto real. */
  const emu=["localhost","127.0.0.1"].includes(location.hostname)&&(location.port==="5050"||!!window.USE_EMULATORS);
  if(!emu&&!fbConfigured()){S.db=null;setSync(false,"Modo local: Firebase não configurado; os dados valem só para esta sessão");onData();render();return}
  try{
    firebase.initializeApp(emu?{apiKey:"demo-key",authDomain:"localhost",projectId:"demo-limpeza-uc"}:window.FIREBASE_CONFIG);
    S.auth=firebase.auth();S.db=firebase.firestore();
    if(emu){S.auth.useEmulator("http://localhost:9099",{disableWarnings:true});S.db.useEmulator("localhost",8080)}
  }catch(e){S.db=null;S.auth=null;setSync(false,"Falha ao iniciar o Firebase");onData();render();return}
  try{S.auth.useDeviceLanguage()}catch{}
  render();
  S.auth.onAuthStateChanged(u=>{if(!u&&emu)devLogin();else fbSession(u)});
}
/* No npm run dev não há tela de login: entra com a conta de Administrador que scripts/dev.mjs cria no emulador.
   Para ver como Gestor, use "Ver como" no topo. Tenta de novo enquanto a conta ainda não foi criada. */
const DEV_LOGIN={email:"dev@sp.gov.br",senha:"dev-local-123"};
function devLogin(n=0){
  setSync(false,"Modo local: entrando como Administrador…");
  S.auth.signInWithEmailAndPassword(DEV_LOGIN.email,DEV_LOGIN.senha).catch(()=>{if(n<20)setTimeout(()=>devLogin(n+1),1000);else fbSession(null)});
}
function fbDomains(){return (window.ALLOWED_EMAIL_DOMAINS||[]).map(d=>String(d).toLowerCase().trim().replace(/^@/,"")).filter(Boolean)}
function fbDomainOk(email){const d=fbDomains(),e=String(email||"").toLowerCase();return !d.length||d.some(x=>e.endsWith("@"+x))}
function fbReset(){
  fbStop(FB_SUBS);fbStop(FB_ROLE_SUBS);FB_ROLE_KEY=null;
  Object.assign(S,{me:{id:null,canEdit:false,name:"",email:""},isAdmin:false,isOwner:false,acc:null,accReady:false,accAll:[],pedidos:[],pedido:null,recs:[],usersAll:[],viewAs:"",started:false,valDoc:false,paramsDoc:false,params:{...DEF}});
  S.val=clone(VDEF);
}
function fbSession(u){
  fbReset();S.authReady=true;
  if(!u){setSync(false,"Entre com sua conta para continuar");render();return}
  if(!fbDomainOk(u.email)){S.loginErr="O e-mail "+(u.email||"usado")+" não pertence a um domínio autorizado. Use o e-mail institucional.";S.auth.signOut();return}
  S.loginErr="";S.loginMode="entrar";
  const nome=u.displayName||S.pendingName||"";
  S.me.id=u.uid;S.me.name=nome||u.email||"";S.me.email=u.email||"";S.names[u.uid]=S.me.name||"Usuário";
  setSync(true,"Base conectada");
  S.db.doc("usuarios/"+u.uid).set({Uid:u.uid,Nome:nome,Email:u.email||"",UltimoAcesso:new Date().toISOString()},{merge:true}).catch(()=>{});
  FB_SUBS.push(S.db.doc("acessos/"+u.uid).onSnapshot(sn=>{S.acc=sn.exists?sn.data():null;S.accReady=true;fbRole()},()=>{S.acc=null;S.accReady=true;fbRole()}));
  FB_SUBS.push(S.db.doc("pedidos/"+u.uid).onSnapshot(sn=>{S.pedido=sn.exists?sn.data():null;onData()},()=>{}));
  FB_SUBS.push(S.db.doc("config/valores").onSnapshot(sn=>{S.val=sn.exists?dm(VDEF,sn.data()):clone(VDEF);S.valDoc=sn.exists;onData()},()=>{}));
  FB_SUBS.push(S.db.doc("config/parametros").onSnapshot(sn=>{if(sn.exists){const d=sn.data();S.params={...DEF,...d};S.paramsDoc=true}else{S.params={...DEF};S.paramsDoc=false}onData()},()=>{}));
  render();
}
/* Abre as leituras que os perfis permitem. Cada consulta corresponde a uma regra de firestore.rules.
   Com mais de um perfil (ex.: Gestor e Gerente), abre as leituras de cada um e junta os resultados. */
function fbRole(){
  const a=S.acc||{},ps=perfisDoc(a),tem_=p=>ps.includes(p);
  S.isAdmin=S.isOwner=S.me.canEdit=tem_("admin");
  const key=JSON.stringify([ps,a.UCs||[],a.Gerencias||[]]);
  if(key===FB_ROLE_KEY){onData();return}
  /* Acesso liberado com a pessoa na tela de pedido: leva para a aba inicial do perfil e avisa. */
  if(FB_ROLE_KEY&&JSON.parse(FB_ROLE_KEY)[0].length===0&&ps.length){S.view=ps.includes("gestor")?"minha":"painel";S._push=true;toast("Seu acesso foi liberado: "+ps.map(p=>PERFIS[p]||p).join(" + "))}
  FB_ROLE_KEY=key;fbStop(FB_ROLE_SUBS);S.recs=[];S.accAll=[];S.pedidos=[];S.usersAll=[];
  if(!S.isAdmin)S.viewAs="";
  const col=S.db.collection("estruturas"),parts=new Map();
  const errR=e=>{console.warn(e);setSync(false,"Leitura interrompida"+(e&&e.code?" ("+e.code+")":""))};
  const watch=(q,k)=>FB_ROLE_SUBS.push(q.onSnapshot(sn=>{
    parts.set(k,sn.docs.map(d=>d.data()));
    const m=new Map();parts.forEach(arr=>arr.forEach(x=>{if(x&&x.ID&&!x.Excluido)m.set(x.ID,x)}));
    S.recs=[...m.values()];setSync(true,"Base conectada");onData();
  },errR));
  if(tem_("admin"))watch(col,"todos");
  else{
    if(tem_("gestor"))watch(col.where("CriadoPor","==",S.me.id),"o");
    if(tem_("gerente"))(a.Gerencias||[]).forEach((g,i)=>watch(col.where("Gerencia","==",g),"g"+i));
    if(tem_("validador"))ST_VALIDADOR.forEach((st,i)=>watch(col.where("Status","==",st),"v"+i));
    else if(tem_("final"))watch(col.where("Status","==","Homologado"),"f");
  }
  if(tem_("admin")){
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
