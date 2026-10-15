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
    '<style>input[type=email],input[type=password]{background:var(--surface);border:1px solid var(--line);border-radius:6px;padding:8px 10px;width:100%;min-height:38px;font:inherit;color:inherit}</style>\n'
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
function authMsg(e){
  const c=(e&&e.code)||"";
  const M={
    "auth/invalid-credential":"E-mail ou senha incorretos.","auth/invalid-login-credentials":"E-mail ou senha incorretos.",
    "auth/wrong-password":"E-mail ou senha incorretos.","auth/user-not-found":"E-mail ou senha incorretos.",
    "auth/email-already-in-use":"Já existe uma conta com este e-mail. Use Entrar ou Esqueci a senha.",
    "auth/weak-password":"Senha fraca. Use ao menos 8 caracteres.",
    "auth/password-does-not-meet-requirements":"A senha não atende aos requisitos definidos para o sistema.",
    "auth/invalid-email":"E-mail inválido.","auth/missing-password":"Informe a senha.",
    "auth/user-disabled":"Esta conta foi desativada. Fale com o Administrador.",
    "auth/too-many-requests":"Muitas tentativas seguidas. Aguarde alguns minutos ou use Esqueci a senha.",
    "auth/network-request-failed":"Sem conexão com o servidor. Verifique a internet e tente de novo.",
    "auth/operation-not-allowed":"O login por e-mail e senha não está ativado no Firebase.",
    "auth/admin-restricted-operation":"A criação de contas está desativada. Peça ao Administrador para criar a sua."};
  return M[c]||"Não foi possível concluir ("+(c||(e&&e.message)||"erro desconhecido")+").";
}
function fbMode(md){S.loginEmail=($("#lgEmail")&&$("#lgEmail").value)||S.loginEmail||"";S.loginMode=md;S.loginErr="";S.loginOk="";render();const f=$("#main input");if(f)f.focus()}
async function fbEmail(k){
  const v=id=>(($("#"+id)||{}).value||"");
  const email=v("lgEmail").trim();S.loginEmail=email;S.loginErr="";S.loginOk="";
  /* Mostra o erro sem redesenhar o formulário, para não apagar o que a pessoa digitou. */
  const fail=m=>{S.loginErr=m;const el=$("#lgErr");if(el){el.innerHTML=`<div class="banner">${esc(m)}</div>`;el.scrollIntoView({block:"nearest"})}else render()};
  {const el=$("#lgErr");if(el)el.innerHTML=""}
  if(k!=="senha"&&!fbDomainOk(email))return fail("Use um e-mail dos domínios autorizados: "+fbDomains().map(d=>"@"+d).join(", ")+".");
  const btn=$("#main form button[type=submit]");if(btn)btn.disabled=true;
  try{
    if(k==="entrar")await S.auth.signInWithEmailAndPassword(email,v("lgSenha"));
    else if(k==="criar"){
      const nome=v("lgNome").trim().replace(/\s+/g," ");
      if(nome.length<3)return fail("Informe o nome completo.");
      if(v("lgSenha").length<8)return fail("A senha precisa ter ao menos 8 caracteres.");
      if(v("lgSenha")!==v("lgSenha2"))return fail("As senhas não conferem.");
      S.pendingName=nome;
      const c=await S.auth.createUserWithEmailAndPassword(email,v("lgSenha"));
      await c.user.updateProfile({displayName:nome});
      S.me.name=nome;S.loginErr="";
      try{await c.user.sendEmailVerification();S.verifySent=Date.now()}catch{}
      render();
    }else{
      if(!email)return fail("Informe o e-mail da conta.");
      try{await S.auth.sendPasswordResetEmail(email)}catch(e){if(e&&e.code!=="auth/user-not-found")throw e}
      S.loginMode="entrar";S.loginOk="Se houver uma conta com esse e-mail, enviamos um link para criar uma nova senha. Confira também a caixa de spam.";render();
    }
  }catch(e){fail(authMsg(e))}
  finally{const b=$("#main form button[type=submit]");if(b)b.disabled=false}
}
async function fbVerify(k){
  const u=S.auth&&S.auth.currentUser;if(!u)return;
  if(k==="reenviar"){
    if(S.verifySent&&Date.now()-S.verifySent<60000){toast("Aguarde um minuto antes de pedir outro e-mail.");return}
    try{await u.sendEmailVerification();S.verifySent=Date.now();toast("E-mail de confirmação enviado.")}catch(e){toast(authMsg(e))}
    return;
  }
  try{
    await u.reload();
    const cu=S.auth.currentUser;
    if(cu&&cu.emailVerified){await cu.getIdToken(true);fbSession(cu)}
    else toast("A confirmação ainda não consta. Clique no link do e-mail e tente de novo.");
  }catch(e){toast(authMsg(e))}
}
function vLogin(){
  const md=S.loginMode||"entrar",signup=window.ALLOW_SIGNUP!==false;
  const box=(t,sub,body)=>`<div class="panel" style="max-width:520px;margin:8px auto 0"><h2>${t}</h2><p class="sub">${sub}</p><div id="lgErr" role="alert">${S.loginErr?`<div class="banner">${esc(S.loginErr)}</div>`:""}</div>${S.loginOk?`<p class="note" style="color:var(--ok);font-weight:500">${esc(S.loginOk)}</p>`:""}${body}</div>`;
  const em=`<label class="f wide">E-mail<input type="email" id="lgEmail" autocomplete="email" required value="${esc(S.loginEmail||"")}"></label>`;
  const link=(m,t)=>`<button class="btn" type="button" data-fbmode="${m}">${t}</button>`;
  if(md==="criar"&&signup)return box("Criar conta","Depois de criar a conta, confirme o e-mail pelo link que vamos enviar e solicite o seu perfil. O Administrador libera o acesso.",
    `<form data-fbform="criar" novalidate><div class="fields"><label class="f wide">Nome completo<input type="text" id="lgNome" autocomplete="name" required></label>${em}<label class="f">Senha <small>mínimo 8 caracteres</small><input type="password" id="lgSenha" autocomplete="new-password" required minlength="8"></label><label class="f">Repita a senha<input type="password" id="lgSenha2" autocomplete="new-password" required minlength="8"></label></div><div class="bar" style="margin:16px 0 0"><button class="btn pri" type="submit">Criar conta</button>${link("entrar","Já tenho conta")}</div></form>`);
  if(md==="senha")return box("Recuperar senha","Informe o e-mail da conta. Enviaremos um link para criar uma nova senha.",
    `<form data-fbform="senha" novalidate><div class="fields">${em}</div><div class="bar" style="margin:16px 0 0"><button class="btn pri" type="submit">Enviar link</button>${link("entrar","Voltar")}</div></form>`);
  return box("Entrar","Acesse com seu e-mail e senha."+(signup?" No primeiro acesso, crie sua conta e solicite o perfil.":" Se ainda não tem conta, peça ao Administrador."),
    `<form data-fbform="entrar" novalidate><div class="fields">${em}<label class="f wide">Senha<input type="password" id="lgSenha" autocomplete="current-password" required></label></div><div class="bar" style="margin:16px 0 0"><button class="btn pri" type="submit">Entrar</button>${signup?link("criar","Criar conta"):""}<span class="sp"></span>${link("senha","Esqueci a senha")}</div></form>`);
}
function vVerify(){
  return `<div class="panel" style="max-width:560px;margin:8px auto 0"><h2>Confirme seu e-mail</h2><p class="sub">Enviamos um link de confirmação para <b>${esc(S.me.email)}</b>. Abra o e-mail, clique no link e volte aqui. Confira também a caixa de spam.</p><p class="note">A confirmação garante que a conta é mesmo de quem diz ser, antes de o Administrador liberar um perfil.</p><div class="bar" style="margin:16px 0 0"><button class="btn pri" data-fbv="ok">Já confirmei</button><button class="btn" data-fbv="reenviar">Reenviar e-mail</button><span class="sp"></span><button class="btn" data-fb="logout">Sair</button></div></div>`;
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
    '  if(S.auth&&!S.me.id){$("#tabs").innerHTML="";$("#whoami").innerHTML="";m.innerHTML=vLogin();return}\n'
    '  if(S.auth&&!S.me.verified){$("#tabs").innerHTML="";$("#whoami").innerHTML="";m.innerHTML=vVerify();return}\n')
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
        '<li>Envie o endereço do sistema. A pessoa cria a conta com e-mail e senha, confirma o e-mail e solicita o perfil; o pedido aparece em "Solicitações pendentes".</li>'
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
    '\ndocument.addEventListener("click",e=>{'
    'const m=e.target.closest("[data-fbmode]");if(m){fbMode(m.dataset.fbmode);return}'
    'const v=e.target.closest("[data-fbv]");if(v){fbVerify(v.dataset.fbv);return}'
    'const t=e.target.closest("[data-fb]");if(t&&t.dataset.fb==="logout"&&S.auth){S.loginOk="";S.auth.signOut()}});\n'
    'document.addEventListener("submit",e=>{const f=e.target.closest("[data-fbform]");if(!f)return;e.preventDefault();fbEmail(f.dataset.fbform)});\n'
    'boot();\n</script>')

left = re.findall(r'window\.claude|S\._user|S\.legIds|"envios', s)
if left:
    raise SystemExit(f"restaram referências à plataforma anterior: {sorted(set(left))}")

open(dst, "w", encoding="utf8").write(s)
print(f"ok: {dst} ({len(s)} bytes, {n} downloads trocados)")
