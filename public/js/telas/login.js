/* Telas de login: entrar, criar conta, recuperar senha e confirmar e-mail. */
"use strict";

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
      render();
    }else{
      if(!email)return fail("Informe o e-mail da conta.");
      try{await S.auth.sendPasswordResetEmail(email)}catch(e){if(e&&e.code!=="auth/user-not-found")throw e}
      S.loginMode="entrar";S.loginOk="Se houver uma conta com esse e-mail, enviamos um link para criar uma nova senha. Confira também a caixa de spam.";render();
    }
  }catch(e){fail(authMsg(e))}
  finally{const b=$("#main form button[type=submit]");if(b)b.disabled=false}
}
function vLogin(){
  const md=S.loginMode||"entrar",signup=window.ALLOW_SIGNUP!==false;
  const box=(t,sub,body)=>`<div class="panel" style="max-width:520px;margin:8px auto 0"><h2>${t}</h2><p class="sub">${sub}</p><div id="lgErr" role="alert">${S.loginErr?`<div class="banner">${esc(S.loginErr)}</div>`:""}</div>${S.loginOk?`<p class="note" style="color:var(--ok);font-weight:500">${esc(S.loginOk)}</p>`:""}${body}</div>`;
  const em=`<label class="f wide">E-mail<input type="email" id="lgEmail" autocomplete="email" required value="${esc(S.loginEmail||"")}"></label>`;
  const link=(m,t)=>`<button class="btn" type="button" data-fbmode="${m}">${t}</button>`;
  if(md==="criar"&&signup)return box("Criar conta","Depois de criar a conta, solicite o seu perfil. O Administrador confere o pedido e libera o acesso.",
    `<form data-fbform="criar" novalidate><div class="fields"><label class="f wide">Nome completo<input type="text" id="lgNome" autocomplete="name" required></label>${em}<label class="f">Senha <small>mínimo 8 caracteres</small><input type="password" id="lgSenha" autocomplete="new-password" required minlength="8"></label><label class="f">Repita a senha<input type="password" id="lgSenha2" autocomplete="new-password" required minlength="8"></label></div><div class="bar" style="margin:16px 0 0"><button class="btn pri" type="submit">Criar conta</button>${link("entrar","Já tenho conta")}</div></form>`);
  if(md==="senha")return box("Recuperar senha","Informe o e-mail da conta. Enviaremos um link para criar uma nova senha.",
    `<form data-fbform="senha" novalidate><div class="fields">${em}</div><div class="bar" style="margin:16px 0 0"><button class="btn pri" type="submit">Enviar link</button>${link("entrar","Voltar")}</div></form>`);
  return box("Entrar","Acesse com seu e-mail e senha."+(signup?" No primeiro acesso, crie sua conta e solicite o perfil.":" Se ainda não tem conta, peça ao Administrador."),
    `<form data-fbform="entrar" novalidate><div class="fields">${em}<label class="f wide">Senha<input type="password" id="lgSenha" autocomplete="current-password" required></label></div><div class="bar" style="margin:16px 0 0"><button class="btn pri" type="submit">Entrar</button>${signup?link("criar","Criar conta"):""}<span class="sp"></span>${link("senha","Esqueci a senha")}</div></form>`);
}
