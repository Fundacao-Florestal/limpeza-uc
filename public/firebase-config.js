// Configuração do app Web do Firebase.
// Copie os valores em: Console do Firebase > Configurações do projeto > Geral > Seus apps > Configuração do SDK (opção "Config").
// Estes valores não são segredo; quem protege os dados são as regras em firestore.rules.
// Enquanto apiKey estiver como "COLE_AQUI", o app abre em modo local (dados só na sessão, sem login).
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyDel8_1MR8asctJbGReqxKKPKYKLXwMaFA",
  authDomain: "limpeza-uc-ff.firebaseapp.com",
  projectId: "limpeza-uc-ff",
  storageBucket: "limpeza-uc-ff.firebasestorage.app",
  messagingSenderId: "1032983154310",
  appId: "1:1032983154310:web:7a13448da94044cbce4b07"
};

// Login por e-mail e senha.
// true: a própria pessoa cria a conta na tela de login e pede o perfil; o Administrador aprova ou não.
// false: esconde "Criar conta"; o Administrador cria as contas em Authentication > Users > Adicionar usuário.
//        Desative também a criação de contas no console (README, passo 3), senão ela continua possível fora desta tela.
window.ALLOW_SIGNUP = true;

// Domínios de e-mail aceitos, ex.: ["exemplo.sp.gov.br"]. Vazio aceita qualquer domínio.
// Este filtro é da interface; a trava no banco fica em contaPermitida(), no firestore.rules.
window.ALLOWED_EMAIL_DOMAINS = ["fflorestal.sp.gov.br", "sp.gov.br"];

// O "npm run dev" (http://localhost:5050) já usa os emuladores e entra como Administrador, sem login.
// true força os emuladores também em outro servidor local.
// Só vale quando o site é aberto em localhost: publicado, o app sempre usa o projeto real.
// No modo local, e-mails (como o de nova senha) não são enviados: o link aparece no terminal do npm run dev.
window.USE_EMULATORS = false;
