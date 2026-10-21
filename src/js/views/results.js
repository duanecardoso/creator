// Aba Resultados: o que está funcionando, por formato, e o acompanhamento de marcas.
import * as data from '../data.js';
import { h, page, group, cell, segmented, sheet, formGroups, toast, confirmDelete, navButton, badge, fmtNum, fmtDec, copyText, emptyNote } from '../ui.js';
import { byFormat, hits, hasResults, scores, median, confidence } from '../lib/insights.js';
import { openContent, today } from './content-sheet.js';

const state = { tab: 'resumo' };
const rerender = () => document.dispatchEvent(new Event('rerender'));

const BRAND_STATUS = [
  { value: 'quero', label: 'Quero trabalhar', emoji: '💭', color: 'gray' },
  { value: 'contatei', label: 'Contatei', emoji: '📨', color: 'blue' },
  { value: 'conversando', label: 'Conversando', emoji: '💬', color: 'orange' },
  { value: 'fechado', label: 'Fechado', emoji: '🤝', color: 'green' },
];

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
      stat('Views típicas', fmtNum(median(measured.map((c) => scores(c).views)))),
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

function brands() {
  const list = data.all('brands');
  const portfolio = data.all('contents').filter((c) => c.portfolio);
  return [
    list.length
      ? BRAND_STATUS.map((s) => {
        const items = list.filter((b) => (b.status || 'quero') === s.value);
        return items.length ? group({ header: s.label, children: items.map((b) => cell({ emoji: s.emoji, color: s.color, title: b.name, subtitle: b.next || b.notes || '', chevron: true, onClick: () => editBrand(b) })) }) : null;
      })
      : emptyNote('Nenhuma marca ainda', 'Anote marcas com quem quer trabalhar e acompanhe: quero → contatei → conversando → fechado.'),
    group({
      header: `Portfólio UGC (${portfolio.length})`,
      footer: 'Marque "Usar no portfólio UGC" num conteúdo para ele aparecer aqui. Copie a lista e mande para marcas.',
      children: [
        ...portfolio.map((c) => cell({ emoji: '🎬', color: 'indigo', title: c.title, subtitle: c.link || 'sem link ainda', chevron: true, onClick: () => openContent(c) })),
        portfolio.length > 0 && h('button', { type: 'button', class: 'cell tappable tint', onclick: async () => {
          const text = portfolio.map((c) => `• ${c.title}${c.link ? ` — ${c.link}` : ''}`).join('\n');
          toast((await copyText(text)) ? 'Lista copiada' : 'Não consegui copiar', 'ok');
        } }, 'Copiar lista de links'),
      ],
    }),
  ];
}

export function editBrand(b = {}) {
  const f = formGroups([
    { fields: [
      { name: 'name', label: 'Marca', placeholder: 'Nome' },
      { name: 'handle', label: '@ ou site', placeholder: '@marca' },
      { name: 'status', label: 'Etapa', type: 'select', options: BRAND_STATUS, placeholder: false },
    ] },
    { header: 'Próximo passo', fields: [{ name: 'next', label: 'Próximo passo', placeholder: 'Ex.: mandar portfólio sexta' }] },
    { header: 'Notas', footer: 'Anote só o que você confirmou (no site da marca, no briefing, na conversa).', fields: [{ name: 'notes', label: 'Notas', type: 'textarea', rows: 3, showLabel: false, placeholder: 'Produto, público, valores combinados…' }] },
  ], { status: 'quero', ...b });
  let close;
  close = sheet({
    title: b.id ? b.name : 'Nova marca',
    tall: true,
    body: h('div', { class: 'sheet-stack' }, f.el,
      b.id && group({ children: [h('button', { type: 'button', class: 'cell tappable destructive', onclick: async () => { if (await confirmDelete('esta marca')) { data.remove('brands', b.id); close(); } } }, 'Apagar marca')] })),
    onSave: () => {
      const v = f.read();
      if (!v.name) throw new Error('Coloque o nome da marca.');
      b.id ? data.update('brands', b.id, v) : data.create('brands', v);
      toast('Salvo');
    },
  });
}

export function render(root) {
  const tabs = [{ value: 'resumo', label: 'Resumo' }, { value: 'formatos', label: 'Formatos' }, { value: 'marcas', label: 'Marcas' }];
  root.append(page({
    title: 'Resultados',
    subtitle: 'Seguidores, comunidade e marcas — não só views',
    right: state.tab === 'marcas' ? navButton('', () => editBrand(), { iconName: 'plus', id: 'new-brand' }) : null,
    children: [
      h('div', { class: 'pad-x' }, segmented(tabs, state.tab, (v) => { state.tab = v; rerender(); }, 'Seções')),
      state.tab === 'resumo' ? summary() : state.tab === 'formatos' ? formats() : brands(),
    ],
  }));
}
