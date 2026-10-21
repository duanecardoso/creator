// Aba Formatos: biblioteca de formatos validados, seus hits e referências de outros criadores.
import * as data from '../data.js';
import { h, page, group, cell, segmented, chips, sheet, badge, formGroups, toast, confirmDelete, norm, navButton, emptyNote } from '../ui.js';
import { FORMATS, GOALS } from '../lib/formats.js';
import { hits, iso } from '../lib/insights.js';
import { contentPrompt } from '../lib/prompts.js';
import { newContent, formatOptions } from './content-sheet.js';
import { askClaude } from './claude.js';

const state = { tab: 'biblioteca', goal: '', q: '' };
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
  const list = [...FORMATS, ...data.all('formats').map((f) => ({ ...f, custom: true }))]
    .filter((f) => !state.goal || f.goals?.includes(state.goal))
    .filter((f) => !state.q || norm(`${f.name} ${f.why}`).includes(norm(state.q)));
  const search = h('input', { type: 'search', class: 'search', placeholder: 'Buscar formato', value: state.q, 'aria-label': 'Buscar formato' });
  search.addEventListener('input', () => {
    state.q = search.value;
    const pos = search.selectionStart;
    rerender();
    const s = document.querySelector('.search');
    s?.focus();
    s?.setSelectionRange(pos, pos);
  });
  return [
    h('div', { class: 'pad-x' }, search),
    h('div', { class: 'pad-x' }, chips(Object.entries(GOALS).map(([value, g]) => ({ value, label: g.label })), state.goal, (v) => { state.goal = v; rerender(); })),
    h('div', { class: 'format-grid' }, list.map((f) => h('button', { type: 'button', class: 'format-card', 'data-id': `format-${f.id}`, onclick: () => openFormat(f) },
      h('span', { class: `fc-emoji c-${f.color || 'gray'}` }, f.emoji || '✦'),
      h('span', { class: 'fc-name' }, f.name),
      h('span', { class: 'fc-goals' }, (f.goals || []).map((g) => GOALS[g]?.label).join(' · ')),
    ))),
    !list.length && emptyNote('Nenhum formato encontrado.'),
    group({ footer: 'Formatos são estruturas que se repetem entre criadores porque funcionam pelo motivo descrito em cada um. O que funciona para VOCÊ aparece em "Meus hits" conforme você registra resultados.', children: [
      cell({ emoji: '➕', color: 'gray', title: 'Criar meu próprio formato', chevron: true, onClick: newFormat }),
    ] }),
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

function myHits() {
  const r = hits(data.all('contents'));
  if (!r.items.length) {
    return [emptyNote(
      'Seus hits aparecem aqui',
      r.measured < 5
        ? `Registre os resultados de pelo menos 5 posts (hoje: ${r.measured}). Aí o site compara cada post com a sua própria média e mostra o que trouxe mais seguidores, salvamentos ou marcas.`
        : 'Nenhum post ficou claramente acima da sua média ainda. Continue registrando.',
    )];
  }
  return [group({
    header: r.enough ? 'Acima da sua média' : 'Trouxeram marcas',
    footer: r.enough ? `Comparado com a sua mediana em ${r.measured} posts com resultado.` : 'Com menos de 5 posts medidos, só aparecem os que trouxeram contato de marca.',
    children: r.items.map(({ content: c, reasons }) => {
      const f = [...FORMATS, ...data.all('formats')].find((x) => x.id === c.formatId);
      return h('div', { class: 'sugg' },
        h('div', { class: 'content-main static' }, badge(f?.emoji || '⭐️', f?.color || 'yellow'),
          h('span', { class: 'cell-text' }, h('span', { class: 'cell-title' }, c.title), h('span', { class: 'cell-sub' }, `${f ? `${f.name} · ` : ''}${reasons.join(', ')}`))),
        h('button', { type: 'button', class: 'next-btn', onclick: () => newContent({ formatId: c.formatId, notes: `Variação de: ${c.title}`, title: '' }) }, 'Repetir'),
      );
    }),
  })];
}

function references() {
  const refs = data.all('references').slice().sort((a, b) => String(b.createdAt).localeCompare(a.createdAt));
  return [
    refs.length
      ? group({ header: 'Salvos de outros criadores', children: refs.map((r) => cell({ emoji: '🔖', color: 'purple', title: r.title || r.link || 'Referência', subtitle: r.worked || r.link, chevron: true, onClick: () => editReference(r) })) })
      : emptyNote('Nenhuma referência ainda', 'Viu um post que bombou? Salve o link e anote o que funcionou. Depois transforme em conteúdo seu, sem copiar.'),
  ];
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
  const tabs = [{ value: 'biblioteca', label: 'Biblioteca' }, { value: 'hits', label: 'Meus hits' }, { value: 'referencias', label: 'Referências' }];
  root.append(page({
    title: 'Formatos',
    subtitle: 'O que já funciona, para você usar com o seu jeito',
    right: state.tab === 'referencias' ? navButton('', () => editReference(), { iconName: 'plus', id: 'new-reference' }) : null,
    children: [
      h('div', { class: 'pad-x' }, segmented(tabs, state.tab, (v) => { state.tab = v; rerender(); }, 'Seções')),
      state.tab === 'biblioteca' ? library() : state.tab === 'hits' ? myHits() : references(),
    ],
  }));
}
