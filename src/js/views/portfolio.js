// Desempenho → Portfólio: acessos, origem, vídeos e cliques do portfólio (GoatCounter)
// e as análises "como se fosse uma marca" feitas pelo Claude.
import * as data from '../data.js';
import { h, card, kpi, table, btn, emptyNote, sheet, formGroups, toast, copyText, tag, fmtNum, fmtDay, barChart, hbar, group, cell, confirmDelete, go } from '../ui.js';
import { fetchPortfolioStats, summarize, taggedLink, apiKeyUrl, dashboardUrl } from '../lib/goatcounter.js';
import { portfolioReviewPrompt, parseReview, REVIEW_AREAS } from '../lib/prompts.js';
import { askClaude, onClaudeResult } from './claude.js';
import { iso } from '../lib/insights.js';

const rerender = () => document.dispatchEvent(new Event('rerender'));
const today = () => iso(new Date());
const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '—');
const cache = new Map(); // dias → { status, summary, error, at }

function load(days, { force = false } = {}) {
  const cfg = data.gcConfig();
  if (!cfg.token) return null;
  const hit = cache.get(days);
  if (hit && !force && (hit.status === 'loading' || Date.now() - hit.at < 10 * 60e3)) return hit;
  const entry = { status: 'loading', at: Date.now() };
  cache.set(days, entry);
  fetchPortfolioStats(cfg, days)
    .then((raw) => cache.set(days, { status: 'ok', summary: summarize(raw), at: Date.now() }))
    .catch((err) => cache.set(days, { status: 'error', error: err, at: Date.now() }))
    .finally(rerender);
  return entry;
}
export const clearPortfolioCache = () => cache.clear();

// ---------- Conexão ----------
export function openGcSheet() {
  const cfg = data.gcConfig();
  const f = formGroups([
    { fields: [
      { name: 'site', label: 'Código do GoatCounter', placeholder: 'duanecardoso' },
      { name: 'portfolioUrl', label: 'Endereço do portfólio', type: 'url', placeholder: 'https://…' },
    ] },
    { header: 'Chave da API', footer: 'Fica guardada só neste aparelho e não vai no backup. Use uma chave só com a permissão "Read statistics".', fields: [
      { name: 'token', label: 'Chave', type: 'password', placeholder: cfg.token ? '•••• (já salva; cole outra para trocar)' : 'cole a chave aqui', full: true },
    ] },
  ], { site: cfg.site, portfolioUrl: cfg.portfolioUrl });
  sheet({
    title: 'Portfólio (GoatCounter)',
    body: h('div', { class: 'sheet-stack' },
      h('ol', { class: 'plain-list steps-list' },
        h('li', {}, 'Entre na sua conta e abra ', h('a', { href: apiKeyUrl(cfg), target: '_blank', rel: 'noopener noreferrer' }, 'a página de API do GoatCounter'), '. No site deles ela fica no menu do seu e-mail (canto de cima) → aba "API".'),
        h('li', {}, 'Se aparecer "You need to verify your email", abra o e-mail que o GoatCounter mandou e clique no link de confirmação (ou em "Resend email").'),
        h('li', {}, 'Em "Add new API Token": Name "Creator", marque "Read statistics", deixe "All sites" e clique em "Add new".'),
        h('li', {}, 'Na lista de tokens, clique em "show" e copie o código comprido que aparece. Ele é a chave (não é a sua senha nem o código do site).'),
        h('li', {}, 'Cole aqui embaixo e salve.')),
      f.el,
      cfg.token && h('button', { type: 'button', class: 'btn btn-ghost btn-danger btn-sm', 'data-id': 'gc-disconnect', onclick: async () => {
        if (await confirmDelete('a chave do GoatCounter deste aparelho (os números continuam no GoatCounter)')) {
          data.saveGcConfig({ ...data.gcConfig(), token: '' });
          clearPortfolioCache();
          document.querySelector('dialog.sheet[open] [data-id="sheet-cancel"]')?.click();
        }
      } }, 'Remover chave deste aparelho'),
    ),
    onSave: () => {
      const v = f.read();
      if (!String(v.site || '').trim()) throw new Error('Informe o código do GoatCounter.');
      try {
        new URL(v.portfolioUrl);
      } catch {
        throw new Error('Confira o endereço do portfólio (começa com https://).');
      }
      const token = String(v.token || '').trim() || cfg.token || '';
      if (!token) throw new Error('Cole a chave da API.');
      data.saveGcConfig({ site: v.site.trim(), portfolioUrl: v.portfolioUrl.trim(), token });
      clearPortfolioCache();
      toast('Portfólio conectado');
    },
  });
}

// ---------- Links com etiqueta ----------
const PRESETS = [
  { ref: 'bio', label: 'Bio do Instagram' },
  { ref: 'dm', label: 'DM para marcas' },
  { ref: 'email', label: 'E-mail' },
  { ref: 'whatsapp', label: 'WhatsApp' },
  { ref: 'tiktok', label: 'Bio do TikTok' },
  { ref: 'plataforma', label: 'Plataformas (Seu Influencer…)' },
];
function linksCard(cfg) {
  const custom = h('input', { type: 'text', class: 'input', placeholder: 'Outra etiqueta (ex.: proposta-marca-x)', 'aria-label': 'Etiqueta personalizada' });
  const copy = async (url) => toast((await copyText(url)) ? 'Link copiado' : url);
  return card({
    title: 'Links com etiqueta',
    subtitle: 'Use um link diferente em cada lugar para saber de onde as marcas vêm',
    flush: true,
    children: [
      group({ children: PRESETS.map((p) => cell({ title: p.label, subtitle: taggedLink(cfg.portfolioUrl, p.ref), onClick: () => copy(taggedLink(cfg.portfolioUrl, p.ref)), detail: 'Copiar', id: `link-${p.ref}` })) }),
      h('div', { class: 'card-body link-custom' }, custom, btn('Copiar', () => copy(taggedLink(cfg.portfolioUrl, custom.value)), { small: true, id: 'link-custom' })),
      h('p', { class: 'card-foot' }, 'Para não contar as suas próprias visitas: abra uma vez em cada celular/computador ', h('a', { href: `${cfg.portfolioUrl.split('#')[0]}#toggle-goatcounter`, target: '_blank', rel: 'noopener noreferrer' }, 'este link'), ' e confirme o aviso.'),
    ],
  });
}

// ---------- Análises como marca ----------
onClaudeResult('portfolio-review', (text, ctx) => {
  const r = parseReview(text);
  const rec = data.create('reviews', { ...r, date: today(), days: ctx.days || null, visits: ctx.visits ?? null, url: ctx.url || '' });
  toast('Análise salva');
  go('analise/desempenho', { aba: 'portfolio' });
  setTimeout(() => openReview(rec), 300);
});

function askReview(cfg, days, summary) {
  const prev = data.all('reviews').slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
  askClaude({
    kind: 'portfolio-review',
    context: { days, visits: summary?.visits ?? null, url: cfg.portfolioUrl },
    prompt: portfolioReviewPrompt({ profile: data.profile(), url: cfg.portfolioUrl, stats: summary, days, previous: prev && { date: fmtDay(prev.date), top3: prev.top3 } }),
  });
}

export function openReview(r) {
  sheet({
    title: `Análise de ${fmtDay(r.date, { day: 'numeric', month: 'long' })}`,
    tall: true,
    body: h('div', { class: 'sheet-stack review' },
      r.nota !== null && r.nota !== undefined && h('div', { class: 'review-score' }, h('strong', {}, String(r.nota)), h('span', {}, '/10'), r.contrataria && h('p', {}, r.contrataria)),
      r.primeira && group({ header: 'Primeira impressão', children: [h('p', { class: 'cell prose' }, r.primeira)] }),
      r.top3?.length > 0 && group({ header: 'O que mudar primeiro', children: r.top3.map((t, i) => cell({ iconEl: h('span', { class: 'step-n' }, String(i + 1)), title: t })) }),
      r.itens?.length > 0 && group({ header: 'Por área', children: r.itens.map((i) => h('div', { class: 'cell review-item' },
        h('div', { class: 'review-item-head' }, h('strong', {}, i.area || '—'), i.nota !== null ? tag(`${i.nota}/10`, i.nota >= 8 ? 'ok' : i.nota >= 5 ? 'warn' : 'danger') : null),
        i.bom && h('p', {}, h('b', {}, 'Funciona: '), i.bom),
        i.melhorar && h('p', {}, h('b', {}, 'Mudar: '), i.melhorar))) }),
      r.processo && group({ header: 'Para o seu processo', children: [h('p', { class: 'cell prose' }, r.processo)] }),
      r.texto && group({ header: 'Resposta do Claude', children: [h('p', { class: 'cell prose prewrap' }, r.texto)] }),
      group({ children: [h('button', { type: 'button', class: 'cell tappable destructive', onclick: async () => {
        if (await confirmDelete('esta análise')) {
          data.remove('reviews', r.id);
          document.querySelector('dialog.sheet[open] [data-id="sheet-done"]')?.click();
        }
      } }, 'Apagar análise')] }),
    ),
  });
}

function reviewsCard(cfg, days, summary) {
  const list = data.all('reviews').slice().sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));
  return card({
    title: 'Análise como marca',
    subtitle: 'O Claude avalia o portfólio como uma marca que pensa em te contratar',
    actions: btn('Pedir análise', () => askReview(cfg, days, summary), { kind: 'primary', iconName: 'sparkle', small: true, id: 'ask-review' }),
    flush: true,
    children: [
      list.length
        ? group({ children: list.map((r) => cell({
          title: `${fmtDay(r.date, { day: 'numeric', month: 'short', year: 'numeric' })}${r.nota !== null && r.nota !== undefined ? ` · nota ${r.nota}` : ''}`,
          subtitle: r.top3?.[0] ? `Prioridade: ${r.top3[0]}` : r.contrataria || 'Abrir análise',
          chevron: true, id: `review-${r.id}`, onClick: () => openReview(r),
        })) })
        : emptyNote('Nenhuma análise ainda', 'Peça a primeira. Depois peça de novo a cada mês para ver se melhorou.'),
      h('p', { class: 'card-foot' }, `O Claude avalia: ${REVIEW_AREAS.join(', ').toLowerCase()}. Ele não assiste aos vídeos; avalia títulos, marcas, capas e ordem. Se ele não conseguir abrir o link, peça a análise no Claude Code, que lê o portfólio direto do GitHub.`),
    ],
  });
}

// ---------- Página ----------
export function portfolioTab(state) {
  const cfg = data.gcConfig();
  const days = Number(state.portfolioDays || 30);
  if (!cfg.token) {
    return [
      card({ cls: 'accent', id: 'gc-connect', children: h('div', { class: 'stack' },
        h('h3', {}, 'Conecte o portfólio'),
        h('p', { class: 'muted' }, 'O portfólio já envia visitas, origem, vídeos abertos e cliques para o GoatCounter. Para ver os números aqui, cole a chave de leitura da sua conta.'),
        h('div', { class: 'btn-row start' }, btn('Conectar', openGcSheet, { kind: 'primary', id: 'gc-open' }), h('a', { class: 'btn btn-ghost', href: dashboardUrl(cfg), target: '_blank', rel: 'noopener noreferrer' }, 'Abrir o GoatCounter'))) }),
      h('div', { class: 'grid cols-2 section' }, reviewsCard(cfg, days, null), linksCard(cfg)),
    ];
  }

  const entry = load(days);
  const head = h('div', { class: 'toolbar' },
    h('p', { class: 'muted small' }, entry?.status === 'ok' ? `Atualizado ${new Date(entry.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · contam visitantes (cada pessoa uma vez por dia)` : ' '),
    h('div', { class: 'page-actions' },
      btn('Atualizar', () => { load(days, { force: true }); rerender(); }, { iconName: 'refresh', small: true, kind: 'ghost', id: 'gc-refresh' }),
      btn('Configurar', openGcSheet, { small: true, kind: 'ghost', id: 'gc-settings' }),
      h('a', { class: 'btn btn-sm btn-ghost', href: dashboardUrl(cfg), target: '_blank', rel: 'noopener noreferrer' }, 'GoatCounter')));

  if (!entry || entry.status === 'loading') return [head, card({ children: h('p', { class: 'muted', 'data-id': 'gc-loading' }, 'Buscando os números do portfólio…') })];
  if (entry.status === 'error') {
    return [head, card({ cls: 'warn-card', children: h('div', { class: 'stack' }, h('p', { 'data-id': 'gc-error' }, entry.error.message), btn('Configurar conexão', openGcSheet, { small: true })) }),
      h('div', { class: 'grid cols-2 section' }, reviewsCard(cfg, days, null), linksCard(cfg))];
  }

  const s = entry.summary;
  const maxVideo = Math.max(0, ...s.videos.map((v) => v.count));
  const maxRef = Math.max(0, ...s.refs.map((r) => r.count));
  const dayList = Array.from({ length: Math.min(days, 31) }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (Math.min(days, 31) - 1 - i));
    return iso(d);
  });
  const byDay = new Map(s.daily.map((d) => [d.day, d.count]));
  const contato = s.funnel.find((f) => f.id === 'contato')?.count || 0;

  return [
    head,
    h('div', { class: 'grid cols-4 kpis' },
      kpi({ label: 'Visitantes', value: fmtNum(s.visits), hint: `últimos ${days} dias`, id: 'gc-visits' }),
      kpi({ label: 'Vídeos abertos', value: fmtNum(s.videoOpens), hint: s.visits ? `${(s.videoOpens / s.visits).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} por visitante` : '—', id: 'gc-videos' }),
      kpi({ label: 'Cliques de contato', value: fmtNum(s.contactClicks), hint: `${pct(s.contactClicks, s.visits)} dos visitantes · WhatsApp e e-mail`, id: 'gc-contacts' }),
      kpi({ label: 'Chegaram no contato', value: pct(contato, s.visits), hint: `${fmtNum(contato)} de ${fmtNum(s.visits)} rolaram até lá`, id: 'gc-reach' }),
    ),
    s.visits === 0 && h('p', { class: 'data-note' }, 'Ainda sem visitas neste período. Os números começam a contar a partir da instalação do contador no portfólio.'),
    h('div', { class: 'grid cols-2' },
      card({ title: 'Visitantes por dia', subtitle: days > 31 ? 'Últimos 31 dias' : `Últimos ${days} dias`, children: barChart({ label: 'Visitantes por dia', fmt: (v) => String(v), data: dayList.map((d, i) => ({ label: fmtDay(d, { day: 'numeric', month: 'short' }), tip: fmtDay(d, { weekday: 'short', day: 'numeric', month: 'short' }), value: byDay.get(d) || 0, hl: i === dayList.length - 1 })) }) }),
      card({ title: 'Até onde as pessoas rolam', subtitle: 'Onde as marcas desistem do portfólio', flush: true, children: table({
        caption: 'Até onde rolam', rows: s.funnel, rowId: (f) => `funil-${f.id}`,
        columns: [
          { label: 'Etapa', main: true, render: (f) => f.label },
          { label: 'Pessoas', render: (f) => hbar(f.count, s.visits || 1, fmtNum(f.count)) },
          { label: '%', cls: 'right', render: (f) => h('span', { class: 'num' }, pct(f.count, s.visits)) },
        ],
      }) }),
    ),
    h('div', { class: 'grid cols-2 section' },
      card({ title: 'De onde vêm', subtitle: 'Etiquetas (?ref=) e sites de origem. "Sem origem" costuma ser app do Instagram ou WhatsApp.', flush: true, children: table({
        caption: 'Origem das visitas', rows: s.refs, rowId: (r) => `ref-${r.name || 'direto'}`, empty: 'Sem dados de origem ainda.',
        columns: [
          { label: 'Origem', main: true, render: (r) => h('div', { class: 'td-flex' }, h('span', { class: 'td-title' }, r.name || 'Sem origem (direto ou app)'), r.tagged ? tag('etiqueta', 't-butter') : null) },
          { label: 'Visitantes', render: (r) => hbar(r.count, maxRef, fmtNum(r.count)) },
        ],
      }) }),
      card({ title: 'Vídeos mais abertos', subtitle: 'Quantas vezes cada vídeo foi aberto no portfólio', flush: true, children: table({
        caption: 'Vídeos mais abertos', rows: s.videos.slice(0, 12), rowId: (v) => `video-${v.id}`, empty: 'Nenhum vídeo aberto no período.',
        columns: [
          { label: 'Vídeo', main: true, render: (v) => h('a', { href: `https://youtube.com/shorts/${v.id}`, target: '_blank', rel: 'noopener noreferrer', class: 'td-title' }, v.title) },
          { label: 'Aberturas', render: (v) => hbar(v.count, maxVideo, fmtNum(v.count)) },
        ],
      }) }),
    ),
    h('div', { class: 'grid cols-3 section align-start' },
      card({ title: 'Cliques', flush: true, children: group({ children: [
        ['whatsapp', 'WhatsApp', '💬'], ['email', 'E-mail', '✉️'], ['instagram', 'Instagram', '📸'], ['tiktok', 'TikTok', '🎵'], ['youtube', 'Abrir no YouTube', '▶️'],
      ].map(([k, label, emoji]) => cell({ emoji, color: 'gray', title: label, detail: fmtNum(s.clicks[k]) })).concat([
        cell({ emoji: '📝', color: 'yellow', title: 'Formulário de contato', detail: fmtNum(s.forms.contato) }),
        cell({ emoji: '📦', color: 'yellow', title: 'Formulário do kit', detail: fmtNum(s.forms.kit) }),
        cell({ emoji: '🇺🇸', color: 'gray', title: 'Trocaram para inglês', detail: fmtNum(s.english) }),
      ]) }) }),
      card({ title: 'Onde estão', flush: true, children: s.locations.length ? group({ children: s.locations.slice(0, 8).map((l) => cell({ title: l.name || 'Desconhecido', detail: fmtNum(l.count) })) }) : emptyNote('Sem dados ainda.') }),
      card({ title: 'Aparelhos', flush: true, children: s.systems.length ? group({ children: s.systems.slice(0, 8).map((l) => cell({ title: l.name || 'Desconhecido', detail: fmtNum(l.count) })) }) : emptyNote('Sem dados ainda.') }),
    ),
    h('div', { class: 'grid cols-2 section align-start' }, reviewsCard(cfg, days, s), linksCard(cfg)),
  ];
}
