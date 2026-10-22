// Mapa de páginas da plataforma. Para criar um módulo novo: adicione a rota aqui e no NAV.
import * as overview from './views/overview.js';
import * as week from './views/week.js';
import * as formats from './views/formats.js';
import * as brands from './views/brands.js';
import * as results from './views/results.js';
import * as settings from './views/settings.js';
import * as studio from './views/studio.js';
import * as contents from './views/contents.js';
import * as references from './views/references.js';

export const ROUTES = {
  'visao-geral': { label: 'Visão geral', icon: 'overview', view: overview },
  'conteudo/planejamento': { module: 'Conteúdo', label: 'Planejamento', icon: 'plan', view: week },
  'conteudo/lista': { module: 'Conteúdo', label: 'Conteúdos', icon: 'list', view: contents },
  'conteudo/estudio': { module: 'Conteúdo', label: 'Estúdio', icon: 'studio', view: studio },
  'conteudo/formatos': { module: 'Conteúdo', label: 'Formatos', icon: 'formats', view: formats },
  'conteudo/referencias': { module: 'Conteúdo', label: 'Referências', icon: 'refs', view: references },
  'marcas/campanhas': { module: 'Marcas', label: 'Campanhas', icon: 'campaigns', view: brands },
  'analise/desempenho': { module: 'Análise', label: 'Desempenho', icon: 'performance', view: results },
  configuracoes: { label: 'Configurações', icon: 'settings', view: settings },
};

export const NAV = [
  { items: ['visao-geral'] },
  { label: 'Conteúdo', items: ['conteudo/planejamento', 'conteudo/lista', 'conteudo/estudio', 'conteudo/formatos', 'conteudo/referencias'] },
  { label: 'Marcas', items: ['marcas/campanhas'] },
  { label: 'Análise', items: ['analise/desempenho'] },
];

// Endereços antigos continuam funcionando.
export const REDIRECTS = {
  '': 'visao-geral',
  semana: 'conteudo/planejamento',
  planejar: 'conteudo/planejamento',
  marcas: 'marcas/campanhas',
  formatos: 'conteudo/formatos',
  resultados: 'analise/desempenho',
  perfil: 'configuracoes',
};
