import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weekProgress, streak, hits, byFormat, suggestions, needsResults, weekStart, addDays, scores } from '../../src/js/lib/insights.js';
import { FORMATS } from '../../src/js/lib/formats.js';

const T = '2026-10-21'; // quarta-feira
const posted = (date, extra = {}) => ({ id: `${date}-${Math.random()}`, status: 'postado', date, postedAt: date, ...extra });

test('semana começa na segunda', () => {
  assert.equal(weekStart(T), '2026-10-19');
  assert.equal(weekStart('2026-10-25'), '2026-10-19');
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
});

test('progresso da semana', () => {
  const c = [posted('2026-10-19'), posted('2026-10-20'), { status: 'ideia', date: '2026-10-23' }, posted('2026-10-12')];
  assert.deepEqual({ ...weekProgress(c, T, 4), start: 0, end: 0 }, { posted: 2, planned: 1, goal: 4, start: 0, end: 0 });
});

test('sequência de semanas batendo a meta', () => {
  const c = [posted('2026-10-05'), posted('2026-10-06'), posted('2026-10-13'), posted('2026-10-14'), posted('2026-10-19')];
  assert.equal(streak(c, T, 2), 2, 'semana atual (1 post) ainda não conta; as 2 anteriores contam');
  c.push(posted('2026-10-21'));
  assert.equal(streak(c, T, 2), 3);
  assert.equal(streak([], T, 2), 0);
});

test('vazio não vira zero nos indicadores', () => {
  const s = scores({ results: { views: 1000, saves: 10 } });
  assert.equal(s.value, 10);
  assert.equal(s.follows, null);
});

test('hits só com 5+ posts medidos (exceto contato de marca)', () => {
  const few = [posted(T, { results: { views: 100, brandContacts: 1 } }), posted(T, { results: { views: 100 } })];
  const r = hits(few);
  assert.equal(r.enough, false);
  assert.equal(r.items.length, 1);
  const many = [1, 2, 3, 4].map(() => posted(T, { results: { views: 1000, follows: 2 } }));
  many.push(posted(T, { title: 'bombou', results: { views: 1000, follows: 20 } }));
  const r2 = hits(many);
  assert.equal(r2.enough, true);
  assert.equal(r2.items[0].content.title, 'bombou');
  assert.ok(r2.items[0].reasons.includes('trouxe mais seguidores'));
});

test('por formato', () => {
  const c = [posted(T, { formatId: 'review-honesto', results: { views: 1000, follows: 5 } }), posted(T, { formatId: 'review-honesto', results: { views: 2000, follows: 5 } })];
  const r = byFormat(c);
  assert.equal(r[0].format.name, 'Review honesto');
  assert.equal(r[0].count, 2);
  assert.equal(r[0].confidence.level, 0);
});

test('sugestões: estáveis no dia, formatos diferentes, evitam os recentes', () => {
  const a = suggestions([], T);
  const b = suggestions([], T);
  assert.equal(a.length, 3);
  assert.deepEqual(a.map((x) => x.format.id), b.map((x) => x.format.id));
  assert.equal(new Set(a.map((x) => x.format.id)).size, 3);
  const used = a[0].format.id;
  const c = suggestions([{ status: 'postado', date: addDays(T, -2), formatId: used }], T);
  assert.ok(!c.some((x) => x.format.id === used && x.goal === a[0].goal) || FORMATS.filter((f) => f.goals.includes(a[0].goal)).length === 1);
});

test('posts sem resultado', () => {
  const c = [posted('2026-10-20'), posted(T), posted('2026-10-19', { results: { views: 1 } })];
  assert.equal(needsResults(c, T).length, 1);
});

test('biblioteca de formatos é consistente', () => {
  const ids = new Set();
  for (const f of FORMATS) {
    assert.ok(!ids.has(f.id), `id repetido ${f.id}`);
    ids.add(f.id);
    assert.ok(f.name && f.why && f.structure.length >= 3 && f.hooks.length >= 1 && f.goals.length, f.id);
    assert.ok(!/\d+\s?%/.test(f.why), `sem estatística inventada em ${f.id}`);
  }
});
