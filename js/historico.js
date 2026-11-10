// ---------- Histórico de movimentações ----------
// Valor usado no filtro para movimentações sem usuário registrado (feitas antes da etapa 9)
const SEM_USUARIO = '__sem_usuario__';

// ---------- Utilitários ----------
function doisDigitos(numero) {
  return numero < 10 ? '0' + numero : String(numero);
}

// Converte a data/hora ISO para a data local no formato AAAA-MM-DD.
function dataLocalIso(dataIso) {
  const data = new Date(dataIso);
  if (isNaN(data.getTime())) {
    return '';
  }
  return data.getFullYear() + '-' + doisDigitos(data.getMonth() + 1) + '-' + doisDigitos(data.getDate());
}

function obterChaveUsuario(movimentacao) {
  return movimentacao.usuario ? String(movimentacao.usuario) : SEM_USUARIO;
}

function obterRotuloUsuario(movimentacao) {
  if (!movimentacao.usuario) {
    return 'Não informado';
  }
  if (movimentacao.usuarioNome) {
    return movimentacao.usuarioNome + ' (' + movimentacao.usuario + ')';
  }
  return String(movimentacao.usuario);
}

// Usa o código guardado na movimentação ou, nas mais antigas, o do cadastro atual.
function obterCodigoMovimentacao(movimentacao) {
  if (movimentacao.produtoCodigo) {
    return movimentacao.produtoCodigo;
  }
  const produto = buscarProdutoPorId(movimentacao.produtoId);
  return produto && produto.codigo ? produto.codigo : '';
}

// ---------- Critérios ----------
function lerCriteriosHistorico() {
  return {
    produto: normalizarTexto(document.getElementById('hist-produto').value),
    tipo: document.getElementById('hist-tipo').value,
    usuario: document.getElementById('hist-usuario').value,
    dataInicial: document.getElementById('hist-data-inicial').value,
    dataFinal: document.getElementById('hist-data-final').value,
    ordenacao: document.getElementById('hist-ordenacao').value
  };
}

function existemFiltrosHistoricoAtivos(criterios) {
  return criterios.produto !== '' ||
    criterios.tipo !== '' ||
    criterios.usuario !== '' ||
    criterios.dataInicial !== '' ||
    criterios.dataFinal !== '';
}

function periodoHistoricoInvalido(criterios) {
  return criterios.dataInicial !== '' &&
    criterios.dataFinal !== '' &&
    criterios.dataInicial > criterios.dataFinal;
}

function movimentacaoAtendeCriterios(movimentacao, criterios) {
  if (criterios.produto !== '') {
    const nome = normalizarTexto(movimentacao.produtoNome);
    const codigo = normalizarTexto(obterCodigoMovimentacao(movimentacao));
    if (nome.indexOf(criterios.produto) === -1 && codigo.indexOf(criterios.produto) === -1) {
      return false;
    }
  }

  if (criterios.tipo !== '' && movimentacao.tipo !== criterios.tipo) {
    return false;
  }

  if (criterios.usuario !== '' && obterChaveUsuario(movimentacao) !== criterios.usuario) {
    return false;
  }

  if (criterios.dataInicial !== '' || criterios.dataFinal !== '') {
    const dia = dataLocalIso(movimentacao.data);
    if (dia === '') {
      return false;
    }
    if (criterios.dataInicial !== '' && dia < criterios.dataInicial) {
      return false;
    }
    if (criterios.dataFinal !== '' && dia > criterios.dataFinal) {
      return false;
    }
  }

  return true;
}

// Retorna as movimentações que atendem aos critérios, já ordenadas.
function obterMovimentacoesFiltradas(criterios) {
  if (periodoHistoricoInvalido(criterios)) {
    return [];
  }

  const sentido = criterios.ordenacao === 'antigas' ? 1 : -1;

  return obterMovimentacoes()
    .filter(function (movimentacao) {
      return movimentacaoAtendeCriterios(movimentacao, criterios);
    })
    .sort(function (a, b) {
      const diferenca = (new Date(a.data).getTime() || 0) - (new Date(b.data).getTime() || 0);
      if (diferenca !== 0) {
        return sentido * diferenca;
      }
      return sentido * ((Number(a.id) || 0) - (Number(b.id) || 0));
    });
}

// ---------- Interface ----------
// Atualiza as opções do filtro de usuário, mantendo a seleção atual se ainda existir.
function atualizarOpcoesUsuarioHistorico() {
  const seletor = document.getElementById('hist-usuario');
  const selecionado = seletor.value;
  const usuarios = {};

  obterMovimentacoes().forEach(function (movimentacao) {
    const chave = obterChaveUsuario(movimentacao);
    if (!Object.prototype.hasOwnProperty.call(usuarios, chave)) {
      usuarios[chave] = obterRotuloUsuario(movimentacao);
    }
  });

  const chaves = Object.keys(usuarios).sort(function (a, b) {
    return String(usuarios[a]).localeCompare(String(usuarios[b]), 'pt-BR');
  });

  seletor.textContent = '';

  const opcaoTodos = document.createElement('option');
  opcaoTodos.value = '';
  opcaoTodos.textContent = 'Todos os usuários';
  seletor.appendChild(opcaoTodos);

  chaves.forEach(function (chave) {
    const opcao = document.createElement('option');
    opcao.value = chave;
    opcao.textContent = usuarios[chave];
    seletor.appendChild(opcao);
  });

  seletor.value = chaves.indexOf(selecionado) !== -1 ? selecionado : '';
}

function criarSeloTipo(tipo) {
  const selo = document.createElement('span');
  selo.className = 'selo-tipo tipo-' + (tipo === 'entrada' ? 'entrada' : 'saida');
  selo.textContent = rotuloTipoMovimentacao(tipo);
  return selo;
}

function criarCelulaProdutoHistorico(movimentacao) {
  const celula = document.createElement('td');
  const codigo = obterCodigoMovimentacao(movimentacao);

  celula.setAttribute('data-label', 'Produto');
  celula.textContent = (movimentacao.produtoNome || '-') + (codigo ? ' (' + codigo + ')' : '');

  if (!buscarProdutoPorId(movimentacao.produtoId)) {
    const aviso = document.createElement('span');
    aviso.className = 'tag-excluido';
    aviso.textContent = 'Produto excluído';
    celula.appendChild(aviso);
  }

  return celula;
}

// Exibe o histórico de acordo com os filtros atuais.
function renderizarHistorico() {
  const total = obterMovimentacoes().length;

  atualizarOpcoesUsuarioHistorico();

  const criterios = lerCriteriosHistorico();
  const periodoInvalido = periodoHistoricoInvalido(criterios);
  const lista = obterMovimentacoesFiltradas(criterios);

  const aviso = document.getElementById('historico-aviso');
  aviso.textContent = periodoInvalido ? 'A data inicial não pode ser posterior à data final.' : '';
  aviso.hidden = !periodoInvalido;

  document.getElementById('historico-vazio').hidden = total > 0;
  document.getElementById('filtros-historico').hidden = total === 0;
  document.getElementById('historico-resumo').hidden = total === 0 || periodoInvalido;
  document.getElementById('historico-sem-resultado').hidden = !(total > 0 && lista.length === 0 && !periodoInvalido);
  document.getElementById('historico-tabela-wrapper').hidden = lista.length === 0;

  // Resumo do que está sendo exibido
  const totais = { entradas: 0, saidas: 0, unidadesEntrada: 0, unidadesSaida: 0 };
  lista.forEach(function (movimentacao) {
    const quantidade = Number(movimentacao.quantidade) || 0;
    if (movimentacao.tipo === 'entrada') {
      totais.entradas++;
      totais.unidadesEntrada += quantidade;
    } else if (movimentacao.tipo === 'saida') {
      totais.saidas++;
      totais.unidadesSaida += quantidade;
    }
  });

  let resumo = 'Exibindo ' + formatarNumero(lista.length) + ' de ' + formatarNumero(total) + ' movimentação(ões). ' +
    'Entradas: ' + formatarNumero(totais.entradas) + ' (' + formatarNumero(totais.unidadesEntrada) + ' unidades). ' +
    'Saídas: ' + formatarNumero(totais.saidas) + ' (' + formatarNumero(totais.unidadesSaida) + ' unidades).';
  if (existemFiltrosHistoricoAtivos(criterios)) {
    resumo += ' Filtros aplicados.';
  }
  document.getElementById('historico-resumo').textContent = resumo;

  const corpo = document.getElementById('historico-corpo');
  corpo.textContent = '';

  lista.forEach(function (movimentacao) {
    const linha = document.createElement('tr');

    linha.appendChild(criarCelula(formatarDataHora(movimentacao.data), 'Data e hora'));

    const celulaTipo = document.createElement('td');
    celulaTipo.setAttribute('data-label', 'Tipo');
    celulaTipo.appendChild(criarSeloTipo(movimentacao.tipo));
    linha.appendChild(celulaTipo);

    linha.appendChild(criarCelulaProdutoHistorico(movimentacao));
    linha.appendChild(criarCelula(formatarNumero(Number(movimentacao.quantidade) || 0), 'Quantidade'));
    linha.appendChild(criarCelula(obterRotuloUsuario(movimentacao), 'Usuário responsável'));

    corpo.appendChild(linha);
  });
}

// Volta os filtros ao estado inicial.
function limparFiltrosHistorico() {
  document.getElementById('hist-produto').value = '';
  document.getElementById('hist-tipo').value = '';
  document.getElementById('hist-usuario').value = '';
  document.getElementById('hist-data-inicial').value = '';
  document.getElementById('hist-data-final').value = '';
  document.getElementById('hist-ordenacao').value = 'recentes';
}

// Abre o histórico com os dados atuais e sem filtros aplicados.
function prepararHistorico() {
  limparFiltrosHistorico();
  renderizarHistorico();
}

// Liga os eventos dos filtros do histórico.
function configurarHistorico() {
  document.getElementById('hist-produto').addEventListener('input', renderizarHistorico);
  document.getElementById('hist-tipo').addEventListener('change', renderizarHistorico);
  document.getElementById('hist-usuario').addEventListener('change', renderizarHistorico);
  document.getElementById('hist-data-inicial').addEventListener('change', renderizarHistorico);
  document.getElementById('hist-data-final').addEventListener('change', renderizarHistorico);
  document.getElementById('hist-ordenacao').addEventListener('change', renderizarHistorico);

  document.getElementById('hist-limpar').addEventListener('click', function () {
    limparFiltrosHistorico();
    renderizarHistorico();
  });
}