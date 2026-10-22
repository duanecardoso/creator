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
| Marcas | **Campanhas** | Entregas de UGC, Publi e TikTok Shop com as etapas de cada tipo, entregáveis com prazo, roteiro, data de publicação, direitos de uso e revisões. Atrasos ficam destacados. |
| | **Financeiro** | Recebido e a receber no mês, atrasados, gráfico dos últimos 6 meses, valores por tipo, comissões do TikTok Shop e aviso de nota fiscal. |
| | **Contatos** | Marcas com que você conversa e lista de portfólio UGC. |
| Análise | **Desempenho** | Seguidores, salvamentos e contatos de marcas por post e por formato, sempre comparados com a sua própria média e com o nível de confiança. |
| | **Configurações** | Perfil, meta semanal, mistura do plano automático, estilo das artes, Instagram, backup e importação. |

Endereços das páginas: `#/visao-geral`, `#/conteudo/planejamento`, `#/conteudo/lista`, `#/conteudo/estudio`, `#/conteudo/formatos`, `#/conteudo/referencias`, `#/marcas/campanhas`, `#/marcas/financeiro`, `#/marcas/contatos`, `#/analise/desempenho`, `#/configuracoes`. Endereços antigos (como `#/semana`) redirecionam sozinhos.

O visual usa tema claro, com branco, amarelo-manteiga, rosa e marrom. As **artes** dos posts (carrossel e estático) continuam no estilo iOS.

## Plano automático de sábado

A partir de sábado, **na primeira vez que você abrir o site**, ele monta o plano de segunda a sexta da semana seguinte. Um site no GitHub Pages não roda com a página fechada, então ele gera quando você abre, e só uma vez por semana. Para desligar, vá em Configurações.

- Por padrão o plano tem 3 vídeos, 1 carrossel e 1 estático. Ajuste em Configurações → Plano e constância.
- O foco muda ao longo da semana e de uma semana para outra. Formatos e temas usados recentemente são evitados, e os formatos que já deram certo para você ganham prioridade.
- Publis e TikTok Shop com data de publicação naquela semana ocupam o dia automaticamente.
- Os temas vêm de um banco de assuntos do dia a dia dos seus nichos, não de tendências inventadas.

## Design de carrossel e estático

Cada carrossel ou estático do plano já vem com as telas montadas (1080×1350, formato 4:5 do feed) no estilo iOS: Notas, Lembretes, iMessage, widgets, foto com legenda, capa e tela final. A base é neutra e a sua paleta aparece só nos detalhes. Ajuste as cores em Configurações → Estilo das artes, com prévia ao vivo.

- **Quando precisa de foto sua**, o site pede (por exemplo: "📷 Você segurando o produto, luz natural, fundo neutro"). O pedido aparece na Visão geral e no Estúdio.
- As fotos ficam guardadas só no aparelho e **não entram no backup**.
- Os textos que dependem da sua experiência ficam com uma dica ✏︎ até você (ou o Claude) escrever. Nada é inventado.
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

## Instagram (opcional)

Para conectar, vá em Configurações → Instagram e cole um token gerado no painel da Meta (o passo a passo está dentro do app).

- O site importa seus posts e números, sincroniza ao abrir e renova o token sozinho.
- O token fica só no navegador e não vai no backup.
- Contatos de marcas continuam manuais.

A integração foi testada com uma simulação da API. A primeira conexão real confirma se tudo funciona na sua conta.

## Ativar o site (uma vez)

GitHub → repositório `creator` → **Settings → Pages** → "Deploy from a branch" → **main** e **/ (root)** → Save. Em 1 a 2 minutos o site fica no ar.

## Para editar o código

O `index.html` é gerado a partir de `src/` (CSS e JS embutidos num arquivo só).

```bash
npm install
npm run build      # gera index.html
npm test           # 46 testes de lógica
npm run test:e2e   # 26 verificações no computador, num sábado simulado e num iPhone simulado (precisa do Playwright)
```

```
src/index.html           estrutura: menu lateral, barra do topo, área principal
src/css/platform.css     visual da plataforma (tema claro)
src/js/app.js            menu, barra do topo, rotas e início
src/js/routes.js         lista de páginas, menu e redirecionamentos
src/js/ui.js             componentes: cards, indicadores, tabelas, gráficos, filtros, painéis
src/js/data.js           dados, plano automático, Claude, Instagram
src/js/views/            uma página por arquivo + editor de conteúdo e Estúdio
src/js/lib/formats.js    biblioteca de formatos (+ tipos e modelos de título/gancho)
src/js/lib/themes.js     banco de temas por nicho
src/js/lib/planner.js    plano semanal automático
src/js/lib/designs.js    telas de cada formato (carrossel/estático)
src/js/lib/render.js     desenho das artes (canvas 1080×1350, estilo iOS)
src/js/lib/media.js      fotos guardadas no aparelho (IndexedDB)
src/js/lib/deals.js      campanhas, prazos, financeiro, calendário (.ics)
src/js/lib/insights.js   meta semanal, sequência, destaques, sugestões do dia
src/js/lib/prompts.js    prompts para o Claude e leitura das respostas
src/js/lib/store.js      dados no navegador, backup, CSV
src/js/lib/instagram.js  API oficial do Instagram
```
