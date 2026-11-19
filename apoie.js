/* ===== APOIE O PROJETO — edite só este bloco ===== */
const APOIE = {
  texto: 'O SheetFin é gratuito e foi criado com muita paciência e carinho. Por favor, não comercialize ou redistribua sem autorização. Se quiser contribuir para que eu continue este trabalho, use uma das opções abaixo. Cada ajuda faz diferença. Obrigado! ✨',
  pixChave: '',   // sua chave Pix (e-mail, celular, CPF/CNPJ ou aleatória). Vazio = esconde o cartão do Pix
  pixNome:  '',   // nome do recebedor (opcional, aparece como referência)
  qrImg:    '',   // opcional: endereço https://... ou data:image/... do QR Code do seu Pix
  links: [        // cada item vira um botão. Exemplo:
    // { t:'Me pague um café', u:'https://seu-link-aqui', d:'Contribuição única' },
  ]
};

(function(){
  var seguro=function(u){return /^https:\/\//i.test(u)||/^data:image\//i.test(u)};
  var el=function(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e};
  document.getElementById('apTxt').textContent=APOIE.texto||'';
  var grid=document.getElementById('apGrid'),n=0;

  if(APOIE.pixChave){
    var p=el('div','panel');p.appendChild(el('h2','', 'Contribuir via Pix'));
    p.appendChild(el('p','sub','Aponte a câmera do app do banco ou copie a chave.'));
    if(APOIE.qrImg&&seguro(APOIE.qrImg)){var im=el('img','ap-qr');im.src=APOIE.qrImg;im.alt='QR Code do Pix';p.appendChild(im)}
    var k=el('code','ap-key',APOIE.pixChave);p.appendChild(k);
    if(APOIE.pixNome)p.appendChild(el('p','ap-who','Recebedor: '+APOIE.pixNome));
    var b=el('button','btn','Copiar chave Pix');b.type='button';b.onclick=function(){apoieCopiar(APOIE.pixChave,b)};p.appendChild(b);
    grid.appendChild(p);n++;
  }
  var L=(APOIE.links||[]).filter(function(x){return x&&x.u&&/^https:\/\//i.test(x.u)});
  if(L.length){
    var q=el('div','panel');q.appendChild(el('h2','','Outras formas de ajudar'));
    q.appendChild(el('p','sub','Os links abrem em uma nova aba.'));
    L.forEach(function(x){
      var a=el('a','ap-link');a.href=x.u;a.target='_blank';a.rel='noopener noreferrer';
      var d=el('div');d.appendChild(el('span','',x.t||x.u));if(x.d)d.appendChild(el('small','',x.d));
      a.appendChild(d);a.appendChild(el('span','','↗'));q.appendChild(a);
    });
    grid.appendChild(q);n++;
  }
  if(n===1)grid.classList.add('one');
  if(n===0)grid.appendChild(el('p','empty','As formas de contribuir serão divulgadas em breve.'));
})();

function apoieCopiar(txt,btn){
  var o=btn.textContent;
  var ok=function(){btn.textContent='Copiado ✓';setTimeout(function(){btn.textContent=o},1800)};
  var fb=function(){var t=document.createElement('textarea');t.value=txt;t.style.cssText='position:fixed;opacity:0';document.body.appendChild(t);t.select();
    try{document.execCommand('copy');ok()}catch(e){window.prompt('Copie a chave:',txt)}t.remove()};
  if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(txt).then(ok,fb)}else fb();
}

/* Abre/fecha a aba Apoie sem depender do roteador das outras telas */
var _ap=null;
function apoieAbrir(){
  var ap=document.getElementById('apoie');
  if(!ap.hidden){if(typeof menuToggle==='function')menuToggle(false);return}
  var main=document.querySelector('main.main-content');
  var secs=[].slice.call(main.children).filter(function(c){return c.tagName==='SECTION'});
  var w=document.getElementById('welcome'),t=document.getElementById('topbar');
  var pt=document.getElementById('pageTitle'),ps=document.getElementById('pageSubtitle'),pi=document.getElementById('pageIco');
  _ap={sec:secs.filter(function(s){return !s.hidden&&s!==ap})[0]||null,w:w.hidden,t:t.hidden,
       ti:pt.textContent,su:ps.textContent,ic:pi.innerHTML,on:document.querySelector('nav button.on')};
  secs.forEach(function(s){s.hidden=(s!==ap)});
  w.hidden=true;t.hidden=false;
  pt.textContent='Apoie o projeto';ps.textContent='Ajude este trabalho a continuar.';
  pi.innerHTML='<svg viewBox="0 0 24 24">'+'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>'+'</svg>';
  [].forEach.call(document.querySelectorAll('nav button.on'),function(b){b.classList.remove('on')});
  document.querySelector('nav button[data-apoie]').classList.add('on');
  if(typeof menuToggle==='function')menuToggle(false);
  window.scrollTo(0,0);
}
function apoieFechar(){
  var ap=document.getElementById('apoie');if(ap.hidden||!_ap)return;
  ap.hidden=true;
  if(_ap.sec)_ap.sec.hidden=false;
  document.getElementById('welcome').hidden=_ap.w;document.getElementById('topbar').hidden=_ap.t;
  document.getElementById('pageTitle').textContent=_ap.ti;document.getElementById('pageSubtitle').textContent=_ap.su;
  document.getElementById('pageIco').innerHTML=_ap.ic;
  document.querySelector('nav button[data-apoie]').classList.remove('on');
  if(_ap.on)_ap.on.classList.add('on');
  _ap=null;
}
/* qualquer clique que navegue para outra tela (menu ou links "Ver todos") fecha o Apoie antes */
document.addEventListener('click',function(e){
  if(document.getElementById('apoie').hidden)return;
  if(e.target.closest('nav button[data-v], [onclick*="navegar("]'))apoieFechar();
},true);
/* ao sair do sistema, fecha o Apoie */
new MutationObserver(function(){if(document.getElementById('app').hidden)apoieFechar()})
  .observe(document.getElementById('app'),{attributes:true,attributeFilter:['hidden']});
