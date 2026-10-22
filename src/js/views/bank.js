// Banco de temas: seus temas prontos, separados por linha editorial e etapa do funil.
// O plano semanal usa esses temas primeiro (respeitando o peso de cada linha).
import * as data from '../data.js';
import { h, card, table, btn, tag, emptyNote, sheet, formGroups, toast, confirmDelete, searchBox, filterSelect, norm, group, cell, fmtDay } from '../ui.js';
import { GOALS, TYPES } from '../lib/formats.js';
import { formatOptions, newContent } from './content-sheet.js';
import { iso } from '../lib/insights.js';

const state = { q: '', line: '', goal: '', used: '' };
const rerender = () => document.dispatchEvent(new Event('rerender'));
const goalOptions = Object.entries(GOALS).map(([value, g]) => ({ value, label: g.label }));
const typeOptions = Object.entries(TYPES).filter(([k]) => k !== 'stories').map(([value, t]) => ({ value, label: t.label }));

export function lineNames() {
  const names = new Set((data.profile().lines || []).map((l) => l.name));
  for (const b of data.all('bank')) if (b.line) names.add(b.line);
  return [...names];
}

// Quando cada tema do banco foi usado pela última vez (pelo plano ou à mão).
function usedMap() {
  const m = new Map();
  for (const c of data.all('contents')) {
    const key = c.bankId || c.theme;
    if (key && c.date && (!m.has(key) || m.get(key) < c.date)) m.set(key, c.date);
  }
  return m;
}

function editTheme(t = {}) {
  const f = formGroups([
    { fields: [
      { name: 'title', label: 'Tema', placeholder: 'Ex.: O erro de transformar descanso em mais uma tarefa', full: true },
      { name: 'line', label: 'Linha editorial', placeholder: 'Ex.: Vida Real & Lifestyle' },
      { name: 'goal', label: 'Etapa do funil', type: 'select', options: goalOptions },
      { name: 'type', label: 'Tipo (opcional)', type: 'select', options: typeOptions, placeholder: 'Qualquer' },
      { name: 'formatId', label: 'Formato (opcional)', type: 'select', options: formatOptions, placeholder: 'O plano escolhe' },
      { name: 'hook', label: 'Gancho (opcional)', full: true },
    ] },
  ], { goal: 'seguidores', ...t });
  let close;
  close = sheet({
    title: t.id ? 'Tema' : 'Novo tema',
    body: h('div', { class: 'sheet-stack' }, f.el,
      t.id && group({ children: [
        h('button', { type: 'button', class: 'cell tappable tint', 'data-id': 'bank-use', onclick: () => { close(); setTimeout(() => newContent({ title: t.title, theme: t.title, goal: t.goal, type: t.type || 'video', formatId: t.formatId || '', hook: t.hook || '', bankId: t.id, date: iso(new Date()) }), 250); } }, 'Fazer hoje'),
        h('button', { type: 'button', class: 'cell tappable destructive', onclick: async () => { if (await confirmDelete('este tema do banco')) { data.remove('bank', t.id); close(); } } }, 'Apagar tema'),
      ] })),
    onSave: () => {
      const v = f.read();
      if (!String(v.title || '').trim()) throw new Error('Escreva o tema.');
      const rec = { title: v.title.trim(), line: (v.line || '').trim(), goal: v.goal || 'seguidores', type: v.type || '', formatId: v.formatId || '', hook: (v.hook || '').trim() };
      t.id ? data.update('bank', t.id, rec) : data.create('bank', rec);
      toast('Tema salvo');
    },
  });
}

// Colar vários temas de uma vez (um por linha), por exemplo de uma conversa com o Claude.
function pasteThemes() {
  const ta = h('textarea', { rows: 10, class: 'input', placeholder: 'Um tema por linha', 'aria-label': 'Temas, um por linha', name: 'bank-paste' });
  const f = formGroups([{ fields: [
    { name: 'line', label: 'Linha editorial', placeholder: 'Ex.: Cultura Pop & Repertório' },
    { name: 'goal', label: 'Etapa do funil', type: 'select', options: goalOptions },
    { name: 'type', label: 'Tipo (opcional)', type: 'select', options: typeOptions, placeholder: 'Qualquer' },
  ] }], { goal: 'seguidores' });
  sheet({
    title: 'Adicionar vários temas',
    body: h('div', { class: 'sheet-stack' }, h('p', { class: 'muted small' }, 'Cole a lista. Números, marcadores e linhas vazias são ignorados; temas repetidos não entram de novo.'), ta, f.el),
    onSave: () => {
      const v = f.read();
      const have = new Set(data.all('bank').map((b) => norm(b.title)));
      const lines = ta.value.split('\n').map((l) => l.replace(/^\s*([-*•·]|\d+[.)])\s*/, '').replace(/^["“]|["”]$/g, '').trim()).filter((l) => l.length > 3);
      let n = 0;
      for (const title of lines) {
        if (have.has(norm(title))) continue;
        have.add(norm(title));
        data.create('bank', { title, line: (v.line || '').trim(), goal: v.goal || 'seguidores', type: v.type || '' });
        n++;
      }
      if (!n) throw new Error('Nenhum tema novo para adicionar.');
      toast(`${n} tema(s) adicionados`);
    },
  });
}

function linesCard(names) {
  const lines = data.profile().lines || [];
  const weight = (n) => lines.find((l) => l.name === n)?.weight ?? '';
  const save = (name, w) => {
    const next = names.map((n) => ({ name: n, weight: n === name ? w : Number(weight(n)) || 0 }));
    data.saveProfile({ lines: next });
  };
  const count = (n) => data.all('bank').filter((b) => b.line === n).length;
  return card({
    title: 'Linhas editoriais',
    subtitle: 'O peso decide quanto cada linha aparece no plano da semana',
    flush: true,
    children: names.length
      ? group({ children: names.map((n) => cell({
        title: n || 'Sem linha', subtitle: `${count(n)} tema(s)`,
        accessory: h('label', { class: 'weight' }, h('input', { type: 'number', min: '0', max: '100', step: '5', value: weight(n), placeholder: '—', 'aria-label': `Peso de ${n}`, class: 'input', onchange: (e) => save(n, Math.max(0, Number(e.target.value) || 0)) }), h('span', {}, '%')),
      })) })
      : emptyNote('Nenhuma linha ainda', 'Dê uma linha aos temas para equilibrar o plano.'),
  });
}

export function bankTab() {
  const all = data.all('bank');
  const used = usedMap();
  const names = lineNames();
  const list = all
    .filter((b) => !state.line || b.line === state.line)
    .filter((b) => !state.goal || (b.goal || 'seguidores') === state.goal)
    .filter((b) => !state.used || (state.used === 'novo' ? !used.has(b.id) && !used.has(b.title) : used.has(b.id) || used.has(b.title)))
    .filter((b) => !state.q || norm(b.title).includes(norm(state.q)))
    .sort((a, b) => (a.line || '').localeCompare(b.line || '') || a.title.localeCompare(b.title));
  const byGoal = Object.keys(GOALS).map((g) => all.filter((b) => (b.goal || 'seguidores') === g).length);
  return [
    h('div', { class: 'toolbar' },
      h('p', { class: 'muted small' }, all.length ? `${all.length} temas · topo ${byGoal[0]} · meio ${byGoal[1]} · fundo ${byGoal[2]}. O plano usa estes temas primeiro.` : 'Guarde aqui os temas que têm a sua cara. O plano semanal usa estes temas antes dos modelos genéricos.'),
      h('div', { class: 'page-actions' },
        btn('Adicionar vários', pasteThemes, { small: true, id: 'bank-paste' }),
        btn('Novo tema', () => editTheme(), { small: true, kind: 'primary', iconName: 'plus', id: 'bank-new' }))),
    h('div', { class: 'grid cols-main align-start' },
      h('div', { class: 'stack' },
        h('div', { class: 'filters' },
          searchBox(state.q, (v) => { state.q = v; rerender(); }, 'Buscar tema'),
          filterSelect('Linha', names.map((n) => ({ value: n, label: n })), state.line, (v) => { state.line = v; rerender(); }),
          filterSelect('Funil', goalOptions, state.goal, (v) => { state.goal = v; rerender(); }),
          filterSelect('Uso', [{ value: 'novo', label: 'Ainda não usados' }, { value: 'usado', label: 'Já usados' }], state.used, (v) => { state.used = v; rerender(); })),
        card({ flush: true, children: table({
          caption: 'Banco de temas', rows: list, rowId: (b) => `bank-${b.id}`, onRowClick: (b) => editTheme(b),
          empty: all.length ? 'Nenhum tema com esses filtros.' : 'Seu banco está vazio.',
          columns: [
            { label: 'Tema', main: true, render: (b) => h('div', {}, h('div', { class: 'td-title' }, b.title), b.line && h('div', { class: 'td-sub' }, b.line)) },
            { label: 'Funil', render: (b) => tag(GOALS[b.goal || 'seguidores']?.short, `t-${GOALS[b.goal || 'seguidores']?.color}`) },
            { label: 'Tipo', render: (b) => (b.type ? tag(TYPES[b.type]?.label, `type-${b.type}`) : h('span', { class: 'subtle' }, 'qualquer')) },
            { label: 'Usado', render: (b) => { const d = used.get(b.id) || used.get(b.title); return d ? h('span', { class: 'subtle' }, fmtDay(d, { day: 'numeric', month: 'short' })) : tag('novo', 'ok'); } },
          ],
        }) })),
      linesCard(names)),
  ];
}
