// Visão geral: indicadores, o que fazer hoje, prazos de marcas, fotos pendentes e ritmo de posts.
import * as data from '../data.js';
import { h, page, group, cell, badge, fmtDay, emptyNote, toast, icon, card, kpi, btn, barChart, go } from '../ui.js';
import { formatById } from '../lib/formats.js';
import { GOALS } from '../lib/formats.js';
import { weekProgress, streak, suggestions, needsResults, STATUSES, statusIndex, iso, addDays, weekStart } from '../lib/insights.js';
import { openContent, newContent, today } from './content-sheet.js';
import { upcoming, DEAL_TYPES, finance, fmtMoney } from '../lib/deals.js';
import { targetWeek, weekdays } from '../lib/planner.js';
import { openDesigner, missingPhotos } from './designer.js';
import { openDeal } from './brands.js';
import { openFormat } from './formats.js';

let shuffle = 0;
// O botão diz a ação que você acabou de fazer.
const ACTION = { roteiro: 'Roteirizar', gravado: 'Gravei', editado: 'Editei', postado: 'Postei' };

// Avança a etapa com um toque (Roteiro → Gravado → Editado → Postado).
function advance(c) {
  const i = statusIndex(c.status);
  if (i >= STATUSES.length - 1) return openContent(c);
  const next = STATUSES[i + 1].id;
  const patch = { status: next };
  if (next === 'postado') {
    patch.postedAt = today();
    if (!c.date) patch.date = today();
  }
  data.update('contents', c.id, patch);
  toast(next === 'postado' ? 'Postado! 🎉' : `Marcado como ${STATUSES[i + 1].label.toLowerCase()}`);
}

export function contentRow(c, { showDate = false } = {}) {
  const f = formatById(c.formatId, data.all('formats'));
  const i = statusIndex(c.status);
  const done = c.status === 'postado';
  const next = STATUSES[i + 1];
  return h('div', { class: 'content-row', 'data-id': `content-${c.id}` },
    h('button', { type: 'button', class: 'content-main', onclick: () => openContent(c) },
      badge(f?.emoji || (c.source === 'instagram' ? '📸' : '📝'), f?.color || 'gray'),
      h('span', { class: 'cell-text' },
        h('span', { class: 'cell-title' }, c.title || 'Sem título'),
        h('span', { class: 'cell-sub' }, [showDate && c.date ? fmtDay(c.date) : null, f?.name, (c.platforms || []).map((p) => (p === 'tiktok' ? 'TikTok' : 'Instagram')).join(' + ')].filter(Boolean).join(' · ')),
        h('span', { class: 'mini-steps', 'aria-label': `Etapa: ${STATUSES[i].label}` }, STATUSES.map((s, k) => h('span', { class: `ms${k <= i ? ' on' : ''}` }))),
      ),
    ),
    done
      ? h('span', { class: 'done-mark', 'aria-label': 'Postado' }, icon('check'))
      : h('button', { type: 'button', class: 'btn btn-sm', 'data-id': 'advance', onclick: () => advance(c), 'aria-label': `Marcar como ${next.label.toLowerCase()}` }, ACTION[next.id]),
  );
}

const DL_ICON = { entrega: '📦', roteiro: '📝', post: '📣', pagamento: '💰' };

function brandGroup(t) {
  const up = upcoming(data.all('deals'), t, 3);
  const rows = [...up.overdue.map((x) => ({ ...x, tag: 'atrasado' })), ...up.today.map((x) => ({ ...x, tag: 'hoje' })), ...up.soon.map((x) => ({ ...x, tag: fmtDay(x.date, { weekday: 'short', day: 'numeric' }) }))];
  if (!rows.length) return emptyNote('Nada pendente', 'Prazos de campanhas aparecem aqui.');
  return group({
    children: rows.slice(0, 7).map((x) => cell({
      emoji: DL_ICON[x.kind], color: x.tag === 'atrasado' ? 'red' : DEAL_TYPES[x.deal.type]?.color || 'gray',
      title: `${x.name}: ${x.label}`, subtitle: `${DEAL_TYPES[x.deal.type]?.label} · ${x.tag}`, chevron: true, onClick: () => openDeal(x.deal), cls: x.tag === 'atrasado' ? 'late-row' : '',
    })),
  });
}

function photoGroup(t) {
  const end = addDays(t, 7);
  const list = data.all('contents').filter((c) => c.date >= t && c.date <= end && c.status !== 'postado' && missingPhotos(c) > 0);
  if (!list.length) return null;
  return card({ title: 'Fotos que eu preciso de você', subtitle: 'Abra para ver o pedido de cada foto e enviar', flush: true, id: 'photos-card', children: group({ children: list.map((c) => cell({ emoji: '📷', color: 'orange', title: c.title, subtitle: `${fmtDay(c.date, { weekday: 'short', day: 'numeric' })} · ${missingPhotos(c)} foto(s): ${(c.slides || []).find((s) => s.photo && !s.photoId)?.photoHint || ''}`, chevron: true, onClick: () => openDesigner(c.id), id: `photo-${c.id}` })) }) });
}

function planBanner(t) {
  const monday = targetWeek(t);
  const plan = data.planFor(monday);
  if (!plan || monday <= t) return null;
  const days = weekdays(monday);
  return h('div', { class: 'card accent plan-banner', 'data-id': 'plan-banner' },
    h('span', { class: 'badge c-yellow' }, '🗓️'),
    h('div', { class: 'cell-text' }, h('strong', {}, 'Plano da próxima semana pronto'), h('span', { class: 'muted small' }, `${fmtDay(days[0], { day: 'numeric', month: 'short' })} – ${fmtDay(days[4], { day: 'numeric', month: 'short' })}: tema, formato e estrutura de cada dia.`)),
    btn('Abrir planejamento', () => go('conteudo/planejamento'), { kind: 'primary', small: true }));
}

// Posts publicados por semana (últimas 8), com a meta como linha de referência.
function weeklyChart(contents, t, goal) {
  const weeks = Array.from({ length: 8 }, (_, i) => addDays(weekStart(t), -7 * (7 - i)));
  const data = weeks.map((w, i) => ({
    label: fmtDay(w, { day: 'numeric', month: 'short' }),
    tip: `Semana de ${fmtDay(w, { day: 'numeric', month: 'short' })}`,
    value: weekProgress(contents, w, goal).posted,
    hl: i === weeks.length - 1,
  }));
  return barChart({ data, height: 170, refValue: goal, refLabel: `meta ${goal}`, label: 'Posts publicados por semana', fmt: (v) => String(v) });
}

export function render(root) {
  const p = data.profile();
  const contents = data.all('contents');
  const deals = data.all('deals');
  const t = today();
  const goal = p.weeklyGoal || 5;
  const wp = weekProgress(contents, t, goal);
  const st = streak(contents, t, goal);
  const up = upcoming(deals, t, 7);
  const fin = finance(deals, t.slice(0, 7), t);
  const todays = contents.filter((c) => c.date === t || (c.status === 'postado' && c.postedAt === t)).sort((a, b) => statusIndex(a.status) - statusIndex(b.status));
  const late = contents.filter((c) => c.date && c.date < t && c.status !== 'postado');
  const pending = needsResults(contents, t);
  const ideas = contents.filter((c) => !c.date && c.status !== 'postado');
  const sugg = todays.length ? [] : suggestions(contents, t, { shuffle, customFormats: data.all('formats') });
  const first = p.name ? p.name.split(' ')[0] : '';
  const upcomingContent = contents.filter((c) => c.date > t && c.date <= addDays(t, 6) && c.status !== 'postado').sort((a, b) => a.date.localeCompare(b.date));

  root.append(page({
    kicker: fmtDay(t, { weekday: 'long', day: 'numeric', month: 'long' }),
    title: first ? `Olá, ${first}` : 'Visão geral',
    subtitle: 'O que precisa de você hoje, o ritmo da semana e as entregas para marcas.',
    actions: btn('Planejamento da semana', () => go('conteudo/planejamento'), { iconName: 'plan' }),
    children: [
      planBanner(t),
      h('div', { class: 'grid cols-4 kpis' },
        kpi({ label: 'Posts nesta semana', value: `${wp.posted}/${wp.goal}`, meter: wp.posted / wp.goal, hint: wp.posted >= wp.goal ? 'Meta batida' : `${wp.goal - wp.posted} para a meta · ${wp.planned} planejados`, id: 'week-widget' }),
        kpi({ label: 'Sequência', value: `${st} ${st === 1 ? 'semana' : 'semanas'}`, hint: st ? 'batendo a meta seguidas' : 'comece batendo a meta desta semana' }),
        kpi({ label: 'Entregas atrasadas', value: String(up.overdue.length), tone: up.overdue.length ? 'danger' : '', hint: `${up.today.length + up.soon.length} prazo(s) nos próximos 7 dias`, id: 'late-kpi' }),
        kpi({ label: 'A receber de marcas', value: `R$ ${fmtMoney(fin.toReceive)}`, hint: fin.overdue ? `R$ ${fmtMoney(fin.overdue)} atrasado` : `R$ ${fmtMoney(fin.receivedMonth)} recebido no mês` }),
      ),
      h('div', { class: 'grid cols-main section' },
        h('div', { class: 'stack' },
          todays.length
            ? card({ title: 'Para hoje', subtitle: `${todays.filter((c) => c.status === 'postado').length} de ${todays.length} postado(s)`, flush: true, id: 'today-card', children: group({ children: todays.map((c) => contentRow(c)) }) })
            : card({
              title: 'Sugestões para hoje',
              subtitle: 'Foco do dia, sem repetir formatos das últimas 2 semanas, priorizando o que já funcionou para você',
              flush: true,
              actions: btn('Outras', () => { shuffle++; document.dispatchEvent(new Event('rerender')); }, { kind: 'ghost', small: true, iconName: 'refresh' }),
              children: group({ children: sugg.map((s) => h('div', { class: 'sugg', 'data-id': `sugg-${s.format.id}` },
                h('button', { type: 'button', class: 'content-main', onclick: () => openFormat(s.format) },
                  badge(s.format.emoji, s.format.color),
                  h('span', { class: 'cell-text' }, h('span', { class: 'cell-title' }, s.format.name), h('span', { class: 'cell-sub' }, `${GOALS[s.goal]?.label} · ${s.reason}`))),
                h('button', { type: 'button', class: 'btn btn-sm', 'data-id': 'do-this', onclick: () => newContent({ formatId: s.format.id, date: t, title: '' }) }, 'Fazer hoje'),
              )) }),
            }),
          late.length > 0 && card({ title: 'Atrasados', subtitle: 'Planejados para dias que já passaram', flush: true, children: group({ children: late.slice(0, 5).map((c) => contentRow(c, { showDate: true })) }) }),
          upcomingContent.length > 0 && card({ title: 'Próximos dias', flush: true, children: group({ children: upcomingContent.slice(0, 6).map((c) => contentRow(c, { showDate: true })) }) }),
          card({ title: 'Posts publicados por semana', subtitle: 'Últimas 8 semanas, com a sua meta', children: weeklyChart(contents, t, goal) }),
        ),
        h('div', { class: 'stack' },
          card({ title: 'Prazos de marcas', subtitle: 'Atrasados, hoje e próximos 3 dias', flush: true, id: 'brand-deadlines', actions: btn('Campanhas', () => go('marcas/campanhas'), { kind: 'ghost', small: true }), children: brandGroup(t) }),
          photoGroup(t),
          pending.length > 0 && card({
            title: 'Como foi?', subtitle: 'Anote os números para saber o que traz seguidores e marcas', flush: true,
            children: group({ children: pending.slice(0, 4).map((c) => cell({ emoji: '📊', color: 'green', title: c.title, subtitle: `Postado ${fmtDay(c.postedAt || c.date)}`, chevron: true, onClick: () => openContent(c) })) }),
          }),
          card({ flush: true, children: group({ children: [
            cell({ emoji: '💡', color: 'yellow', title: 'Ideias guardadas', detail: String(ideas.length), chevron: true, onClick: () => go('conteudo/planejamento') }),
          ] }) }),
        ),
      ),
      !contents.length && emptyNote('Comece por uma sugestão', 'Use "Fazer hoje" numa sugestão ou abra o Planejamento para gerar a semana.'),
    ],
  }));
}

export { iso };
