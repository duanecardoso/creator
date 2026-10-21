// Conexão com a API oficial do Instagram (Instagram API com login do Instagram).
// O token fica salvo só neste navegador. Nada é enviado para outro lugar além de graph.instagram.com.

export const IG_HOST = 'https://graph.instagram.com';
export const IG_DEFAULT_VERSION = 'v24.0';
const CFG_KEY = 'creator:instagram';
const REFRESH_AFTER_DAYS = 7;
const DAY = 864e5;

// Métricas pedidas por tipo de mídia. Se a API recusar alguma, ela é pulada nas próximas.
export const METRICS_BY_KIND = {
  FEED: ['reach', 'views', 'likes', 'comments', 'saved', 'shares', 'total_interactions', 'profile_visits', 'follows'],
  REELS: ['reach', 'views', 'likes', 'comments', 'saved', 'shares', 'total_interactions'],
};

export class IgError extends Error {
  constructor(message, { code = null, kind = 'api' } = {}) {
    super(message);
    this.code = code;
    this.kind = kind;
  }
}

// ---------- Configuração salva no navegador ----------
export function loadConfig(storage) {
  try {
    return JSON.parse(storage.getItem(CFG_KEY) || 'null');
  } catch {
    return null;
  }
}
export function saveConfig(storage, cfg) {
  storage.setItem(CFG_KEY, JSON.stringify(cfg));
  return cfg;
}
export function clearConfig(storage) {
  storage.removeItem(CFG_KEY);
}

export function tokenStatus(cfg, now = Date.now()) {
  if (!cfg?.token) return { state: 'off' };
  const expiresAt = cfg.expiresAt ? Date.parse(cfg.expiresAt) : Date.parse(cfg.tokenSetAt) + 60 * DAY;
  const daysLeft = Math.floor((expiresAt - now) / DAY);
  if (daysLeft < 0) return { state: 'expired', daysLeft };
  return { state: daysLeft <= 7 ? 'expiring' : 'ok', daysLeft, estimated: !cfg.expiresAt };
}

export const needsRefresh = (cfg, now = Date.now()) => {
  if (!cfg?.token) return false;
  const last = Date.parse(cfg.tokenRefreshedAt || cfg.tokenSetAt);
  return now - last > REFRESH_AFTER_DAYS * DAY;
};

export function isSyncDue(cfg, hours = 6, now = Date.now()) {
  if (!cfg?.token) return false;
  return !cfg.lastSync || now - Date.parse(cfg.lastSync) > hours * 3600e3;
}

// ---------- Chamadas ----------
function translate(err, status) {
  const code = err?.code ?? null;
  if (code === 190 || status === 401) return new IgError('O token do Instagram é inválido ou expirou. Gere um novo no painel da Meta e cole em "Perfil e dados".', { code, kind: 'auth' });
  if (code === 10 || code === 200 || (code >= 200 && code < 300) || status === 403) return new IgError(`Permissão negada pelo Instagram. Confira se o app tem "instagram_business_manage_insights" e se sua conta é profissional. (${err?.message || status})`, { code, kind: 'permission' });
  if ([4, 17, 32, 613].includes(code) || status === 429) return new IgError('Limite de consultas do Instagram atingido. Tente de novo em cerca de uma hora.', { code, kind: 'rate' });
  if (code === 100) return new IgError(err?.message || 'Parâmetro não aceito pela API.', { code, kind: 'param' });
  return new IgError(`Erro do Instagram${status ? ` (${status})` : ''}: ${err?.message || 'resposta inesperada'}`, { code });
}

async function getJson(url, fetchImpl) {
  let res;
  try {
    res = await fetchImpl(url);
  } catch {
    throw new IgError('Não consegui falar com o Instagram. Verifique a internet. Se continuar, o navegador ou uma extensão pode estar bloqueando graph.instagram.com.', { kind: 'network' });
  }
  const body = await res.json().catch(() => null);
  if (!res.ok || body?.error) throw translate(body?.error, res.ok ? null : res.status);
  return body;
}

const url = (cfg, path, params = {}) => {
  const q = new URLSearchParams({ ...params, access_token: cfg.token });
  return `${IG_HOST}/${cfg.apiVersion || IG_DEFAULT_VERSION}/${path}?${q}`;
};

export async function fetchAccount(cfg, fetchImpl = fetch) {
  return getJson(url(cfg, 'me', { fields: 'user_id,username,account_type,followers_count,media_count' }), fetchImpl);
}

// Renova um token de longa duração (precisa ter mais de 24h e ainda estar válido).
export async function refreshToken(cfg, fetchImpl = fetch) {
  const q = new URLSearchParams({ grant_type: 'ig_refresh_token', access_token: cfg.token });
  const body = await getJson(`${IG_HOST}/refresh_access_token?${q}`, fetchImpl);
  if (!body.access_token) throw new IgError('A renovação do token não retornou um token novo.');
  const now = new Date();
  return {
    ...cfg,
    token: body.access_token,
    tokenRefreshedAt: now.toISOString(),
    expiresAt: body.expires_in ? new Date(now.getTime() + body.expires_in * 1000).toISOString() : cfg.expiresAt,
  };
}

export async function listMedia(cfg, limit = 30, fetchImpl = fetch) {
  const out = [];
  let next = url(cfg, 'me/media', {
    fields: 'id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count',
    limit: String(Math.min(limit, 50)),
  });
  while (next && out.length < limit) {
    const body = await getJson(next, fetchImpl);
    out.push(...(body.data || []));
    next = body.paging?.next || null;
  }
  return out.slice(0, limit);
}

export const mediaKind = (m) => (m.media_product_type === 'REELS' ? 'REELS' : m.media_product_type === 'STORY' ? 'STORY' : 'FEED');

export function parseInsights(body) {
  const out = {};
  for (const d of body?.data || []) {
    const v = d.total_value?.value ?? d.values?.[0]?.value;
    if (typeof v === 'number') out[d.name] = v;
  }
  return out;
}

// Busca as métricas de uma publicação. "unsupported" guarda métricas recusadas por tipo de mídia.
export async function mediaInsights(cfg, media, unsupported = new Set(), fetchImpl = fetch) {
  const kind = mediaKind(media);
  const wanted = (METRICS_BY_KIND[kind] || []).filter((m) => !unsupported.has(`${kind}:${m}`));
  if (!wanted.length) return {};
  try {
    return parseInsights(await getJson(url(cfg, `${media.id}/insights`, { metric: wanted.join(',') }), fetchImpl));
  } catch (err) {
    if (err.kind !== 'param') throw err;
  }
  // Alguma métrica não vale para este tipo: tenta uma por uma.
  const out = {};
  for (const m of wanted) {
    try {
      Object.assign(out, parseInsights(await getJson(url(cfg, `${media.id}/insights`, { metric: m }), fetchImpl)));
    } catch (err) {
      if (err.kind !== 'param') throw err;
      unsupported.add(`${kind}:${m}`);
    }
  }
  return out;
}

// ---------- Conversão para o formato do app ----------
export function shortcode(link) {
  const m = String(link || '').match(/instagram\.com\/(?:[^/]+\/)?(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i);
  return m ? m[1] : null;
}

export function mediaFormat(m) {
  if (m.media_product_type === 'REELS' || m.media_type === 'VIDEO') return 'reels';
  if (m.media_type === 'CAROUSEL_ALBUM') return 'carrossel';
  if (m.media_type === 'IMAGE') return 'foto';
  return 'outro';
}

const localDate = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function titleFromCaption(caption, timestamp) {
  const first = String(caption || '').split('\n').map((s) => s.trim()).find(Boolean);
  if (first) return first.length > 80 ? `${first.slice(0, 77)}…` : first;
  return `Publicação de ${localDate(timestamp).split('-').reverse().join('/')}`;
}

export function toResults(ins, media, previous = {}) {
  const pick = (v, fallback) => (typeof v === 'number' ? v : fallback ?? null);
  return {
    ...previous, // mantém o que é manual (contatos de marcas)
    views: pick(ins.views, previous.views),
    reach: pick(ins.reach, previous.reach),
    likes: pick(ins.likes, pick(media.like_count, previous.likes)),
    comments: pick(ins.comments, pick(media.comments_count, previous.comments)),
    saves: pick(ins.saved, previous.saves),
    shares: pick(ins.shares, previous.shares),
    follows: pick(ins.follows, previous.follows),
    profileVisits: pick(ins.profile_visits, previous.profileVisits),
    source: 'instagram',
    updatedAt: new Date().toISOString(),
  };
}

// Encontra a publicação da agenda que corresponde à mídia (pelo ID ou pelo link).
export function findPost(items, media) {
  const code = shortcode(media.permalink);
  return items.find((p) => p.igMediaId === media.id) || (code && items.find((p) => shortcode(p.link) === code)) || null;
}

/**
 * Sincroniza as últimas publicações.
 * db: { list(): posts[], create(rec), update(id, patch) }
 */
export async function syncInstagram({ cfg, db, limit = 30, fetchImpl = fetch, onProgress = () => {} }) {
  const summary = { fetched: 0, created: 0, updated: 0, withInsights: 0, insightErrors: 0, skippedStories: 0, firstError: null };
  onProgress('Buscando publicações…');
  const media = await listMedia(cfg, limit, fetchImpl);
  summary.fetched = media.length;
  const unsupported = new Set();
  for (const [i, m] of media.entries()) {
    if (mediaKind(m) === 'STORY') {
      summary.skippedStories++;
      continue;
    }
    onProgress(`Lendo métricas ${i + 1} de ${media.length}…`);
    let ins = {};
    try {
      ins = await mediaInsights(cfg, m, unsupported, fetchImpl);
      if (Object.keys(ins).length) summary.withInsights++;
    } catch (err) {
      if (err.kind === 'auth' || err.kind === 'rate' || err.kind === 'network') throw err;
      summary.insightErrors++;
      summary.firstError ||= err.message;
    }
    const existing = findPost(db.list(), m);
    const date = localDate(m.timestamp);
    if (existing) {
      db.update(existing.id, {
        igMediaId: m.id,
        caption: existing.caption || m.caption || '',
        link: existing.link || m.permalink,
        postedAt: existing.postedAt || date,
        date: existing.date || date,
        status: 'postado',
        platforms: existing.platforms?.length ? existing.platforms : ['instagram'],
        results: toResults(ins, m, existing.results || {}),
      });
      summary.updated++;
    } else {
      db.create({
        title: titleFromCaption(m.caption, m.timestamp),
        caption: m.caption || '',
        platforms: ['instagram'],
        formatId: '',
        igFormat: mediaFormat(m),
        status: 'postado',
        date,
        postedAt: date,
        link: m.permalink,
        igMediaId: m.id,
        source: 'instagram',
        results: toResults(ins, m),
      });
      summary.created++;
    }
  }
  return summary;
}
