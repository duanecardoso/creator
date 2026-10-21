// Aba Resultados: o que está funcionando, por formato, e o acompanhamento de marcas.
import * as data from '../data.js';
import { h, page, group, cell, segmented, badge, fmtNum, fmtDec, emptyNote } from '../ui.js';
import { byFormat, hits, hasResults, scores, median, confidence } from '../lib/insights.js';
import { openContent, today } from './content-sheet.js';
import { finance, fmtMoney } from '../lib/deals.js';

const state = { tab: 'resumo' };
const rerender = () => document.dispatchEvent(new Event('rerender'));

function summary() {
  const contents = data.all('contents');
  const month = today().slice(0, 7);
  const posted = contents.filter((c) => c.status === 'postado');
  const monthPosts = posted.filter((c) => (c.postedAt || c.date || '').startsWith(month));
  const measured = posted.filter(hasResults);
  const sum = (list, k) => {
    const vals = list.map((c) => c.results?.[k]).filter((v) => v !== null && v !== undefined && v !== '');
    return vals.length ? vals.reduce((a, b) => a + Number(b), 0) : null;
  };
  const conf = confidence(measured.length);
  const top = hits(contents);
  return [
    h('div', { class: 'widgets four' },
      stat('Posts no mês', fmtNum(monthPosts.length)),
      stat('Seguidores (mês)', fmtNum(sum(monthPosts, 'follows'))),
      stat('Contatos de marcas', fmtNum(sum(posted, 'brandContacts'))),
      stat('Recebido de marcas', `R$ ${fmtMoney(finance(data.all('deals'), month, today()).receivedMonth)}`),
      stat('Views típicas', fmtNum(median(measured.map((c) => scores(c).views)))),
      stat('Posts medidos', fmtNum(measured.length)),
    ),
    h('p', { class: 'data-note' }, measured.length
      ? `${measured.length} posts com resultado · ${conf.label.toLowerCase()}. ${measured.length < 15 ? 'Use como pista, não como regra.' : ''}`
      : 'Registre os números dos seus posts (ou conecte o Instagram em Perfil) para ver o que funciona.'),
    top.items.length > 0 && group({ header: 'Destaques', children: top.items.slice(0, 5).map(({ content: c, reasons }) => cell({ emoji: '⭐️', color: 'yellow', title: c.title, subtitle: reasons.join(', '), chevron: true, onClick: () => openContent(c) })) }),
    measured.length > 0 && group({
      header: 'Últimos posts',
      children: measured.slice().sort((a, b) => String(b.postedAt || b.date).localeCompare(a.postedAt || a.date)).slice(0, 8).map((c) => {
        const s = scores(c);
        return cell({ title: c.title, subtitle: [`${fmtNum(s.views)} views`, c.results.follows != null ? `+${c.results.follows} seguidores` : null, s.value != null ? `${fmtDec(s.value)} salv+comp/mil` : null].filter(Boolean).join(' · '), chevron: true, onClick: () => openContent(c) });
      }),
    }),
  ];
}

const stat = (label, value) => h('div', { class: 'widget stat' }, h('p', { class: 'w-label' }, label), h('p', { class: 'w-value' }, value));

function formats() {
  const rows = byFormat(data.all('contents'), data.all('formats'));
  if (!rows.length) return [emptyNote('Sem dados por formato ainda', 'Escolha o formato de cada conteúdo e registre os resultados. Aqui aparece qual formato traz mais seguidores, salvamentos e marcas.')];
  return [group({
    header: 'Por formato',
    footer: 'Valores típicos (mediana). "Por mil" = a cada mil visualizações, para comparar posts grandes e pequenos. Com menos de 3 posts num formato, ainda não dá para comparar.',
    children: rows.map((r) => h('div', { class: 'cell fmt-row' },
      badge(r.format?.emoji || '•', r.format?.color || 'gray'),
      h('span', { class: 'cell-text' },
        h('span', { class: 'cell-title' }, r.format?.name || (r.formatId === 'sem-formato' ? 'Sem formato' : r.formatId)),
        h('span', { class: 'cell-sub' }, `${r.count} post${r.count > 1 ? 's' : ''} · ${fmtNum(r.views)} views típicas`),
        h('span', { class: 'metrics-line' },
          h('span', {}, h('b', {}, fmtDec(r.follows)), ' seguidores/mil'),
          h('span', {}, h('b', {}, fmtDec(r.value)), ' salv+comp/mil'),
          h('span', {}, h('b', {}, String(r.brand)), ' marcas')),
      ),
      h('span', { class: `tag conf-${r.confidence.level}` }, r.confidence.label),
    )),
  })];
}

export function render(root) {
  const tabs = [{ value: 'resumo', label: 'Resumo' }, { value: 'formatos', label: 'Por formato' }];
  root.append(page({
    title: 'Resultados',
    subtitle: 'Seguidores, comunidade e marcas — não só views',
    children: [
      h('div', { class: 'pad-x' }, segmented(tabs, state.tab, (v) => { state.tab = v; rerender(); }, 'Seções')),
      state.tab === 'resumo' ? summary() : formats(),
    ],
  }));
}
