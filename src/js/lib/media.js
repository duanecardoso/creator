// Fotos dos designs, guardadas no IndexedDB do navegador (o localStorage é pequeno demais para imagens).
const DB = 'creator-media';
const STORE = 'photos';
const memory = new Map(); // reserva se o IndexedDB não estiver disponível
let dbp = null;

function open() {
  if (!('indexedDB' in globalThis)) return Promise.resolve(null);
  dbp ||= new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbp;
}

function tx(mode, fn) {
  return open().then((db) => {
    if (!db) return fn(null);
    return new Promise((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const r = fn(t.objectStore(STORE));
      t.oncomplete = () => resolve(r?.result);
      t.onerror = () => reject(t.error);
    });
  });
}

export const putPhoto = (id, blob) => tx('readwrite', (s) => (s ? s.put(blob, id) : memory.set(id, blob)));
export const getPhoto = (id) => (id ? tx('readonly', (s) => (s ? s.get(id) : { result: memory.get(id) })) : Promise.resolve(null));
export const deletePhoto = (id) => tx('readwrite', (s) => (s ? s.delete(id) : memory.delete(id)));

// Reduz a foto (até 1600px no lado maior) e converte para JPEG.
export async function shrink(file, max = 1600) {
  const img = await loadImage(file);
  const s = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * s);
  c.height = Math.round(img.height * s);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return new Promise((resolve) => c.toBlob((b) => resolve(b), 'image/jpeg', 0.86));
}

export function loadImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não consegui abrir essa imagem.'));
    };
    img.src = url;
  });
}

export const newPhotoId = () => `ph-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
