// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDel8_1MR8asctJbGReqxKKPKYKLXwMaFA",
  authDomain: "limpeza-uc-ff.firebaseapp.com",
  projectId: "limpeza-uc-ff",
  storageBucket: "limpeza-uc-ff.firebasestorage.app",
  messagingSenderId: "1032983154310",
  appId: "1:1032983154310:web:7a13448da94044cbce4b07"
};

// Login por e-mail e senha.
// true: a própria pessoa cria a conta na tela de login (e confirma o e-mail antes de usar).
// false: esconde "Criar conta"; o Administrador cria as contas em Authentication > Users > Adicionar usuário.
//        Desative também a criação de contas no console (README, passo 3), senão ela continua possível fora desta tela.
window.ALLOW_SIGNUP = true;

// Domínios de e-mail aceitos, ex.: ["exemplo.sp.gov.br"]. Vazio aceita qualquer domínio.
// Este filtro é da interface; a trava no banco fica em contaPermitida(), no firestore.rules.
window.ALLOWED_EMAIL_DOMAINS = ["fflorestal.sp.gov", "sp.gov.br"];

// true para testar no seu computador com "npm run dev" (emuladores, em http://localhost:5050).
// Só vale quando o site é aberto em localhost: publicado, o app sempre usa o projeto real.
// No modo local, os e-mails de confirmação não são enviados: o link aparece no terminal do npm run dev.
window.USE_EMULATORS = false;
