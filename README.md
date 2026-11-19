# SheetFin — versão GitHub Pages

Front estático (PWA) que fala com o **mesmo Apps Script** do SheetFin. A planilha, as regras e os usuários continuam no Google; o GitHub só hospeda a tela.

## Passo a passo

**1. Apps Script** (na planilha: Extensões > Apps Script)
1. Crie o arquivo `api.gs` e cole o conteúdo do `api.gs` desta pasta. Não mexa no `doGet` (`webapp.gs`).
2. Implantar > **Gerenciar implantações** > ✏️ Editar > **Nova versão** > Implantar.
   (Executar como: **Eu** · Quem tem acesso: **Qualquer pessoa**.) A URL termina em `/exec`.

**2. Configurar o front**
- Abra `js/config.js` e troque `API_URL` pela URL do passo acima.

**3. Publicar**
1. Crie um repositório no GitHub e envie todo o conteúdo desta pasta (o `index.html` fica na raiz).
2. Settings > Pages > Source: *Deploy from a branch* > `main` / `(root)`.
3. Abra `https://SEU-USUARIO.github.io/NOME-DO-REPO/`.

**Dica:** se abrir o index.html direto do computador, o login funciona, mas as chamadas ao Apps Script só são confiáveis pelo endereço do GitHub Pages.

**4. Instalar no celular**: menu do navegador > *Adicionar à tela inicial*.

## Atualizar versão
Mudou algum arquivo? Troque a `VERSAO` no `sw.js` e o `?v=` no `index.html` (mesmo valor), senão o celular continua com o cache antigo.

## Estrutura
- `index.html` — telas · `css/sheetfin.css` — estilos · `js/app.js` — lógica das telas
- `js/config.js` — URL da API · `js/api.js` — chamada ao Apps Script (substitui `google.script.run`)
- `js/login.js`, `js/apoie.js` (edite o bloco `APOIE` com seu Pix), `js/pwa.js`
- `sw.js`, `manifest.json`, `assets/` — PWA e imagens
- `api.gs` — **vai para o Apps Script, não para o GitHub** (pode apagar daqui se quiser)

## Observações
- O token da sessão fica só na aba (sessionStorage) por até 6 h; recarregar a página não desloga.
- Só as funções listadas em `finApiMapa_()` do `api.gs` podem ser chamadas de fora; menus/reset/gatilhos continuam só pela planilha.
- Se criar uma função nova usada pela tela, inclua-a nessa lista.
