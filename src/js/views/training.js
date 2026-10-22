// Campanhas → Briefings de treino: jobs de UGC simulados, com prazos, para manter o perfil ativo
// e o portfólio atualizado quando não há marca. Ficam fora do financeiro e nunca contam como parceria.
import * as data from '../data.js';
import { h, card, table, btn, tag, emptyNote, sheet, toast, confirmDelete, group, cell, fmtDay, copyText, filterSelect, go } from '../ui.js';
import { NICHES, PACES, nicheLabel, generateBrief, briefFromAi, briefText, parseProducts, briefKey, nextNiche, coverage } from '../lib/briefs.js';
import { PIPELINES, stageLabel, isDone, nextDeadline } from '../lib/deals.js';
import { briefingPrompt, parseBrief } from '../lib/prompts.js';
import { askClaude, onClaudeResult } from './claude.js';
import { openContent, today } from './content-sheet.js';

const state = { niche: '', source: 'qualquer', pace: 'normal', draft: null, exclude: [] };
const rerender = () => document.dispatchEvent(new Event('rerender'));
const trainings = () => data.all('deals').filter((d) => d.type === 'treino');
const products = () => parseProducts(data.profile().myProducts || '');
const workedBrands = () => [...new Set([
  ...data.all('deals').filter((d) => d.type !== 'treino' && d.brandName).map((d) => d.brandName),
  ...data.all('brands').filter((b) => b.status === 'fechado').map((b) => b.name),
])];
const short = (d) => fmtDay(d, { day: 'numeric', month: 'short' });
const SOURCES = [{ value: 'qualquer', label: 'Qualquer produto' }, { value: 'tenho', label: 'Só produtos que eu tenho' }, { value: 'inventado', label: 'Produto inventado' }];

function generate({ another = false } = {}) {
  if (!another) state.exclude = [];
  const niche = another && state.draft ? state.draft.niche : state.niche || nextNiche(trainings());
  state.draft = generateBrief({ niche, source: state.source, products: products(), exclude: state.exclude, start: today(), pace: state.pace, seed: `${Date.now()}` });
  rerender();
}

function another() {
  if (state.draft) state.exclude.push(briefKey(state.draft), `angulo:${state.draft.angle}`);
  generate({ another: true });
}

// Tira o produto da sua lista ("não tenho mais") e sugere outro.
function dontHave() {
  const b = state.draft;
  const lines = String(data.profile().myProducts || '').split('\n');
  const keep = lines.filter((l) => { const p = parseProducts(l)[0]; return !p || briefKey(p) !== briefKey(b); });
  data.saveProfile({ myProducts: keep.join('\n') });
  toast(`${b.product} saiu da sua lista`);
  another();
}

function askBrief() {
  const niche = state.niche || nextNiche(trainings());
  askClaude({
    kind: 'briefing',
    context: { niche, pace: state.pace },
    prompt: briefingPrompt({
      profile: data.profile(), niche, nicheName: nicheLabel(niche), source: state.source, products: products(), brands: workedBrands(),
      exclude: state.draft ? [`${state.draft.brand} – ${state.draft.product}`] : [], pace: PACES[state.pace].label,
    }),
  });
}

onClaudeResult('briefing', (text, ctx) => {
  const ai = parseBrief(text);
  state.draft = briefFromAi(ai, { niche: ctx.niche || nextNiche(trainings()), start: today(), pace: ctx.pace || 'normal' });
  go('marcas/campanhas', { aba: 'treino' });
  rerender();
  toast('Briefing do Claude pronto. Confira e aceite.');
});

function accept() {
  const b = state.draft;
  const d = data.create('deals', {
    type: 'treino', status: 'briefing', brandName: b.brand, title: `${nicheLabel(b.niche)} · ${b.angleLabel}`, product: b.product,
    niche: b.niche, start: b.start, scriptDue: b.scriptDue, postDate: b.postDate, deliverables: b.deliverables, brief: b, value: 0,
  });
  state.draft = null;
  state.exclude = [];
  toast('Briefing aceito. Os prazos já estão na Visão geral e no Planejamento.');
  setTimeout(() => openBrief(d), 200);
}

// ---------- Briefing (leitura) ----------
function briefBody(b) {
  const list = (header, items, id) => items?.length > 0 && group({ header, children: items.map((x) => h('div', { class: 'cell prose', 'data-brief': id }, x)) });
  return [
    h('div', { class: 'brief-head' },
      h('div', { class: 'brief-tags' },
        tag(nicheLabel(b.niche), 't-butter'),
        b.fictional ? tag('Produto inventado', 't-pink') : tag('Produto que você tem', 'ok'),
        tag('Treino · não é publi', 't-brown')),
      h('h3', { class: 'brief-title', 'data-id': 'brief-product' }, `${b.brand} · ${b.product}`),
      h('p', { class: 'muted small' }, `${b.angleLabel}${b.source === 'claude' ? ' · sugestão do Claude' : ''}`),
      b.note && h('p', { class: 'muted small' }, b.note)),
    group({ header: 'O job', children: [
      cell({ title: 'Objetivo', subtitle: b.objective }),
      cell({ title: 'Público', subtitle: b.audience }),
      cell({ title: 'Formato', subtitle: b.format }),
      cell({ title: 'Uso', subtitle: b.usage }),
    ] }),
    list('Mensagens-chave', b.keyMessages, 'msg'),
    list('Faça', b.dos, 'do'),
    list('Evite', b.donts, 'dont'),
    list('Ganchos', b.hooks, 'hook'),
    group({ header: 'Roteiro', children: (b.script || []).map((s, i) => cell({ iconEl: h('span', { class: 'step-n' }, String(i + 1)), title: s })) }),
    b.caption && group({ header: 'Legenda', children: [h('div', { class: 'cell prose' }, b.caption)] }),
  ];
}

function draftCard() {
  const b = state.draft;
  if (!b) return null;
  return card({
    title: 'Seu briefing', subtitle: 'Se não tiver o produto ou não der para gravar, peça outra sugestão.', id: 'brief-draft', cls: 'brief',
    children: h('div', { class: 'sheet-stack' },
      ...briefBody(b),
      group({ header: 'Prazos', children: b.deliverables.map((x) => cell({ title: x.text, detail: short(x.due) })) }),
      h('div', { class: 'page-actions brief-actions' },
        btn('Aceitar e começar', accept, { kind: 'primary', id: 'brief-accept' }),
        btn('Outra sugestão', another, { id: 'brief-another', iconName: 'refresh' }),
        !b.fictional && btn('Não tenho mais esse', dontHave, { id: 'brief-dont-have' }),
        btn('Copiar', async () => toast((await copyText(briefText(b))) ? 'Briefing copiado' : 'Não consegui copiar'), { kind: 'ghost', id: 'brief-copy' }),
        btn('Descartar', () => { state.draft = null; rerender(); }, { kind: 'ghost' }))),
  });
}

export function openBrief(d) {
  const b = d.brief || {};
  let status = d.status || 'briefing';
  const deliverables = (d.deliverables || []).map((x) => ({ ...x }));
  const stageBox = h('div', { class: 'stage-scroll', role: 'radiogroup', 'aria-label': 'Etapa' });
  const drawStages = () => stageBox.replaceChildren(...PIPELINES.treino.map(([k, label], i) => h('button', {
    type: 'button', role: 'radio', 'aria-checked': String(k === status), 'data-stage': k,
    class: `stage${k === status ? ' on' : ''}${i < PIPELINES.treino.findIndex(([x]) => x === status) ? ' done' : ''}`,
    onclick: () => { status = k; drawStages(); },
  }, label)));
  drawStages();
  const delivs = group({ header: 'Entregas e prazos', footer: 'Aparecem na Visão geral e no Planejamento, como um job de verdade.', children: deliverables.map((it) => {
    const cb = h('input', { type: 'checkbox', class: 'round-check', checked: Boolean(it.done), 'aria-label': 'Feito' });
    cb.addEventListener('change', () => { it.done = cb.checked; it.doneAt = cb.checked ? today() : null; });
    const due = h('input', { type: 'date', value: it.due || '', 'aria-label': 'Prazo' });
    due.addEventListener('change', () => (it.due = due.value));
    return h('div', { class: 'cell deliv-row' }, cb, h('div', { class: 'deliv-fields' }, h('span', {}, it.text), due));
  }) });
  const save = () => {
    const post = deliverables.find((x) => /postar/i.test(x.text));
    const script = deliverables.find((x) => /roteiro/i.test(x.text));
    data.update('deals', d.id, { status, deliverables, postDate: post?.due || d.postDate, scriptDue: script?.due || d.scriptDue });
  };
  let close;
  close = sheet({
    title: `Treino · ${d.product || d.brandName}`,
    tall: true,
    onSave: () => { save(); toast('Salvo'); },
    body: h('div', { class: 'sheet-stack' },
      h('p', { class: 'group-header pad-x' }, 'Etapa'),
      stageBox,
      delivs,
      ...briefBody(b),
      group({ children: [
        h('button', { type: 'button', class: 'cell tappable tint', 'data-id': 'brief-agenda', onclick: () => {
          save();
          const exists = data.all('contents').find((c) => c.dealId === d.id);
          close();
          if (exists) return setTimeout(() => openContent(exists), 260);
          const c = data.create('contents', {
            title: `UGC de treino: ${d.product || d.brandName}`, date: d.postDate || today(), type: 'video', goal: 'marcas', dealId: d.id, status: 'roteiro',
            theme: d.product || '', hook: b.hooks?.[0] || '', steps: b.script || [], caption: b.caption || '', portfolio: true, platforms: ['instagram', 'tiktok'],
          });
          setTimeout(() => openContent(c), 260);
        } }, '🗓️ Abrir o conteúdo na agenda'),
        h('button', { type: 'button', class: 'cell tappable tint', onclick: async () => toast((await copyText(briefText({ ...b, deliverables }))) ? 'Briefing copiado' : 'Não consegui copiar') }, '📋 Copiar briefing'),
        h('button', { type: 'button', class: 'cell tappable destructive', 'data-id': 'brief-delete', onclick: async () => { if (await confirmDelete('este briefing de treino')) { data.remove('deals', d.id); close(); } } }, 'Apagar briefing'),
      ] })),
  });
}

// ---------- Lateral: nichos e produtos ----------
function coverageCard() {
  const cov = coverage(trainings());
  const next = nextNiche(trainings());
  return card({
    title: 'Nichos do portfólio', subtitle: 'O gerador começa pelo nicho com menos treino', flush: true, id: 'brief-coverage',
    children: group({ children: cov.map((n) => cell({
      emoji: n.emoji, color: n.id === next ? 'orange' : 'gray', title: n.label,
      subtitle: n.total ? `${n.total} briefing(s) · ${n.done} postado(s)${n.last ? ` · último ${short(n.last)}` : ''}` : 'Nenhum treino ainda',
      chevron: true, onClick: () => { state.niche = n.id; generate(); },
    })) }),
  });
}

function editProducts() {
  const ta = h('textarea', { rows: 12, class: 'input', name: 'my-products', 'aria-label': 'Produtos que você tem', placeholder: 'Dove | óleo sérum corporal | bodycare\nElseve | óleo extraordinário | haircare\nBolsa preta transversal' }, data.profile().myProducts || '');
  sheet({
    title: 'Produtos que você tem',
    body: h('div', { class: 'sheet-stack' },
      h('p', { class: 'muted small' }, 'Um por linha: marca | produto | nicho. O nicho é opcional (haircare, skincare, bodycare, moda, fitness, tech). Os briefings com "produto que eu tenho" saem só desta lista.'),
      ta),
    onSave: () => { data.saveProfile({ myProducts: ta.value.trim() }); toast('Lista salva'); },
  });
}

function productsCard() {
  const list = products();
  const noNiche = list.filter((p) => !p.niche).length;
  return card({
    title: `Produtos que você tem (${list.length})`, subtitle: 'Para briefings que dá para gravar hoje', flush: true, id: 'brief-products',
    actions: btn('Editar', editProducts, { small: true, id: 'brief-products-edit' }),
    children: list.length
      ? group({ children: [
        ...NICHES.map((n) => ({ n, items: list.filter((p) => p.niche === n.id) })).filter((x) => x.items.length).map(({ n, items }) => cell({ emoji: n.emoji, color: 'gray', title: n.label, subtitle: items.map((p) => [p.brand, p.product].filter(Boolean).join(' ')).join(' · ') })),
        noNiche > 0 && cell({ emoji: '❔', color: 'gray', title: 'Sem nicho', subtitle: `${noNiche} produto(s): coloque | nicho no fim da linha` }),
      ] })
      : emptyNote('Lista vazia', 'Anote os produtos que você tem em casa. Sem lista, os briefings usam produtos inventados.'),
  });
}

function trainingsTable(list, td) {
  return table({
    caption: 'Briefings de treino', rows: list, rowId: (d) => `brief-${d.id}`,
    rowCls: (d) => ((nextDeadline(d)?.date || '9') < td && !isDone(d) ? 'is-late' : ''),
    onRowClick: (d) => openBrief(d),
    empty: 'Nenhum briefing aceito ainda.',
    columns: [
      { label: 'Produto', main: true, render: (d) => h('div', {}, h('div', { class: 'td-title' }, d.product || d.brandName), h('div', { class: 'td-sub' }, `${d.brandName} · ${d.brief?.angleLabel || ''}`)) },
      { label: 'Nicho', render: (d) => tag(nicheLabel(d.niche), 't-butter') },
      { label: 'Etapa', render: (d) => (isDone(d) ? tag('Concluído', 'ok') : h('span', {}, stageLabel(d))) },
      { label: 'Próximo prazo', render: (d) => {
        const nd = nextDeadline(d);
        if (!nd) return h('span', { class: 'subtle' }, '—');
        return h('span', { class: `deadline${nd.date < td ? ' late' : nd.date === td ? ' today' : ''}` }, `${nd.date < td ? 'Atrasado · ' : nd.date === td ? 'Hoje · ' : ''}${nd.label} · ${short(nd.date)}`);
      } },
      { label: 'Entregas', render: (d) => {
        const items = d.deliverables || [];
        const done = items.filter((x) => x.done).length;
        return h('span', { class: 'bar-cell' }, h('span', { class: 'meter mini' }, h('span', { style: { width: `${items.length ? Math.round((done / items.length) * 100) : 0}%` } })), h('span', { class: 'num small' }, `${done}/${items.length}`));
      } },
    ],
  });
}

export function trainingTab() {
  const td = today();
  const list = trainings().filter((d) => d.status !== 'cancelado').sort((a, b) => (isDone(a) - isDone(b)) || (nextDeadline(a)?.date || '9').localeCompare(nextDeadline(b)?.date || '9'));
  const auto = nextNiche(trainings());
  return [
    h('p', { class: 'muted small brief-intro' }, 'Jobs de UGC simulados, com briefing e prazo de verdade, para manter o perfil ativo e o portfólio atualizado quando não tem marca. São treino: não entram no financeiro e não são publi.'),
    h('div', { class: 'grid cols-main align-start' },
      h('div', { class: 'stack' },
        card({
          title: 'Novo briefing', subtitle: 'Escolha o nicho (ou deixe no automático) e gere', id: 'brief-generator',
          children: h('div', { class: 'stack' },
            h('div', { class: 'filters' },
              filterSelect(`Nicho: automático (${nicheLabel(auto)})`, NICHES.map((n) => ({ value: n.id, label: `${n.emoji} ${n.label}` })), state.niche, (v) => { state.niche = v; rerender(); }),
              h('select', { class: 'filter-select', 'aria-label': 'Produto', 'data-id': 'brief-source', onchange: (e) => { state.source = e.target.value; } }, SOURCES.map((o) => h('option', { value: o.value, selected: o.value === state.source }, o.label))),
              h('select', { class: 'filter-select', 'aria-label': 'Prazo', 'data-id': 'brief-pace', onchange: (e) => { state.pace = e.target.value; } }, Object.entries(PACES).map(([value, p]) => h('option', { value, selected: value === state.pace }, p.label)))),
            h('div', { class: 'page-actions' },
              btn('Gerar briefing', () => generate(), { kind: 'primary', id: 'brief-generate' }),
              btn('✨ Pedir ao Claude', askBrief, { id: 'brief-claude' }))),
        }),
        draftCard(),
        card({ title: 'Seus treinos', flush: true, children: trainingsTable(list, td) })),
      h('div', { class: 'stack' }, coverageCard(), productsCard())),
  ];
}
