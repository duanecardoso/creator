import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarize, fetchPortfolioStats, taggedLink, startOf, GcError, loadGc, saveGc, apiKeyUrl } from '../../src/js/lib/goatcounter.js';
import { MemoryStorage } from '../../src/js/lib/store.js';

const raw = {
  hits: [
    { path: '/ugc/', event: false, count: 40, title: 'Duane', stats: [{ day: '2026-10-20', daily: 15 }, { day: '2026-10-21', daily: 25 }] },
    { path: 'video-abc', event: true, count: 9, title: 'Vídeo: Dove · Cabelos' },
    { path: 'video-xyz', event: true, count: 12, title: 'Vídeo: L’Oréal · Finalização' },
    { path: 'clique-whatsapp', event: true, count: 3 },
    { path: 'clique-email', event: true, count: 1 },
    { path: 'secao-contato', event: true, count: 10 },
    { path: 'form-kit', event: true, count: 2 },
  ],
  refs: [{ name: 'bio', count: 20, ref_scheme: 'c' }, { name: '', count: 15 }],
};

test('resumo do portfólio: visitas, vídeos, cliques e funil', () => {
  const s = summarize(raw);
  assert.equal(s.visits, 40);
  assert.deepEqual(s.daily, [{ day: '2026-10-20', count: 15 }, { day: '2026-10-21', count: 25 }]);
  assert.equal(s.videos[0].title, 'L’Oréal · Finalização');
  assert.equal(s.videoOpens, 21);
  assert.equal(s.contactClicks, 4);
  assert.equal(s.forms.kit, 2);
  assert.equal(s.funnel.find((f) => f.id === 'contato').count, 10);
  assert.equal(s.refs[0].tagged, true);
  assert.deepEqual(summarize({}).funnel[0], { id: 'visitas', label: 'Abriram o portfólio', count: 0 });
});

test('busca na API com a chave e trata erros', async () => {
  const calls = [];
  const ok = async (url, opts) => {
    calls.push({ url, auth: opts.headers.Authorization });
    const body = url.includes('stats/hits') ? { hits: raw.hits } : { stats: [] };
    return { ok: true, status: 200, json: async () => body };
  };
  const r = await fetchPortfolioStats({ site: 'duanecardoso', token: 'k' }, 7, ok, new Date('2026-10-22T15:00:00Z'));
  assert.equal(calls.length, 4);
  assert.ok(calls.every((c) => c.url.startsWith('https://duanecardoso.goatcounter.com/api/v0/') && c.auth === 'Bearer k'));
  assert.ok(calls[0].url.includes('start=2026-10-16T00%3A00%3A00Z'));
  assert.equal(r.hits.length, 7);
  await assert.rejects(fetchPortfolioStats({ site: 'x', token: 'k' }, 7, async () => ({ ok: false, status: 401 })), (e) => e instanceof GcError && e.kind === 'auth');
  await assert.rejects(fetchPortfolioStats({ site: 'x', token: 'k' }, 7, async () => { throw new TypeError('Failed to fetch'); }), (e) => e.kind === 'network');
  await assert.rejects(fetchPortfolioStats({ site: 'x' }, 7, ok), (e) => e.kind === 'auth');
});

test('link com etiqueta, data de início e configuração', () => {
  assert.equal(taggedLink('https://duanecardoso.github.io/ugc/', 'Bio do Instagram'), 'https://duanecardoso.github.io/ugc/?ref=bio-do-instagram');
  assert.equal(taggedLink('https://duanecardoso.github.io/ugc/', 'Proposta Ação'), 'https://duanecardoso.github.io/ugc/?ref=proposta-acao');
  assert.equal(startOf(1, new Date('2026-10-22T23:00:00Z')), '2026-10-22T00:00:00Z');
  const st = new MemoryStorage();
  assert.equal(loadGc(st).site, 'duanecardoso');
  saveGc(st, { site: 'https://duanecardoso.goatcounter.com/', token: 't' });
  assert.equal(apiKeyUrl(loadGc(st)), 'https://duanecardoso.goatcounter.com/user/api');
});
