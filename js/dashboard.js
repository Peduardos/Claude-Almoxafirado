// ---------- Configurações do Dashboard ----------
const LIMITE_MOVIMENTACOES_RECENTES = 5;
const DIAS_RESUMO_MOVIMENTACOES = 7;
const LIMITE_ALERTAS_DASHBOARD = 8;

// ---------- Cálculos ----------
// A situação de cada produto (situacaoEstoque) é definida em js/estoque.js.
function calcularResumoEstoque() {
  const produtos = obterProdutos();
  const resumo = {
    totalProdutos: produtos.length,
    totalItens: 0,
    estoqueBaixo: 0,
    semEstoque: 0
  };

  produtos.forEach(function (produto) {
    resumo.totalItens += Math.max(Number(produto.quantidade) || 0, 0);

    const situacao = situacaoEstoque(produto);
    if (situacao === 'baixo') {
      resumo.estoqueBaixo++;
    } else if (situacao === 'sem-estoque') {
      resumo.semEstoque++;
    }
  });

  return resumo;
}

function obterMovimentacoesRecentes(limite) {
  return obterMovimentacoes()
    .slice()
    .sort(function (a, b) {
      return new Date(b.data) - new Date(a.data);
    })
    .slice(0, limite);
}

function resumirMovimentacoesPeriodo(dias) {
  const inicio = Date.now() - dias * 24 * 60 * 60 * 1000;
  const resumo = { entradas: 0, saidas: 0, unidadesEntrada: 0, unidadesSaida: 0 };

  obterMovimentacoes().forEach(function (mov) {
    if (new Date(mov.data).getTime() < inicio) {
      return;
    }

    const quantidade = Number(mov.quantidade) || 0;
    if (mov.tipo === 'entrada') {
      resumo.entradas++;
      resumo.unidadesEntrada += quantidade;
    } else if (mov.tipo === 'saida') {
      resumo.saidas++;
      resumo.unidadesSaida += quantidade;
    }
  });

  return resumo;
}

// ---------- Formatação ----------
function formatarNumero(valor) {
  return Number(valor).toLocaleString('pt-BR');
}

function formatarDataHora(dataIso) {
  const data = new Date(dataIso);
  if (isNaN(data.getTime())) {
    return '-';
  }
  return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function rotuloTipoMovimentacao(tipo) {
  if (tipo === 'entrada') {
    return 'Entrada';
  }
  if (tipo === 'saida') {
    return 'Saída';
  }
  return '-';
}

// ---------- Renderização ----------
// rotulo (opcional): nome da coluna, usado para exibir a tabela em formato de cartão em telas pequenas.
function criarCelula(texto, rotulo) {
  const celula = document.createElement('td');
  celula.textContent = texto;
  if (rotulo) {
    celula.setAttribute('data-label', rotulo);
  }
  return celula;
}

function renderizarCartoes() {
  const resumo = calcularResumoEstoque();

  document.getElementById('valor-produtos').textContent = formatarNumero(resumo.totalProdutos);
  document.getElementById('valor-itens').textContent = formatarNumero(resumo.totalItens);
  document.getElementById('valor-baixo').textContent = formatarNumero(resumo.estoqueBaixo);
  document.getElementById('valor-zerado').textContent = formatarNumero(resumo.semEstoque);
}

// Exibe os produtos sem estoque e com estoque baixo.
function renderizarAlertas(perfil, aoAbrirModulo) {
  const bloco = document.getElementById('alertas-estoque');
  const resumo = document.getElementById('alertas-resumo');
  const lista = document.getElementById('alertas-lista');

  const contagem = contarAlertasEstoque();
  const emAlerta = listarProdutosEmAlerta();
  const podeConsultar = temPermissao(perfil, PERMISSOES.CONSULTAR_PRODUTOS);

  lista.textContent = '';
  bloco.classList.remove('com-alerta', 'com-critico');

  if (contagem.total === 0) {
    resumo.textContent = 'Nenhum produto com estoque baixo ou sem estoque no momento.';
    return;
  }

  bloco.classList.add(contagem.semEstoque > 0 ? 'com-critico' : 'com-alerta');
  resumo.textContent = formatarNumero(contagem.semEstoque) + ' produto(s) sem estoque e ' +
    formatarNumero(contagem.baixo) + ' com estoque baixo.';

  emAlerta.slice(0, LIMITE_ALERTAS_DASHBOARD).forEach(function (produto) {
    const item = document.createElement('li');
    item.className = 'item-alerta';

    item.appendChild(criarSeloSituacao(produto));

    const texto = document.createElement('span');
    texto.className = 'item-alerta-texto';
    texto.textContent = produto.nome + (produto.codigo ? ' (código ' + produto.codigo + ')' : '') +
      ' - quantidade: ' + formatarNumero(Number(produto.quantidade) || 0) +
      ', mínimo: ' + formatarNumero(Number(produto.estoqueMinimo) || 0);
    item.appendChild(texto);

    if (podeConsultar) {
      item.appendChild(criarBotaoAcao('Ver produto', false, function () {
        aoAbrirModulo(PERMISSOES.CONSULTAR_PRODUTOS);
        abrirDetalheProduto(produto.id);
      }));
    }

    lista.appendChild(item);
  });

  if (emAlerta.length > LIMITE_ALERTAS_DASHBOARD) {
    const aviso = document.createElement('li');
    aviso.className = 'item-alerta-extra';
    aviso.textContent = 'E mais ' + formatarNumero(emAlerta.length - LIMITE_ALERTAS_DASHBOARD) +
      ' produto(s) em alerta. Consulte a lista de produtos e use o filtro de situação do estoque.';
    lista.appendChild(aviso);
  }
}

function renderizarMovimentacoes() {
  const periodo = resumirMovimentacoesPeriodo(DIAS_RESUMO_MOVIMENTACOES);
  const recentes = obterMovimentacoesRecentes(LIMITE_MOVIMENTACOES_RECENTES);

  document.getElementById('movimentacoes-resumo').textContent =
    'Últimos ' + DIAS_RESUMO_MOVIMENTACOES + ' dias: ' +
    formatarNumero(periodo.entradas) + ' entrada(s) (' + formatarNumero(periodo.unidadesEntrada) + ' unidades) e ' +
    formatarNumero(periodo.saidas) + ' saída(s) (' + formatarNumero(periodo.unidadesSaida) + ' unidades).';

  const corpoTabela = document.getElementById('tabela-movimentacoes');
  const aviso = document.getElementById('movimentacoes-vazio');
  const tabela = document.getElementById('tabela-movimentacoes-wrapper');

  corpoTabela.textContent = '';

  if (recentes.length === 0) {
    aviso.hidden = false;
    tabela.hidden = true;
    return;
  }

  aviso.hidden = true;
  tabela.hidden = false;

  recentes.forEach(function (mov) {
    const linha = document.createElement('tr');
    linha.appendChild(criarCelula(formatarDataHora(mov.data), 'Data'));
    linha.appendChild(criarCelula(rotuloTipoMovimentacao(mov.tipo), 'Tipo'));
    linha.appendChild(criarCelula(mov.produtoNome || '-', 'Produto'));
    linha.appendChild(criarCelula(formatarNumero(Number(mov.quantidade) || 0), 'Quantidade'));
    corpoTabela.appendChild(linha);
  });
}

// Cria os atalhos somente para as áreas permitidas ao perfil.
function renderizarAcessoRapido(perfil, aoAbrirModulo) {
  const container = document.getElementById('acesso-rapido');
  container.textContent = '';

  listarPermissoesDoPerfil(perfil).forEach(function (info) {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'atalho';
    botao.textContent = info.rotulo;
    botao.addEventListener('click', function () {
      aoAbrirModulo(info.permissao);
    });
    container.appendChild(botao);
  });
}

// Atualiza todo o Dashboard com os dados atuais da aplicação.
function renderizarDashboard(perfil, aoAbrirModulo) {
  renderizarCartoes();
  renderizarAlertas(perfil, aoAbrirModulo);
  renderizarMovimentacoes();
  renderizarAcessoRapido(perfil, aoAbrirModulo);
}
