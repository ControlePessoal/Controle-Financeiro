/* SheetFin — chamada ao Apps Script (substitui google.script.run).
   POST text/plain evita o preflight de CORS. Servidor responde {r: resultado} ou {__erro: mensagem}. */
(function (w) {
  'use strict';
  var SF = (w.SF = {});

  SF.chamar = async function (fn, args) {
    var cfg = w.SF_CONFIG || {};
    if (!cfg.API_URL || /COLE_AQUI/.test(cfg.API_URL))
      throw new Error('Sistema não configurado: edite js/config.js com a URL do Apps Script.');
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, cfg.TIMEOUT_MS || 45000);
    try {
      var resp = await fetch(cfg.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ fn: fn, args: args || [] }),
        signal: ctrl.signal,
        credentials: 'omit',
        referrerPolicy: 'no-referrer'
      });
      if (!resp.ok) throw new Error('Falha no servidor (HTTP ' + resp.status + ').');
      var j;
      try { j = await resp.json(); }
      catch (e) { throw new Error('Resposta inválida do servidor. Confira a URL e a implantação do Apps Script.'); }
      if (j && j.__erro) throw new Error(j.__erro);
      return j && j.r !== undefined ? j.r : null;
    } catch (e) {
      if (e && e.name === 'AbortError') throw new Error('Tempo limite esgotado. Verifique a conexão.');
      if (e instanceof TypeError) throw new Error('Sem conexão com o servidor. Verifique a internet.');
      throw e;
    } finally { clearTimeout(timer); }
  };
})(window);
