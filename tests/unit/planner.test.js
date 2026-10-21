import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateWeek, targetWeek, shouldAutoGenerate, weekdays } from '../../src/js/lib/planner.js';
import { defaultProfile } from '../../src/js/lib/store.js';
import { metaOf } from '../../src/js/lib/formats.js';

const profile = defaultProfile();
const MON = '2026-10-26';

test('a partir de sábado, a semana-alvo é a próxima', () => {
  assert.equal(targetWeek('2026-10-24'), MON); // sábado
  assert.equal(targetWeek('2026-10-25'), MON); // domingo
  assert.equal(targetWeek('2026-10-21'), '2026-10-19'); // quarta: semana atual
  assert.equal(shouldAutoGenerate('2026-10-24', []), true);
  assert.equal(shouldAutoGenerate('2026-10-24', [{ weekStart: MON }]), false, 'não gera duas vezes');
  assert.equal(shouldAutoGenerate('2026-10-22', []), false, 'durante a semana não gera sozinho');
});

test('gera segunda a sexta com tema, foco, formato, tipo e estrutura', () => {
  const items = generateWeek({ monday: MON, profile, seed: 'x' });
  assert.deepEqual(items.map((i) => i.date), weekdays(MON));
  for (const it of items) {
    assert.ok(it.title && it.theme && it.formatId && it.goal && it.hook, JSON.stringify(it));
    assert.ok(it.steps.length >= 3);
    assert.ok(metaOf(it.formatId).types.includes(it.type), `${it.formatId} aceita ${it.type}`);
    if (it.type !== 'video') assert.ok(it.slides.length >= 1, 'carrossel/estático vêm com telas');
  }
  assert.equal(new Set(items.map((i) => i.formatId)).size, 5, 'formatos diferentes');
  assert.equal(new Set(items.map((i) => i.theme)).size, 5, 'temas diferentes');
  assert.ok(new Set(items.map((i) => i.goal)).size >= 3, 'foco variado');
});

test('respeita a mistura de tipos (3 vídeos, 1 carrossel, 1 estático)', () => {
  for (const seed of ['a', 'b', 'c', 'd', 'e', 'f']) {
    const items = generateWeek({ monday: MON, profile, seed });
    const count = (t) => items.filter((i) => i.type === t).length;
    assert.equal(count('carrossel'), 1, seed);
    assert.equal(count('estatico'), 1, seed);
    assert.equal(count('video'), 3, seed);
  }
});

test('é determinístico pela semana e muda com outra semente', () => {
  const a = generateWeek({ monday: MON, profile, seed: MON });
  const b = generateWeek({ monday: MON, profile, seed: MON });
  assert.deepEqual(a.map((i) => i.title), b.map((i) => i.title));
});

test('publi e TikTok Shop com data entram no plano', () => {
  const deals = [{ id: 'd1', type: 'publi', brandName: 'Marca X', postDate: '2026-10-28', status: 'fechado' }, { id: 'd2', type: 'ugc', brandName: 'Y', postDate: '2026-10-29' }];
  const items = generateWeek({ monday: MON, profile, deals, seed: 's' });
  const wed = items.find((i) => i.date === '2026-10-28');
  assert.equal(wed.dealId, 'd1');
  assert.equal(wed.goal, 'marcas');
  assert.match(wed.title, /Publi: Marca X/);
  assert.ok(!items.find((i) => i.dealId === 'd2'), 'UGC não vai para o feed dela');
});

test('evita repetir formatos e temas recentes', () => {
  const first = generateWeek({ monday: MON, profile, seed: 'q' }).map((i) => ({ ...i }));
  const next = generateWeek({ monday: '2026-11-02', profile, contents: first, seed: 'q' });
  const repeatedThemes = next.filter((i) => first.some((f) => f.theme === i.theme));
  assert.equal(repeatedThemes.length, 0);
});

test('fotos: carrossel com foto pede foto', () => {
  const items = generateWeek({ monday: MON, profile, seed: 'p' });
  for (const it of items) assert.equal(it.needsPhoto, (it.slides || []).some((s) => s.photo));
});
