// ---------- Dados mockados ----------
const USUARIOS = [
  { usuario: 'admin',   senha: 'admin123', perfil: PERFIS.ADMIN, nome: 'Administrador' },
  { usuario: 'usuario', senha: 'user123',  perfil: PERFIS.COMUM, nome: 'Usuário Comum' }
];

const CHAVE_SESSAO = 'almoxarifado_sessao';

// Usado como alternativa caso o navegador bloqueie o sessionStorage
let sessaoEmMemoria = null;

// Sessão do usuário atualmente autenticado
let sessaoAtual = null;

// Painel atualmente exibido ('inicio', 'produtos', 'historico' etc.)
let painelAtual = 'inicio';

// ---------- Autenticação ----------
function autenticar(usuario, senha) {
  const encontrado = USUARIOS.find(function (u) {
    return u.usuario === usuario && u.senha === senha;
  });

  if (!encontrado) {
    return null;
  }

  return { usuario: encontrado.usuario, nome: encontrado.nome, perfil: encontrado.perfil };
}

// ---------- Sessão ----------
function salvarSessao(sessao) {
  sessaoEmMemoria = sessao;
  try {
    sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
  } catch (e) {
    // Mantém apenas em memória
  }
}

function obterSessao() {
  try {
    const dados = sessionStorage.getItem(CHAVE_SESSAO);
    if (dados) {
      return JSON.parse(dados);
    }
  } catch (e) {
    // Ignora e usa a sessão em memória
  }
  return sessaoEmMemoria;
}

function encerrarSessao() {
  sessaoEmMemoria = null;
  sessaoAtual = null;
  try {
    sessionStorage.removeItem(CHAVE_SESSAO);
  } catch (e) {
    // Nada a fazer
  }
}

// ---------- Elementos da interface ----------
const telaLogin = document.getElementById('tela-login');
const telaApp = document.getElementById('tela-app');
const formLogin = document.getElementById('form-login');
const campoUsuario = document.getElementById('campo-usuario');
const campoSenha = document.getElementById('campo-senha');
const mensagemErro = document.getElementById('mensagem-erro');
const infoUsuario = document.getElementById('info-usuario');
const infoPerfil = document.getElementById('info-perfil');
const boasVindas = document.getElementById('boas-vindas');
const botaoLogout = document.getElementById('botao-logout');
const botaoMenu = document.getElementById('botao-menu');
const indicadorAlertas = document.getElementById('indicador-alertas');
const avisoDados = document.getElementById('aviso-dados');
const avisoDadosLista = document.getElementById('aviso-dados-lista');
const avisoDadosFechar = document.getElementById('aviso-dados-fechar');

const menu = document.getElementById('menu');
const painelInicio = document.getElementById('painel-inicio');
const painelCadastroProduto = document.getElementById('painel-cadastro-produto');
const painelProdutos = document.getElementById('painel-produtos');
const painelMovimentacao = document.getElementById('painel-movimentacao');
const painelHistorico = document.getElementById('painel-historico');
const painelModulo = document.getElementById('painel-modulo');
const textoPerfil = document.getElementById('texto-perfil');
const listaPermissoes = document.getElementById('lista-permissoes');
const moduloTitulo = document.getElementById('modulo-titulo');
const moduloTexto = document.getElementById('modulo-texto');

// ---------- Avisos sobre os dados ----------
// Exibe os avisos do armazenamento (dados reparados, armazenamento indisponível etc.).
function exibirAvisosDados() {
  const avisos = obterAvisosDados();

  avisoDadosLista.textContent = '';
  avisos.forEach(function (aviso) {
    const item = document.createElement('li');
    item.textContent = aviso.texto;
    avisoDadosLista.appendChild(item);
  });

  avisoDados.hidden = avisos.length === 0;
}

// ---------- Login ----------
function mostrarErro(texto) {
  mensagemErro.textContent = texto;
  mensagemErro.hidden = false;
}

function limparErro() {
  mensagemErro.textContent = '';
  mensagemErro.hidden = true;
}

function mostrarLogin() {
  telaApp.hidden = true;
  telaLogin.hidden = false;
  formLogin.reset();
  limparErro();
  campoUsuario.focus();
}

// ---------- Menu e controle de acesso ----------
// Abre ou fecha o menu em telas pequenas (em telas grandes ele fica sempre visível).
function alternarMenu(abrir) {
  const aberto = typeof abrir === 'boolean' ? abrir : !menu.classList.contains('menu-aberto');
  menu.classList.toggle('menu-aberto', aberto);
  botaoMenu.setAttribute('aria-expanded', String(aberto));
}

function criarItemMenu(chave, rotulo) {
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'menu-item';
  botao.setAttribute('data-modulo', chave);
  botao.textContent = rotulo;
  botao.addEventListener('click', function () {
    abrirModulo(chave);
  });
  return botao;
}

function criarTituloGrupo(texto) {
  const titulo = document.createElement('div');
  titulo.className = 'menu-grupo';
  titulo.textContent = texto;
  return titulo;
}

// Monta o menu exibindo somente o que o perfil autenticado pode acessar.
function construirMenu(perfil) {
  menu.textContent = '';
  menu.appendChild(criarItemMenu('inicio', 'Dashboard'));

  GRUPOS_MENU.forEach(function (grupo) {
    const itens = listarPermissoesDoPerfil(perfil).filter(function (info) {
      return info.grupo === grupo;
    });

    if (itens.length === 0) {
      return;
    }

    menu.appendChild(criarTituloGrupo(grupo));
    itens.forEach(function (info) {
      menu.appendChild(criarItemMenu(info.permissao, info.rotulo));
    });
  });
}

function listarPermissoesNaTela(perfil) {
  listaPermissoes.textContent = '';
  listarPermissoesDoPerfil(perfil).forEach(function (info) {
    const item = document.createElement('li');
    item.textContent = info.rotulo;
    listaPermissoes.appendChild(item);
  });
}

function marcarItemAtivo(chave) {
  const itens = menu.querySelectorAll('.menu-item');
  itens.forEach(function (item) {
    if (item.getAttribute('data-modulo') === chave) {
      item.classList.add('ativo');
      item.setAttribute('aria-current', 'page');
    } else {
      item.classList.remove('ativo');
      item.removeAttribute('aria-current');
    }
  });
}

// Exibe somente o painel indicado:
// 'inicio', 'cadastro-produto', 'produtos', 'movimentacao', 'historico' ou 'modulo'.
function mostrarPainel(nome) {
  painelAtual = nome;
  painelInicio.hidden = nome !== 'inicio';
  painelCadastroProduto.hidden = nome !== 'cadastro-produto';
  painelProdutos.hidden = nome !== 'produtos';
  painelMovimentacao.hidden = nome !== 'movimentacao';
  painelHistorico.hidden = nome !== 'historico';
  painelModulo.hidden = nome !== 'modulo';
}

// Abre uma área somente se o perfil autenticado tiver a permissão necessária.
function abrirModulo(chave) {
  if (!sessaoAtual) {
    return;
  }

  // Em telas pequenas, o menu se fecha ao escolher uma área
  alternarMenu(false);

  if (chave === 'inicio') {
    // O Dashboard é atualizado a cada abertura, refletindo os dados atuais
    renderizarDashboard(sessaoAtual.perfil, abrirModulo);
    mostrarPainel('inicio');
    marcarItemAtivo('inicio');
    return;
  }

  const info = PERMISSOES_INFO.find(function (i) {
    return i.permissao === chave;
  });

  if (!info || !temPermissao(sessaoAtual.perfil, info.permissao)) {
    moduloTitulo.textContent = 'Acesso negado';
    moduloTexto.textContent = 'O seu perfil não possui permissão para realizar esta operação.';
    mostrarPainel('modulo');
    marcarItemAtivo('');
    return;
  }

  // Cadastro de produtos
  if (chave === PERMISSOES.CADASTRAR_PRODUTOS) {
    prepararFormularioCadastro();
    mostrarPainel('cadastro-produto');
    marcarItemAtivo(chave);
    document.getElementById('campo-codigo').focus();
    return;
  }

  // Consultar, editar e excluir produtos usam a mesma área de gerenciamento
  if (chave === PERMISSOES.CONSULTAR_PRODUTOS ||
      chave === PERMISSOES.EDITAR_PRODUTOS ||
      chave === PERMISSOES.EXCLUIR_PRODUTOS) {
    prepararGestaoProdutos('produtos');
    mostrarPainel('produtos');
    marcarItemAtivo(chave);
    return;
  }

  // Consulta de estoque: mesma lista, em modo somente leitura
  if (chave === PERMISSOES.CONSULTAR_ESTOQUE) {
    prepararGestaoProdutos('estoque');
    mostrarPainel('produtos');
    marcarItemAtivo(chave);
    return;
  }

  // Entradas e saídas de estoque usam o mesmo formulário de movimentação
  if (chave === PERMISSOES.REGISTRAR_ENTRADAS || chave === PERMISSOES.REGISTRAR_SAIDAS) {
    prepararMovimentacao(chave === PERMISSOES.REGISTRAR_ENTRADAS ? 'entrada' : 'saida');
    mostrarPainel('movimentacao');
    marcarItemAtivo(chave);
    return;
  }

  // Histórico de movimentações
  if (chave === PERMISSOES.CONSULTAR_HISTORICO) {
    prepararHistorico();
    mostrarPainel('historico');
    marcarItemAtivo(chave);
    return;
  }

  moduloTitulo.textContent = info.rotulo;
  moduloTexto.textContent = 'Esta área não está disponível.';
  mostrarPainel('modulo');
  marcarItemAtivo(chave);
}

// Atualiza a tela exibida quando outra aba altera os dados, sem perder o que está sendo digitado.
function atualizarTelaAtual() {
  if (!sessaoAtual) {
    return;
  }

  if (painelAtual === 'inicio') {
    renderizarDashboard(sessaoAtual.perfil, abrirModulo);
  } else if (painelAtual === 'historico') {
    renderizarHistorico();
  } else if (painelAtual === 'produtos') {
    if (!document.getElementById('visao-lista').hidden) {
      renderizarListaProdutos();
    }
  } else if (painelAtual === 'movimentacao') {
    const valor = document.getElementById('mov-produto').value;
    preencherProdutosMovimentacao(valor === '' ? null : parseInt(valor, 10));
    atualizarDisponivelMovimentacao();
  } else if (painelAtual === 'cadastro-produto') {
    atualizarCategorias();
  }
}

// ---------- Aplicação ----------
function mostrarApp(sessao) {
  // Perfil desconhecido (ex.: sessão adulterada) não acessa a aplicação
  if (!PERMISSOES_POR_PERFIL[sessao.perfil]) {
    encerrarSessao();
    mostrarLogin();
    return;
  }

  sessaoAtual = sessao;

  infoUsuario.textContent = sessao.nome;
  infoPerfil.textContent = sessao.perfil;
  textoPerfil.textContent = sessao.perfil;
  boasVindas.textContent = 'Bem-vindo, ' + sessao.nome + '!';

  construirMenu(sessao.perfil);
  listarPermissoesNaTela(sessao.perfil);
  atualizarIndicadorAlertas();

  telaLogin.hidden = true;
  telaApp.hidden = false;
  abrirModulo('inicio');
}

// ---------- Eventos ----------
formLogin.addEventListener('submit', function (evento) {
  evento.preventDefault();

  const usuario = campoUsuario.value.trim();
  const senha = campoSenha.value;

  if (usuario === '' || senha === '') {
    mostrarErro('Informe o usuário e a senha.');
    return;
  }

  const sessao = autenticar(usuario, senha);

  if (!sessao) {
    mostrarErro('Usuário ou senha incorretos.');
    campoSenha.value = '';
    campoSenha.focus();
    return;
  }

  salvarSessao(sessao);
  mostrarApp(sessao);
});

botaoLogout.addEventListener('click', function () {
  encerrarSessao();
  alternarMenu(false);
  mostrarLogin();
});

botaoMenu.addEventListener('click', function () {
  alternarMenu();
});

// O indicador de alertas do cabeçalho leva ao Dashboard, onde os alertas são detalhados
indicadorAlertas.addEventListener('click', function () {
  abrirModulo('inicio');
});

avisoDadosFechar.addEventListener('click', function () {
  avisoDados.hidden = true;
});

// Os avisos são atualizados sempre que o armazenamento informa algo novo
document.addEventListener('avisos-dados-alterados', exibirAvisosDados);

// Outra aba do navegador alterou os dados: a tela atual é atualizada
document.addEventListener('dados-externos', atualizarTelaAtual);

// ---------- Inicialização ----------
(function iniciar() {
  function obterPerfilAtual() {
    return sessaoAtual ? sessaoAtual.perfil : null;
  }

  function obterSessaoAtual() {
    return sessaoAtual;
  }

  configurarFormularioProduto(obterPerfilAtual);
  configurarGestaoProdutos(obterPerfilAtual);
  configurarFiltrosProdutos(renderizarListaProdutos);
  configurarMovimentacao(obterSessaoAtual);
  configurarHistorico();
  exibirAvisosDados();

  const sessao = obterSessao();
  if (sessao) {
    mostrarApp(sessao);
  } else {
    mostrarLogin();
  }
})();