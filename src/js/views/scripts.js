// B. Roteirista: transforma ideias em roteiros prontos (vídeo, carrossel, stories, foto).
import * as data from '../data.js';
import { h, put, clear, form, openEditor, filterBar, matches, pill, attempt, toast, copyText, emptyState, confirmDialog, go, fmtDate } from '../ui.js';
import { PLATFORMS, SCRIPT_TYPES, DURATIONS, TONES, DETAIL_LEVELS, FORMATS, labelOf } from '../constants.js';
import { checkHook } from '../lib/hookcheck.js';
import { aiSteps } from './ai-bridge.js';

const filters = { q: '', type: '', platform: '' };
let gen = loadGen();
let openId = null;
let showGenerator = false;

function loadGen() {
  try {
    return JSON.parse(sessionStorage.getItem('scriptGen') || '{}');
  } catch {
    return {};
  }
}
function saveGen() {
  try {
    sessionStorage.setItem('scriptGen', JSON.stringify(gen));
  } catch {
    /* ignora */
  }
}

const ideaOptions = () => data.all('ideas').filter((i) => i.status !== 'descartada').map((i) => ({ value: i.id, label: i.title || 'Ideia sem título' }));
const brandOptions = () => data.all('brands').map((b) => ({ value: b.id, label: b.name || 'Marca sem nome' }));
const refOptions = () => data.all('references').map((r) => ({ value: r.id, label: r.title || r.url || 'Referência' }));
const lines = (v) => (Array.isArray(v) ? v : String(v || '').split('\n')).map((x) => String(x).trim()).filter(Boolean);
const formatToType = (f) => ({ carrossel: 'carrossel', 'modo-foto-tiktok': 'carrossel', stories: 'stories', foto: 'foto' })[f] || 'video';

const rerender = () => {
  const main = document.getElementById('main');
  clear(main);
  render(main, {});
};

export function render(root, params) {
  if (params.idea) {
    const idea = data.get('ideas', params.idea);
    if (idea) {
      gen = { ...gen, ideaId: idea.id, type: formatToType(idea.format), platform: idea.platform || gen.platform, brandId: idea.brandId || gen.brandId, referenceIds: idea.referenceIds || [] };
      saveGen();
      showGenerator = true;
      openId = null;
    }
    history.replaceState(null, '', '#/roteiros');
  }
  if (params.brand) {
    gen = { ...gen, brandId: params.brand, ugc: ugcFromBrand(data.get('brands', params.brand), gen.ugc), topic: params.topic || gen.topic };
    saveGen();
    showGenerator = true;
    openId = null;
    history.replaceState(null, '', '#/roteiros');
  }
  if (params.open) {
    openId = params.open;
    history.replaceState(null, '', '#/roteiros');
  }

  const opened = openId && data.get('scripts', openId);
  if (opened) return put(root, detailView(opened));
  openId = null;

  put(root, 
    h('header', { class: 'page-head' },
      h('div', {}, h('h1', {}, 'Roteirista'), h('p', { class: 'lede' }, 'Ideias viram roteiros prontos para gravar: falas, cenas, textos na tela, slides ou telas de Stories.')),
      !showGenerator && h('button', { class: 'btn btn-primary', onclick: () => { showGenerator = true; rerender(); } }, '+ Novo roteiro'),
    ),
    showGenerator && generatorSection(),
    listSection(),
  );
}

function ugcFromBrand(brand, current = {}) {
  if (!brand) return current;
  const pick = (cat) => (brand.insights || []).filter((i) => i.category === cat && i.status === 'confirmado').map((i) => i.text).join('\n');
  const keep = (k, v) => current?.[k] || v || '';
  return {
    product: keep('product', brand.product),
    audience: keep('audience', brand.audience || pick('publico')),
    pains: keep('pains', pick('dor')),
    objections: keep('objections', pick('objecao')),
    features: keep('features', pick('diferencial')),
    goal: keep('goal', brand.commercialGoal),
  };
}

function generatorSection() {
  const fields = [
    { name: 'ideaId', label: 'Ideia base', type: 'select', options: ideaOptions, placeholder: 'Sem ideia (usar tema abaixo)', full: true },
    { name: 'topic', label: 'Tema ou pedido', type: 'textarea', rows: 2, placeholder: 'Use se não tiver uma ideia salva, ou para complementar.' },
    { name: 'type', label: 'Tipo', type: 'select', options: SCRIPT_TYPES, placeholder: 'Vídeo' },
    { name: 'platform', label: 'Plataforma', type: 'select', options: PLATFORMS },
    { name: 'duration', label: 'Duração alvo', type: 'select', options: DURATIONS, placeholder: 'Livre' },
    { name: 'tone', label: 'Tom', type: 'select', options: TONES, placeholder: 'Natural' },
    { name: 'detail', label: 'Detalhamento', type: 'select', options: DETAIL_LEVELS, placeholder: 'Padrão' },
    { name: 'brandId', label: 'Marca (preenche o briefing UGC)', type: 'select', options: brandOptions, placeholder: 'Nenhuma' },
    { name: 'extra', label: 'Observações', type: 'textarea', rows: 2 },
    { name: 'referenceIds', label: 'Referências a considerar', type: 'relation', options: refOptions, emptyText: 'Nenhuma referência cadastrada.' },
    { type: 'section', label: 'Briefing UGC (opcional)', help: 'Só características confirmadas viram afirmação no roteiro. O resto vai para a lista do que verificar.' },
    { name: 'ugc_product', label: 'Produto' },
    { name: 'ugc_audience', label: 'Público' },
    { name: 'ugc_pains', label: 'Dores', type: 'textarea', rows: 2 },
    { name: 'ugc_objections', label: 'Objeções', type: 'textarea', rows: 2 },
    { name: 'ugc_features', label: 'Características confirmadas', type: 'textarea', rows: 2 },
    { name: 'ugc_goal', label: 'Objetivo comercial', type: 'textarea', rows: 2 },
  ];
  const values = { ...gen, ...Object.fromEntries(Object.entries(gen.ugc || {}).map(([k, v]) => [`ugc_${k}`, v])) };
  const f = form(fields, values);
  const sync = () => {
    const v = f.read();
    const ugc = {};
    for (const k of Object.keys(v)) if (k.startsWith('ugc_')) { ugc[k.slice(4)] = v[k]; delete v[k]; }
    const brandChanged = v.brandId && v.brandId !== gen.brandId;
    gen = { ...v, ugc };
    if (brandChanged) {
      gen.ugc = ugcFromBrand(data.get('brands', v.brandId), ugc);
      saveGen();
      rerender();
      return;
    }
    saveGen();
  };
  f.el.addEventListener('input', sync);
  f.el.addEventListener('change', sync);

  return h('section', { class: 'panel', 'aria-labelledby': 'gen-title' },
    h('div', { class: 'section-head' }, h('h2', { id: 'gen-title' }, 'Novo roteiro'), h('button', { class: 'btn btn-ghost btn-small', onclick: () => { showGenerator = false; rerender(); } }, 'Fechar')),
    f.el,
    aiSteps({
      kind: 'script',
      label: 'Escrever com IA:',
      getBody: () => ({ request: { ...gen, type: gen.type || 'video' } }),
      validate: () => (!gen.ideaId && !gen.topic?.trim() && !gen.ugc?.product ? 'Escolha uma ideia base ou descreva o tema.' : null),
      onResult: useResult,
    }),
    h('div', { class: 'row-actions' },
      h('button', { class: 'btn', onclick: createBlank }, 'Escrever do zero'),
      h('button', { class: 'btn btn-ghost', onclick: () => { gen = {}; saveGen(); rerender(); } }, 'Limpar'),
    ),
  );
}

function baseRecord() {
  const idea = gen.ideaId ? data.get('ideas', gen.ideaId) : null;
  return {
    title: idea?.title || gen.topic?.slice(0, 80) || 'Novo roteiro',
    type: gen.type || 'video',
    platform: gen.platform || idea?.platform || '',
    duration: gen.duration || '',
    tone: gen.tone || '',
    detail: gen.detail || '',
    topic: gen.topic || '',
    ideaId: gen.ideaId || null,
    brandId: gen.brandId || null,
    referenceIds: gen.referenceIds || [],
    ugc: gen.ugc || {},
    hook: idea?.hook || '',
    cta: idea?.cta || '',
  };
}

async function markIdea() {
  if (gen.ideaId && data.get('ideas', gen.ideaId)?.status === 'nova') {
    await attempt(() => data.update('ideas', gen.ideaId, { status: 'roteirizada' }));
  }
}

async function useResult(d) {
  const rec = await attempt(() =>
    data.create('scripts', {
      ...baseRecord(),
      title: d.title || baseRecord().title,
      summary: d.summary,
      hook: d.hook,
      openingVariations: d.openingVariations,
      scenes: d.scenes,
      slides: d.slides,
      screens: d.screens,
      caption: d.caption,
      cta: d.cta,
      editingNotes: d.editingNotes,
      warnings: d.warnings,
      claimsToVerify: d.claimsToVerify,
      source: 'ia',
    }),
  );
  if (rec) {
    await markIdea();
    showGenerator = false;
    openId = rec.id;
    toast('Roteiro criado. Revise antes de gravar.');
  }
  rerender();
}

async function createBlank() {
  const rec = await attempt(() => data.create('scripts', { ...baseRecord(), source: 'manual' }));
  if (!rec) return;
  await markIdea();
  showGenerator = false;
  openId = rec.id;
  rerender();
  editScript(rec);
}

// ---------- Lista ----------
function listSection() {
  const all = data.all('scripts');
  const list = all
    .filter((s) => (!filters.type || s.type === filters.type) && (!filters.platform || s.platform === filters.platform))
    .filter((s) => matches(s, filters.q, ['title', 'hook', 'summary', 'caption', 'topic']))
    .sort((a, b) => String(b.updatedAt).localeCompare(a.updatedAt));
  return h('section', { class: 'panel', 'aria-labelledby': 'list-title' },
    h('div', { class: 'section-head' }, h('h2', { id: 'list-title' }, 'Roteiros'), h('span', { class: 'count' }, `${list.length} de ${all.length}`)),
    filterBar(filters, { onChange: rerender, selects: [{ key: 'type', label: 'Tipo', options: SCRIPT_TYPES }, { key: 'platform', label: 'Plataforma', options: PLATFORMS }] }),
    !all.length
      ? emptyState('Nenhum roteiro ainda.', 'Comece por uma ideia do laboratório ou crie um roteiro do zero.')
      : !list.length
        ? emptyState('Nenhum roteiro com esses filtros.')
        : h('ul', { class: 'entries' }, list.map((s) =>
          h('li', { class: 'entry' },
            h('button', { class: 'entry-toggle', onclick: () => { openId = s.id; rerender(); window.scrollTo(0, 0); } },
              h('span', { class: 'entry-title' }, s.title || 'Sem título'),
              h('span', { class: 'entry-sub' }, s.hook || s.summary || ''),
            ),
            h('p', { class: 'meta' }, pill(labelOf(SCRIPT_TYPES, s.type)), pill(labelOf(PLATFORMS, s.platform)), pill(s.duration), s.ugc?.product && pill(`UGC: ${s.ugc.product}`, 'soft'), h('span', { class: 'muted small' }, `atualizado ${fmtDate(s.updatedAt)}`)),
          ))),
  );
}

// ---------- Detalhe ----------
function detailView(s) {
  const idea = s.ideaId && data.get('ideas', s.ideaId);
  const brand = s.brandId && data.get('brands', s.brandId);
  const refs = (s.referenceIds || []).map((id) => data.get('references', id)).filter(Boolean);
  const hookIssues = checkHook(s.hook);
  const warnings = lines(s.warnings);
  const verify = lines(s.claimsToVerify);
  return h('article', { class: 'script-view' },
    h('header', { class: 'page-head' },
      h('div', {},
        h('button', { class: 'link-btn', onclick: () => { openId = null; rerender(); } }, '← Todos os roteiros'),
        h('h1', {}, s.title || 'Roteiro'),
        h('p', { class: 'meta' }, pill(labelOf(SCRIPT_TYPES, s.type)), pill(labelOf(PLATFORMS, s.platform)), pill(s.duration), pill(s.tone), s.source === 'ia' && pill('Gerado com IA — revise', 'soft')),
      ),
      h('div', { class: 'row-actions' },
        h('button', { class: 'btn btn-primary', onclick: () => editScript(s) }, 'Editar'),
        h('button', { class: 'btn', onclick: () => copyText(scriptToText(s)) }, 'Copiar texto'),
        h('button', { class: 'btn', onclick: () => toPlanner(s) }, 'Levar para agenda'),
        h('button', { class: 'btn btn-ghost', onclick: async () => { if (await confirmDialog('Excluir este roteiro?')) { if (await attempt(() => data.remove('scripts', s.id), 'Roteiro excluído.')) { openId = null; rerender(); } } } }, 'Excluir'),
      ),
    ),
    s.summary && h('p', { class: 'lede' }, s.summary),
    (warnings.length > 0 || verify.length > 0 || hookIssues.length > 0) && h('div', { class: 'callouts' },
      warnings.length > 0 && h('div', { class: 'critique' }, h('strong', {}, 'Pontos para repensar'), h('ul', {}, warnings.map((w) => h('li', {}, w)))),
      verify.length > 0 && h('div', { class: 'verify' }, h('strong', {}, 'Confirmar antes de publicar'), h('ul', {}, verify.map((w) => h('li', {}, w)))),
      hookIssues.length > 0 && h('div', { class: 'hook-warnings-box' }, h('strong', {}, 'Revisor de gancho'), h('ul', {}, hookIssues.map((w) => h('li', {}, w)))),
    ),
    h('section', { class: 'panel' },
      h('h2', {}, 'Gancho'),
      h('p', { class: 'hook-line' }, s.hook || h('span', { class: 'muted' }, 'Sem gancho ainda.')),
      lines(s.openingVariations).length > 0 && [h('h3', {}, 'Variações de abertura'), h('ol', { class: 'variations' }, lines(s.openingVariations).map((v) => h('li', {}, v)))],
    ),
    bodyByType(s),
    (s.caption || s.cta || s.editingNotes) && h('section', { class: 'panel' },
      s.cta && [h('h2', {}, 'CTA'), h('p', {}, s.cta)],
      s.caption && [h('h2', {}, 'Legenda'), h('p', { class: 'prewrap' }, s.caption)],
      s.editingNotes && [h('h2', {}, 'Notas de edição'), h('p', { class: 'prewrap' }, s.editingNotes)],
    ),
    h('section', { class: 'panel small-print' },
      h('h2', {}, 'Contexto'),
      h('dl', { class: 'details' },
        idea && [h('dt', {}, 'Ideia'), h('dd', {}, h('a', { href: `#/ideias?edit=${idea.id}` }, idea.title))],
        brand && [h('dt', {}, 'Marca'), h('dd', {}, h('a', { href: `#/marcas?open=${brand.id}` }, brand.name))],
        refs.length > 0 && [h('dt', {}, 'Referências'), h('dd', {}, refs.map((r) => r.title || r.url).join(' · '))],
        s.ugc?.product && [h('dt', {}, 'Produto'), h('dd', {}, s.ugc.product)],
        s.ugc?.features && [h('dt', {}, 'Características confirmadas'), h('dd', { class: 'prewrap' }, s.ugc.features)],
        s.ugc?.pains && [h('dt', {}, 'Dores'), h('dd', { class: 'prewrap' }, s.ugc.pains)],
        s.ugc?.objections && [h('dt', {}, 'Objeções'), h('dd', { class: 'prewrap' }, s.ugc.objections)],
        s.ugc?.goal && [h('dt', {}, 'Objetivo comercial'), h('dd', {}, s.ugc.goal)],
      ),
    ),
  );
}

function bodyByType(s) {
  if (s.type === 'carrossel') {
    const slides = s.slides || [];
    return h('section', { class: 'panel' }, h('h2', {}, `Slides (${slides.length})`),
      slides.length ? h('ol', { class: 'slides' }, slides.map((sl, i) => h('li', { class: 'slide' },
        h('span', { class: 'slide-n' }, i + 1), h('div', {}, h('strong', {}, sl.headline), sl.body && h('p', { class: 'prewrap' }, sl.body), sl.visual && h('p', { class: 'muted small' }, `Visual: ${sl.visual}`))))) : emptyState('Sem slides. Use "Editar" para adicionar.'));
  }
  if (s.type === 'stories') {
    const screens = s.screens || [];
    return h('section', { class: 'panel' }, h('h2', {}, `Sequência de Stories (${screens.length} telas)`),
      screens.length ? h('ol', { class: 'slides' }, screens.map((sc, i) => h('li', { class: 'slide' },
        h('span', { class: 'slide-n' }, i + 1), h('div', {}, h('p', { class: 'prewrap' }, sc.content), sc.visual && h('p', { class: 'muted small' }, `Visual: ${sc.visual}`), sc.interactive && pill(`Interativo: ${sc.interactive}`, 'goal'))))) : emptyState('Sem telas. Use "Editar" para adicionar.'));
  }
  const scenes = s.scenes || [];
  return h('section', { class: 'panel' }, h('h2', {}, s.type === 'foto' ? 'Foto' : `Cenas (${scenes.length})`),
    scenes.length ? h('ol', { class: 'scenes' }, scenes.map((sc, i) => h('li', { class: 'scene' },
      h('div', { class: 'scene-head' }, h('span', { class: 'slide-n' }, i + 1), sc.timing && h('span', { class: 'timing' }, sc.timing), sc.setting && h('span', { class: 'muted' }, sc.setting)),
      h('dl', { class: 'scene-grid' },
        sc.action && [h('dt', {}, 'Ação'), h('dd', {}, sc.action)],
        sc.speech && [h('dt', {}, 'Fala'), h('dd', { class: 'speech' }, sc.speech)],
        sc.onScreenText && [h('dt', {}, 'Texto na tela'), h('dd', {}, sc.onScreenText)],
        sc.editing && [h('dt', {}, 'Edição'), h('dd', {}, sc.editing)],
      )))) : emptyState('Sem cenas. Use "Editar" para adicionar.'));
}

export function editScript(s) {
  const typeFields = {
    video: { name: 'scenes', label: 'Cenas', type: 'repeat', itemLabel: 'Cena', addLabel: 'Adicionar cena', fields: sceneFields() },
    foto: { name: 'scenes', label: 'Descrição da foto', type: 'repeat', itemLabel: 'Item', addLabel: 'Adicionar', fields: sceneFields() },
    carrossel: { name: 'slides', label: 'Slides', type: 'repeat', itemLabel: 'Slide', addLabel: 'Adicionar slide', fields: [
      { name: 'headline', label: 'Título do slide', full: true }, { name: 'body', label: 'Texto', type: 'textarea', rows: 2 }, { name: 'visual', label: 'Visual', full: true },
    ] },
    stories: { name: 'screens', label: 'Telas', type: 'repeat', itemLabel: 'Tela', addLabel: 'Adicionar tela', fields: [
      { name: 'content', label: 'Conteúdo', type: 'textarea', rows: 2 }, { name: 'visual', label: 'Visual' }, { name: 'interactive', label: 'Recurso interativo', placeholder: 'Enquete, caixa de perguntas, quiz…' },
    ] },
  };
  const fields = [
    { name: 'title', label: 'Título', required: true, full: true },
    { name: 'summary', label: 'Resumo', type: 'textarea', rows: 2 },
    { name: 'hook', label: 'Gancho', type: 'textarea', rows: 2, check: checkHook },
    { name: 'openingVariations', label: 'Variações de abertura', type: 'textarea', rows: 3, help: 'Uma por linha.' },
    typeFields[s.type] || typeFields.video,
    { name: 'cta', label: 'CTA', type: 'textarea', rows: 2 },
    { name: 'caption', label: 'Legenda', type: 'textarea', rows: 4 },
    { name: 'editingNotes', label: 'Notas de edição', type: 'textarea', rows: 2 },
    { name: 'warnings', label: 'Pontos para repensar', type: 'textarea', rows: 2, help: 'Um por linha.' },
    { name: 'claimsToVerify', label: 'Afirmações a confirmar', type: 'textarea', rows: 2, help: 'Uma por linha.' },
    { type: 'section', label: 'Parâmetros' },
    { name: 'type', label: 'Tipo', type: 'select', options: SCRIPT_TYPES, help: 'Mudar o tipo troca a estrutura exibida (o conteúdo anterior fica guardado).' },
    { name: 'platform', label: 'Plataforma', type: 'select', options: PLATFORMS },
    { name: 'duration', label: 'Duração', type: 'select', options: DURATIONS },
    { name: 'tone', label: 'Tom', type: 'select', options: TONES },
    { name: 'ideaId', label: 'Ideia', type: 'select', options: ideaOptions },
    { name: 'brandId', label: 'Marca', type: 'select', options: brandOptions },
    { name: 'referenceIds', label: 'Referências', type: 'relation', options: refOptions },
  ];
  openEditor({
    title: 'Editar roteiro',
    fields,
    values: { ...s, openingVariations: lines(s.openingVariations).join('\n'), warnings: lines(s.warnings).join('\n'), claimsToVerify: lines(s.claimsToVerify).join('\n') },
    onSave: (v) => data.update('scripts', s.id, { ...v, openingVariations: lines(v.openingVariations), warnings: lines(v.warnings), claimsToVerify: lines(v.claimsToVerify) }),
    onDelete: () => data.remove('scripts', s.id).then(() => { openId = null; }),
  });
}

function sceneFields() {
  return [
    { name: 'timing', label: 'Tempo', placeholder: '0–3s' },
    { name: 'setting', label: 'Cenário / enquadramento' },
    { name: 'action', label: 'Ação', type: 'textarea', rows: 2 },
    { name: 'speech', label: 'Fala', type: 'textarea', rows: 2 },
    { name: 'onScreenText', label: 'Texto na tela' },
    { name: 'editing', label: 'Edição' },
  ];
}

export function scriptToText(s) {
  const out = [`# ${s.title || 'Roteiro'}`, `${labelOf(SCRIPT_TYPES, s.type)} · ${labelOf(PLATFORMS, s.platform) || ''} ${s.duration || ''}`.trim(), ''];
  if (s.hook) out.push(`GANCHO: ${s.hook}`, '');
  const ov = lines(s.openingVariations);
  if (ov.length) out.push('VARIAÇÕES DE ABERTURA:', ...ov.map((v, i) => `${i + 1}. ${v}`), '');
  if (s.type === 'carrossel') (s.slides || []).forEach((sl, i) => out.push(`SLIDE ${i + 1}: ${sl.headline || ''}`, sl.body || '', sl.visual ? `(visual: ${sl.visual})` : '', ''));
  else if (s.type === 'stories') (s.screens || []).forEach((sc, i) => out.push(`TELA ${i + 1}: ${sc.content || ''}`, sc.visual ? `(visual: ${sc.visual})` : '', sc.interactive ? `[interativo: ${sc.interactive}]` : '', ''));
  else (s.scenes || []).forEach((sc, i) => out.push(`CENA ${i + 1}${sc.timing ? ` (${sc.timing})` : ''}${sc.setting ? ` — ${sc.setting}` : ''}`, sc.action ? `Ação: ${sc.action}` : '', sc.speech ? `Fala: "${sc.speech}"` : '', sc.onScreenText ? `Texto na tela: ${sc.onScreenText}` : '', sc.editing ? `Edição: ${sc.editing}` : '', ''));
  if (s.cta) out.push(`CTA: ${s.cta}`, '');
  if (s.caption) out.push('LEGENDA:', s.caption, '');
  const v = lines(s.claimsToVerify);
  if (v.length) out.push('CONFIRMAR ANTES:', ...v.map((x) => `- ${x}`));
  return out.filter((l, i, arr) => !(l === '' && arr[i - 1] === '')).join('\n');
}

async function toPlanner(s) {
  const typeToFormat = { carrossel: 'carrossel', stories: 'stories', foto: 'foto', video: s.platform === 'tiktok' ? 'video-tiktok' : 'reels' };
  const idea = s.ideaId && data.get('ideas', s.ideaId);
  const post = await attempt(() => data.create('posts', {
    title: s.title, platform: s.platform, format: typeToFormat[s.type] || '', hook: s.hook, scriptId: s.id, ideaId: s.ideaId || null,
    goal: idea?.goal || '', niche: idea?.niche || '', approach: idea?.approach || '', status: 'gravar', plannedDate: '',
  }));
  if (post) {
    toast('Adicionado à agenda. Defina a data.');
    go('agenda', { edit: post.id });
  }
}

