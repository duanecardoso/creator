import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ideasPrompt, scriptPrompt, brandPrompt, parseAnswer } from '../../src/js/lib/prompts.js';
import { defaultProfile } from '../../src/js/lib/store.js';

test('prompt de ideias leva perfil, regras, briefing e formato JSON', () => {
  const t = ideasPrompt({ briefing: { subject: 'rotina de treino', goal: 'marcas', premise: 'vlog do treino' }, profile: defaultProfile(), existingTitles: ['Ideia velha'] });
  assert.match(t, /rotina de treino/);
  assert.match(t, /Atração de marcas/);
  assert.match(t, /Não invente/);
  assert.match(t, /avalie com honestidade/);
  assert.match(t, /Ideia velha/);
  assert.match(t, /```json/);
});

test('prompt de marca separa fatos de hipóteses', () => {
  const brand = { name: 'M', insights: [{ category: 'diferencial', status: 'confirmado', text: 'Gela 24h', source: 'site' }, { category: 'dor', status: 'hipotese', text: 'Água esquenta' }] };
  const t = brandPrompt({ brand, profile: defaultProfile() });
  const facts = t.indexOf('FATOS CONFIRMADOS');
  const hyp = t.indexOf('HIPÓTESES');
  assert.ok(t.indexOf('Gela 24h') > facts && t.indexOf('Gela 24h') < hyp);
  assert.ok(t.lastIndexOf('Água esquenta') > hyp);
  assert.ok(scriptPrompt({ request: { type: 'carrossel' }, profile: defaultProfile() }).includes('CARROSSEL'));
});

test('lê resposta colada com texto em volta e cerca ```json', () => {
  const answer = 'Claro! Aqui está:\n```json\n{"critique":"fraco","ideas":[{"title":"A","hook":"h","needsVerification":"um item"}]}\n```\nBoa gravação!';
  const r = parseAnswer(answer, 'ideas');
  assert.equal(r.critique, 'fraco');
  assert.equal(r.ideas[0].title, 'A');
  assert.equal(r.ideas[0].concept, '');
  assert.deepEqual(r.ideas[0].needsVerification, ['um item']);
});

test('roteiro e marca', () => {
  const s = parseAnswer('{"title":"R","hook":"g","scenes":[{"speech":"oi","timing":3}],"slides":[],"screens":[]}', 'script');
  assert.equal(s.scenes[0].speech, 'oi');
  assert.equal(s.scenes[0].timing, '3');
  const b = parseAnswer('{"concepts":[{"title":"C","basedOnFacts":["f"]}],"missingInfo":[]}', 'brand');
  assert.deepEqual(b.concepts[0].basedOnFacts, ['f']);
});

test('erros claros', () => {
  assert.throws(() => parseAnswer('', 'ideas'), /Cole/);
  assert.throws(() => parseAnswer('sem json aqui', 'ideas'), /JSON/);
  assert.throws(() => parseAnswer('{"ideas": [ {"title": "corta', 'ideas'), /JSON/);
  assert.throws(() => parseAnswer('{"outra":1}', 'ideas'), /ideas/);
});
