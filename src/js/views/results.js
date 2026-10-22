// Desempenho: o que traz seguidores, salvamentos e marcas (não só views), por post e por formato.
import * as data from '../data.js';
import { h, page, card, kpi, table, filterSelect, badge, tag, tabs, postThumb, fmtNum, fmtDec, fmtDay, emptyNote, barChart, hbar, go } from '../ui.js';
import { byFormat, hasResults, scores, median, confidence, weekStart, addDays } from '../lib/insights.js';
import { GOALS, TYPES, formatById } from '../lib/formats.js';
import { openContent, today } from './content-sheet.js';
import { hitsList } from './formats.js';
import { portfolioTab } from './portfolio.js';

const state = { period: '90', platform: '', view: 'grade', tab: 'redes', portfolioDays: '30' };
const rerender = () => document.dispatchEvent(new Event('rerender'));
const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
const sum = (list, k) => {
  const vals = list.map((c) => num(c.results?.[k])).filter((v) => v !== null);
  return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
};
const PERIODS = [{ value: '30', label: 'Últimos 30 dias' }, { value: '90', label: 'Últimos 90 dias' }, { value: '365', label: 'Último ano' }, { value: 'all', label: 'Tudo' }];

function inPeriod(c, t) {
  const d = c.postedAt || c.date || '';
  if (state.period === 'all') return Boolean(d);
  return d >= addDays(t, -Number(state.period)) && d <= t;
}

// Grade visual dos posts, como o perfil do Instagram, com os números que importam embaixo.
function postGrid(list) {
  if (!list.length) return emptyNote('Nenhum post com números neste período.');
  return h('div', { class: 'post-grid' }, list.map((c) => {
    const f = formatById(c.formatId, data.all('formats'));
    const s = scores(c);
    const stat = (label, v, prefix = '') => (v === null || v === undefined ? null : h('span', { class: 'pg-stat' }, h('b', {}, `${prefix}${fmtNum(v)}`), label));
    return h('button', { type: 'button', class: 'post-card', 'data-id': `post-${c.id}`, onclick: () => openContent(c) },
      h('span', { class: 'pg-media' },
        c.igThumb ? postThumb(c, { cls: 'pg-img', emoji: f?.emoji || '📷', color: f?.color || 'gray' }) : h('span', { class: 'pg-empty' }, h('span', { class: 'pg-emoji' }, f?.emoji || '📝'), h('span', {}, 'Sem capa')),
        h('span', { class: 'pg-type' }, c.igFormat === 'reels' || (!c.igFormat && (c.type || 'video') === 'video') ? 'Reels' : c.igFormat === 'carrossel' || c.type === 'carrossel' ? 'Carrossel' : c.igFormat === 'foto' || c.type === 'estatico' ? 'Foto' : 'Post')),
      h('span', { class: 'pg-body' },
        h('span', { class: 'pg-top' }, h('span', { class: 'subtle small' }, fmtDay(c.postedAt || c.date, { day: 'numeric', month: 'short' })), c.results?.source === 'instagram' ? tag('Instagram', 'info') : tag('Manual')),
        h('span', { class: 'pg-title' }, c.title),
        h('span', { class: 'pg-stats' }, stat('views', s.views), stat('seguidores', num(c.results?.follows), '+'), stat('salvos', num(c.results?.saves)))),
    );
  }));
}

const TABS = [{ value: 'redes', label: 'Instagram e TikTok' }, { value: 'portfolio', label: 'Portfólio' }];

export function render(root, params = {}) {
  // Vindo de um link (#/analise/desempenho?aba=portfolio): abre a aba e limpa o endereço.
  if (params.aba && TABS.some((t) => t.value === params.aba)) {
    state.tab = params.aba;
    history.replaceState(null, '', '#/analise/desempenho');
  }
  const tabsEl = tabs(TABS, state.tab, (v) => { state.tab = v; rerender(); }, 'Área');
  if (state.tab === 'portfolio') {
    root.append(page({
      kicker: 'Análise',
      title: 'Desempenho',
      subtitle: 'Quem abre seu portfólio, de onde vem, o que assiste e se chama você. E o que uma marca acharia dele.',
      actions: filterSelect('Período', [{ value: '7', label: 'Últimos 7 dias' }, { value: '30', label: 'Últimos 30 dias' }, { value: '90', label: 'Últimos 90 dias' }], state.portfolioDays, (v) => { state.portfolioDays = v || '30'; rerender(); }),
      children: [tabsEl, ...portfolioTab(state)],
    }));
    return;
  }
  const t = today();
  const contents = data.all('contents');
  const posted = contents.filter((c) => c.status === 'postado' && inPeriod(c, t) && (!state.platform || (c.platforms || []).includes(state.platform)));
  const measured = posted.filter(hasResults).sort((a, b) => (a.postedAt || a.date).localeCompare(b.postedAt || b.date));
  const conf = confidence(measured.length);
  const formats = byFormat(measured, data.all('formats'));
  const maxFollows = Math.max(0, ...formats.map((r) => r.follows || 0));
  const maxValue = Math.max(0, ...formats.map((r) => r.value || 0));

  // Gráfico 1: visualizações dos últimos 12 posts medidos
  const last = measured.slice(-12);
  const viewsChart = last.length
    ? barChart({
      label: 'Visualizações por post',
      fmt: (v) => (v >= 1000 ? `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : String(Math.round(v))),
      data: last.map((c, i) => ({ label: fmtDay(c.postedAt || c.date, { day: 'numeric', month: 'short' }), tip: c.title, value: scores(c).views || 0, hl: i === last.length - 1 })),
    })
    : emptyNote('Sem números ainda', 'Anote as visualizações dos posts ou conecte o Instagram em Configurações.');

  // Gráfico 2: novos seguidores por semana (8 semanas)
  const weeks = Array.from({ length: 8 }, (_, i) => addDays(weekStart(t), -7 * (7 - i)));
  const followsByWeek = weeks.map((w, i) => {
    const list = contents.filter((c) => c.status === 'postado' && (c.postedAt || c.date) >= w && (c.postedAt || c.date) <= addDays(w, 6));
    return { label: fmtDay(w, { day: 'numeric', month: 'short' }), tip: `Semana de ${fmtDay(w, { day: 'numeric', month: 'short' })}`, value: sum(list, 'follows') || 0, hl: i === weeks.length - 1 };
  });

  root.append(page({
    kicker: 'Análise',
    title: 'Desempenho',
    subtitle: 'Seguidores, salvamentos e contatos de marcas, além das views. Comparado sempre com a sua própria média.',
    actions: [
      filterSelect('Período', PERIODS, state.period, (v) => { state.period = v || '90'; rerender(); }),
      filterSelect('Plataforma', [{ value: 'instagram', label: 'Instagram' }, { value: 'tiktok', label: 'TikTok' }], state.platform, (v) => { state.platform = v; rerender(); }),
    ],
    children: [
      tabsEl,
      h('div', { class: 'grid cols-4 kpis' },
        kpi({ label: 'Posts publicados', value: fmtNum(posted.length), hint: `${measured.length} com números anotados` }),
        kpi({ label: 'Novos seguidores', value: fmtNum(sum(posted, 'follows')), hint: 'soma dos posts com esse dado' }),
        kpi({ label: 'Views típicas por post', value: fmtNum(median(measured.map((c) => scores(c).views))), hint: 'mediana (não é afetada por um viral)' }),
        kpi({ label: 'Contatos de marcas', value: fmtNum(sum(posted, 'brandContacts')), hint: 'vindos de posts' }),
      ),
      h('p', { class: 'data-note' }, measured.length
        ? `Base: ${measured.length} post(s) com resultado · nível de confiança: ${conf.label.toLowerCase()}. ${measured.length < 15 ? 'Use como pista, não como regra.' : ''}`
        : 'Ainda não há posts com números neste período.'),
      h('div', { class: 'grid cols-2' },
        card({ title: 'Visualizações por post', subtitle: 'Últimos 12 posts com números', children: viewsChart }),
        card({ title: 'Novos seguidores por semana', subtitle: 'Últimas 8 semanas', children: barChart({ data: followsByWeek, label: 'Novos seguidores por semana', fmt: (v) => String(v) }) }),
      ),
      h('div', { class: 'stack section' },
        card({
          title: 'Por formato', subtitle: 'Valores típicos a cada mil visualizações, para comparar posts grandes e pequenos', flush: true,
          children: table({
            caption: 'Desempenho por formato', rows: formats, empty: 'Escolha o formato dos conteúdos e anote os resultados para comparar.',
            columns: [
              { label: 'Formato', main: true, render: (r) => h('div', { class: 'td-flex' }, badge(r.format?.emoji || '•', r.format?.color || 'gray'), h('span', { class: 'td-title' }, r.format?.name || (r.formatId === 'sem-formato' ? 'Sem formato' : r.formatId))) },
              { label: 'Posts', cls: 'right', render: (r) => h('span', { class: 'num' }, String(r.count)) },
              { label: 'Seguidores / mil', render: (r) => hbar(r.follows, maxFollows, fmtDec(r.follows)) },
              { label: 'Salv. + compart. / mil', render: (r) => hbar(r.value, maxValue, fmtDec(r.value)) },
              { label: 'Marcas', cls: 'right', render: (r) => h('span', { class: 'num' }, String(r.brand)) },
              { label: 'Confiança', render: (r) => tag(r.confidence.label, `conf-${r.confidence.level}`) },
            ],
          }),
        }),
        card({ title: 'Seus destaques', subtitle: 'Posts claramente acima da sua média em seguidores, salvamentos ou alcance, ou que trouxeram marcas', flush: true, children: hitsList() }),
      ),
      h('div', { class: 'section' },
        card({
          title: 'Posts com resultado', subtitle: data.igConfig()?.token ? 'As capas vêm do Instagram e são atualizadas a cada sincronização.' : null,
          actions: tabs([{ value: 'grade', label: 'Grade' }, { value: 'tabela', label: 'Tabela' }], state.view, (v) => { state.view = v; rerender(); }, 'Visualização dos posts'),
          flush: state.view === 'tabela',
          children: state.view === 'grade' ? postGrid(measured.slice().reverse()) : table({
            caption: 'Posts com resultado', rows: measured.slice().reverse(), onRowClick: (c) => openContent(c), rowId: (c) => `post-${c.id}`,
            empty: 'Nenhum post com números neste período.',
            columns: [
              { label: 'Post', main: true, render: (c) => h('div', { class: 'td-flex' }, postThumb(c, { cls: 'td-thumb', emoji: formatById(c.formatId, data.all('formats'))?.emoji || '📝' }), h('div', {}, h('div', { class: 'td-title' }, c.title), h('div', { class: 'td-sub' }, [fmtDay(c.postedAt || c.date, { day: 'numeric', month: 'short' }), TYPES[c.type || 'video']?.label, GOALS[c.goal]?.label].filter(Boolean).join(' · ')))) },
              { label: 'Views', cls: 'right', render: (c) => h('span', { class: 'num' }, fmtNum(scores(c).views)) },
              { label: 'Curtidas', cls: 'right', render: (c) => h('span', { class: 'num' }, fmtNum(num(c.results?.likes))) },
              { label: 'Coment.', cls: 'right', render: (c) => h('span', { class: 'num' }, fmtNum(num(c.results?.comments))) },
              { label: 'Salv.', cls: 'right', render: (c) => h('span', { class: 'num' }, fmtNum(num(c.results?.saves))) },
              { label: 'Compart.', cls: 'right', render: (c) => h('span', { class: 'num' }, fmtNum(num(c.results?.shares))) },
              { label: 'Seguidores', cls: 'right', render: (c) => h('span', { class: 'num' }, fmtNum(num(c.results?.follows))) },
              { label: 'Marcas', cls: 'right', render: (c) => h('span', { class: 'num' }, fmtNum(num(c.results?.brandContacts))) },
              { label: 'Origem', render: (c) => (c.results?.source === 'instagram' ? tag('Instagram', 'info') : tag('Manual')) },
            ],
          }),
        }),
      ),
      !data.igConfig()?.token && h('p', { class: 'subtle small' }, 'Quer os números automáticos do Instagram? ', h('button', { type: 'button', class: 'link-btn', onclick: () => go('configuracoes') }, 'Conecte em Configurações'), '.'),
    ],
  }));
}

