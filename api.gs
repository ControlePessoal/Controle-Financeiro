// api.gs — porta de entrada (doPost) para o front hospedado fora do Apps Script (GitHub Pages)
// Não altera o doGet (webapp.gs): o sistema pelo link do Apps Script continua funcionando igual.
//
// O front envia  POST text/plain  { "fn": "finDashboard", "args": ["<token>", "2026-11"] }
// e recebe       { "r": <resultado> }   ou   { "__erro": "mensagem" }.
// Só as funções da lista abaixo podem ser chamadas. Cada uma já valida o token da sessão (finAuth_),
// exceto finLogin (que gera o token). Funções de menu (MANUAL_*, GATILHOS_*, criarPlanilha...) NÃO entram.

// Lista montada só na hora do uso (evita erro de ordem de carregamento dos arquivos do projeto).
function finApiMapa_() {
  return {
    // auth.gs
    finLogin: finLogin, finLogout: finLogout, finUsuarios: finUsuarios, finUsuarioCriar: finUsuarioCriar,
    finUsuarioStatus: finUsuarioStatus, finSenha: finSenha,
    // cadastro.gs / pesquisa.gs / dashboard.gs
    finCategorias: finCategorias, finSalvar: finSalvar, finExcluir: finExcluir,
    finPesquisar: finPesquisar, finDashboard: finDashboard,
    // dados.gs
    finConfig: finConfig, finCfgSalvar: finCfgSalvar, finSyncSet: finSyncSet, finSincRpc: finSincRpc,
    finContracheque: finContracheque, finContrachequeSalvar: finContrachequeSalvar,
    finEmprestimos: finEmprestimos, finEmprestimoSalvar: finEmprestimoSalvar, finEmprestimoExcluir: finEmprestimoExcluir,
    finInstalarAnt: finInstalarAnt,
    finOrcamento: finOrcamento, finOrcFixaSalvar: finOrcFixaSalvar, finOrcVarSalvar: finOrcVarSalvar,
    finResumo: finResumo, finPlanoDetalhe: finPlanoDetalhe,
    // quitacao.gs
    finAntecipar: finAntecipar, finAntecipacoes: finAntecipacoes, finAntecipExcluir: finAntecipExcluir,
    finConfigSalvar: finConfigSalvar, finDividas: finDividas, finDividasTudo: finDividasTudo,
    // cartao.gs
    finCartao: finCartao, finCartaoSalvar: finCartaoSalvar, finCartaoQuitar: finCartaoQuitar, finCartaoExcluir: finCartaoExcluir,
    // reset.gs
    finResetar: finResetar
  };
}

function doPost(e) {
  let saida;
  try {
    const bruto = e && e.postData && e.postData.contents;
    if (!bruto || bruto.length > 200000) throw new Error('Requisição inválida.');
    const corpo = JSON.parse(bruto);
    const fn = String(corpo.fn || '');
    const args = Array.isArray(corpo.args) ? corpo.args : [];
    const mapa = finApiMapa_();
    if (!Object.prototype.hasOwnProperty.call(mapa, fn) || args.length > 8) throw new Error('Acesso negado.');
    saida = { r: mapa[fn].apply(null, args) };
  } catch (err) {
    Logger.log('doPost: ' + (err && err.message));
    saida = { __erro: String((err && err.message) || 'Erro interno.') };
  }
  return ContentService.createTextOutput(JSON.stringify(saida)).setMimeType(ContentService.MimeType.JSON);
}
