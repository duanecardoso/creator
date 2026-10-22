// Marcas: Campanhas (UGC, Publi, TikTok Shop), Financeiro e Contatos. Também exporta o editor de campanha.
import * as data from '../data.js';
import { h, page, group, cell, segmented, chips, sheet, formGroups, toast, confirmDelete, badge, fmtDay, copyText, emptyNote, actionSheet, btn, card, kpi, table, tabs, tag, searchBox, filterSelect, barChart, norm } from '../ui.js';
import { DEAL_TYPES, PIPELINES, PAYMENT, stageLabel, stageIndex, isDone, deadlines, upcoming, nextDeadline, finance, fmtMoney } from '../lib/deals.js';
import { openContent, today } from './content-sheet.js';

const state = { show: 'abertas', type: '', stage: '', q: '', month: null, brandStatus: '' };
const rerender = () => document.dispatchEvent(new Event('rerender'));
const money = (v) => `R$ ${fmtMoney(v)}`;

export const BRAND_STATUS = [
  { value: 'quero', label: 'Quero trabalhar', emoji: '💭', color: 'gray' },
  { value: 'contatei', label: 'Contatei', emoji: '📨', color: 'blue' },
  { value: 'conversando', label: 'Conversando', emoji: '💬', color: 'orange' },
  { value: 'fechado', label: 'Já trabalhamos', emoji: '🤝', color: 'green' },
];

// ---------- Editor de campanha ----------
export function newDeal(type = 'ugc') {
  openDeal({ type, status: PIPELINES[type][0][0], paymentStatus: 'pendente', deliverables: type === 'tts' ? [{ text: 'Vídeo com link do produto', due: '', done: false }] : [{ text: '', due: '', done: false }] });
}

export function openDeal(d) {
  const isNew = !d.id;
  let type = d.type || 'ugc';
  let status = d.status || PIPELINES[type][0][0];
  let deliverables = structuredClone(d.deliverables || []);

  const typeSeg = h('div', { class: 'pad-x' });
  const stageBox = h('div', { class: 'stage-scroll', role: 'radiogroup', 'aria-label': 'Etapa' });
  const delivBox = h('div');
  const conditional = h('div');

  const drawType = () => typeSeg.replaceChildren(segmentedRaw(Object.entries(DEAL_TYPES).map(([value, t]) => ({ value, label: t.label })), type, (v) => {
    type = v;
    if (!PIPELINES[type].some(([k]) => k === status)) status = PIPELINES[type][0][0];
    drawType();
    drawStages();
    drawConditional();
  }));
  const drawStages = () => stageBox.replaceChildren(...PIPELINES[type].map(([k, label], i) => h('button', {
    type: 'button', role: 'radio', 'aria-checked': String(k === status), 'data-stage': k,
    class: `stage${k === status ? ' on' : ''}${i < PIPELINES[type].findIndex(([x]) => x === status) ? ' done' : ''}`,
    onclick: () => { status = k; drawStages(); },
  }, label)));
  const drawDeliverables = () => delivBox.replaceChildren(group({
    header: 'Entregáveis',
    footer: 'Cada item com prazo aparece no Hoje e na Semana.',
    children: [
      ...deliverables.map((it, i) => {
        const cb = h('input', { type: 'checkbox', class: 'round-check', checked: Boolean(it.done), 'aria-label': 'Feito' });
        cb.addEventListener('change', () => { it.done = cb.checked; it.doneAt = cb.checked ? today() : null; });
        const tx = h('input', { type: 'text', value: it.text || '', placeholder: 'Ex.: 2 vídeos de 30s + 3 ganchos', 'aria-label': 'Entregável', 'data-deliv': i });
        tx.addEventListener('input', () => (it.text = tx.value));
        const due = h('input', { type: 'date', value: it.due || '', 'aria-label': 'Prazo' });
        due.addEventListener('change', () => (it.due = due.value));
        return h('div', { class: 'cell deliv-row' }, cb, h('div', { class: 'deliv-fields' }, tx, due),
          h('button', { type: 'button', class: 'icon-x', 'aria-label': 'Remover', onclick: () => { deliverables.splice(i, 1); drawDeliverables(); } }, '×'));
      }),
      h('button', { type: 'button', class: 'cell tappable link-cell', 'data-id': 'add-deliverable', onclick: () => { deliverables.push({ text: '', due: '', done: false }); drawDeliverables(); } }, '+ Entregável'),
    ],
  }));

  const main = formGroups([
    { fields: [
      { name: 'brandName', label: 'Marca', placeholder: 'Nome da marca' },
      { name: 'title', label: 'Campanha', placeholder: 'Ex.: lançamento sérum' },
    ] },
  ], d);
  let cond = null;
  const drawConditional = () => {
    const sections = [
      { header: 'Prazos', fields: [
        { name: 'scriptDue', label: 'Roteiro até', type: 'date' },
        ...(type !== 'ugc' ? [{ name: 'postDate', label: 'Publicação', type: 'date' }] : []),
      ] },
      { header: 'Produto', fields: [{ name: 'product', label: 'Produto' }, { name: 'productReceivedAt', label: type === 'tts' ? 'Amostra recebida' : 'Recebido em', type: 'date' }] },
    ];
    if (type === 'tts') {
      sections.push({ header: 'TikTok Shop', footer: 'Anote os números que aparecem no painel de afiliado. Vazio = ainda não sei.', fields: [
        { name: 'productLink', label: 'Link do produto', type: 'url', placeholder: 'https://' },
        { name: 'commissionPct', label: 'Comissão (%)', type: 'number' },
        { name: 'sales', label: 'Vendas', type: 'number' },
        { name: 'gmv', label: 'GMV (R$)', type: 'number' },
        { name: 'commissionEarned', label: 'Comissão recebida (R$)', type: 'number' },
        { name: 'value', label: 'Cachê fixo (R$, se houver)', type: 'number' },
      ] });
    } else {
      sections.push({ header: 'Pagamento', fields: [
        { name: 'value', label: 'Valor (R$)', type: 'number' },
        { name: 'paymentStatus', label: 'Status', type: 'select', options: Object.entries(PAYMENT).map(([value, label]) => ({ value, label })), placeholder: false },
        { name: 'paymentDue', label: 'Vencimento', type: 'date' },
        { name: 'paidAt', label: 'Pago em', type: 'date' },
        { name: 'invoice', label: 'Nota fiscal emitida', type: 'toggle' },
      ] });
      sections.push({ header: 'Combinados', fields: [
        { name: 'usage', label: 'Direitos de uso', placeholder: 'Ex.: 3 meses, anúncios pagos' },
        { name: 'exclusivity', label: 'Exclusividade', placeholder: 'Ex.: 30 dias, categoria' },
        { name: 'revisionsIncluded', label: 'Revisões incluídas', type: 'number' },
        { name: 'revisionsUsed', label: 'Revisões usadas', type: 'number' },
      ] });
    }
    sections.push({ header: 'Contato e links', fields: [
      { name: 'contact', label: 'Contato', placeholder: 'Nome · WhatsApp · e-mail' },
      { name: 'briefingLink', label: 'Briefing', type: 'url', placeholder: 'https://' },
      { name: 'deliveryLink', label: 'Pasta de entrega', type: 'url', placeholder: 'https://' },
      ...(type !== 'ugc' ? [{ name: 'postLink', label: 'Link do post', type: 'url', placeholder: 'https://' }] : []),
    ] });
    sections.push({ header: 'Notas', fields: [{ name: 'notes', label: 'Notas', type: 'textarea', rows: 3, showLabel: false, placeholder: 'Pontos obrigatórios, o que evitar, feedbacks…' }] });
    const prev = cond?.read() || {};
    cond = formGroups(sections, { paymentStatus: 'pendente', ...d, ...prev });
    conditional.replaceChildren(cond.el);
  };
  drawType();
  drawStages();
  drawDeliverables();
  drawConditional();

  const read = () => {
    const v = { ...main.read(), ...cond.read(), type, status, deliverables: deliverables.filter((x) => x.text || x.due) };
    if (!v.brandName) throw new Error('Coloque o nome da marca.');
    if (stageIndex(v) >= 1 && !d.closedAt) v.closedAt = today();
    if (v.paymentStatus === 'pago' && !v.paidAt) v.paidAt = today();
    if (type === 'tts' && v.commissionEarned > 0 && !v.paidAt) v.paidAt = today();
    return v;
  };

  let close;
  close = sheet({
    title: isNew ? 'Nova campanha' : d.brandName || 'Campanha',
    tall: true,
    onSave: () => {
      const v = read();
      isNew ? data.create('deals', v) : data.update('deals', d.id, v);
      toast('Salvo');
    },
    body: h('div', { class: 'sheet-stack' },
      typeSeg,
      main.el,
      h('p', { class: 'group-header pad-x' }, 'Etapa'),
      stageBox,
      delivBox,
      conditional,
      !isNew && group({ children: [
        h('button', { type: 'button', class: 'cell tappable tint', 'data-id': 'deal-ics', onclick: () => { const evs = deadlines([{ ...d, ...read() }]); if (!evs.length) return toast('Sem prazos para adicionar.', 'error'); data.downloadIcs(evs, `prazos-${(d.brandName || 'marca').toLowerCase()}`); } }, '📅 Prazos no Calendário'),
        (type !== 'ugc') && h('button', { type: 'button', class: 'cell tappable tint', onclick: () => {
          const v = read();
          if (!v.postDate) return toast('Defina a data de publicação.', 'error');
          data.update('deals', d.id, v);
          const exists = data.all('contents').find((c) => c.dealId === d.id);
          if (exists) return openContent(exists);
          const c = data.create('contents', { title: `${type === 'tts' ? 'TikTok Shop' : 'Publi'}: ${v.brandName}`, date: v.postDate, type: 'video', goal: 'marcas', dealId: d.id, status: 'roteiro', theme: v.product || '', platforms: type === 'tts' ? ['tiktok'] : ['instagram'], steps: ['Conferir briefing e pontos obrigatórios', 'Gravar seguindo o roteiro aprovado', 'Postar com a marcação/link combinados'] });
          close();
          setTimeout(() => openContent(c), 260);
        } }, '🗓️ Colocar o post na agenda'),
        h('button', { type: 'button', class: 'cell tappable destructive', onclick: async () => {
          const r = await actionSheet({ actions: [{ label: 'Cancelar campanha', value: 'cancel', destructive: true }, { label: 'Apagar de vez', value: 'delete', destructive: true, id: 'deal-delete' }] });
          if (r === 'cancel') { data.update('deals', d.id, { status: 'cancelado' }); close(); }
          if (r === 'delete' && (await confirmDelete('esta campanha'))) { data.remove('deals', d.id); close(); }
        } }, 'Cancelar ou apagar'),
      ] }),
    ),
  });
}

// Controle segmentado simples (sem rerender global)
function segmentedRaw(options, value, onChange) {
  return segmented(options, value, onChange, 'Tipo');
}

// ---------- Campanhas ----------
const stageOptions = () => {
  const seen = new Map();
  for (const list of Object.values(PIPELINES)) for (const [k, l] of list) if (!seen.has(k)) seen.set(k, l);
  return [...seen].map(([value, label]) => ({ value, label }));
};

async function chooseNewDeal() {
  const t = await actionSheet({ title: 'Nova campanha', message: 'Qual tipo?', actions: Object.entries(DEAL_TYPES).map(([value, t]) => ({ label: `${t.emoji} ${t.label}`, value, id: `new-${value}` })) });
  if (t) newDeal(t);
}

function campaignsTable(list, td) {
  return table({
    caption: 'Campanhas',
    rows: list,
    rowId: (d) => `deal-${d.id}`,
    rowCls: (d) => ((nextDeadline(d)?.date || '9') < td && !isDone(d) ? 'is-late' : ''),
    onRowClick: (d) => openDeal(d),
    empty: 'Nenhuma campanha com esses filtros.',
    columns: [
      { label: 'Marca', main: true, render: (d) => h('div', { class: 'td-flex' }, badge(DEAL_TYPES[d.type]?.emoji, DEAL_TYPES[d.type]?.color), h('div', {}, h('div', { class: 'td-title' }, d.brandName), d.title && h('div', { class: 'td-sub' }, d.title))) },
      { label: 'Tipo', render: (d) => tag(DEAL_TYPES[d.type]?.label, d.type === 'publi' ? 't-pink' : d.type === 'tts' ? 't-butter' : 't-brown') },
      { label: 'Etapa', render: (d) => (d.status === 'cancelado' ? tag('Cancelado') : isDone(d) ? tag('Concluído', 'ok') : h('span', {}, stageLabel(d))) },
      { label: 'Próximo prazo', render: (d) => {
        const nd = nextDeadline(d);
        if (!nd) return h('span', { class: 'subtle' }, '—');
        return h('span', { class: `deadline${nd.date < td ? ' late' : nd.date === td ? ' today' : ''}` }, `${nd.date < td ? 'Atrasado · ' : nd.date === td ? 'Hoje · ' : ''}${nd.label} · ${fmtDay(nd.date, { day: 'numeric', month: 'short' })}`);
      } },
      { label: 'Entregáveis', render: (d) => {
        const items = d.deliverables || [];
        if (!items.length) return h('span', { class: 'subtle' }, '—');
        const done = items.filter((x) => x.done).length;
        return h('span', { class: 'bar-cell' }, h('span', { class: 'meter mini' }, h('span', { style: { width: `${Math.round((done / items.length) * 100)}%` } })), h('span', { class: 'num small' }, `${done}/${items.length}`));
      } },
      { label: 'Valor', cls: 'right', render: (d) => (Number(d.value) > 0 ? h('span', { class: 'num' }, money(d.value)) : d.type === 'tts' && d.commissionPct ? h('span', { class: 'subtle' }, `${d.commissionPct}% comissão`) : h('span', { class: 'subtle' }, '—')) },
      { label: 'Pagamento', render: (d) => (Number(d.value) > 0 ? tag(PAYMENT[d.paymentStatus || 'pendente'], d.paymentStatus === 'pago' ? 'ok' : d.paymentDue && d.paymentDue < td ? 'danger' : 'warn') : h('span', { class: 'subtle' }, '—')) },
    ],
  });
}

export function renderCampaigns(root) {
  const td = today();
  const all = data.all('deals');
  const open = all.filter((d) => !isDone(d));
  const up = upcoming(open, td, 7);
  const lateIds = new Set(up.overdue.map((x) => x.deal.id));
  const soonIds = new Set([...up.today, ...up.soon].map((x) => x.deal.id));
  const fin = finance(all, td.slice(0, 7), td);
  const list = all
    .filter((d) => !state.type || d.type === state.type)
    .filter((d) => (state.show === 'abertas' ? !isDone(d) : state.show === 'concluidas' ? isDone(d) : true))
    .filter((d) => !state.stage || d.status === state.stage)
    .filter((d) => !state.q || norm([d.brandName, d.title, d.product, d.notes].join(' ')).includes(norm(state.q)))
    .sort((a, b) => (isDone(a) - isDone(b)) || (nextDeadline(a)?.date || '9').localeCompare(nextDeadline(b)?.date || '9'));
  root.append(page({
    kicker: 'Marcas',
    title: 'Campanhas',
    subtitle: 'UGC, publis e TikTok Shop: etapas, entregáveis, prazos e pagamentos.',
    actions: [
      btn('Prazos no Calendário', () => { const evs = deadlines(open); if (!evs.length) return toast('Sem prazos em aberto.', 'error'); data.downloadIcs(evs, 'prazos-marcas'); }, { iconName: 'calendar', kind: 'ghost', id: 'all-ics' }),
      btn('Nova campanha', chooseNewDeal, { kind: 'primary', iconName: 'plus', id: 'new-deal' }),
    ],
    children: [
      h('div', { class: 'grid cols-4 kpis' },
        kpi({ label: 'Atrasados', value: String(lateIds.size), tone: lateIds.size ? 'danger' : '', hint: 'campanhas com prazo vencido' }),
        kpi({ label: 'Próximos 7 dias', value: String([...soonIds].filter((id) => !lateIds.has(id)).length), hint: 'campanhas com prazo chegando' }),
        kpi({ label: 'Em andamento', value: String(open.length), hint: Object.entries(DEAL_TYPES).map(([k, t]) => `${open.filter((d) => d.type === k).length} ${t.label}`).join(' · ') }),
        kpi({ label: 'A receber', value: money(fin.toReceive), tone: fin.overdue ? 'danger' : '', hint: fin.overdue ? `${money(fin.overdue)} atrasado` : 'nada atrasado' }),
      ),
      h('div', { class: 'section' },
        tabs([{ value: 'abertas', label: 'Em aberto' }, { value: 'concluidas', label: 'Concluídas' }, { value: 'todas', label: 'Todas' }], state.show, (v) => { state.show = v; rerender(); }, 'Mostrar'),
        h('div', { class: 'filters' },
          searchBox(state.q, (v) => { state.q = v; rerender(); }, 'Buscar marca ou campanha'),
          filterSelect('Tipo', Object.entries(DEAL_TYPES).map(([value, t]) => ({ value, label: t.label })), state.type, (v) => { state.type = v; rerender(); }),
          filterSelect('Etapa', stageOptions(), state.stage, (v) => { state.stage = v; rerender(); })),
        !all.length
          ? emptyNote('Nenhuma campanha ainda', 'Registre um UGC, uma publi ou um produto do TikTok Shop para acompanhar prazos e pagamentos.', btn('Nova campanha', chooseNewDeal, { kind: 'primary' }))
          : card({ flush: true, children: campaignsTable(list, td) })),
    ],
  }));
}

// ---------- Financeiro ----------
export function renderFinance(root) {
  const td = today();
  state.month ||= td.slice(0, 7);
  const deals = data.all('deals');
  const f = finance(deals, state.month, td);
  const [y, m] = state.month.split('-').map(Number);
  const shift = (n) => {
    const d = new Date(y, m - 1 + n, 1);
    state.month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    rerender();
  };
  const monthRaw = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const monthName = monthRaw.charAt(0).toUpperCase() + monthRaw.slice(1);
  const open = deals.filter((d) => d.status !== 'cancelado' && Number(d.value) > 0 && !['pago', 'permuta'].includes(d.paymentStatus || 'pendente')).sort((a, b) => (a.paymentDue || '9').localeCompare(b.paymentDue || '9'));
  const paid = deals.filter((d) => d.paymentStatus === 'pago' && (d.paidAt || '').startsWith(state.month));
  // Recebido por mês (6 meses até o mês selecionado)
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(y, m - 1 - (5 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const chart = barChart({
    label: 'Recebido por mês',
    fmt: (v) => (v >= 1000 ? `R$ ${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : `R$ ${Math.round(v)}`),
    data: months.map((mm, i) => {
      const [yy, mo] = mm.split('-').map(Number);
      const lbl = new Date(yy, mo - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
      return { label: lbl, tip: new Date(yy, mo - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }), value: finance(deals, mm, td).receivedMonth, hl: i === months.length - 1 };
    }),
  });
  root.append(page({
    kicker: 'Marcas',
    title: 'Financeiro',
    subtitle: 'O que entrou, o que falta receber e as comissões do TikTok Shop.',
    actions: [
      h('div', { class: 'btn-group' }, btn('', () => shift(-1), { iconName: 'back', title: 'Mês anterior' }), h('span', { class: 'btn month-label', 'aria-live': 'polite' }, monthName), btn('', () => shift(1), { iconName: 'chevron', title: 'Próximo mês' })),
      btn('Exportar CSV', () => data.exportDealsCsv(), { iconName: 'download', kind: 'ghost' }),
    ],
    children: [
      h('div', { class: 'grid cols-4 kpis' },
        kpi({ label: 'Recebido no mês', value: money(f.receivedMonth), id: 'kpi-received' }),
        kpi({ label: 'A receber', value: money(f.toReceive), hint: `${open.length} pagamento(s) em aberto`, id: 'kpi-to-receive' }),
        kpi({ label: 'Atrasado', value: money(f.overdue), tone: f.overdue ? 'danger' : '', hint: f.overdueCount ? `${f.overdueCount} vencido(s)` : 'nada vencido' }),
        kpi({ label: 'Fechado no mês', value: money(f.closedMonth), hint: 'valor das campanhas fechadas' }),
      ),
      f.noInvoice > 0 && h('p', { class: 'data-note warn-note' }, `⚠️ ${f.noInvoice} pagamento(s) recebido(s) sem nota fiscal marcada.`),
      h('div', { class: 'grid cols-main section' },
        h('div', { class: 'stack' },
          card({ title: 'Recebido por mês', subtitle: 'Últimos 6 meses', children: chart }),
          card({ title: 'A receber', flush: true, children: table({
            caption: 'A receber', rows: open, onRowClick: (d) => openDeal(d), empty: 'Nada a receber.',
            columns: [
              { label: 'Marca', main: true, render: (d) => h('span', { class: 'td-title' }, d.brandName) },
              { label: 'Tipo', render: (d) => DEAL_TYPES[d.type]?.label },
              { label: 'Vencimento', render: (d) => (d.paymentDue ? h('span', { class: d.paymentDue < td ? 'deadline late' : '' }, fmtDay(d.paymentDue, { day: 'numeric', month: 'short' })) : h('span', { class: 'subtle' }, 'sem data')) },
              { label: 'Valor', cls: 'right', render: (d) => h('span', { class: 'num' }, money(d.value)) },
            ],
          }) }),
          card({ title: `Recebidos em ${monthName.toLowerCase()}`, flush: true, children: table({
            caption: 'Recebidos', rows: paid, onRowClick: (d) => openDeal(d), empty: 'Nenhum pagamento recebido neste mês.',
            columns: [
              { label: 'Marca', main: true, render: (d) => h('span', { class: 'td-title' }, d.brandName) },
              { label: 'Pago em', render: (d) => fmtDay(d.paidAt, { day: 'numeric', month: 'short' }) },
              { label: 'Nota fiscal', render: (d) => (d.invoice ? tag('Emitida', 'ok') : tag('Não emitida', 'warn')) },
              { label: 'Valor', cls: 'right', render: (d) => h('span', { class: 'num' }, money(d.value)) },
            ],
          }) }),
        ),
        h('div', { class: 'stack' },
          card({ title: 'Recebido no mês por tipo', flush: true, children: group({ children: Object.entries(DEAL_TYPES).map(([k, t]) => cell({ emoji: t.emoji, color: t.color, title: t.label, detail: money(f.byType[k]) })) }) }),
          card({ title: 'TikTok Shop', subtitle: 'Total anotado em todos os produtos', flush: true, children: group({ children: [
            cell({ title: 'Vendas', detail: String(f.ttsSales) }),
            cell({ title: 'GMV', detail: money(f.ttsGmv) }),
            cell({ title: 'Comissões recebidas', detail: money(f.ttsCommission) }),
          ] }) }),
        ),
      ),
    ],
  }));
}

// ---------- Contatos ----------
export function editBrand(b = {}) {
  const f = formGroups([
    { fields: [{ name: 'name', label: 'Marca', placeholder: 'Nome' }, { name: 'handle', label: '@ ou site', placeholder: '@marca' }, { name: 'status', label: 'Etapa', type: 'select', options: BRAND_STATUS, placeholder: false }] },
    { header: 'Próximo passo', fields: [{ name: 'next', label: 'Próximo passo', placeholder: 'Ex.: mandar portfólio sexta' }] },
    { header: 'Notas', footer: 'Só o que você confirmou (site da marca, conversa, briefing).', fields: [{ name: 'notes', label: 'Notas', type: 'textarea', rows: 3, showLabel: false }] },
  ], { status: 'quero', ...b });
  let close;
  close = sheet({
    title: b.id ? b.name : 'Nova marca',
    tall: true,
    body: h('div', { class: 'sheet-stack' }, f.el,
      b.id && group({ children: [
        h('button', { type: 'button', class: 'cell tappable tint', onclick: () => { close(); setTimeout(() => openDeal({ brandName: b.name, type: 'ugc', status: 'proposta', paymentStatus: 'pendente', deliverables: [] }), 260); } }, '+ Nova campanha com esta marca'),
        h('button', { type: 'button', class: 'cell tappable destructive', onclick: async () => { if (await confirmDelete('esta marca')) { data.remove('brands', b.id); close(); } } }, 'Apagar marca'),
      ] })),
    onSave: () => {
      const v = f.read();
      if (!v.name) throw new Error('Coloque o nome da marca.');
      b.id ? data.update('brands', b.id, v) : data.create('brands', v);
      toast('Salvo');
    },
  });
}

export function renderContacts(root) {
  const list = data.all('brands').filter((b) => !state.brandStatus || (b.status || 'quero') === state.brandStatus);
  const portfolio = data.all('contents').filter((c) => c.portfolio);
  const deals = data.all('deals');
  root.append(page({
    kicker: 'Marcas',
    title: 'Contatos',
    subtitle: 'Marcas com quem você quer trabalhar ou já trabalhou, e seu portfólio UGC.',
    actions: btn('Adicionar marca', () => editBrand(), { kind: 'primary', iconName: 'plus', id: 'new-brand' }),
    children: h('div', { class: 'grid cols-main' },
      h('div', { class: 'stack' },
        h('div', { class: 'filters' }, chips(BRAND_STATUS.map((s) => ({ value: s.value, label: s.label })), state.brandStatus, (v) => { state.brandStatus = v; rerender(); })),
        card({ flush: true, children: table({
          caption: 'Marcas', rows: list, rowId: (b) => `brand-${b.id}`, onRowClick: (b) => editBrand(b),
          empty: 'Nenhuma marca na lista. Anote marcas com quem quer trabalhar: quero → contatei → conversando.',
          columns: [
            { label: 'Marca', main: true, render: (b) => h('div', {}, h('div', { class: 'td-title' }, b.name), b.handle && h('div', { class: 'td-sub' }, b.handle)) },
            { label: 'Etapa', render: (b) => { const s = BRAND_STATUS.find((x) => x.value === (b.status || 'quero')); return tag(s?.label, s?.value === 'fechado' ? 'ok' : s?.value === 'conversando' ? 't-butter' : s?.value === 'contatei' ? 'info' : ''); } },
            { label: 'Próximo passo', render: (b) => h('span', { class: 'clamp-2' }, b.next || '—') },
            { label: 'Campanhas', cls: 'right', render: (b) => h('span', { class: 'num' }, String(deals.filter((d) => norm(d.brandName) === norm(b.name)).length)) },
          ],
        }) }),
      ),
      card({
        title: `Portfólio UGC (${portfolio.length})`, subtitle: 'Conteúdos marcados para portfólio', flush: true,
        actions: portfolio.length > 0 && btn('Copiar links', async () => {
          const text = portfolio.map((c) => `• ${c.title}${c.link ? ` — ${c.link}` : ''}`).join('\n');
          toast((await copyText(text)) ? 'Lista copiada' : 'Não consegui copiar', 'ok');
        }, { small: true, iconName: 'link' }),
        children: portfolio.length
          ? group({ children: portfolio.map((c) => cell({ emoji: '🎬', color: 'indigo', title: c.title, subtitle: c.link || 'sem link ainda', chevron: true, onClick: () => openContent(c) })) })
          : emptyNote('Nenhum conteúdo no portfólio', 'Ative "Usar no portfólio UGC" ao editar um conteúdo.'),
      }),
    ),
  }));
}

export const render = renderCampaigns;
