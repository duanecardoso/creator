# Creator

Admin no estilo iOS para centralizar a criação de conteúdo (Instagram e TikTok) e as entregas para marcas (UGC, publi e TikTok Shop).

**Site:** https://duanecardoso.github.io/creator/ (depois de ativar o GitHub Pages, veja abaixo)

## As abas

| Aba | Para quê |
|---|---|
| **Hoje** | O que gravar e postar hoje, prazos de marcas (atrasados, hoje e próximos 3 dias), **fotos que o site precisa de você**, meta da semana e sequência. Toque no círculo no canto para abrir o Perfil. |
| **Semana** | **Plano de segunda a sexta**: tema, foco (seguidores, comunidade ou marcas), formato, tipo (vídeo, carrossel ou estático), gancho e estrutura. Inclui os prazos de marcas de cada dia, ↻ para trocar a sugestão de um dia, "Escrever a semana com o Claude", "Adicionar ao Calendário" e ideias guardadas. |
| **Marcas** | **Entregas** de UGC, Publi e TikTok Shop, com etapas próprias de cada tipo, entregáveis com prazo, roteiro, data de publicação, produto, direitos de uso, exclusividade e revisões. **Financeiro**: recebido no mês, a receber, atrasado, por tipo, comissões do TikTok Shop e aviso de nota fiscal. **Contatos** de marcas e lista de portfólio UGC. Prazos exportáveis para o Calendário do iPhone, com lembrete na véspera. |
| **Formatos** | 21 formatos que funcionam (estrutura, ganchos-modelo, por que funciona), seus hits e referências. |
| **Resultados** | O que traz seguidores, salvamentos e marcas, por formato. |

## Plano automático de sábado

A partir de sábado, **na primeira vez que você abrir o site**, ele monta o plano de segunda a sexta da semana seguinte. Um site no GitHub Pages não roda com a página fechada, então ele gera quando você abre, e só uma vez por semana. Se não quiser, desligue em Perfil.

- Por padrão: 3 vídeos, 1 carrossel e 1 estático (ajuste em Perfil → Plano semanal).
- O foco muda ao longo da semana e de uma semana para outra. Formatos e temas usados recentemente são evitados, e os formatos que já deram certo para você ganham prioridade.
- Publis e TikTok Shop com data de publicação naquela semana ocupam o dia automaticamente.
- Os temas vêm de um banco de assuntos do dia a dia dos seus nichos, não de tendências inventadas. Troque o que não servir com ↻ ou peça ao Claude para reescrever a semana.

## Design de carrossel e estático

Cada carrossel ou estático do plano já vem com as telas montadas (1080×1350, formato 4:5 do feed) no estilo iOS: Notas, Lembretes, iMessage, widgets, foto com legenda, capa e tela final. A base é neutra e a sua paleta aparece só nos detalhes. Ajuste as cores em Perfil → Estilo das artes, com prévia ao vivo.

- **Quando precisa de foto sua**, o site pede ("📷 Você segurando o produto, luz natural, fundo neutro") e o pedido aparece no Hoje. As fotos ficam guardadas só no aparelho e **não entram no backup**.
- Os textos que dependem da sua experiência ficam com uma dica ✏︎ até você (ou o Claude) escrever. Nada é inventado.
- **Salvar imagens**: no iPhone abre a folha de compartilhar, com "Salvar Imagens" para o Fotos. No computador, baixa os arquivos.

## Claude (IA)

Toque em ✨ num formato ou num conteúdo. O site copia o prompt (seu perfil + formato + tema) e abre o Claude já com ele escrito. Quando você volta, ele oferece **colar a resposta** e preenche o roteiro, o gancho, a legenda, o ponto fraco e o que confirmar. Se a resposta vier fora do formato, o texto é guardado como roteiro mesmo assim. Funciona no plano gratuito do Claude, sem chave de API.

## Seus dados

- Ficam salvos **só no navegador e no aparelho** em que você usa o site. Nada vai para o GitHub.
- **Limpar os dados do navegador apaga tudo.** Use Perfil → Baixar backup toda semana.
- Celular e computador têm dados separados. Use backup e importação para passar de um para o outro.
- Uma cópia automática do início do dia permite desfazer um erro recente (Perfil → Voltar ao início de…).

## Instagram (opcional)

Perfil → Instagram → cole um token gerado no painel da Meta (passo a passo dentro do app). O site importa seus posts e números, sincroniza ao abrir e renova o token sozinho. O token fica só no aparelho e não vai no backup. Contatos de marcas continuam manuais.

A integração foi testada com uma simulação da API. A primeira conexão real confirma se tudo funciona na sua conta.

## Ativar o site (uma vez)

GitHub → repositório `creator` → **Settings → Pages** → "Deploy from a branch" → **main** e **/ (root)** → Save. Em 1 a 2 minutos o site fica no ar.

## Para editar o código

O `index.html` é gerado a partir de `src/`.

```bash
npm install
npm run build      # gera index.html
npm test           # 46 testes de lógica
npm run test:e2e   # 27 verificações num iPhone simulado, incluindo um sábado (precisa do Playwright)
```

```
src/js/lib/formats.js    biblioteca de formatos (+ tipos e modelos de título/gancho)
src/js/lib/themes.js     banco de temas por nicho
src/js/lib/planner.js    plano semanal automático
src/js/lib/designs.js    telas de cada formato (carrossel/estático)
src/js/lib/render.js     desenho das artes (canvas 1080×1350)
src/js/lib/media.js      fotos guardadas no aparelho (IndexedDB)
src/js/lib/deals.js      campanhas, prazos, financeiro, calendário (.ics)
src/js/lib/insights.js   meta semanal, sequência, hits, sugestões do dia
src/js/lib/prompts.js    prompts para o Claude e leitura das respostas
src/js/lib/store.js      dados no navegador, backup, CSV
src/js/lib/instagram.js  API oficial do Instagram
src/js/views/            uma tela por aba + editor de conteúdo
src/css/ios.css          visual iOS (claro e escuro)
```
