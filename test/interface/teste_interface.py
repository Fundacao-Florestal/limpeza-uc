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
HTML = (ROOT / "public/index.html").read_text(encoding="utf8")
MOCK = (BUILD / "mockfb.js").read_text(encoding="utf8")
CONFIG = 'window.FIREBASE_CONFIG={apiKey:"teste",projectId:"demo"};window.AUTH_PROVIDERS=["microsoft","google"];window.MICROSOFT_TENANT="tenant-ff";'

fails, errors = [], []


def check(name, cond):
    print(("ok   " if cond else "FALHA"), name)
    if not cond:
        fails.append(name)


def route(r):
    u = r.request.url
    if u.endswith("/index.html") or u.rstrip("/") == "http://app.test":
        r.fulfill(body=HTML, content_type="text/html; charset=utf-8")
    elif "firebase-app-compat" in u:
        r.fulfill(body=MOCK, content_type="application/javascript")
    elif "gstatic.com/firebasejs" in u:
        r.fulfill(body="", content_type="application/javascript")
    elif u.endswith("firebase-config.js"):
        r.fulfill(body=CONFIG, content_type="application/javascript")
    elif "fonts." in u:
        r.fulfill(body="", content_type="text/css")
    else:
        r.continue_()


def login(page, uid, nome, prov="microsoft"):
    page.evaluate("u=>window.__nextUser=u", {"uid": uid, "displayName": nome, "email": uid + "@ff.test"})
    page.click(f'[data-fb="login"][data-prov="{prov}"]')
    page.wait_for_timeout(300)


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

    check("abre na tela de login", page.is_visible("text=Entrar com conta Microsoft") and page.is_visible("text=Entrar com conta Google"))
    check("sem abas antes do login", page.inner_html("#tabs").strip() == "")
    page.screenshot(path=str(SHOTS / "01-login.png"))

    uc, ger = page.evaluate("[UCS[0][0],UCS[0][2]]")

    # Pessoa nova: sem perfil, pede acesso
    login(page, "uNova", "Nova Pessoa")
    prov = page.evaluate("window.__lastProvider")
    check("Microsoft com tenant", prov["providerId"] == "microsoft.com" and prov["params"]["tenant"] == "tenant-ff")
    check("grava cadastro em usuarios", page.evaluate("__mock.get('usuarios/uNova')")["Email"] == "uNova@ff.test")
    check("sem perfil vê Solicitar acesso", page.is_visible("text=Solicitar acesso"))
    page.select_option("#rqPerfil", "gestor")
    page.fill("#rqObs", uc)
    page.click('[data-act="solicitar"]')
    page.wait_for_timeout(300)
    ped = page.evaluate("__mock.get('pedidos/uNova')")
    check("pedido gravado com os campos que as regras aceitam", ped and set(ped) == {"Uid", "Perfil", "Obs", "Em"} and ped["Perfil"] == "gestor")
    check("mostra Solicitação enviada", page.is_visible("text=Solicitação enviada"))
    logout(page)
    check("Sair volta ao login", page.is_visible("text=Entrar com conta Microsoft"))

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
    page.fill("#pSearch", "nova")
    page.wait_for_timeout(400)
    check("busca de pessoas por nome", page.locator("#psRes li").count() >= 1 and "Nova Pessoa" in page.inner_text("#psRes"))
    page.screenshot(path=str(SHOTS / "02-acessos.png"))
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

    # Domínio não autorizado
    logout(page)
    page.evaluate("window.ALLOWED_EMAIL_DOMAINS=['fflorestal.sp.gov.br']")
    login(page, "uFora", "Fora")
    check("domínio não autorizado volta ao login com aviso", page.is_visible("text=não pertence a um domínio autorizado"))
    page.screenshot(path=str(SHOTS / "04-dominio.png"))
    b.close()

check("sem erros de JavaScript", not errors)
for e in errors:
    print("  erro:", e)
print(json.dumps({"falhas": fails}, ensure_ascii=False))
sys.exit(1 if fails else 0)
