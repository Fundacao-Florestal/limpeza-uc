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

// Botões de login exibidos, na ordem: "microsoft" e/ou "google".
// Cada um precisa estar ativado em Authentication > Método de login.
window.AUTH_PROVIDERS = ["microsoft"];

// ID do locatário (tenant) Microsoft 365 da FF. Preenchido, só contas desse locatário entram pelo botão Microsoft.
// Vazio aceita qualquer conta Microsoft.
window.MICROSOFT_TENANT = "";

// Domínios de e-mail aceitos, ex.: ["exemplo.sp.gov.br"]. Vazio aceita qualquer domínio.
// Este filtro é da interface; a trava no banco fica em contaPermitida(), no firestore.rules.
window.ALLOWED_EMAIL_DOMAINS = [];

// true só para testes locais com "firebase emulators:start".
window.USE_EMULATORS = false;
