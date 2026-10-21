// Camada de dados: guarda tudo no navegador e avisa as telas quando algo muda.
import { Store, MemoryStorage, counts, postsToCsv } from './lib/store.js';
import { ideasPrompt, scriptPrompt, brandPrompt } from './lib/prompts.js';
import * as ig from './lib/instagram.js';

const listeners = new Set();
let store = null;
let storage = null;
let persistent = false;

function pickStorage() {
  try {
    const t = '__teste__';
    localStorage.setItem(t, t);
    localStorage.removeItem(t);
    return localStorage;
  } catch {
    return null;
  }
}

export async function init() {
  storage = pickStorage();
  if (!storage) {
    storage = new MemoryStorage();
    store = new Store(storage);
    store.load();
    throw new Error('Este navegador não permite salvar dados (janela anônima ou cookies bloqueados). Abra numa janela normal para não perder o que fizer.');
  }
  store = new Store(storage);
  store.load();
  // Pede ao navegador para não apagar os dados quando o espaço do aparelho ficar curto.
  try {
    persistent = (await navigator.storage?.persist?.()) || false;
  } catch {
    persistent = false;
  }
}

export const isPersistent = () => persistent;
export const onChange = (fn) => listeners.add(fn);
const emit = (col) => listeners.forEach((fn) => fn(col));

export const all = (col) => store?.list(col) ?? [];
export const get = (col, id) => store?.get(col, id);
export const profile = () => store?.db.profile ?? {};
export const sizeBytes = () => store?.sizeBytes() ?? 0;
export const snapshotInfo = () => store?.snapshotInfo();

export async function create(col, rec) {
  const r = store.create(col, rec);
  emit(col);
  return r;
}
export async function update(col, id, patch) {
  const r = store.update(col, id, patch);
  emit(col);
  return r;
}
export async function remove(col, id) {
  store.remove(col, id);
  emit(col);
  return true;
}
export async function saveProfile(patch) {
  const p = store.setProfile(patch);
  emit('profile');
  return p;
}
export async function importBackup(data, mode) {
  const c = store.importAll(data, mode);
  emit('*');
  return { counts: c };
}
export async function restoreSnapshot() {
  const c = store.restoreSnapshot();
  emit('*');
  return { counts: c };
}

// ---------- Exportação ----------
function download(content, filename, type) {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.append(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1000);
}
const stamp = () => new Date().toISOString().slice(0, 10);
export function exportBackup() {
  // O token do Instagram NÃO vai no backup (ele é uma senha de acesso).
  download(JSON.stringify(store.db, null, 2), `estudio-backup-${stamp()}.json`, 'application/json');
  saveIgConfig({ ...(igConfig() || {}), lastBackup: new Date().toISOString() }, { silent: true, keepIfEmpty: true });
}
export const exportCsv = () => download(postsToCsv(all('posts')), `publicacoes-${stamp()}.csv`, 'text/csv;charset=utf-8');
export const lastBackup = () => igConfig()?.lastBackup || null;
export const stats = () => counts(store.db);

// ---------- Prompts para o assistente de IA ----------
const pick = (col, ids) => (Array.isArray(ids) ? all(col).filter((r) => ids.includes(r.id)) : []);
export function buildPrompt(kind, body) {
  const p = profile();
  if (kind === 'ideas') {
    const b = body.briefing || {};
    return ideasPrompt({ briefing: b, profile: p, references: pick('references', b.referenceIds), brand: b.brandId && get('brands', b.brandId), existingTitles: all('ideas').map((i) => i.title).filter(Boolean) });
  }
  if (kind === 'script') {
    const r = body.request || {};
    return scriptPrompt({ request: r, profile: p, idea: r.ideaId && get('ideas', r.ideaId), references: pick('references', r.referenceIds), brand: r.brandId && get('brands', r.brandId) });
  }
  if (kind === 'brand') return brandPrompt({ brand: get('brands', body.brandId), profile: p, quantity: body.quantity });
  throw new Error('Tipo de prompt desconhecido.');
}

// ---------- Instagram ----------
export const igConfig = () => (storage ? ig.loadConfig(storage) : null);
export function saveIgConfig(cfg, { silent = false } = {}) {
  ig.saveConfig(storage, cfg);
  if (!silent) emit('instagram');
  return cfg;
}
export function disconnectInstagram() {
  const keep = igConfig()?.lastBackup;
  ig.clearConfig(storage);
  if (keep) ig.saveConfig(storage, { lastBackup: keep });
  emit('instagram');
}
export const igConnected = () => Boolean(igConfig()?.token);

export async function connectInstagram(token, apiVersion) {
  const clean = String(token || '').trim();
  if (!clean) throw new Error('Cole o token gerado no painel da Meta.');
  const now = new Date().toISOString();
  let cfg = { ...(igConfig() || {}), token: clean, tokenSetAt: now, tokenRefreshedAt: null, expiresAt: null, apiVersion: apiVersion || ig.IG_DEFAULT_VERSION };
  const acc = await ig.fetchAccount(cfg);
  cfg = { ...cfg, userId: acc.user_id || acc.id, username: acc.username, accountType: acc.account_type, followersCount: acc.followers_count ?? null, mediaCount: acc.media_count ?? null };
  return saveIgConfig(cfg);
}

let syncing = null;
export const isSyncing = () => Boolean(syncing);

// Sincroniza publicações e métricas. Renova o token antes, quando necessário.
export function syncInstagram({ limit, onProgress } = {}) {
  if (syncing) return syncing;
  syncing = (async () => {
    let cfg = igConfig();
    if (!cfg?.token) throw new Error('Instagram não conectado.');
    if (ig.needsRefresh(cfg)) {
      try {
        cfg = saveIgConfig(await ig.refreshToken(cfg), { silent: true });
      } catch (err) {
        if (err.kind === 'auth') throw err;
        // Outros erros de renovação não impedem a sincronização; tenta de novo na próxima.
      }
    }
    try {
      const acc = await ig.fetchAccount(cfg);
      cfg = { ...cfg, username: acc.username, accountType: acc.account_type, followersCount: acc.followers_count ?? cfg.followersCount, mediaCount: acc.media_count ?? cfg.mediaCount };
    } catch (err) {
      if (err.kind === 'auth' || err.kind === 'network') throw err;
    }
    const summary = await ig.syncInstagram({
      cfg,
      limit: limit || cfg.syncLimit || 30,
      onProgress,
      db: { list: () => store.list('posts'), create: (r) => store.create('posts', r), update: (id, p) => store.update('posts', id, p) },
    });
    saveIgConfig({ ...cfg, lastSync: new Date().toISOString(), lastSummary: summary, lastError: null, lastErrorKind: null }, { silent: true });
    emit('posts');
    return summary;
  })();
  syncing
    .catch((err) => {
      const cfg = igConfig();
      if (cfg) saveIgConfig({ ...cfg, lastError: err.message, lastErrorKind: err.kind || null, lastErrorAt: new Date().toISOString() }, { silent: true });
      emit('instagram');
    })
    .finally(() => {
      syncing = null;
    });
  return syncing;
}
