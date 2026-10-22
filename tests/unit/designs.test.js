import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slidesFor, needsPhoto, emptyFields, missingIn, photoSlots } from '../../src/js/lib/designs.js';
import { wrap } from '../../src/js/lib/render.js';
import { weekPrompt, parseWeek, mergeSlides } from '../../src/js/lib/prompts.js';
import { FORMATS } from '../../src/js/lib/formats.js';
import { defaultProfile } from '../../src/js/lib/store.js';

test('carrossel de review pede foto e tem final', () => {
  const s = slidesFor('review-honesto', 'carrossel', { title: 'T', goal: 'marcas' });
  assert.equal(s[0].layout, 'capa');
  assert.ok(s[0].photo && s[0].photoHint);
  assert.equal(s.at(-1).layout, 'cta');
  assert.ok(needsPhoto(s));
});

test('estático tem uma tela e não pede foto', () => {
  const s = slidesFor('notas-opiniao', 'estatico', { title: 'T' });
  assert.equal(s.length, 1);
  assert.equal(needsPhoto(s), false);
  assert.deepEqual(emptyFields(s[0]), ['texto']);
});

test('vídeo não tem telas', () => assert.deepEqual(slidesFor('storytime', 'video'), []));

test('quebra de linha respeita a largura e o limite', () => {
  const m = (s) => s.length * 10;
  assert.deepEqual(wrap(m, 'um dois tres quatro', 90), ['um dois', 'tres', 'quatro']);
  assert.deepEqual(wrap(m, 'a\nb', 100), ['a', 'b']);
  const cut = wrap(m, 'um dois tres quatro cinco seis', 60, 2);
  assert.equal(cut.length, 2);
  assert.ok(cut[1].endsWith('…'));
});

test('grade usa 4 fotos e conta as que faltam', () => {
  const s = slidesFor('testei-7-dias', 'carrossel', { title: 'T' });
  const g = s.find((x) => x.layout === 'grade');
  assert.equal(photoSlots(g), 4);
  assert.equal(missingIn(g), 4);
  assert.equal(missingIn({ ...g, photoIds: ['a', null, 'c'] }), 2);
  assert.equal(missingIn({ ...s[0], photoId: 'x' }), 0);
});

test('semana com o Claude: prompt, leitura e junção das telas', () => {
  const items = [{ date: '2026-10-26', type: 'carrossel', goal: 'marcas', formatId: 'review-honesto', theme: 'protetor', slides: slidesFor('review-honesto', 'carrossel', { title: 'T' }) }];
  const p = weekPrompt({ profile: defaultProfile(), items, formats: FORMATS });
  assert.match(p, /tela 1 \(capa: título curto e forte, tem foto minha\)/);
  assert.match(p, /tela 2 \(balões.*: 4 item\(ns\)/);
  const parsed = parseWeek('```json\n{"days":[{"n":1,"title":"Novo","hook":"g","slides":[{"title":"Capa nova"},{"items":["leve","cheiro forte"]},{"body":"vale"}]}]}\n```');
  const merged = mergeSlides(items[0].slides, parsed[0].slides);
  assert.equal(merged[0].title, 'Capa nova');
  assert.equal(merged[0].photo, true, 'mantém foto');
  assert.deepEqual(merged[1].items.map((i) => i.text), ['leve', 'cheiro forte']);
  assert.equal(merged[2].body, 'vale');
  assert.throws(() => parseWeek('{}'), /days/);
});
