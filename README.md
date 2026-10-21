# Estúdio de Conteúdo

Site pessoal para planejar, criar, organizar e analisar conteúdos de Instagram e TikTok. É **um único arquivo HTML** (`index.html`): abre com dois cliques, não precisa de servidor e pode ser publicado de graça no GitHub Pages.

## Como abrir

- **No computador:** clique duas vezes em `index.html`.
- **Publicado:** veja "Publicar no GitHub Pages" abaixo.

## O que existe

| Área | O que faz |
|---|---|
| **Mesa** | Próximos 14 dias, publicações atrasadas, publicadas sem métricas e ideias favoritas. |
| **Laboratório de ideias** | Briefing com objetivo, nicho, assunto, plataforma, formato, público, abordagem, marca, referências e uma premissa sua, que a IA avalia em vez de só aceitar. Banco de ideias com todos os campos, filtros, busca, favoritos, edição e exclusão. Revisor de gancho que aponta clichês, saudações, frase motivacional e tom de aula. |
| **Roteirista** | Roteiros de vídeo (cenas, falas, texto na tela, edição), carrossel (slide a slide), Stories (telas com recurso interativo) e foto. Inclui variações de abertura, CTA, legenda, pontos para repensar e afirmações a confirmar. O briefing UGC é preenchido a partir da pesquisa de marca. |
| **Planejamento** | Calendário (arraste para remarcar) e lista com troca rápida de status. Filtros por objetivo, nicho, plataforma, formato, status e pilar. |
| **Referências** | Link, categoria, nicho, formato, gancho, o que chamou atenção, estrutura a estudar e como adaptar sem copiar. Vínculo com ideias e roteiros. |
| **Desempenho** | Métricas importadas do Instagram ou digitadas à mão. Avalia cada publicação pelo objetivo dela, compara grupos, aponta padrões e sugere testes, sempre com nível de confiança e sem conclusões com poucos dados. |
| **Pesquisa de marcas** | Itens de pesquisa marcados como fato confirmado (com fonte) ou hipótese. Uma matriz cruza dores e objeções com diferenciais confirmados, e a IA gera conceitos de UGC. |
| **Perfil e dados** | Seu perfil criativo (usado nos prompts), conexão com o Instagram, backup e exportação CSV. |

## Onde ficam os dados (importante)

Tudo fica salvo **no navegador e no aparelho onde você usa o site** (armazenamento local). Nada vai para o GitHub nem para qualquer servidor.

- **Limpar os dados de navegação apaga tudo.** Use "Baixar backup" em *Perfil e dados* com frequência e guarde o arquivo no Google Drive, iCloud ou e-mail.
- **Cada navegador e cada aparelho tem a sua própria cópia.** O site aberto pelo arquivo (clique duplo) e o site publicado no GitHub também são cópias separadas. Para levar os dados de um para outro, baixe o backup num e importe no outro ("Mesclar" ou "Substituir").
- **Janela anônima não salva.** Use uma janela normal.
- O site guarda automaticamente uma cópia do início de cada dia, para desfazer um erro recente ("Voltar para essa cópia" em *Perfil e dados*).
- O espaço disponível costuma ser de cerca de 5 MB, suficiente para milhares de registros de texto.

Para ter os mesmos dados em vários aparelhos sem exportar e importar, seria preciso um banco de dados online com login (veja os próximos passos).

## Inteligência artificial (sem chave, sem custo extra)

Um site público não pode guardar chave de API, porque qualquer pessoa conseguiria vê-la. Por isso, nas áreas de ideias, roteiros e marcas, a IA funciona em três passos:

1. **Copiar prompt:** o site monta o prompt com seu perfil, suas regras (não inventar dados, questionar ideias fracas, evitar clichês), o briefing, as referências e a pesquisa da marca.
2. **Abrir o Claude:** cole em claude.ai (plano gratuito ou pago).
3. **Colar resposta:** copie a resposta inteira e cole de volta. O site lê o JSON e cria as ideias, o roteiro ou os conceitos.

Se a resposta vier cortada ou fora do formato, o site avisa o que fazer.

## Conectar o Instagram (métricas automáticas)

Usa a API oficial e gratuita da Meta ("Instagram API com login do Instagram"). O site importa suas publicações (data, legenda, link, formato) e as métricas: alcance, visualizações, curtidas, comentários, salvamentos, compartilhamentos e, quando a API oferece para aquele tipo de post, visitas ao perfil e novos seguidores. Publicações que já estão na sua agenda são reconhecidas pelo link publicado, sem duplicar, e seus títulos, objetivos e anotações são mantidos.

**Continua manual:** cliques, mensagens e contatos comerciais, que a sincronização nunca sobrescreve. Os Stories também ficam de fora, porque a API só os mostra por 24h. TikTok não tem conexão.

### Passo a passo (uma vez, uns 15 minutos)

1. No app do Instagram: **Configurações → Tipo de conta → Conta profissional (Criador)**. É gratuito e não precisa de página do Facebook.
2. Entre em [developers.facebook.com/apps](https://developers.facebook.com/apps/) com seu login do Facebook e **crie um app** (tipo Empresa/Business).
3. No app, adicione o produto **Instagram** e abra **"Configuração da API com login do Instagram"**.
4. Em **Funções do app → Testadores do Instagram**, adicione seu @. Aceite o convite no Instagram em **Configurações → Apps e sites → Convites de testador**.
5. Em **"Gerar tokens de acesso"**, adicione sua conta, faça login e **copie o token**. As permissões devem incluir `instagram_business_basic` e `instagram_business_manage_insights`.
6. No site, em **Perfil e dados → Instagram**, cole o token e clique em **Conectar**.

Os nomes dos menus da Meta mudam com frequência. Se algo estiver diferente, procure por "Instagram API with Instagram Login" na documentação da Meta.

### Como funciona depois

- Ao abrir o site, ele sincroniza sozinho (no máximo a cada 6 horas). Também há o botão "Sincronizar agora".
- O token vale cerca de 60 dias. O site o renova automaticamente a cada 7 dias de uso. Se ficar mais de ~60 dias sem abrir, gere um novo token e cole de novo.
- Publicações importadas chegam **sem objetivo**. Escolha o objetivo direto na lista de Desempenho, porque é ele que define se o post foi bem.

### Segurança do token

- Fica salvo só no seu navegador. **Nunca vai para o GitHub e nunca vai no arquivo de backup.**
- Dá acesso de leitura às suas métricas. Não use em computador compartilhado e não cole em outros sites.
- Para cancelar o acesso: **Instagram → Configurações → Apps e sites → remover o app**, ou "Desconectar" no site.

### O que ainda não foi testado

Esta versão foi testada com uma **simulação** da API do Instagram, não com a sua conta real, porque eu não tenho acesso a ela. Duas coisas só se confirmam na primeira conexão:

- se o Instagram aceita chamadas feitas direto do navegador;
- quais métricas a API devolve para cada tipo de post na sua conta.

Se a conexão falhar com uma mensagem de "não consegui falar com o Instagram" mesmo com internet, me avise. A alternativa é uma pequena função gratuita (por exemplo no Cloudflare Workers) que faz a ponte.

## Publicar no GitHub Pages

O repositório precisa ser **público** no plano gratuito do GitHub. Só o código fica público. Seus dados e seu token ficam no seu navegador.

1. Crie uma conta em [github.com](https://github.com) e um repositório novo (por exemplo `estudio-conteudo`), marcado como **Public**.
2. Na página do repositório: **Add file → Upload files**. Arraste **todo o conteúdo da pasta** (no mínimo `index.html` e `.nojekyll`) e clique em **Commit changes**.
3. Vá em **Settings → Pages**. Em "Build and deployment", escolha **Deploy from a branch**, branch **main** e pasta **/ (root)**, e salve.
4. Em 1 a 2 minutos o site fica em `https://SEU-USUARIO.github.io/estudio-conteudo/`.
5. Se você já usou o site pelo arquivo local, baixe o backup lá e importe no site publicado.

Para atualizar o site depois, envie o novo `index.html` do mesmo jeito.

## Para quem for editar o código

O `index.html` é **gerado**. Edite os arquivos em `src/` e gere de novo:

```bash
npm install        # uma vez (instala o esbuild, que junta tudo num arquivo)
npm run build      # gera index.html
npm test           # 28 testes: banco local, análise, revisor de gancho, Instagram (API simulada), leitura das respostas da IA
npm run test:e2e   # 25 verificações no navegador abrindo o index.html direto (precisa do Playwright)
```

```
index.html               site completo gerado (é o que vai para o GitHub Pages)
src/index.html           modelo da página
src/css/styles.css       visual (branco, amarelo-manteiga, rosa e marrom)
src/js/app.js            navegação e sincronização automática
src/js/data.js           dados no navegador, backup, prompts e Instagram
src/js/lib/store.js      banco local (localStorage), cópia diária, CSV
src/js/lib/instagram.js  API do Instagram: token, publicações, métricas, cruzamento com a agenda
src/js/lib/prompts.js    prompts e leitura das respostas coladas
src/js/lib/analysis.js   análise de desempenho
src/js/lib/hookcheck.js  revisor de ganchos
src/js/views/            uma tela por área
scripts/build.mjs        gera o index.html
tests/                   testes
```

## Próximos passos recomendados

1. Conecte o Instagram e defina o objetivo das publicações importadas. Com cerca de 15 publicações medidas, as comparações começam a valer.
2. Ajuste o perfil em *Perfil e dados*, que é o que mais muda a qualidade dos prompts.
3. Crie o hábito de baixar o backup toda semana.
4. **Mesmos dados no celular e no computador:** adicionar login e banco online gratuito (por exemplo Supabase) ao site do GitHub Pages.
5. **Histórico de métricas por data** (24h, 7 dias, 30 dias) e **métricas da conta** (seguidores ao longo do tempo).
