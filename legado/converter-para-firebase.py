"""Gera public/index.html (versão Firebase) a partir do HTML original do artefato Limpeza UC.

Uso: python3 patch.py <original.html> <saida.html>
Cada troca exige exatamente uma ocorrência do trecho original, para que nada mude por engano.
"""
import re
import sys

src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding="utf8").read()


def one(old, new):
    global s
    n = s.count(old)
    if n != 1:
        raise SystemExit(f"esperava 1 ocorrência, achei {n}: {old[:80]!r}")
    s = s.replace(old, new)


def between(start, end, new, keep_end=True):
    """Troca o trecho que vai de `start` (inclusive) até `end` (exclusive)."""
    global s
    i = s.find(start)
    j = s.find(end, i + 1)
    if i < 0 or j < 0 or s.count(start) != 1:
        raise SystemExit(f"trecho não encontrado: {start[:60]!r}")
    s = s[:i] + new + (s[j:] if keep_end else s[j + len(end):])


# ---------- Cabeçalho do documento ----------
one('<!doctype html><html><head><meta charset=utf8>',
    '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">')
one('</style></head><body>\n<title>Limpeza UC</title>', '</style>\n<title>Limpeza UC</title>')
one('</style>\n\n<div class="wrap">',
    '</style>\n'
    '<script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js"></script>\n'
    '<script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js"></script>\n'
    '<script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js"></script>\n'
    '<script src="firebase-config.js"></script>\n'
    '</head><body>\n\n<div class="wrap">')

# ---------- Conexão: Firebase Auth + Firestore no lugar da plataforma do artefato ----------
between('async function boot(){', 'function onData(){', r'''/* Firebase: login pelo Firebase Authentication e dados no Firestore.
   Coleções: estruturas/<ID> (um documento por estrutura), acessos/<uid>, pedidos/<uid>, usuarios/<uid>, config/{valores,parametros}.
   As permissões de cada perfil são aplicadas pelo banco (firestore.rules); a interface só espelha o que o banco libera. */
const ST_VALIDADOR=["Validado","Homologado","Devolvido"];
let FB_SUBS=[],FB_ROLE_SUBS=[],FB_ROLE_KEY=null;
function fbStop(a){a.forEach(f=>{try{f()}catch{}});a.length=0}
function fbConfigured(){const c=window.FIREBASE_CONFIG;return !!(window.firebase&&c&&c.apiKey&&!/COLE_AQUI/.test(c.apiKey))}
async function boot(){
  if(!fbConfigured()){S.db=null;setSync(false,"Modo local: Firebase não configurado; os dados valem só para esta sessão");onData();render();return}
  try{
    firebase.initializeApp(window.FIREBASE_CONFIG);
    S.auth=firebase.auth();S.db=firebase.firestore();
    if(window.USE_EMULATORS){S.auth.useEmulator("http://localhost:9099");S.db.useEmulator("localhost",8080)}
  }catch(e){S.db=null;S.auth=null;setSync(false,"Falha ao iniciar o Firebase");onData();render();return}
  render();
  try{await S.auth.getRedirectResult()}catch(e){S.loginErr=authMsg(e)}
  S.auth.onAuthStateChanged(u=>fbSession(u));
}
function fbReset(){
  fbStop(FB_SUBS);fbStop(FB_ROLE_SUBS);FB_ROLE_KEY=null;
  Object.assign(S,{me:{id:null,canEdit:false,name:"",email:""},isAdmin:false,isOwner:false,acc:null,accReady:false,accAll:[],pedidos:[],pedido:null,recs:[],usersAll:[],viewAs:"",started:false,valDoc:false,paramsDoc:false,params:{...DEF}});
  S.val=clone(VDEF);
}
function fbSession(u){
  fbReset();S.authReady=true;
  if(!u){setSync(false,"Entre com sua conta para continuar");render();return}
  const dom=(window.ALLOWED_EMAIL_DOMAINS||[]).map(d=>String(d).toLowerCase().replace(/^@/,"")).filter(Boolean);
  const em=String(u.email||"").toLowerCase();
  if(dom.length&&!dom.some(d=>em.endsWith("@"+d))){S.loginErr="A conta "+(u.email||"usada")+" não pertence a um domínio autorizado. Entre com a conta institucional.";S.auth.signOut();return}
  S.loginErr="";
  S.me.id=u.uid;S.me.name=u.displayName||u.email||"";S.me.email=u.email||"";S.names[u.uid]=S.me.name||"Usuário";
  setSync(true,"Base conectada");
  S.db.doc("usuarios/"+u.uid).set({Uid:u.uid,Nome:u.displayName||"",Email:u.email||"",UltimoAcesso:new Date().toISOString()},{merge:true}).catch(()=>{});
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
function authMsg(e){
  const c=(e&&e.code)||"";
  if(c==="auth/popup-closed-by-user"||c==="auth/cancelled-popup-request")return "";
  if(c==="auth/unauthorized-domain")return "Este endereço não está autorizado no Firebase (Authentication > Configurações > Domínios autorizados).";
  if(c==="auth/operation-not-allowed")return "Este método de login não está ativado no Firebase.";
  if(c==="auth/account-exists-with-different-credential")return "Já existe uma conta com este e-mail usando outro método de login.";
  return "Não foi possível entrar ("+(c||(e&&e.message)||"erro desconhecido")+").";
}
async function fbLogin(k){
  let p;
  if(k==="google"){p=new firebase.auth.GoogleAuthProvider();p.setCustomParameters({prompt:"select_account"})}
  else{p=new firebase.auth.OAuthProvider("microsoft.com");const t=window.MICROSOFT_TENANT;p.setCustomParameters(t?{tenant:t,prompt:"select_account"}:{prompt:"select_account"})}
  try{await S.auth.signInWithPopup(p)}
  catch(e){
    if(e&&(e.code==="auth/popup-blocked"||e.code==="auth/operation-not-supported-in-this-environment")){try{await S.auth.signInWithRedirect(p);return}catch(x){e=x}}
    S.loginErr=authMsg(e);render();
  }
}
function vLogin(){
  const P=(Array.isArray(window.AUTH_PROVIDERS)&&window.AUTH_PROVIDERS.length)?window.AUTH_PROVIDERS:["microsoft"];
  const L={microsoft:"Entrar com conta Microsoft",google:"Entrar com conta Google"};
  return `<div class="panel" style="max-width:560px;margin:8px auto 0"><h2>Entrar</h2><p class="sub">Use sua conta institucional para acessar o diagnóstico de limpeza das UCs. No primeiro acesso você solicita o perfil, e o Administrador libera.</p>${S.loginErr?`<div class="banner">${esc(S.loginErr)}</div>`:""}<div class="bar" style="margin:16px 0 0">${P.map((k,i)=>`<button class="btn ${i?"":"pri"}" data-fb="login" data-prov="${esc(k)}">${esc(L[k]||k)}</button>`).join("")}</div></div>`;
}
function downloadFile(filename,data,type){
  const blob=data instanceof Blob?data:new Blob([data],{type:type||"application/octet-stream"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=filename;document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500);
}
''')

# ---------- Gravação: um documento por estrutura ----------
between('async function saveRec(doc){', 'const who=id=>', r'''async function saveRec(doc){
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
''')

one('if(!S.db)return (window.claude&&window.claude.use)?null:"admin";', 'if(!S.db)return "admin";')

# ---------- Tela de login, botão Sair e fim do aviso de compartilhamento ----------
one('function render(){\n  const m=$("#main");\n',
    'function render(){\n  const m=$("#main");\n'
    '  if(S.auth&&!S.authReady){$("#tabs").innerHTML="";m.innerHTML=\'<div class="panel empty">Conectando…</div>\';return}\n'
    '  if(S.auth&&!S.me.id){$("#tabs").innerHTML="";$("#whoami").innerHTML="";m.innerHTML=vLogin();return}\n')
i = s.find('  const pf=perfil();\n  if(S.db&&!S.isAdmin&&(pf==="gerente"')
j = s.find('\n', s.find('Até lá, esta tela mostra apenas o que você mesmo enviou.', i))
if i < 0 or j < 0:
    raise SystemExit("aviso de compartilhamento não encontrado")
s = s[:i] + s[j + 1:]
one('$("#whoami").innerHTML=h;',
    'if(S.auth&&S.me.id)h+=`<span class="note" style="margin:0">${esc(S.me.email||"")}</span> <button class="btn sm" data-fb="logout">Sair</button>`;\n  $("#whoami").innerHTML=h;')

# ---------- Textos de acesso que falavam do compartilhamento da plataforma ----------
between('  const how=`<p class="note" style="margin-top:0">Para usar o sistema', '  if(S.pedido)return', r'''  if(!S.db)return diag("Base de dados indisponível",`<p class="sub">O Firebase não está configurado nesta instalação. Verifique o arquivo firebase-config.js.</p>`);
''')
one('catch(e){toast(e&&e.code==="invalid_argument"?"Sua permissão é somente de leitura. Peça ao proprietário a permissão Pode interagir.":"Não foi possível enviar: "+(e.message||e.code))}',
    'catch(e){toast(e&&e.code==="permission-denied"?"O banco recusou a solicitação. Se você já tem perfil, recarregue a página.":"Não foi possível enviar: "+(e.message||e.code))}')
between('<li>A pessoa precisa ser membro da sua organização no Claude.', '</ol></section>',
        '<li>Envie o endereço do sistema. A pessoa entra com a conta institucional e solicita o perfil; o pedido aparece em "Solicitações pendentes".</li>'
        '<li>Para atribuir antes do pedido, busque a pessoa em "Adicionar pessoa". Só aparece quem já entrou no sistema ao menos uma vez.</li>'
        '<li>O perfil vale assim que é gravado: o banco passa a liberar exatamente o escopo atribuído (UCs do Gestor, Gerências do Gerente).</li>')
one('placeholder="Buscar por nome"', 'placeholder="Buscar por nome ou e-mail"')

between('function psSearch(q){', 'function openAsg(uid){', r'''function psSearch(q){
  clearTimeout(psT);
  psT=setTimeout(()=>{
    const box=$("#psRes");if(!box)return;
    const t=norm(q.trim());
    if(!S.db||!t){box.innerHTML="";return}
    const rs=(S.usersAll||[]).filter(u=>norm((u.Nome||"")+" "+(u.Email||"")).includes(t));
    box.innerHTML=rs.length?rs.slice(0,8).map(p=>`<li><div><b>${esc(p.Nome||p.Email||"Usuário")}</b>${p.Nome&&p.Email?`<div class="note" style="margin:0">${esc(p.Email)}</div>`:""}</div><span class="sp"></span><button class="btn sm" data-psel="${esc(p.Uid)}">Atribuir</button></li>`).join(""):`<li class="note">Nenhuma pessoa encontrada. A pessoa precisa entrar no sistema ao menos uma vez.</li>`;
  },200);
}
''')

# ---------- Guia: textos sobre limites da plataforma anterior ----------
one(' Para ler envios de todos, Gerente, Validador final e Usuário final precisam do compartilhamento "Pode editar" (limite da plataforma).', '')
one('Nesta versão, o controle de perfis é feito pela interface. Ele orienta o uso, mas não impede um usuário técnico de gravar diretamente na base. Na implantação em Power Apps, o controle deve ser aplicado na fonte de dados.',
    'O controle de perfis é aplicado pelo próprio banco (regras do Firestore): cada pessoa só lê e grava o que o seu perfil permite, mesmo fora desta interface.')

# ---------- Downloads pelo navegador ----------
s, n = re.subn(r'const d=await window\.claude\.use\("downloads"\);if\(!d\)throw 0;await d\.save\(\{filename:(.+?),data(?::(\w+))?\}\);',
               lambda m: f'downloadFile({m.group(1)},{m.group(2) or "data"},"text/csv;charset=utf-8");', s)
if n < 2:
    raise SystemExit(f"esperava ao menos 2 downloads, achei {n}")

# ---------- Eventos de login/logout ----------
one('\nboot();\n</script>',
    '\ndocument.addEventListener("click",e=>{const t=e.target.closest("[data-fb]");if(!t)return;'
    'if(t.dataset.fb==="login")fbLogin(t.dataset.prov);else if(t.dataset.fb==="logout"&&S.auth)S.auth.signOut()});\n'
    'boot();\n</script>')

left = re.findall(r'window\.claude|S\._user|S\.legIds|"envios', s)
if left:
    raise SystemExit(f"restaram referências à plataforma anterior: {sorted(set(left))}")

open(dst, "w", encoding="utf8").write(s)
print(f"ok: {dst} ({len(s)} bytes, {n} downloads trocados)")
