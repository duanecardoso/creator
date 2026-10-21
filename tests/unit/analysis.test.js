import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INDICATORS, median, confidence, compareBy, evaluatePost, findPatterns, hasMetrics, base } from '../../src/js/lib/analysis.js';
import { checkHook } from '../../src/js/lib/hookcheck.js';

const post = (id, extra, metrics) => ({ id, platform: 'instagram', ...extra, metrics });

test('campo vazio não vira zero', () => {
  const p = post('a', {}, { reach: 1000, likes: 50, comments: null, saves: 10, shares: 5 });
  assert.equal(INDICATORS.engagement.compute(p), null, 'sem comentários, taxa de interação não é calculada');
  assert.equal(INDICATORS.saves.compute(p), 0.01);
  assert.equal(hasMetrics(post('b', {}, { reach: '' })), false);
});

test('usa visualizações quando não há alcance', () => {
  assert.deepEqual(base(post('a', {}, { views: 500 })), { value: 500, kind: 'visualizações' });
});

test('mediana e confiança', () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([1, 2, 3, 4]), 2.5);
  assert.equal(median([]), null);
  assert.equal(confidence(2).level, 0);
  assert.equal(confidence(4).level, 1);
  assert.equal(confidence(20).level, 3);
});

test('não avalia publicação com poucas comparáveis', () => {
  const p = post('x', { goal: 'comunidade' }, { reach: 1000, follows: 10 });
  const r = evaluatePost(p, [p, post('y', {}, { reach: 1000, follows: 1 })]);
  assert.equal(r.status, 'few');
});

test('avalia pelo indicador do objetivo, não por views', () => {
  const peers = [1, 2, 3, 4].map((n) => post(`p${n}`, {}, { reach: 100000, follows: 10 }));
  const p = post('x', { goal: 'comunidade' }, { reach: 1000, follows: 10 }); // pouco alcance, muitos seguidores por alcance
  const r = evaluatePost(p, [p, ...peers]);
  assert.equal(r.indicator, 'follows');
  assert.equal(r.verdict, 'acima da sua mediana');
});

test('compareBy agrupa e ignora quem não tem o dado', () => {
  const posts = [
    post('1', { format: 'reels' }, { reach: 100, shares: 10 }),
    post('2', { format: 'reels' }, { reach: 100, shares: 20 }),
    post('3', { format: 'carrossel' }, { reach: 100, shares: 1 }),
    post('4', { format: 'carrossel' }, { reach: 100 }),
  ];
  const { rows, overall } = compareBy(posts, 'format', 'shares');
  assert.equal(overall.n, 3);
  assert.equal(rows[0].group, 'reels');
  assert.ok(Math.abs(rows[0].median - 0.15) < 1e-9);
});

test('findPatterns fica quieto com poucos dados', () => {
  const posts = [1, 2, 3, 4].map((n) => post(String(n), { format: n < 3 ? 'reels' : 'carrossel' }, { reach: 100, shares: n }));
  assert.deepEqual(findPatterns(posts, [{ key: 'format', label: 'Formato' }]), []);
});

test('findPatterns aponta diferença com dados mínimos', () => {
  const posts = [
    ...[1, 2, 3].map((n) => post(`c${n}`, { format: 'carrossel' }, { reach: 100, saves: 20 })),
    ...[1, 2, 3].map((n) => post(`r${n}`, { format: 'reels' }, { reach: 100, saves: 2 })),
  ];
  const out = findPatterns(posts, [{ key: 'format', label: 'Formato' }]);
  assert.ok(out.some((o) => o.group === 'carrossel' && o.direction === 'acima'));
});

test('revisor de gancho', () => {
  assert.ok(checkHook('Oi gente, hoje vou mostrar').length > 0);
  assert.ok(checkHook('Você sabia que...').length > 0);
  assert.ok(checkHook('5 dicas para pele oleosa').length > 0);
  assert.deepEqual(checkHook('Passei uma semana usando só o protetor que a minha mãe comprou'), []);
  assert.deepEqual(checkHook(''), []);
});
