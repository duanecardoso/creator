// Plano semanal automático (segunda a sexta). Funções puras e determinísticas por semana.
import { FORMATS, FORMAT_META, metaOf } from './formats.js';
import { THEMES, nichesFromProfile } from './themes.js';
import { slidesFor, needsPhoto } from './designs.js';
import { addDays, weekStart, hits, parse, iso } from './insights.js';

export const DEFAULT_MIX = { video: 3, carrossel: 1, estatico: 1 };
const FOCUS = ['seguidores', 'marcas', 'comunidade', 'seguidores', 'comunidade'];

function rng(seed) {
  let h = 2166136261;
  for (const ch of String(seed)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
const shuffle = (arr, r) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Semana que o plano deve cobrir: a partir de sábado, a próxima; senão, a atual.
export function targetWeek(today) {
  const dow = parse(today).getDay(); // 0 dom, 6 sáb
  return dow === 6 || dow === 0 ? addDays(weekStart(today), 7) : weekStart(today);
}
export const weekdays = (monday) => [0, 1, 2, 3, 4].map((i) => addDays(monday, i));

// Deve gerar sozinho? Sábado ou domingo, para a próxima semana, se ainda não existe plano.
export function shouldAutoGenerate(today, plans) {
  const dow = parse(today).getDay();
  if (dow !== 6 && dow !== 0) return false;
  return !plans.some((p) => p.weekStart === targetWeek(today));
}

function fill(tpl, subject) {
  return tpl.replace('{S}', subject.charAt(0).toUpperCase() + subject.slice(1)).replace('{s}', subject).replace(/^./, (c) => c.toUpperCase());
}
const fillHook = (h, subject) => h.replace(/_{2,}/g, subject);

/**
 * Gera os conteúdos da semana.
 * contents: todos os conteúdos (para evitar repetir formatos/temas recentes)
 * deals: campanhas (publis e TikTok Shop com data de postagem entram no plano)
 */
export function generateWeek({ monday, contents = [], deals = [], profile = {}, customFormats = [], seed = '' }) {
  const r = rng(`${monday}:${seed}`);
  const days = weekdays(monday);
  const weekIndex = Math.round((parse(monday) - parse('2026-01-05')) / (7 * 864e5));
  const focus = FOCUS.map((_, i) => FOCUS[(i + weekIndex) % FOCUS.length]);
  const mix = { ...DEFAULT_MIX, ...(profile.mix || {}) };
  let types = [];
  for (const [t, n] of Object.entries(mix)) for (let i = 0; i < n; i++) types.push(t);
  types = shuffle(types, r).slice(0, 5);
  while (types.length < 5) types.push('video');
  // Encaixa cada tipo num dia cujo foco tenha formato daquele tipo (ex.: estático não serve para "marcas").
  const fitsGoal = (t, g) => [...FORMATS, ...customFormats].some((f) => (f.goals || []).includes(g) && (customFormats.includes(f) || metaOf(f.id).types.includes(t)));
  for (let i = 0; i < 5; i++) {
    if (fitsGoal(types[i], focus[i])) continue;
    const j = types.findIndex((t, k) => k !== i && fitsGoal(t, focus[i]) && fitsGoal(types[i], focus[k]));
    if (j >= 0) [types[i], types[j]] = [types[j], types[i]];
  }

  const recentFrom = addDays(monday, -21);
  const recentFormats = new Set(contents.filter((c) => (c.date || '') >= recentFrom).map((c) => c.formatId));
  const recentThemes = new Set(contents.filter((c) => (c.date || '') >= addDays(monday, -60)).map((c) => c.theme));
  const hitFormats = new Set(hits(contents).items.map((x) => x.content.formatId));
  const niches = shuffle(nichesFromProfile(profile), r);
  const pool = [...FORMATS, ...customFormats.map((f) => ({ ...f, custom: true }))];
  const usedFormats = new Set();
  const usedThemes = new Set();
  const items = [];

  days.forEach((day, i) => {
    // Publi / TikTok Shop com postagem neste dia ocupa o espaço.
    const deal = deals.find((d) => d.postDate === day && (d.type === 'publi' || d.type === 'tts') && d.status !== 'cancelado');
    if (deal) {
      items.push({
        date: day, title: `${deal.type === 'tts' ? 'TikTok Shop' : 'Publi'}: ${deal.brandName || deal.title || 'marca'}`,
        type: 'video', goal: 'marcas', formatId: '', theme: deal.product || '', dealId: deal.id, status: 'roteiro',
        steps: ['Conferir briefing e pontos obrigatórios', 'Gravar seguindo o roteiro aprovado', 'Postar com a marcação/link combinados'],
        platforms: deal.type === 'tts' ? ['tiktok'] : ['instagram'],
      });
      return;
    }
    const goal = focus[i];
    let type = types[i];
    const fits = (f, t) => (f.custom ? true : metaOf(f.id).types.includes(t)) && (f.goals || []).includes(goal);
    let candidates = pool.filter((f) => fits(f, type) && !usedFormats.has(f.id));
    if (!candidates.length) {
      type = 'video';
      candidates = pool.filter((f) => fits(f, 'video') && !usedFormats.has(f.id));
    }
    if (!candidates.length) candidates = pool.filter((f) => !usedFormats.has(f.id));
    const scored = candidates.map((f) => ({ f, s: (recentFormats.has(f.id) ? -2 : 0) + (hitFormats.has(f.id) ? 1.5 : 0) + r() * 2 })).sort((a, b) => b.s - a.s);
    const format = scored[0].f;
    usedFormats.add(format.id);

    const meta = metaOf(format.id);
    let subject = '';
    for (let k = 0; k < niches.length && !subject; k++) {
      const niche = niches[(i + k) % niches.length];
      const opts = shuffle(THEMES[niche]?.[meta.kind] || [], r).filter((t) => !usedThemes.has(t) && !recentThemes.has(t));
      if (opts.length) subject = opts[0];
    }
    if (!subject) subject = 'algo da sua rotina desta semana';
    usedThemes.add(subject);

    const title = format.custom ? `${format.name}: ${subject}` : fill(meta.title, subject);
    const slides = type === 'carrossel' || type === 'estatico' ? slidesFor(format.id, type, { title, goal }) : [];
    items.push({
      date: day,
      title,
      theme: subject,
      type,
      goal,
      formatId: format.id,
      hook: meta.hook ? fill(meta.hook, subject) : fillHook(format.hooks?.[0] || '', subject),
      altHooks: (format.hooks || []).slice(),
      steps: (format.structure || []).slice(),
      slides,
      needsPhoto: needsPhoto(slides),
      status: 'roteiro',
      platforms: format.platforms?.length ? format.platforms.slice() : ['instagram', 'tiktok'],
    });
  });
  return items;
}

export { iso, FORMAT_META };
