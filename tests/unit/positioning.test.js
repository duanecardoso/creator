import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateWeek } from '../../src/js/lib/planner.js';
import { checkCaption, checkHook } from '../../src/js/lib/hookcheck.js';
import { byLine } from '../../src/js/lib/insights.js';
import { contentPrompt, parseContent } from '../../src/js/lib/prompts.js';
import { FORMATS } from '../../src/js/lib/formats.js';
import { defaultProfile } from '../../src/js/lib/store.js';

const mk = (n, line, goal) => Array.from({ length: n }, (_, i) => ({ id: `${line}-${goal}-${i}`, title: `${line} ${goal} tema ${i}`, line, goal }));

test('linha fora do perfil (ou com peso 0) não entra no plano', () => {
  const profile = { ...defaultProfile(), planDays: 7, lines: [{ name: 'Loira', weight: 60 }, { name: 'Fit', weight: 40 }, { name: 'Zerada', weight: 0 }] };
  const bank = [...['seguidores', 'comunidade', 'marcas'].flatMap((g) => [...mk(3, 'Loira', g), ...mk(3, 'Fit', g), ...mk(5, 'Antiga', g), ...mk(5, 'Zerada', g)])];
  for (const seed of ['a', 'b', 'c', 'd']) {
    const week = generateWeek({ monday: '2026-11-02', profile, bank, seed });
    const lines = week.map((w) => w.line);
    assert.ok(lines.every((l) => l === 'Loira' || l === 'Fit'), lines.join(','));
  }
});

test('sem tema da etapa, usa outro tema seu antes do modelo genérico', () => {
  const profile = { ...defaultProfile(), lines: [{ name: 'Loira', weight: 100 }] };
  const bank = mk(6, 'Loira', 'seguidores');
  const week = generateWeek({ monday: '2026-11-02', profile, bank, seed: 'x' });
  assert.equal(week.filter((w) => w.bankId).length, 5, 'os 5 dias vêm do banco');
  assert.ok(week.every((w) => w.goal === 'seguidores'), 'a etapa do funil é a do tema');
});

test('legenda: hashtag genérica, excesso e 1ª linha sem o tema', () => {
  const bad = checkCaption({ caption: 'hoje acordei pensando na vida ✨\n#viral #fy #explorepage #a #b #c', theme: 'cabelo loiro depois das luzes' });
  assert.equal(bad.length, 3);
  assert.deepEqual(checkCaption({ caption: 'Cuidados com cabelo loiro depois das luzes: 3 erros\n#cabeloloiro #loiradeluzes', theme: 'cabelo loiro depois das luzes' }), []);
  assert.deepEqual(checkCaption({ caption: '#publicidade texto do briefing #viral', theme: 'sérum' }), [], 'publi usa a legenda da marca');
  assert.deepEqual(checkHook('O passo a passo da rotina que segurou meu loiro'), [], 'tutorial não é mais alerta');
});

test('desempenho por pilar usa o pilar do conteúdo ou do tema do banco', () => {
  const posted = (id, extra, follows) => ({ id, status: 'postado', date: '2026-10-01', postedAt: '2026-10-01', results: { views: 1000, follows, saves: 10 }, ...extra });
  const rows = byLine([posted('1', { line: 'Fit' }, 20), posted('2', { bankId: 'b1' }, 2), posted('3', {}, 1)], [{ id: 'b1', line: 'Loira' }]);
  assert.deepEqual(rows.map((r) => r.line), ['Fit', 'Loira', '']);
});

test('pedido de conteúdo pede capa e legenda com palavra-chave; resposta traz a capa', () => {
  const t = contentPrompt({ profile: { ...defaultProfile(), lines: [{ name: 'Loira', weight: 30 }] }, format: FORMATS[0], topic: 'x' });
  assert.match(t, /"cover"/);
  assert.match(t, /caber em um desses pilares/);
  assert.ok(t.length < 6000);
  assert.equal(parseContent('{"title":"a","cover":"LOIRO SEM QUEBRAR","steps":["1"]}').cover, 'LOIRO SEM QUEBRAR');
});
