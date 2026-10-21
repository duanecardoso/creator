// C. Planejamento editorial: calendário mensal e lista de publicações.
import * as data from '../data.js';
import { h, put, clear, openEditor, filterBar, matches, pill, attempt, emptyState, fmtDate, todayIso } from '../ui.js';
import { GOALS, NICHES, PLATFORMS, FORMATS, APPROACHES, POST_STATUS, labelOf } from '../constants.js';
import { checkHook } from '../lib/hookcheck.js';
import { openMetrics } from './metrics.js';
import { hasMetrics } from '../lib/analysis.js';

const filters = { q: '', goal: '', niche: '', platform: '', format: '', status: '', pillar: '' };
let mode = window.matchMedia('(max-width: 720px)').matches ? 'lista' : 'calendario';
let cursor = todayIso().slice(0, 7); // AAAA-MM
let sort = 'date-asc';

export const pillarOptions = () => String(data.profile().pillars || '').split('\n').map((s) => s.trim()).filter(Boolean).map((p) => ({ value: p, label: p }));

const rerender = () => {
  const main = document.getElementById('main');
  clear(main);
  render(main, {});
};

export function postFields() {
  return [
    { name: 'title', label: 'Título', required: true, full: true },
    { name: 'plannedDate', label: 'Data planejada', type: 'date' },
    { name: 'status', label: 'Status', type: 'select', options: POST_STATUS },
    { name: 'platform', label: 'Plataforma', type: 'select', options: PLATFORMS },
    { name: 'format', label: 'Formato', type: 'select', options: FORMATS },
    { name: 'pillar', label: 'Pilar editorial', type: 'select', options: pillarOptions, help: 'Edite a lista de pilares em "Perfil e dados".' },
    { name: 'goal', label: 'Objetivo', type: 'select', options: GOALS },
    { name: 'niche', label: 'Nicho', type: 'select', options: NICHES },
    { name: 'approach', label: 'Abordagem', type: 'select', options: APPROACHES },
    { name: 'hook', label: 'Gancho', type: 'textarea', rows: 2, check: checkHook },
    { name: 'script', label: 'Roteiro / anotações de produção', type: 'textarea', rows: 5 },
    { name: 'scriptId', label: 'Roteiro vinculado', type: 'select', options: () => data.all('scripts').map((s) => ({ value: s.id, label: s.title || 'Roteiro' })) },
    { name: 'ideaId', label: 'Ideia de origem', type: 'select', options: () => data.all('ideas').map((i) => ({ value: i.id, label: i.title || 'Ideia' })) },
    { type: 'section', label: 'Publicação' },
    { name: 'publishedDate', label: 'Data em que foi publicado', type: 'date' },
    { name: 'publishedUrl', label: 'Link publicado', type: 'url', placeholder: 'https://' },
    { name: 'notes', label: 'Observações', type: 'textarea', rows: 2 },
  ];
}

export function editPost(post = {}) {
  const isNew = !post.id;
  openEditor({
    title: isNew ? 'Nova publicação' : 'Editar publicação',
    fields: postFields(),
    values: { status: 'ideia', ...post },
    intro: !isNew && h('div', { class: 'row-actions editor-links' },
      post.scriptId && h('a', { class: 'btn btn-small', href: `#/roteiros?open=${post.scriptId}`, onclick: () => document.querySelector('dialog.modal')?.close() }, 'Abrir roteiro'),
      h('button', { type: 'button', class: 'btn btn-small', onclick: () => openMetrics(data.get('posts', post.id)) }, hasMetrics(post) ? 'Ver/editar métricas' : 'Registrar métricas'),
    ),
    onSave: async (v) => {
      if (v.status === 'publicado' && !v.publishedDate) v.publishedDate = v.plannedDate || todayIso();
      return isNew ? data.create('posts', v) : data.update('posts', post.id, v);
    },
    onDelete: isNew ? null : () => data.remove('posts', post.id),
  });
}

function filtered() {
  return data.all('posts')
    .filter((p) => ['goal', 'niche', 'platform', 'format', 'status', 'pillar'].every((k) => !filters[k] || p[k] === filters[k]))
    .filter((p) => matches(p, filters.q, ['title', 'hook', 'script', 'notes', 'pillar']));
}

export function render(root, params) {
  if (params.edit) {
    const p = data.get('posts', params.edit);
    history.replaceState(null, '', '#/agenda');
    if (p) {
      if (p.plannedDate) cursor = p.plannedDate.slice(0, 7);
      queueMicrotask(() => editPost(p));
    }
  }
  const posts = filtered();
  put(root, 
    h('header', { class: 'page-head' },
      h('div', {}, h('h1', {}, 'Planejamento editorial'), h('p', { class: 'lede' }, 'Calendário e lista de tudo que vai ao ar — do rascunho ao publicado.')),
      h('div', { class: 'row-actions' },
        h('div', { class: 'segmented', role: 'group', 'aria-label': 'Modo de visualização' },
          h('button', { class: mode === 'calendario' ? 'on' : '', 'aria-pressed': String(mode === 'calendario'), onclick: () => { mode = 'calendario'; rerender(); } }, 'Calendário'),
          h('button', { class: mode === 'lista' ? 'on' : '', 'aria-pressed': String(mode === 'lista'), onclick: () => { mode = 'lista'; rerender(); } }, 'Lista'),
        ),
        h('button', { class: 'btn btn-primary', onclick: () => editPost({ plannedDate: mode === 'calendario' ? '' : todayIso() }) }, '+ Publicação'),
      ),
    ),
    filterBar(filters, {
      onChange: rerender,
      selects: [
        { key: 'status', label: 'Status', options: POST_STATUS },
        { key: 'goal', label: 'Objetivo', options: GOALS },
        { key: 'niche', label: 'Nicho', options: NICHES },
        { key: 'platform', label: 'Plataforma', options: PLATFORMS },
        { key: 'format', label: 'Formato', options: FORMATS },
        { key: 'pillar', label: 'Pilar', options: pillarOptions },
      ],
    }),
    !data.all('posts').length
      ? emptyState('Agenda vazia.', 'Crie uma publicação aqui ou leve uma ideia do laboratório para a agenda.', h('button', { class: 'btn', onclick: () => editPost({ plannedDate: todayIso() }) }, '+ Publicação'))
      : mode === 'calendario' ? calendar(posts) : listView(posts),
  );
}

// ---------- Calendário ----------
function calendar(posts) {
  const [y, m] = cursor.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const startOffset = (first.getDay() + 6) % 7; // semana começa na segunda
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  const byDate = new Map();
  for (const p of posts) if (p.plannedDate) (byDate.get(p.plannedDate) || byDate.set(p.plannedDate, []).get(p.plannedDate)).push(p);
  const today = todayIso();
  const shift = (d) => {
    const nd = new Date(y, m - 1 + d, 1);
    cursor = `${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, '0')}`;
    rerender();
  };
  const grid = h('div', { class: 'cal-grid', role: 'grid' },
    ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'].map((d) => h('div', { class: 'cal-dow', role: 'columnheader' }, d)));
  for (let i = 0; i < cells; i++) {
    const day = i - startOffset + 1;
    if (day < 1 || day > daysInMonth) {
      grid.append(h('div', { class: 'cal-cell out', 'aria-hidden': 'true' }));
      continue;
    }
    const iso = `${cursor}-${String(day).padStart(2, '0')}`;
    const items = byDate.get(iso) || [];
    const cell = h('div', {
      class: `cal-cell${iso === today ? ' today' : ''}`,
      role: 'gridcell',
      dataset: { date: iso },
      ondragover: (e) => { e.preventDefault(); cell.classList.add('drop'); },
      ondragleave: () => cell.classList.remove('drop'),
      ondrop: (e) => {
        e.preventDefault();
        cell.classList.remove('drop');
        const id = e.dataTransfer.getData('text/plain');
        if (id) attempt(() => data.update('posts', id, { plannedDate: iso }), `Movido para ${fmtDate(iso)}.`);
      },
    },
      h('button', { class: 'cal-day', title: 'Nova publicação neste dia', 'aria-label': `Nova publicação em ${fmtDate(iso, { day: 'numeric', month: 'long' })}`, onclick: () => editPost({ plannedDate: iso }) }, String(day)),
      items.map(chip),
    );
    grid.append(cell);
  }
  const undated = posts.filter((p) => !p.plannedDate && p.status !== 'arquivado');
  const monthRaw = first.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const monthName = monthRaw.charAt(0).toUpperCase() + monthRaw.slice(1);
  return h('div', { class: 'calendar-wrap' },
    h('section', { class: 'panel calendar' },
      h('div', { class: 'cal-nav' },
        h('button', { class: 'icon-btn', 'aria-label': 'Mês anterior', onclick: () => shift(-1) }, '‹'),
        h('h2', {}, monthName),
        h('button', { class: 'icon-btn', 'aria-label': 'Próximo mês', onclick: () => shift(1) }, '›'),
        h('button', { class: 'btn btn-ghost btn-small', onclick: () => { cursor = todayIso().slice(0, 7); rerender(); } }, 'Hoje'),
      ),
      grid,
      h('p', { class: 'help' }, 'Clique no número do dia para criar. Arraste uma publicação para outro dia para remarcar.'),
    ),
    h('aside', { class: 'panel undated' },
      h('h2', {}, 'Sem data ', h('span', { class: 'count' }, undated.length)),
      undated.length ? h('div', { class: 'chips-col' }, undated.map(chip)) : h('p', { class: 'muted small' }, 'Tudo com data.'),
    ),
  );
}

function chip(p) {
  return h('button', {
    class: `chip status-${p.status || 'ideia'}`,
    draggable: 'true',
    title: `${p.title} — ${labelOf(POST_STATUS, p.status)}`,
    ondragstart: (e) => e.dataTransfer.setData('text/plain', p.id),
    onclick: () => editPost(p),
  }, h('span', { class: 'chip-plat' }, p.platform === 'tiktok' ? 'TT' : p.platform === 'ambos' ? 'IG+TT' : 'IG'), ' ', p.title || 'Sem título');
}

// ---------- Lista ----------
function listView(posts) {
  const sorted = [...posts].sort((a, b) => {
    if (sort === 'updated') return String(b.updatedAt).localeCompare(a.updatedAt);
    const da = a.plannedDate || '9999';
    const db = b.plannedDate || '9999';
    return sort === 'date-asc' ? da.localeCompare(db) : db.localeCompare(da);
  });
  return h('section', { class: 'panel' },
    h('div', { class: 'section-head' },
      h('h2', {}, 'Publicações'),
      h('label', { class: 'inline' }, 'Ordenar ', h('select', { onchange: (e) => { sort = e.target.value; rerender(); } },
        [['date-asc', 'Data (próximas primeiro)'], ['date-desc', 'Data (recentes primeiro)'], ['updated', 'Editadas recentemente']].map(([v, l]) => h('option', { value: v, selected: v === sort }, l)))),
    ),
    !sorted.length ? emptyState('Nenhuma publicação com esses filtros.') :
      h('ul', { class: 'post-list' }, sorted.map((p) =>
        h('li', { class: 'post-row' },
          h('span', { class: 'post-date' }, p.plannedDate ? fmtDate(p.plannedDate, { weekday: 'short', day: '2-digit', month: 'short' }) : 'sem data'),
          h('button', { class: 'post-title link-btn', onclick: () => editPost(p) }, p.title || 'Sem título'),
          h('span', { class: 'meta' }, pill(labelOf(PLATFORMS, p.platform)), pill(labelOf(FORMATS, p.format)), pill(labelOf(GOALS, p.goal), 'goal'), pill(p.pillar, 'soft')),
          h('span', { class: 'post-tools' },
            h('select', { class: `status-select status-${p.status}`, 'aria-label': 'Status', onchange: (e) => attempt(() => data.update('posts', p.id, { status: e.target.value, ...(e.target.value === 'publicado' && !p.publishedDate ? { publishedDate: p.plannedDate || todayIso() } : {}) }), 'Status atualizado.') },
              POST_STATUS.map((s) => h('option', { value: s.value, selected: s.value === p.status }, s.label))),
            p.status === 'publicado' && h('button', { class: 'btn btn-small btn-ghost', onclick: () => openMetrics(p) }, hasMetrics(p) ? 'Métricas ✓' : 'Métricas'),
            p.publishedUrl && h('a', { class: 'btn btn-small btn-ghost', href: p.publishedUrl, target: '_blank', rel: 'noopener' }, 'Abrir'),
          ),
        ))),
  );
}

