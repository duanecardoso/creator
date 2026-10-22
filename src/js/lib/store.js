// Banco de dados no navegador (localStorage). Tudo fica só neste aparelho/navegador.
// O "storage" é injetável para os testes rodarem fora do navegador.

export const COLLECTIONS = ['contents', 'references', 'brands', 'formats', 'deals', 'plans', 'reviews', 'bank'];
export const SCHEMA_VERSION = 3;
const KEY = 'creator:db';
const SNAP_KEY = 'creator:snapshot'; // cópia do dia anterior, para desfazer acidentes
const PROTECTED = new Set(['id', 'createdAt', 'updatedAt']);

export function newId() {
  if (globalThis.crypto?.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch {
      /* contexto não seguro: usa alternativa */
    }
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function defaultProfile() {
  return {
    name: '',
    instagram: '',
    tiktok: '',
    weeklyGoal: 5,
    autoPlan: true,
    mix: { video: 3, carrossel: 1, estatico: 1 },
    palette: {},
    designDark: false,
    niches: 'Beleza e moda, Fitness e saúde, Tecnologia e apps, Rotina e lifestyle',
    about:
      'Criadora UGC (reviews e demonstrativos de produtos, mais de 50 marcas atendidas) crescendo como influenciadora: rotina, gostos, projetos e processo de criação.',
    style:
      'Natural, com personalidade, opinião e humor quando faz sentido. Mostro o que estou testando e descobrindo, não dou aula. Storytelling, bastidores, reviews, cultura pop.',
    avoid:
      'Frases motivacionais genéricas, ganchos clichês ("oi gente", "você sabia"), tom de professora, texto com cara de IA, inventar dados, tendências ou benefícios de produto.',
  };
}

export function emptyDb() {
  const now = new Date().toISOString();
  const db = { meta: { schemaVersion: SCHEMA_VERSION, createdAt: now, updatedAt: now }, profile: defaultProfile() };
  for (const c of COLLECTIONS) db[c] = [];
  return db;
}

// Aceita backups deste app (inclusive da versão com servidor) e garante a forma esperada.
export function normalize(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Arquivo de backup inválido.');
  const db = emptyDb();
  db.meta = { ...db.meta, ...(data.meta || {}), schemaVersion: SCHEMA_VERSION };
  db.profile = { ...defaultProfile(), ...(data.profile || {}) };
  for (const col of COLLECTIONS) {
    const list = data[col] ?? [];
    if (!Array.isArray(list)) throw new Error(`Campo "${col}" deveria ser uma lista.`);
    db[col] = list.filter((r) => r && typeof r === 'object').map((r) => ({ ...r, id: typeof r.id === 'string' && r.id ? r.id : newId() }));
  }
  return db;
}

function clean(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Dados inválidos.');
  const out = {};
  for (const [k, v] of Object.entries(data)) if (!PROTECTED.has(k)) out[k] = v;
  return out;
}

export class Store {
  constructor(storage) {
    this.storage = storage;
    this.db = null;
  }

  load() {
    let raw = null;
    try {
      raw = this.storage.getItem(KEY);
    } catch {
      throw new Error('Este navegador bloqueou o armazenamento local (modo anônimo ou cookies bloqueados). Abra em uma janela normal.');
    }
    if (!raw) {
      this.db = emptyDb();
      this.save();
      return this.db;
    }
    try {
      this.db = normalize(JSON.parse(raw));
    } catch (err) {
      // Não sobrescreve: guarda o conteúdo danificado para recuperação.
      try {
        this.storage.setItem(`${KEY}:danificado`, raw);
      } catch {
        /* sem espaço */
      }
      throw new Error(`Os dados salvos estão danificados (${err.message}). Importe um backup em "Perfil e dados".`);
    }
    return this.db;
  }

  save() {
    this.db.meta.updatedAt = new Date().toISOString();
    const json = JSON.stringify(this.db);
    try {
      this.dailySnapshot();
      this.storage.setItem(KEY, json);
    } catch (err) {
      if (err?.name === 'QuotaExceededError' || /quota/i.test(err?.message || '')) {
        throw new Error('O espaço do navegador acabou. Baixe um backup e apague registros antigos.');
      }
      throw err;
    }
  }

  // Uma vez por dia guarda a versão anterior inteira, para recuperar um erro recente.
  dailySnapshot() {
    const today = new Date().toISOString().slice(0, 10);
    let snap = null;
    try {
      snap = JSON.parse(this.storage.getItem(SNAP_KEY) || 'null');
    } catch {
      snap = null;
    }
    if (snap?.day === today) return;
    const current = this.storage.getItem(KEY);
    if (current) this.storage.setItem(SNAP_KEY, JSON.stringify({ day: today, data: current }));
  }

  snapshotInfo() {
    try {
      const s = JSON.parse(this.storage.getItem(SNAP_KEY) || 'null');
      return s ? { day: s.day } : null;
    } catch {
      return null;
    }
  }

  restoreSnapshot() {
    const s = JSON.parse(this.storage.getItem(SNAP_KEY) || 'null');
    if (!s) throw new Error('Nenhuma cópia anterior disponível.');
    this.db = normalize(JSON.parse(s.data));
    this.storage.setItem(KEY, JSON.stringify(this.db));
    return counts(this.db);
  }

  assertCollection(col) {
    if (!COLLECTIONS.includes(col)) throw new Error(`Coleção desconhecida: ${col}`);
  }

  list(col) {
    this.assertCollection(col);
    return this.db[col];
  }

  get(col, id) {
    this.assertCollection(col);
    return this.db[col].find((r) => r.id === id);
  }

  create(col, data) {
    this.assertCollection(col);
    const now = new Date().toISOString();
    const rec = { ...clean(data), id: newId(), createdAt: now, updatedAt: now };
    this.db[col].push(rec);
    this.save();
    return rec;
  }

  update(col, id, patch) {
    const rec = this.get(col, id);
    if (!rec) throw new Error('Registro não encontrado (talvez já tenha sido excluído).');
    Object.assign(rec, clean(patch), { updatedAt: new Date().toISOString() });
    this.save();
    return rec;
  }

  remove(col, id) {
    if (!this.get(col, id)) throw new Error('Registro não encontrado.');
    this.db[col] = this.db[col].filter((r) => r.id !== id);
    // Remove vínculos que apontavam para o registro excluído.
    for (const c of COLLECTIONS) {
      for (const r of this.db[c]) {
        for (const [k, v] of Object.entries(r)) {
          if (Array.isArray(v) && v.includes(id)) r[k] = v.filter((x) => x !== id);
          else if (v === id && k.endsWith('Id')) r[k] = null;
        }
      }
    }
    this.save();
    return true;
  }

  setProfile(patch) {
    this.db.profile = { ...this.db.profile, ...clean(patch) };
    this.save();
    return this.db.profile;
  }

  importAll(data, mode = 'merge') {
    const incoming = normalize(data);
    // Pacote (ex.: perfil e ideias tirados das conversas do Claude): sempre junta e atualiza só os campos de perfil que vierem nele.
    const pack = data?.meta?.kind === 'pacote';
    if (pack && data.profile) this.db.profile = { ...this.db.profile, ...clean(data.profile) };
    if (mode === 'replace' && !pack) this.db = incoming;
    else {
      for (const col of COLLECTIONS) {
        const byId = new Map(this.db[col].map((r) => [r.id, r]));
        for (const r of incoming[col]) byId.set(r.id, r);
        this.db[col] = [...byId.values()];
      }
    }
    this.save();
    return counts(this.db);
  }

  sizeBytes() {
    return new Blob([JSON.stringify(this.db)]).size;
  }
}

export const counts = (db) => Object.fromEntries(COLLECTIONS.map((c) => [c, db[c].length]));

// Armazenamento em memória (testes e fallback).
export class MemoryStorage {
  constructor() {
    this.m = new Map();
  }
  getItem(k) {
    return this.m.has(k) ? this.m.get(k) : null;
  }
  setItem(k, v) {
    this.m.set(k, String(v));
  }
  removeItem(k) {
    this.m.delete(k);
  }
}

// Exportação dos conteúdos em CSV (Excel em pt-BR usa ";").
const CSV_COLS = [
  ['title', 'Título'], ['formatId', 'Formato'], ['platforms', 'Plataformas'], ['date', 'Data'], ['status', 'Status'], ['hook', 'Gancho'],
  ['link', 'Link'], ['r.views', 'Visualizações'], ['r.reach', 'Alcance'], ['r.likes', 'Curtidas'], ['r.comments', 'Comentários'],
  ['r.saves', 'Salvamentos'], ['r.shares', 'Compartilhamentos'], ['r.follows', 'Novos seguidores'], ['r.brandContacts', 'Contatos de marcas'], ['r.source', 'Origem'],
];
export function contentsToCsv(items) {
  const cell = (v) => {
    if (v === null || v === undefined) return '';
    const s = Array.isArray(v) ? v.join('+') : String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = items.map((p) => CSV_COLS.map(([k]) => cell(k.startsWith('r.') ? p.results?.[k.slice(2)] : p[k])).join(';'));
  return '\uFEFF' + [CSV_COLS.map(([, l]) => l).join(';'), ...rows].join('\r\n');
}
