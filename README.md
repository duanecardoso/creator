# Creator

App no estilo iOS para criar conteúdo com constância no Instagram e no TikTok, a partir de formatos que funcionam, com foco em ganhar seguidores e atrair marcas.

**Site:** https://duanecardoso.github.io/creator/ (depois de ativar o GitHub Pages, veja abaixo)

## As 5 abas

| Aba | Para quê |
|---|---|
| **Hoje** | O que gravar e postar hoje. Botão de um toque para avançar a etapa (Roteirizar → Gravei → Editei → Postei). Anel da meta semanal e sequência de semanas batendo a meta. Sem nada planejado, sugere 3 formatos alternando o foco (seguidores, comunidade, marcas). |
| **Formatos** | **Biblioteca** com 17 formatos que funcionam: por que funcionam, estrutura em passos, ganchos-modelo e dica de gravação. **Meus hits** com os seus posts acima da sua própria média. **Referências** de outros criadores para adaptar sem copiar. Também dá para criar formatos seus. |
| **Planejar** | Semana em faixa de dias, ideias guardadas, "Completar a semana" (preenche os dias livres com sugestões até a meta) e "Pedir 5 ideias ao Claude". |
| **Resultados** | Resumo do mês, desempenho por formato (seguidores e salvamentos a cada mil visualizações, contatos de marcas) e **Marcas**: acompanhamento (quero → contatei → conversando → fechado) e lista de portfólio UGC para copiar e mandar. |
| **Perfil** | Seu perfil (usado nos prompts), meta semanal, Instagram, backup. |

Tem modo escuro automático. No iPhone, abra no Safari → Compartilhar → **Adicionar à Tela de Início** e ele abre em tela cheia, como um app.

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
npm test           # 27 testes de lógica
npm run test:e2e   # 17 verificações num iPhone simulado (precisa do Playwright)
```

```
src/js/lib/formats.js    biblioteca de formatos
src/js/lib/insights.js   meta semanal, sequência, hits, sugestões do dia
src/js/lib/prompts.js    prompts para o Claude e leitura das respostas
src/js/lib/store.js      dados no navegador, backup, CSV
src/js/lib/instagram.js  API oficial do Instagram
src/js/views/            uma tela por aba + editor de conteúdo
src/css/ios.css          visual iOS (claro e escuro)
```
