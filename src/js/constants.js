// Listas de opções usadas em formulários, filtros e análises.
const opts = (pairs) => pairs.map(([value, label]) => ({ value, label }));

export const GOALS = opts([
  ['alcance', 'Alcance'],
  ['conexao', 'Conexão'],
  ['comunidade', 'Crescer comunidade'],
  ['marcas', 'Atrair marcas'],
  ['vendas', 'Vendas'],
]);

export const NICHES = opts([
  ['beleza-moda', 'Beleza e moda'],
  ['fitness-saude', 'Fitness e saúde'],
  ['tecnologia-apps', 'Tecnologia e apps'],
  ['rotina-lifestyle', 'Rotina e lifestyle'],
  ['habitos', 'Hábitos'],
  ['gostos-pessoais', 'Gostos pessoais'],
  ['cultura-pop', 'Cultura pop'],
  ['organizacao', 'Organização'],
  ['criacao-conteudo', 'Criação de conteúdo'],
  ['ugc', 'UGC'],
  ['outro', 'Outro'],
]);

export const PLATFORMS = opts([
  ['instagram', 'Instagram'],
  ['tiktok', 'TikTok'],
  ['ambos', 'Instagram + TikTok'],
]);

export const FORMATS = opts([
  ['reels', 'Reels / vídeo curto'],
  ['video-tiktok', 'Vídeo TikTok'],
  ['carrossel', 'Carrossel'],
  ['stories', 'Stories'],
  ['foto', 'Foto'],
  ['modo-foto-tiktok', 'Modo foto (TikTok)'],
  ['live', 'Live'],
  ['outro', 'Outro'],
]);

export const AUDIENCES = opts([
  ['marcas', 'Marcas'],
  ['consumidores', 'Consumidores finais'],
  ['criadores', 'Outros criadores'],
  ['comunidade', 'Minha comunidade'],
]);

export const APPROACHES = opts([
  ['storytelling', 'Storytelling'],
  ['opiniao', 'Opinião'],
  ['review', 'Review'],
  ['demonstrativo', 'Demonstrativo'],
  ['bastidores', 'Bastidores'],
  ['humor', 'Humor'],
  ['tendencia', 'Tendência'],
  ['educativo', 'Educativo'],
]);

export const POST_STATUS = opts([
  ['ideia', 'Ideia'],
  ['roteiro', 'Roteirizando'],
  ['gravar', 'Para gravar'],
  ['editar', 'Editando'],
  ['agendado', 'Agendado'],
  ['publicado', 'Publicado'],
  ['arquivado', 'Arquivado'],
]);

export const IDEA_STATUS = opts([
  ['nova', 'Nova'],
  ['favorita', 'Favorita'],
  ['roteirizada', 'Virou roteiro'],
  ['descartada', 'Descartada'],
]);

export const SCRIPT_TYPES = opts([
  ['video', 'Vídeo'],
  ['carrossel', 'Carrossel'],
  ['stories', 'Stories'],
  ['foto', 'Foto'],
]);

export const DURATIONS = ['15s', '30s', '45s', '60s', '90s', '2-3 min'];
export const TONES = ['Natural', 'Bem-humorado', 'Opinativo', 'Intimista', 'Animado', 'Sóbrio / profissional'];
export const DETAIL_LEVELS = opts([
  ['enxuto', 'Enxuto'],
  ['padrao', 'Padrão'],
  ['detalhado', 'Detalhado'],
]);

export const REF_CATEGORIES = opts([
  ['video', 'Vídeo'],
  ['anuncio', 'Anúncio'],
  ['post', 'Post / carrossel'],
  ['gancho', 'Gancho'],
  ['roteiro', 'Roteiro'],
  ['tendencia', 'Tendência'],
  ['outro', 'Outro'],
]);

export const BRAND_STATUS = opts([
  ['pesquisando', 'Pesquisando'],
  ['pronta', 'Pronta para proposta'],
  ['contatada', 'Contatada'],
  ['cliente', 'Cliente'],
  ['pausada', 'Pausada'],
]);

export const INSIGHT_CATEGORIES = opts([
  ['publico', 'Público'],
  ['dor', 'Dor'],
  ['objecao', 'Objeção'],
  ['diferencial', 'Diferencial / característica'],
  ['concorrente', 'Concorrente'],
  ['campanha', 'Campanha observada'],
  ['anuncio', 'Referência de anúncio'],
]);

export const INSIGHT_STATUS = opts([
  ['confirmado', 'Fato confirmado'],
  ['hipotese', 'Hipótese a verificar'],
]);

// Campos de métricas. "ig" indica o nome correspondente na API oficial do Instagram
// (Graph API / Insights) para uma integração futura. Nada disso é buscado hoje.
export const METRIC_FIELDS = [
  { key: 'reach', label: 'Alcance', ig: 'reach' },
  { key: 'views', label: 'Visualizações', ig: 'views' },
  { key: 'likes', label: 'Curtidas', ig: 'likes' },
  { key: 'comments', label: 'Comentários', ig: 'comments' },
  { key: 'saves', label: 'Salvamentos', ig: 'saved' },
  { key: 'shares', label: 'Compartilhamentos', ig: 'shares' },
  { key: 'profileVisits', label: 'Visitas ao perfil', ig: 'profile_visits' },
  { key: 'follows', label: 'Novos seguidores', ig: 'follows' },
  { key: 'linkClicks', label: 'Cliques (link/bio)', ig: null },
  { key: 'messages', label: 'Mensagens recebidas', ig: null },
  { key: 'commercialContacts', label: 'Contatos comerciais', ig: null },
];

export const labelOf = (list, value) => list.find((o) => o.value === value)?.label ?? value ?? '';
