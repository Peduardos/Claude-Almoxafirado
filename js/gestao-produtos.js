// ---------- Gerenciamento de produtos cadastrados ----------
// A situação do estoque (situacaoEstoque e ROTULOS_SITUACAO) é definida em js/estoque.js.
//
// A mesma área é usada em dois modos:
// - 'produtos': consulta de produtos, com as ações de editar e excluir conforme a permissão;
// - 'estoque': consulta de estoque, somente leitura, com os produtos mais críticos primeiro.

// Campos do formulário de edição
const CAMPOS_EDICAO = [
  { chave: 'codigo',        campo: 'edicao-codigo',      erro: 'erro-edicao-codigo' },
  { chave: 'nome',          campo: 'edicao-nome',        erro: 'erro-edicao-nome' },
  { chave: 'descricao',     campo: 'edicao-descricao',   erro: 'erro-edicao-descricao' },
  { chave: 'categoria',     campo: 'edicao-categoria',   erro: 'erro-edicao-categoria' },
  { chave: 'quantidade',    campo: 'edicao-quantidade',  erro: 'erro-edicao-quantidade' },
  { chave: 'estoqueMinimo', campo: 'edicao-minimo',      erro: 'erro-edicao-minimo' },
  { chave: 'localizacao',   campo: 'edicao-localizacao', erro: 'erro-edicao-localizacao' }
];

// Função que retorna o perfil autenticado (definida em configurarGestaoProdutos)
let obterPerfilGestao = function () {
  return null;
};

let modoGestaoProdutos = 'produtos';
let produtoSelecionadoId = null;
let produtoParaExcluirId = null;
let elementoFocoAntesDoDialogo = null;

function obterElemento(id) {
  return document.getElementById(id);
}

// ---------- Permissões ----------
function podeEditarProdutos() {
  return temPermissao(obterPerfilGestao(), PERMISSOES.EDITAR_PRODUTOS);
}

function podeExcluirProdutos() {
  return temPermissao(obterPerfilGestao(), PERMISSOES.EXCLUIR_PRODUTOS);
}

// As ações de alterar dados só são exibidas no modo de consulta de produtos.
function exibirAcoesDeAlteracao() {
  return modoGestaoProdutos === 'produtos';
}

// ---------- Mensagens e visões ----------
function mostrarMensagemGestao(texto, tipo) {
  const mensagem = obterElemento('produtos-mensagem');
  mensagem.textContent = texto;
  mensagem.className = 'mensagem-formulario mensagem-' + tipo;
  mensagem.hidden = false;
}

function limparMensagemGestao() {
  const mensagem = obterElemento('produtos-mensagem');
  mensagem.textContent = '';
  mensagem.hidden = true;
  limparAlertaEstoque('produtos-alerta');
}

// Exibe somente uma das visões: 'lista', 'detalhe' ou 'edicao'.
function mostrarVisaoProdutos(nome) {
  obterElemento('visao-lista').hidden = nome !== 'lista';
  obterElemento('visao-detalhe').hidden = nome !== 'detalhe';
  obterElemento('visao-edicao').hidden = nome !== 'edicao';
}

function descreverProduto(produto) {
  let texto = '"' + produto.nome + '"';
  if (produto.codigo) {
    texto += ' (código ' + produto.codigo + ')';
  }
  return texto;
}

function textoAvisoGravacao(gravado) {
  return gravado ? '' : ' Atenção: o navegador não permitiu gravar os dados; eles serão perdidos ao recarregar a página.';
}

// ---------- Elementos reutilizáveis ----------
function criarSeloSituacao(produto) {
  const situacao = situacaoEstoque(produto);
  const selo = document.createElement('span');
  selo.className = 'selo-situacao situacao-' + situacao;
  selo.textContent = ROTULOS_SITUACAO[situacao];
  return selo;
}

function criarBotaoAcao(texto, perigo, aoClicar) {
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'botao-tabela' + (perigo ? ' perigo' : '');
  botao.textContent = texto;
  botao.addEventListener('click', aoClicar);
  return botao;
}

// ---------- Lista ----------
// Exibe a lista de acordo com a pesquisa, os filtros e a ordenação atuais.
function renderizarListaProdutos() {
  const totalGeral = obterProdutos().length;
  const corpo = obterElemento('produtos-corpo');

  atualizarOpcoesCategoria();
  const produtos = obterProdutosFiltrados();

  corpo.textContent = '';

  obterElemento('produtos-vazio').hidden = totalGeral > 0;
  obterElemento('filtros-produtos').hidden = totalGeral === 0;
  obterElemento('produtos-resumo').hidden = totalGeral === 0;
  obterElemento('produtos-sem-resultado').hidden = !(totalGeral > 0 && produtos.length === 0);
  obterElemento('produtos-tabela-wrapper').hidden = produtos.length === 0;

  let resumo = 'Exibindo ' + formatarNumero(produtos.length) + ' de ' + formatarNumero(totalGeral) + ' produto(s).';
  if (existemFiltrosAtivos()) {
    resumo += ' Filtros aplicados.';
  }
  obterElemento('produtos-resumo').textContent = resumo;

  produtos.forEach(function (produto) {
    const linha = document.createElement('tr');

    // Destaca as linhas de produtos em alerta de estoque
    const situacao = situacaoEstoque(produto);
    if (situacao === 'baixo') {
      linha.className = 'linha-alerta-baixo';
    } else if (situacao === 'sem-estoque') {
      linha.className = 'linha-alerta-zerado';
    }

    linha.appendChild(criarCelula(produto.codigo || '-', 'Código'));
    linha.appendChild(criarCelula(produto.nome || '-', 'Nome'));
    linha.appendChild(criarCelula(produto.categoria || '-', 'Categoria'));
    linha.appendChild(criarCelula(formatarNumero(Number(produto.quantidade) || 0), 'Quantidade'));
    linha.appendChild(criarCelula(formatarNumero(Number(produto.estoqueMinimo) || 0), 'Estoque mínimo'));
    linha.appendChild(criarCelula(produto.localizacao || '-', 'Localização'));

    const celulaSituacao = document.createElement('td');
    celulaSituacao.setAttribute('data-label', 'Situação');
    celulaSituacao.appendChild(criarSeloSituacao(produto));
    linha.appendChild(celulaSituacao);

    const celulaAcoes = document.createElement('td');
    celulaAcoes.setAttribute('data-label', 'Ações');
    const acoes = document.createElement('div');
    acoes.className = 'acoes-tabela';

    acoes.appendChild(criarBotaoAcao('Ver', false, function () {
      abrirDetalheProduto(produto.id);
    }));

    if (exibirAcoesDeAlteracao() && podeEditarProdutos()) {
      acoes.appendChild(criarBotaoAcao('Editar', false, function () {
        abrirEdicaoProduto(produto.id);
      }));
    }

    if (exibirAcoesDeAlteracao() && podeExcluirProdutos()) {
      acoes.appendChild(criarBotaoAcao('Excluir', true, function () {
        abrirConfirmacaoExclusao(produto.id);
      }));
    }

    celulaAcoes.appendChild(acoes);
    linha.appendChild(celulaAcoes);
    corpo.appendChild(linha);
  });
}

// ---------- Detalhes ----------
function adicionarDetalhe(lista, rotulo, valor) {
  const termo = document.createElement('dt');
  termo.textContent = rotulo;

  const descricao = document.createElement('dd');
  if (typeof valor === 'string') {
    descricao.textContent = valor;
  } else {
    descricao.appendChild(valor);
  }

  lista.appendChild(termo);
  lista.appendChild(descricao);
}

function renderizarDetalheProduto(produto) {
  obterElemento('detalhe-titulo').textContent = produto.nome || 'Produto';
  mostrarAlertaEstoque('detalhe-alerta', produto);

  const lista = obterElemento('detalhe-lista');
  lista.textContent = '';

  adicionarDetalhe(lista, 'Código', produto.codigo || '-');
  adicionarDetalhe(lista, 'Nome', produto.nome || '-');
  adicionarDetalhe(lista, 'Descrição', produto.descricao ? produto.descricao : 'Sem descrição');
  adicionarDetalhe(lista, 'Categoria', produto.categoria || '-');
  adicionarDetalhe(lista, 'Quantidade em estoque', formatarNumero(Number(produto.quantidade) || 0));
  adicionarDetalhe(lista, 'Estoque mínimo', formatarNumero(Number(produto.estoqueMinimo) || 0));
  adicionarDetalhe(lista, 'Localização', produto.localizacao || '-');
  adicionarDetalhe(lista, 'Situação do estoque', criarSeloSituacao(produto));

  obterElemento('detalhe-editar').hidden = !(exibirAcoesDeAlteracao() && podeEditarProdutos());
  obterElemento('detalhe-excluir').hidden = !(exibirAcoesDeAlteracao() && podeExcluirProdutos());
}

function abrirDetalheProduto(id) {
  const produto = buscarProdutoPorId(id);

  if (!produto) {
    mostrarMensagemGestao('Produto não encontrado.', 'erro');
    renderizarListaProdutos();
    mostrarVisaoProdutos('lista');
    return;
  }

  limparMensagemGestao();
  produtoSelecionadoId = id;
  renderizarDetalheProduto(produto);
  mostrarVisaoProdutos('detalhe');
}

// ---------- Edição ----------
function abrirEdicaoProduto(id) {
  if (!podeEditarProdutos()) {
    mostrarMensagemGestao('O seu perfil não possui permissão para editar produtos.', 'erro');
    return;
  }

  const produto = buscarProdutoPorId(id);
  if (!produto) {
    mostrarMensagemGestao('Produto não encontrado.', 'erro');
    renderizarListaProdutos();
    mostrarVisaoProdutos('lista');
    return;
  }

  limparMensagemGestao();
  limparErrosProduto(CAMPOS_EDICAO);
  atualizarCategorias();
  produtoSelecionadoId = id;

  obterElemento('edicao-codigo').value = produto.codigo || '';
  obterElemento('edicao-nome').value = produto.nome || '';
  obterElemento('edicao-descricao').value = produto.descricao || '';
  obterElemento('edicao-categoria').value = produto.categoria || '';
  obterElemento('edicao-quantidade').value = Number(produto.quantidade) || 0;
  obterElemento('edicao-minimo').value = Number(produto.estoqueMinimo) || 0;
  obterElemento('edicao-localizacao').value = produto.localizacao || '';

  mostrarVisaoProdutos('edicao');
  obterElemento('edicao-codigo').focus();
}

function salvarEdicaoProduto() {
  limparErrosProduto(CAMPOS_EDICAO);
  limparMensagemGestao();

  const resultado = atualizarProduto(
    obterPerfilGestao(),
    produtoSelecionadoId,
    lerFormularioProduto(CAMPOS_EDICAO)
  );

  if (!resultado.sucesso) {
    if (resultado.erroGeral) {
      mostrarMensagemGestao(resultado.erroGeral, 'erro');
      renderizarListaProdutos();
      mostrarVisaoProdutos('lista');
    } else {
      mostrarMensagemGestao('Corrija os campos indicados e tente novamente.', 'erro');
      mostrarErrosProduto(resultado.erros, CAMPOS_EDICAO);
    }
    return;
  }

  renderizarListaProdutos();
  mostrarVisaoProdutos('lista');
  mostrarMensagemGestao(
    'Produto ' + descreverProduto(resultado.produto) + ' atualizado com sucesso.' + textoAvisoGravacao(resultado.gravado),
    'sucesso'
  );
  mostrarAlertaEstoque('produtos-alerta', resultado.produto);
}

// ---------- Exclusão ----------
function abrirConfirmacaoExclusao(id) {
  if (!podeExcluirProdutos()) {
    mostrarMensagemGestao('O seu perfil não possui permissão para excluir produtos.', 'erro');
    return;
  }

  const produto = buscarProdutoPorId(id);
  if (!produto) {
    mostrarMensagemGestao('Produto não encontrado.', 'erro');
    renderizarListaProdutos();
    mostrarVisaoProdutos('lista');
    return;
  }

  produtoParaExcluirId = id;
  elementoFocoAntesDoDialogo = document.activeElement;

  obterElemento('confirmacao-texto').textContent =
    'Deseja realmente excluir o produto ' + descreverProduto(produto) + '? Esta ação não poderá ser desfeita.';
  obterElemento('confirmacao-exclusao').hidden = false;
  obterElemento('botao-cancelar-exclusao').focus();
}

// Fecha a janela de confirmação e devolve o foco ao elemento que a abriu.
function fecharConfirmacaoExclusao() {
  const estavaAberta = !obterElemento('confirmacao-exclusao').hidden;

  produtoParaExcluirId = null;
  obterElemento('confirmacao-exclusao').hidden = true;

  if (estavaAberta && elementoFocoAntesDoDialogo && document.body.contains(elementoFocoAntesDoDialogo)) {
    elementoFocoAntesDoDialogo.focus();
  }

  elementoFocoAntesDoDialogo = null;
}

function confirmarExclusaoProduto() {
  const id = produtoParaExcluirId;
  fecharConfirmacaoExclusao();
  limparMensagemGestao();

  const resultado = excluirProduto(obterPerfilGestao(), id);

  produtoSelecionadoId = null;
  renderizarListaProdutos();
  mostrarVisaoProdutos('lista');

  if (!resultado.sucesso) {
    mostrarMensagemGestao(resultado.erroGeral, 'erro');
    return;
  }

  mostrarMensagemGestao(
    'Produto ' + descreverProduto(resultado.produto) + ' excluído com sucesso.' + textoAvisoGravacao(resultado.gravado),
    'sucesso'
  );
}

// ---------- Abertura da área ----------
// Deixa a área de produtos na visão de lista, com os dados atuais e sem filtros aplicados.
// modo: 'produtos' (padrão) ou 'estoque' (consulta de estoque, somente leitura).
function prepararGestaoProdutos(modo) {
  modoGestaoProdutos = modo === 'estoque' ? 'estoque' : 'produtos';

  limparMensagemGestao();
  fecharConfirmacaoExclusao();
  produtoSelecionadoId = null;

  const apoio = obterElemento('produtos-apoio');

  if (modoGestaoProdutos === 'estoque') {
    obterElemento('produtos-titulo').textContent = 'Consulta de estoque';
    apoio.textContent = 'Acompanhe a quantidade disponível, o estoque mínimo e a situação de cada produto. Os produtos mais críticos aparecem primeiro.';
  } else {
    obterElemento('produtos-titulo').textContent = 'Produtos cadastrados';
    if (podeEditarProdutos() || podeExcluirProdutos()) {
      apoio.textContent = 'Use as ações de cada produto para visualizar, editar ou excluir.';
    } else {
      apoio.textContent = 'Use a ação "Ver" para visualizar as informações de um produto.';
    }
  }

  limparFiltrosProdutos();

  if (modoGestaoProdutos === 'estoque') {
    obterElemento('filtro-ordenacao').value = 'situacao';
  }

  renderizarListaProdutos();
  mostrarVisaoProdutos('lista');
}

// Liga os eventos da área de produtos. obterPerfil deve retornar o perfil autenticado.
function configurarGestaoProdutos(obterPerfil) {
  obterPerfilGestao = obterPerfil;

  obterElemento('detalhe-voltar').addEventListener('click', function () {
    renderizarListaProdutos();
    mostrarVisaoProdutos('lista');
  });

  obterElemento('detalhe-editar').addEventListener('click', function () {
    abrirEdicaoProduto(produtoSelecionadoId);
  });

  obterElemento('detalhe-excluir').addEventListener('click', function () {
    abrirConfirmacaoExclusao(produtoSelecionadoId);
  });

  obterElemento('form-edicao-produto').addEventListener('submit', function (evento) {
    evento.preventDefault();
    salvarEdicaoProduto();
  });

  obterElemento('botao-cancelar-edicao').addEventListener('click', function () {
    limparMensagemGestao();
    renderizarListaProdutos();
    mostrarVisaoProdutos('lista');
  });

  obterElemento('botao-confirmar-exclusao').addEventListener('click', confirmarExclusaoProduto);
  obterElemento('botao-cancelar-exclusao').addEventListener('click', fecharConfirmacaoExclusao);

  // Clicar fora da caixa de confirmação cancela a exclusão
  obterElemento('confirmacao-exclusao').addEventListener('click', function (evento) {
    if (evento.target === obterElemento('confirmacao-exclusao')) {
      fecharConfirmacaoExclusao();
    }
  });

  // Esc cancela e Tab fica restrito aos botões da janela de confirmação
  document.addEventListener('keydown', function (evento) {
    if (obterElemento('confirmacao-exclusao').hidden) {
      return;
    }

    if (evento.key === 'Escape') {
      fecharConfirmacaoExclusao();
      return;
    }

    if (evento.key === 'Tab') {
      const botoes = [
        obterElemento('botao-confirmar-exclusao'),
        obterElemento('botao-cancelar-exclusao')
      ];
      const indice = botoes.indexOf(document.activeElement);

      if (evento.shiftKey && indice <= 0) {
        evento.preventDefault();
        botoes[botoes.length - 1].focus();
      } else if (!evento.shiftKey && (indice === -1 || indice === botoes.length - 1)) {
        evento.preventDefault();
        botoes[0].focus();
      }
    }
  });
}