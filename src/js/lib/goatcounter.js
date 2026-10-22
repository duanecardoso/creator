// Estatísticas do portfólio pela API do GoatCounter (https://www.goatcounter.com/api).
// A API aceita chamadas do navegador (CORS); a chave fica só neste aparelho e nunca vai para o backup.
// O portfólio envia: a visita da página (com ?ref= como origem) e eventos com estes caminhos:
//   video-<id do YouTube>, clique-<whatsapp|email|instagram|tiktok|youtube>, form-<contato|kit>,
//   secao-<trabalhos|servicos|numeros|contato>, idioma-<pt|en>.

export const GC_KEY = 'creator:goatcounter';
export const DEFAULT_GC = { site: 'duanecardoso', portfolioUrl: 'https://duanecardoso.github.io/ugc/' };

export class GcError extends Error {
  constructor(message, kind) {
    super(message);
    this.kind = kind; // auth | rate | network | other
  }
}

export function loadGc(storage) {
  try {
    return { ...DEFAULT_GC, ...(JSON.parse(storage.getItem(GC_KEY) || 'null') || {}) };
  } catch {
    return { ...DEFAULT_GC };
  }
}
export const saveGc = (storage, cfg) => storage.setItem(GC_KEY, JSON.stringify(cfg));

const siteCode = (s) => String(s || '').trim().replace(/^https?:\/\//, '').replace(/\.goatcounter\.com.*$/, '').replace(/[^a-z0-9-]/gi, '').toLowerCase();
export const dashboardUrl = (cfg) => `https://${siteCode(cfg.site)}.goatcounter.com`;
export const apiKeyUrl = (cfg) => `${dashboardUrl(cfg)}/user/api`;

// Data de início no formato que a API espera (hora cheia, UTC).
export function startOf(days, now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - (days - 1));
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

async function get(cfg, path, params, fetchImpl) {
  const code = siteCode(cfg.site);
  if (!code) throw new GcError('Informe o código do GoatCounter (ex.: duanecardoso).', 'other');
  if (!cfg.token) throw new GcError('Cole a chave da API do GoatCounter.', 'auth');
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)]));
  let res;
  try {
    res = await fetchImpl(`https://${code}.goatcounter.com/api/v0/${path}?${qs}`, { headers: { Authorization: `Bearer ${cfg.token}` } });
  } catch {
    throw new GcError('Sem conexão com o GoatCounter. Confira a internet e o código do site.', 'network');
  }
  if (res.status === 401 || res.status === 403) throw new GcError('O GoatCounter recusou a chave. Crie uma nova com a permissão "Read statistics".', 'auth');
  if (res.status === 429) throw new GcError('Muitas consultas seguidas. Espere um minuto e atualize.', 'rate');
  if (!res.ok) throw new GcError(`O GoatCounter respondeu com erro (${res.status}).`, 'other');
  return res.json();
}

// Busca tudo o que a página Portfólio mostra, de uma vez.
export async function fetchPortfolioStats(cfg, days = 30, fetchImpl = fetch, now = new Date()) {
  const start = startOf(days, now);
  const [hits, refs, locations, systems] = await Promise.all([
    get(cfg, 'stats/hits', { start, daily: true, limit: 100 }, fetchImpl),
    get(cfg, 'stats/toprefs', { start, limit: 20 }, fetchImpl),
    get(cfg, 'stats/locations', { start, limit: 10 }, fetchImpl),
    get(cfg, 'stats/systems', { start, limit: 10 }, fetchImpl),
  ]);
  return { days, start, fetchedAt: now.toISOString(), hits: hits.hits || [], refs: refs.stats || [], locations: locations.stats || [], systems: systems.stats || [] };
}

const isEvent = (h) => h.event === true || h.event === 1 || h.event === 'true';

// Transforma a resposta crua em números prontos para a tela (função pura, testada).
export function summarize(raw) {
  const hits = raw?.hits || [];
  const pages = hits.filter((h) => !isEvent(h));
  const events = hits.filter(isEvent);
  const ev = (p) => events.find((h) => h.path === p)?.count || 0;
  const daily = new Map();
  for (const h of pages) for (const s of h.stats || []) daily.set(s.day, (daily.get(s.day) || 0) + (s.daily || 0));
  const visits = pages.reduce((a, h) => a + (h.count || 0), 0);
  const videos = events
    .filter((h) => h.path.startsWith('video-'))
    .map((h) => ({ id: h.path.slice(6), title: String(h.title || h.path).replace(/^Vídeo:\s*/, ''), count: h.count || 0 }))
    .sort((a, b) => b.count - a.count);
  const clicks = Object.fromEntries(['whatsapp', 'email', 'instagram', 'tiktok', 'youtube'].map((k) => [k, ev(`clique-${k}`)]));
  const funnel = [
    { id: 'visitas', label: 'Abriram o portfólio', count: visits },
    { id: 'trabalhos', label: 'Chegaram em Trabalhos', count: ev('secao-trabalhos') },
    { id: 'servicos', label: 'Chegaram em Serviços', count: ev('secao-servicos') },
    { id: 'numeros', label: 'Chegaram em Números', count: ev('secao-numeros') },
    { id: 'contato', label: 'Chegaram em Contato', count: ev('secao-contato') },
  ];
  return {
    visits,
    daily: [...daily.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, count]) => ({ day, count })),
    videos,
    videoOpens: videos.reduce((a, v) => a + v.count, 0),
    clicks,
    contactClicks: clicks.whatsapp + clicks.email,
    forms: { contato: ev('form-contato'), kit: ev('form-kit') },
    english: ev('idioma-en'),
    funnel,
    refs: (raw?.refs || []).map((r) => ({ name: r.name || '', count: r.count || 0, tagged: r.ref_scheme === 'c' })),
    locations: (raw?.locations || []).map((r) => ({ name: r.name || '', count: r.count || 0 })),
    systems: (raw?.systems || []).map((r) => ({ name: r.name || '', count: r.count || 0 })),
  };
}

// Link do portfólio com etiqueta de origem (?ref=bio). Etiqueta só com letras, números e hífen.
export function taggedLink(base, ref) {
  const tag = String(ref || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!tag) return base;
  const u = new URL(base);
  u.searchParams.set('ref', tag);
  return u.toString();
}
