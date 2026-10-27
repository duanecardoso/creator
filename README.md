# Creator

Plataforma web para centralizar a criação de conteúdo (Instagram e TikTok) e as entregas para marcas (UGC, publi e TikTok Shop). Pensada primeiro para o computador (menu lateral, tabelas, gráficos e filtros) e funciona também no celular.

**Site:** https://duanecardoso.github.io/creator/ (depois de ativar o GitHub Pages, veja abaixo)

## Páginas

| Área | Página | Para quê |
|---|---|---|
| | **Visão geral** | Posts da semana em relação à meta, sequência, entregas atrasadas e valor a receber. Mostra também o que fazer hoje (ou sugestões), os atrasados, os próximos dias, prazos de marcas, fotos que faltam e um gráfico de posts por semana. |
| Conteúdo | **Planejamento** | Quadro de segunda a sexta com tema, foco, formato, tipo, gancho e estrutura, mais os prazos de marcas de cada dia. Botão ↻ por dia. Inclui "Escrever a semana com o Claude", exportação para o Calendário e ideias guardadas. |
| | **Conteúdos** | Todos os conteúdos em tabela (busca, filtros por etapa, tipo, foco, formato e período, troca de etapa na linha) ou em quadro por etapa (arrastar e soltar). Exporta CSV. |
| | **Estúdio** | Galeria de carrosséis e estáticos e editor em página inteira: telas, textos, fotos e "Salvar imagens". |
| | **Formatos** | 21 formatos que funcionam (estrutura, ganchos-modelo, por que funciona), com busca e filtros, mais os seus formatos. |
| | **Referências** | Posts de outros criadores que você quer adaptar. |
| Marcas | **Campanhas** | Entregas de UGC, Publi e TikTok Shop com as etapas de cada tipo, entregáveis com prazo, roteiro, data de publicação, direitos de uso e revisões. Atrasos ficam destacados. Aba **Briefings de treino** (veja abaixo). |
| | **Financeiro** | Recebido e a receber no mês, atrasados, gráfico dos últimos 6 meses, valores por tipo, comissões do TikTok Shop e aviso de nota fiscal. |
| | **Contatos** | Marcas com que você conversa e lista de portfólio UGC. |
| Análise | **Desempenho** | Seguidores, salvamentos e contatos de marcas por post e por formato, sempre comparados com a sua própria média e com o nível de confiança. |
| | **Configurações** | Perfil, meta semanal, mistura do plano automático, estilo das artes, Instagram, backup e importação. |

Endereços das páginas: `#/visao-geral`, `#/conteudo/planejamento`, `#/conteudo/lista`, `#/conteudo/estudio`, `#/conteudo/formatos`, `#/conteudo/referencias`, `#/marcas/campanhas`, `#/marcas/financeiro`, `#/marcas/contatos`, `#/analise/desempenho`, `#/configuracoes`. Endereços antigos (como `#/semana`) redirecionam sozinhos.

O visual segue a mesma identidade do portfólio: fonte Montserrat, fundo claro pontilhado, títulos pesados com o ponto rosa, botões em pílula e a paleta branco, manteiga (#F8E7A2), rosa (#D74F73) e marrom (#6B4537). Tema claro. As **artes** dos posts usam a mesma fonte e paleta, para manter a identidade visual igual em tudo.

## Funil, linhas e banco de temas

- **Foco = etapa do funil:**
  - **Topo · crescer:** gente nova te descobre.
  - **Meio · conectar:** quem chegou quer ficar.
  - **Fundo · marcas:** seu trabalho de UGC, publi e TikTok Shop por dentro, sem virar anúncio.
- **A semana segue o funil:** seg e ter topo, qua e qui meio, sex e sáb fundo, dom topo. Com 5 dias: topo, topo, meio, meio, fundo. Escolha 5 ou 7 dias em Configurações → Plano semanal.
- **Banco de temas** (Formatos → Banco de temas): seus temas prontos, por pilar (linha editorial) e etapa do funil.
  - O plano usa estes temas antes dos modelos genéricos, respeitando o peso de cada pilar, e não repete tema usado nos últimos 60 dias.
  - Pilar sem peso (ou com peso 0) fica fora do plano. Os temas continuam guardados.
  - Se faltar tema de uma etapa do funil, o plano usa outro tema seu antes de cair num modelo genérico.
  - Dá para colar uma lista inteira de temas de uma vez.
- **Estratégia de conteúdo** (Configurações → Perfil): o eixo, o funil e as suas regras. Vai em todos os pedidos para o Claude.
- **Carrossel com história:** formato de 8 telas (gancho, contexto, conflito, situação, virada, mudança, reflexão, frase final com pergunta).
- **Antes de postar:** as 3 perguntas e o empacotamento (capa com 2 a 4 palavras, palavra-chave na 1ª linha da legenda, 3 a 5 hashtags de nicho) aparecem dentro de cada conteúdo.
- **Capa e legenda:** cada conteúdo tem o texto da capa e o pilar. A legenda avisa sobre hashtag genérica (#viral, #fy…), excesso de hashtags e 1ª linha que não fala do tema. Legenda de publi (#publi) não é revisada, porque vem do briefing.
- **Desempenho:** mostra seguidores ganhos a cada mil visualizações, por formato e por pilar.

## Briefings de treino (Campanhas → Briefings de treino)

Um job de UGC simulado, com briefing completo e prazos, para manter o perfil ativo e o portfólio atualizado quando não há marca.

- **Briefing completo:** marca e produto, tipo de vídeo, objetivo, público, formato, mensagens-chave, o que fazer e evitar, 3 ganchos, roteiro, uso e 5 prazos (roteiro, gravação, edição, post, portfólio).
- **Todos os nichos do portfólio:** haircare, skincare, bodycare, moda, fitness e tech. No automático, o gerador começa pelo nicho com menos treino.
- **Produto:** um da sua lista "Produtos que você tem" (marca | produto | nicho) ou um produto inventado de marca fictícia.
- **Outra sugestão** troca o produto e o tipo de vídeo. **Não tenho mais esse** tira o produto da sua lista e sugere outro.
- **✨ Pedir ao Claude** gera um briefing mais criativo. As datas são sempre calculadas pelo site.
- Ao aceitar, os prazos aparecem na Visão geral e no Planejamento (como "Treino · …"). O dia do post entra no plano da semana, e o conteúdo já vem marcado para o portfólio.
- É treino: não entra no financeiro nem na lista de campanhas, e o briefing lembra de não usar #publi nem marcar a marca.

## Plano automático de sábado

A partir de sábado, **na primeira vez que você abrir o site**, ele monta o plano de segunda a sexta da semana seguinte. Um site no GitHub Pages não roda com a página fechada, então ele gera quando você abre, e só uma vez por semana. Para desligar, vá em Configurações.

- Por padrão o plano tem 3 vídeos, 1 carrossel e 1 estático. Ajuste em Configurações → Plano e constância.
- O foco muda ao longo da semana e de uma semana para outra. Formatos e temas usados recentemente são evitados, e os formatos que já deram certo para você ganham prioridade.
- Publis e TikTok Shop com data de publicação naquela semana ocupam o dia automaticamente.
- Os temas vêm de um banco de assuntos do dia a dia dos seus nichos, não de tendências inventadas.

## Design de carrossel e estático

Cada carrossel ou estático do plano já vem com as telas montadas (1080×1440, formato 3:4 do feed) no estilo dos seus posts: sua foto como fundo (ou grade de 4 fotos), título grande creme misturando fino e pesado (use *palavra* para destacar) e elementos do iPhone por cima: nota com menu Copiar/Colar, to do list com clipe, balões do iMessage, barra de busca, etiqueta de local, pasta, card de perfil, estrelas cromadas, polaroids e papel rasgado. Telas sem foto usam fundo lavado (lilás, azul-céu, creme ou rosa). Escolha o fundo padrão em Configurações → Estilo das artes.

- **Quando precisa de foto sua**, o site pede (por exemplo: "📷 Você segurando o produto, luz natural, fundo neutro"). O pedido aparece na Visão geral e no Estúdio.
- As fotos ficam guardadas só no aparelho e **não entram no backup**.
- Os textos que dependem da sua experiência ficam com uma dica ✏︎ até você (ou o Claude) escrever. Nada é inventado.
- **Apagar design**: no Estúdio ou dentro do conteúdo. Apaga as telas e as fotos usadas nelas; o conteúdo e os números continuam.
- **Salvar imagens**: no iPhone abre a folha de compartilhar. No computador, baixa os arquivos JPG.

## Claude (IA)

Clique em ✨ num formato, num conteúdo ou no Planejamento. O site copia o prompt (seu perfil + formato + tema) e abre o Claude já com ele escrito.

Quando você volta, o botão **"Colar resposta do Claude"** aparece no topo. A resposta preenche o roteiro, o gancho, a legenda, o ponto fraco e o que confirmar. Se a resposta vier fora do formato, o texto é guardado como roteiro mesmo assim.

Funciona no plano gratuito do Claude, sem chave de API.

## Seus dados

- Ficam salvos **só no navegador** em que você usa o site. Nada vai para o GitHub.
- **Limpar os dados do navegador apaga tudo.** Use Configurações → Baixar backup toda semana.
- Celular e computador têm dados separados. Use backup e importação para passar de um para o outro.
- Uma cópia automática do início do dia permite desfazer um erro recente.
- **Pacotes**: um arquivo .json com `"meta": {"kind": "pacote"}` (por exemplo, perfil e ideias tirados das suas conversas com o Claude) sempre junta com o que já existe. Ele atualiza só os campos de perfil que vierem nele e não apaga nada.

## Instagram (opcional)

Para conectar, vá em Configurações → Instagram e cole um token gerado no painel da Meta (o passo a passo está dentro do app).

- O site importa seus posts, as capas e os números, sincroniza ao abrir e renova o token sozinho.
- Em Desempenho, os posts aparecem em grade, como no seu perfil, com views, seguidores e salvamentos. Os links das capas do Instagram expiram depois de alguns dias e são renovados a cada sincronização.
- O token fica só no navegador e não vai no backup.
- Contatos de marcas continuam manuais.

A integração foi testada com uma simulação da API. A primeira conexão real confirma se tudo funciona na sua conta.

## Portfólio (GoatCounter)

O portfólio (`duanecardoso/ugc`) envia visitas e eventos para o GoatCounter (grátis, sem cookies, sem dados pessoais). Em **Desempenho → Portfólio** o Creator mostra:

- **Visitantes:** por dia e total do período.
- **De onde vêm:** etiquetas `?ref=` e sites de origem.
- **Até onde rolam:** Trabalhos, Serviços, Números, Contato.
- **Vídeos mais abertos.**
- **Cliques:** WhatsApp, e-mail, Instagram, TikTok, YouTube.
- **Formulários enviados.**
- **Região e aparelhos.**

Para conectar, crie uma chave em `https://SEU-CODIGO.goatcounter.com/user/api` com a permissão **Read statistics** e cole em Configurações → Portfólio. A chave fica só no aparelho e não vai no backup. Os números começam a contar a partir da instalação do contador; não há dados anteriores.

**Links com etiqueta:** o Creator gera links como `…/ugc/?ref=bio` e `…/ugc/?ref=dm`, um para cada lugar, para saber de onde as marcas vêm. Para não contar as próprias visitas, abra uma vez em cada aparelho `…/ugc/#toggle-goatcounter`.

**Análise como marca:**
- O botão monta um pedido para o Claude com o link do portfólio, os números reais e um roteiro de avaliação em 7 áreas.
- A resposta volta com nota por área e as 3 prioridades, e fica salva com a data para comparar de um mês para o outro.
- O Claude não assiste aos vídeos. Se ele não conseguir abrir o link, peça a análise no Claude Code, que lê o portfólio direto do GitHub.

## Ativar o site (uma vez)

GitHub → repositório `creator` → **Settings → Pages** → "Deploy from a branch" → **main** e **/ (root)** → Save. Em 1 a 2 minutos o site fica no ar.

## Para editar o código

O `index.html` é gerado a partir de `src/` (CSS e JS embutidos num arquivo só).

```bash
npm install
npm run build      # gera index.html
npm test           # 67 testes de lógica
npm run test:e2e   # 30 verificações no computador, num sábado simulado e num iPhone simulado (precisa do Playwright)
```

```
src/index.html           estrutura: menu lateral, barra do topo, área principal
src/css/platform.css     visual da plataforma (identidade do portfólio, tema claro)
src/js/app.js            menu, barra do topo, rotas e início
src/js/routes.js         lista de páginas, menu e redirecionamentos
src/js/ui.js             componentes: cards, indicadores, tabelas, gráficos, filtros, painéis
src/js/data.js           dados, plano automático, Claude, Instagram
src/js/views/            uma página por arquivo + editor de conteúdo e Estúdio
src/js/lib/formats.js    biblioteca de formatos (+ tipos e modelos de título/gancho)
src/js/lib/themes.js     banco de temas por nicho
src/js/lib/planner.js    plano semanal automático
src/js/lib/designs.js    telas de cada formato (carrossel/estático)
src/js/lib/render.js     desenho das artes (canvas 1080×1350, identidade do portfólio)
src/js/lib/media.js      fotos guardadas no aparelho (IndexedDB)
src/js/lib/briefs.js     briefings de treino (nichos, prazos, gerador)
src/js/lib/deals.js      campanhas, prazos, financeiro, calendário (.ics)
src/js/lib/insights.js   meta semanal, sequência, destaques, sugestões do dia
src/js/lib/prompts.js    prompts para o Claude e leitura das respostas
src/js/lib/store.js      dados no navegador, backup, CSV
src/js/lib/instagram.js  API oficial do Instagram
```
