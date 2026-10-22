// Planejamento: quadro de segunda a sexta (gerado sozinho a partir de sábado), prazos de marcas e ideias.
import * as data from '../data.js';
import { h, page, group, cell, actionSheet, toast, fmtDay, badge, emptyNote, btn, card, go } from '../ui.js';
import { FORMATS, GOALS, TYPES, formatById } from '../lib/formats.js';
import { addDays, weekStart, iso, statusIndex, STATUSES } from '../lib/insights.js';
import { targetWeek, weekdays, generateWeek, planDays } from '../lib/planner.js';
import { deadlines, DEAL_TYPES } from '../lib/deals.js';
import { ideasPrompt, parseIdeas, weekPrompt, parseWeek, mergeSlides } from '../lib/prompts.js';
import { newContent, openContent, today } from './content-sheet.js';
import { askClaude, onClaudeResult } from './claude.js';
import { openDesigner, missingPhotos } from './designer.js';
import { openDeal } from './brands.js';

const state = { monday: null };
const rerender = () => document.dispatchEvent(new Event('rerender'));

onClaudeResult('ideas', (text) => {
  const ideas = parseIdeas(text);
  if (!ideas.length) throw new Error('A resposta não trouxe ideias.');
  for (const i of ideas) data.create('contents', { title: i.title, formatId: i.formatId, goal: i.goal || '', hook: i.hook, notes: i.why ? `Por quê: ${i.why}` : '', status: 'ideia', date: '', type: 'video', platforms: ['instagram', 'tiktok'], source: 'claude' });
  toast(`${ideas.length} ideias guardadas`);
  location.hash = '#/conteudo/planejamento';
});

onClaudeResult('week', (text, ctx) => {
  const days = parseWeek(text);
  const items = planItems(ctx.monday);
  let n = 0;
  days.forEach((d) => {
    const c = items[d.n - 1];
    if (!c) return;
    data.update('contents', c.id, {
      ...(d.title ? { title: d.title } : {}),
      ...(d.hook ? { hook: d.hook } : {}),
      ...(d.steps.length ? { steps: d.steps } : {}),
      ...(d.caption ? { caption: d.caption } : {}),
      ...(d.cta ? { cta: d.cta } : {}),
      critique: d.critique,
      check: d.check,
      slides: mergeSlides(c.slides, d.slides),
      touched: true,
    });
    n++;
  });
  toast(`${n} conteúdos preenchidos pelo Claude`);
  location.hash = '#/conteudo/planejamento';
});

const planItems = (monday) => {
  const days = weekdays(monday, planDays(data.profile()));
  return data.all('contents').filter((c) => days.includes(c.date) && c.planWeek === monday).sort((a, b) => a.date.localeCompare(b.date));
};

function reroll(c) {
  // Troca só o tema/formato do dia, mantendo o tipo (vídeo, carrossel, estático) para não bagunçar a mistura da semana.
  let fresh = null;
  for (let k = 0; k < 12 && !(fresh && (!c.type || fresh.type === c.type) && fresh.title !== c.title); k++) {
    [fresh] = generateWeek({ monday: weekStart(c.date), contents: data.all('contents').filter((x) => x.id !== c.id), deals: [], profile: data.profile(), customFormats: data.all('formats'), bank: data.all('bank'), seed: `${Date.now()}-${k}` })
      .filter((x) => x.date === c.date);
  }
  if (!fresh) return;
  data.update('contents', c.id, { ...fresh, planWeek: c.planWeek, touched: false });
  toast('Trocado');
}

function planCard(c) {
  const f = formatById(c.formatId, data.all('formats'));
  const t = TYPES[c.type] || TYPES.video;
  const g = GOALS[c.goal];
  const miss = missingPhotos(c);
  const hasDesign = c.type === 'carrossel' || c.type === 'estatico';
  return h('div', { class: 'plan-card', 'data-id': `plan-${c.date}` },
    h('button', { type: 'button', class: 'plan-main', onclick: () => openContent(c) },
      h('div', { class: 'plan-tags' },
        h('span', { class: `tag type-${c.type || 'video'}` }, t.label),
        g && h('span', { class: `tag t-${g.color}` }, g.label),
        f && h('span', { class: 'tag' }, f.name),
        c.dealId && h('span', { class: 'tag t-indigo' }, 'Marca'),
      ),
      h('span', { class: 'plan-title' }, c.title),
      c.hook && h('span', { class: 'plan-hook' }, `“${c.hook}”`),
      h('span', { class: 'mini-steps' }, STATUSES.map((s, k) => h('span', { class: `ms${k <= statusIndex(c.status) ? ' on' : ''}` }))),
    ),
    h('div', { class: 'plan-actions' },
      hasDesign && h('button', { type: 'button', class: `btn btn-sm${miss ? ' btn-accent' : ''}`, 'data-id': 'open-design', onclick: () => openDesigner(c.id) }, miss ? `📷 ${miss} foto${miss > 1 ? 's' : ''}` : 'Design'),
      !c.dealId && c.status !== 'postado' && h('button', { type: 'button', class: 'icon-btn', 'data-id': 'reroll', onclick: () => reroll(c), 'aria-label': 'Trocar sugestão', title: 'Trocar sugestão' }, '↻'),
    ),
  );
}

const DL_ICON = { entrega: '📦', roteiro: '📝', post: '📣', pagamento: '💰' };

export function render(root) {
  const t = today();
  state.monday ||= targetWeek(t);
  const monday = state.monday;
  const days = weekdays(monday, planDays(data.profile()));
  // Com plano de 7 dias, sábado e domingo já estão no quadro.
  const weekend = days.length === 7 ? [] : [addDays(monday, 5), addDays(monday, 6)];
  const plan = data.planFor(monday);
  const items = data.all('contents');
  const dls = deadlines(data.all('deals')).filter((d) => [...days, ...weekend].includes(d.date));
  const ideas = items.filter((c) => !c.date && c.status !== 'postado').sort((a, b) => String(b.createdAt).localeCompare(a.createdAt));
  const label = `${fmtDay(monday, { day: 'numeric', month: 'short' })} – ${fmtDay(days[days.length - 1], { day: 'numeric', month: 'short' })}`;
  const isNext = monday > weekStart(t);
  const isCurrent = monday === weekStart(t);
  const pItems = planItems(monday);
  const mix = pItems.reduce((a, c) => ((a[c.type] = (a[c.type] || 0) + 1), a), {});

  const dayColumn = (d) => {
    const list = items.filter((c) => c.date === d).sort((a, b) => statusIndex(a.status) - statusIndex(b.status));
    const dl = dls.filter((x) => x.date === d);
    return h('section', { class: `day-col${d === t ? ' is-today' : ''}`, 'aria-label': fmtDay(d, { weekday: 'long', day: 'numeric', month: 'long' }) },
      h('header', { class: 'day-head' },
        h('span', { class: 'day-name' }, fmtDay(d, { weekday: 'long' })),
        h('span', { class: 'day-date' }, fmtDay(d, { day: 'numeric', month: 'short' })),
        d === t && h('span', { class: 'tag t-butter' }, 'hoje')),
      h('div', { class: 'day-body' },
        ...list.map(planCard),
        ...dl.map((x) => h('button', { type: 'button', class: `deadline-chip k-${x.kind}`, onclick: () => openDeal(x.deal) },
          h('span', {}, DL_ICON[x.kind]), h('span', { class: 'cell-text' }, h('strong', {}, x.name), h('span', {}, x.label)))),
        h('button', { type: 'button', class: 'add-slot', onclick: () => newContent({ date: d }) }, '+ Adicionar'),
      ));
  };
  const weekendItems = weekend.flatMap((d) => items.filter((c) => c.date === d));
  const weekendDls = dls.filter((x) => weekend.includes(x.date));

  const weekActions = [
    btn('Escrever a semana com o Claude', () => {
      if (!pItems.length) return toast('Nada no plano para refinar.', 'error');
      askClaude({ kind: 'week', context: { monday }, prompt: weekPrompt({ profile: data.profile(), items: pItems, formats: [...FORMATS, ...data.all('formats')] }) });
    }, { iconName: 'sparkle', id: 'claude-week' }),
    btn('Calendário', () => {
      const evs = [...pItems.map((c) => ({ date: c.date, label: c.title, name: TYPES[c.type]?.label || 'Post' })), ...dls];
      data.downloadIcs(evs, `semana-${monday}`);
    }, { iconName: 'calendar', id: 'week-ics', title: 'Adicionar a semana ao Calendário (.ics)' }),
    btn('Refazer sugestões', async () => {
      const ok = await actionSheet({ title: 'Refazer o plano', message: 'Troca as sugestões que você ainda não editou. O que você já mexeu fica.', actions: [{ label: 'Refazer', value: true, id: 'confirm-regenerate' }] });
      if (ok) { data.generatePlan(monday, { replace: true }); toast('Plano refeito'); }
    }, { iconName: 'refresh', id: 'regenerate', kind: 'ghost' }),
  ];

  root.append(page({
    kicker: 'Conteúdo',
    title: 'Planejamento',
    subtitle: `Semana de ${label}${isNext ? ' · próxima semana' : isCurrent ? ' · esta semana' : ''}`,
    actions: [
      h('div', { class: 'btn-group' },
        btn('', () => { state.monday = addDays(monday, -7); rerender(); }, { iconName: 'back', title: 'Semana anterior' }),
        btn(isCurrent ? 'Esta semana' : 'Ir para esta semana', () => { state.monday = weekStart(t); rerender(); }),
        btn('', () => { state.monday = addDays(monday, 7); rerender(); }, { iconName: 'chevron', title: 'Próxima semana' })),
    ],
    children: [
      !plan
        ? h('div', { class: 'plan-hero' },
          h('p', { class: 'plan-hero-title' }, 'Plano desta semana'),
          h('p', { class: 'muted' }, 'Gera de segunda a sexta com tema, foco, formato, tipo (vídeo, carrossel ou estático) e estrutura. Publis e TikTok Shop com data entram sozinhos. A partir de sábado, a próxima semana é gerada quando você abre a plataforma.'),
          btn('Gerar plano desta semana', () => { const n = data.generatePlan(monday, { seed: monday }); toast(`${n} conteúdos planejados`); }, { kind: 'primary', id: 'generate-plan', iconName: 'sparkle' }))
        : h('div', { class: 'toolbar' },
          h('p', { class: 'muted small' }, `Plano gerado em ${fmtDay(plan.generatedAt.slice(0, 10), { weekday: 'short', day: 'numeric', month: 'short' })} · ${Object.entries(mix).map(([k, v]) => `${v} ${(TYPES[k]?.label || k).toLowerCase()}`).join(' · ')}`),
          h('div', { class: 'page-actions' }, weekActions)),
      h('div', { class: `board${days.length === 7 ? ' seven' : ''}` }, days.map(dayColumn)),
      (weekendItems.length > 0 || weekendDls.length > 0) && card({ title: 'Fim de semana', flush: true, children: group({ children: [
        ...weekendItems.map(planCard),
        ...weekendDls.map((x) => cell({ emoji: DL_ICON[x.kind], color: DEAL_TYPES[x.deal.type]?.color || 'gray', title: `${x.name}: ${x.label}`, subtitle: fmtDay(x.date), chevron: true, onClick: () => openDeal(x.deal) })),
      ] }) }),
      h('div', { class: 'grid cols-2 section' },
        card({
          title: `Ideias guardadas (${ideas.length})`, subtitle: 'Agende num dia da semana exibida', flush: true,
          actions: btn('Pedir 5 ideias ao Claude', () => askClaude({ kind: 'ideas', prompt: ideasPrompt({ profile: data.profile(), count: 5, hits: items.filter((c) => c.status === 'postado').map((c) => c.title).slice(-5) }) }), { iconName: 'sparkle', small: true, id: 'claude-ideas' }),
          children: group({ children: [
            ...ideas.slice(0, 12).map((c) => {
              const f = formatById(c.formatId, data.all('formats'));
              return h('div', { class: 'sugg', 'data-id': `idea-${c.id}` },
                h('button', { type: 'button', class: 'content-main', onclick: () => openContent(c) }, badge(f?.emoji || '💡', f?.color || 'yellow'),
                  h('span', { class: 'cell-text' }, h('span', { class: 'cell-title' }, c.title), h('span', { class: 'cell-sub' }, f?.name || c.hook || ''))),
                h('button', { type: 'button', class: 'btn btn-sm', 'data-id': 'schedule', onclick: async () => {
                  const day = await actionSheet({ title: 'Agendar para', actions: days.map((d) => ({ label: fmtDay(d, { weekday: 'long', day: 'numeric', month: 'short' }), value: d })) });
                  if (day) { data.update('contents', c.id, { date: day, planWeek: monday }); toast(`Agendado: ${fmtDay(day)}`); }
                } }, 'Agendar'));
            }),
            ideas.length > 12 && h('button', { type: 'button', class: 'cell tappable link-cell', 'data-id': 'all-ideas', onclick: () => go('conteudo/lista', { periodo: 'sem-data' }) }, `Ver todas as ${ideas.length} ideias`),
            !ideas.length && emptyNote('Nenhuma ideia guardada', 'Salve ideias de formatos, referências ou peça ao Claude.'),
            h('button', { type: 'button', class: 'cell tappable link-cell', onclick: () => newContent({ date: '' }) }, '+ Nova ideia'),
          ] }),
        }),
        card({
          title: 'Como o plano é montado', flush: false,
          children: h('ul', { class: 'plain-list' },
            h('li', {}, 'O foco alterna entre seguidores, comunidade e marcas ao longo da semana.'),
            h('li', {}, 'A mistura de vídeo, carrossel e estático segue o que você definiu em Configurações.'),
            h('li', {}, 'Formatos e temas usados recentemente são evitados; os que já deram certo para você ganham prioridade.'),
            h('li', {}, 'Use ↻ num card para trocar só aquele dia.')),
        }),
      ),
    ],
  }));
}

export { iso };
