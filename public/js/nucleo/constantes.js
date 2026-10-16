/* Constantes do domínio: Gerências, usos, situações do fluxo, perfis, campos do formulário e seus rótulos, parâmetros padrão da regra. */
"use strict";

const GER=["GIN","GIO","GIS","GLC","GLN","GLS","GM","GVPM","GVRAP"];
const GER_NOMES={GIN:"Interior Norte",GIO:"Interior Oeste",GIS:"Interior Sul",GLC:"Litoral Centro",GLN:"Litoral Norte",GLS:"Litoral Sul",GM:"Metropolitana",GVPM:"Vale do Paraíba e Mantiqueira",GVRAP:"Vale do Ribeira e Alto Paranapanema"};
const TIPOS=["Sede administrativa","Centro de visitantes","Base de fiscalização","Hospedaria / alojamento","Casa de funcionário","Sanitários públicos","Galpão / oficina","Outro uso"];
const STATUS=["Rascunho","Em validação","Validado","Homologado","Devolvido"];
const SL={"Em validação":"Em aprovação","Validado":"Aprovado pela Gerência","Homologado":"Validado final"};const sl=s=>SL[s]||s;
const PERFIS={admin:"Administrador",gestor:"Gestor",gerente:"Gerente",validador:"Validador final",final:"Usuário final"};

const norm=s=>String(s??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const DEF={V1:30,V2:100,V3:300,P1:100,P2:300,P3:800,PequenaArea:750,ProdInterna:750,ProdExterna:7500,PesoIUP:0.05,PesoIPS:0.03,PesoIHOS:0.02,VersaoRegra:"teste-reconstruido-2026-09-21"};
const PLBL={V1:"Visitantes/dia: limite 1",V2:"Visitantes/dia: limite 2",V3:"Visitantes/dia: limite 3",P1:"Pico: limite 1",P2:"Pico: limite 2",P3:"Pico: limite 3",PequenaArea:"Área interna máxima para compartilhamento (m²)",ProdInterna:"Produtividade interna (m²)",ProdExterna:"Produtividade externa (m²)",PesoIUP:"Peso por ponto de IUP",PesoIPS:"Peso por ponto de IPS",PesoIHOS:"Peso por ponto de IHOS"};
const NUM=["AreaInterna","AreaExterna","Dias","Horas","Pessoas","Visitantes","Pico","Sazonalidade","Sanitario","Publico","Vasos","Mictorios","Lavatorios","Chuveiros","AreaSanitaria","HorasSan","Reposicao","Hospedaria","Leitos","Quartos","Hospedes","Trocas","Lavanderia","Residuos","Lixeiras","Vidros","A_vidro","VidroFreq","VidroRisco"];
const TXT=["ID","UC","Gerencia","Categoria","Estrutura","Tipo","Observacoes","UCTipo","UCCadastro","Responsavel","Contato"];
const LBL={ID:"ID",UC:"UC ou área protegida",Gerencia:"Gerência",Categoria:"Categoria",Estrutura:"Estrutura",Tipo:"Uso principal",AreaInterna:"Área interna",AreaExterna:"Área externa",Dias:"Dias de uso por semana",Horas:"Horas de uso por dia",Pessoas:"Trabalhadores habituais",Visitantes:"Visitantes por dia normal",Pico:"Visitantes em dia de pico",Sazonalidade:"Sazonalidade",Sanitario:"Possui sanitário",Publico:"Sanitário de uso público",Vasos:"Vasos sanitários",Mictorios:"Mictórios",Lavatorios:"Lavatórios",Chuveiros:"Chuveiros",AreaSanitaria:"Área sanitária",HorasSan:"Horas de disponibilidade sanitária",Reposicao:"Reposição de insumos",Hospedaria:"Possui hospedaria",Leitos:"Leitos",Quartos:"Quartos",Hospedes:"Hóspedes no mês típico",Trocas:"Entradas de grupos no mês",Lavanderia:"Lavanderia no escopo",Residuos:"Resíduos",Lixeiras:"Lixeiras",Observacoes:"Observações",UCTipo:"Tipo institucional",UCCadastro:"Origem do cadastro"};
Object.assign(LBL,{Responsavel:"Nome do responsável",Contato:"Contato",Vidros:"Possui vidros externos",A_vidro:"Área de vidros externos",VidroFreq:"Limpeza da face externa",VidroRisco:"Exige balancim ou andaime"});
const DEP_SAN=["Publico","Vasos","Mictorios","Lavatorios","Chuveiros","AreaSanitaria","HorasSan","Reposicao"];
const DEP_HOSP=["Leitos","Quartos","Hospedes","Trocas","Lavanderia"];
/* Vidros externos: só se aplicam quando Vidros = 1. VidroFreq: 1 = trimestral, 2 = semestral. */
const DEP_VID=["A_vidro","VidroFreq","VidroRisco"];
const FLAGS=["Sanitario","Publico","Hospedaria","Lavanderia","Vidros","VidroRisco"];
const RES=["IUP","FaixaIUP","IPS","ClasseSan","IH","IR","IHOS","FrequenciaExterna","FatorExterno","Modalidade","Compartilhamento","CargaTecnica"];
