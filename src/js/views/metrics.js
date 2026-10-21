// E. Desempenho: registro manual de métricas e análises comparativas cautelosas.
import * as data from '../data.js';
import { h, put, clear, openEditor, pill, emptyState, fmtDate, todayIso, attempt } from '../ui.js';
import { instagramPanel } from './instagram-panel.js';
import { GOALS, NICHES, PLATFORMS, FORMATS, APPROACHES, METRIC_FIELDS, labelOf } from '../constants.js';
import { INDICATORS, GOAL_INDICATORS, compareBy, evaluatePost, findPatterns, testOpportunities, hasMetrics, formatValue, confidence, base } from '../lib/analysis.js';

const view = { platform: '', dimension: 'format', indicator: 'shares', listFilter: 'todas' };

const DIMENSIONS = [
  { key: 'format', label: 'Formato', options: FORMATS },
  { key: 'approach', label: 'Abordagem', options: APPROACHES },
  { key: 'niche', label: 'Nicho', options: NICHES },
  { key: 'goal', label: 'Objetivo', options: GOALS },
  { key: 'platform', label: 'Plataforma', options: PLATFORMS },
  { key: 'pillar', label: 'Pilar', options: [] },
];
const dimLabel = (dimKey, value) => {
  const d = DIMENSIONS.find((x) => x.key === dimKey);
  return d?.options.length ? labelOf(d.options, value) : value;
};

const rerender = () => {
  const main = document.getElementById('main');
  clear(main);
  render(main, {});
};

export function openMetrics(post) {
  if (!post) return;
  const m = post.metrics || {};
  openEditor({
    title: `Métricas · ${post.title || 'publicação'}`,
    intro: h('div', {},
      h('p', { class: 'help' }, 'Preencha só o que a plataforma mostrar. Campo vazio = "não disponível" (é diferente de zero). Anote a data da coleta: números mudam com o tempo.'),
      m.source === 'instagram_api' && h('p', { class: 'note' }, 'Esta publicação veio do Instagram: alcance, visualizações, curtidas, comentários, salvamentos, compartilhamentos, visitas e seguidores são atualizados a cada sincronização. Cliques, mensagens, contatos comerciais e observações são seus e nunca são sobrescritos.')),
    fields: [
      ...METRIC_FIELDS.map((f) => ({ name: f.key, label: f.label, type: 'number' })),
      { name: 'collectedAt', label: 'Coletado em', type: 'date' },
      { name: 'notes', label: 'Observações (ex.: o que os comentários diziam, quem mandou mensagem)', type: 'textarea', rows: 3 },
    ],
    values: { collectedAt: todayIso(), ...m },
    onSave: (v) => data.update('posts', post.id, {
      metrics: { ...m, ...v, source: m.source === 'instagram_api' ? 'instagram_api' : 'manual' },
      ...(post.status !== 'publicado' ? { status: 'publicado', publishedDate: post.publishedDate || post.plannedDate || todayIso() } : {}),
    }),
  });
}

export function render(root) {
  const posts = data.all('posts');
  const published = posts.filter((p) => p.status === 'publicado' || p.publishedDate || hasMetrics(p));
  const measuredAll = posts.filter(hasMetrics);
  const measured = measuredAll.filter((p) => !view.platform || p.platform === view.platform);

  put(root, 
    h('header', { class: 'page-head' },
      h('div', {}, h('h1', {}, 'Desempenho'), h('p', { class: 'lede' }, 'Cada publicação é avaliada pelo objetivo que você definiu para ela. Visualização não é sinônimo de sucesso.')),
    ),
    instagramPanel({ compact: true }),
    noGoal(published),
    h('div', { class: 'stat-row' },
      stat(published.length, 'publicadas'),
      stat(measuredAll.length, 'com métricas'),
      stat(published.filter((p) => !hasMetrics(p)).length, 'aguardando métricas'),
      h('p', { class: 'stat-note' }, confidenceNote(measured.length)),
    ),
    registerSection(published),
    measuredAll.length ? analysisSection(measured) : null,
  );
}

function goalSelect(p) {
  return h('select', {
    class: `goal-select${p.goal ? '' : ' missing'}`,
    'aria-label': `Objetivo de ${p.title}`,
    onchange: (e) => attempt(() => data.update('posts', p.id, { goal: e.target.value }), 'Objetivo definido.'),
  }, h('option', { value: '' }, 'Definir objetivo…'), GOALS.map((g) => h('option', { value: g.value, selected: g.value === p.goal }, g.label)));
}

function noGoal(published) {
  const n = published.filter((p) => !p.goal).length;
  if (!n) return null;
  return h('p', { class: 'note' }, `${n} publicação(ões) sem objetivo definido. Escolha o objetivo de cada uma na lista abaixo: é ele que define se a publicação foi bem (alcance, conexão, comunidade, marcas ou vendas).`);
}

function confidenceNote(n) {
  const c = confidence(n);
  if (n === 0) return 'Ainda não há métricas registradas.';
  return `Base atual: ${n} publicação(ões) medida(s) — nível "${c.label.toLowerCase()}". ${n < 15 ? 'Trate as comparações como pistas, não conclusões.' : ''}`;
}

const stat = (n, label) => h('div', { class: 'stat' }, h('span', { class: 'stat-n' }, String(n)), h('span', { class: 'stat-l' }, label));

function registerSection(published) {
  const list = published
    .filter((p) => view.listFilter === 'todas' || (view.listFilter === 'pendentes' ? !hasMetrics(p) : hasMetrics(p)))
    .sort((a, b) => String(b.publishedDate || b.plannedDate).localeCompare(a.publishedDate || a.plannedDate));
  const all = data.all('posts');
  return h('section', { class: 'panel', 'aria-labelledby': 'reg-title' },
    h('div', { class: 'section-head' },
      h('h2', { id: 'reg-title' }, 'Publicações e resultado por objetivo'),
      h('select', { 'aria-label': 'Mostrar', onchange: (e) => { view.listFilter = e.target.value; rerender(); } },
        [['todas', 'Todas publicadas'], ['pendentes', 'Sem métricas'], ['medidas', 'Com métricas']].map(([v, l]) => h('option', { value: v, selected: v === view.listFilter }, l))),
    ),
    !published.length
      ? emptyState('Nenhuma publicação marcada como publicada.', 'Na Agenda, mude o status para "Publicado" ou registre métricas direto pela publicação.')
      : !list.length ? emptyState('Nada neste filtro.')
        : h('ul', { class: 'metric-list' }, list.map((p) => {
          const ev = hasMetrics(p) ? evaluatePost(p, all.filter(hasMetrics)) : null;
          const goal = GOAL_INDICATORS[p.goal];
          const b = base(p);
          return h('li', { class: 'metric-row' },
            h('div', { class: 'metric-main' },
              h('strong', {}, p.title || 'Sem título'),
              h('p', { class: 'meta' }, h('span', { class: 'muted small' }, fmtDate(p.publishedDate || p.plannedDate)), pill(labelOf(PLATFORMS, p.platform)), pill(labelOf(FORMATS, p.format)),
                goalSelect(p),
                p.metrics?.source === 'instagram_api' && pill('via Instagram', 'ok'),
                p.publishedUrl && h('a', { href: p.publishedUrl, target: '_blank', rel: 'noopener noreferrer', class: 'small' }, 'abrir')),
              hasMetrics(p)
                ? h('p', { class: 'small' },
                  b.value !== null ? `${b.kind === 'alcance' ? 'Alcance' : 'Visualizações'} ${formatValue(b.value, 'num')}` : 'Sem alcance/visualizações',
                  ' · ', `Salv. ${formatValue(INDICATORS.saves.compute(p), 'pct')}`,
                  ' · ', `Compart. ${formatValue(INDICATORS.shares.compute(p), 'pct')}`,
                  ' · ', `Seguidores ${p.metrics.follows ?? '—'}`,
                  ' · ', `Contatos ${formatValue(INDICATORS.commercial.compute(p), 'num')}`)
                : h('p', { class: 'small muted' }, 'Métricas ainda não registradas.'),
              ev && h('p', { class: `verdict verdict-${ev.status}` },
                goal ? h('span', { class: 'muted' }, `${INDICATORS[goal.main].label}: `) : null, ev.text,
                ev.confidence && ev.status === 'ok' && ev.confidence.level < 2 ? ' (comparação ainda frágil)' : ''),
            ),
            h('button', { class: 'btn btn-small', onclick: () => openMetrics(p) }, hasMetrics(p) ? 'Editar métricas' : 'Registrar'),
          );
        })),
  );
}

function analysisSection(measured) {
  const dims = DIMENSIONS.map((d) => (d.key === 'pillar' ? { ...d, options: [] } : d));
  const { rows, overall } = compareBy(measured, view.dimension, view.indicator);
  const ind = INDICATORS[view.indicator];
  const max = Math.max(...rows.map((r) => r.median ?? 0), 0) || 1;
  const patterns = findPatterns(measured, dims, dimLabel);
  const tips = testOpportunities(data.all('posts').filter((p) => !view.platform || p.platform === view.platform), { approaches: APPROACHES, formats: FORMATS, goals: GOALS });

  return h('section', { class: 'panel', 'aria-labelledby': 'cmp-title' },
    h('div', { class: 'section-head' }, h('h2', { id: 'cmp-title' }, 'Comparar')),
    h('div', { class: 'filters' },
      h('label', { class: 'inline' }, 'Plataforma ', h('select', { onchange: (e) => { view.platform = e.target.value; rerender(); } },
        h('option', { value: '' }, 'Todas'), PLATFORMS.map((p) => h('option', { value: p.value, selected: p.value === view.platform }, p.label)))),
      h('label', { class: 'inline' }, 'Agrupar por ', h('select', { onchange: (e) => { view.dimension = e.target.value; rerender(); } },
        DIMENSIONS.map((d) => h('option', { value: d.key, selected: d.key === view.dimension }, d.label)))),
      h('label', { class: 'inline' }, 'Indicador ', h('select', { onchange: (e) => { view.indicator = e.target.value; rerender(); } },
        Object.entries(INDICATORS).map(([k, v]) => h('option', { value: k, selected: k === view.indicator }, v.label)))),
    ),
    !view.platform && h('p', { class: 'help' }, 'Dica: Instagram e TikTok medem de formas diferentes. Filtre por plataforma para comparações mais justas.'),
    ind.hint && h('p', { class: 'help' }, `Cálculo: ${ind.hint}.`),
    !rows.length
      ? emptyState('Sem dados para este indicador.', 'Registre os campos necessários nas publicações (campos vazios não entram na conta).')
      : h('div', { class: 'table-wrap' }, h('table', { class: 'cmp-table' },
        h('caption', { class: 'sr-only' }, `${ind.label} por ${DIMENSIONS.find((d) => d.key === view.dimension).label}`),
        h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, DIMENSIONS.find((d) => d.key === view.dimension).label), h('th', { scope: 'col' }, 'Mediana'), h('th', { scope: 'col' }, 'Publicações'), h('th', { scope: 'col' }, 'Confiança'))),
        h('tbody', {}, rows.map((r) => h('tr', {},
          h('th', { scope: 'row' }, dimLabel(view.dimension, r.group)),
          h('td', {}, h('div', { class: 'bar-cell', title: `${dimLabel(view.dimension, r.group)}: ${formatValue(r.median, ind.fmt)} (n=${r.n})` },
            h('span', { class: 'bar', style: { width: `${Math.max(2, ((r.median ?? 0) / max) * 100)}%` } }),
            h('span', { class: 'bar-val' }, formatValue(r.median, ind.fmt)))),
          h('td', {}, String(r.n)),
          h('td', {}, h('span', { class: `conf conf-${r.confidence.level}` }, r.confidence.label)),
        ))),
        h('tfoot', {}, h('tr', {}, h('th', { scope: 'row' }, 'Geral'), h('td', {}, formatValue(overall.median, ind.fmt)), h('td', {}, String(overall.n)), h('td', {}, confidence(overall.n).label))),
      )),
    h('h3', {}, 'Padrões observados'),
    patterns.length
      ? h('ul', { class: 'insights' }, patterns.map((p) => h('li', {}, h('span', { class: `conf conf-${p.confidence.level}` }, p.confidence.label), ' ', p.text)))
      : h('p', { class: 'muted' }, measured.length < 6
        ? `Ainda não dá para apontar padrões: são necessárias pelo menos 6 publicações medidas (hoje: ${measured.length}) e 3 em cada grupo comparado.`
        : 'Nenhuma diferença grande o bastante entre grupos (com pelo menos 3 publicações cada).'),
    h('h3', {}, 'Oportunidades de teste'),
    tips.length ? h('ul', { class: 'insights' }, tips.map((t) => h('li', {}, t))) : h('p', { class: 'muted' }, 'Nada pendente por enquanto.'),
    h('details', { class: 'small-print' },
      h('summary', {}, 'Como cada objetivo é avaliado'),
      h('ul', {}, Object.entries(GOAL_INDICATORS).map(([g, v]) => h('li', {}, h('strong', {}, labelOf(GOALS, g)), ` → ${INDICATORS[v.main].label}. ${v.why}`))),
      h('p', {}, 'Comparação feita contra a sua própria mediana na mesma plataforma. "Acima" = pelo menos 30% acima; "abaixo" = pelo menos 30% abaixo. Com menos de 3 publicações comparáveis, nenhuma avaliação é feita.'),
    ),
  );
}
