const $ = id => document.getElementById(id);
const brl = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pct = v => (Number(v || 0) * 100).toFixed(1).replace('.', ',') + '%';
const dec = v => String(v == null ? '' : v).replace('.', ',');
const falha = e => '<p class="neg">' + esc((e && e.message) || 'Não foi possível carregar.') + '</p>';
const msg = (id, ok, txt) => { const m = $(id); if (m) { m.textContent = txt; m.className = ok ? 'pos' : 'neg'; } };
const ADM = () => PERFIL === 'ADMIN';
let T = '', PERFIL = '', CATS = {}, DV = null, EM = null, ORC = null, CC = null, EDIT = 0;
let OM = new Date().getMonth(), OV = 'mes';   // Orçamento: mês exibido e modo ('mes' | 'ano')

const VIEWS = ['dash', 'resumo', 'novo', 'busca', 'orc', 'div', 'cc', 'cfg'];
const TITULOS = {
  dash: ['Painel financeiro', 'Acompanhe suas receitas, despesas e seu saldo.'],
  resumo: ['Resumo do mês', 'Visão geral do orçamento e das dívidas.'],
  novo: ['Novo lançamento', 'Registre uma entrada ou saída do seu dinheiro.'],
  busca: ['Pesquisar lançamentos', 'Encontre suas movimentações financeiras.'],
  orc: ['Orçamento mensal', 'Despesas fixas, variáveis e parcelas mês a mês.'],
  div: ['Controle de dívidas', 'Organize seus empréstimos e acompanhe sua quitação.'],
  cc: ['Contracheque', 'Verbas do holerite e margem consignável.'],
  cfg: ['Configurações', 'Parâmetros, usuários e manutenção do sistema.']
};

const rpc = (fn, ...a) => SF.chamar(fn, [T, ...a])
  .catch(e => { if (/Sessão/i.test(e.message || '')) sair(); throw e; });

/* Sessão guardada só nesta aba (sessionStorage), com o mesmo prazo do servidor (6 h). */
const SESS = 'sf_sessao';
function sessSalvar() { try { sessionStorage.setItem(SESS, JSON.stringify({ t: T, p: PERFIL, exp: Date.now() + 6 * 3600 * 1000 })); } catch (e) {} }
function sessLimpar() { try { sessionStorage.removeItem(SESS); } catch (e) {} }

function sair() {
  if (T) SF.chamar('finLogout', [T]).catch(() => {});
  T = ''; PERFIL = ''; sessLimpar(); $('app').hidden = true; $('login').hidden = false;
}
menuToggle(false);
function aoLogar(r) {
  T = r.token; PERFIL = r.perfil; sessSalvar(); $('login').hidden = true; $('app').hidden = false;
  document.querySelectorAll('[data-adm]').forEach(e => { e.hidden = !ADM(); });
  iniciar();
}

async function iniciar() {
  const h = new Date(), p = n => String(n).padStart(2, '0');
  $('nData').value = h.getFullYear() + '-' + p(h.getMonth() + 1) + '-' + p(h.getDate());
  $('dMes').value = $('bMes').value = $('nData').value.slice(0, 7);
  OM = h.getMonth();
  navegar('dash');
  try { CATS = await rpc('finCategorias'); trocarTipo(); } catch (e) {}
}

function navegar(v) {
  menuToggle(false); $('abTitle').textContent = TITULOS[v][0];
  VIEWS.forEach(id => { $(id).hidden = id !== v; });
  document.querySelectorAll('nav button[data-v]').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  $('pageTitle').textContent = TITULOS[v][0]; $('pageSubtitle').textContent = TITULOS[v][1];
  $('welcome').hidden = v !== 'dash'; $('topbar').hidden = v === 'dash';
  $('pageIco').innerHTML = document.querySelector('nav button[data-v="' + v + '"] .ico').innerHTML;
  if (v === 'dash') painel(); if (v === 'busca') buscar(); if (v === 'div') dividas();
  if (v === 'resumo') resumo(); if (v === 'orc') orcamento(); if (v === 'cc') contracheque(); if (v === 'cfg') config();
}
document.querySelectorAll('nav button[data-v]').forEach(b => b.onclick = () => navegar(b.dataset.v));

function trocarTipo() { $('nCat').innerHTML = (CATS[$('nTipo').value] || []).map(c => '<option>' + esc(c) + '</option>').join(''); }
$('nTipo').onchange = trocarTipo; $('dMes').onchange = painel;

/* ── Painel / lançamentos ── */
const MES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const PAL = ['#16834a', '#3b82a0', '#e0a526', '#8e6bbf', '#dc7a45', '#9aa9a0'];
const ICO = {
  up: '<svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>',
  wal: '<svg viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h13v4"/><path d="M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2z"/><circle cx="16.5" cy="14.5" r="1"/></svg>',
  doc: '<svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>'
};
const delta = (cur, prev, inv) => {
  if (!prev) return '<span class="dl">Sem mês anterior para comparar</span>';
  const v = (cur - prev) / prev, bom = inv ? v <= 0 : v >= 0;
  return '<span class="dl ' + (bom ? 'good' : 'bad') + '">' + (v >= 0 ? '▲ ' : '▼ ') +
    Math.abs(v * 100).toFixed(1).replace('.', ',') + '% vs mês anterior</span>';
};

async function painel() {
  const hr = new Date().getHours();
  document.querySelector('#welcome h1').textContent = hr < 12 ? 'Bom dia!' : hr < 18 ? 'Boa tarde!' : 'Boa noite!';
  document.querySelector('#welcome p').textContent =
    new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) + ' · veja como estão suas finanças.';
  try {
    const d = await rpc('finDashboard', $('dMes').value);
    const taxa = d.receitas > 0 ? d.saldo / d.receitas : null;
    const comp = d.receitas > 0 ? d.parcelas / d.receitas : null;
    const k = (cls, ic, t, v, vc, sub) => '<div class="kpi ' + cls + '"><span class="kpi-ico">' + ic + '</span><div><small>' +
      esc(t) + '</small><b class="' + vc + '">' + brl(v) + '</b>' + sub + '</div></div>';

    $('cards').innerHTML =
      k('', ICO.up, 'Receitas do mês', d.receitas, 'pos', delta(d.receitas, d.antReceitas, false)) +
      k('neg-k', ICO.down, 'Despesas do mês', d.despesas, 'neg', delta(d.despesas, d.antDespesas, true)) +
      k('', ICO.wal, 'Saldo do mês', d.saldo, d.saldo < 0 ? 'neg' : 'pos', '<span class="dl">' +
        (taxa == null ? 'Sem receitas no período' : taxa < 0 ? 'Gastos ' + pct(-taxa) + ' acima da renda' : 'Você guardou ' + pct(taxa) + ' da renda') + '</span>') +
      k('neu', ICO.doc, 'Dívida total', d.divida, '', '<span class="dl">' + brl(d.parcelas) + '/mês em parcelas</span>');

    /* Colunas por mês */
    const an = d.anual || [], mSel = Number($('dMes').value.slice(5, 7));
    const m2 = Math.max(1, ...an.map(a => Math.max(a.rec || 0, a.des || 0)));
    const h = v => v > 0 ? Math.max(v / m2 * 100, 2) : 0;
    $('ano').innerHTML = '<div class="cols">' + an.map(a => '<div class="col' + (a.m === mSel ? ' sel' : '') + '" title="' + MES[a.m - 1] +
      ' — Receitas: ' + brl(a.rec) + ' | Despesas: ' + brl(a.des) + '"><i class="r" style="height:' + h(a.rec) + '%"></i><i style="height:' + h(a.des) + '%"></i></div>').join('') +
      '</div><div class="col-l">' + an.map(a => '<span' + (a.m === mSel ? ' class="sel"' : '') + '>' + MES[a.m - 1] + '</span>').join('') + '</div>';

    /* Rosca de categorias */
    const cats = Object.entries(d.cats || {}).sort((a, b) => b[1] - a[1]);
    if (!cats.length) $('cats').innerHTML = '<div class="empty">Nenhuma despesa lançada neste mês.</div>';
    else {
      const top = cats.slice(0, 5), resto = cats.slice(5).reduce((s, c) => s + c[1], 0);
      if (resto > 0) top.push(['Outras', resto]);
      const tot = cats.reduce((s, c) => s + c[1], 0) || 1; let ac = 0;
      const stops = top.map(([, v], i) => { const a = ac / tot * 100; ac += v; return PAL[i] + ' ' + a + '% ' + (ac / tot * 100) + '%'; }).join(',');
      $('cats').innerHTML = '<div class="donut-w"><div class="donut" style="background:conic-gradient(' + stops + ')"><div><small>Total</small><b>' + brl(tot) + '</b></div></div>' +
        '<div class="leg">' + top.map(([n, v], i) => '<div><i style="background:' + PAL[i] + '"></i><span>' + esc(n) + '</span><b>' + brl(v) + '</b><em>' + Math.round(v / tot * 100) + '%</em></div>').join('') + '</div></div>';
    }

    /* Últimos lançamentos */
    const rc = d.recentes || [];
    $('recentes').innerHTML = rc.length ? rc.map(x => { const r = x.tipo === 'Receita';
      return '<div class="rl"><span class="rl-i ' + (r ? 'r' : 'd') + '">' + (r ? '↑' : '↓') + '</span><div><b>' + esc(x.desc || x.cat) + '</b><small>' +
        x.data.split('-').reverse().join('/') + ' · ' + esc(x.cat) + '</small></div><span class="' + (r ? 'pos' : 'neg') + '">' + (r ? '+ ' : '− ') + brl(x.valor) + '</span></div>'; }).join('')
      : '<div class="empty">Nenhum lançamento neste mês.<br><button class="link" style="margin-top:8px" onclick="navegar(\'novo\')">Fazer o primeiro lançamento →</button></div>';

    /* Dívidas */
    const cor = comp == null ? 'var(--primary)' : comp > 0.35 ? 'var(--neg)' : comp >= 0.25 ? '#e0a526' : 'var(--pos)';
    const avis = comp == null ? '' : comp > 0.35 ? 'Comprometimento alto (acima de 35%)' : comp >= 0.25 ? 'Atenção (entre 25% e 35%)' : 'Saudável (abaixo de 25%)';
    $('divBox').innerHTML = (d.divida > 0 || d.parcelas > 0)
      ? '<small style="color:var(--muted);font-weight:600">Saldo para quitar hoje</small><div class="debt-big">' + brl(d.divida) + '</div>' +
        '<div class="stat"><span>Parcelas por mês</span><b>' + brl(d.parcelas) + '</b></div>' +
        '<div class="stat"><span>Renda do mês comprometida</span><b>' + (comp == null ? '—' : pct(comp)) + '</b></div>' +
        (comp == null ? '' : '<div class="prog"><i style="width:' + Math.min(100, comp * 100) + '%;background:' + cor + '"></i></div><small style="color:var(--muted);font-size:11px">' + avis + '</small>')
      : '<div class="empty">Nenhuma dívida cadastrada.</div>';
  } catch (e) { $('cards').innerHTML = '<p>Não foi possível carregar o painel.</p>'; }
}

async function salvar() {
  const m = $('nMsg'), b = $('sBtn');
  if (!$('nData').value || !$('nValor').value.trim()) { m.textContent = 'Informe a data e o valor.'; m.className = 'neg'; return; }
  b.disabled = true; b.textContent = 'Salvando...';
  try {
    const r = await rpc('finSalvar', { tipo: $('nTipo').value, data: $('nData').value, cat: $('nCat').value,
      desc: $('nDesc').value, valor: $('nValor').value, pag: $('nPag').value });
    m.textContent = r.ok ? 'Lançamento salvo com sucesso!' : r.msg; m.className = r.ok ? 'pos' : 'neg';
    if (r.ok) { $('nDesc').value = ''; $('nValor').value = ''; $('nPag').value = ''; }
  } catch (e) { m.textContent = 'Erro ao salvar. Tente novamente.'; m.className = 'neg'; }
  b.disabled = false; b.textContent = 'Salvar lançamento';
}

async function buscar() {
  try {
    const r = await rpc('finPesquisar', { mes: $('bMes').value, tipo: $('bTipo').value, texto: $('bTexto').value });
    $('lista').innerHTML = '<p style="color:var(--muted)">' + r.total + ' lançamento(s) · saldo ' + brl(r.saldo) + '</p>' +
      (r.itens.length ? r.itens.map(x => '<div class="it"><div><b>' + esc(x.desc || x.cat) + '</b><br><small>' +
        x.data.split('-').reverse().join('/') + ' · ' + esc(x.cat) + '</small></div><div style="text-align:right"><b class="' +
        (x.tipo === 'Receita' ? 'pos' : 'neg') + '">' + brl(x.valor) + '</b><br><button onclick="excluir(\'' + esc(x.id) +
        '\')">Excluir</button></div></div>').join('') : '<p>Nenhum lançamento encontrado.</p>');
  } catch (e) { $('lista').innerHTML = '<p>Não foi possível pesquisar.</p>'; }
}

async function excluir(id) {
  if (!confirm('Deseja realmente excluir este lançamento?')) return;
  try { await rpc('finExcluir', id); buscar(); } catch (e) { alert('Não foi possível excluir.'); }
}

/* ── Resumo (aba Resumo) ── */
async function resumo() {
  const box = $('rBox'); box.innerHTML = '<p>Carregando...</p>';
  try {
    const d = await rpc('finResumo');
    const c = (t, v, k) => '<div class="c"><small>' + esc(t) + '</small><b class="' + (k || '') + '">' + v + '</b></div>';
    const sem = d.perc > 0.35 ? '🔴 Acima de 35%: comprometimento alto' : d.perc >= 0.25 ? '🟡 Atenção: entre 25% e 35%' : '🟢 Saudável (abaixo de 25%)';
    const cats = d.cats.slice().sort((a, b) => b.valor - a.valor), mx = cats.length ? cats[0].valor : 1;
    const m2 = Math.max(1, ...d.anual.map(a => Math.max(a.rec, a.des)));
    box.innerHTML =
      '<div class="tool"><div><h2>Mês de referência: ' + String(d.mes).padStart(2, '0') + '/' + d.ano + '</h2><p>Para trocar o mês, use Config.</p></div></div>' +
      '<div class="cards">' + c('Receitas', brl(d.rec), 'pos') + c('Despesas totais', brl(d.des), 'neg') + c('Parcelas de dívidas', brl(d.parc)) +
        c('Saldo do mês', brl(d.saldo), d.saldo < 0 ? 'neg' : 'pos') + '</div>' +
      '<div class="cards">' + c('Renda comprometida com parcelas', pct(d.perc)) + c('Dívida total (quitar hoje)', brl(d.divida)) +
        c('Parcelas ativas por mês', brl(d.parcelas)) + c('Juros se não antecipar nada', brl(d.juros)) + '</div>' +
      '<p style="margin:-8px 0 22px;font-weight:600">' + sem + '</p>' +
      '<div class="grid2"><div class="panel"><h2>Gastos do mês por categoria</h2><p class="sub">Fixas, variáveis e parcelas.</p>' +
        (cats.length ? cats.map(x => '<div class="b"><span>' + esc(x.nome) + '</span><i style="width:' + (x.valor / mx * 45) + '%"></i><span>' + brl(x.valor) + '</span></div>').join('') : '<p>Sem despesas no mês.</p>') + '</div>' +
      '<div class="panel"><h2>Receitas x despesas no ano</h2><p class="sub">Orçamento mês a mês.</p>' +
        '<div class="legend"><span><i style="background:#55b982"></i>Receitas</span><span><i style="background:var(--primary)"></i>Despesas</span></div><div id="anoResumo">' +
        d.anual.map(a => '<div class="b"><span>' + String(a.m).padStart(2, '0') + '</span><div><i class="r" style="width:' + (a.rec / m2 * 100) + '%"></i><i style="width:' + (a.des / m2 * 100) + '%"></i></div></div>').join('') + '</div></div></div>' +
      '<div class="panel wide"><h2>Dívidas e plano</h2>' +
        '<div class="b"><span>Empréstimo mais caro</span><span></span><span>' + (d.caro ? esc(d.caro.nome) + ' — ' + (d.caro.taxa * 100).toFixed(2).replace('.', ',') + '% a.m.' : '-') + '</span></div>' +
        '<div class="b"><span>Prioridade 1 para quitar</span><span></span><span>' + esc(d.prio || '-') + '</span></div>' +
        '<div class="b"><span>Extra mensal / à vista</span><span></span><span>' + brl(d.extra) + ' / ' + brl(d.vista) + '</span></div>' +
        '<div class="b"><span>Líquido habitual do contracheque</span><span></span><span>' + brl(d.liquido) + '</span></div>' +
        '<div class="b"><span>Consignados ÷ base (aprox.)</span><span></span><span>' + pct(d.consig) + '</span></div></div>';
  } catch (e) { box.innerHTML = falha(e); }
}

/* ── Orçamento (aba Orçamento): um mês por vez, com Anterior/Próximo, ou ano todo ── */
async function orcamento() {
  const box = $('oBox'); box.innerHTML = '<p>Carregando...</p>';
  try { ORC = await rpc('finOrcamento'); orcRender(); } catch (e) { box.innerHTML = falha(e); }
}
function orcSet(m) { OM = Number(m); orcRender(); }
function orcMover(n) { OM += n; orcRender(); }
function orcModo(v) { OV = v; orcRender(); }

function orcRender() {
  const box = $('oBox'), d = ORC; if (!d) return;
  const n = d.hdr.length, ano = OV === 'ano';
  OM = Math.min(Math.max(OM, 0), n - 1);
  const soma = a => a.reduce((x, y) => x + y, 0);
  const lin = (nome, arr, extra, cls, fmt) => ano
    ? '<tr class="' + (cls || '') + '"><td>' + esc(nome) + (extra || '') + '</td>' +
      arr.map(v => '<td>' + (fmt ? fmt(v) : brl(v)) + '</td>').join('') + '<td>' + (fmt ? '' : brl(soma(arr))) + '</td></tr>'
    : '<tr class="' + (cls || '') + '"><td>' + esc(nome) + (extra || '') + '</td><td>' + (fmt ? fmt(arr[OM]) : brl(arr[OM])) +
      '</td><td>' + (fmt ? '' : brl(soma(arr))) + '</td></tr>';
  const sec = t => '<tr class="sec"><td colspan="' + (ano ? n + 2 : 3) + '">' + t + '</td></tr>';
  const ed = (tp, i) => ADM() ? ' <button class="mini" onclick="orcEditar(\'' + tp + '\',' + i + ')">Editar</button>' : '';

  const nav = '<div class="mnav">' +
    (ano ? '' :
      '<button class="mnb" onclick="orcMover(-1)"' + (OM <= 0 ? ' disabled' : '') + ' aria-label="Mês anterior">‹ Anterior</button>' +
      '<select id="oMesSel" aria-label="Mês" onchange="orcSet(this.value)">' +
        d.hdr.map((h, i) => '<option value="' + i + '"' + (i === OM ? ' selected' : '') + '>' + esc(h) + '</option>').join('') + '</select>' +
      '<button class="mnb" onclick="orcMover(1)"' + (OM >= n - 1 ? ' disabled' : '') + ' aria-label="Próximo mês">Próximo ›</button>') +
    '<span class="sp"></span>' +
    '<button class="mnb' + (ano ? ' act' : '') + '" onclick="orcModo(\'' + (ano ? 'mes' : 'ano') + '\')">' + (ano ? 'Ver por mês' : 'Ver ano todo') + '</button></div>';

  const thead = ano
    ? '<th>Categoria</th>' + d.hdr.map(h => '<th>' + esc(h) + '</th>').join('') + '<th>Total</th>'
    : '<th>Categoria</th><th>' + esc(d.hdr[OM]) + '</th><th>Total do ano</th>';

  box.innerHTML = '<div id="oEd"></div>' + nav + '<div class="tw"><table class="tbl' + (ano ? '' : ' mes') + '"><thead><tr>' + thead + '</tr></thead><tbody>' +
    sec('RECEITAS (vêm de Config e Contracheque)') + d.rec.map(x => lin(x.nome, x.meses)).join('') + lin('TOTAL DE RECEITAS', d.tot.rec, '', 'tot') +
    sec('DESPESAS FIXAS') + d.fixas.map(x => lin(x.nome, x.meses, ed('f', x.idx))).join('') +
    sec('DESPESAS VARIÁVEIS') + d.vars.map(x => lin(x.nome, x.meses, ed('v', x.idx))).join('') +
    sec('DÍVIDAS (automático a partir dos empréstimos)') + d.divs.map(x => lin(x.nome, x.meses)).join('') +
    lin('TOTAL DE DESPESAS', d.tot.des, '', 'tot') + lin('SALDO DO MÊS', d.tot.saldo, '', 'tot') +
        lin('% da renda comprometida com parcelas', d.tot.perc, '', 'tot', pct) +
    sec('INFORMATIVO (não entra nos totais)') + lin('Parcelas de compras no cartão já cadastradas', d.cartao || []) +
    '</tbody></table></div>';
}

function orcEditar(tp, i) {
  const x = (tp === 'f' ? ORC.fixas : ORC.vars)[i];
  const meses = ORC.hdr.map((h, m) => {
    const val = tp === 'f' ? (x.ov[m] ? dec(x.meses[m]) : '') : (x.meses[m] ? dec(x.meses[m]) : '');
    return '<div class="field"><label>' + h + '</label><input id="oM' + m + '" inputmode="decimal" value="' + val + '" placeholder="' + (tp === 'f' ? dec(x.padrao) : '0') + '"></div>';
  }).join('');
  $('oEd').innerHTML = '<div class="panel wide"><h2>Editar: ' + esc(x.nome) + '</h2>' +
    (tp === 'f'
      ? '<p class="sub" style="margin-bottom:14px">Meses em branco usam o valor padrão.</p><div class="form-grid" style="margin-bottom:16px"><div class="field"><label for="oNome">Nome</label><input id="oNome" maxlength="60" value="' + esc(x.nome) + '"></div><div class="field"><label for="oPad">Valor padrão (R$)</label><input id="oPad" inputmode="decimal" value="' + dec(x.padrao) + '"></div></div>'
      : '<p class="sub" style="margin-bottom:14px">Digite o gasto de cada mês (em branco = sem valor).</p>') +
    '<div class="m12">' + meses + '</div><p id="oMsg" role="status" style="font-weight:600;margin:14px 0 0"></p>' +
    '<div class="par" style="margin-top:6px"><button class="btn" onclick="orcSalvar(\'' + tp + '\',' + i + ')">Salvar</button><button class="btn sec" onclick="$(\'oEd\').innerHTML=\'\'">Cancelar</button></div></div>';
  $('oEd').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
async function orcSalvar(tp, i) {
  const meses = ORC.hdr.map((_, m) => $('oM' + m).value);
  try {
    const r = tp === 'f' ? await rpc('finOrcFixaSalvar', { idx: i, nome: $('oNome').value, padrao: $('oPad').value, meses })
                          : await rpc('finOrcVarSalvar', { idx: i, meses });
    if (r.ok) orcamento(); else msg('oMsg', false, r.msg);
  } catch (e) { msg('oMsg', false, 'Erro ao salvar.'); }
}

/* ── Contracheque ── */
async function contracheque() {
  const box = $('ccBox');
  if (!ADM()) { box.innerHTML = '<p>Acesso restrito ao administrador.</p>'; return; }
  box.innerHTML = '<p>Carregando...</p>';
  try { CC = await rpc('finContracheque'); ccRender(); } catch (e) { box.innerHTML = falha(e); }
}
function ccRender() {
  const r = CC.res, c = (t, v, k) => '<div class="c"><small>' + esc(t) + '</small><b class="' + (k || '') + '">' + v + '</b></div>';
  const linhas = CC.itens.map((x, i) => '<tr><td><input data-k="verba" value="' + esc(x.verba) + '" maxlength="60"></td>' +
    '<td><select data-k="tipo"><option' + (x.tipo === 'Vencimento' ? ' selected' : '') + '>Vencimento</option><option' + (x.tipo === 'Desconto' ? ' selected' : '') + '>Desconto</option></select></td>' +
    '<td><input data-k="valor" inputmode="decimal" value="' + dec(Number(x.valor).toFixed(2)) + '"></td>' +
    '<td><select data-k="rec"><option' + (x.rec === 'Sim' ? ' selected' : '') + '>Sim</option><option' + (x.rec === 'Não' ? ' selected' : '') + '>Não</option></select></td>' +
    '<td><button class="mini" style="color:var(--neg)" onclick="ccDel(' + i + ')">Remover</button></td></tr>').join('');
  $('ccBox').innerHTML =
    '<div class="cards">' + c('Total de vencimentos', brl(r.venc), 'pos') + c('Total de descontos', brl(r.desc), 'neg') + c('Líquido do mês', brl(r.liq)) + c('Líquido habitual', brl(r.hab)) + '</div>' +
    '<div class="cards">' + c('Consignados no contracheque', brl(r.cons)) + c('Consignados cadastrados', brl(r.cad)) + c('Diferença', brl(r.dif), Math.abs(r.dif) > 0.01 ? 'neg' : 'pos') +
      c('Consignados ÷ base (limite usual 35%)', pct(r.perc), r.perc >= 0.35 ? 'neg' : '') + '</div>' +
    '<div class="panel"><h2>Verbas do contracheque</h2><p class="sub" style="margin-bottom:14px">Marque "Recorrente = Não" nas verbas pontuais (ficam fora do líquido habitual). Descontos cujo nome começa com EMPREST são tratados como consignados.</p>' +
    '<div class="field" style="max-width:300px;margin-bottom:14px"><label for="ccRef">Referência (ex.: 09/2026)</label><input id="ccRef" maxlength="60" value="' + esc(CC.ref === '—' ? '' : CC.ref) + '"></div>' +
    '<div class="tw"><table class="tbl"><thead><tr><th>Verba</th><th>Tipo</th><th>Valor (R$)</th><th>Recorrente?</th><th></th></tr></thead><tbody id="ccT">' + linhas + '</tbody></table></div>' +
    '<p id="ccMsg" role="status" style="font-weight:600;margin:14px 0 0"></p>' +
    '<div class="par" style="margin-top:6px"><button class="btn sec" onclick="ccAdd()">＋ Adicionar verba</button><button class="btn" onclick="ccSalvar()">Salvar contracheque</button></div></div>';
}
function ccLer() {
  CC.itens = [...document.querySelectorAll('#ccT tr')].map(tr => {
    const g = k => tr.querySelector('[data-k="' + k + '"]').value;
    return { verba: g('verba'), tipo: g('tipo'), valor: g('valor'), rec: g('rec') };
  });
  CC.ref = $('ccRef').value;
}
function ccAdd() { ccLer(); if (CC.itens.length >= 20) { alert('Máximo de 20 verbas.'); return; } CC.itens.push({ verba: '', tipo: 'Vencimento', valor: 0, rec: 'Sim' }); ccRender(); }
function ccDel(i) { ccLer(); CC.itens.splice(i, 1); ccRender(); }
async function ccSalvar() {
  ccLer();
  try {
    const r = await rpc('finContrachequeSalvar', { itens: CC.itens, ref: CC.ref });
    if (r.ok) contracheque().then(() => msg('ccMsg', true, 'Contracheque salvo.')); else msg('ccMsg', false, r.msg);
  } catch (e) { msg('ccMsg', false, 'Erro ao salvar.'); }
}

/* ── Config, usuários e reset ── */
async function config() {
  const box = $('cBox'); box.innerHTML = '<p>Carregando...</p>';
  let h = '';
  try {
    if (ADM()) {
      const c = await rpc('finConfig');
      h += '<div class="panel wide"><h2>Configurações gerais</h2><p class="sub" style="margin-bottom:16px">Estes valores alimentam Orçamento, Resumo e o plano de quitação.</p><div class="form-grid">' +
        '<div class="field"><label for="cAno">Ano do orçamento</label><input id="cAno" type="number" value="' + esc(c.ano) + '"></div>' +
        '<div class="field"><label for="cMes">Mês de referência (1-12)</label><input id="cMes" type="number" min="1" max="12" value="' + esc(c.mes) + '"><label class="chk"><input type="checkbox" id="cMesAuto"' + (c.mesAuto ? ' checked' : '') + '> Usar o mês atual automaticamente</label></div>' +
        '<div class="field"><label for="cSal">Salário líquido mensal (R$)</label><input id="cSal" inputmode="decimal" value="' + dec(c.salario) + '"><label class="chk"><input type="checkbox" id="cSalAuto"' + (c.salarioAuto ? ' checked' : '') + '> Usar o líquido habitual do Contracheque</label></div>' +
        '<div class="field"><label for="cOut">Outras rendas mensais (R$)</label><input id="cOut" inputmode="decimal" value="' + dec(c.outras) + '"></div>' +
        '<div class="field"><label for="cRend">Rendimento dos investimentos (% ao mês)</label><input id="cRend" inputmode="decimal" value="' + dec(c.rend) + '"></div>' +
        '<div class="field"><label for="cExtra">Extra mensal para quitar dívidas (R$)</label><input id="cExtra" inputmode="decimal" value="' + dec(c.extra) + '"></div>' +
        '<div class="field"><label for="cVista">Dinheiro à vista disponível (R$)</label><input id="cVista" inputmode="decimal" value="' + dec(c.vista) + '"></div>' +
        '<div class="field"><label for="cLiq">O salário já vem líquido dos consignados?</label><select id="cLiq"><option' + (c.liquido === 'Sim' ? ' selected' : '') + '>Sim</option><option' + (c.liquido === 'Não' ? ' selected' : '') + '>Não</option></select></div>' +
        '<div class="field full"><p style="margin:0;color:var(--muted)">Sobra do mês de referência (só consulta): <b>' + brl(c.sobra) + '</b></p>' +
        '<label class="chk"><input type="checkbox" id="cSync"' + (c.sync ? ' checked' : '') + '> Sincronizar lançamentos com o Orçamento automaticamente</label></div></div>' +
        '<p id="cMsg" role="status" style="font-weight:600;margin:14px 0 0"></p><div class="par" style="margin-top:6px"><button class="btn" onclick="cfgSalvar()">Salvar configurações</button><button class="btn sec" onclick="cfgSinc()">Sincronizar agora</button></div></div>';
    }
    h += '<div class="panel wide"><h2>Minha senha</h2><div class="form-grid"><div class="field"><label for="sAt">Senha atual</label><input id="sAt" type="password" autocomplete="current-password"></div>' +
      '<div class="field"><label for="sNv">Nova senha (6+ caracteres)</label><input id="sNv" type="password" autocomplete="new-password"></div></div>' +
      '<p id="sMsg" role="status" style="font-weight:600;margin:14px 0 0"></p><button class="btn" onclick="minhaSenha()">Alterar senha</button></div>';
    if (ADM()) {
      const us = await rpc('finUsuarios');
      h += '<div class="panel wide"><h2>Usuários</h2><p class="sub" style="margin-bottom:12px">ADMIN edita tudo; OPERADOR lança, pesquisa e consulta.</p>' +
        us.map(u => '<div class="it"><div><b>' + esc(u.usuario) + '</b> · ' + esc(u.nome) + '<br><small>' + esc(u.perfil) + ' · ' + (u.ativo === 'SIM' ? 'ativo' : 'inativo') + '</small></div><div style="text-align:right">' +
          '<button class="ed" data-u="' + esc(u.usuario) + '" onclick="usuSenha(this.dataset.u)">Nova senha</button>' +
          '<button data-u="' + esc(u.usuario) + '" data-a="' + (u.ativo === 'SIM' ? 'NÃO' : 'SIM') + '" onclick="usuStatus(this.dataset.u,this.dataset.a)">' + (u.ativo === 'SIM' ? 'Desativar' : 'Ativar') + '</button></div></div>').join('') +
        '<h2 style="margin-top:20px">Novo usuário</h2><div class="form-grid" style="margin-top:12px"><div class="field"><label for="uUsu">Usuário (login)</label><input id="uUsu" maxlength="20"></div>' +
        '<div class="field"><label for="uNome">Nome</label><input id="uNome" maxlength="60"></div><div class="field"><label for="uSen">Senha (6+)</label><input id="uSen" type="password" autocomplete="new-password"></div>' +
        '<div class="field"><label for="uPerf">Perfil</label><select id="uPerf"><option>OPERADOR</option><option>ADMIN</option></select></div></div>' +
        '<p id="uMsg" role="status" style="font-weight:600;margin:14px 0 0"></p><button class="btn" onclick="usuCriar()">Criar usuário</button></div>';
      h += '<div class="panel wide danger"><h2>Zona de perigo: zerar dados</h2><p class="sub" style="margin-bottom:12px">Use antes de transferir a planilha para outra pessoa. A estrutura (abas, fórmulas, formatação) é mantida.</p>' +
        [['lanc', 'Lançamentos'], ['antec', 'Antecipações'], ['orc', 'Orçamento (valores fixos e variáveis)'], ['emp', 'Empréstimos cadastrados'], ['contra', 'Contracheque'], ['cfg', 'Configurações (volta ao padrão)'], ['usuarios', 'Usuários (apaga todos e cria ADMIN novo com senha nova)']]
          .map(([k, t]) => '<label class="chk"><input type="checkbox" id="rs_' + k + '"> ' + t + '</label>').join('') +
        '<div class="par" style="margin:6px 0 14px"><button class="mini" style="margin:0" onclick="rsMarcar(true)">Marcar tudo (transferência)</button><button class="mini" style="margin:0" onclick="rsMarcar(false)">Desmarcar</button></div>' +
        '<div class="field"><label for="rsConf">Digite CONFIRMO para liberar</label><input id="rsConf" autocomplete="off"></div>' +
        '<p id="rsMsg" role="status" style="font-weight:600;margin:14px 0 0"></p><button class="btn red" onclick="resetar()">Zerar dados selecionados</button></div>';
    }
    box.innerHTML = h;
  } catch (e) { box.innerHTML = falha(e); }
}
async function cfgSalvar() {
  try {
    const r = await rpc('finCfgSalvar', { ano: $('cAno').value, mes: $('cMes').value, mesAuto: $('cMesAuto').checked, salario: $('cSal').value,
      salarioAuto: $('cSalAuto').checked, outras: $('cOut').value, rend: $('cRend').value, extra: $('cExtra').value, vista: $('cVista').value, liquido: $('cLiq').value });
    if (r.ok) await rpc('finSyncSet', $('cSync').checked);
    r.ok ? config().then(() => msg('cMsg', true, 'Configurações salvas.')) : msg('cMsg', false, r.msg);
  } catch (e) { msg('cMsg', false, 'Erro ao salvar.'); }
}
async function cfgSinc() { try { await rpc('finSincRpc'); msg('cMsg', true, 'Orçamento atualizado com os lançamentos.'); } catch (e) { msg('cMsg', false, 'Erro ao sincronizar.'); } }
async function minhaSenha() {
  try { const r = await rpc('finSenha', '', $('sNv').value, $('sAt').value); msg('sMsg', r.ok, r.msg); if (r.ok) { $('sAt').value = ''; $('sNv').value = ''; } }
  catch (e) { msg('sMsg', false, 'Erro ao alterar a senha.'); }
}
async function usuCriar() {
  try {
    const r = await rpc('finUsuarioCriar', { usuario: $('uUsu').value, nome: $('uNome').value, senha: $('uSen').value, perfil: $('uPerf').value });
    r.ok ? config().then(() => msg('uMsg', true, r.msg)) : msg('uMsg', false, r.msg);
  } catch (e) { msg('uMsg', false, 'Erro ao criar usuário.'); }
}
async function usuStatus(u, a) { try { const r = await rpc('finUsuarioStatus', u, a); if (!r.ok) alert(r.msg); config(); } catch (e) { alert('Erro.'); } }
async function usuSenha(u) {
  const n = prompt('Nova senha para ' + u + ' (6+ caracteres):'); if (!n) return;
  try {
    let r = await rpc('finSenha', u, n, '');
    if (!r.ok && r.msg === 'Senha atual incorreta.') {      // é a própria conta: pede a senha atual
      const a = prompt('Essa é a sua conta. Digite a SENHA ATUAL:'); if (!a) return;
      r = await rpc('finSenha', u, n, a);
    }
    alert(r.msg);
  } catch (e) { alert('Erro ao alterar a senha.'); }
}
/* ── Zerar dados (zona de perigo) ── */
const RS_ITENS = ['lanc', 'antec', 'orc', 'emp', 'contra', 'cfg', 'usuarios'];
function rsMarcar(v) { RS_ITENS.forEach(k => { const c = $('rs_' + k); if (c) c.checked = v; }); }
async function resetar() {
  const escopo = {};
  RS_ITENS.forEach(k => { const c = $('rs_' + k); escopo[k] = !!(c && c.checked); });
  if (!RS_ITENS.some(k => escopo[k])) { msg('rsMsg', false, 'Marque pelo menos um item.'); return; }
  if ($('rsConf').value.trim() !== 'CONFIRMO') { msg('rsMsg', false, 'Digite CONFIRMO (maiúsculas) para continuar.'); return; }
  if (!confirm('Isto apaga os dados selecionados e não pode ser desfeito. Continuar?')) return;
  try {
    const r = await rpc('finResetar', { confirma: $('rsConf').value, escopo: escopo });
    if (!r.ok) { msg('rsMsg', false, r.msg); return; }
    if (r.senha) {   // usuários recriados: a sessão atual deixou de valer
      alert(r.log.join('\n') + '\n\nUsuário: ADMIN\nSenha inicial: ' + r.senha + '\n\nAnote agora e troque no primeiro acesso.');
      sair(); return;
    }
    alert(r.log.join('\n')); config();
  } catch (e) { msg('rsMsg', false, 'Erro ao zerar os dados.'); }
}

/* ── Compras parceladas no cartão ── */
let CP = null;
const mmaa = ym => { const p = String(ym).split('-'); return p[1] + '/' + p[0]; };

async function cartao() {
  if (!$('cpData').value) {
    const h = new Date(), p = n => String(n).padStart(2, '0');
    $('cpData').value = h.getFullYear() + '-' + p(h.getMonth() + 1) + '-' + p(h.getDate());
  }
  if (!$('cpMes').value) $('cpMes').value = $('cpData').value.slice(0, 7);
  try { CP = await rpc('finCartao'); cartaoRender(); }
  catch (e) { $('cpLista').innerHTML = falha(e); }
}

function cartaoRender() {
  const d = CP;
  $('cpTot').textContent = d.ativas + ' compra(s) em andamento · parcelas deste mês ' + brl(d.mesAtual) + ' · para quitar tudo ' + brl(d.aQuitar);
  $('cpPrev').innerHTML = d.ativas
    ? '<div class="panel"><h2>Parcelas nos próximos meses</h2><p class="sub" style="margin-bottom:12px">Quanto do cartão já está comprometido, mês a mês.</p>' +
      '<div class="tw"><table class="tbl"><thead><tr><th>Mês</th>' + d.prox.map(x => '<th>' + esc(x.mes) + '</th>').join('') +
      '</tr></thead><tbody><tr><td>Parcelas</td>' + d.prox.map(x => '<td>' + brl(x.valor) + '</td>').join('') + '</tr></tbody></table></div></div>'
    : '';
  $('cpLista').innerHTML = d.itens.length ? d.itens.map(x => {
    const fim = x.quitada || x.restantes === 0;
    const pc = fim ? 100 : Math.min(100, x.pagas / x.n * 100);
    const st = x.quitada ? 'Quitada antecipadamente'
      : x.restantes === 0 ? 'Todas as parcelas já foram pagas'
      : 'Faltam <b>' + x.restantes + '</b> de ' + x.n + ' parcelas (' + x.pagas + ' pagas) · última na fatura de ' + mmaa(x.ultima);
    return '<div class="it"' + (fim ? ' style="opacity:.65"' : '') + '><div><b>' + esc(x.desc) + '</b><br><small>' + esc(x.cartao || 'Cartão') +
      (x.data ? ' · compra em ' + x.data.split('-').reverse().join('/') : '') + ' · ' + x.n + 'x de ' + brl(x.parcela) + ' · 1ª em ' + mmaa(x.primeira) +
      '</small><br><small>' + st + '</small><div class="prog"><i style="width:' + pc + '%;background:var(--pos)"></i></div></div>' +
      '<div style="text-align:right"><b>' + brl(x.aQuitar) + '</b><br><small>para quitar</small><br>' +
      (fim ? '' : '<button class="ed" onclick="cartaoQuitar(\'' + esc(x.id) + '\')">Quitar</button>') +
      '<button onclick="cartaoExcluir(\'' + esc(x.id) + '\')">Excluir</button></div></div>';
  }).join('') : '<p>Nenhuma compra parcelada cadastrada.</p>';
}

function cartaoCalc() {
  const n = parseInt($('cpN').value, 10), t = num($('cpTotal').value), p = num($('cpParc').value), o = $('cpCalc');
  if (!(n >= 1)) { o.textContent = ''; return; }
  if (p > 0) o.textContent = n + 'x de ' + brl(p) + ' = ' + brl(p * n) + ' no total';
  else if (t > 0) o.textContent = n + 'x de ' + brl(Math.round(t / n * 100) / 100);
  else o.textContent = '';
}

async function cartaoSalvar() {
  try {
    const r = await rpc('finCartaoSalvar', { desc: $('cpDesc').value, cartao: $('cpCartao').value, data: $('cpData').value,
      total: $('cpTotal').value, n: $('cpN').value, parcela: $('cpParc').value, mes: $('cpMes').value });
    if (r.ok) {
      ['cpDesc', 'cpTotal', 'cpParc'].forEach(id => { $(id).value = ''; }); $('cpN').value = '1'; $('cpCalc').textContent = '';
      await cartao(); msg('cpMsg', true, 'Compra salva.');
    } else msg('cpMsg', false, r.msg);
  } catch (e) { msg('cpMsg', false, 'Erro ao salvar.'); }
}
async function cartaoQuitar(id) {
  if (!confirm('Marcar esta compra como quitada? As parcelas a partir deste mês deixam de contar.')) return;
  try { const r = await rpc('finCartaoQuitar', id); if (!r.ok) alert(r.msg); cartao(); } catch (e) { alert('Erro ao quitar.'); }
}
async function cartaoExcluir(id) {
  if (!confirm('Excluir esta compra? Ela some do histórico e dos meses passados também.')) return;
  try { const r = await rpc('finCartaoExcluir', id); if (!r.ok) alert(r.msg); cartao(); } catch (e) { alert('Erro ao excluir.'); }
}


/* ── Dívidas ── */
const fimMes = m => { const x = new Date(); x.setMonth(x.getMonth() + m - 1); return x.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }); };
function subtab(s) {
  document.querySelectorAll('.subtabs button').forEach(b => b.classList.toggle('on', b.dataset.s === s));
  document.querySelectorAll('.st').forEach(e => { e.hidden = e.dataset.s !== s; });
  if (s === 'cartao') cartao();
}

async function dividas(sim) {
  try {
    const d = DV = sim === true ? await rpc('finDividas', $('pExtra').value, $('pLump').value)
                                : await rpc('finDividasTudo', null, null);
    if (sim !== true) { $('pExtra').value = dec(d.extra); $('pLump').value = dec(d.lump); }
    if (!$('aData').value) $('aData').value = new Date().toISOString().slice(0, 10);
    const melhor = d.plano.slice(1).reduce((a, p, i) => p.eco > a.eco ? { eco: p.eco, i: i + 1 } : a, { eco: 0, i: -1 }).i;
    const alvo = d.lista.find(x => x.prio === 1 && x.saldo > 0);
    $('dPlano').innerHTML = '<h2>Plano de quitação</h2>' + (alvo ? '<p class="sub" style="margin:0 0 6px">Direcione o extra para: <b>' + esc(alvo.nome) + '</b></p>' : '') +
      (d.plano.length ? d.plano.map((p, i) => '<div class="it"' + (i === melhor ? ' style="border-color:var(--pos)"' : '') + '><div><b>' + esc(p.nome) +
        '</b><br><small>' + (p.meses ? 'Quita em ' + p.meses + ' meses (' + fimMes(p.meses) + ')' : 'Não quita: a parcela não cobre os juros') +
        '</small></div><div style="text-align:right">' + brl(p.juros) + '<br><small class="pos">Economiza ' + brl(p.eco) + '</small></div></div>').join('')
        : '<p>Nenhum empréstimo ativo para simular.</p>') + '<p class="sub" style="margin:8px 0 0">Já antecipado: <b>' + brl(d.totAnt) + '</b></p>';
    if (sim !== true) {
      $('aInst').innerHTML = d.instalado ? '' : '<p class="neg" style="font-weight:600">A aba de antecipações ainda não foi instalada.</p>' +
        (ADM() ? '<button class="btn sec" style="margin:0 0 16px" onclick="instalarAnt()">Instalar antecipações (uma vez)</button>' : '');
      renderEmp(d.emp); renderAnt(d.antl); simQ(); simF();
    }
  } catch (e) { $('dPlano').innerHTML = '<p>Não foi possível carregar o plano de quitação.</p>'; }
}

async function instalarAnt() { try { await rpc('finInstalarAnt'); dividas(); } catch (e) { alert('Erro ao instalar.'); } }

async function planoDet() {
  const o = $('pdOut'); o.innerHTML = '<p>Calculando...</p>';
  try {
    const d = await rpc('finPlanoDetalhe', $('pdK').value, $('pExtra').value, $('pLump').value);
    if (!d.loans.length) { o.innerHTML = '<p>Nenhum empréstimo ativo.</p>'; return; }
    o.innerHTML = '<h2 style="font-size:15px">Em que mês cada empréstimo é quitado — ' + esc(d.estrategia) + '</h2>' +
      d.loans.map((n, j) => '<div class="it"><b>' + esc(n) + '</b><span>' + (d.quit[j] === null ? 'não quita' : d.quit[j] === 0 ? 'à vista (hoje)' : 'mês ' + d.quit[j] + ' (' + fimMes(d.quit[j]) + ')') + '</span></div>').join('') +
      '<div class="tw" style="margin-top:14px;max-height:420px;overflow:auto"><table class="tbl"><thead><tr><th>Mês</th><th>Data</th><th>Pago no mês</th><th>Juros</th><th>Saldo devedor</th></tr></thead><tbody>' +
      d.linhas.map(l => '<tr><td>' + l.t + '</td><td>' + fimMes(l.t) + '</td><td>' + brl(l.pago) + '</td><td>' + brl(l.juros) + '</td><td>' + brl(l.total) + '</td></tr>').join('') +
      '</tbody></table></div>' + (d.n > 120 ? '<p class="sub" style="margin-top:8px">Mostrando os primeiros 120 de ' + d.n + ' meses.</p>' : '');
  } catch (e) { o.innerHTML = falha(e); }
}

/* Empréstimos (CRUD) */
function renderEmp(e) {
  EM = e;
  $('eTipo').innerHTML = e.tipos.map(t => '<option>' + esc(t) + '</option>').join('');
  const op = e.itens.map(x => '<option>' + esc(x.nome) + '</option>').join('');
  ['aEmp', 'qEmp'].forEach(id => { const v = $(id).value; $(id).innerHTML = op; if (v) $(id).value = v; });
  $('eTot').textContent = e.itens.length + ' empréstimo(s) · parcelas ativas ' + brl(e.tot.parcelas) + '/mês · para quitar hoje ' + brl(e.tot.saldo);
  const ord = e.itens.slice().sort((a, b) => (a.prio || 99) - (b.prio || 99) || (b.saldo || 0) - (a.saldo || 0));
  $('dLista').innerHTML = ord.length ? ord.map(x => '<div class="it"><div><b>' + esc(x.nome) + '</b><br><small>' + esc(x.tipo) + ' · ' +
    (x.taxa == null ? '-' : (x.taxa * 100).toFixed(2).replace('.', ',') + '% a.m.') + ' · ' + (x.pagas == null ? '-' : x.pagas) + '/' + (x.parcelas || '-') + ' pagas · ' +
    (x.restantes == null ? '-' : x.restantes) + ' restantes' + (x.prio ? ' · Prioridade ' + x.prio : '') + '</small><br><small>' + esc(x.obs) + '</small></div>' +
    '<div style="text-align:right"><b>' + (x.saldo == null ? '-' : brl(x.saldo)) + '</b><br><small>Parcela ' + (x.parcela == null ? '-' : brl(x.parcela)) + '</small>' +
    (ADM() ? '<br><button class="ed" onclick="empEditar(' + x.linha + ')">Editar</button><button onclick="empExcluir(' + x.linha + ')">Excluir</button>' : '') + '</div></div>').join('')
    : '<p>Nenhum empréstimo cadastrado.</p>';
}
function empLimpar() {
  EDIT = 0; $('eTit').textContent = 'Cadastrar empréstimo / financiamento';
  ['eNome', 'eValor', 'eParcelas', 'eParcela', 'eTaxa', 'ePrimeira', 'eQuit'].forEach(id => { $(id).value = ''; }); $('eMsg').textContent = '';
}
function empEditar(linha) {
  const x = EM.itens.find(i => i.linha === linha); if (!x) return;
  EDIT = linha; $('eTit').textContent = 'Editar: ' + x.nome;
  $('eNome').value = x.nome; $('eTipo').value = x.tipo; $('eValor').value = x.valor == null ? '' : dec(x.valor); $('eParcelas').value = x.parcelas || '';
  $('eParcela').value = x.parcela == null ? '' : dec(x.parcela); $('eTaxa').value = x.taxaInf == null ? '' : dec((x.taxaInf * 100).toFixed(4).replace(/\.?0+$/, ''));
  $('ePrimeira').value = x.primeira; $('eQuit').value = x.quit == null ? '' : dec(x.quit);
  $('eNome').scrollIntoView({ behavior: 'smooth', block: 'center' });
}
async function empSalvar() {
  try {
    const r = await rpc('finEmprestimoSalvar', { linha: EDIT, nome: $('eNome').value, tipo: $('eTipo').value, valor: $('eValor').value, parcelas: $('eParcelas').value,
      parcela: $('eParcela').value, taxa: $('eTaxa').value, primeira: $('ePrimeira').value, quit: $('eQuit').value });
    if (r.ok) { empLimpar(); dividas(); msg('eMsg', true, 'Empréstimo salvo.'); } else msg('eMsg', false, r.msg);
  } catch (e) { msg('eMsg', false, 'Erro ao salvar.'); }
}
async function empExcluir(linha) {
  const x = EM.itens.find(i => i.linha === linha); if (!x) return;
  if (!confirm('Excluir "' + x.nome + '"? As antecipações registradas para ele também serão apagadas.')) return;
  try { const r = await rpc('finEmprestimoExcluir', linha); if (!r.ok) alert(r.msg); dividas(); } catch (e) { alert('Erro ao excluir.'); }
}

/* Antecipações */
function renderAnt(l) {
  $('dAnt').innerHTML = l.map(x => '<div class="it"><div><b>' + esc(x.emp) + '</b><br><small>' + x.data.split('-').reverse().join('/') +
    (x.obs ? ' · ' + esc(x.obs) : '') + '</small></div><div style="text-align:right"><b class="pos">' + brl(x.valor) +
    '</b><br><button onclick="excluirAnt(\'' + esc(x.id) + '\')">Excluir</button></div></div>').join('');
}
async function antecipar() {
  try {
    const r = await rpc('finAntecipar', { emp: $('aEmp').value, data: $('aData').value, valor: $('aValor').value, obs: $('aObs').value });
    msg('aMsg', r.ok, r.ok ? 'Antecipação registrada. Saldo e plano recalculados.' : r.msg);
    if (r.ok) { $('aValor').value = ''; $('aObs').value = ''; dividas(); }
  } catch (e) { msg('aMsg', false, 'Erro ao registrar.'); }
}
async function excluirAnt(id) { if (confirm('Excluir esta antecipação? O saldo volta a subir.')) { await rpc('finAntecipExcluir', id); dividas(); } }
async function salvarCfg() { await rpc('finConfigSalvar', $('pExtra').value, $('pLump').value); dividas(); }

/* Simuladores */
const num = v => { const s = String(v || '').replace(/[^\d,.-]/g, ''); return parseFloat(s.indexOf(',') > -1 ? s.replace(/\./g, '').replace(',', '.') : s) || 0; };

function abate(S, i, p, R, A) {
  if (!(A > 0) || !(S > 0)) return '';
  if (A >= S) return '<p class="pos">O valor informado quita todo o saldo (' + brl(S) + ').</p>';
  const S2 = S - A;
  let n2 = null;
  if (i === 0) n2 = S2 / p; else { const x = 1 - S2 * i / p; if (x > 0) n2 = -Math.log(x) / Math.log(1 + i); }
  const p2 = i === 0 ? S2 / R : S2 * i / (1 - Math.pow(1 + i, -R));
  let h = '<hr style="border:0;border-top:1px solid var(--line);margin:12px 0"><p>Abatendo <b>' + brl(A) + '</b> · novo saldo: <b>' + brl(S2) + '</b></p>';
  if (n2 == null) h += '<p class="neg">Mesmo após o abatimento, a parcela atual não cobre os juros.</p>';
  else {
    const m2 = Math.ceil(n2 - 1e-9), eco = p * R - (A + p * n2);
    h += '<p>① Mantendo a parcela de ' + brl(p) + ': faltam <b>' + m2 + '</b> parcelas (antes ' + R + ') · <b class="pos">' +
      Math.max(0, R - m2) + ' a menos</b> · economiza cerca de <b class="pos">' + brl(eco) + '</b></p>';
  }
  h += '<p>② Mantendo o prazo de ' + R + ' meses: parcela cai para <b>' + brl(p2) + '</b> (menos ' + brl(p - p2) +
    '/mês) · economiza cerca de <b class="pos">' + brl((p - p2) * R - A) + '</b></p>';
  return h;
}

function simQ() {
  const x = EM && EM.itens.find(l => l.nome === $('qEmp').value), o = $('qRes');
  if (!x || x.taxa == null || x.parcela == null || !x.restantes) { o.innerHTML = x ? '<p>Este empréstimo não tem parcelas restantes.</p>' : ''; return; }
  const i = x.taxa, p = x.parcela, R = x.restantes, pagas = x.pagas || 0;
  let h = '<p>Quitar tudo hoje: <b>' + brl(x.saldo) + '</b> · economiza <b class="pos">' + brl(x.eco) + '</b> de juros</p>';
  const n = +$('qN').value;
  if (n >= 1) {
    if (n > R) h += '<p class="neg">Informe de 1 a ' + R + ' parcelas.</p>';
    else { const pagar = i === 0 ? n * p : p / Math.pow(1 + i, R - n) * (1 - Math.pow(1 + i, -n)) / i;
      h += '<p>Últimas ' + n + ' parcelas: pagar hoje <b>' + brl(pagar) + '</b> no lugar de ' + brl(n * p) + ' · economiza <b class="pos">' + brl(n * p - pagar) + '</b></p>'; }
  }
  const k = +$('qP').value;
  if (k >= 1) {
    if (k <= pagas || k > pagas + R) h += '<p class="neg">Informe uma parcela de ' + (pagas + 1) + ' a ' + (pagas + R) + '.</p>';
    else { const pagar = p / Math.pow(1 + i, k - pagas);
      h += '<p>Parcela ' + k + ': pagar hoje <b>' + brl(pagar) + '</b> no lugar de ' + brl(p) + ' · economiza <b class="pos">' + brl(p - pagar) + '</b></p>'; }
  }
  const qa = $('qA');
  if (qa && x.saldo != null) h += abate(x.saldo, i, p, R, num(qa.value));
  o.innerHTML = h;
}
function taxaImpl(v, n, p) {
  if (p * n <= v) return 0;
  let lo = 1e-9, hi = 1;
  for (let k = 0; k < 100; k++) { const m = (lo + hi) / 2, pv = p * (1 - Math.pow(1 + m, -n)) / m; if (pv > v) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
function simF() {
  const v = num($('fValor').value), n = +$('fN').value, p = num($('fParc').value), pagas = +$('fPagas').value || 0, ant = +$('fAnt').value, o = $('fRes');
  if (!(n >= 1) || !(p > 0)) { o.innerHTML = ''; return; }
  const i = $('fTaxa').value.trim() ? num($('fTaxa').value) / 100 : (v > 0 ? taxaImpl(v, n, p) : null);
  if (i == null) { o.innerHTML = '<p>Informe o valor financiado ou a taxa.</p>'; return; }
  const m = n - pagas, tudo = m <= 0 ? 0 : (i === 0 ? m * p : p * (1 - Math.pow(1 + i, -m)) / i);
  let h = '<p>Taxa usada: <b>' + (i * 100).toFixed(2).replace('.', ',') + '% a.m.</b> · quitar tudo hoje: <b>' + brl(tudo) + '</b></p>';
  if (ant >= 1) {
    if (ant <= pagas || ant > n) h += '<p class="neg">Informe uma parcela de ' + (pagas + 1) + ' a ' + n + '.</p>';
    else { const pagar = p / Math.pow(1 + i, ant - pagas); h += '<p>Parcela ' + ant + ': pagar hoje <b>' + brl(pagar) + '</b> · economiza <b class="pos">' + brl(p - pagar) + '</b></p>'; }
  }
  const fa = $('fA');
  if (fa && m > 0) h += abate(tudo, i, p, m, num(fa.value));
  o.innerHTML = h;
}
function menuToggle(f) {
  const o = typeof f === 'boolean' ? f : !document.body.classList.contains('menu-open');
  document.body.classList.toggle('menu-open', o);
  $('menuBtn').setAttribute('aria-expanded', o);
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') menuToggle(false); });

/* Reabre a sessão ao recarregar a página (confere o token no servidor com uma chamada leve). */
(async function restaurar() {
  try {
    const s = JSON.parse(sessionStorage.getItem(SESS) || 'null');
    if (!s || !s.t || Date.now() > s.exp) { sessLimpar(); return; }
    T = s.t; PERFIL = s.p;
    await rpc('finCategorias');
    $('login').hidden = true; $('app').hidden = false;
    document.querySelectorAll('[data-adm]').forEach(e => { e.hidden = !ADM(); });
    iniciar();
  } catch (e) { T = ''; PERFIL = ''; sessLimpar(); }
})();

