// Plano semanal automático (segunda a sexta, ou os 7 dias). Funções puras e determinísticas por semana.
import { FORMATS, FORMAT_META, metaOf } from './formats.js';
import { THEMES, nichesFromProfile } from './themes.js';
import { slidesFor, needsPhoto } from './designs.js';
import { addDays, weekStart, hits, parse, iso } from './insights.js';

export const DEFAULT_MIX = { video: 3, carrossel: 1, estatico: 1 };
// Funil ao longo da semana: começa atraindo (topo), aprofunda (meio) e fecha mostrando o trabalho (fundo).
// Seg e ter topo, qua e qui meio, sex e sáb fundo, dom topo. Com 5 dias: topo, topo, meio, meio, fundo.
export const FUNNEL_WEEK = ['seguidores', 'seguidores', 'comunidade', 'comunidade', 'marcas', 'marcas', 'seguidores'];
// Para temas do banco sem formato definido: formatos que servem para qualquer assunto.
const NEUTRAL = {
  video: { seguidores: ['opiniao-impopular', 'pov-identificacao', 'nao-sei-se-faz-sentido'], comunidade: ['storytime', 'isso-e-conteudo', 'grwm-conversa'], marcas: ['bastidores-ugc', 'ugc-reconstrucao'] },
  carrossel: { seguidores: ['carrossel-storytelling', 'expectativa-realidade'], comunidade: ['carrossel-storytelling', 'conversa-imessage'], marcas: ['bastidores-ugc'] },
  estatico: { seguidores: ['notas-opiniao', 'opiniao-impopular'], comunidade: ['notas-opiniao', 'lembretes-lista'], marcas: ['notas-opiniao'] },
};
export const planDays = (profile = {}) => (Number(profile.planDays) === 7 ? 7 : 5);

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
export const weekdays = (monday, n = 5) => Array.from({ length: n === 7 ? 7 : 5 }, (_, i) => addDays(monday, i));

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
// Escolhe com peso (linhas editoriais com peso maior aparecem mais).
function weightedPick(list, weightOf, r) {
  const total = list.reduce((a, x) => a + weightOf(x), 0);
  let x = r() * total;
  for (const it of list) {
    x -= weightOf(it);
    if (x <= 0) return it;
  }
  return list[list.length - 1];
}

/**
 * bank: seus temas prontos ({ id, title, goal, type?, formatId?, line?, hook? }). Têm prioridade sobre os modelos genéricos.
 * profile.lines: [{ name, weight }] dá o peso de cada linha editorial na escolha.
 */
export function generateWeek({ monday, contents = [], deals = [], profile = {}, customFormats = [], bank = [], seed = '' }) {
  const r = rng(`${monday}:${seed}`);
  const n = planDays(profile);
  const days = weekdays(monday, n);
  const focus = FUNNEL_WEEK.slice(0, n);
  const mix = { ...DEFAULT_MIX, ...(profile.mix || {}) };
  let types = [];
  for (const [t, k] of Object.entries(mix)) for (let i = 0; i < k; i++) types.push(t);
  types = shuffle(types, r).slice(0, n);
  while (types.length < n) types.push('video');
  types = shuffle(types, r);
  // Encaixa cada tipo num dia cujo foco tenha formato daquele tipo (ex.: estático não serve para "marcas").
  const fitsGoal = (t, g) => [...FORMATS, ...customFormats].some((f) => (f.goals || []).includes(g) && (customFormats.includes(f) ? !f.types?.length || f.types.includes(t) : metaOf(f.id).types.includes(t)));
  for (let i = 0; i < n; i++) {
    if (fitsGoal(types[i], focus[i])) continue;
    const j = types.findIndex((t, k) => k !== i && fitsGoal(t, focus[i]) && fitsGoal(types[i], focus[k]));
    if (j >= 0) [types[i], types[j]] = [types[j], types[i]];
  }

  // Escolhe antes os temas do seu banco para cada dia e ajeita os tipos para respeitar o que o tema pede.
  const lineWeight = new Map((profile.lines || []).map((l) => [l.name, Math.max(0, Number(l.weight) || 0)]));
  const recentTitles = new Set(contents.filter((c) => (c.date || '') >= addDays(monday, -60)).flatMap((c) => [c.theme, c.title]).filter(Boolean));
  const dealDay = (day) => deals.some((d) => d.postDate === day && (d.type === 'publi' || d.type === 'tts') && d.status !== 'cancelado');
  const picks = [];
  const takenBank = new Set();
  days.forEach((day, i) => {
    if (dealDay(day)) return;
    const opts = bank.filter((b) => b && b.title && (b.goal || 'seguidores') === focus[i] && !takenBank.has(b.id) && !recentTitles.has(b.title));
    if (!opts.length) return;
    const pick = weightedPick(shuffle(opts, r), (b) => (lineWeight.size ? lineWeight.get(b.line) ?? 1 : 1) || 0.0001, r);
    takenBank.add(pick.id);
    picks[i] = pick;
  });
  picks.forEach((pick, i) => {
    if (!pick?.type || types[i] === pick.type) return;
    const j = types.findIndex((t, k) => k !== i && t === pick.type && picks[k]?.type !== t);
    if (j >= 0) [types[i], types[j]] = [types[j], types[i]];
  });

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

    // 1) Seu banco de temas, na etapa certa do funil.
    const pick = picks[i];
    if (pick) {
      const fitsT = (f) => (f.custom ? !f.types?.length || f.types.includes(type) : metaOf(f.id).types.includes(type));
      let format = pool.find((f) => f.id === pick.formatId && fitsT(f));
      if (!format) {
        const neutral = (NEUTRAL[type]?.[goal] || []).map((id) => pool.find((f) => f.id === id)).filter((f) => f && fitsT(f));
        format = neutral.find((f) => !usedFormats.has(f.id)) || neutral[0];
      }
      if (!format) {
        const cands = pool.filter((f) => fitsT(f) && (f.goals || []).includes(goal) && !usedFormats.has(f.id));
        const scored = (cands.length ? cands : pool.filter(fitsT)).map((f) => ({ f, s: (recentFormats.has(f.id) ? -2 : 0) + (hitFormats.has(f.id) ? 1.5 : 0) + r() * 2 })).sort((a, b) => b.s - a.s);
        format = scored[0]?.f;
      }
      if (format) {
        usedFormats.add(format.id);
        usedThemes.add(pick.title);
        const slides = type === 'carrossel' || type === 'estatico' ? slidesFor(format.id, type, { title: pick.title, goal }) : [];
        items.push({
          date: day, title: pick.title, theme: pick.title, type, goal, formatId: format.id,
          hook: pick.hook || '', altHooks: (format.hooks || []).slice(), steps: (format.structure || []).slice(),
          slides, needsPhoto: needsPhoto(slides), status: 'roteiro', bankId: pick.id, line: pick.line || '',
          platforms: format.platforms?.length ? format.platforms.slice() : ['instagram', 'tiktok'],
        });
        return;
      }
    }

    const fits = (f, t) => (f.custom ? !f.types?.length || f.types.includes(t) : metaOf(f.id).types.includes(t)) && (f.goals || []).includes(goal);
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
