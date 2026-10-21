// A. Laboratório de ideias: briefing, geração (IA ou prompt para copiar) e banco de ideias.
import * as data from '../data.js';
import { h, put, clear, form, openEditor, filterBar, matches, pill, attempt, toast, emptyState, confirmDialog, go, norm } from '../ui.js';
import { GOALS, NICHES, PLATFORMS, FORMATS, AUDIENCES, APPROACHES, IDEA_STATUS, labelOf } from '../constants.js';
import { checkHook } from '../lib/hookcheck.js';
import { aiSteps } from './ai-bridge.js';

const filters = { q: '', status: '', goal: '', niche: '', platform: '', format: '', approach: '' };
let brief = loadBrief();
let result = null; // { critique, ideas: [] } da última geração
let expanded = new Set();

function loadBrief() {
  try {
    return JSON.parse(sessionStorage.getItem('brief') || '{}');
  } catch {
    return {};
  }
}
function saveBrief() {
  try {
    sessionStorage.setItem('brief', JSON.stringify(brief));
  } catch {
    /* armazenamento indisponível: segue só em memória */
  }
}

const refOptions = () => data.all('references').map((r) => ({ value: r.id, label: r.title || r.url || 'Referência sem título' }));
const brandOptions = () => data.all('brands').map((b) => ({ value: b.id, label: b.name || 'Marca sem nome' }));

export function ideaFields() {
  return [
    { name: 'title', label: 'Título', required: true, full: true },
    { name: 'hook', label: 'Gancho', type: 'textarea', rows: 2, check: checkHook, help: 'O revisor aponta padrões que você pediu para evitar.' },
    { name: 'concept', label: 'Conceito', type: 'textarea', rows: 3 },
    { name: 'development', label: 'Desenvolvimento', type: 'textarea', rows: 4 },
    { name: 'strategicGoal', label: 'Objetivo estratégico', type: 'textarea', rows: 2 },
    { name: 'rationale', label: 'Justificativa', type: 'textarea', rows: 3 },
    { name: 'cta', label: 'CTA', type: 'textarea', rows: 2 },
    { name: 'visuals', label: 'Sugestões visuais', type: 'textarea', rows: 2 },
    { name: 'needsVerification', label: 'Precisa confirmar antes de gravar', type: 'textarea', rows: 2, help: 'Um item por linha.' },
    { type: 'section', label: 'Classificação' },
    { name: 'goal', label: 'Objetivo', type: 'select', options: GOALS },
    { name: 'niche', label: 'Nicho', type: 'select', options: NICHES },
    { name: 'platform', label: 'Plataforma', type: 'select', options: PLATFORMS },
    { name: 'format', label: 'Formato', type: 'select', options: FORMATS },
    { name: 'audience', label: 'Público prioritário', type: 'select', options: AUDIENCES },
    { name: 'approach', label: 'Abordagem', type: 'select', options: APPROACHES },
    { name: 'status', label: 'Status', type: 'select', options: IDEA_STATUS },
    { name: 'brandId', label: 'Marca relacionada', type: 'select', options: brandOptions },
    { name: 'referenceIds', label: 'Referências relacionadas', type: 'relation', options: refOptions, emptyText: 'Nenhuma referência na biblioteca ainda.' },
    { name: 'notes', label: 'Anotações', type: 'textarea', rows: 2 },
  ];
}

const listToText = (v) => (Array.isArray(v) ? v.join('\n') : v || '');

export function editIdea(idea = {}) {
  openEditor({
    title: idea.id ? 'Editar ideia' : 'Nova ideia',
    fields: ideaFields(),
    values: { status: 'nova', ...idea, needsVerification: listToText(idea.needsVerification) },
    onSave: (v) => (idea.id ? data.update('ideas', idea.id, v) : data.create('ideas', { source: 'manual', ...v })),
    onDelete: idea.id ? () => data.remove('ideas', idea.id) : null,
  });
}

export function render(root, params) {
  if (params.edit) {
    const idea = data.get('ideas', params.edit);
    history.replaceState(null, '', '#/ideias');
    if (idea) queueMicrotask(() => editIdea(idea));
  }
  if (params.ref) {
    brief.referenceIds = [...new Set([...(brief.referenceIds || []), params.ref])];
    history.replaceState(null, '', '#/ideias');
  }
  if (params.brand) {
    brief.brandId = params.brand;
    history.replaceState(null, '', '#/ideias');
  }
  put(root, 
    h('header', { class: 'page-head' },
      h('div', {}, h('h1', {}, 'Laboratório de ideias'), h('p', { class: 'lede' }, 'Monte um briefing, gere ideias com ângulos diferentes e guarde as que valem a pena.')),
      h('button', { class: 'btn', onclick: () => editIdea() }, '+ Ideia manual'),
    ),
    briefingSection(),
    resultSection(),
    savedSection(),
  );
}

function briefingSection() {
  const f = form(
    [
      { name: 'goal', label: 'Objetivo', type: 'select', options: GOALS, placeholder: 'Livre' },
      { name: 'niche', label: 'Nicho', type: 'select', options: NICHES, placeholder: 'Livre' },
      { name: 'subject', label: 'Assunto', placeholder: 'Ex.: minha rotina de skincare no inverno', full: true },
      { name: 'platform', label: 'Plataforma', type: 'select', options: PLATFORMS, placeholder: 'Livre' },
      { name: 'format', label: 'Formato', type: 'select', options: FORMATS, placeholder: 'Livre' },
      { name: 'audience', label: 'Público prioritário', type: 'select', options: AUDIENCES, placeholder: 'Livre' },
      { name: 'approach', label: 'Abordagem', type: 'select', options: APPROACHES, placeholder: 'Variada' },
      { name: 'quantity', label: 'Quantidade', type: 'select', options: ['3', '4', '5', '6'].map((v) => ({ value: v, label: `${v} ideias` })), placeholder: '4 ideias' },
      { name: 'brandId', label: 'Marca (opcional)', type: 'select', options: brandOptions, placeholder: 'Nenhuma' },
      { name: 'premise', label: 'Sua ideia ou premissa (opcional)', type: 'textarea', rows: 2, placeholder: 'Se já tem uma ideia, escreva aqui. Ela será avaliada com honestidade, não só aceita.' },
      { name: 'extra', label: 'Observações', type: 'textarea', rows: 2, placeholder: 'Restrições, contexto, algo que aconteceu essa semana…' },
      { name: 'referenceIds', label: 'Usar princípios destas referências', type: 'relation', options: refOptions, emptyText: 'Cadastre referências na Biblioteca para usá-las aqui.' },
    ],
    brief,
  );
  const sync = () => {
    brief = f.read();
    saveBrief();
  };
  f.el.addEventListener('input', sync);
  f.el.addEventListener('change', sync);

  return h('section', { class: 'panel briefing', 'aria-labelledby': 'brief-title' },
    h('h2', { id: 'brief-title' }, 'Briefing'),
    f.el,
    aiSteps({ kind: 'ideas', label: 'Gerar ideias com IA:', getBody: () => ({ briefing: brief }), onResult: useResult }),
    h('p', { class: 'help' }, 'O prompt já leva seu perfil, suas regras, o briefing e as referências escolhidas. Cole no Claude, copie a resposta inteira e use o passo 3.'),
    h('div', { class: 'row-actions' },
      h('button', { class: 'btn btn-ghost', onclick: () => { brief = {}; saveBrief(); rerender(); } }, 'Limpar briefing'),
    ),
  );
}

const rerender = () => {
  const main = document.getElementById('main');
  clear(main);
  render(main, {});
};

function useResult(parsed) {
  result = parsed;
  toast(`${result.ideas.length} ideias recebidas. Revise e salve as boas.`);
  rerender();
  document.getElementById('result')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Tenta encaixar o texto livre da IA numa opção conhecida.
function matchOption(list, text, fallback) {
  const t = norm(text);
  if (!t) return fallback || '';
  const hit = list.find((o) => t.includes(norm(o.value)) || t.includes(norm(o.label)) || norm(o.label).includes(t));
  return hit?.value || fallback || '';
}

function fromAi(i) {
  return {
    title: i.title,
    concept: i.concept,
    hook: i.hook,
    development: i.development,
    strategicGoal: i.strategicGoal,
    rationale: i.rationale,
    cta: i.cta,
    visuals: i.visuals,
    needsVerification: i.needsVerification || [],
    goal: brief.goal || '',
    niche: brief.niche || '',
    platform: matchOption(PLATFORMS, i.platform, brief.platform),
    format: matchOption(FORMATS, i.format, brief.format),
    approach: matchOption(APPROACHES, i.approach, brief.approach),
    audience: matchOption(AUDIENCES, i.audience, brief.audience),
    brandId: brief.brandId || null,
    referenceIds: brief.referenceIds || [],
    status: 'nova',
    source: 'ia',
  };
}

function resultSection() {
  if (!result) return null;
  const pending = result.ideas.filter((i) => !i._saved && !i._dropped);
  return h('section', { class: 'panel result', id: 'result', 'aria-labelledby': 'res-title' },
    h('div', { class: 'section-head' },
      h('h2', { id: 'res-title' }, 'Resultado da geração'),
      h('div', { class: 'row-actions' },
        pending.length > 1 && h('button', { class: 'btn btn-small', onclick: async () => {
          for (const i of pending) {
            const ok = await attempt(() => data.create('ideas', fromAi(i)));
            if (ok) i._saved = true;
          }
          toast('Ideias salvas.');
          rerender();
        } }, 'Salvar todas'),
        h('button', { class: 'btn btn-ghost btn-small', onclick: () => { result = null; rerender(); } }, 'Fechar'),
      ),
    ),
    result.critique && h('div', { class: 'critique' }, h('strong', {}, 'Leitura crítica do briefing'), h('p', {}, result.critique)),
    h('ol', { class: 'idea-results' }, result.ideas.map((i) =>
      h('li', { class: `idea-result${i._saved ? ' saved' : ''}${i._dropped ? ' dropped' : ''}` },
        ideaBody({ ...fromAi(i), title: i.title }, true),
        h('div', { class: 'row-actions' },
          i._saved ? pill('Salva', 'ok') : i._dropped ? pill('Descartada') : [
            h('button', { class: 'btn btn-small btn-primary', onclick: async () => { if (await attempt(() => data.create('ideas', fromAi(i)), 'Ideia salva.')) { i._saved = true; rerender(); } } }, 'Salvar'),
            h('button', { class: 'btn btn-small btn-ghost', onclick: () => { i._dropped = true; rerender(); } }, 'Descartar'),
          ],
        ),
      ),
    )),
  );
}

function ideaBody(i, open = false) {
  const issues = checkHook(i.hook);
  const rows = [
    ['Gancho', i.hook],
    ['Conceito', i.concept],
    ['Desenvolvimento', i.development],
    ['Objetivo estratégico', i.strategicGoal],
    ['Justificativa', i.rationale],
    ['CTA', i.cta],
    ['Visual', i.visuals],
  ].filter(([, v]) => v);
  const verify = Array.isArray(i.needsVerification) ? i.needsVerification : String(i.needsVerification || '').split('\n').filter(Boolean);
  return h('div', { class: 'idea-body' },
    h('h3', {}, i.title || 'Sem título'),
    h('p', { class: 'meta' },
      pill(labelOf(PLATFORMS, i.platform)), pill(labelOf(FORMATS, i.format)), pill(labelOf(APPROACHES, i.approach)),
      pill(labelOf(GOALS, i.goal), 'goal'), pill(labelOf(NICHES, i.niche)), pill(labelOf(AUDIENCES, i.audience) && `para ${labelOf(AUDIENCES, i.audience).toLowerCase()}`),
    ),
    open && h('dl', { class: 'details' }, rows.map(([k, v]) => [h('dt', {}, k), h('dd', {}, v)])),
    open && verify.length > 0 && h('div', { class: 'verify' }, h('strong', {}, 'Confirmar antes de gravar'), h('ul', {}, verify.map((v) => h('li', {}, v)))),
    open && issues.length > 0 && h('div', { class: 'hook-warnings-box' }, h('strong', {}, 'Revisor de gancho'), h('ul', {}, issues.map((v) => h('li', {}, v)))),
  );
}

function savedSection() {
  const all = data.all('ideas');
  const list = all
    .filter((i) => (!filters.status ? i.status !== 'descartada' : i.status === filters.status))
    .filter((i) => ['goal', 'niche', 'platform', 'format', 'approach'].every((k) => !filters[k] || i[k] === filters[k]))
    .filter((i) => matches(i, filters.q, ['title', 'concept', 'hook', 'development', 'notes', 'cta']))
    .sort((a, b) => (b.status === 'favorita') - (a.status === 'favorita') || String(b.createdAt).localeCompare(a.createdAt));

  const bar = filterBar(filters, {
    onChange: rerender,
    selects: [
      { key: 'status', label: 'Ativas', options: IDEA_STATUS },
      { key: 'goal', label: 'Objetivo', options: GOALS },
      { key: 'niche', label: 'Nicho', options: NICHES },
      { key: 'platform', label: 'Plataforma', options: PLATFORMS },
      { key: 'format', label: 'Formato', options: FORMATS },
      { key: 'approach', label: 'Abordagem', options: APPROACHES },
    ],
  });

  return h('section', { class: 'panel', 'aria-labelledby': 'saved-title' },
    h('div', { class: 'section-head' }, h('h2', { id: 'saved-title' }, 'Banco de ideias'), h('span', { class: 'count' }, `${list.length} de ${all.length}`)),
    bar,
    !all.length
      ? emptyState('Nenhuma ideia guardada ainda.', 'Gere ideias pelo briefing acima ou crie uma manualmente.', h('button', { class: 'btn', onclick: () => editIdea() }, '+ Ideia manual'))
      : !list.length
        ? emptyState('Nenhuma ideia com esses filtros.')
        : h('ul', { class: 'entries' }, list.map(ideaRow)),
  );
}

function ideaRow(i) {
  const open = expanded.has(i.id);
  const toggle = () => {
    open ? expanded.delete(i.id) : expanded.add(i.id);
    rerender();
  };
  const refs = (i.referenceIds || []).map((id) => data.get('references', id)).filter(Boolean);
  const scripts = data.all('scripts').filter((s) => s.ideaId === i.id);
  return h('li', { class: `entry${i.status === 'favorita' ? ' fav' : ''}` },
    h('button', { class: 'entry-toggle', 'aria-expanded': String(open), onclick: toggle },
      h('span', { class: 'entry-title' }, i.status === 'favorita' ? '★ ' : '', i.title || 'Sem título'),
      h('span', { class: 'entry-sub' }, i.hook || i.concept || ''),
    ),
    h('p', { class: 'meta' }, pill(labelOf(PLATFORMS, i.platform)), pill(labelOf(FORMATS, i.format)), pill(labelOf(APPROACHES, i.approach)), pill(labelOf(GOALS, i.goal), 'goal'), pill(labelOf(IDEA_STATUS, i.status), 'status'), i.source === 'ia' && pill('IA', 'soft')),
    open && ideaBody(i, true),
    open && refs.length > 0 && h('p', { class: 'small' }, 'Referências: ', refs.map((r) => r.title || r.url).join(' · ')),
    open && scripts.length > 0 && h('p', { class: 'small' }, 'Roteiros: ', scripts.map((s) => h('a', { href: `#/roteiros?open=${s.id}` }, s.title || 'roteiro')).flatMap((a, k) => (k ? [' · ', a] : [a]))),
    h('div', { class: 'row-actions' },
      h('button', { class: 'btn btn-small', onclick: () => editIdea(i) }, 'Editar'),
      h('button', { class: 'btn btn-small', onclick: () => go('roteiros', { idea: i.id }) }, 'Roteirizar'),
      h('button', { class: 'btn btn-small', onclick: () => toPlanner(i) }, 'Levar para agenda'),
      h('button', { class: 'btn btn-small btn-ghost', onclick: () => attempt(() => data.update('ideas', i.id, { status: i.status === 'favorita' ? 'nova' : 'favorita' })) }, i.status === 'favorita' ? 'Desfavoritar' : 'Favoritar'),
      h('button', { class: 'btn btn-small btn-ghost', onclick: async () => { if (await confirmDialog(`Excluir a ideia "${i.title}"?`)) attempt(() => data.remove('ideas', i.id), 'Ideia excluída.'); } }, 'Excluir'),
    ),
  );
}

async function toPlanner(i) {
  const post = await attempt(() =>
    data.create('posts', {
      title: i.title, platform: i.platform, goal: i.goal, niche: i.niche, format: i.format, approach: i.approach,
      hook: i.hook, ideaId: i.id, status: 'ideia', plannedDate: '', script: [i.concept, i.development].filter(Boolean).join('\n\n'),
    }),
  );
  if (post) {
    toast('Adicionada à agenda sem data. Defina a data lá.');
    go('agenda', { edit: post.id });
  }
}
