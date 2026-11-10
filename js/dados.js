// ---------- Armazenamento e persistência de dados ----------
// Estrutura dos registros (usada por todas as funcionalidades):
//
// Produto:
//   { id, codigo, nome, descricao, categoria, quantidade, estoqueMinimo, localizacao }
//
// Movimentação:
//   { id, tipo, produtoId, produtoNome, produtoCodigo, quantidade, data, usuario, usuarioNome }
//   - tipo: 'entrada' ou 'saida'
//   - data: texto no formato ISO (ex.: new Date().toISOString())
//   - usuario / usuarioNome: login e nome de quem realizou a operação
//     (movimentações antigas podem não ter usuário nem produtoCodigo)
//
// Os dados ficam em memória (objeto DADOS) e são gravados no localStorage do navegador
// a cada alteração, no formato:
//   { versao, salvoEm, produtos, movimentacoes, contadores }
// Os contadores guardam o último id gerado, para que um id nunca seja reutilizado,
// mesmo depois de excluir registros.

const CHAVE_DADOS = 'almoxarifado_dados';
const CHAVE_DADOS_CORROMPIDOS = 'almoxarifado_dados_corrompidos';
const VERSAO_DADOS = 2;

const DADOS = {
  produtos: [],
  movimentacoes: [],
  contadores: { produtos: 0, movimentacoes: 0 }
};

function obterProdutos() {
  return DADOS.produtos;
}

function obterMovimentacoes() {
  return DADOS.movimentacoes;
}

// ---------- Avisos sobre os dados ----------
// Lista de avisos exibidos ao usuário (armazenamento indisponível, dados reparados etc.)
const AVISOS_DADOS = [];

function obterAvisosDados() {
  return AVISOS_DADOS;
}

function adicionarAvisoDados(id, texto) {
  const existente = AVISOS_DADOS.find(function (aviso) {
    return aviso.id === id;
  });

  if (existente) {
    if (existente.texto === texto) {
      return;
    }
    existente.texto = texto;
  } else {
    AVISOS_DADOS.push({ id: id, texto: texto });
  }

  document.dispatchEvent(new CustomEvent('avisos-dados-alterados'));
}

function removerAvisoDados(id) {
  const indice = AVISOS_DADOS.findIndex(function (aviso) {
    return aviso.id === id;
  });

  if (indice === -1) {
    return;
  }

  AVISOS_DADOS.splice(indice, 1);
  document.dispatchEvent(new CustomEvent('avisos-dados-alterados'));
}

// ---------- Utilitários ----------
function ehObjetoSimples(valor) {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor);
}

function paraTexto(valor) {
  return valor === undefined || valor === null ? '' : String(valor);
}

// Converte para inteiro maior ou igual a zero (valores inválidos viram 0).
function paraInteiroNaoNegativo(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 0 ? Math.floor(numero) : 0;
}

function idValido(valor) {
  return Number.isSafeInteger(valor) && valor > 0;
}

function maiorId(lista) {
  let maior = 0;
  lista.forEach(function (item) {
    if (idValido(item.id) && item.id > maior) {
      maior = item.id;
    }
  });
  return maior;
}

// Verifica se o localStorage pode ser usado neste navegador.
function armazenamentoDisponivel() {
  try {
    const chave = 'almoxarifado_teste';
    localStorage.setItem(chave, '1');
    localStorage.removeItem(chave);
    return true;
  } catch (e) {
    return false;
  }
}

// ---------- Geração de identificadores ----------
// Os ids nunca são reutilizados, mesmo que o registro mais recente seja excluído.
function gerarIdProduto() {
  DADOS.contadores.produtos = Math.max(DADOS.contadores.produtos, maiorId(DADOS.produtos)) + 1;
  return DADOS.contadores.produtos;
}

function gerarIdMovimentacao() {
  DADOS.contadores.movimentacoes = Math.max(DADOS.contadores.movimentacoes, maiorId(DADOS.movimentacoes)) + 1;
  return DADOS.contadores.movimentacoes;
}

// ---------- Validação dos dados carregados ----------
// Atribui ids novos aos registros sem id válido ou com id repetido.
function atribuirIdsPendentes(lista, pendentes) {
  let proximo = maiorId(lista);
  pendentes.forEach(function (item) {
    proximo++;
    item.id = proximo;
  });
}

function sanitizarProdutos(lista, relatorio) {
  const aceitos = [];
  const pendentes = [];
  const idsUsados = {};

  lista.forEach(function (item) {
    if (!ehObjetoSimples(item)) {
      relatorio.descartados++;
      return;
    }

    const produto = {
      id: null,
      codigo: paraTexto(item.codigo),
      nome: paraTexto(item.nome),
      descricao: paraTexto(item.descricao),
      categoria: paraTexto(item.categoria),
      quantidade: paraInteiroNaoNegativo(item.quantidade),
      estoqueMinimo: paraInteiroNaoNegativo(item.estoqueMinimo),
      localizacao: paraTexto(item.localizacao)
    };

    if (produto.codigo.trim() === '' && produto.nome.trim() === '') {
      relatorio.descartados++;
      return;
    }

    let corrigido = produto.quantidade !== item.quantidade || produto.estoqueMinimo !== item.estoqueMinimo;

    if (idValido(item.id) && !Object.prototype.hasOwnProperty.call(idsUsados, item.id)) {
      idsUsados[item.id] = true;
      produto.id = item.id;
    } else {
      pendentes.push(produto);
      corrigido = true;
    }

    if (corrigido) {
      relatorio.corrigidos++;
    }

    aceitos.push(produto);
  });

  atribuirIdsPendentes(aceitos, pendentes);
  return aceitos;
}

function sanitizarMovimentacoes(lista, relatorio) {
  const aceitas = [];
  const pendentes = [];
  const idsUsados = {};

  lista.forEach(function (item) {
    if (!ehObjetoSimples(item)) {
      relatorio.descartados++;
      return;
    }

    const quantidade = Math.floor(Number(item.quantidade));
    const data = new Date(item.data);

    if ((item.tipo !== 'entrada' && item.tipo !== 'saida') ||
        !Number.isFinite(quantidade) || quantidade < 1 ||
        isNaN(data.getTime())) {
      relatorio.descartados++;
      return;
    }

    const movimentacao = {
      id: null,
      tipo: item.tipo,
      produtoId: idValido(item.produtoId) ? item.produtoId : null,
      produtoNome: paraTexto(item.produtoNome),
      produtoCodigo: paraTexto(item.produtoCodigo),
      quantidade: quantidade,
      data: data.toISOString(),
      usuario: paraTexto(item.usuario),
      usuarioNome: paraTexto(item.usuarioNome)
    };

    let corrigida = quantidade !== item.quantidade;

    if (idValido(item.id) && !Object.prototype.hasOwnProperty.call(idsUsados, item.id)) {
      idsUsados[item.id] = true;
      movimentacao.id = item.id;
    } else {
      pendentes.push(movimentacao);
      corrigida = true;
    }

    if (corrigida) {
      relatorio.corrigidos++;
    }

    aceitas.push(movimentacao);
  });

  atribuirIdsPendentes(aceitas, pendentes);
  return aceitas;
}

// Interpreta o texto gravado no localStorage. Lança erro se o conteúdo for ilegível.
// Aceita também o formato antigo (sem versão), das etapas anteriores.
function interpretarDadosArmazenados(texto) {
  const bruto = JSON.parse(texto);

  if (!ehObjetoSimples(bruto)) {
    throw new Error('Formato de dados inválido.');
  }

  if (bruto.versao !== undefined && (!Number.isInteger(bruto.versao) || bruto.versao > VERSAO_DADOS)) {
    throw new Error('Versão de dados não suportada.');
  }

  if ((bruto.produtos !== undefined && !Array.isArray(bruto.produtos)) ||
      (bruto.movimentacoes !== undefined && !Array.isArray(bruto.movimentacoes))) {
    throw new Error('Estrutura de dados inválida.');
  }

  const relatorio = { descartados: 0, corrigidos: 0 };
  const produtos = sanitizarProdutos(bruto.produtos || [], relatorio);
  const movimentacoes = sanitizarMovimentacoes(bruto.movimentacoes || [], relatorio);

  const contadoresBrutos = ehObjetoSimples(bruto.contadores) ? bruto.contadores : {};

  return {
    dados: {
      produtos: produtos,
      movimentacoes: movimentacoes,
      contadores: {
        produtos: Math.max(idValido(contadoresBrutos.produtos) ? contadoresBrutos.produtos : 0, maiorId(produtos)),
        movimentacoes: Math.max(idValido(contadoresBrutos.movimentacoes) ? contadoresBrutos.movimentacoes : 0, maiorId(movimentacoes))
      }
    },
    descartados: relatorio.descartados,
    corrigidos: relatorio.corrigidos,
    migrado: bruto.versao !== VERSAO_DADOS
  };
}

// ---------- Carregamento ----------
function reiniciarDados() {
  DADOS.produtos = [];
  DADOS.movimentacoes = [];
  DADOS.contadores = { produtos: 0, movimentacoes: 0 };
}

// Guarda uma cópia do conteúdo original antes de ele ser substituído.
function preservarDadosCorrompidos(texto) {
  try {
    localStorage.setItem(CHAVE_DADOS_CORROMPIDOS, texto);
  } catch (e) {
    // Sem espaço ou sem acesso: não há o que fazer
  }
}

// Carrega os dados gravados no localStorage (chamado ao iniciar e quando outra aba altera os dados).
function carregarDados() {
  let texto = null;

  try {
    texto = localStorage.getItem(CHAVE_DADOS);
  } catch (e) {
    // Armazenamento bloqueado: segue com os dados em memória
    return;
  }

  if (texto === null) {
    reiniciarDados();
    removerAvisoDados('dados-corrompidos');
    removerAvisoDados('dados-reparados');
    return;
  }

  try {
    const resultado = interpretarDadosArmazenados(texto);

    DADOS.produtos = resultado.dados.produtos;
    DADOS.movimentacoes = resultado.dados.movimentacoes;
    DADOS.contadores = resultado.dados.contadores;

    removerAvisoDados('dados-corrompidos');

    const reparado = resultado.descartados > 0 || resultado.corrigidos > 0;

    if (reparado) {
      let aviso = 'Alguns registros salvos estavam inválidos e foram tratados ao carregar os dados: ' +
        resultado.descartados + ' descartado(s) e ' + resultado.corrigidos + ' corrigido(s).';

      if (resultado.descartados > 0) {
        preservarDadosCorrompidos(texto);
        aviso += ' Uma cópia do conteúdo original foi preservada no armazenamento local (chave "' +
          CHAVE_DADOS_CORROMPIDOS + '").';
      }

      adicionarAvisoDados('dados-reparados', aviso);
    } else {
      removerAvisoDados('dados-reparados');
    }

    // Grava no formato atual quando os dados vieram de uma versão anterior ou foram reparados
    if (resultado.migrado || reparado) {
      salvarDados();
    }
  } catch (e) {
    // Conteúdo ilegível: preserva uma cópia e inicia sem dados
    preservarDadosCorrompidos(texto);
    reiniciarDados();
    removerAvisoDados('dados-reparados');
    adicionarAvisoDados(
      'dados-corrompidos',
      'Os dados salvos neste navegador estavam ilegíveis e não puderam ser carregados. ' +
      'Uma cópia do conteúdo original foi preservada no armazenamento local (chave "' +
      CHAVE_DADOS_CORROMPIDOS + '"). O sistema foi iniciado sem dados.'
    );
  }
}

// ---------- Gravação ----------
// Grava os dados atuais e avisa o sistema de que houve alteração.
// Retorna true se conseguiu gravar no navegador.
function salvarDados() {
  let gravado = true;

  try {
    localStorage.setItem(CHAVE_DADOS, JSON.stringify({
      versao: VERSAO_DADOS,
      salvoEm: new Date().toISOString(),
      produtos: DADOS.produtos,
      movimentacoes: DADOS.movimentacoes,
      contadores: DADOS.contadores
    }));

    removerAvisoDados('gravacao');
    removerAvisoDados('armazenamento');
  } catch (e) {
    gravado = false;
    adicionarAvisoDados(
      'gravacao',
      'Não foi possível gravar os dados no navegador (armazenamento indisponível ou cheio). ' +
      'As alterações valerão apenas enquanto esta página estiver aberta.'
    );
  }

  document.dispatchEvent(new CustomEvent('dados-alterados'));
  return gravado;
}

// ---------- Sincronização entre abas ----------
// Quando outra aba do mesmo navegador altera os dados, eles são carregados novamente aqui.
window.addEventListener('storage', function (evento) {
  if (evento.key !== null && evento.key !== CHAVE_DADOS) {
    return;
  }

  carregarDados();
  document.dispatchEvent(new CustomEvent('dados-alterados'));
  document.dispatchEvent(new CustomEvent('dados-externos'));
});

// ---------- Inicialização ----------
if (!armazenamentoDisponivel()) {
  adicionarAvisoDados(
    'armazenamento',
    'O armazenamento local do navegador está indisponível ou bloqueado. ' +
    'Os dados ficarão disponíveis apenas enquanto esta página estiver aberta.'
  );
}

carregarDados();
