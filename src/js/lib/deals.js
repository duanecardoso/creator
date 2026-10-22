// Controle de entregas com marcas: UGC, Publi e TikTok Shop. Funções puras.
import { addDays } from './insights.js';
import { TRAINING_PIPELINE } from './briefs.js';

export const DEAL_TYPES = {
  ugc: { label: 'UGC', emoji: '🎥', color: 'indigo' },
  publi: { label: 'Publi', emoji: '📣', color: 'pink' },
  tts: { label: 'TikTok Shop', emoji: '🛒', color: 'dark' },
  // Briefing de treino: não é campanha de verdade, fica na aba própria e fora do financeiro.
  treino: { label: 'Treino', emoji: '🎯', color: 'orange', hidden: true },
};
// Tipos que aparecem em "Nova campanha", filtros e financeiro.
export const REAL_TYPES = Object.fromEntries(Object.entries(DEAL_TYPES).filter(([, t]) => !t.hidden));
export const isTraining = (d) => d?.type === 'treino';

// Etapas de cada tipo, na ordem.
export const PIPELINES = {
  ugc: [
    ['proposta', 'Proposta'], ['fechado', 'Fechado'], ['produto', 'Produto recebido'], ['roteiro', 'Roteiro'],
    ['gravacao', 'Gravação'], ['entregue', 'Entregue'], ['ajustes', 'Ajustes'], ['aprovado', 'Aprovado'], ['concluido', 'Concluído'],
  ],
  publi: [
    ['proposta', 'Proposta'], ['fechado', 'Fechado'], ['produto', 'Produto recebido'], ['roteiro', 'Roteiro'],
    ['gravacao', 'Gravação'], ['aprovacao', 'Em aprovação'], ['agendado', 'Agendado'], ['publicado', 'Publicado'], ['relatorio', 'Relatório enviado'], ['concluido', 'Concluído'],
  ],
  tts: [
    ['amostra', 'Amostra pedida'], ['recebida', 'Amostra recebida'], ['gravacao', 'Gravação'], ['publicado', 'Publicado'], ['vendendo', 'Vendendo'], ['concluido', 'Concluído'],
  ],
  treino: TRAINING_PIPELINE,
};

export const PAYMENT = { pendente: 'A receber', faturado: 'Faturado', pago: 'Pago', permuta: 'Permuta' };

export const stageLabel = (deal) => (PIPELINES[deal.type] || PIPELINES.ugc).find(([k]) => k === deal.status)?.[1] || 'Cancelado';
export const stageIndex = (deal) => Math.max(0, (PIPELINES[deal.type] || PIPELINES.ugc).findIndex(([k]) => k === deal.status));
export const isDone = (d) => d.status === 'concluido' || d.status === 'cancelado';

const num = (v) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? 0 : Number(v));

// Todos os prazos de todas as campanhas abertas.
export function deadlines(deals) {
  const out = [];
  for (const d of deals) {
    if (d.status === 'cancelado') continue;
    const name = `${isTraining(d) ? 'Treino · ' : ''}${d.brandName || d.title || 'Marca'}`;
    if (!isDone(d)) {
      for (const it of d.deliverables || []) if (it.due && !it.done) out.push({ date: it.due, kind: 'entrega', label: it.text || 'Entregável', deal: d, name });
      if (d.scriptDue && stageIndex(d) <= (PIPELINES[d.type] || []).findIndex(([k]) => k === 'roteiro')) out.push({ date: d.scriptDue, kind: 'roteiro', label: 'Enviar roteiro', deal: d, name });
      if (d.postDate && !['publicado', 'vendendo', 'relatorio', 'concluido', 'postado', 'portfolio'].includes(d.status)) out.push({ date: d.postDate, kind: 'post', label: 'Publicar', deal: d, name });
    }
    if (d.paymentDue && d.paymentStatus !== 'pago' && d.paymentStatus !== 'permuta' && num(d.value) > 0) out.push({ date: d.paymentDue, kind: 'pagamento', label: `Receber R$ ${fmtMoney(num(d.value))}`, deal: d, name });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export function upcoming(deals, today, days = 7) {
  const end = addDays(today, days);
  const all = deadlines(deals);
  return {
    overdue: all.filter((x) => x.date < today),
    today: all.filter((x) => x.date === today),
    soon: all.filter((x) => x.date > today && x.date <= end),
  };
}

// Próximo prazo de uma campanha (para ordenar a lista).
export const nextDeadline = (deal) => deadlines([deal])[0] || null;

export function finance(deals, month, today) {
  const inMonth = (s) => (s || '').startsWith(month);
  const active = deals.filter((d) => d.status !== 'cancelado');
  const paid = active.filter((d) => d.paymentStatus === 'pago');
  const open = active.filter((d) => num(d.value) > 0 && !['pago', 'permuta'].includes(d.paymentStatus || 'pendente'));
  const byType = Object.fromEntries(Object.keys(REAL_TYPES).map((t) => [t, paid.filter((d) => d.type === t && inMonth(d.paidAt)).reduce((a, d) => a + num(d.value), 0)]));
  const tts = active.filter((d) => d.type === 'tts');
  return {
    receivedMonth: paid.filter((d) => inMonth(d.paidAt)).reduce((a, d) => a + num(d.value), 0),
    toReceive: open.reduce((a, d) => a + num(d.value), 0),
    overdue: open.filter((d) => d.paymentDue && d.paymentDue < today).reduce((a, d) => a + num(d.value), 0),
    overdueCount: open.filter((d) => d.paymentDue && d.paymentDue < today).length,
    closedMonth: active.filter((d) => inMonth(d.closedAt)).reduce((a, d) => a + num(d.value), 0),
    byType,
    ttsSales: tts.reduce((a, d) => a + num(d.sales), 0),
    ttsGmv: tts.reduce((a, d) => a + num(d.gmv), 0),
    ttsCommission: tts.reduce((a, d) => a + num(d.commissionEarned), 0),
    noInvoice: paid.filter((d) => !d.invoice && d.type !== 'tts' && num(d.value) > 0).length,
  };
}

export const fmtMoney = (v) => num(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Arquivo .ics para adicionar prazos ao Calendário do iPhone (com lembrete 1 dia antes).
export function toIcs(items, now = new Date()) {
  const esc = (s) => String(s).replace(/[\\,;]/g, (m) => `\\${m}`).replace(/\n/g, '\\n');
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const ev = items.map((x, i) => {
    const d = x.date.replace(/-/g, '');
    const next = addDays(x.date, 1).replace(/-/g, '');
    return [
      'BEGIN:VEVENT',
      `UID:creator-${d}-${i}-${Math.abs(hash(x.label + x.name))}@creator`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${d}`,
      `DTEND;VALUE=DATE:${next}`,
      `SUMMARY:${esc(`${x.name}: ${x.label}`)}`,
      'BEGIN:VALARM', 'TRIGGER:-PT15H', 'ACTION:DISPLAY', `DESCRIPTION:${esc(x.label)}`, 'END:VALARM',
      'END:VEVENT',
    ].join('\r\n');
  });
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Creator//PT-BR', 'CALSCALE:GREGORIAN', ...ev, 'END:VCALENDAR'].join('\r\n');
}
function hash(s) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return h;
}

export function dealsToCsv(deals) {
  const cols = [['brandName', 'Marca'], ['type', 'Tipo'], ['title', 'Campanha'], ['status', 'Etapa'], ['value', 'Valor'], ['paymentStatus', 'Pagamento'], ['paymentDue', 'Vencimento'], ['paidAt', 'Pago em'], ['invoice', 'NF emitida'], ['postDate', 'Publicação'], ['usage', 'Direitos de uso'], ['commissionPct', 'Comissão %'], ['sales', 'Vendas'], ['gmv', 'GMV'], ['commissionEarned', 'Comissão recebida']];
  const cell = (v) => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'boolean' ? (v ? 'sim' : 'não') : String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + [cols.map(([, l]) => l).join(';'), ...deals.map((d) => cols.map(([k]) => cell(k === 'type' ? DEAL_TYPES[d.type]?.label : d[k])).join(';'))].join('\r\n');
}
