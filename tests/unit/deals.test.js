import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deadlines, upcoming, finance, toIcs, stageLabel, PIPELINES, nextDeadline, dealsToCsv } from '../../src/js/lib/deals.js';

const T = '2026-10-21';
const ugc = { id: 'u', type: 'ugc', brandName: 'Glow', status: 'gravacao', value: 800, paymentStatus: 'pendente', paymentDue: '2026-10-15', closedAt: '2026-10-02',
  deliverables: [{ text: '2 vídeos 30s', due: '2026-10-20', done: false }, { text: '3 ganchos', due: '2026-10-25', done: true }] };
const publi = { id: 'p', type: 'publi', brandName: 'Fit', status: 'roteiro', scriptDue: '2026-10-22', postDate: '2026-10-28', value: 1500, paymentStatus: 'pago', paidAt: '2026-10-05', invoice: false, closedAt: '2026-10-01' };
const tts = { id: 't', type: 'tts', brandName: 'Shop', status: 'publicado', sales: 12, gmv: 960, commissionEarned: 96, commissionPct: 10 };

test('cada tipo tem suas etapas', () => {
  assert.ok(PIPELINES.ugc.some(([k]) => k === 'entregue'));
  assert.ok(PIPELINES.publi.some(([k]) => k === 'publicado'));
  assert.ok(PIPELINES.tts.some(([k]) => k === 'vendendo'));
  assert.equal(stageLabel(ugc), 'Gravação');
});

test('prazos: entregáveis pendentes, roteiro, publicação e pagamento', () => {
  const d = deadlines([ugc, publi, tts]);
  const kinds = d.map((x) => `${x.deal.id}:${x.kind}:${x.date}`);
  assert.ok(kinds.includes('u:entrega:2026-10-20'));
  assert.ok(!kinds.includes('u:entrega:2026-10-25'), 'feito não aparece');
  assert.ok(kinds.includes('u:pagamento:2026-10-15'));
  assert.ok(kinds.includes('p:roteiro:2026-10-22'));
  assert.ok(kinds.includes('p:post:2026-10-28'));
  assert.ok(!kinds.some((k) => k.startsWith('p:pagamento')), 'pago não cobra');
  assert.equal(nextDeadline(ugc).date, '2026-10-15');
});

test('atrasados, hoje e próximos', () => {
  const u = upcoming([ugc, publi], T, 7);
  assert.equal(u.overdue.length, 2);
  assert.equal(u.soon.map((x) => x.kind).join(), 'roteiro,post');
});

test('financeiro do mês', () => {
  const f = finance([ugc, publi, tts], '2026-10', T);
  assert.equal(f.receivedMonth, 1500);
  assert.equal(f.toReceive, 800);
  assert.equal(f.overdue, 800);
  assert.equal(f.closedMonth, 2300);
  assert.equal(f.byType.publi, 1500);
  assert.equal(f.ttsGmv, 960);
  assert.equal(f.ttsCommission, 96);
  assert.equal(f.noInvoice, 1, 'publi paga sem NF');
});

test('cancelado não gera prazo nem cobrança', () => {
  assert.equal(deadlines([{ ...ugc, status: 'cancelado' }]).length, 0);
});

test('calendário .ics com lembrete', () => {
  const ics = toIcs(deadlines([ugc]));
  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /DTSTART;VALUE=DATE:20261020/);
  assert.match(ics, /SUMMARY:Glow: 2 vídeos 30s/);
  assert.match(ics, /BEGIN:VALARM/);
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 2);
});

test('CSV de campanhas', () => {
  const csv = dealsToCsv([publi]);
  assert.ok(csv.includes('Publi') && csv.includes('1500') && csv.includes('não'));
});
