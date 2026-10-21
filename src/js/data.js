// Dados no navegador, backup, Instagram e ponte com o Claude.
import { Store, MemoryStorage, counts, contentsToCsv } from './lib/store.js';
import * as ig from './lib/instagram.js';

const listeners = new Set();
let store = null;
let storage = null;
let persistent = false;

export async function init() {
  try {
    const t = '__t__';
    localStorage.setItem(t, t);
    localStorage.removeItem(t);
    storage = localStorage;
  } catch {
    storage = new MemoryStorage();
    store = new Store(storage);
    store.load();
    throw new Error('Este navegador não deixa o site salvar dados (janela anônima ou cookies bloqueados). Abra numa janela normal.');
  }
  store = new Store(storage);
  store.load();
  try {
    persistent = (await navigator.storage?.persist?.()) || false;
  } catch {
    persistent = false;
  }
}

export const isPersistent = () => persistent;
export const onChange = (fn) => listeners.add(fn);
export const emit = (what) => listeners.forEach((fn) => fn(what));

export const all = (col) => store?.list(col) ?? [];
export const get = (col, id) => store?.get(col, id);
export const profile = () => store?.db.profile ?? {};
export const sizeBytes = () => store?.sizeBytes() ?? 0;
export const snapshotInfo = () => store?.snapshotInfo();
export const stats = () => counts(store.db);

export function create(col, rec) {
  const r = store.create(col, rec);
  emit(col);
  return r;
}
export function update(col, id, patch) {
  const r = store.update(col, id, patch);
  emit(col);
  return r;
}
export function remove(col, id) {
  store.remove(col, id);
  emit(col);
  return true;
}
export function saveProfile(patch) {
  const p = store.setProfile(patch);
  emit('profile');
  return p;
}
export function importBackup(data, mode) {
  const c = store.importAll(data, mode);
  emit('*');
  return c;
}
export function restoreSnapshot() {
  const c = store.restoreSnapshot();
  emit('*');
  return c;
}

// ---------- Exportação ----------
function download(content, filename, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = filename;
  document.body.append(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1000);
}
const stamp = () => new Date().toISOString().slice(0, 10);
const META_KEY = 'creator:meta';
const meta = () => {
  try {
    return JSON.parse(storage.getItem(META_KEY) || '{}');
  } catch {
    return {};
  }
};
const setMeta = (patch) => storage.setItem(META_KEY, JSON.stringify({ ...meta(), ...patch }));

export function exportBackup() {
  // O token do Instagram não vai no backup.
  download(JSON.stringify(store.db, null, 2), `creator-backup-${stamp()}.json`, 'application/json');
  setMeta({ lastBackup: new Date().toISOString() });
}
export const exportCsv = () => download(contentsToCsv(all('contents')), `conteudos-${stamp()}.csv`, 'text/csv;charset=utf-8');
export const lastBackup = () => meta().lastBackup || null;

// ---------- Ponte com o Claude ----------
// Guarda qual pedido está "em andamento" para oferecer colar a resposta quando ela voltar.
const PENDING_KEY = 'creator:pending-ai';
export function setPendingAi(p) {
  if (p) sessionStorage.setItem(PENDING_KEY, JSON.stringify({ ...p, at: Date.now() }));
  else sessionStorage.removeItem(PENDING_KEY);
}
export function pendingAi() {
  try {
    const p = JSON.parse(sessionStorage.getItem(PENDING_KEY) || 'null');
    return p && Date.now() - p.at < 2 * 3600e3 ? p : null;
  } catch {
    return null;
  }
}

// ---------- Instagram ----------
export const igConfig = () => (storage ? ig.loadConfig(storage) : null);
export function saveIgConfig(cfg, { silent = false } = {}) {
  ig.saveConfig(storage, cfg);
  if (!silent) emit('instagram');
  return cfg;
}
export function disconnectInstagram() {
  ig.clearConfig(storage);
  emit('instagram');
}
export async function connectInstagram(token) {
  const clean = String(token || '').trim();
  if (!clean) throw new Error('Cole o token gerado no painel da Meta.');
  let cfg = { token: clean, tokenSetAt: new Date().toISOString(), apiVersion: ig.IG_DEFAULT_VERSION };
  const acc = await ig.fetchAccount(cfg);
  cfg = { ...cfg, username: acc.username, accountType: acc.account_type, followersCount: acc.followers_count ?? null };
  return saveIgConfig(cfg);
}

let syncing = null;
export const isSyncing = () => Boolean(syncing);
export function syncInstagram({ onProgress } = {}) {
  if (syncing) return syncing;
  syncing = (async () => {
    let cfg = igConfig();
    if (!cfg?.token) throw new Error('Instagram não conectado.');
    if (ig.needsRefresh(cfg)) {
      try {
        cfg = saveIgConfig(await ig.refreshToken(cfg), { silent: true });
      } catch (err) {
        if (err.kind === 'auth') throw err;
      }
    }
    try {
      const acc = await ig.fetchAccount(cfg);
      cfg = { ...cfg, username: acc.username, followersCount: acc.followers_count ?? cfg.followersCount };
    } catch (err) {
      if (err.kind === 'auth' || err.kind === 'network') throw err;
    }
    const summary = await ig.syncInstagram({
      cfg,
      limit: cfg.syncLimit || 30,
      onProgress,
      db: { list: () => store.list('contents'), create: (r) => store.create('contents', r), update: (id, p) => store.update('contents', id, p) },
    });
    saveIgConfig({ ...cfg, lastSync: new Date().toISOString(), lastSummary: summary, lastError: null, lastErrorKind: null }, { silent: true });
    emit('contents');
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
