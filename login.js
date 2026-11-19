/* Tela de login */
const lRel = () => { const r = document.getElementById('relogio'); if (r) r.textContent = new Date().toLocaleTimeString('pt-BR'); };
  lRel(); setInterval(lRel, 1000);
  function lVer() {
    const i = document.getElementById('lSen'), b = document.getElementById('lVerBtn'), v = i.type === 'password';
    i.type = v ? 'text' : 'password'; b.textContent = v ? '🙈' : '👁'; b.setAttribute('aria-label', v ? 'Ocultar senha' : 'Mostrar senha');
  }
  function lEntrar() {
    const u = document.getElementById('lUsu').value.trim(), s = document.getElementById('lSen').value;
    const b = document.getElementById('lBtn'), e = document.getElementById('erro');
    e.textContent = '';
    if (!u || !s) { e.textContent = 'Informe usuário e senha.'; return; }
    b.disabled = true; b.textContent = 'Entrando...';
    SF.chamar('finLogin', [u, s])
      .then(r => {
        b.disabled = false; b.textContent = 'Entrar';
        if (!r || !r.ok) { e.textContent = (r && r.msg) || 'Usuário ou senha inválidos.'; document.getElementById('lSen').value = ''; document.getElementById('lSen').focus(); return; }
        document.getElementById('lSen').value = ''; aoLogar(r);
      })
      .catch(f => { b.disabled = false; b.textContent = 'Entrar'; e.textContent = (f && f.message) || 'Não foi possível entrar.'; });
  }
  document.getElementById('lSen').addEventListener('keydown', ev => { if (ev.key === 'Enter') lEntrar(); });
  document.getElementById('lUsu').addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); document.getElementById('lSen').focus(); } });
