// ---------- Campos do formulário de cadastro de produto ----------
const CAMPOS_PRODUTO = [
  { chave: 'codigo',        campo: 'campo-codigo',       erro: 'erro-codigo' },
  { chave: 'nome',          campo: 'campo-nome',         erro: 'erro-nome' },
  { chave: 'descricao',     campo: 'campo-descricao',    erro: 'erro-descricao' },
  { chave: 'categoria',     campo: 'campo-categoria',    erro: 'erro-categoria' },
  { chave: 'quantidade',    campo: 'campo-quantidade',   erro: 'erro-quantidade' },
  { chave: 'estoqueMinimo', campo: 'campo-minimo',       erro: 'erro-minimo' },
  { chave: 'localizacao',   campo: 'campo-localizacao',  erro: 'erro-localizacao' }
];

// ---------- Regras de negócio ----------
function buscarProdutoPorId(id) {
  return obterProdutos().find(function (produto) {
    return produto.id === id;
  }) || null;
}

// ignorarId (opcional): id de um produto que deve ser desconsiderado na busca (usado na edição).
function existeProdutoComCodigo(codigo, ignorarId) {
  const procurado = codigo.trim().toLowerCase();
  return obterProdutos().some(function (produto) {
    if (ignorarId !== undefined && produto.id === ignorarId) {
      return false;
    }
    return String(produto.codigo).trim().toLowerCase() === procurado;
  });
}

// Converte um texto em inteiro maior ou igual a zero. Retorna null se for inválido.
function lerInteiroNaoNegativo(texto) {
  const valor = texto.trim();
  if (!/^\d+$/.test(valor)) {
    return null;
  }
  const numero = parseInt(valor, 10);
  return Number.isSafeInteger(numero) ? numero : null;
}

// Valida os dados informados (todos em formato de texto). Retorna um objeto com os erros por campo.
// ignorarId (opcional): id do produto que está sendo editado.
function validarProduto(dados, ignorarId) {
  const erros = {};

  if (dados.codigo.trim() === '') {
    erros.codigo = 'Informe o código do produto.';
  } else if (existeProdutoComCodigo(dados.codigo, ignorarId)) {
    erros.codigo = 'Já existe um produto cadastrado com este código.';
  }

  if (dados.nome.trim() === '') {
    erros.nome = 'Informe o nome do produto.';
  }

  if (dados.categoria.trim() === '') {
    erros.categoria = 'Informe a categoria do produto.';
  }

  if (dados.quantidade.trim() === '') {
    erros.quantidade = 'Informe a quantidade.';
  } else if (lerInteiroNaoNegativo(dados.quantidade) === null) {
    erros.quantidade = 'A quantidade deve ser um número inteiro maior ou igual a zero.';
  }

  if (dados.estoqueMinimo.trim() === '') {
    erros.estoqueMinimo = 'Informe o estoque mínimo.';
  } else if (lerInteiroNaoNegativo(dados.estoqueMinimo) === null) {
    erros.estoqueMinimo = 'O estoque mínimo deve ser um número inteiro maior ou igual a zero.';
  }

  if (dados.localizacao.trim() === '') {
    erros.localizacao = 'Informe a localização no almoxarifado.';
  }

  return erros;
}

// Converte os dados (texto) já validados nos valores que serão gravados no produto.
function converterDadosProduto(dados) {
  return {
    codigo: dados.codigo.trim(),
    nome: dados.nome.trim(),
    descricao: dados.descricao.trim(),
    categoria: dados.categoria.trim(),
    quantidade: lerInteiroNaoNegativo(dados.quantidade),
    estoqueMinimo: lerInteiroNaoNegativo(dados.estoqueMinimo),
    localizacao: dados.localizacao.trim()
  };
}

// Cadastra o produto se o perfil tiver permissão e os dados forem válidos.
function cadastrarProduto(perfil, dados) {
  if (!temPermissao(perfil, PERMISSOES.CADASTRAR_PRODUTOS)) {
    return {
      sucesso: false,
      erros: {},
      erroGeral: 'O seu perfil não possui permissão para cadastrar produtos.'
    };
  }

  const erros = validarProduto(dados);
  if (Object.keys(erros).length > 0) {
    return { sucesso: false, erros: erros };
  }

  const produto = converterDadosProduto(dados);
  produto.id = gerarIdProduto();

  obterProdutos().push(produto);
  const gravado = salvarDados();

  return { sucesso: true, produto: produto, gravado: gravado };
}

// Atualiza um produto existente se o perfil tiver permissão e os dados forem válidos.
function atualizarProduto(perfil, id, dados) {
  if (!temPermissao(perfil, PERMISSOES.EDITAR_PRODUTOS)) {
    return {
      sucesso: false,
      erros: {},
      erroGeral: 'O seu perfil não possui permissão para editar produtos.'
    };
  }

  const produto = buscarProdutoPorId(id);
  if (!produto) {
    return { sucesso: false, erros: {}, erroGeral: 'Produto não encontrado.' };
  }

  const erros = validarProduto(dados, id);
  if (Object.keys(erros).length > 0) {
    return { sucesso: false, erros: erros };
  }

  Object.assign(produto, converterDadosProduto(dados));

  // Mantém nome e código do produto atualizados nas movimentações já registradas (histórico)
  obterMovimentacoes().forEach(function (movimentacao) {
    if (movimentacao.produtoId === produto.id) {
      movimentacao.produtoNome = produto.nome;
      movimentacao.produtoCodigo = produto.codigo;
    }
  });

  const gravado = salvarDados();

  return { sucesso: true, produto: produto, gravado: gravado };
}

// Exclui um produto se o perfil tiver permissão. As movimentações dele são mantidas no histórico.
function excluirProduto(perfil, id) {
  if (!temPermissao(perfil, PERMISSOES.EXCLUIR_PRODUTOS)) {
    return {
      sucesso: false,
      erroGeral: 'O seu perfil não possui permissão para excluir produtos.'
    };
  }

  const indice = obterProdutos().findIndex(function (produto) {
    return produto.id === id;
  });

  if (indice === -1) {
    return { sucesso: false, erroGeral: 'Produto não encontrado.' };
  }

  const removido = obterProdutos().splice(indice, 1)[0];
  const gravado = salvarDados();

  return { sucesso: true, produto: removido, gravado: gravado };
}

// ---------- Interface dos formulários de produto ----------
// Os parâmetros "campos" são opcionais; por padrão usam os campos do cadastro.
function lerFormularioProduto(campos) {
  campos = campos || CAMPOS_PRODUTO;
  const dados = {};
  campos.forEach(function (item) {
    dados[item.chave] = document.getElementById(item.campo).value;
  });
  return dados;
}

function limparErrosProduto(campos) {
  campos = campos || CAMPOS_PRODUTO;
  campos.forEach(function (item) {
    const campo = document.getElementById(item.campo);
    campo.classList.remove('invalido');
    campo.removeAttribute('aria-invalid');
    document.getElementById(item.erro).textContent = '';
  });
}

function mostrarErrosProduto(erros, campos) {
  campos = campos || CAMPOS_PRODUTO;
  let primeiroInvalido = null;

  campos.forEach(function (item) {
    if (!erros[item.chave]) {
      return;
    }

    const campo = document.getElementById(item.campo);
    campo.classList.add('invalido');
    campo.setAttribute('aria-invalid', 'true');
    document.getElementById(item.erro).textContent = erros[item.chave];

    if (!primeiroInvalido) {
      primeiroInvalido = campo;
    }
  });

  if (primeiroInvalido) {
    primeiroInvalido.focus();
  }
}

function mostrarMensagemProduto(texto, tipo) {
  const mensagem = document.getElementById('produto-mensagem');
  mensagem.textContent = texto;
  mensagem.className = 'mensagem-formulario campo-largo mensagem-' + tipo;
  mensagem.hidden = false;
}

function limparMensagemProduto() {
  const mensagem = document.getElementById('produto-mensagem');
  mensagem.textContent = '';
  mensagem.hidden = true;
  limparAlertaEstoque('produto-alerta');
}

// Sugere as categorias já cadastradas ao digitar (usado no cadastro e na edição).
function atualizarCategorias() {
  const lista = document.getElementById('lista-categorias');
  lista.textContent = '';

  const categorias = [];
  obterProdutos().forEach(function (produto) {
    if (produto.categoria && categorias.indexOf(produto.categoria) === -1) {
      categorias.push(produto.categoria);
    }
  });

  categorias.sort().forEach(function (categoria) {
    const opcao = document.createElement('option');
    opcao.value = categoria;
    lista.appendChild(opcao);
  });
}

// Deixa o formulário de cadastro limpo e pronto para um novo cadastro.
function prepararFormularioCadastro() {
  document.getElementById('form-produto').reset();
  limparErrosProduto();
  limparMensagemProduto();
  atualizarCategorias();
  document.getElementById('campo-codigo').focus();
}

// Liga os eventos do formulário de cadastro. obterPerfil deve retornar o perfil autenticado.
function configurarFormularioProduto(obterPerfil) {
  const formulario = document.getElementById('form-produto');

  formulario.addEventListener('submit', function (evento) {
    evento.preventDefault();
    limparErrosProduto();
    limparMensagemProduto();

    const resultado = cadastrarProduto(obterPerfil(), lerFormularioProduto());

    if (!resultado.sucesso) {
      if (resultado.erroGeral) {
        mostrarMensagemProduto(resultado.erroGeral, 'erro');
      } else {
        mostrarMensagemProduto('Corrija os campos indicados e tente novamente.', 'erro');
        mostrarErrosProduto(resultado.erros);
      }
      return;
    }

    const produto = resultado.produto;
    formulario.reset();
    atualizarCategorias();

    let texto = 'Produto "' + produto.nome + '" (código ' + produto.codigo + ') cadastrado com sucesso.';
    if (!resultado.gravado) {
      texto += ' Atenção: o navegador não permitiu gravar os dados; eles serão perdidos ao recarregar a página.';
    }
    mostrarMensagemProduto(texto, 'sucesso');
    mostrarAlertaEstoque('produto-alerta', produto);
    document.getElementById('campo-codigo').focus();
  });

  document.getElementById('botao-limpar-produto').addEventListener('click', function () {
    prepararFormularioCadastro();
  });
}