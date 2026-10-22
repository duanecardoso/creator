import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contentPrompt, ideasPrompt, parseContent, parseIdeas } from '../../src/js/lib/prompts.js';
import { FORMATS } from '../../src/js/lib/formats.js';
import { defaultProfile } from '../../src/js/lib/store.js';

test('prompt de conteúdo leva perfil, formato, tema e regras', () => {
  const t = contentPrompt({ profile: defaultProfile(), format: FORMATS[0], topic: 'meu sérum' });
  assert.match(t, /meu sérum/);
  assert.match(t, new RegExp(FORMATS[0].name));
  assert.match(t, /Não invente/);
  assert.match(t, /"steps"/);
  assert.ok(t.length < 6000, 'curto o bastante para abrir no Claude pela URL');
});

test('prompt de ideias lista os formatos', () => {
  const t = ideasPrompt({ profile: defaultProfile() });
  assert.match(t, /testei-7-dias/);
  assert.ok(t.length < 6000);
});

test('lê JSON com texto em volta', () => {
  const r = parseContent('Claro!\n```json\n{"title":"T","hook":"G","steps":["a","b"],"check":"x"}\n```');
  assert.equal(r.title, 'T');
  assert.deepEqual(r.steps, ['a', 'b']);
  assert.deepEqual(r.check, ['x']);
  assert.equal(r.loose, false);
});

test('sem JSON: guarda o texto como roteiro em vez de dar erro', () => {
  const r = parseContent('Cena 1: abro a caixa\nCena 2: testo');
  assert.equal(r.loose, true);
  assert.deepEqual(r.steps, ['Cena 1: abro a caixa', 'Cena 2: testo']);
  assert.throws(() => parseContent('  '), /Nada/);
});

test('ideias: aceita só formatos conhecidos', () => {
  const r = parseIdeas('{"ideas":[{"title":"A","formatId":"review-honesto"},{"title":"B","formatId":"inventado"},{"formatId":"x"}]}');
  assert.equal(r.length, 2);
  assert.equal(r[0].formatId, 'review-honesto');
  assert.equal(r[1].formatId, '');
  assert.throws(() => parseIdeas('nada'), /lista/);
});

test('análise do portfólio: prompt com números reais e leitura da resposta', async () => {
  const { portfolioReviewPrompt, parseReview } = await import('../../src/js/lib/prompts.js');
  const stats = { visits: 40, videoOpens: 21, contactClicks: 4, clicks: { whatsapp: 3, email: 1, instagram: 0, tiktok: 0 }, forms: { contato: 0, kit: 2 }, videos: [{ title: 'Dove · Cabelos', count: 9 }], refs: [{ name: 'bio', count: 20 }], funnel: [{ label: 'Abriram o portfólio', count: 40 }, { label: 'Chegaram em Contato', count: 10 }] };
  const p = portfolioReviewPrompt({ profile: { about: 'UGC' }, url: 'https://duanecardoso.github.io/ugc/', stats, days: 30, previous: { date: '01/10', top3: ['Mostrar preço'] } });
  assert.match(p, /Visitantes: 40/);
  assert.match(p, /Taxa de contato .*: 10%/);
  assert.match(p, /Mostrar preço/);
  assert.match(portfolioReviewPrompt({ profile: {}, url: 'u' }), /ainda não conectados/);
  const r = parseReview('aqui: {"nota": 7, "contrataria": "talvez", "itens": [{"area": "Provas", "nota": 12, "bom": "logos", "melhorar": "depoimento"}], "top3": ["a", "b", "c"]}');
  assert.equal(r.nota, 7);
  assert.equal(r.itens[0].nota, 10);
  assert.deepEqual(r.top3, ['a', 'b', 'c']);
  assert.equal(parseReview('texto solto').loose, true);
  assert.throws(() => parseReview(''), /Nada para colar/);
});
