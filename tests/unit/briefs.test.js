import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NICHES, generateBrief, parseProducts, nextNiche, coverage, timeline, briefKey, briefFromAi, briefText } from '../../src/js/lib/briefs.js';
import { deadlines, finance, REAL_TYPES } from '../../src/js/lib/deals.js';
import { generateWeek } from '../../src/js/lib/planner.js';
import { briefingPrompt, parseBrief } from '../../src/js/lib/prompts.js';
import { defaultProfile } from '../../src/js/lib/store.js';

const start = '2026-10-19';

test('cobre todos os nichos do portfólio', () => {
  assert.deepEqual(NICHES.map((n) => n.id), ['haircare', 'skincare', 'bodycare', 'moda', 'fitness', 'tech']);
  for (const n of NICHES) {
    const b = generateBrief({ niche: n.id, start, seed: 'x' });
    assert.equal(b.niche, n.id);
    assert.ok(b.objective && b.audience && b.format && b.hooks.length === 3 && b.script.length >= 4);
    assert.ok(b.donts.some((d) => /publi/.test(d)), 'deixa claro que não é publi');
  }
});

test('prazos em ordem e post antes do portfólio', () => {
  const t = timeline(start, 'normal');
  const dues = t.deliverables.map((d) => d.due);
  assert.deepEqual([...dues].sort(), dues);
  assert.equal(t.scriptDue, '2026-10-20');
  assert.equal(t.postDate, '2026-10-25');
  assert.equal(timeline(start, 'curto').deliverables.at(-1).due, '2026-10-23');
});

test('produto que eu tenho vs inventado, e "outra sugestão" não repete', () => {
  const products = parseProducts('Dove | óleo sérum corporal | bodycare\nPantene | máscara | haircare\nElseve óleo extraordinário de cabelo');
  assert.equal(products[2].niche, 'haircare', 'adivinha o nicho');
  const owned = generateBrief({ niche: 'bodycare', source: 'tenho', products, start, seed: '1' });
  assert.equal(owned.brand, 'Dove');
  assert.equal(owned.fictional, false);
  const other = generateBrief({ niche: 'bodycare', source: 'tenho', products, start, seed: '2', exclude: [briefKey(owned)] });
  assert.equal(other.fictional, true, 'sem mais produtos do nicho, inventa');
  assert.match(other.note, /inventado/);
  const inv = generateBrief({ niche: 'haircare', source: 'inventado', products, start, seed: '3' });
  assert.equal(inv.brand, 'Marca fictícia');
  for (let i = 0; i < 10; i++) {
    const again = generateBrief({ niche: 'haircare', source: 'inventado', start, seed: `s${i}`, exclude: [briefKey(inv), `angulo:${inv.angle}`] });
    assert.notEqual(briefKey(again), briefKey(inv));
    assert.notEqual(again.angle, inv.angle);
  }
});

test('o nicho automático é o menos treinado', () => {
  assert.equal(nextNiche([]), 'haircare');
  const done = [{ niche: 'haircare', start }, { niche: 'skincare', start }, { niche: 'bodycare', start }];
  assert.equal(nextNiche(done), 'moda');
  const cov = coverage([...done, { niche: 'moda', start, status: 'postado' }]);
  assert.equal(cov.find((c) => c.id === 'moda').done, 1);
});

test('treino entra nos prazos e no plano, mas não no financeiro', () => {
  const b = generateBrief({ niche: 'tech', start, seed: 'x' });
  const deal = { id: 'd1', type: 'treino', status: 'briefing', brandName: b.brand, product: b.product, deliverables: b.deliverables, scriptDue: b.scriptDue, postDate: b.postDate, brief: b, value: 0 };
  const dl = deadlines([deal]);
  assert.ok(dl.some((x) => x.kind === 'post'));
  assert.match(dl[0].name, /^Treino · /);
  assert.ok(!('treino' in REAL_TYPES));
  assert.equal(finance([deal], '2026-10', start).toReceive, 0);
  assert.ok(!('treino' in finance([deal], '2026-10', start).byType));
  const week = generateWeek({ monday: '2026-10-19', deals: [{ ...deal, postDate: '2026-10-21' }], profile: defaultProfile(), seed: 'a' });
  const item = week.find((w) => w.date === '2026-10-21');
  assert.equal(item.dealId, 'd1');
  assert.match(item.title, /UGC de treino/);
  assert.equal(item.portfolio, true);
  assert.equal(deadlines([{ ...deal, status: 'postado' }]).some((x) => x.kind === 'post'), false);
});

test('prompt do Claude e leitura da resposta', () => {
  const t = briefingPrompt({ profile: defaultProfile(), niche: 'skincare', nicheName: 'Skincare', source: 'tenho', products: parseProducts('L’Oréal | protetor com cor | skincare'), brands: ['Dove'], exclude: ['X – Y'], pace: 'Normal' });
  assert.match(t, /protetor com cor/);
  assert.match(t, /Não repita/);
  assert.match(t, /não é publi/);
  assert.ok(t.length < 6000);
  const ai = parseBrief('```json\n{"brand":"L’Oréal","product":"protetor com cor","fictional":false,"hooks":["a","b"],"script":["1","2"],"donts":["não exagere"]}\n```');
  const b = briefFromAi(ai, { niche: 'skincare', start });
  assert.equal(b.brand, 'L’Oréal');
  assert.equal(b.fictional, false);
  assert.equal(b.deliverables.length, 5);
  assert.ok(b.donts.some((d) => /publi/.test(d)), 'regra de não-publi sempre fica');
  assert.throws(() => parseBrief('sem json'), /briefing/);
  assert.match(briefText(b), /BRIEFING DE TREINO/);
});
