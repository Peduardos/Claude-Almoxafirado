// ---------- Pesquisa, filtros e ordenação de produtos ----------
const ORDENACOES_PRODUTOS = [
  { valor: 'cadastro',        rotulo: 'Ordem de cadastro' },
  { valor: 'nome-asc',        rotulo: 'Nome (A-Z)' },
  { valor: 'nome-desc',       rotulo: 'Nome (Z-A)' },
  { valor: 'codigo-asc',      rotulo: 'Código (A-Z)' },
  { valor: 'codigo-desc',     rotulo: 'Código (Z-A)' },
  { valor: 'categoria-asc',   rotulo: 'Categoria (A-Z)' },
  { valor: 'quantidade-asc',  rotulo: 'Quantidade (menor para maior)' },
  { valor: 'quantidade-desc', rotulo: 'Quantidade (maior para menor)' },
  { valor: 'situacao',        rotulo: 'Situação (mais crítica primeiro)' }
];

// Situações disponíveis no filtro (os rótulos vêm de ROTULOS_SITUACAO)
const SITUACOES_FILTRO = ['normal', 'baixo', 'sem-estoque'];

// Peso de cada situação para a ordenação (menor = mais crítica)
const ORDEM_SITUACAO = { 'sem-estoque': 0, 'baixo': 1, 'normal': 2 };

// ---------- Utilitários ----------
// Remove acentos e diferenças de maiúsculas/minúsculas para comparar textos.
function normalizarTexto(texto) {
  return String(texto === undefined || texto === null ? '' : texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function compararTexto(a, b) {
  return String(a || '').localeCompare(String(b || ''), 'pt-BR', { numeric: true, sensitivity: 'base' });
}

// ---------- Critérios ----------
function lerCriteriosProdutos() {
  return {
    nome: normalizarTexto(document.getElementById('filtro-nome').value),
    codigo: normalizarTexto(document.getElementById('filtro-codigo').value),
    categoria: document.getElementById('filtro-categoria').value,
    situacao: document.getElementById('filtro-situacao').value,
    ordenacao: document.getElementById('filtro-ordenacao').value
  };
}

// Indica se há pesquisa ou filtro aplicado (a ordenação não conta como filtro).
function existemFiltrosAtivos() {
  const criterios = lerCriteriosProdutos();
  return criterios.nome !== '' ||
    criterios.codigo !== '' ||
    criterios.categoria !== '' ||
    criterios.situacao !== '';
}

function produtoAtendeCriterios(produto, criterios) {
  if (criterios.nome !== '' && normalizarTexto(produto.nome).indexOf(criterios.nome) === -1) {
    return false;
  }

  if (criterios.codigo !== '' && normalizarTexto(produto.codigo).indexOf(criterios.codigo) === -1) {
    return false;
  }

  if (criterios.categoria !== '' && normalizarTexto(produto.categoria) !== criterios.categoria) {
    return false;
  }

  if (criterios.situacao !== '' && situacaoEstoque(produto) !== criterios.situacao) {
    return false;
  }

  return true;
}

// ---------- Ordenação ----------
function compararProdutos(a, b, ordenacao) {
  switch (ordenacao) {
    case 'nome-asc':
      return compararTexto(a.nome, b.nome);
    case 'nome-desc':
      return compararTexto(b.nome, a.nome);
    case 'codigo-asc':
      return compararTexto(a.codigo, b.codigo);
    case 'codigo-desc':
      return compararTexto(b.codigo, a.codigo);
    case 'categoria-asc':
      return compararTexto(a.categoria, b.categoria);
    case 'quantidade-asc':
      return (Number(a.quantidade) || 0) - (Number(b.quantidade) || 0);
    case 'quantidade-desc':
      return (Number(b.quantidade) || 0) - (Number(a.quantidade) || 0);
    case 'situacao':
      return ORDEM_SITUACAO[situacaoEstoque(a)] - ORDEM_SITUACAO[situacaoEstoque(b)];
    default:
      return 0;
  }
}

// Retorna os produtos que atendem aos critérios atuais, já ordenados.
function obterProdutosFiltrados() {
  const criterios = lerCriteriosProdutos();

  const filtrados = obterProdutos().filter(function (produto) {
    return produtoAtendeCriterios(produto, criterios);
  });

  // Mantém a ordem original entre produtos considerados iguais
  return filtrados
    .map(function (produto, indice) {
      return { produto: produto, indice: indice };
    })
    .sort(function (x, y) {
      return compararProdutos(x.produto, y.produto, criterios.ordenacao) || (x.indice - y.indice);
    })
    .map(function (item) {
      return item.produto;
    });
}

// ---------- Interface ----------
// Atualiza as opções do filtro de categoria, mantendo a seleção atual se ainda existir.
function atualizarOpcoesCategoria() {
  const seletor = document.getElementById('filtro-categoria');
  const selecionada = seletor.value;
  const categorias = {};

  obterProdutos().forEach(function (produto) {
    const rotulo = String(produto.categoria || '').trim();
    if (rotulo === '') {
      return;
    }

    const chave = normalizarTexto(rotulo);
    if (!Object.prototype.hasOwnProperty.call(categorias, chave)) {
      categorias[chave] = rotulo;
    }
  });

  const chaves = Object.keys(categorias).sort(function (a, b) {
    return compararTexto(categorias[a], categorias[b]);
  });

  seletor.textContent = '';

  const opcaoTodas = document.createElement('option');
  opcaoTodas.value = '';
  opcaoTodas.textContent = 'Todas as categorias';
  seletor.appendChild(opcaoTodas);

  chaves.forEach(function (chave) {
    const opcao = document.createElement('option');
    opcao.value = chave;
    opcao.textContent = categorias[chave];
    seletor.appendChild(opcao);
  });

  seletor.value = chaves.indexOf(selecionada) !== -1 ? selecionada : '';
}

// Volta pesquisa, filtros e ordenação ao estado inicial.
function limparFiltrosProdutos() {
  document.getElementById('filtro-nome').value = '';
  document.getElementById('filtro-codigo').value = '';
  document.getElementById('filtro-categoria').value = '';
  document.getElementById('filtro-situacao').value = '';
  document.getElementById('filtro-ordenacao').value = 'cadastro';
}

// Liga os eventos dos filtros. aoAtualizar é chamada sempre que algum critério muda.
function configurarFiltrosProdutos(aoAtualizar) {
  const seletorSituacao = document.getElementById('filtro-situacao');
  seletorSituacao.textContent = '';

  const opcaoTodas = document.createElement('option');
  opcaoTodas.value = '';
  opcaoTodas.textContent = 'Todas as situações';
  seletorSituacao.appendChild(opcaoTodas);

  SITUACOES_FILTRO.forEach(function (situacao) {
    const opcao = document.createElement('option');
    opcao.value = situacao;
    opcao.textContent = ROTULOS_SITUACAO[situacao];
    seletorSituacao.appendChild(opcao);
  });

  const seletorOrdenacao = document.getElementById('filtro-ordenacao');
  seletorOrdenacao.textContent = '';

  ORDENACOES_PRODUTOS.forEach(function (ordenacao) {
    const opcao = document.createElement('option');
    opcao.value = ordenacao.valor;
    opcao.textContent = ordenacao.rotulo;
    seletorOrdenacao.appendChild(opcao);
  });

  document.getElementById('filtro-nome').addEventListener('input', aoAtualizar);
  document.getElementById('filtro-codigo').addEventListener('input', aoAtualizar);
  document.getElementById('filtro-categoria').addEventListener('change', aoAtualizar);
  seletorSituacao.addEventListener('change', aoAtualizar);
  seletorOrdenacao.addEventListener('change', aoAtualizar);

  document.getElementById('filtro-limpar').addEventListener('click', function () {
    limparFiltrosProdutos();
    aoAtualizar();
  });
}