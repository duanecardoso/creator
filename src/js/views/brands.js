// Aba Marcas: entregas (UGC, Publi, TikTok Shop), financeiro e contatos de marcas.
import * as data from '../data.js';
import { h, page, group, cell, segmented, chips, sheet, formGroups, toast, confirmDelete, navButton, badge, fmtDay, copyText, emptyNote, actionSheet } from '../ui.js';
import { DEAL_TYPES, PIPELINES, PAYMENT, stageLabel, stageIndex, isDone, deadlines, upcoming, nextDeadline, finance, fmtMoney } from '../lib/deals.js';
import { openContent, today } from './content-sheet.js';

const state = { tab: 'entregas', type: '', month: null };
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

// ---------- Entregas ----------
function dealRow(d) {
  const t = DEAL_TYPES[d.type] || DEAL_TYPES.ugc;
  const nd = nextDeadline(d);
  const td = today();
  const items = d.deliverables || [];
  const done = items.filter((x) => x.done).length;
  return h('button', { type: 'button', class: 'cell tappable deal-row', 'data-id': `deal-${d.id}`, onclick: () => openDeal(d) },
    badge(t.emoji, t.color),
    h('span', { class: 'cell-text' },
      h('span', { class: 'cell-title' }, d.brandName, d.title ? h('span', { class: 'muted' }, ` · ${d.title}`) : null),
      h('span', { class: 'cell-sub' }, `${t.label} · ${stageLabel(d)}`),
      nd && h('span', { class: `deadline${nd.date < td ? ' late' : nd.date === td ? ' today' : ''}` }, `${nd.date < td ? 'Atrasado: ' : nd.date === td ? 'Hoje: ' : ''}${nd.label} · ${fmtDay(nd.date, { day: 'numeric', month: 'short' })}`),
    ),
    items.length > 0 && h('span', { class: 'cell-detail' }, `${done}/${items.length}`),
  );
}

function deliveries() {
  const td = today();
  const all = data.all('deals').filter((d) => !state.type || d.type === state.type);
  const open = all.filter((d) => !isDone(d));
  const up = upcoming(open, td, 7);
  const lateIds = new Set(up.overdue.map((x) => x.deal.id));
  const soonIds = new Set([...up.today, ...up.soon].map((x) => x.deal.id));
  const late = open.filter((d) => lateIds.has(d.id));
  const soon = open.filter((d) => !lateIds.has(d.id) && soonIds.has(d.id));
  const rest = open.filter((d) => !lateIds.has(d.id) && !soonIds.has(d.id));
  const done = all.filter(isDone).slice(-8).reverse();
  const byNext = (a, b) => (nextDeadline(a)?.date || '9').localeCompare(nextDeadline(b)?.date || '9');
  return [
    h('div', { class: 'widgets three' },
      stat('Atrasados', String(late.length), late.length ? 'red' : ''),
      stat('Próx. 7 dias', String(soon.length)),
      stat('Em andamento', String(open.length)),
    ),
    h('div', { class: 'pad-x' }, chips(Object.entries(DEAL_TYPES).map(([value, t]) => ({ value, label: t.label })), state.type, (v) => { state.type = v; rerender(); })),
    !all.length && emptyNote('Nenhuma campanha ainda', 'Toque em + para registrar um UGC, uma publi ou um produto do TikTok Shop.'),
    late.length > 0 && group({ header: 'Atrasados', children: late.sort(byNext).map(dealRow) }),
    soon.length > 0 && group({ header: 'Próximos 7 dias', children: soon.sort(byNext).map(dealRow) }),
    rest.length > 0 && group({ header: 'Em andamento', children: rest.sort(byNext).map(dealRow) }),
    done.length > 0 && group({ header: 'Concluídas e canceladas', children: done.map(dealRow) }),
    all.length > 0 && group({ children: [h('button', { type: 'button', class: 'cell tappable tint', onclick: () => { const evs = deadlines(open); if (!evs.length) return toast('Sem prazos em aberto.', 'error'); data.downloadIcs(evs, 'prazos-marcas'); } }, '📅 Todos os prazos no Calendário')] }),
  ];
}

const stat = (label, value, tone = '') => h('div', { class: `widget stat${tone ? ` tone-${tone}` : ''}` }, h('p', { class: 'w-label' }, label), h('p', { class: 'w-value' }, value));

// ---------- Financeiro ----------
function money2() {
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
  return [
    h('div', { class: 'week-switch' },
      h('button', { type: 'button', class: 'nav-btn', onclick: () => shift(-1), 'aria-label': 'Mês anterior' }, '‹'),
      h('span', { class: 'month-label' }, monthName),
      h('button', { type: 'button', class: 'nav-btn', onclick: () => shift(1), 'aria-label': 'Próximo mês' }, '›')),
    h('div', { class: 'widgets four' },
      stat('Recebido no mês', money(f.receivedMonth)),
      stat('A receber', money(f.toReceive)),
      stat('Atrasado', money(f.overdue), f.overdue ? 'red' : ''),
      stat('Fechado no mês', money(f.closedMonth)),
    ),
    group({ header: 'Recebido no mês por tipo', children: Object.entries(DEAL_TYPES).map(([k, t]) => cell({ emoji: t.emoji, color: t.color, title: t.label, detail: money(f.byType[k]) })) }),
    open.length > 0 && group({ header: 'A receber', children: open.map((d) => cell({ emoji: '💰', color: d.paymentDue && d.paymentDue < td ? 'red' : 'green', title: d.brandName, subtitle: `${DEAL_TYPES[d.type]?.label} · ${d.paymentDue ? `vence ${fmtDay(d.paymentDue, { day: 'numeric', month: 'short' })}` : 'sem vencimento'}`, detail: money(d.value), chevron: true, onClick: () => openDeal(d) })) }),
    paid.length > 0 && group({ header: 'Recebidos', children: paid.map((d) => cell({ emoji: d.invoice ? '🧾' : '⚠️', color: d.invoice ? 'green' : 'orange', title: d.brandName, subtitle: d.invoice ? 'NF emitida' : 'NF não emitida', detail: money(d.value), chevron: true, onClick: () => openDeal(d) })) }),
    group({ header: 'TikTok Shop (total)', footer: 'Números que você anotou em cada produto.', children: [
      cell({ title: 'Vendas', detail: String(f.ttsSales) }),
      cell({ title: 'GMV', detail: money(f.ttsGmv) }),
      cell({ title: 'Comissões recebidas', detail: money(f.ttsCommission) }),
    ] }),
    f.noInvoice > 0 && h('p', { class: 'data-note' }, `⚠️ ${f.noInvoice} pagamento(s) recebido(s) sem nota fiscal marcada.`),
    group({ children: [h('button', { type: 'button', class: 'cell tappable tint', onclick: () => data.exportDealsCsv() }, '📄 Exportar planilha de campanhas (CSV)')] }),
  ];
}

// ---------- Marcas (contatos) ----------
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

function contacts() {
  const list = data.all('brands');
  const portfolio = data.all('contents').filter((c) => c.portfolio);
  return [
    list.length
      ? BRAND_STATUS.map((s) => {
        const items = list.filter((b) => (b.status || 'quero') === s.value);
        return items.length ? group({ header: s.label, children: items.map((b) => cell({ emoji: s.emoji, color: s.color, title: b.name, subtitle: b.next || b.notes || '', chevron: true, onClick: () => editBrand(b) })) }) : null;
      })
      : emptyNote('Nenhuma marca na lista', 'Anote marcas com quem quer trabalhar: quero → contatei → conversando.'),
    group({ children: [cell({ emoji: '➕', color: 'gray', title: 'Adicionar marca', chevron: true, onClick: () => editBrand(), id: 'new-brand' })] }),
    group({
      header: `Portfólio UGC (${portfolio.length})`,
      footer: 'Ative "Usar no portfólio UGC" num conteúdo para ele entrar aqui. Copie a lista e mande para marcas.',
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

export function render(root) {
  const tabs = [{ value: 'entregas', label: 'Entregas' }, { value: 'financeiro', label: 'Financeiro' }, { value: 'marcas', label: 'Contatos' }];
  root.append(page({
    title: 'Marcas',
    subtitle: 'UGC, publis e TikTok Shop',
    right: navButton('', async () => {
      const t = await actionSheet({ title: 'Nova campanha', actions: Object.entries(DEAL_TYPES).map(([value, t]) => ({ label: `${t.emoji} ${t.label}`, value, id: `new-${value}` })) });
      if (t) newDeal(t);
    }, { iconName: 'plus', id: 'new-deal' }),
    children: [
      h('div', { class: 'pad-x' }, segmented(tabs, state.tab, (v) => { state.tab = v; rerender(); }, 'Seções')),
      state.tab === 'entregas' ? deliveries() : state.tab === 'financeiro' ? money2() : contacts(),
    ],
  }));
}
