// Conteúdos: todos os conteúdos em tabela (com filtros) ou em quadro por etapa.
import * as data from '../data.js';
import { h, page, card, btn, tabs, table, filterSelect, searchBox, badge, postThumb, tag, fmtDay, fmtNum, emptyNote, toast, norm, go } from '../ui.js';
import { FORMATS, GOALS, TYPES, formatById } from '../lib/formats.js';
import { STATUSES, statusIndex, scores, addDays } from '../lib/insights.js';
import { openContent, newContent, today } from './content-sheet.js';
import { missingPhotos } from './designer.js';

const state = { view: 'tabela', q: '', status: '', type: '', formatId: '', goal: '', period: '' };
const rerender = () => document.dispatchEvent(new Event('rerender'));
const set = (k) => (v) => { state[k] = v; rerender(); };

const PERIODS = [
  { value: 'semana', label: 'Próximos 7 dias' },
  { value: 'mes', label: 'Este mês' },
  { value: 'passado', label: 'Já passaram' },
  { value: 'sem-data', label: 'Sem data (ideias)' },
];

function filtered() {
  const t = today();
  return data.all('contents').filter((c) => {
    if (state.status && c.status !== state.status) return false;
    if (state.type && (c.type || 'video') !== state.type) return false;
    if (state.formatId && c.formatId !== state.formatId) return false;
    if (state.goal && c.goal !== state.goal) return false;
    if (state.period === 'semana' && !(c.date >= t && c.date <= addDays(t, 7))) return false;
    if (state.period === 'mes' && !(c.date || '').startsWith(t.slice(0, 7))) return false;
    if (state.period === 'passado' && !(c.date && c.date < t)) return false;
    if (state.period === 'sem-data' && c.date) return false;
    if (state.q) {
      const hay = norm([c.title, c.theme, c.hook, c.notes, c.caption].join(' '));
      if (!norm(state.q).split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    return true;
  }).sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
}

const statusSelect = (c) => h('select', {
  class: 'filter-select status-select', 'aria-label': `Etapa de ${c.title}`, 'data-id': 'status-select',
  onchange: (e) => {
    const patch = { status: e.target.value };
    if (e.target.value === 'postado' && !c.postedAt) patch.postedAt = c.date && c.date <= today() ? c.date : today();
    data.update('contents', c.id, patch);
    toast('Etapa atualizada');
  },
}, STATUSES.map((s) => h('option', { value: s.id, selected: s.id === c.status }, s.label)));

function tableView(list) {
  return card({
    flush: true,
    children: table({
      caption: 'Conteúdos',
      rows: list,
      rowId: (c) => `row-${c.id}`,
      rowCls: (c) => (c.date && c.date < today() && c.status !== 'postado' ? 'is-late' : ''),
      onRowClick: (c) => openContent(c),
      empty: 'Nenhum conteúdo com esses filtros.',
      columns: [
        { label: 'Conteúdo', main: true, render: (c) => {
          const f = formatById(c.formatId, data.all('formats'));
          return h('div', { class: 'td-flex' }, c.igThumb ? postThumb(c, { cls: 'td-thumb', emoji: f?.emoji || '📝', color: f?.color || 'gray' }) : badge(f?.emoji || '📝', f?.color || 'gray'),
            h('div', {}, h('div', { class: 'td-title' }, c.title || 'Sem título'), h('div', { class: 'td-sub' }, [f?.name, c.theme && c.theme !== c.title ? c.theme : null].filter(Boolean).join(' · '))));
        } },
        { label: 'Data', render: (c) => (c.date ? fmtDay(c.date, { day: 'numeric', month: 'short', weekday: 'short' }) : h('span', { class: 'subtle' }, 'ideia')) },
        { label: 'Tipo', render: (c) => tag(TYPES[c.type || 'video']?.label, `type-${c.type || 'video'}`) },
        { label: 'Foco', render: (c) => (GOALS[c.goal] ? tag(GOALS[c.goal].label, `t-${GOALS[c.goal].color}`) : h('span', { class: 'subtle' }, '—')) },
        { label: 'Etapa', render: statusSelect },
        { label: 'Resultado', cls: 'right', render: (c) => {
          const s = scores(c);
          if (c.status !== 'postado') return missingPhotos(c) ? tag(`📷 ${missingPhotos(c)}`, 'warn') : h('span', { class: 'subtle' }, '—');
          return s.views !== null ? h('span', { class: 'num' }, `${fmtNum(s.views)} views${c.results?.follows != null ? ` · +${c.results.follows}` : ''}`) : h('span', { class: 'subtle' }, 'sem números');
        } },
      ],
    }),
  });
}

function boardView(list) {
  return h('div', { class: 'kanban' }, STATUSES.map((s) => {
    const items = list.filter((c) => (c.status || 'ideia') === s.id);
    const col = h('section', {
      class: 'kanban-col', 'data-status': s.id, 'aria-label': s.label,
      ondragover: (e) => { e.preventDefault(); col.classList.add('drop'); },
      ondragleave: () => col.classList.remove('drop'),
      ondrop: (e) => {
        e.preventDefault();
        col.classList.remove('drop');
        const id = e.dataTransfer.getData('text/plain');
        const c = data.get('contents', id);
        if (!c || c.status === s.id) return;
        const patch = { status: s.id };
        if (s.id === 'postado' && !c.postedAt) patch.postedAt = c.date && c.date <= today() ? c.date : today();
        data.update('contents', id, patch);
        toast(`Movido para ${s.label}`);
      },
    },
    h('header', { class: 'kanban-head' }, h('span', {}, s.label), h('span', { class: 'tag' }, String(items.length))),
    h('div', { class: 'kanban-body' }, items.map((c) => {
      const f = formatById(c.formatId, data.all('formats'));
      return h('button', {
        type: 'button', class: 'kanban-card', draggable: 'true', 'data-id': `kcard-${c.id}`,
        ondragstart: (e) => e.dataTransfer.setData('text/plain', c.id),
        onclick: () => openContent(c),
      },
      h('span', { class: 'tags' }, tag(TYPES[c.type || 'video']?.label, `type-${c.type || 'video'}`), c.date ? tag(fmtDay(c.date, { day: 'numeric', month: 'short' })) : null),
      h('strong', {}, c.title || 'Sem título'),
      f && h('span', { class: 'subtle small' }, f.name));
    }), !items.length && h('p', { class: 'subtle small kanban-empty' }, 'Arraste para cá')));
    return col;
  }));
}

export function render(root) {
  const list = filtered();
  const total = data.all('contents').length;
  const active = ['status', 'type', 'formatId', 'goal', 'period', 'q'].some((k) => state[k]);
  root.append(page({
    kicker: 'Conteúdo',
    title: 'Conteúdos',
    subtitle: `${list.length} de ${total} conteúdo(s): ideias, roteiros, produções e publicados.`,
    actions: [
      btn('Exportar CSV', () => data.exportCsv(), { iconName: 'download', kind: 'ghost' }),
    ],
    children: [
      tabs([{ value: 'tabela', label: 'Tabela' }, { value: 'quadro', label: 'Quadro por etapa' }], state.view, set('view'), 'Visualização'),
      h('div', { class: 'filters' },
        searchBox(state.q, set('q'), 'Buscar por título, tema, gancho…'),
        state.view === 'tabela' && filterSelect('Etapa', STATUSES.map((s) => ({ value: s.id, label: s.label })), state.status, set('status')),
        filterSelect('Tipo', Object.entries(TYPES).map(([value, t]) => ({ value, label: t.label })), state.type, set('type')),
        filterSelect('Foco', Object.entries(GOALS).map(([value, g]) => ({ value, label: g.label })), state.goal, set('goal')),
        filterSelect('Formato', [...FORMATS, ...data.all('formats')].map((f) => ({ value: f.id, label: f.name })), state.formatId, set('formatId')),
        filterSelect('Período', PERIODS, state.period, set('period')),
        active && btn('Limpar filtros', () => { Object.assign(state, { q: '', status: '', type: '', formatId: '', goal: '', period: '' }); rerender(); }, { kind: 'ghost', small: true }),
      ),
      !total
        ? emptyNote('Nenhum conteúdo ainda', 'Gere o plano da semana ou crie um conteúdo.', btn('Ir para o Planejamento', () => go('conteudo/planejamento'), { kind: 'primary' }))
        : state.view === 'tabela' ? tableView(list) : boardView(list),
    ],
  }));
}
