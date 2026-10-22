# Limpeza UC

Diagnóstico da necessidade de limpeza predial das unidades de conservação da Fundação Florestal. Cada Gestor cadastra as estruturas da sua UC, o Gerente aprova, o Validador final valida, e o painel consolida o valor referencial mensal calculado pela tabela CadTerc.

Esta versão roda no **Firebase**: login com e-mail e senha pelo Firebase Authentication, dados no Firestore e site no Firebase Hosting. Ela substitui o artefato original do claude.ai, guardado em `legado/`.

## O que tem aqui

| Caminho | O que é |
|---|---|
| `public/` | O app: `index.html`, estilos em `css/` e código em `js/` (veja "Como o código está organizado") |
| `public/firebase-config.js` | Configuração do projeto Firebase e do login (você preenche) |
| `firestore.rules` | Regras de segurança: é aqui que cada perfil é travado |
| `scripts/importar.mjs` | Importa a exportação CSV da versão anterior |
| `test/regras.test.mjs` | Testes das regras no emulador do Firestore |
| `test/interface/` | Teste da interface no navegador, com um Firebase falso em memória |
| `legado/` | Só histórico: HTML original do artefato e o script que fez a primeira conversão (não roda mais) |
| `.github/workflows/publicar.yml` | Testa a cada push e publica no Firebase a cada push no `main` |

## Como o código está organizado

Não há etapa de build: o que está em `public/` é exatamente o que vai para o ar. Para mudar algo, edite o arquivo e publique.

**Tudo que vai para o ar está em `public/`**, e o resto do repositório é ferramenta, teste e documentação. O GitHub Pages publica a pasta `public/` (ver `.github/workflows/static.yml`) e o `npm run dev` também serve essa pasta. Não crie um `index.html` na raiz: ele não seria publicado.

### Endereços das abas

Cada aba tem um endereço, que pode ser compartilhado, favoritado ou recarregado:

| Aba | Endereço |
|---|---|
| Minhas UCs | `#/minhas-ucs` |
| Painel gerencial | `#/painel` |
| Preenchimento | `#/preenchimento` |
| Registros | `#/registros` |
| Exportar | `#/exportar` |
| Acessos | `#/acessos` |
| Parâmetros | `#/parametros` |
| Guia do painel | `#/guia` |

Acrescentar o ID de uma estrutura abre o detalhe dela, por exemplo `#/registros/APA-BANHADO-01-X7K`. Os botões voltar e avançar do navegador trocam de aba. Quem abre o endereço de uma aba que o seu perfil não vê cai na primeira aba permitida, e quem não está logado passa pelo login e depois vai para o endereço pedido. O `#` é necessário porque o GitHub Pages não sabe redirecionar `/registros` para o `index.html`. Os endereços ficam em `js/nucleo/navegacao.js` (constante `ROTAS`).

```
public/
├── index.html              estrutura da página e a lista de scripts, na ordem de carga
├── firebase-config.js      configuração do projeto Firebase e do login
├── css/estilos.css         todo o visual (cores em variáveis no :root, tema escuro automático)
└── js/
    ├── nucleo/
    │   ├── util.js         utilitários: escape de HTML, formatação, avisos, download
    │   ├── constantes.js   Gerências, situações, perfis, campos e rótulos, parâmetros padrão
    │   ├── estado.js       estado do app (objeto S)
    │   ├── perfis.js       o que cada perfil vê e pode fazer na interface
    │   └── navegacao.js    troca de telas e desenho da página
    ├── dados/
    │   ├── ucs.js          lista de UCs com categoria e Gerência
    │   └── firebase.js     login, leituras por perfil e gravação no Firestore
    ├── regras/
    │   ├── valor-referencial.js   tabela CadTerc e cálculo do valor mensal
    │   └── indicadores.js         validação do formulário e IUP, IPS, modalidade etc.
    ├── telas/              uma por aba: login, painel, minhas-ucs, registros, formulario,
    │                       acessos, exportar, parametros, guia
    └── eventos.js          cliques e digitação ligados às telas; inicia o app
```

Onde mexer para as mudanças mais comuns:

| Quero mudar… | Arquivo |
|---|---|
| Incluir ou corrigir uma UC | `js/dados/ucs.js` |
| Valores do CadTerc ou regra do valor mensal | `js/regras/valor-referencial.js` (os valores também são editáveis na aba Parâmetros) |
| Fórmulas do IUP, IPS, modalidade | `js/regras/indicadores.js` |
| Um texto ou campo de uma tela | o arquivo da tela em `js/telas/` |
| Cores, fontes, espaçamentos | `css/estilos.css` |
| Quem vê o quê | `js/nucleo/perfis.js` (tela) e `firestore.rules` (banco, é o que vale de verdade) |

Os scripts são comuns, não módulos: carregados em ordem pelo `index.html`, eles compartilham as funções e constantes entre si. Ao criar um arquivo novo, inclua a tag `<script>` no `index.html` antes de `js/eventos.js`, depois dos arquivos de que ele depende.

## Perfis

O perfil de cada pessoa fica em `acessos/<uid>`. As regras do Firestore aplicam o escopo no banco, não só na tela.

| Perfil | Lê | Grava |
|---|---|---|
| Administrador (`admin`) | Tudo | Tudo; atribui perfis, parâmetros e tabela de valores |
| Gestor (`gestor`) | As estruturas que ele criou | Cria e edita as próprias estruturas, só nas UCs atribuídas; envia para aprovação |
| Gerente (`gerente`) | As estruturas das suas Gerências | Aprova ou devolve o que está "Em validação" na sua Gerência; não altera o conteúdo |
| Validador final (`validador`) | Estruturas aprovadas, homologadas ou devolvidas | Faz a validação final ou devolve; não altera o conteúdo |
| Usuário final (`final`) | Só estruturas com validação final | Nada |

Uma pessoa pode ter mais de um perfil, por exemplo Gestora de uma UC e Gerente da Gerência: ela vê e pode fazer o que cada um dos perfis libera (campo `Perfis`, uma lista; acessos antigos só com `Perfil` continuam valendo).

Autocadastro: quem entra pela primeira vez marca um ou mais papéis (Gestor de UC, Gerente, Validador final, Consulta ou Outro), escolhe as suas UCs e a sua Gerência e já entra com esse acesso, sem esperar aprovação. Só quem marca apenas "Outro" fica aguardando o Administrador atribuir um perfil. As regras do Firestore deixam cada pessoa criar o próprio acesso uma única vez e nunca como Administrador.

Na aba Acessos o Administrador vê todos, com os cadastros recentes marcados como **Novo**, e pode **Editar** ou **Revogar**. Revogar não apaga o documento: marca `Revogado: true`, a pessoa perde o acesso na hora e não consegue se cadastrar de novo; dá para **Reativar** depois. Ao revogar, dá para excluir também tudo o que a pessoa preencheu. O Administrador também exclui qualquer preenchimento pelo botão **Excluir** no detalhe da estrutura.

O e-mail não é confirmado, então qualquer pessoa que crie uma conta (dentro dos domínios aceitos em `ALLOWED_EMAIL_DOMAINS`) entra com o papel que escolher. Confira os novos cadastros. Para voltar a exigir a confirmação de e-mail, veja o comentário em `signedIn()` no `firestore.rules`.

Coleções do Firestore: `estruturas/<ID>` (um documento por estrutura), `acessos/<uid>`, `pedidos/<uid>`, `usuarios/<uid>` (nome e e-mail de quem já entrou) e `config/valores`, `config/parametros`.

## Passo a passo para colocar no ar

### 1. Criar o projeto

No [console do Firebase](https://console.firebase.google.com), crie um projeto (o Google Analytics pode ficar desligado).

### 2. Criar o banco

Em **Firestore Database > Criar banco de dados**, escolha o modo de produção e a região **southamerica-east1 (São Paulo)**. A região não pode ser mudada depois.

### 3. Ativar o login

Em **Authentication > Primeiros passos > Método de login**, ative **E-mail/senha**. Deixe desligada a opção "Link do e-mail (login sem senha)".

Ainda em **Authentication**:

- **Modelos** (Templates): troque o idioma para português e, se quiser, ajuste o nome do remetente. O app só usa o modelo de redefinição de senha.
- **Configurações > Domínios autorizados**: confira se aparece o domínio onde o app vai rodar (o `*.web.app` do projeto já vem incluído). Os links dos e-mails só funcionam nesses domínios.
- **Configurações > Política de senha** (opcional, se aparecer no seu plano): exija tamanho mínimo e tipos de caractere. O app já exige ao menos 8 caracteres na criação da conta.

**Quem cria as contas.** Por padrão, a própria pessoa cria a conta na tela de login. Se preferir que só o Administrador crie:

1. Em `public/firebase-config.js`, ponha `ALLOW_SIGNUP = false` (some o botão "Criar conta").
2. Em **Authentication > Configurações > Ações do usuário**, desmarque **Ativar criação (inscrição)**. Sem isso, a criação de contas continua possível por fora da tela.
3. Crie cada conta em **Authentication > Users > Adicionar usuário** e passe a senha inicial à pessoa. Ela pode trocar a senha em "Esqueci a senha".

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

1. Abra o site, crie a sua conta. Vai aparecer a tela de pedido de acesso. (Se desligou a criação de contas, crie a sua em **Authentication > Users > Adicionar usuário**, e entre no site.)
2. No console, em **Authentication > Users**, copie o UID da sua conta.
3. Em **Firestore Database**, crie a coleção `acessos` com um documento cujo ID é esse UID e os campos `Uid` (string, o mesmo UID) e `Perfis` (array com um item, a string `admin`).
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

O teste da interface roda o app num navegador com um Firebase falso em memória (criar conta, entrar, recuperar senha, perfis, gravação, aprovação, download):

```bash
pip install playwright && playwright install chromium
python3 test/interface/teste_interface.py .
```

Para testar no seu computador sem tocar no projeto real, rode `npm run dev` e abra http://localhost:5050. Não há tela de login: o app entra sozinho como Administrador (`dev@sp.gov.br`); para ver como Gestor, use "Ver como" no topo. O banco e o login são locais e somem ao fechar. Ao salvar qualquer arquivo em `public/`, a página recarrega sozinha (mudança só em CSS troca o estilo sem recarregar). Os e-mails de confirmação não são enviados: o link aparece no terminal. Precisa de Java 21.

## O que mudou em relação ao artefato

- **Login**: antes era a conta do claude.ai; agora é e-mail e senha no Firebase Authentication, com recuperação de senha; o acesso depende da aprovação do Administrador.
- **Dados**: antes cada pessoa gravava todas as suas estruturas num único documento (`envios/<pessoa>`); agora cada estrutura é um documento em `estruturas/`, o que permite aplicar o escopo de cada perfil no banco.
- **Perfis**: antes o controle era só da interface, e Gerentes e Validadores precisavam de permissão de edição no artefato para ler os envios. Agora as regras do Firestore liberam exatamente o escopo de cada perfil.
- **Busca de pessoas**: o Administrador encontra quem já entrou no sistema ao menos uma vez.
- **Downloads**: Excel e CSV baixam direto pelo navegador.
- **Cálculo, telas e textos**: iguais ao original.

## Limites conhecidos

- A Gerência de cada estrutura é preenchida pelo app a partir da UC; as regras confiam nesse campo e não conferem a correspondência UC → Gerência.
- Para desativar o acesso de alguém, use **Revogar** na aba Acessos. Para bloquear também o login, desative a conta em **Authentication > Users**.
- Cada estrutura cadastrada tem um único Gestor dono. Se a UC trocar de Gestor, o Administrador precisa editar o campo `CriadoPor` das estruturas no console.
