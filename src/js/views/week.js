// Aba Semana: plano de segunda a sexta (gerado sozinho a partir de sábado), prazos de marcas e ideias.
import * as data from '../data.js';
import { h, page, group, cell, navButton, actionSheet, toast, fmtDay, badge, emptyNote } from '../ui.js';
import { FORMATS, GOALS, TYPES, formatById } from '../lib/formats.js';
import { addDays, weekStart, iso, statusIndex, STATUSES } from '../lib/insights.js';
import { targetWeek, weekdays, generateWeek } from '../lib/planner.js';
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
  for (const i of ideas) data.create('contents', { title: i.title, formatId: i.formatId, hook: i.hook, notes: i.why ? `Por quê: ${i.why}` : '', status: 'ideia', date: '', type: 'video', platforms: ['instagram', 'tiktok'], source: 'claude' });
  toast(`${ideas.length} ideias guardadas`);
  location.hash = '#/semana';
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
  location.hash = '#/semana';
});

const planItems = (monday) => {
  const days = weekdays(monday);
  return data.all('contents').filter((c) => days.includes(c.date) && c.planWeek === monday).sort((a, b) => a.date.localeCompare(b.date));
};

function reroll(c) {
  const seed = `${Date.now()}`;
  const [fresh] = generateWeek({ monday: weekStart(c.date), contents: data.all('contents').filter((x) => x.id !== c.id), deals: [], profile: data.profile(), customFormats: data.all('formats'), seed })
    .filter((x) => x.date === c.date);
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
        h('span', { class: 'tag' }, `${t.emoji} ${t.label}`),
        g && h('span', { class: `tag t-${g.color}` }, g.label),
        f && h('span', { class: 'tag' }, f.name),
        c.dealId && h('span', { class: 'tag t-indigo' }, 'Marca'),
      ),
      h('span', { class: 'plan-title' }, c.title),
      c.hook && h('span', { class: 'plan-hook' }, `“${c.hook}”`),
      h('span', { class: 'mini-steps' }, STATUSES.map((s, k) => h('span', { class: `ms${k <= statusIndex(c.status) ? ' on' : ''}` }))),
    ),
    h('div', { class: 'plan-actions' },
      hasDesign && h('button', { type: 'button', class: 'next-btn', 'data-id': 'open-design', onclick: () => openDesigner(c.id) }, miss ? `📷 ${miss} foto${miss > 1 ? 's' : ''}` : '🎨 Design'),
      !c.dealId && c.status !== 'postado' && h('button', { type: 'button', class: 'next-btn ghost', 'data-id': 'reroll', onclick: () => reroll(c), 'aria-label': 'Trocar sugestão' }, '↻'),
    ),
  );
}

const DL_ICON = { entrega: '📦', roteiro: '📝', post: '📣', pagamento: '💰' };

export function render(root) {
  const t = today();
  state.monday ||= targetWeek(t);
  const monday = state.monday;
  const days = weekdays(monday);
  const allDays = [...days, addDays(monday, 5), addDays(monday, 6)];
  const plan = data.planFor(monday);
  const items = data.all('contents');
  const dls = deadlines(data.all('deals')).filter((d) => allDays.includes(d.date));
  const ideas = items.filter((c) => !c.date && c.status !== 'postado').sort((a, b) => String(b.createdAt).localeCompare(a.createdAt));
  const label = `${fmtDay(monday, { day: 'numeric', month: 'short' })} – ${fmtDay(days[4], { day: 'numeric', month: 'short' })}`;
  const isNext = monday > weekStart(t);
  const pItems = planItems(monday);
  const mix = pItems.reduce((a, c) => ((a[c.type] = (a[c.type] || 0) + 1), a), {});

  const dayGroups = allDays.map((d, i) => {
    const list = items.filter((c) => c.date === d).sort((a, b) => statusIndex(a.status) - statusIndex(b.status));
    const dl = dls.filter((x) => x.date === d);
    if (i >= 5 && !list.length && !dl.length) return null;
    return group({
      header: `${fmtDay(d, { weekday: 'long', day: 'numeric', month: 'short' })}${d === t ? ' · hoje' : ''}`,
      children: [
        ...list.map(planCard),
        ...dl.map((x) => cell({ emoji: DL_ICON[x.kind], color: DEAL_TYPES[x.deal.type]?.color || 'gray', title: `${x.name}: ${x.label}`, subtitle: DEAL_TYPES[x.deal.type]?.label, chevron: true, onClick: () => openDeal(x.deal) })),
        !list.length && i < 5 && h('button', { type: 'button', class: 'cell tappable link-cell', onclick: () => newContent({ date: d }) }, '+ Adicionar'),
      ],
    });
  });

  root.append(page({
    title: 'Semana',
    subtitle: `${label}${isNext ? ' · próxima semana' : ''}`,
    right: navButton('', () => newContent({ date: days[0] }), { iconName: 'plus', id: 'new-content-week' }),
    children: [
      h('div', { class: 'week-switch' },
        h('button', { type: 'button', class: 'nav-btn', 'aria-label': 'Semana anterior', onclick: () => { state.monday = addDays(monday, -7); rerender(); } }, '‹ Anterior'),
        h('button', { type: 'button', class: 'nav-btn', onclick: () => { state.monday = targetWeek(t); rerender(); } }, isNext || monday === weekStart(t) ? '' : 'Atual'),
        h('button', { type: 'button', class: 'nav-btn', 'aria-label': 'Próxima semana', onclick: () => { state.monday = addDays(monday, 7); rerender(); } }, 'Próxima ›'),
      ),
      !plan
        ? h('div', { class: 'plan-hero' },
          h('p', { class: 'plan-hero-title' }, '✨ Plano da semana'),
          h('p', { class: 'muted' }, 'Gera segunda a sexta com tema, foco, formato, tipo (vídeo, carrossel ou estático) e estrutura. Publis e TikTok Shop com data entram sozinhos.'),
          h('button', { type: 'button', class: 'btn-filled', 'data-id': 'generate-plan', onclick: () => { const n = data.generatePlan(monday, { seed: monday }); toast(`${n} conteúdos planejados`); } }, 'Gerar plano desta semana'),
          h('p', { class: 'small muted' }, 'A partir de sábado, o plano da semana seguinte é gerado sozinho quando você abre o app.'))
        : h('div', { class: 'plan-summary' },
          h('span', {}, `Gerado ${fmtDay(plan.generatedAt.slice(0, 10), { weekday: 'short', day: 'numeric', month: 'short' })}`),
          h('span', {}, Object.entries(mix).map(([k, v]) => `${v} ${TYPES[k]?.label.toLowerCase() || k}`).join(' · '))),
      ...dayGroups,
      plan && group({ header: 'Ações da semana', children: [
        h('button', { type: 'button', class: 'cell tappable tint', 'data-id': 'claude-week', onclick: () => {
          if (!pItems.length) return toast('Nada no plano para refinar.', 'error');
          askClaude({ kind: 'week', context: { monday }, prompt: weekPrompt({ profile: data.profile(), items: pItems, formats: [...FORMATS, ...data.all('formats')] }) });
        } }, '✨ Escrever a semana com o Claude'),
        h('button', { type: 'button', class: 'cell tappable tint', 'data-id': 'week-ics', onclick: () => {
          const evs = [...pItems.map((c) => ({ date: c.date, label: c.title, name: TYPES[c.type]?.label || 'Post' })), ...dls];
          data.downloadIcs(evs, `semana-${monday}`);
        } }, '📅 Adicionar a semana ao Calendário'),
        h('button', { type: 'button', class: 'cell tappable tint', 'data-id': 'regenerate', onclick: async () => {
          const ok = await actionSheet({ title: 'Refazer o plano', message: 'Troca as sugestões que você ainda não editou. O que você já mexeu fica.', actions: [{ label: 'Refazer', value: true, id: 'confirm-regenerate' }] });
          if (ok) { data.generatePlan(monday, { replace: true }); toast('Plano refeito'); }
        } }, '↻ Refazer sugestões'),
      ], footer: 'O Claude devolve ganchos, roteiros, legendas e os textos das artes; ao voltar, cole a resposta e tudo é preenchido.' }),
      group({
        header: `Ideias guardadas (${ideas.length})`,
        children: [
          ...ideas.slice(0, 12).map((c) => {
            const f = formatById(c.formatId, data.all('formats'));
            return h('div', { class: 'sugg', 'data-id': `idea-${c.id}` },
              h('button', { type: 'button', class: 'content-main', onclick: () => openContent(c) }, badge(f?.emoji || '💡', f?.color || 'yellow'),
                h('span', { class: 'cell-text' }, h('span', { class: 'cell-title' }, c.title), h('span', { class: 'cell-sub' }, f?.name || c.hook || ''))),
              h('button', { type: 'button', class: 'next-btn', 'data-id': 'schedule', onclick: async () => {
                const day = await actionSheet({ title: 'Agendar para', actions: days.map((d) => ({ label: fmtDay(d, { weekday: 'long', day: 'numeric' }), value: d })) });
                if (day) { data.update('contents', c.id, { date: day, planWeek: monday }); toast(`Agendado: ${fmtDay(day)}`); }
              } }, 'Agendar'));
          }),
          h('button', { type: 'button', class: 'cell tappable link-cell', onclick: () => newContent({ date: '' }) }, '+ Nova ideia'),
          h('button', { type: 'button', class: 'cell tappable tint', 'data-id': 'claude-ideas', onclick: () => askClaude({ kind: 'ideas', prompt: ideasPrompt({ profile: data.profile(), count: 5, hits: items.filter((c) => c.status === 'postado').map((c) => c.title).slice(-5) }) }) }, '✨ Pedir 5 ideias ao Claude'),
        ],
      }),
      !items.length && !plan && emptyNote('Comece gerando o plano', 'Você pode trocar qualquer sugestão com ↻ ou editar tocando nela.'),
    ],
  }));
}

export { iso };
