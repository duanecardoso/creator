// Banco de temas por nicho. São assuntos do dia a dia de uma criadora (não tendências
// inventadas). O plano combina tema + formato; você troca o tema em um toque se não servir.
// Tipos: produto, categoria, par (comparação), tema (opinião), situacao (história),
// momento (rotina), lugar, marca (tipo de marca para pitch), lista.

export const NICHE_KEYS = {
  beleza: /beleza|moda|make|skin/i,
  fitness: /fitness|saúde|saude|treino/i,
  tech: /tecnologia|tech|app/i,
  lifestyle: /rotina|lifestyle|hábito|habito/i,
  cultura: /cultura|pop|série|serie|filme/i,
  organizacao: /organiza/i,
  ugc: /ugc|criação|criacao|conteúdo/i,
};

export const THEMES = {
  beleza: {
    produto: ['meu protetor solar do dia a dia', 'um sérum que estava parado na gaveta', 'a base que eu uso para gravar', 'meu hidratante labial favorito', 'um perfume que eu ganhei', 'a máscara de cílios que eu recompro'],
    categoria: ['skincare da manhã', 'make para gravar', 'necessaire de viagem', 'cabelo em dia corrido'],
    par: ['protetor caro x protetor barato', 'base líquida x base em bastão', 'duas máscaras de cílios que eu uso'],
    tema: ['rotina de skincare com 10 passos', 'comprar make só porque viralizou', 'pele perfeita nos vídeos'],
    situacao: ['quando a make derrete no meio da gravação', 'o dia que testei um produto ao vivo e deu errado', 'quando pedem "make natural" num briefing'],
    momento: ['minha rotina de skincare real', 'me arrumando para um evento de marca'],
    marca: ['uma marca de skincare', 'uma marca de maquiagem', 'uma marca de perfume'],
    lista: ['produtos que eu não recompraria', 'o que tem de verdade na minha necessaire'],
  },
  fitness: {
    produto: ['a garrafa que vai comigo pro treino', 'meu tênis de treino', 'um app de treino', 'o pré-treino que eu testei', 'meu fone de academia'],
    categoria: ['bolsa de academia', 'pós-treino', 'treino em casa'],
    par: ['treino em casa x academia', 'dois apps de treino'],
    tema: ['treinar todo dia', 'dieta de influencer', 'fazer cardio em jejum'],
    situacao: ['quando a academia lota no horário que eu posso', 'o dia que esqueci o fone no treino'],
    momento: ['meu treino em dia de gravação', 'o que eu como num dia corrido'],
    marca: ['uma marca de suplemento', 'uma marca de roupa fitness', 'um app de treino'],
    lista: ['coisas que me fizeram voltar a treinar', 'o que eu levo na bolsa de academia'],
  },
  tech: {
    produto: ['um app de organização', 'meu iPhone configurado para gravar', 'um microfone de lapela', 'o app que eu uso para editar', 'um ring light pequeno'],
    categoria: ['apps que eu uso todo dia', 'acessórios de gravação', 'tela inicial do meu celular'],
    par: ['editar no celular x no computador', 'dois apps de edição'],
    tema: ['gravar tudo só com o celular', 'pagar assinatura de app'],
    situacao: ['quando o celular lota no meio de uma diária', 'o dia que perdi um vídeo inteiro'],
    momento: ['como eu organizo meus arquivos de gravação'],
    marca: ['um app', 'uma marca de acessórios para celular'],
    lista: ['configurações do iPhone que eu mudei', 'apps que eu apaguei e não sinto falta'],
  },
  lifestyle: {
    produto: ['minha caneca de todo dia', 'um item de casa que melhorou minha rotina', 'minha agenda'],
    categoria: ['coisas da minha casa', 'manhã produtiva de verdade'],
    par: ['acordar cedo x dormir mais', 'agenda de papel x app'],
    tema: ['rotina perfeita de influencer', 'ser produtiva todo dia'],
    situacao: ['quando a semana sai totalmente do planejado', 'o dia que tudo deu errado e eu postei mesmo assim'],
    momento: ['minha manhã real', 'um domingo de reset', 'minha semana em fotos', 'um dia gravando de casa'],
    marca: ['uma marca de casa', 'uma marca de café'],
    lista: ['coisas que melhoraram minha semana', 'hábitos que eu larguei'],
  },
  cultura: {
    produto: ['o livro que estou lendo', 'a série que eu maratonei'],
    categoria: ['séries da minha lista', 'músicas que eu ouço editando'],
    par: ['o livro x a série', 'dois filmes que todo mundo compara'],
    tema: ['o final da última série que eu vi', 'remake de filme clássico'],
    situacao: ['quando uma série vira referência de roteiro', 'quando eu me vejo numa personagem'],
    momento: ['minha noite de série', 'o que eu ouço enquanto edito'],
    marca: ['uma plataforma de streaming', 'uma livraria'],
    lista: ['personagens que eu seria', 'séries que eu indicaria'],
  },
  organizacao: {
    produto: ['meu planner', 'um organizador de gaveta', 'o app de lista que eu uso'],
    categoria: ['organização da semana', 'minha mesa de trabalho'],
    par: ['planner de papel x app', 'organizar por dia x por tarefa'],
    tema: ['organização estética de Pinterest', 'planejar tudo no domingo'],
    situacao: ['quando eu esqueço um prazo', 'quando a casa vira estúdio'],
    momento: ['planejando minha semana', 'reset da mesa de trabalho'],
    marca: ['uma marca de organização', 'um app de produtividade'],
    lista: ['coisas que me fazem não perder prazo', 'como minha semana fica organizada'],
  },
  ugc: {
    produto: ['um produto que eu gravei para uma marca', 'o tripé que eu mais uso', 'minha luz de gravação'],
    categoria: ['meu kit de gravação', 'meu cantinho de gravar'],
    par: ['vídeo UGC x publi', 'luz natural x ring light'],
    tema: ['UGC ser "só gravar um vídeo"', 'cobrar barato para começar', 'aceitar permuta'],
    situacao: ['quando a marca pede para regravar tudo', 'o briefing mais estranho que já recebi', 'quando o produto chega diferente do esperado'],
    momento: ['um dia gravando 3 UGCs', 'a semana de entregas'],
    marca: ['uma marca de skincare', 'uma marca de tecnologia', 'uma marca de bem-estar'],
    lista: ['o que uma marca recebe de mim', 'coisas que eu aprendi atendendo mais de 50 marcas'],
  },
};

export function nichesFromProfile(profile) {
  const text = String(profile?.niches || '');
  const keys = Object.entries(NICHE_KEYS).filter(([, re]) => re.test(text)).map(([k]) => k);
  if (!keys.includes('ugc')) keys.push('ugc');
  return keys.length ? keys : ['lifestyle', 'ugc'];
}
