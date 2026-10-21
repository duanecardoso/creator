// Aba Planejar: semana em faixa de dias, ideias guardadas e preenchimento automático da semana.
import * as data from '../data.js';
import { h, page, group, cell, navButton, actionSheet, toast, fmtDay, badge, emptyNote } from '../ui.js';
import { formatById } from '../lib/formats.js';
import { weekDays, weekProgress, addDays, suggestions, iso, statusIndex } from '../lib/insights.js';
import { ideasPrompt, parseIdeas } from '../lib/prompts.js';
import { newContent, openContent, today } from './content-sheet.js';
import { contentRow } from './today.js';
import { askClaude, onClaudeResult } from './claude.js';

const state = { selected: null };
const rerender = () => document.dispatchEvent(new Event('rerender'));

onClaudeResult('ideas', (text) => {
  const ideas = parseIdeas(text);
  if (!ideas.length) throw new Error('A resposta não trouxe ideias.');
  for (const i of ideas) data.create('contents', { title: i.title, formatId: i.formatId, hook: i.hook, notes: i.why ? `Por quê: ${i.why}` : '', status: 'ideia', date: '', platforms: ['instagram', 'tiktok'], source: 'claude' });
  toast(`${ideas.length} ideias guardadas`);
  location.hash = '#/planejar';
});

function askIdeas() {
  const hitTitles = data.all('contents').filter((c) => c.status === 'postado').map((c) => c.title).slice(-5);
  askClaude({ kind: 'ideas', prompt: ideasPrompt({ profile: data.profile(), count: 5, hits: hitTitles }) });
}

// Preenche os dias livres da semana (a partir de hoje) até a meta, com sugestões de formato.
async function fillWeek(days, contents, goal) {
  const t = today();
  const wp = weekProgress(contents, days[0], goal);
  const missing = wp.goal - wp.posted - wp.planned;
  const free = days.filter((d) => d >= t && !contents.some((c) => c.date === d));
  const n = Math.min(missing, free.length);
  if (n <= 0) {
    toast(missing <= 0 ? 'A semana já tem conteúdos suficientes para a meta.' : 'Não há dias livres a partir de hoje.', missing <= 0 ? 'ok' : 'error');
    return;
  }
  const ok = await actionSheet({ title: 'Completar a semana', message: `Vou colocar ${n} formato(s) sugerido(s) nos dias livres para chegar à meta de ${wp.goal}. Você troca o tema depois.`, actions: [{ label: `Adicionar ${n}`, value: true, id: 'confirm-fill' }] });
  if (!ok) return;
  const step = free.length / n;
  const chosen = new Set();
  for (let k = 0; k < n; k++) {
    const day = free[Math.floor(k * step)];
    const s = suggestions(data.all('contents'), day, { count: 3, customFormats: data.all('formats') }).find((x) => !chosen.has(x.format.id));
    if (!s) continue;
    chosen.add(s.format.id);
    data.create('contents', { formatId: s.format.id, title: s.format.name, status: 'ideia', date: day, platforms: s.format.platforms || ['instagram', 'tiktok'] });
  }
  toast('Semana completa. Toque em cada um para definir o tema.');
}

export function render(root) {
  const t = today();
  state.selected ||= t;
  const p = data.profile();
  const contents = data.all('contents');
  const days = weekDays(state.selected);
  const wp = weekProgress(contents, state.selected, p.weeklyGoal || 4);
  const dayItems = contents.filter((c) => c.date === state.selected).sort((a, b) => statusIndex(a.status) - statusIndex(b.status));
  const ideas = contents.filter((c) => !c.date && c.status !== 'postado').sort((a, b) => String(b.createdAt).localeCompare(a.createdAt));
  const label = `${fmtDay(days[0], { day: 'numeric', month: 'short' })} – ${fmtDay(days[6], { day: 'numeric', month: 'short' })}`;

  root.append(page({
    title: 'Planejar',
    subtitle: label,
    right: navButton('', () => newContent({ date: state.selected }), { iconName: 'plus', id: 'new-content-plan' }),
    children: [
      h('div', { class: 'week-nav' },
        h('button', { type: 'button', class: 'nav-btn', 'aria-label': 'Semana anterior', onclick: () => { state.selected = addDays(state.selected, -7); rerender(); } }, '‹'),
        h('div', { class: 'week-strip', role: 'tablist', 'aria-label': 'Dias da semana' }, days.map((d) => {
          const has = contents.filter((c) => c.date === d);
          const allDone = has.length && has.every((c) => c.status === 'postado');
          return h('button', {
            type: 'button', role: 'tab', 'aria-selected': String(d === state.selected), 'data-day': d,
            class: `day${d === state.selected ? ' sel' : ''}${d === t ? ' today' : ''}`,
            onclick: () => { state.selected = d; rerender(); },
          }, h('span', { class: 'dow' }, fmtDay(d, { weekday: 'narrow' })), h('span', { class: 'dnum' }, String(Number(d.slice(8)))), h('span', { class: `ddot${has.length ? (allDone ? ' done' : ' on') : ''}` }));
        })),
        h('button', { type: 'button', class: 'nav-btn', 'aria-label': 'Próxima semana', onclick: () => { state.selected = addDays(state.selected, 7); rerender(); } }, '›'),
      ),
      group({
        header: fmtDay(state.selected, { weekday: 'long', day: 'numeric', month: 'long' }),
        children: [
          ...dayItems.map((c) => contentRow(c)),
          h('button', { type: 'button', class: 'cell tappable link-cell', 'data-id': 'add-day', onclick: () => newContent({ date: state.selected }) }, '+ Adicionar neste dia'),
        ],
      }),
      group({
        header: 'Semana',
        footer: `Meta: ${wp.goal} posts por semana (mude em Perfil).`,
        children: [
          cell({ emoji: '🎯', color: 'pink', title: `${wp.posted} ${wp.posted === 1 ? 'postado' : 'postados'} · ${wp.planned} ${wp.planned === 1 ? 'planejado' : 'planejados'}`, detail: `${Math.min(wp.posted + wp.planned, wp.goal)}/${wp.goal}` }),
          wp.posted + wp.planned < wp.goal && h('button', { type: 'button', class: 'cell tappable tint', 'data-id': 'fill-week', onclick: () => fillWeek(days, contents, p.weeklyGoal || 4) }, 'Completar a semana com sugestões'),
        ],
      }),
      group({
        header: `Ideias guardadas (${ideas.length})`,
        footer: 'Toque em "Agendar" para colocar a ideia no dia selecionado acima.',
        children: [
          ...ideas.map((c) => {
            const f = formatById(c.formatId, data.all('formats'));
            return h('div', { class: 'sugg', 'data-id': `idea-${c.id}` },
              h('button', { type: 'button', class: 'content-main', onclick: () => openContent(c) }, badge(f?.emoji || '💡', f?.color || 'yellow'),
                h('span', { class: 'cell-text' }, h('span', { class: 'cell-title' }, c.title), h('span', { class: 'cell-sub' }, f?.name || c.hook || ''))),
              h('button', { type: 'button', class: 'next-btn', 'data-id': 'schedule', onclick: () => { data.update('contents', c.id, { date: state.selected }); toast(`Agendado para ${fmtDay(state.selected)}`); } }, 'Agendar'),
            );
          }),
          h('button', { type: 'button', class: 'cell tappable link-cell', onclick: () => newContent({ date: '' }) }, '+ Nova ideia'),
          h('button', { type: 'button', class: 'cell tappable tint', 'data-id': 'claude-ideas', onclick: askIdeas }, '✨ Pedir 5 ideias ao Claude'),
        ],
      }),
      !contents.length && emptyNote('Semana em branco', 'Use "Completar a semana" e o site distribui formatos validados nos dias livres.'),
    ],
  }));
}

export { iso };
