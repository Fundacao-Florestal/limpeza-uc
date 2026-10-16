"""Testa a ligação da interface com um Firebase falso em memória (login, perfis, gravação, fluxo, download).

Uso: python3 test/interface/teste_interface.py . [pasta-das-capturas]  (requer: pip install playwright && playwright install chromium)
"""
import json
import pathlib
import sys
import tempfile

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(sys.argv[1])
BUILD = pathlib.Path(__file__).parent
SHOTS = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else pathlib.Path(tempfile.gettempdir())

MOCK = (BUILD / "mockfb.js").read_text(encoding="utf8")
CONFIG = 'window.FIREBASE_CONFIG={apiKey:"teste",projectId:"demo"};window.ALLOW_SIGNUP=true;'
SENHA = "senha-forte-1"

fails, errors = [], []


def check(name, cond):
    print(("ok   " if cond else "FALHA"), name)
    if not cond:
        fails.append(name)


TIPOS = {".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8", ".css": "text/css; charset=utf-8"}


def route(r):
    u = r.request.url
    if "firebase-app-compat" in u:
        r.fulfill(body=MOCK, content_type="application/javascript")
    elif "gstatic.com/firebasejs" in u:
        r.fulfill(body="", content_type="application/javascript")
    elif "fonts." in u:
        r.fulfill(body="", content_type="text/css")
    elif u.startswith("http://app.test/"):
        caminho = u.split("?")[0][len("http://app.test/"):] or "index.html"
        if caminho == "firebase-config.js":
            r.fulfill(body=CONFIG, content_type="application/javascript")
            return
        arq = (ROOT / "public" / caminho).resolve()
        if (ROOT / "public").resolve() in arq.parents and arq.is_file():
            r.fulfill(body=arq.read_bytes(), content_type=TIPOS.get(arq.suffix, "application/octet-stream"))
        else:
            r.fulfill(status=404, body="não encontrado")
    else:
        r.continue_()


def entrar(page, email, senha):
    page.fill("#lgEmail", email)
    page.fill("#lgSenha", senha)
    page.click('form[data-fbform="entrar"] button[type=submit]')
    page.wait_for_timeout(300)


def login(page, uid, nome):
    """Conta já existente e confirmada."""
    page.evaluate("([u,e,s,n])=>__mock.addUser(u,e,s,n)", [uid, uid.lower() + "@ff.test", SENHA, nome])
    entrar(page, uid.lower() + "@ff.test", SENHA)


def logout(page):
    page.click('[data-fb="logout"]')
    page.wait_for_timeout(200)


with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_page(viewport={"width": 1280, "height": 900}, accept_downloads=True)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: m.type == "error" and errors.append(m.text))
    page.route("**/*", route)
    page.goto("http://app.test/index.html")
    page.wait_for_timeout(500)

    check("abre na tela de login por e-mail e senha", page.is_visible("#lgEmail") and page.is_visible("#lgSenha"))
    check("sem botões de Microsoft ou Google", page.locator("text=Microsoft").count() == 0 and page.locator("text=Google").count() == 0)
    check("sem abas antes do login", page.inner_html("#tabs").strip() == "")
    page.screenshot(path=str(SHOTS / "01-login.png"))

    uc, ger = page.evaluate("[UCS[0][0],UCS[0][2]]")

    # Senha errada e conta inexistente dão a mesma mensagem
    page.evaluate("__mock.addUser('uX','x@ff.test','certa-123','X')")
    entrar(page, "x@ff.test", "errada-123")
    check("senha errada: mensagem clara", page.is_visible("text=E-mail ou senha incorretos."))

    # Recuperar senha
    page.click('[data-fbmode="senha"]')
    page.fill("#lgEmail", "x@ff.test")
    page.click('form[data-fbform="senha"] button[type=submit]')
    page.wait_for_timeout(300)
    check("recuperar senha envia o link", {"tipo": "senha", "para": "x@ff.test"} in page.evaluate("__mock.mail"))
    check("recuperar senha volta ao Entrar com aviso", page.is_visible("text=enviamos um link para criar uma nova senha") and page.is_visible("#lgSenha"))

    # Pessoa nova: cria conta, confirma o e-mail, pede acesso
    page.click('[data-fbmode="criar"]')
    page.fill("#lgNome", "Nova Pessoa")
    page.fill("#lgEmail", "nova@ff.test")
    page.fill("#lgSenha", SENHA)
    page.fill("#lgSenha2", "outra-senha-1")
    page.click('form[data-fbform="criar"] button[type=submit]')
    page.wait_for_timeout(200)
    check("senhas diferentes são barradas", page.is_visible("text=As senhas não conferem."))
    page.fill("#lgSenha", "curta")
    page.fill("#lgSenha2", "curta")
    page.click('form[data-fbform="criar"] button[type=submit]')
    page.wait_for_timeout(200)
    check("senha curta é barrada", page.is_visible("text=ao menos 8 caracteres"))
    page.fill("#lgSenha", SENHA)
    page.fill("#lgSenha2", SENHA)
    page.click('form[data-fbform="criar"] button[type=submit]')
    page.wait_for_timeout(400)
    check("conta nova vai direto para o pedido de acesso, sem confirmar e-mail", page.is_visible("text=Solicitar acesso") and not page.is_visible("text=Confirme seu e-mail"))
    check("nenhum e-mail de confirmação é enviado", not any(m["tipo"] == "verificacao" for m in page.evaluate("__mock.mail")))
    usr = page.evaluate("__mock.get('usuarios/u1')")
    check("grava nome e e-mail da conta nova", usr and usr["Nome"] == "Nova Pessoa" and usr["Email"] == "nova@ff.test")
    page.screenshot(path=str(SHOTS / "02-pedido.png"))
    check("sem perfil vê Solicitar acesso", page.is_visible("text=Solicitar acesso"))
    check("pedido mostra os papéis para marcar", page.locator("[data-rqp]").count() == 5)
    page.click('[data-act="solicitar"]')
    page.wait_for_timeout(150)
    check("pedido vazio é barrado", "Marque ao menos uma opção" in page.inner_text("#rqErr"))
    page.click('[data-rqp="gestor"]')
    page.wait_for_timeout(150)
    check("marcar Gestor abre a escolha de UCs", page.is_visible("#rqQ") and page.locator("[data-rquc]").count() > 100)
    page.click('[data-act="solicitar"]')
    page.wait_for_timeout(150)
    check("Gestor sem UC é barrado", "Marque ao menos uma UC" in page.inner_text("#rqErr"))
    page.fill("#rqQ", uc)
    page.wait_for_timeout(150)
    page.check(f'[data-rquc="{uc}"]')
    page.wait_for_timeout(100)
    check("UC marcada aparece no resumo", uc in page.inner_text("#rqCount"))
    page.click('[data-rqp="gerente"]')
    page.wait_for_timeout(150)
    check("marcar Gerente também mantém a UC marcada", uc in page.inner_text("#rqCount") and page.locator("[data-rqger]").count() == 9)
    page.check(f'[data-rqger="{ger}"]')
    page.fill("#rqObs", "Também respondo pela base do núcleo")
    page.screenshot(path=str(SHOTS / "02b-pedido-preenchido.png"), full_page=True)
    page.click('[data-act="solicitar"]')
    page.wait_for_timeout(300)
    ped = page.evaluate("__mock.get('pedidos/u1')")
    check("pedido grava os dois papéis com UC e Gerência", ped and ped["Perfis"] == ["gestor", "gerente"] and ped["UCs"] == [uc] and ped["Gerencias"] == [ger])
    check("pedido só usa campos que as regras aceitam", ped and set(ped) <= {"Uid", "Perfis", "Perfil", "UCs", "Gerencias", "Outro", "Obs", "Em"})
    check("mostra Solicitação enviada com o resumo", page.is_visible("text=Solicitação enviada") and uc in page.inner_text("#main"))
    page.click('[data-act="pedalterar"]')
    page.wait_for_timeout(150)
    check("Alterar pedido volta ao formulário já preenchido", page.locator('[data-rqp="gestor"][aria-pressed="true"]').count() == 1 and page.locator('[data-rqp="gerente"][aria-pressed="true"]').count() == 1)
    page.click('[data-act="pedcancelar"]')
    page.wait_for_timeout(150)
    logout(page)
    check("Sair volta à tela Entrar", page.is_visible('form[data-fbform="entrar"]'))
    page.click('[data-fbmode="criar"]')
    page.fill("#lgNome", "Repetida")
    page.fill("#lgEmail", "nova@ff.test")
    page.fill("#lgSenha", SENHA)
    page.fill("#lgSenha2", SENHA)
    page.click('form[data-fbform="criar"] button[type=submit]')
    page.wait_for_timeout(300)
    check("e-mail repetido avisa que a conta existe", page.is_visible("text=Já existe uma conta com este e-mail"))
    page.click('[data-fbmode="entrar"]')
    page.wait_for_timeout(100)

    # Administrador: vê pedidos e atribui perfil
    page.evaluate("__mock.seed('acessos/uAdm',{Uid:'uAdm',Perfil:'admin'})")
    login(page, "uAdm", "Admin FF")
    tabs = page.inner_text("#tabs")
    check("admin vê as abas de admin", all(t in tabs for t in ["Painel gerencial", "Acessos", "Parâmetros"]))
    wh = [w for w in page.evaluate("__mock.log") if w[0] == "where"]
    check("admin lê estruturas sem filtro", not any(w[1] == "estruturas" for w in wh))
    page.click('[data-view="acc"]')
    page.wait_for_timeout(300)
    check("pedido aparece com o nome da pessoa", page.is_visible("text=Nova Pessoa"))
    check("pedido mostra os dois papéis e o escopo", all(t in page.inner_text("#main") for t in ["Gestor", "Gerente", uc, ger]))
    page.fill("#pSearch", "nova@")
    page.wait_for_timeout(400)
    check("busca de pessoas por nome", page.locator("#psRes li").count() >= 1 and "Nova Pessoa" in page.inner_text("#psRes"))
    page.screenshot(path=str(SHOTS / "02-acessos.png"), full_page=True)
    page.click('[data-act="aprovar"][data-uid="u1"]')
    page.wait_for_timeout(300)
    acc = page.evaluate("__mock.get('acessos/u1')")
    check("Aprovar libera exatamente o que foi pedido", acc and acc["Perfis"] == ["gerente", "gestor"] and acc["UCs"] == [uc] and acc["Gerencias"] == [ger])
    check("pedido sai da lista depois de aprovado", page.evaluate("__mock.get('pedidos/u1')") is None)
    page.click('[data-act="asg"][data-uid="u1"]')
    page.wait_for_timeout(300)
    check("Editar mostra os dois perfis marcados", page.locator('[data-asgp][aria-pressed="true"]').count() == 2 and page.is_visible("#asgList"))
    page.click('[data-act="fechar"]')
    page.wait_for_timeout(200)
    logout(page)

    # Pessoa com dois perfis: abas e leituras dos dois
    page.evaluate("__mock.log.length=0")
    entrar(page, "nova@ff.test", SENHA)
    page.wait_for_timeout(300)
    tabs = page.inner_text("#tabs")
    check("Gestor + Gerente vê as abas dos dois", all(t in tabs for t in ["Minhas UCs", "Preenchimento", "Registros"]) and "Acessos" not in tabs)
    wh = [w for w in page.evaluate("__mock.log") if w[0] == "where"]
    check("Gestor + Gerente lê o que criou e a sua Gerência", ["where", "estruturas", "CriadoPor", "==", "u1"] in wh and ["where", "estruturas", "Gerencia", "==", ger] in wh)
    check("topo mostra os dois perfis", "Gerente" in page.inner_text("#whoami") and "Gestor" in page.inner_text("#whoami"))
    logout(page)

    # Gestor: lê só o que criou e grava em estruturas/<ID>
    page.evaluate("""([uc,ger])=>{
      __mock.seed('acessos/uGest',{Uid:'uGest',Perfil:'gestor',UCs:[uc]});
      __mock.seed('estruturas/A',{ID:'A',UC:uc,Gerencia:ger,Estrutura:'Sede',Status:'Rascunho',CriadoPor:'uGest',Hist:[]});
      __mock.seed('estruturas/B',{ID:'B',UC:uc,Gerencia:ger,Estrutura:'Base',Status:'Em validação',CriadoPor:'outro',Hist:[]});
      __mock.seed('estruturas/C',{ID:'C',UC:uc,Gerencia:'GXX',Estrutura:'Galpão',Status:'Em validação',CriadoPor:'outro',Hist:[]});
      __mock.seed('estruturas/D',{ID:'D',UC:uc,Gerencia:ger,Estrutura:'Velha',Status:'Rascunho',CriadoPor:'uGest',Excluido:true,Hist:[]});
      __mock.log.length=0;}""", [uc, ger])
    login(page, "uGest", "Gestora")
    page.wait_for_timeout(300)
    wh = [w for w in page.evaluate("__mock.log") if w[0] == "where"]
    check("gestor consulta por CriadoPor", ["where", "estruturas", "CriadoPor", "==", "uGest"] in wh)
    check("gestor vê só o próprio e não o excluído", page.evaluate("S.recs.map(x=>x.ID).sort().join()") == "A")
    check("gestor abre em Minhas UCs", "Minhas UCs" in page.inner_text("#tabs"))
    page.evaluate("saveRec({...S.recs[0],Estrutura:'Sede nova'})")
    page.wait_for_timeout(200)
    check("gravação vai para estruturas/<ID>", page.evaluate("__mock.get('estruturas/A').Estrutura") == "Sede nova")
    check("nada gravado em envios", not page.evaluate("[...__mock.store.keys()].some(k=>k.startsWith('envios'))"))
    page.evaluate("delRec(S.recs[0])")
    page.wait_for_timeout(200)
    check("excluir marca Excluido", page.evaluate("__mock.get('estruturas/A').Excluido") is True)
    page.screenshot(path=str(SHOTS / "03-gestor.png"))

    # Formulário: áreas agrupadas, soma obrigatória e vidros
    page.click('[data-view="form"]')
    page.wait_for_timeout(300)
    check("formulário sem a parte opcional de detalhamento", page.locator("details.det").count() == 0 and page.locator("#main .grp").count() == 3)
    page.fill("#f_AreaInterna", "1000")
    page.fill("#f_A_frio", "800")
    page.wait_for_timeout(150)
    check("soma interna mostra quanto falta", "faltam 200 m²" in page.inner_text("#somaInt"))
    check("campos internos ficam marcados quando não bate", page.locator('[data-w="AreaInterna"].bad').count() == 1)
    check("Conferência aponta a diferença interna", "Faltam 200 m²" in page.inner_text("#chk"))
    page.fill("#f_A_saguao", "200")
    page.wait_for_timeout(150)
    check("soma interna confere", "confere" in page.inner_text("#somaInt") and page.locator('[data-w="AreaInterna"].bad').count() == 0)
    page.fill("#f_AreaExterna", "1500")
    page.fill("#f_A_varr", "1500")
    page.wait_for_timeout(150)
    check("soma externa confere com varrição", "confere" in page.inner_text("#somaExt"))
    check("vidros escondidos até marcar Sim", page.is_hidden("#sec_vid"))
    page.click("#f_Vidros_1")
    page.wait_for_timeout(150)
    check("marcar vidros mostra área, frequência e risco", page.is_visible("#f_A_vidro") and page.is_visible("#f_VidroFreq") and page.is_visible("#f_VidroRisco_1"))
    check("vidros sem área aparecem na Conferência", "área de vidros" in page.inner_text("#chk"))
    page.screenshot(path=str(SHOTS / "05-formulario.png"), full_page=True)
    page.click('[data-act="cancelar"]')
    page.wait_for_timeout(200)
    logout(page)

    # Gerente: lê só a Gerência dele e aprova
    page.evaluate("([ger])=>{__mock.seed('acessos/uGer',{Uid:'uGer',Perfil:'gerente',Gerencias:[ger]});__mock.log.length=0}", [ger])
    login(page, "uGer", "Gerente")
    wh = [w for w in page.evaluate("__mock.log") if w[0] == "where"]
    check("gerente consulta por Gerência", ["where", "estruturas", "Gerencia", "==", ger] in wh)
    check("gerente não vê outra Gerência", "C" not in page.evaluate("S.recs.map(x=>x.ID)"))
    page.evaluate("transition('B','Validado','')")
    page.wait_for_timeout(300)
    b2 = page.evaluate("__mock.get('estruturas/B')")
    check("aprovação muda Status e registra histórico", b2["Status"] == "Validado" and len(b2["Hist"]) == 1 and b2["Hist"][0]["por"] == "uGer")
    logout(page)

    # Validador e usuário final
    page.evaluate("__mock.seed('acessos/uVal',{Uid:'uVal',Perfil:'validador'});__mock.log.length=0")
    login(page, "uVal", "Validador")
    wh = [w for w in page.evaluate("__mock.log") if w[0] == "where"]
    check("validador consulta por Status, um a um", sorted(w[4] for w in wh if w[2] == "Status") == ["Devolvido", "Homologado", "Validado"])
    page.evaluate("transition('B','Homologado','')")
    page.wait_for_timeout(300)
    check("validação final grava Homologado", page.evaluate("__mock.get('estruturas/B').Status") == "Homologado")
    logout(page)
    page.evaluate("__mock.seed('acessos/uFin',{Uid:'uFin',Perfil:'final'});__mock.log.length=0")
    login(page, "uFin", "Consulta")
    wh = [w for w in page.evaluate("__mock.log") if w[0] == "where"]
    check("usuário final consulta só Homologado", ["where", "estruturas", "Status", "==", "Homologado"] in wh)
    check("usuário final vê o homologado", page.evaluate("S.recs.map(x=>x.ID).join()") == "B")
    logout(page)

    # Download de CSV pelo navegador (admin)
    login(page, "uAdm", "Admin FF")
    page.click('[data-view="reg"]')
    page.wait_for_timeout(300)
    with page.expect_download() as d:
        page.click('[data-act="csv"]')
    check("CSV baixa pelo navegador", d.value.suggested_filename.endswith(".csv"))

    # Endereço por aba
    hash_ = lambda: page.evaluate("location.hash")
    check("aba Registros tem endereço próprio", hash_() == "#/registros")
    page.click('[data-view="acc"]')
    page.wait_for_timeout(200)
    check("trocar de aba muda o endereço", hash_() == "#/acessos")
    page.go_back()
    page.wait_for_timeout(300)
    check("voltar do navegador volta para a aba anterior", hash_() == "#/registros" and page.evaluate("S.view") == "reg")
    page.go_forward()
    page.wait_for_timeout(300)
    check("avançar do navegador volta a Acessos", page.evaluate("S.view") == "acc")
    page.evaluate("location.hash='#/guia'")
    page.wait_for_timeout(300)
    check("endereço digitado abre a aba", page.evaluate("S.view") == "guia")
    page.evaluate("location.hash='#/registros/B'")
    page.wait_for_timeout(400)
    check("link de estrutura abre o detalhe", page.evaluate("$('#dlg').open") and "Base" in page.inner_text("#dlgBody"))
    page.keyboard.press("Escape")
    page.wait_for_timeout(300)
    check("fechar o detalhe tira o ID do endereço", hash_() == "#/registros")
    page.evaluate("location.hash='#/nao-existe'")
    page.wait_for_timeout(300)
    check("endereço inválido não quebra a tela", page.evaluate("S.view") == "reg" and not errors)
    logout(page)
    page.evaluate("location.hash='#/acessos'")
    login(page, "uGest", "Gestora")
    page.wait_for_timeout(300)
    check("Gestor que abre #/acessos cai numa aba permitida", page.evaluate("S.view") != "acc" and hash_() != "#/acessos")
    logout(page)
    page.evaluate("location.hash='#/registros/B'")
    login(page, "uAdm", "Admin FF")
    page.wait_for_timeout(500)
    check("link de estrutura funciona depois do login", page.evaluate("S.view") == "reg" and page.evaluate("$('#dlg').open"))
    page.keyboard.press("Escape")
    page.wait_for_timeout(200)

    # Acesso liberado enquanto a pessoa está na tela de pedido: a página dela atualiza sozinha
    logout(page)
    login(page, "uEsp", "Pessoa Esperando")
    page.wait_for_timeout(300)
    check("sem perfil fica na tela de pedido", page.is_visible("text=Solicitar acesso"))
    page.evaluate("__mock.seed('acessos/uEsp',{Uid:'uEsp',Perfis:['gestor'],Perfil:'gestor',UCs:['PE Cantareira'],Gerencias:[]})")
    page.wait_for_timeout(400)
    check("aprovação chega sem recarregar: vai para Minhas UCs e avisa", page.evaluate("S.view") == "minha" and "Minhas UCs" in page.inner_text("#tabs") and "acesso foi liberado" in page.inner_text("#toast") and "minhas-ucs" in page.evaluate("location.hash"))

    # Domínio não autorizado
    logout(page)
    page.evaluate("window.ALLOWED_EMAIL_DOMAINS=['fflorestal.sp.gov.br']")
    login(page, "uFora", "Fora")
    check("domínio não autorizado é barrado no login", page.is_visible("text=Use um e-mail dos domínios autorizados") and page.is_visible("#lgSenha"))
    page.screenshot(path=str(SHOTS / "04-dominio.png"))
    page.evaluate("window.ALLOW_SIGNUP=false");
    page.click('[data-fbmode="senha"]')
    page.click('[data-fbmode="entrar"]')
    check("sem cadastro aberto não mostra Criar conta", page.locator('[data-fbmode="criar"]').count() == 0)
    b.close()

check("sem erros de JavaScript", not errors)
for e in errors:
    print("  erro:", e)
print(json.dumps({"falhas": fails}, ensure_ascii=False))
sys.exit(1 if fails else 0)
