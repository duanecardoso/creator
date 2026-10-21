// F. Pesquisa de marcas: fatos x hipóteses, matriz de oportunidades e conceitos UGC.
import * as data from '../data.js';
import { h, put, clear, openEditor, filterBar, matches, pill, attempt, emptyState, confirmDialog, go, fmtDate } from '../ui.js';
import { aiSteps } from './ai-bridge.js';
import { NICHES, BRAND_STATUS, INSIGHT_CATEGORIES, INSIGHT_STATUS, labelOf } from '../constants.js';

const filters = { q: '', status: '', niche: '' };
let openId = null;

const rerender = () => {
  const main = document.getElementById('main');
  clear(main);
  render(main, {});
};

function fields() {
  return [
    { name: 'name', label: 'Marca', required: true },
    { name: 'website', label: 'Site / perfil', type: 'url', placeholder: 'https://' },
    { name: 'niche', label: 'Nicho', type: 'select', options: NICHES },
    { name: 'status', label: 'Status', type: 'select', options: BRAND_STATUS },
    { name: 'product', label: 'Produto pesquisado', full: true },
    { name: 'audience', label: 'Público (resumo)', type: 'textarea', rows: 2 },
    { name: 'commercialGoal', label: 'Objetivo comercial do conteúdo', type: 'textarea', rows: 2, placeholder: 'Ex.: gerar confiança para quem nunca usou a categoria' },
    {
      name: 'insights',
      label: 'Pesquisa: dores, objeções, diferenciais, concorrentes, campanhas, anúncios',
      type: 'repeat',
      itemLabel: 'Item',
      addLabel: 'Adicionar item de pesquisa',
      fields: [
        { name: 'category', label: 'Tipo', type: 'select', options: INSIGHT_CATEGORIES },
        { name: 'status', label: 'Confiabilidade', type: 'select', options: INSIGHT_STATUS, placeholder: 'Hipótese a verificar' },
        { name: 'text', label: 'Descrição', type: 'textarea', rows: 2 },
        { name: 'source', label: 'Fonte (link, embalagem, site oficial, comentário…)', full: true },
        { name: 'observedAt', label: 'Observado em', type: 'date' },
      ],
    },
    { name: 'notes', label: 'Anotações', type: 'textarea', rows: 3 },
  ];
}

export function editBrand(b = {}) {
  openEditor({
    title: b.id ? `Editar ${b.name || 'marca'}` : 'Nova pesquisa de marca',
    intro: h('p', { class: 'help' }, 'Marque como "Fato confirmado" só o que tem fonte verificável (site oficial, embalagem, ficha técnica, briefing da marca). O resto fica como hipótese.'),
    fields: fields(),
    values: { status: 'pesquisando', ...b, insights: (b.insights || []).map((i) => ({ ...i, status: i.status || 'hipotese' })) },
    onSave: async (v) => {
      v.insights = v.insights.map((i) => ({ ...i, status: i.status || 'hipotese', category: i.category || 'dor' }));
      const saved = b.id ? await data.update('brands', b.id, v) : await data.create('brands', v);
      openId = saved.id;
      rerender();
      return saved;
    },
    onDelete: b.id ? () => data.remove('brands', b.id).then(() => { openId = null; }) : null,
  });
}

export function render(root, params) {
  if (params.open) {
    openId = params.open;
    history.replaceState(null, '', '#/marcas');
  }
  const brand = openId && data.get('brands', openId);
  if (brand) return put(root, detail(brand));
  openId = null;

  const all = data.all('brands');
  const list = all
    .filter((b) => (!filters.status || b.status === filters.status) && (!filters.niche || b.niche === filters.niche))
    .filter((b) => matches({ ...b, ins: (b.insights || []).map((i) => i.text).join(' ') }, filters.q, ['name', 'product', 'audience', 'notes', 'ins']))
    .sort((a, b) => String(b.updatedAt).localeCompare(a.updatedAt));

  put(root, 
    h('header', { class: 'page-head' },
      h('div', {}, h('h1', {}, 'Pesquisa de marcas'), h('p', { class: 'lede' }, 'Registre o que você descobriu sobre marcas e produtos, separando o que é fato do que ainda é hipótese.')),
      h('button', { class: 'btn btn-primary', onclick: () => editBrand() }, '+ Marca'),
    ),
    filterBar(filters, { onChange: rerender, selects: [{ key: 'status', label: 'Status', options: BRAND_STATUS }, { key: 'niche', label: 'Nicho', options: NICHES }] }),
    h('section', { class: 'panel' },
      h('div', { class: 'section-head' }, h('h2', {}, 'Marcas'), h('span', { class: 'count' }, `${list.length} de ${all.length}`)),
      !all.length
        ? emptyState('Nenhuma marca pesquisada.', 'Comece por uma marca que você gostaria de atender e registre produto, público, dores e diferenciais confirmados.', h('button', { class: 'btn', onclick: () => editBrand() }, '+ Marca'))
        : !list.length ? emptyState('Nada encontrado.')
          : h('ul', { class: 'entries' }, list.map((b) => {
            const ins = b.insights || [];
            const facts = ins.filter((i) => i.status === 'confirmado').length;
            return h('li', { class: 'entry' },
              h('button', { class: 'entry-toggle', onclick: () => { openId = b.id; rerender(); window.scrollTo(0, 0); } },
                h('span', { class: 'entry-title' }, b.name || 'Sem nome'), h('span', { class: 'entry-sub' }, b.product || '')),
              h('p', { class: 'meta' }, pill(labelOf(BRAND_STATUS, b.status), 'status'), pill(labelOf(NICHES, b.niche)), pill(`${facts} fato(s)`, 'ok'), pill(`${ins.length - facts} hipótese(s)`, 'warn')),
            );
          })),
    ),
  );
}

function detail(b) {
  const ins = b.insights || [];
  return h('article', {},
    h('header', { class: 'page-head' },
      h('div', {},
        h('button', { class: 'link-btn', onclick: () => { openId = null; rerender(); } }, '← Todas as marcas'),
        h('h1', {}, b.name || 'Marca'),
        h('p', { class: 'meta' }, pill(labelOf(BRAND_STATUS, b.status), 'status'), pill(labelOf(NICHES, b.niche)), b.website && h('a', { href: b.website, target: '_blank', rel: 'noopener noreferrer' }, b.website)),
      ),
      h('div', { class: 'row-actions' },
        h('button', { class: 'btn btn-primary', onclick: () => editBrand(b) }, 'Editar pesquisa'),
        h('button', { class: 'btn', onclick: () => go('ideias', { brand: b.id }) }, 'Usar no laboratório'),
        h('button', { class: 'btn btn-ghost', onclick: async () => { if (await confirmDialog(`Excluir a pesquisa de "${b.name}"?`)) { if (await attempt(() => data.remove('brands', b.id), 'Excluída.')) { openId = null; rerender(); } } } }, 'Excluir'),
      ),
    ),
    h('section', { class: 'panel' },
      h('dl', { class: 'details' },
        [['Produto', b.product], ['Público', b.audience], ['Objetivo comercial', b.commercialGoal], ['Anotações', b.notes]].filter(([, v]) => v).map(([k, v]) => [h('dt', {}, k), h('dd', { class: 'prewrap' }, v)]),
      ),
      !b.product && !ins.length && emptyState('Pesquisa vazia.', 'Clique em "Editar pesquisa" para adicionar produto, dores, objeções e diferenciais.'),
    ),
    ins.length > 0 && h('div', { class: 'two-col' },
      insightColumn('Fatos confirmados', ins.filter((i) => i.status === 'confirmado'), 'ok'),
      insightColumn('Hipóteses a verificar', ins.filter((i) => i.status !== 'confirmado'), 'warn'),
    ),
    matrixSection(b),
    aiSection(b),
  );
}

function insightColumn(title, items, kind) {
  const byCat = INSIGHT_CATEGORIES.map((c) => [c, items.filter((i) => i.category === c.value)]).filter(([, l]) => l.length);
  return h('section', { class: `panel insight-col ${kind}` },
    h('h2', {}, title, ' ', h('span', { class: 'count' }, items.length)),
    !items.length ? h('p', { class: 'muted small' }, kind === 'ok' ? 'Nenhum fato confirmado ainda. Sem isso, qualquer conceito UGC depende de suposições.' : 'Nenhuma hipótese pendente.') :
      byCat.map(([c, list]) => [h('h3', {}, c.label), h('ul', {}, list.map((i) => h('li', {}, i.text, i.source && h('span', { class: 'source' }, ` — ${i.source}`), i.observedAt && h('span', { class: 'muted small' }, ` (${fmtDate(i.observedAt)})`))))]),
  );
}

// Cruza dores/objeções com diferenciais confirmados. Não inventa nada: só combina o que você registrou.
export function opportunityMatrix(b) {
  const ins = b.insights || [];
  const difs = ins.filter((i) => i.category === 'diferencial' && i.status === 'confirmado');
  const needs = ins.filter((i) => i.category === 'dor' || i.category === 'objecao');
  const out = [];
  for (const n of needs) {
    for (const d of difs) {
      const isObj = n.category === 'objecao';
      out.push({
        title: isObj ? `Objeção: "${n.text}"` : `Dor: "${n.text}"`,
        angle: isObj ? 'Objeção respondida na prática' : 'Demonstração em situação real',
        concept: isObj
          ? `Comece pela dúvida como você mesma pensaria ("${n.text}") e mostre, testando, o que muda com: ${d.text}. Termine com sua opinião sincera, incluindo limites.`
          : `Mostre o momento da rotina em que "${n.text}" acontece e como você usa o produto ali, destacando: ${d.text}.`,
        fact: d.text,
        need: n.text,
        needConfirmed: n.status === 'confirmado',
      });
    }
  }
  return { items: out, difs, needs, unconfirmedDifs: ins.filter((i) => i.category === 'diferencial' && i.status !== 'confirmado') };
}

function matrixSection(b) {
  const { items, difs, needs, unconfirmedDifs } = opportunityMatrix(b);
  return h('section', { class: 'panel' },
    h('h2', {}, 'Matriz de oportunidades'),
    h('p', { class: 'help' }, 'Combina cada dor/objeção registrada com cada diferencial confirmado. Funciona sem IA e não acrescenta informação nova.'),
    !items.length
      ? h('p', { class: 'muted' }, !difs.length ? 'Precisa de pelo menos um diferencial marcado como "Fato confirmado".' : 'Registre pelo menos uma dor ou objeção.')
      : h('ul', { class: 'opps' }, items.slice(0, 24).map((o) => h('li', { class: 'opp' },
        h('p', {}, h('strong', {}, o.angle), ' · ', o.title),
        h('p', { class: 'small' }, o.concept),
        h('p', { class: 'meta' }, pill(`Base: ${o.fact}`, 'ok'), !o.needConfirmed && pill('Dor/objeção ainda é hipótese', 'warn')),
        h('div', { class: 'row-actions' },
          h('button', { class: 'btn btn-small', onclick: () => saveAsIdea(b, { title: `${b.name}: ${o.angle.toLowerCase()}`, concept: o.concept, approach: 'demonstrativo', needsVerification: o.needConfirmed ? [] : [`Validar se "${o.need}" é uma dor real do público`] }) }, 'Virar ideia'),
          h('button', { class: 'btn btn-small', onclick: () => go('roteiros', { brand: b.id, topic: o.concept }) }, 'Roteiro UGC'),
        )))),
    unconfirmedDifs.length > 0 && h('p', { class: 'note' }, `Diferenciais ainda não confirmados (não entram na matriz): ${unconfirmedDifs.map((d) => d.text).join('; ')}.`),
    needs.length > 0 && difs.length > 0 && items.length > 24 && h('p', { class: 'muted small' }, `Mostrando 24 de ${items.length} combinações.`),
  );
}

function aiSection(b) {
  const concepts = b.aiConcepts?.concepts || [];
  return h('section', { class: 'panel' },
    h('h2', {}, 'Conceitos de vídeo UGC'),
    h('p', { class: 'help' }, 'O prompt leva a pesquisa com fatos e hipóteses separados e pede que a IA diga em que fato cada conceito se baseia.'),
    aiSteps({
      kind: 'brand',
      label: concepts.length ? 'Gerar de novo:' : 'Gerar com IA:',
      getBody: () => ({ brandId: b.id, quantity: 4 }),
      validate: () => (!(b.insights || []).length && !b.product ? 'Registre ao menos o produto e alguns itens de pesquisa antes.' : null),
      onResult: (r) => attempt(() => data.update('brands', b.id, { aiConcepts: { ...r, generatedAt: new Date().toISOString() } }), 'Conceitos salvos nesta marca.'),
    }),
    b.aiConcepts?.critique && h('div', { class: 'critique' }, h('strong', {}, 'Limites da pesquisa atual'), h('p', {}, b.aiConcepts.critique)),
    b.aiConcepts?.missingInfo?.length > 0 && h('div', { class: 'verify' }, h('strong', {}, 'O que falta pesquisar'), h('ul', {}, b.aiConcepts.missingInfo.map((m) => h('li', {}, m)))),
    concepts.length > 0 && h('ol', { class: 'idea-results' }, concepts.map((c) => h('li', { class: 'idea-result' },
      h('h3', {}, c.title), h('p', { class: 'meta' }, pill(c.angle), pill(c.format), pill(c.audience && `para ${c.audience}`)),
      h('dl', { class: 'details' }, [['Gancho', c.hook], ['Conceito', c.concept], ['CTA', c.cta]].filter(([, v]) => v).map(([k, v]) => [h('dt', {}, k), h('dd', {}, v)])),
      c.basedOnFacts?.length > 0 && h('div', { class: 'facts' }, h('strong', {}, 'Baseado em fatos confirmados'), h('ul', {}, c.basedOnFacts.map((f) => h('li', {}, f)))),
      c.hypothesesToVerify?.length > 0 && h('div', { class: 'verify' }, h('strong', {}, 'Hipóteses a verificar'), h('ul', {}, c.hypothesesToVerify.map((f) => h('li', {}, f)))),
      h('div', { class: 'row-actions' },
        h('button', { class: 'btn btn-small', onclick: () => saveAsIdea(b, { title: c.title, hook: c.hook, concept: c.concept, cta: c.cta, needsVerification: c.hypothesesToVerify || [], rationale: `Ângulo: ${c.angle}. Baseado em: ${(c.basedOnFacts || []).join('; ')}` }) }, 'Virar ideia'),
        h('button', { class: 'btn btn-small', onclick: () => go('roteiros', { brand: b.id, topic: `${c.title}\n${c.concept}\nGancho sugerido: ${c.hook}` }) }, 'Roteiro UGC'),
      )))),
    b.aiConcepts?.generatedAt && h('p', { class: 'muted small' }, `Gerado em ${fmtDate(b.aiConcepts.generatedAt, { day: '2-digit', month: 'short', year: 'numeric' })}. Os conceitos ficam salvos nesta marca.`),
  );
}


async function saveAsIdea(b, idea) {
  const saved = await attempt(() => data.create('ideas', { goal: 'marcas', niche: b.niche || 'ugc', audience: 'marcas', status: 'nova', source: 'marca', brandId: b.id, ...idea }), 'Ideia criada no laboratório.');
  return saved;
}
