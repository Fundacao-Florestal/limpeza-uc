# Limpeza UC

Diagnóstico da necessidade de limpeza predial das unidades de conservação da Fundação Florestal. Cada Gestor cadastra as estruturas da sua UC, o Gerente aprova, o Validador final valida, e o painel consolida o valor referencial mensal calculado pela tabela CadTerc.

Esta versão roda no **Firebase**: login com e-mail e senha pelo Firebase Authentication, dados no Firestore e site no Firebase Hosting. Ela substitui o artefato original do claude.ai, guardado em `legado/`.

## O que tem aqui

| Caminho | O que é |
|---|---|
| `public/index.html` | O app (uma página só: telas, cálculo e lista de UCs) |
| `public/firebase-config.js` | Configuração do projeto Firebase e do login (você preenche) |
| `firestore.rules` | Regras de segurança: é aqui que cada perfil é travado |
| `scripts/importar.mjs` | Importa a exportação CSV da versão anterior |
| `test/regras.test.mjs` | Testes das regras no emulador do Firestore |
| `test/interface/` | Teste da interface no navegador, com um Firebase falso em memória |
| `legado/` | HTML original do artefato e o script que gerou a versão Firebase a partir dele |
| `.github/workflows/publicar.yml` | Testa a cada push e publica no Firebase a cada push no `main` |

## Perfis

O perfil de cada pessoa fica em `acessos/<uid>`. As regras do Firestore aplicam o escopo no banco, não só na tela.

| Perfil | Lê | Grava |
|---|---|---|
| Administrador (`admin`) | Tudo | Tudo; atribui perfis, parâmetros e tabela de valores |
| Gestor (`gestor`) | As estruturas que ele criou | Cria e edita as próprias estruturas, só nas UCs atribuídas; envia para aprovação |
| Gerente (`gerente`) | As estruturas das suas Gerências | Aprova ou devolve o que está "Em validação" na sua Gerência; não altera o conteúdo |
| Validador final (`validador`) | Estruturas aprovadas, homologadas ou devolvidas | Faz a validação final ou devolve; não altera o conteúdo |
| Usuário final (`final`) | Só estruturas com validação final | Nada |

Quem entra sem perfil vê apenas a tela de pedido de acesso. Antes disso, a pessoa precisa confirmar o e-mail pelo link que o sistema envia: sem a confirmação o banco não libera nada, nem para quem já tem perfil. É isso que impede alguém de criar uma conta com o e-mail de um colega e pedir perfil no nome dele.

Coleções do Firestore: `estruturas/<ID>` (um documento por estrutura), `acessos/<uid>`, `pedidos/<uid>`, `usuarios/<uid>` (nome e e-mail de quem já entrou) e `config/valores`, `config/parametros`.

## Passo a passo para colocar no ar

### 1. Criar o projeto

No [console do Firebase](https://console.firebase.google.com), crie um projeto (o Google Analytics pode ficar desligado).

### 2. Criar o banco

Em **Firestore Database > Criar banco de dados**, escolha o modo de produção e a região **southamerica-east1 (São Paulo)**. A região não pode ser mudada depois.

### 3. Ativar o login

Em **Authentication > Primeiros passos > Método de login**, ative **E-mail/senha**. Deixe desligada a opção "Link do e-mail (login sem senha)".

Ainda em **Authentication**:

- **Modelos** (Templates): troque o idioma para português e, se quiser, ajuste o nome do remetente. São os e-mails de confirmação de conta e de nova senha.
- **Configurações > Domínios autorizados**: confira se aparece o domínio onde o app vai rodar (o `*.web.app` do projeto já vem incluído). Os links dos e-mails só funcionam nesses domínios.
- **Configurações > Política de senha** (opcional, se aparecer no seu plano): exija tamanho mínimo e tipos de caractere. O app já exige ao menos 8 caracteres na criação da conta.

**Quem cria as contas.** Por padrão, a própria pessoa cria a conta na tela de login. Se preferir que só o Administrador crie:

1. Em `public/firebase-config.js`, ponha `ALLOW_SIGNUP = false` (some o botão "Criar conta").
2. Em **Authentication > Configurações > Ações do usuário**, desmarque **Ativar criação (inscrição)**. Sem isso, a criação de contas continua possível por fora da tela.
3. Crie cada conta em **Authentication > Users > Adicionar usuário** e passe a senha inicial à pessoa. No primeiro acesso ela confirma o e-mail pelo próprio sistema e pode trocar a senha em "Esqueci a senha".

### 4. Ligar o app ao projeto

Em **Configurações do projeto > Geral > Seus apps**, adicione um app Web e copie a configuração para `public/firebase-config.js`. No mesmo arquivo:

- `ALLOW_SIGNUP`: se a própria pessoa pode criar a conta (veja o passo 3).
- `ALLOWED_EMAIL_DOMAINS`: domínios de e-mail aceitos, por exemplo só o institucional. Para travar também no banco, edite `contaPermitida()` em `firestore.rules`.

Esses valores não são segredo e podem ser commitados.

### 5. Publicar

Com Node 20 ou superior:

```bash
npm install
npx firebase login
npx firebase use --add      # escolha o projeto criado no passo 1
npm run deploy              # publica o site e as regras
```

O endereço do site aparece no final (`https://<projeto>.web.app`).

### 6. Criar o primeiro Administrador

1. Abra o site, crie a sua conta e confirme o e-mail pelo link recebido. Vai aparecer a tela de pedido de acesso. (Se desligou a criação de contas, crie a sua em **Authentication > Users > Adicionar usuário**, entre no site e confirme o e-mail.)
2. No console, em **Authentication > Users**, copie o UID da sua conta.
3. Em **Firestore Database**, crie a coleção `acessos` com um documento cujo ID é esse UID e os campos `Uid` (string, o mesmo UID) e `Perfil` (string, `admin`).
4. Recarregue o site. Daqui em diante os perfis são atribuídos pela aba **Acessos**.

### 7. Importar os dados da versão anterior

No artefato original, o Administrador abre **Registros**, limpa os filtros, desmarca "Ocultar exemplos" e clica em **Exportar CSV (modelo)**. Com esse arquivo:

1. Gere uma chave em **Configurações do projeto > Contas de serviço > Gerar nova chave privada**. Guarde fora do repositório e apague depois.
2. Confira antes, sem gravar nada:
   ```bash
   node scripts/importar.mjs --csv exportacao.csv --seco
   ```
3. Importe:
   ```bash
   node scripts/importar.mjs --csv exportacao.csv --chave chave-servico.json --donos donos.csv
   ```

O CSV exportado não diz quem criou cada registro. O arquivo opcional `donos.csv` (linhas `UC;uid`) define o Gestor de cada UC; sem ele, os registros importados ficam visíveis para Administrador, Gerentes e Validador, mas não aparecem na lista de nenhum Gestor. O histórico de aprovações e o detalhamento do valor por tipo de serviço também não vêm no CSV: os registros entram com a situação e o valor total que tinham.

### 8. Publicação automática (opcional)

O workflow em `.github/workflows/publicar.yml` testa as regras em todo push e publica a cada push no `main`. Para ligar:

1. No Google Cloud do projeto, crie uma conta de serviço com os papéis **Administrador do Firebase Hosting** e **Administrador das Regras do Firebase**, e gere uma chave JSON.
2. No GitHub, em **Settings > Secrets and variables > Actions**, crie o secret `FIREBASE_SERVICE_ACCOUNT` com o conteúdo do JSON e a variable `FIREBASE_PROJECT_ID` com o ID do projeto.

## Testes

```bash
npm test
```

Sobe o emulador do Firestore e verifica, perfil por perfil, o que as regras liberam e bloqueiam. Precisa de Java 21.

O teste da interface roda o app num navegador com um Firebase falso em memória (criar conta, confirmar e-mail, entrar, recuperar senha, perfis, gravação, aprovação, download):

```bash
pip install playwright && playwright install chromium
python3 test/interface/teste_interface.py .
```

Para testar no seu computador sem tocar no projeto real, ponha `USE_EMULATORS = true` em `firebase-config.js`, rode `npm run dev` e abra http://localhost:5050. O banco e o login são locais e somem ao fechar. Os e-mails de confirmação não são enviados: o link aparece no terminal. Precisa de Java 21. Volte `USE_EMULATORS` para `false` antes de publicar (publicado, o app ignora essa opção de qualquer forma).

## O que mudou em relação ao artefato

- **Login**: antes era a conta do claude.ai; agora é e-mail e senha no Firebase Authentication, com confirmação de e-mail e recuperação de senha.
- **Dados**: antes cada pessoa gravava todas as suas estruturas num único documento (`envios/<pessoa>`); agora cada estrutura é um documento em `estruturas/`, o que permite aplicar o escopo de cada perfil no banco.
- **Perfis**: antes o controle era só da interface, e Gerentes e Validadores precisavam de permissão de edição no artefato para ler os envios. Agora as regras do Firestore liberam exatamente o escopo de cada perfil.
- **Busca de pessoas**: o Administrador encontra quem já entrou no sistema ao menos uma vez.
- **Downloads**: Excel e CSV baixam direto pelo navegador.
- **Cálculo, telas e textos**: iguais ao original.

## Limites conhecidos

- A Gerência de cada estrutura é preenchida pelo app a partir da UC; as regras confiam nesse campo e não conferem a correspondência UC → Gerência.
- Para desativar o acesso de alguém, remova o perfil na aba Acessos. Para bloquear também o login, desative a conta em **Authentication > Users**.
- Cada estrutura cadastrada tem um único Gestor dono. Se a UC trocar de Gestor, o Administrador precisa editar o campo `CriadoPor` das estruturas no console.
