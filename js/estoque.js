// ---------- Controle de estoque mínimo ----------
// Regras:
// - Sem estoque: quantidade igual a zero.
// - Estoque baixo: quantidade maior que zero e menor ou igual ao estoque mínimo.
// - Normal: quantidade acima do estoque mínimo.
// A situação é sempre calculada a partir da quantidade e do estoque mínimo atuais.

const ROTULOS_SITUACAO = {
  'normal': 'Normal',
  'baixo': 'Estoque baixo',
  'sem-estoque': 'Sem estoque'
};

// Peso de cada situação para ordenar alertas (menor = mais crítica)
const PESO_SITUACAO = { 'sem-estoque': 0, 'baixo': 1, 'normal': 2 };

// Retorna 'sem-estoque', 'baixo' ou 'normal' para o produto informado.
function situacaoEstoque(produto) {
  const quantidade = Number(produto.quantidade) || 0;
  const minimo = Number(produto.estoqueMinimo) || 0;

  if (quantidade <= 0) {
    return 'sem-estoque';
  }
  if (quantidade <= minimo) {
    return 'baixo';
  }
  return 'normal';
}

function produtoEmAlerta(produto) {
  return situacaoEstoque(produto) !== 'normal';
}

// Lista os produtos em alerta, com os sem estoque primeiro e, em cada grupo, por nome.
function listarProdutosEmAlerta() {
  return obterProdutos()
    .filter(produtoEmAlerta)
    .sort(function (a, b) {
      const diferenca = PESO_SITUACAO[situacaoEstoque(a)] - PESO_SITUACAO[situacaoEstoque(b)];
      if (diferenca !== 0) {
        return diferenca;
      }
      return String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR');
    });
}

// Conta os produtos sem estoque e com estoque baixo.
function contarAlertasEstoque() {
  const contagem = { semEstoque: 0, baixo: 0, total: 0 };

  obterProdutos().forEach(function (produto) {
    const situacao = situacaoEstoque(produto);
    if (situacao === 'sem-estoque') {
      contagem.semEstoque++;
    } else if (situacao === 'baixo') {
      contagem.baixo++;
    }
  });

  contagem.total = contagem.semEstoque + contagem.baixo;
  return contagem;
}

// Texto do alerta do produto. Retorna texto vazio se o estoque estiver normal.
function textoAlertaEstoque(produto) {
  const situacao = situacaoEstoque(produto);
  const quantidade = Number(produto.quantidade) || 0;
  const minimo = Number(produto.estoqueMinimo) || 0;

  if (situacao === 'sem-estoque') {
    return 'Atenção: o produto "' + produto.nome + '" está sem estoque.';
  }

  if (situacao === 'baixo') {
    return 'Atenção: o produto "' + produto.nome + '" está com estoque baixo (' +
      formatarNumero(quantidade) + ' disponível(is); estoque mínimo: ' + formatarNumero(minimo) + ').';
  }

  return '';
}

// Exibe, no elemento indicado, o alerta do produto (ou o oculta se o estoque estiver normal).
function mostrarAlertaEstoque(idElemento, produto) {
  const elemento = document.getElementById(idElemento);
  const texto = textoAlertaEstoque(produto);

  elemento.textContent = texto;
  elemento.hidden = texto === '';
}

function limparAlertaEstoque(idElemento) {
  const elemento = document.getElementById(idElemento);
  elemento.textContent = '';
  elemento.hidden = true;
}

// Atualiza o indicador de alertas exibido no cabeçalho.
function atualizarIndicadorAlertas() {
  const indicador = document.getElementById('indicador-alertas');
  const contagem = contarAlertasEstoque();

  indicador.hidden = contagem.total === 0;
  if (contagem.total === 0) {
    return;
  }

  indicador.textContent = '⚠ ' + formatarNumero(contagem.total) +
    (contagem.total === 1 ? ' alerta de estoque' : ' alertas de estoque');
  indicador.title = formatarNumero(contagem.semEstoque) + ' sem estoque, ' +
    formatarNumero(contagem.baixo) + ' com estoque baixo';
  indicador.classList.toggle('critico', contagem.semEstoque > 0);
}

// Sempre que os dados são gravados, a situação dos produtos é reavaliada.
document.addEventListener('dados-alterados', atualizarIndicadorAlertas);
