/* Guia do painel: explicação de cada bloco, do cálculo do valor e dos perfis. */
"use strict";

function vGuia(){
  const rows=[
   ["Andamento","Estruturas por situação (Rascunho, Em aprovação, Aprovado pela Gerência, Validado final, Devolvido) e % aprovado.","Cadastro","Gerente, Usuário final","Mostra onde o diagnóstico está parado. Meta de cobertura depende da lista oficial de estruturas."],
   ["Exportação","Tabela Excel montada pelo usuário: nível (estrutura, UC ou Gerência), Gerências, quantitativos e categorias.","Diagnósticos com validação final","Usuário final","Somas e médias ignoram campos vazios. Média de IUP/IPS não é IUP/IPS da UC."],
   ["Cobertura de UCs","UCs do cadastro com ao menos uma estrutura registrada, por Gerência.","Notion (Áreas protegidas) + cadastro","Gerente, Usuário final","Mostra quantas das 169 áreas já têm diagnóstico. Atualizar a relação ao mudar o cadastro."],
   ["Cobertura por Gerência","Estruturas, validadas, pendentes, áreas e carga por Gerência.","Cadastro","Usuário final","Gerência sem registro indica lacuna de coleta."],
   ["Valor referencial (R$/mês)","Soma, por tipo de serviço, de área × valor unitário do CadTerc Vol. 03. É o cálculo final do painel e da exportação.","Áreas do diagnóstico + tabela de valores","Gerente, Usuário final","Estimativa de referência, não é preço contratado. Depende do regime de licitação e do fator de reajuste."],
   ["Carga técnica relativa","[(Área int. / produtividade) × (dias/7) + (área ext. / produtividade) × fator externo] × (1 + pesos × índices).","Regra + parâmetros","Usuário final","Índice analítico para priorizar. Não é nº de postos nem preço, e não entra no cálculo do valor."],
   ["IUP","Intensidade de uso, 0 a 13, por faixa (baixo, moderado, intenso, muito intenso).","Visitação, dias, horas, sazonalidade","Gerente, Gestor","Prioriza estruturas de maior pressão de uso."],
   ["Classe sanitária","SAN-1 a SAN-4, a partir do IPS e da disponibilidade horária.","Sanitários","Gerente","Hipótese analítica, não enquadramento normativo."],
   ["Modalidade indicada","Regular, com cobertura, compartilhado, volante ou sem uso.","Área, dias, IUP, IPS","Usuário final","Confirmar distância, acesso e logística antes de decidir."],
   ["Atenção","Estruturas com IUP ≥ 7 ou IPS ≥ 6, por carga.","Resultados","Gerente","Lista de trabalho para revisão e visita."],
   ["Pendências","Rascunhos e devolvidos, com motivo.","Fluxo de aprovação","Gestor, Gerente","Cobrança objetiva de correção."]];
  return `<div class="panel"><h2>Proposta do painel gerencial</h2><p class="sub">Leitura pretendida, fonte e cautela de cada bloco. Atualização: em tempo real nesta versão; em produção, diária a partir da tabela Diagnosticos.</p>
  <div class="tw guide"><table><thead><tr><th>Bloco</th><th>Definição</th><th>Fonte</th><th>Público</th><th>Cautela</th></tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
  <h3 style="font-size:15px;margin-top:20px">Como o valor referencial é calculado</h3>
  <div class="tw"><table><tbody>
   <tr><td>Base</td><td>Prestação de Serviços de Limpeza, Asseio e Conservação Predial, Vol. 03 do CadTerc (data-base jan/2023, versão 02 de set/2023). Valor mensal de cada tipo de serviço = área de piso (projeção horizontal, sem paredes, portas e divisórias) × valor unitário em R$/m²/mês.</td></tr>
   <tr><td>Tabela aplicada</td><td>Se construído + externo somam até 750 m², vale a tabela de pequenas áreas (Apêndice 4); acima disso, a tabela geral (Capítulo III). Parques estaduais usam o Apêndice 3 para varrição e para os postos sanitários. O regime (ampla ou restrita a ME/EPP) e o fator de reajuste são definidos em Parâmetros.</td></tr>
   <tr><td>Áreas internas</td><td>Quem preenche pode detalhar acarpetado, laboratório, almoxarifado, oficina e saguão. O restante da área interna é valorado como piso frio (ou almoxarifado, se o uso for galpão/oficina).</td></tr>
   <tr><td>Sanitários</td><td>O sanitário de uso público classe SAN-3 ou SAN-4 é valorado como "sanitário de grande circulação". Em parque, vira posto sanitário (SAN-3 = 8 h, SAN-4 = 16 h; 1 posto por estrutura) e sai da área em m². Os demais sanitários ficam no piso frio.</td></tr>
   <tr><td>Áreas externas</td><td>Pisos pavimentados e varrição podem ser detalhados. O restante da área externa é valorado como pátio e área verde na frequência calculada: semanal = alta, quinzenal = média, mensal = baixa.</td></tr>
   <tr><td>Fora do cálculo</td><td>Limpeza de vidros externos e coleta de detritos em pátios (R$/ha) não são coletadas neste levantamento. Estrutura com 0 dia de uso por semana tem valor zero. Carga técnica, IUP e IPS não alteram o valor.</td></tr>
   <tr><td>Equipe e tempo</td><td>Estimativa gerencial: área ÷ produtividade do CadTerc (m² por funcionário, por tipo de serviço) dá os postos equivalentes, mais 1 encarregado para cada 30. Horas por mês = postos × jornada de referência (44 h por semana na tabela geral; 24 h por semana, meio período, nas pequenas áreas; pátios pela frequência do quadro de periodicidades). Dias: 2ª a sábado, ou 7 dias nos serviços de parque. Não é exigência contratual: o documento veda produtividades e quantitativos de profissionais no edital (item 1.11).</td></tr>
   <tr><td>Congelamento</td><td>O valor é gravado ao enviar o diagnóstico, com a tabela vigente. Mudar a tabela vale para os próximos envios.</td></tr></tbody></table></div>
  <h3 style="font-size:15px;margin-top:20px">Perfis e fluxo</h3>
  <div class="tw"><table><thead><tr><th>Perfil</th><th>Faz</th><th>Vê</th></tr></thead><tbody>
   <tr><td>Gestor</td><td>Preenche os diagnósticos das UCs sob sua responsabilidade, uma estrutura por vez ("Adicionar estrutura" ou "Enviar e cadastrar outra"), e envia para aprovação. Corrige o que for devolvido.</td><td>Somente o que ele próprio enviou, nas UCs atribuídas. Envios de outras pessoas não aparecem.</td></tr>
   <tr><td>Gerente</td><td>Aprova ou devolve (com motivo obrigatório) os diagnósticos da sua Gerência.</td><td>Somente a sua Gerência.</td></tr>
   <tr><td>Validador final</td><td>Faz a validação final dos diagnósticos aprovados pelos Gerentes ("Validar (final)") ou os devolve ao gestor, com motivo obrigatório. Também exporta.</td><td>Diagnósticos aprovados pela Gerência e já validados, de todas as UCs.</td></tr>
   <tr><td>Usuário final</td><td>Consulta o painel e monta a tabela Excel com os quantitativos que precisa.</td><td>Somente diagnósticos com validação final, de todas as UCs.</td></tr>
   <tr><td>Administrador</td><td>Atribui perfis (UCs do Gestor, Gerências do Gerente), mantém parâmetros e o cadastro. Pode testar cada perfil em "Ver como".</td><td>Tudo, inclusive todos os envios recebidos.</td></tr></tbody></table></div>
  <p class="note" style="max-width:70ch">Fluxo: Rascunho → Em aprovação (Gerente) → Aprovado pela Gerência (Validador final) → Validado final, ou Devolvido ao gestor em qualquer das duas etapas. Editar um diagnóstico já aprovado abre nova revisão e exige nova aprovação e nova validação final. Quem entra sem perfil vê apenas a tela de solicitação de acesso.</p>
  <p class="note" style="max-width:70ch">O controle de perfis é aplicado pelo próprio banco (regras do Firestore): cada pessoa só lê e grava o que o seu perfil permite, mesmo fora desta interface.</p></div>`;
}
