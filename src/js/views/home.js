// Mesa: visão rápida do que precisa de atenção.
import * as data from '../data.js';
import { h, put, pill, fmtDate, todayIso, emptyState, go } from '../ui.js';
import { PLATFORMS, POST_STATUS, FORMATS, labelOf } from '../constants.js';
import { hasMetrics } from '../lib/analysis.js';
import { editPost } from './planner.js';
import { openMetrics } from './metrics.js';

export function render(root) {
  const posts = data.all('posts');
  const today = todayIso();
  const d14 = new Date(Date.now() + 14 * 864e5);
  const in14 = `${d14.getFullYear()}-${String(d14.getMonth() + 1).padStart(2, '0')}-${String(d14.getDate()).padStart(2, '0')}`;
  const upcoming = posts.filter((p) => p.plannedDate && p.plannedDate >= today && p.plannedDate <= in14 && !['publicado', 'arquivado'].includes(p.status)).sort((a, b) => a.plannedDate.localeCompare(b.plannedDate));
  const late = posts.filter((p) => p.plannedDate && p.plannedDate < today && !['publicado', 'arquivado'].includes(p.status));
  const noMetrics = posts.filter((p) => p.status === 'publicado' && !hasMetrics(p));
  const favs = data.all('ideas').filter((i) => i.status === 'favorita');
  const p = data.profile();
  const hello = p.name ? `Oi, ${p.name.split(' ')[0]}.` : 'Sua mesa de trabalho';

  const postLine = (x, action) => h('li', { class: 'post-row compact' },
    h('span', { class: 'post-date' }, x.plannedDate ? fmtDate(x.plannedDate, { weekday: 'short', day: '2-digit' }) : ''),
    h('button', { class: 'post-title link-btn', onclick: action || (() => editPost(x)) }, x.title || 'Sem título'),
    h('span', { class: 'meta' }, pill(labelOf(PLATFORMS, x.platform)), pill(labelOf(FORMATS, x.format)), pill(labelOf(POST_STATUS, x.status), `status status-${x.status}`)),
  );

  put(root, 
    h('header', { class: 'page-head' }, h('div', {}, h('h1', {}, hello), h('p', { class: 'lede' }, 'O que está para sair, o que atrasou e o que falta medir.'))),
    h('div', { class: 'quick' },
      h('button', { class: 'quick-btn', onclick: () => go('ideias') }, h('strong', {}, 'Ter ideias'), h('span', {}, 'briefing → ideias')),
      h('button', { class: 'quick-btn', onclick: () => go('roteiros') }, h('strong', {}, 'Roteirizar'), h('span', {}, 'ideia → roteiro')),
      h('button', { class: 'quick-btn', onclick: () => editPost({ plannedDate: today }) }, h('strong', {}, 'Agendar'), h('span', {}, 'nova publicação')),
      h('button', { class: 'quick-btn', onclick: () => go('referencias') }, h('strong', {}, 'Guardar referência'), h('span', {}, 'link + princípio')),
    ),
    h('div', { class: 'two-col' },
      h('section', { class: 'panel' }, h('h2', {}, 'Próximos 14 dias'),
        upcoming.length ? h('ul', { class: 'post-list' }, upcoming.map((x) => postLine(x))) : emptyState('Nada agendado para as próximas duas semanas.', null, h('button', { class: 'btn btn-small', onclick: () => go('agenda') }, 'Abrir agenda')),
        late.length > 0 && [h('h3', {}, `Atrasadas (${late.length})`), h('ul', { class: 'post-list' }, late.map((x) => postLine(x)))],
      ),
      h('section', { class: 'panel' }, h('h2', {}, 'Publicadas sem métricas'),
        noMetrics.length ? h('ul', { class: 'post-list' }, noMetrics.map((x) => postLine(x, () => openMetrics(x)))) : h('p', { class: 'muted' }, 'Tudo registrado.'),
        h('h2', {}, 'Ideias favoritas'),
        favs.length ? h('ul', { class: 'simple-list' }, favs.slice(0, 8).map((i) => h('li', {}, h('a', { href: `#/ideias?edit=${i.id}` }, i.title)))) : h('p', { class: 'muted' }, 'Marque ideias como favoritas no laboratório.'),
      ),
    ),
  );
}
