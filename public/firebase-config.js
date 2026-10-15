// Configuração do app Web do Firebase.
// Copie os valores em: Console do Firebase > Configurações do projeto > Geral > Seus apps > Configuração do SDK (opção "Config").
// Estes valores não são segredo; quem protege os dados são as regras em firestore.rules.
// Enquanto apiKey estiver como "COLE_AQUI", o app abre em modo local (dados só na sessão, sem login).
window.FIREBASE_CONFIG = {
  apiKey: "COLE_AQUI",
  authDomain: "SEU-PROJETO.firebaseapp.com",
  projectId: "SEU-PROJETO",
  storageBucket: "SEU-PROJETO.firebasestorage.app",
  messagingSenderId: "",
  appId: ""
};

// Login por e-mail e senha.
// true: a própria pessoa cria a conta na tela de login (e confirma o e-mail antes de usar).
// false: esconde "Criar conta"; o Administrador cria as contas em Authentication > Users > Adicionar usuário.
//        Desative também a criação de contas no console (README, passo 3), senão ela continua possível fora desta tela.
window.ALLOW_SIGNUP = true;

// Domínios de e-mail aceitos, ex.: ["exemplo.sp.gov.br"]. Vazio aceita qualquer domínio.
// Este filtro é da interface; a trava no banco fica em contaPermitida(), no firestore.rules.
window.ALLOWED_EMAIL_DOMAINS = [];

// true para testar no seu computador com "npm run dev" (emuladores, em http://localhost:5050).
// Só vale quando o site é aberto em localhost: publicado, o app sempre usa o projeto real.
// No modo local, os e-mails de confirmação não são enviados: o link aparece no terminal do npm run dev.
window.USE_EMULATORS = false;
