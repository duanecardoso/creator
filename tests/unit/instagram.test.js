import { test } from 'node:test';
import assert from 'node:assert/strict';
import { syncInstagram, shortcode, mediaFormat, titleFromCaption, tokenStatus, needsRefresh, refreshToken, mediaInsights, IgError } from '../../src/js/lib/instagram.js';

const cfg = { token: 'TKN', apiVersion: 'v24.0', tokenSetAt: new Date().toISOString() };
const res = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });

// API falsa: duas mídias; o Reels recusa "profile_visits"/"follows" (como a API real pode fazer).
function fakeApi() {
  const calls = [];
  const fetchImpl = async (u) => {
    calls.push(u);
    const url = new URL(u);
    if (url.pathname.endsWith('/me/media')) {
      return res({ data: [
        { id: 'm1', caption: 'Testei o sérum por 7 dias\n#ugc', media_type: 'CAROUSEL_ALBUM', media_product_type: 'FEED', permalink: 'https://www.instagram.com/p/AAA111/', timestamp: '2026-10-01T15:00:00+0000', like_count: 40, comments_count: 5 },
        { id: 'm2', caption: '', media_type: 'VIDEO', media_product_type: 'REELS', permalink: 'https://www.instagram.com/reel/BBB222/', timestamp: '2026-10-05T15:00:00+0000', like_count: 90, comments_count: 12 },
      ] });
    }
    const metric = url.searchParams.get('metric');
    if (url.pathname.includes('/m2/insights') && /profile_visits|follows/.test(metric)) {
      return res({ error: { code: 100, message: 'metric not supported' } }, 400);
    }
    const values = { reach: 1000, views: 1500, likes: 41, comments: 5, saved: 30, shares: 8, total_interactions: 84, profile_visits: 20, follows: 3 };
    return res({ data: metric.split(',').map((name) => ({ name, values: [{ value: values[name] }] })) });
  };
  return { fetchImpl, calls };
}

function fakeDb(posts = []) {
  let n = 0;
  return {
    posts,
    list: () => posts,
    create: (r) => { const p = { ...r, id: `p${++n}` }; posts.push(p); return p; },
    update: (id, patch) => Object.assign(posts.find((p) => p.id === id), patch),
  };
}

test('sincroniza: cria novas, casa pelo link e preserva dados manuais', async () => {
  const db = fakeDb([{ id: 'x', title: 'Meu post planejado', formatId: 'review-honesto', link: 'https://instagram.com/p/AAA111?igsh=abc', results: { brandContacts: 2, likes: 1 } }]);
  const { fetchImpl } = fakeApi();
  const s = await syncInstagram({ cfg, db, fetchImpl });
  assert.equal(s.fetched, 2);
  assert.equal(s.updated, 1);
  assert.equal(s.created, 1);
  const matched = db.posts.find((p) => p.id === 'x');
  assert.equal(matched.igMediaId, 'm1');
  assert.equal(matched.title, 'Meu post planejado', 'não troca o título que ela escreveu');
  assert.equal(matched.formatId, 'review-honesto');
  assert.equal(matched.results.reach, 1000);
  assert.equal(matched.results.saves, 30);
  assert.equal(matched.results.follows, 3);
  assert.equal(matched.results.brandContacts, 2, 'manual preservado');
  assert.equal(matched.results.source, 'instagram');
  const reel = db.posts.find((p) => p.igMediaId === 'm2');
  assert.equal(reel.igFormat, 'reels');
  assert.equal(reel.status, 'postado');
  assert.equal(reel.results.follows, null, 'métrica recusada fica vazia, não zero');
  assert.equal(reel.results.reach, 1000);
});

test('segunda sincronização não duplica', async () => {
  const db = fakeDb();
  const { fetchImpl } = fakeApi();
  await syncInstagram({ cfg, db, fetchImpl });
  const s2 = await syncInstagram({ cfg, db, fetchImpl });
  assert.equal(db.posts.length, 2);
  assert.equal(s2.created, 0);
  assert.equal(s2.updated, 2);
});

test('métrica não suportada é lembrada e não é pedida de novo', async () => {
  const { fetchImpl, calls } = fakeApi();
  const unsupported = new Set();
  await mediaInsights(cfg, { id: 'm2', media_product_type: 'REELS' }, unsupported, fetchImpl);
  const before = calls.length;
  // Feed pede profile_visits; Reels já não pede
  assert.ok(!unsupported.size || [...unsupported].every((k) => k.startsWith('REELS')));
  await mediaInsights(cfg, { id: 'm2', media_product_type: 'REELS' }, unsupported, fetchImpl);
  assert.equal(calls.length - before, 1, 'segunda vez faz uma chamada só');
});

test('token inválido gera erro de autenticação claro', async () => {
  const fetchImpl = async () => res({ error: { code: 190, message: 'Invalid OAuth access token' } }, 400);
  await assert.rejects(syncInstagram({ cfg, db: fakeDb(), fetchImpl }), (e) => e instanceof IgError && e.kind === 'auth' && /token/.test(e.message));
});

test('falha de rede vira mensagem amigável', async () => {
  const fetchImpl = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(syncInstagram({ cfg, db: fakeDb(), fetchImpl }), (e) => e.kind === 'network');
});

test('renovação de token', async () => {
  const fetchImpl = async (u) => {
    assert.match(u, /refresh_access_token\?grant_type=ig_refresh_token/);
    return res({ access_token: 'NOVO', expires_in: 5184000 });
  };
  const n = await refreshToken(cfg, fetchImpl);
  assert.equal(n.token, 'NOVO');
  assert.ok(tokenStatus(n).daysLeft >= 59);
  assert.equal(needsRefresh(n), false);
  assert.equal(needsRefresh({ token: 'x', tokenSetAt: new Date(Date.now() - 8 * 864e5).toISOString() }), true);
  assert.equal(tokenStatus({ token: 'x', tokenSetAt: new Date(Date.now() - 61 * 864e5).toISOString() }).state, 'expired');
});

test('auxiliares', () => {
  assert.equal(shortcode('https://www.instagram.com/reel/ABC-1_x/?igsh=1'), 'ABC-1_x');
  assert.equal(shortcode('https://instagram.com/usuaria/p/XYZ/'), 'XYZ');
  assert.equal(shortcode('https://tiktok.com/x'), null);
  assert.equal(mediaFormat({ media_type: 'IMAGE' }), 'foto');
  assert.equal(mediaFormat({ media_type: 'CAROUSEL_ALBUM' }), 'carrossel');
  assert.equal(titleFromCaption('\n  Primeira linha\nsegunda'), 'Primeira linha');
  assert.match(titleFromCaption('', '2026-10-05T15:00:00+0000'), /Publicação de \d\d\/10\/2026/);
});

test('capa do post: vídeo usa thumbnail_url, foto e carrossel usam media_url', async () => {
  const { thumbOf } = await import('../../src/js/lib/instagram.js');
  assert.equal(thumbOf({ media_type: 'VIDEO', media_url: 'v.mp4', thumbnail_url: 't.jpg' }), 't.jpg');
  assert.equal(thumbOf({ media_type: 'VIDEO', media_url: 'v.mp4' }), '');
  assert.equal(thumbOf({ media_type: 'IMAGE', media_url: 'i.jpg' }), 'i.jpg');
  assert.equal(thumbOf({ media_type: 'CAROUSEL_ALBUM', media_url: 'c.jpg' }), 'c.jpg');
});
