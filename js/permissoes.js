// ---------- Perfis ----------
const PERFIS = {
  ADMIN: 'ADMIN',
  COMUM: 'Usuário Comum'
};

// ---------- Permissões ----------
const PERMISSOES = {
  CONSULTAR_PRODUTOS: 'consultar_produtos',
  CONSULTAR_ESTOQUE: 'consultar_estoque',
  CONSULTAR_HISTORICO: 'consultar_historico',
  CADASTRAR_PRODUTOS: 'cadastrar_produtos',
  EDITAR_PRODUTOS: 'editar_produtos',
  EXCLUIR_PRODUTOS: 'excluir_produtos',
  REGISTRAR_ENTRADAS: 'registrar_entradas',
  REGISTRAR_SAIDAS: 'registrar_saidas'
};

// Grupos exibidos no menu, na ordem em que aparecem
const GRUPOS_MENU = ['Produtos', 'Estoque'];

// Descrição de cada permissão e grupo do menu em que aparece
const PERMISSOES_INFO = [
  { permissao: PERMISSOES.CONSULTAR_PRODUTOS,  rotulo: 'Consultar produtos',                   grupo: 'Produtos' },
  { permissao: PERMISSOES.CADASTRAR_PRODUTOS,  rotulo: 'Cadastrar produtos',                   grupo: 'Produtos' },
  { permissao: PERMISSOES.EDITAR_PRODUTOS,     rotulo: 'Editar produtos',                      grupo: 'Produtos' },
  { permissao: PERMISSOES.EXCLUIR_PRODUTOS,    rotulo: 'Excluir produtos',                     grupo: 'Produtos' },
  { permissao: PERMISSOES.CONSULTAR_ESTOQUE,   rotulo: 'Consultar estoque',                    grupo: 'Estoque' },
  { permissao: PERMISSOES.REGISTRAR_ENTRADAS,  rotulo: 'Registrar entradas de estoque',        grupo: 'Estoque' },
  { permissao: PERMISSOES.REGISTRAR_SAIDAS,    rotulo: 'Registrar saídas de estoque',          grupo: 'Estoque' },
  { permissao: PERMISSOES.CONSULTAR_HISTORICO, rotulo: 'Consultar histórico de movimentações', grupo: 'Estoque' }
];

// ---------- Permissões de cada perfil ----------
const PERMISSOES_POR_PERFIL = {};

PERMISSOES_POR_PERFIL[PERFIS.ADMIN] = [
  PERMISSOES.CONSULTAR_PRODUTOS,
  PERMISSOES.CONSULTAR_ESTOQUE,
  PERMISSOES.CONSULTAR_HISTORICO,
  PERMISSOES.CADASTRAR_PRODUTOS,
  PERMISSOES.EDITAR_PRODUTOS,
  PERMISSOES.EXCLUIR_PRODUTOS,
  PERMISSOES.REGISTRAR_ENTRADAS,
  PERMISSOES.REGISTRAR_SAIDAS
];

PERMISSOES_POR_PERFIL[PERFIS.COMUM] = [
  PERMISSOES.CONSULTAR_PRODUTOS,
  PERMISSOES.CONSULTAR_ESTOQUE,
  PERMISSOES.CONSULTAR_HISTORICO
];

// ---------- Verificação ----------
// Retorna true somente se o perfil existir e possuir a permissão informada.
function temPermissao(perfil, permissao) {
  const lista = PERMISSOES_POR_PERFIL[perfil];
  return Array.isArray(lista) && lista.indexOf(permissao) !== -1;
}

// Lista as informações das permissões que o perfil possui.
function listarPermissoesDoPerfil(perfil) {
  return PERMISSOES_INFO.filter(function (info) {
    return temPermissao(perfil, info.permissao);
  });
}
