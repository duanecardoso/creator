// Formatos: biblioteca de formatos validados (e os seus). Também exporta o editor de referências e a lista de hits.
import * as data from '../data.js';
import { h, page, group, cell, chips, sheet, badge, formGroups, toast, confirmDelete, norm, emptyNote, btn, tag, searchBox, filterSelect } from '../ui.js';
import { FORMATS, GOALS, TYPES, metaOf } from '../lib/formats.js';
import { hits, iso } from '../lib/insights.js';
import { contentPrompt } from '../lib/prompts.js';
import { newContent, formatOptions } from './content-sheet.js';
import { askClaude } from './claude.js';

const state = { goal: '', q: '', type: '' };
const rerender = () => document.dispatchEvent(new Event('rerender'));
const today = () => iso(new Date());

export function openFormat(f) {
  const topic = h('input', { type: 'text', placeholder: 'Tema (opcional): ex. meu sérum novo', 'aria-label': 'Tema' });
  let close;
  close = sheet({
    title: f.name,
    tall: true,
    body: h('div', { class: 'sheet-stack' },
      h('div', { class: 'format-hero' }, h('span', { class: `hero-badge c-${f.color}` }, f.emoji), h('h3', {}, f.name),
        h('p', { class: 'muted' }, [f.duration, (f.platforms || []).map((p) => (p === 'tiktok' ? 'TikTok' : 'Instagram')).join(' + ')].filter(Boolean).join(' · ')),
        h('div', { class: 'goal-tags' }, (f.goals || []).map((g) => h('span', { class: `tag t-${GOALS[g]?.color}` }, GOALS[g]?.label)))),
      group({ header: 'Por que funciona', children: [h('p', { class: 'cell prose' }, f.why)] }),
      group({ header: 'Estrutura', children: f.structure.map((s, i) => cell({ iconEl: h('span', { class: 'step-n' }, String(i + 1)), title: s })) }),
      group({ header: 'Ganchos-modelo', footer: 'Troque o ___ pelo seu tema. Use como ponto de partida, não como fórmula.', children: f.hooks.map((t) => cell({ title: t })) }),
      f.tip && group({ header: 'Dica de gravação', children: [h('p', { class: 'cell prose' }, f.tip)] }),
      group({ header: 'Usar este formato', children: [
        h('label', { class: 'cell field' }, topic),
        h('button', { type: 'button', class: 'cell tappable tint', 'data-id': 'format-today', onclick: () => { close(); setTimeout(() => newContent({ formatId: f.id, date: today(), title: topic.value.trim() }), 250); } }, 'Fazer hoje'),
        h('button', { type: 'button', class: 'cell tappable tint', 'data-id': 'format-save', onclick: () => { data.create('contents', { formatId: f.id, title: topic.value.trim() || f.name, status: 'ideia', date: '', platforms: f.platforms || ['instagram', 'tiktok'] }); toast('Guardado nas ideias'); close(); } }, 'Guardar como ideia'),
        h('button', { type: 'button', class: 'cell tappable tint', 'data-id': 'format-claude', onclick: () => {
          const c = data.create('contents', { formatId: f.id, title: topic.value.trim() || f.name, status: 'ideia', date: today(), platforms: f.platforms || ['instagram', 'tiktok'] });
          const hitTitles = hits(data.all('contents')).items.map((x) => x.content.title);
          askClaude({ kind: 'content', context: { contentId: c.id, formatId: f.id }, prompt: contentPrompt({ profile: data.profile(), format: f, topic: topic.value.trim(), hits: hitTitles }) });
          close();
        } }, '✨ Criar roteiro com o Claude'),
      ] }),
      f.custom && group({ children: [h('button', { type: 'button', class: 'cell tappable destructive', onclick: async () => { if (await confirmDelete('este formato')) { data.remove('formats', f.id); close(); } } }, 'Apagar formato')] }),
    ),
  });
}

function library() {
  const hitIds = new Set(hits(data.all('contents')).items.map((x) => x.content.formatId));
  const used = data.all('contents').reduce((m, c) => (c.formatId ? m.set(c.formatId, (m.get(c.formatId) || 0) + 1) : m), new Map());
  const list = [...FORMATS, ...data.all('formats').map((f) => ({ ...f, custom: true }))]
    .filter((f) => !state.goal || f.goals?.includes(state.goal))
    .filter((f) => !state.type || (f.custom ? true : metaOf(f.id).types.includes(state.type)))
    .filter((f) => !state.q || norm(`${f.name} ${f.why}`).includes(norm(state.q)));
  return [
    h('div', { class: 'filters' },
      searchBox(state.q, (v) => { state.q = v; rerender(); }, 'Buscar formato'),
      filterSelect('Tipo de post', Object.entries(TYPES).filter(([k]) => k !== 'stories').map(([value, t]) => ({ value, label: t.label })), state.type, (v) => { state.type = v; rerender(); })),
    chips(Object.entries(GOALS).map(([value, g]) => ({ value, label: g.label })), state.goal, (v) => { state.goal = v; rerender(); }),
    h('div', { class: 'format-grid' }, list.map((f) => h('button', { type: 'button', class: 'format-card', 'data-id': `format-${f.id}`, onclick: () => openFormat(f) },
      h('span', { class: 'fc-top' }, h('span', { class: `fc-emoji c-${f.color || 'gray'}` }, f.emoji || '✦'), hitIds.has(f.id) ? tag('Funcionou para você', 'ok') : f.custom ? tag('Seu formato', 't-brown') : null),
      h('span', { class: 'fc-name' }, f.name),
      h('span', { class: 'fc-why' }, f.why),
      h('span', { class: 'tags' }, (f.custom ? [] : metaOf(f.id).types).map((t) => tag(TYPES[t]?.label, `type-${t}`))),
      h('span', { class: 'fc-goals' }, [(f.goals || []).map((g) => GOALS[g]?.label).join(' · '), used.get(f.id) ? `usado ${used.get(f.id)}x` : null].filter(Boolean).join(' — ')),
    ))),
    !list.length && emptyNote('Nenhum formato encontrado.'),
    h('p', { class: 'subtle small' }, 'Formatos são estruturas que se repetem entre criadores porque funcionam pelo motivo descrito em cada um. O que funciona para você aparece em Desempenho conforme você registra resultados.'),
  ];
}

function newFormat() {
  const f = formGroups([
    { fields: [{ name: 'name', label: 'Nome', placeholder: 'Ex.: Teste de 3 produtos' }, { name: 'emoji', label: 'Emoji', placeholder: '✨' }] },
    { header: 'Por que funciona', fields: [{ name: 'why', label: 'Por que', type: 'textarea', rows: 2, showLabel: false }] },
    { header: 'Estrutura', footer: 'Um passo por linha.', fields: [{ name: 'structure', label: 'Estrutura', type: 'list', rows: 4, showLabel: false }] },
    { header: 'Ganchos-modelo', footer: 'Um por linha.', fields: [{ name: 'hooks', label: 'Ganchos', type: 'list', rows: 3, showLabel: false }] },
    { header: 'Serve para', fields: [{ name: 'g_seguidores', label: 'Seguidores', type: 'toggle' }, { name: 'g_comunidade', label: 'Comunidade', type: 'toggle' }, { name: 'g_marcas', label: 'Marcas', type: 'toggle' }] },
  ]);
  sheet({
    title: 'Novo formato',
    tall: true,
    body: f.el,
    onSave: () => {
      const v = f.read();
      if (!v.name) throw new Error('Dê um nome ao formato.');
      data.create('formats', {
        name: v.name, emoji: v.emoji || '✨', color: 'gray', why: v.why, structure: v.structure, hooks: v.hooks, tip: '', platforms: ['instagram', 'tiktok'],
        goals: ['seguidores', 'comunidade', 'marcas'].filter((g) => v[`g_${g}`]),
      });
      toast('Formato criado');
    },
  });
}

// Seus hits (usado na página Desempenho).
export function hitsList() {
  const r = hits(data.all('contents'));
  if (!r.items.length) {
    return emptyNote(
      'Seus destaques aparecem aqui',
      r.measured < 5
        ? `Registre os resultados de pelo menos 5 posts (hoje: ${r.measured}). Aí cada post é comparado com a sua própria média.`
        : 'Nenhum post ficou claramente acima da sua média ainda.',
    );
  }
  return group({
    footer: r.enough ? `Comparado com a sua mediana em ${r.measured} posts com resultado.` : 'Com menos de 5 posts medidos, só aparecem os que trouxeram contato de marca.',
    children: r.items.map(({ content: c, reasons }) => {
      const f = [...FORMATS, ...data.all('formats')].find((x) => x.id === c.formatId);
      return h('div', { class: 'sugg' },
        h('div', { class: 'content-main static' }, badge(f?.emoji || '⭐️', f?.color || 'yellow'),
          h('span', { class: 'cell-text' }, h('span', { class: 'cell-title' }, c.title), h('span', { class: 'cell-sub' }, `${f ? `${f.name} · ` : ''}${reasons.join(', ')}`))),
        h('button', { type: 'button', class: 'btn btn-sm', onclick: () => newContent({ formatId: c.formatId, notes: `Variação de: ${c.title}`, title: '' }) }, 'Repetir'),
      );
    }),
  });
}

export function editReference(r = {}) {
  const f = formGroups([
    { fields: [{ name: 'title', label: 'Nome', placeholder: 'Ex.: review com plot twist' }, { name: 'link', label: 'Link', type: 'url', placeholder: 'https://' }, { name: 'formatId', label: 'Formato', type: 'select', options: formatOptions, placeholder: 'Não sei' }] },
    { header: 'O que funcionou', fields: [{ name: 'worked', label: 'O que funcionou', type: 'textarea', rows: 2, showLabel: false, placeholder: 'Gancho, ritmo, assunto, edição…' }] },
    { header: 'Como eu faria do meu jeito', fields: [{ name: 'adapt', label: 'Como adaptar', type: 'textarea', rows: 2, showLabel: false, placeholder: 'Mesmo princípio, outra história' }] },
  ], r);
  let close;
  close = sheet({
    title: r.id ? 'Referência' : 'Nova referência',
    tall: true,
    body: h('div', { class: 'sheet-stack' }, f.el,
      r.id && group({ children: [
        r.link && h('a', { class: 'cell tappable tint', href: r.link, target: '_blank', rel: 'noopener noreferrer' }, 'Abrir link'),
        h('button', { type: 'button', class: 'cell tappable tint', onclick: () => { close(); setTimeout(() => newContent({ formatId: r.formatId || '', title: '', notes: `Inspirado em: ${r.title || r.link}\nO que funcionou: ${r.worked || ''}\nMeu jeito: ${r.adapt || ''}` }), 250); } }, 'Transformar em conteúdo'),
        h('button', { type: 'button', class: 'cell tappable destructive', onclick: async () => { if (await confirmDelete('esta referência')) { data.remove('references', r.id); close(); } } }, 'Apagar'),
      ] }),
    ),
    onSave: () => {
      const v = f.read();
      if (!v.title && !v.link) throw new Error('Coloque um nome ou o link.');
      r.id ? data.update('references', r.id, v) : data.create('references', v);
      toast('Salvo');
    },
  });
}

export function render(root) {
  root.append(page({
    kicker: 'Conteúdo',
    title: 'Formatos',
    subtitle: 'Estruturas que funcionam, com passo a passo e ganchos-modelo para usar do seu jeito.',
    actions: btn('Criar formato', newFormat, { iconName: 'plus', id: 'new-format' }),
    children: library(),
  }));
}
