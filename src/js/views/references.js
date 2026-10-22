// Referências: posts de outros criadores que funcionaram, com o que adaptar (sem copiar).
import * as data from '../data.js';
import { h, page, card, btn, table, searchBox, filterSelect, tag, fmtDay, emptyNote, norm } from '../ui.js';
import { FORMATS } from '../lib/formats.js';
import { editReference } from './formats.js';

const state = { q: '', formatId: '' };
const rerender = () => document.dispatchEvent(new Event('rerender'));

export function render(root) {
  const all = data.all('references').slice().sort((a, b) => String(b.createdAt).localeCompare(a.createdAt));
  const formats = [...FORMATS, ...data.all('formats')];
  const list = all
    .filter((r) => !state.formatId || r.formatId === state.formatId)
    .filter((r) => !state.q || norm([r.title, r.worked, r.adapt, r.link].join(' ')).includes(norm(state.q)));
  root.append(page({
    kicker: 'Conteúdo',
    title: 'Referências',
    subtitle: 'Posts de outros criadores que funcionaram: o que chamou atenção e como fazer do seu jeito.',
    actions: btn('Nova referência', () => editReference(), { kind: 'primary', iconName: 'plus', id: 'new-reference' }),
    children: [
      all.length > 0 && h('div', { class: 'filters' },
        searchBox(state.q, (v) => { state.q = v; rerender(); }, 'Buscar referência'),
        filterSelect('Formato', formats.map((f) => ({ value: f.id, label: f.name })), state.formatId, (v) => { state.formatId = v; rerender(); })),
      !all.length
        ? emptyNote('Nenhuma referência ainda', 'Viu um post que bombou? Salve o link e anote o que funcionou. Depois transforme em conteúdo seu.', btn('Nova referência', () => editReference(), { kind: 'primary' }))
        : card({
          flush: true,
          children: table({
            caption: 'Referências',
            rows: list,
            rowId: (r) => `ref-${r.id}`,
            onRowClick: (r) => editReference(r),
            empty: 'Nada com esses filtros.',
            columns: [
              { label: 'Referência', main: true, render: (r) => h('div', {}, h('div', { class: 'td-title' }, r.title || 'Sem nome'), r.link && h('a', { href: r.link, target: '_blank', rel: 'noopener noreferrer', class: 'td-sub' }, r.link.replace(/^https?:\/\/(www\.)?/, '').slice(0, 48))) },
              { label: 'Formato', render: (r) => tag(formats.find((f) => f.id === r.formatId)?.name) || h('span', { class: 'subtle' }, '—') },
              { label: 'O que funcionou', render: (r) => h('span', { class: 'clamp-2' }, r.worked || '—') },
              { label: 'Como adaptar', render: (r) => h('span', { class: 'clamp-2' }, r.adapt || '—') },
              { label: 'Salva em', render: (r) => (r.createdAt ? fmtDay(r.createdAt.slice(0, 10), { day: 'numeric', month: 'short' }) : '—') },
            ],
          }),
        }),
    ],
  }));
}
