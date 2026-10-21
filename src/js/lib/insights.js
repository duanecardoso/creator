// Constância, resultados e sugestões. Funções puras (testáveis, sem DOM).
import { FORMATS } from './formats.js';

export const STATUSES = [
  { id: 'ideia', label: 'Ideia' },
  { id: 'roteiro', label: 'Roteiro' },
  { id: 'gravado', label: 'Gravado' },
  { id: 'editado', label: 'Editado' },
  { id: 'postado', label: 'Postado' },
];
export const statusIndex = (s) => Math.max(0, STATUSES.findIndex((x) => x.id === s));

// ---------- Datas (sempre no fuso local) ----------
export const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const parse = (s) => new Date(`${s}T12:00:00`);
export const addDays = (s, n) => {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};
export const weekStart = (s) => {
  const d = parse(s);
  return addDays(s, -((d.getDay() + 6) % 7)); // segunda-feira
};
export const weekDays = (s) => Array.from({ length: 7 }, (_, i) => addDays(weekStart(s), i));

const postedDate = (c) => c.postedAt || c.date || '';
const isPosted = (c) => c.status === 'postado';

// ---------- Constância ----------
export function weekProgress(contents, today, goal) {
  const start = weekStart(today);
  const end = addDays(start, 6);
  const inWeek = (c) => postedDate(c) >= start && postedDate(c) <= end;
  const posted = contents.filter((c) => isPosted(c) && inWeek(c)).length;
  const planned = contents.filter((c) => !isPosted(c) && c.date >= start && c.date <= end).length;
  return { posted, planned, goal: Math.max(1, Number(goal) || 1), start, end };
}

// Semanas seguidas em que a meta foi batida (a semana atual conta se já bateu).
export function streak(contents, today, goal) {
  const g = Math.max(1, Number(goal) || 1);
  let count = 0;
  let ws = weekStart(today);
  const current = weekProgress(contents, today, g);
  if (current.posted >= g) count++;
  for (let i = 0; i < 104; i++) {
    ws = addDays(ws, -7);
    if (weekProgress(contents, ws, g).posted >= g) count++;
    else break;
  }
  return count;
}

// ---------- Resultados ----------
const n = (v) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? null : Number(v));
export const hasResults = (c) => c.results && ['views', 'reach', 'likes', 'comments', 'saves', 'shares', 'follows', 'brandContacts'].some((k) => n(c.results[k]) !== null);

export function median(values) {
  const v = values.filter((x) => x !== null && Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

// Indicadores por conteúdo. Campo vazio = não informado (nunca vira zero).
export function scores(c) {
  const r = c.results || {};
  const views = n(r.views) ?? n(r.reach);
  const per1k = (x) => (x === null || !views ? null : (x / views) * 1000);
  const saves = n(r.saves);
  const shares = n(r.shares);
  return {
    views,
    value: saves === null && shares === null ? null : per1k((saves ?? 0) + (shares ?? 0)), // salvamentos + compartilhamentos por mil
    follows: per1k(n(r.follows)), // seguidores por mil visualizações
    comments: per1k(n(r.comments)),
    brand: n(r.brandContacts),
  };
}

export function confidence(count) {
  if (count < 3) return { level: 0, label: 'Poucos dados' };
  if (count < 6) return { level: 1, label: 'Sinal fraco' };
  if (count < 15) return { level: 2, label: 'Indício' };
  return { level: 3, label: 'Consistente' };
}

// Seus hits: conteúdos claramente acima da SUA mediana em seguidores, valor ou marcas.
export function hits(contents) {
  const measured = contents.filter((c) => isPosted(c) && hasResults(c));
  const out = [];
  if (measured.length < 5) {
    for (const c of measured) if ((scores(c).brand ?? 0) > 0) out.push({ content: c, reasons: ['trouxe contato de marca'] });
    return { items: out, enough: false, measured: measured.length };
  }
  const med = {
    follows: median(measured.map((c) => scores(c).follows)),
    value: median(measured.map((c) => scores(c).value)),
    views: median(measured.map((c) => scores(c).views)),
  };
  for (const c of measured) {
    const s = scores(c);
    const reasons = [];
    if (s.follows !== null && med.follows && s.follows >= med.follows * 1.5) reasons.push('trouxe mais seguidores');
    if (s.value !== null && med.value && s.value >= med.value * 1.5) reasons.push('muito salvo/compartilhado');
    if (s.views !== null && med.views && s.views >= med.views * 2) reasons.push('alcance acima do seu normal');
    if ((s.brand ?? 0) > 0) reasons.push('trouxe contato de marca');
    if (reasons.length) out.push({ content: c, reasons });
  }
  out.sort((a, b) => b.reasons.length - a.reasons.length);
  return { items: out, enough: true, measured: measured.length, medians: med };
}

export function byFormat(contents, customFormats = []) {
  const measured = contents.filter((c) => isPosted(c) && hasResults(c));
  const groups = new Map();
  for (const c of measured) {
    const k = c.formatId || 'sem-formato';
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(c);
  }
  const all = [...FORMATS, ...customFormats];
  return [...groups.entries()]
    .map(([formatId, list]) => ({
      formatId,
      format: all.find((f) => f.id === formatId) || null,
      count: list.length,
      views: median(list.map((c) => scores(c).views)),
      follows: median(list.map((c) => scores(c).follows)),
      value: median(list.map((c) => scores(c).value)),
      brand: list.reduce((a, c) => a + (scores(c).brand ?? 0), 0),
      confidence: confidence(list.length),
    }))
    .sort((a, b) => (b.follows ?? -1) - (a.follows ?? -1));
}

// Conteúdos postados há 1+ dia ainda sem resultados.
export const needsResults = (contents, today) =>
  contents.filter((c) => isPosted(c) && !hasResults(c) && postedDate(c) && postedDate(c) < today);

// ---------- Sugestões do dia ----------
// Alterna o foco ao longo da semana e prioriza formatos que não usou recentemente
// e os que já deram certo para você. Determinístico por dia (não muda a cada abertura).
const FOCUS_BY_WEEKDAY = ['comunidade', 'seguidores', 'marcas', 'comunidade', 'seguidores', 'marcas', 'seguidores'];

function seeded(seed) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export function suggestions(contents, today, { count = 3, shuffle = 0, customFormats = [] } = {}) {
  const pool = [...FORMATS, ...customFormats];
  const recent = new Set(contents.filter((c) => (c.date || '') >= addDays(today, -14)).map((c) => c.formatId));
  const hitFormats = new Set(hits(contents).items.map((h) => h.content.formatId));
  const rand = seeded(`${today}:${shuffle}`);
  const focusOrder = [FOCUS_BY_WEEKDAY[(parse(today).getDay() + 6) % 7], 'seguidores', 'comunidade', 'marcas'];
  const goals = [...new Set(focusOrder)];
  const picked = [];
  for (const goal of goals) {
    if (picked.length >= count) break;
    const options = pool
      .filter((f) => f.goals?.includes(goal) && !picked.some((p) => p.format.id === f.id))
      .map((f) => ({ f, score: (recent.has(f.id) ? -2 : 0) + (hitFormats.has(f.id) ? 2 : 0) + rand() * 1.5 }))
      .sort((a, b) => b.score - a.score);
    if (options[0]) picked.push({ format: options[0].f, goal, reason: hitFormats.has(options[0].f.id) ? 'já funcionou pra você' : recent.has(options[0].f.id) ? 'você usou há pouco' : `foco do dia: ${goal}` });
  }
  return picked;
}
