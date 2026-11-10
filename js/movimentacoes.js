// ---------- Tipos de movimentação ----------
const TIPOS_MOVIMENTACAO = {
  entrada: {
    titulo: 'Registrar entrada de estoque',
    botao: 'Registrar entrada',
    rotulo: 'Entrada',
    plural: 'entradas de estoque',
    permissao: PERMISSOES.REGISTRAR_ENTRADAS
  },
  saida: {
    titulo: 'Registrar saída de estoque',
    botao: 'Registrar saída',
    rotulo: 'Saída',
    plural: 'saídas de estoque',
    permissao: PERMISSOES.REGISTRAR_SAIDAS
  }
};

// Campos do formulário de movimentação (mesmo formato usado nos formulários de produto)
const CAMPOS_MOVIMENTACAO = [
  { chave: 'produto',    campo: 'mov-produto',    erro: 'erro-mov-produto' },
  { chave: 'quantidade', campo: 'mov-quantidade', erro: 'erro-mov-quantidade' }
];

// ---------- Regras de negócio ----------
// Registra uma entrada ou saída e atualiza a quantidade do produto.
// sessao: usuário autenticado ({ usuario, nome, perfil }), registrado como responsável pela operação.
// produtoId: número ou null; quantidadeTexto: texto digitado pelo usuário.
function registrarMovimentacao(sessao, tipo, produtoId, quantidadeTexto) {
  const config = TIPOS_MOVIMENTACAO[tipo];

  if (!config) {
    return { sucesso: false, erros: {}, erroGeral: 'Tipo de movimentação inválido.' };
  }

  const perfil = sessao ? sessao.perfil : null;

  if (!temPermissao(perfil, config.permissao)) {
    return {
      sucesso: false,
      erros: {},
      erroGeral: 'O seu perfil não possui permissão para registrar ' + config.plural + '.'
    };
  }

  const erros = {};

  const produto = produtoId === null ? null : buscarProdutoPorId(produtoId);
  if (!produto) {
    erros.produto = 'Selecione o produto que será movimentado.';
  }

  const quantidade = lerInteiroNaoNegativo(quantidadeTexto);
  if (quantidadeTexto.trim() === '') {
    erros.quantidade = 'Informe a quantidade da movimentação.';
  } else if (quantidade === null || quantidade <= 0) {
    erros.quantidade = 'A quantidade deve ser um número inteiro maior que zero.';
  }

  if (Object.keys(erros).length > 0) {
    return { sucesso: false, erros: erros };
  }

  const disponivel = Math.max(Number(produto.quantidade) || 0, 0);

  // Impede saída superior à quantidade disponível
  if (tipo === 'saida' && quantidade > disponivel) {
    return {
      sucesso: false,
      saldoInsuficiente: true,
      erros: {
        quantidade: 'Quantidade indisponível em estoque. Disponível: ' + formatarNumero(disponivel) + '.'
      }
    };
  }

  const novaQuantidade = tipo === 'entrada' ? disponivel + quantidade : disponivel - quantidade;

  if (!Number.isSafeInteger(novaQuantidade)) {
    return {
      sucesso: false,
      erros: { quantidade: 'A quantidade resultante excede o limite permitido.' }
    };
  }

  produto.quantidade = novaQuantidade;

  const movimentacao = {
    id: gerarIdMovimentacao(),
    tipo: tipo,
    produtoId: produto.id,
    produtoNome: produto.nome,
    produtoCodigo: produto.codigo || '',
    quantidade: quantidade,
    data: new Date().toISOString(),
    usuario: sessao.usuario,
    usuarioNome: sessao.nome
  };

  obterMovimentacoes().push(movimentacao);
  const gravado = salvarDados();

  return { sucesso: true, movimentacao: movimentacao, produto: produto, gravado: gravado };
}

// ---------- Interface ----------
let tipoMovimentacaoAtual = 'entrada';

// Função que retorna a sessão do usuário autenticado (definida em configurarMovimentacao)
let obterSessaoMovimentacao = function () {
  return null;
};

function mostrarMensagemMovimentacao(texto, tipo) {
  const mensagem = document.getElementById('mov-mensagem');
  mensagem.textContent = texto;
  mensagem.className = 'mensagem-formulario mensagem-' + tipo;
  mensagem.hidden = false;
}

function limparMensagemMovimentacao() {
  const mensagem = document.getElementById('mov-mensagem');
  mensagem.textContent = '';
  mensagem.hidden = true;
  limparAlertaEstoque('mov-alerta');
}

// Preenche a lista de produtos, mantendo o produto indicado selecionado (se existir).
function preencherProdutosMovimentacao(produtoSelecionadoId) {
  const seletor = document.getElementById('mov-produto');
  seletor.textContent = '';

  const opcaoInicial = document.createElement('option');
  opcaoInicial.value = '';
  opcaoInicial.textContent = 'Selecione um produto';
  seletor.appendChild(opcaoInicial);

  obterProdutos().forEach(function (produto) {
    const opcao = document.createElement('option');
    opcao.value = String(produto.id);
    opcao.textContent = (produto.codigo ? produto.codigo + ' - ' : '') + produto.nome;
    seletor.appendChild(opcao);
  });

  if (produtoSelecionadoId !== null && produtoSelecionadoId !== undefined) {
    seletor.value = String(produtoSelecionadoId);
  }
}

// Mostra a quantidade disponível, o estoque mínimo e a situação do produto selecionado.
function atualizarDisponivelMovimentacao() {
  const valor = document.getElementById('mov-produto').value;
  const texto = document.getElementById('mov-disponivel');
  texto.className = 'disponivel-info';

  const produto = valor === '' ? null : buscarProdutoPorId(parseInt(valor, 10));
  if (!produto) {
    texto.textContent = 'Selecione um produto para ver a quantidade disponível.';
    return;
  }

  const situacao = situacaoEstoque(produto);
  let conteudo = 'Quantidade disponível em estoque: ' + formatarNumero(Number(produto.quantidade) || 0) +
    ' (estoque mínimo: ' + formatarNumero(Number(produto.estoqueMinimo) || 0) + ')';

  if (situacao !== 'normal') {
    conteudo += ' - ' + ROTULOS_SITUACAO[situacao];
    texto.classList.add(situacao === 'baixo' ? 'disponivel-baixo' : 'disponivel-zerado');
  }

  texto.textContent = conteudo;
}

function definirFormularioMovimentacaoAtivo(ativo) {
  document.getElementById('mov-produto').disabled = !ativo;
  document.getElementById('mov-quantidade').disabled = !ativo;
  document.getElementById('mov-botao').disabled = !ativo;
  document.getElementById('mov-limpar').disabled = !ativo;
}

// Deixa o formulário pronto para registrar uma entrada ou saída.
function prepararMovimentacao(tipo) {
  tipoMovimentacaoAtual = tipo;
  const config = TIPOS_MOVIMENTACAO[tipo];

  document.getElementById('mov-titulo').textContent = config.titulo;
  document.getElementById('mov-botao').textContent = config.botao;
  document.getElementById('form-movimentacao').reset();
  limparErrosProduto(CAMPOS_MOVIMENTACAO);
  limparMensagemMovimentacao();
  preencherProdutosMovimentacao(null);
  atualizarDisponivelMovimentacao();

  const apoio = document.getElementById('mov-apoio');

  if (obterProdutos().length === 0) {
    apoio.textContent = 'Nenhum produto cadastrado. Cadastre um produto antes de registrar movimentações.';
    definirFormularioMovimentacaoAtivo(false);
    return;
  }

  apoio.textContent = 'Selecione o produto e informe a quantidade. Os campos marcados com * são obrigatórios.';
  definirFormularioMovimentacaoAtivo(true);
  document.getElementById('mov-produto').focus();
}

function enviarMovimentacao() {
  limparErrosProduto(CAMPOS_MOVIMENTACAO);
  limparMensagemMovimentacao();

  const valorProduto = document.getElementById('mov-produto').value;
  const produtoId = valorProduto === '' ? null : parseInt(valorProduto, 10);
  const quantidadeTexto = document.getElementById('mov-quantidade').value;
  const config = TIPOS_MOVIMENTACAO[tipoMovimentacaoAtual];

  const resultado = registrarMovimentacao(
    obterSessaoMovimentacao(),
    tipoMovimentacaoAtual,
    produtoId,
    quantidadeTexto
  );

  if (!resultado.sucesso) {
    if (resultado.erroGeral) {
      mostrarMensagemMovimentacao(resultado.erroGeral, 'erro');
    } else if (resultado.saldoInsuficiente) {
      mostrarMensagemMovimentacao(
        'Saída não realizada: a quantidade informada é superior à quantidade disponível em estoque.',
        'erro'
      );
      mostrarErrosProduto(resultado.erros, CAMPOS_MOVIMENTACAO);
    } else {
      mostrarMensagemMovimentacao('Corrija os campos indicados e tente novamente.', 'erro');
      mostrarErrosProduto(resultado.erros, CAMPOS_MOVIMENTACAO);
    }
    return;
  }

  const produto = resultado.produto;
  const movimentacao = resultado.movimentacao;

  // Atualiza a lista e a quantidade exibida, mantendo o produto selecionado
  preencherProdutosMovimentacao(produto.id);
  document.getElementById('mov-quantidade').value = '';
  atualizarDisponivelMovimentacao();

  let texto = config.rotulo + ' registrada com sucesso: ' + formatarNumero(movimentacao.quantidade) +
    ' unidade(s) de "' + produto.nome + '". Quantidade em estoque agora: ' +
    formatarNumero(produto.quantidade) + '.';

  if (!resultado.gravado) {
    texto += ' Atenção: o navegador não permitiu gravar os dados; eles serão perdidos ao recarregar a página.';
  }

  mostrarMensagemMovimentacao(texto, 'sucesso');
  mostrarAlertaEstoque('mov-alerta', produto);
  document.getElementById('mov-quantidade').focus();
}

// Liga os eventos do formulário. obterSessao deve retornar a sessão do usuário autenticado.
function configurarMovimentacao(obterSessao) {
  obterSessaoMovimentacao = obterSessao;

  document.getElementById('form-movimentacao').addEventListener('submit', function (evento) {
    evento.preventDefault();
    enviarMovimentacao();
  });

  document.getElementById('mov-produto').addEventListener('change', function () {
    atualizarDisponivelMovimentacao();
  });

  document.getElementById('mov-limpar').addEventListener('click', function () {
    prepararMovimentacao(tipoMovimentacaoAtual);
  });
}