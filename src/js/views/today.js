// Aba Hoje: o que fazer hoje, meta da semana e sequência.
import * as data from '../data.js';
import { h, page, group, cell, navButton, badge, fmtDay, emptyNote, toast, icon } from '../ui.js';
import { formatById } from '../lib/formats.js';
import { GOALS } from '../lib/formats.js';
import { weekProgress, streak, suggestions, needsResults, STATUSES, statusIndex, iso, addDays } from '../lib/insights.js';
import { openContent, newContent, today } from './content-sheet.js';
import { pendingBanner } from './claude.js';
import { upcoming, DEAL_TYPES } from '../lib/deals.js';
import { targetWeek, weekdays } from '../lib/planner.js';
import { openDesigner, missingPhotos } from './designer.js';
import { openDeal } from './brands.js';
import { openFormat } from './formats.js';

let shuffle = 0;
// O botão diz a ação que você acabou de fazer.
const ACTION = { roteiro: 'Roteirizar', gravado: 'Gravei', editado: 'Editei', postado: 'Postei' };

function ring(value, goal, color) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, value / goal);
  return h('span', { class: 'ring', 'aria-hidden': 'true', html: `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="${r}" class="ring-track ${color}"/><circle cx="32" cy="32" r="${r}" class="ring-fill ${color}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct)}"/></svg>` });
}

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
      : h('button', { type: 'button', class: 'next-btn', 'data-id': 'advance', onclick: () => advance(c), 'aria-label': `Marcar como ${next.label.toLowerCase()}` }, ACTION[next.id]),
  );
}

const DL_ICON = { entrega: '📦', roteiro: '📝', post: '📣', pagamento: '💰' };

function brandGroup(t) {
  const up = upcoming(data.all('deals'), t, 3);
  const rows = [...up.overdue.map((x) => ({ ...x, tag: 'atrasado' })), ...up.today.map((x) => ({ ...x, tag: 'hoje' })), ...up.soon.map((x) => ({ ...x, tag: fmtDay(x.date, { weekday: 'short', day: 'numeric' }) }))];
  if (!rows.length) return null;
  return group({
    header: 'Marcas',
    children: rows.slice(0, 6).map((x) => cell({
      emoji: DL_ICON[x.kind], color: x.tag === 'atrasado' ? 'red' : DEAL_TYPES[x.deal.type]?.color || 'gray',
      title: `${x.name}: ${x.label}`, subtitle: `${DEAL_TYPES[x.deal.type]?.label} · ${x.tag}`, chevron: true, onClick: () => openDeal(x.deal), cls: x.tag === 'atrasado' ? 'late-row' : '',
    })),
  });
}

function photoGroup(t) {
  const end = addDays(t, 7);
  const list = data.all('contents').filter((c) => c.date >= t && c.date <= end && c.status !== 'postado' && missingPhotos(c) > 0);
  if (!list.length) return null;
  return group({
    header: 'Fotos que eu preciso de você',
    footer: 'Toque para ver o pedido de cada foto e enviar.',
    children: list.map((c) => cell({ emoji: '📷', color: 'orange', title: c.title, subtitle: `${fmtDay(c.date, { weekday: 'short', day: 'numeric' })} · ${missingPhotos(c)} foto(s): ${(c.slides || []).find((s) => s.photo && !s.photoId)?.photoHint || ''}`, chevron: true, onClick: () => openDesigner(c.id), id: `photo-${c.id}` })),
  });
}

function planBanner(t) {
  const monday = targetWeek(t);
  const plan = data.planFor(monday);
  if (!plan || monday <= t) return null;
  const days = weekdays(monday);
  return h('button', { type: 'button', class: 'plan-banner', 'data-id': 'plan-banner', onclick: () => (location.hash = '#/semana') },
    h('span', { class: 'pb-emoji' }, '🗓️'),
    h('span', { class: 'cell-text' }, h('span', { class: 'cell-title' }, 'Plano da próxima semana pronto'), h('span', { class: 'cell-sub' }, `${fmtDay(days[0], { day: 'numeric', month: 'short' })} – ${fmtDay(days[4], { day: 'numeric', month: 'short' })} · toque para ver`)),
    h('span', { class: 'chev-wrap' }, '›'));
}

export function render(root) {
  const p = data.profile();
  const contents = data.all('contents');
  const t = today();
  const wp = weekProgress(contents, t, p.weeklyGoal || 4);
  const st = streak(contents, t, p.weeklyGoal || 4);
  const todays = contents.filter((c) => c.date === t || (c.status === 'postado' && c.postedAt === t)).sort((a, b) => statusIndex(a.status) - statusIndex(b.status));
  const late = contents.filter((c) => c.date && c.date < t && c.status !== 'postado');
  const pending = needsResults(contents, t);
  const ideas = contents.filter((c) => !c.date && c.status !== 'postado');
  const sugg = todays.length ? [] : suggestions(contents, t, { shuffle, customFormats: data.all('formats') });
  const first = p.name ? p.name.split(' ')[0] : '';
  const tomorrow = contents.filter((c) => c.date === addDays(t, 1) && c.status !== 'postado');

  root.append(page({
    title: 'Hoje',
    subtitle: `${fmtDay(t, { weekday: 'long', day: 'numeric', month: 'long' })}${first ? ` · oi, ${first}` : ''}`,
    left: h('button', { type: 'button', class: 'avatar-btn', 'aria-label': 'Perfil', 'data-id': 'open-profile', onclick: () => (location.hash = '#/perfil') }, (p.name || '✦').trim().charAt(0).toUpperCase()),
    right: navButton('', () => newContent({ date: t }), { iconName: 'plus', id: 'new-content' }),
    children: [
      pendingBanner(),
      planBanner(t),
      h('div', { class: 'widgets' },
        h('div', { class: 'widget', 'data-id': 'week-widget' },
          ring(wp.posted, wp.goal, 'pink'),
          h('div', {}, h('p', { class: 'w-label' }, 'Semana'), h('p', { class: 'w-value' }, `${wp.posted}/${wp.goal}`), h('p', { class: 'w-sub' }, wp.posted >= wp.goal ? 'Meta batida ✨' : `${wp.goal - wp.posted} para a meta`)),
        ),
        h('div', { class: 'widget' },
          h('span', { class: 'w-emoji', 'aria-hidden': 'true' }, st > 0 ? '🔥' : '🌱'),
          h('div', {}, h('p', { class: 'w-label' }, 'Sequência'), h('p', { class: 'w-value' }, String(st)), h('p', { class: 'w-sub' }, st ? `${st === 1 ? 'semana' : 'semanas'} batendo a meta` : 'semanas · comece agora')),
        ),
      ),
      brandGroup(t),
      photoGroup(t),
      todays.length
        ? group({ header: 'Para hoje', children: todays.map((c) => contentRow(c)) })
        : group({
          header: 'Sugestões para hoje',
          footer: 'Formatos escolhidos pelo foco do dia, evitando os que você usou nas últimas 2 semanas e priorizando os que já deram certo para você.',
          children: [
            ...sugg.map((s) => h('div', { class: 'sugg', 'data-id': `sugg-${s.format.id}` },
              h('button', { type: 'button', class: 'content-main', onclick: () => openFormat(s.format) },
                badge(s.format.emoji, s.format.color),
                h('span', { class: 'cell-text' }, h('span', { class: 'cell-title' }, s.format.name), h('span', { class: 'cell-sub' }, `${GOALS[s.goal]?.label} · ${s.reason}`))),
              h('button', { type: 'button', class: 'next-btn', 'data-id': 'do-this', onclick: () => newContent({ formatId: s.format.id, date: t, title: '' }) }, 'Fazer'),
            )),
            h('button', { type: 'button', class: 'cell tappable link-cell', onclick: () => { shuffle++; document.dispatchEvent(new Event('rerender')); } }, 'Outras sugestões'),
          ],
        }),
      late.length > 0 && group({ header: 'Atrasados', children: late.slice(0, 5).map((c) => contentRow(c, { showDate: true })) }),
      tomorrow.length > 0 && group({ header: 'Amanhã', children: tomorrow.map((c) => contentRow(c)) }),
      pending.length > 0 && group({
        header: 'Como foi?',
        footer: 'Registrar resultados mostra quais formatos trazem seguidores e marcas.',
        children: pending.slice(0, 4).map((c) => cell({ emoji: '📊', color: 'green', title: c.title, subtitle: `Postado ${fmtDay(c.postedAt || c.date)} · toque para anotar os números`, chevron: true, onClick: () => openContent(c) })),
      }),
      group({ children: [
        cell({ emoji: '💡', color: 'yellow', title: 'Ideias guardadas', detail: String(ideas.length), chevron: true, onClick: () => (location.hash = '#/semana') }),
      ] }),
      !contents.length && emptyNote('Comece por uma sugestão acima', 'Toque em "Fazer" e o conteúdo entra no seu dia com o passo a passo do formato.'),
    ],
  }));
}

export { iso };
