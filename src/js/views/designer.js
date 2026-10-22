// Estúdio: editor de design de carrossel/estático (prévia, edição de texto, foto e exportação).
import * as data from '../data.js';
import { h, clone, group, cell, toast, actionSheet, toggle, go, card, icon, confirmDelete } from '../ui.js';
import { drawSlide } from '../lib/render.js';
import { LAYOUTS, slidesFor, emptyFields, needsPhoto, missingIn } from '../lib/designs.js';
import { BACKGROUNDS, DECOR } from '../lib/render.js';
import { putPhoto, getPhoto, deletePhoto, shrink, loadImage, newPhotoId } from '../lib/media.js';

const imgCache = new Map();
async function loadId(id) {
  if (!id) return null;
  if (imgCache.has(id)) return imgCache.get(id);
  const blob = await getPhoto(id);
  if (!blob) return null;
  const img = await loadImage(blob);
  imgCache.set(id, img);
  return img;
}
// Todas as fotos de uma tela (a grade usa 4).
export const imagesFor = (slide) => Promise.all((slide.layout === 'grade' ? [0, 1, 2, 3].map((i) => slide.photoIds?.[i]) : [slide.photoId]).map(loadId));

export const opts = (c, i, total, preview) => {
  const p = data.profile();
  const handle = p.instagram ? `@${p.instagram.replace(/^@/, '')}` : '';
  return { palette: p.palette, index: i, total, preview, bg: p.artBg || 'lilas', decor: 'estrelas', profile: { name: p.name || '', handle: handle.replace(/^@/, ''), bio: p.artBio || '' } };
};

// Quantas fotos ainda faltam num conteúdo.
export const missingPhotos = (c) => (c.slides || []).reduce((a, s) => a + missingIn(s), 0);

// Abre o Estúdio (página) para um conteúdo.
// Apaga as telas do design (e as fotos guardadas para elas). O conteúdo e os números continuam.
export async function deleteDesign(contentId) {
  const c = data.get('contents', contentId);
  if (!c) return false;
  if (!(await confirmDelete('o design deste conteúdo (as telas e as fotos usadas nelas; o conteúdo continua)'))) return false;
  for (const s of c.slides || []) {
    for (const id of [s.photoId, ...(s.photoIds || [])].filter(Boolean)) {
      imgCache.delete(id);
      await deletePhoto(id).catch(() => {});
    }
  }
  data.update('contents', contentId, { slides: [], needsPhoto: false, designDark: null, noDesign: true });
  toast('Design apagado');
  return true;
}

export function openDesigner(contentId) {
  const c = data.get('contents', contentId);
  // Abrir o design de propósito desfaz um "apagar design" anterior.
  if (c?.noDesign) data.update('contents', contentId, { noDesign: false }, { silent: true });
  document.querySelector('dialog.sheet[open] [data-id="sheet-cancel"], dialog.sheet[open] [data-id="sheet-done"]')?.click();
  go('conteudo/estudio', { id: contentId });
}

const studio = { id: null, sel: 0 };

// Monta o editor de design (prévia grande, telas e painel de edição) para a página do Estúdio.
export function buildDesigner(contentId) {
  let c = data.get('contents', contentId);
  if (!c) return null;
  if (!c.slides?.length) {
    const slides = slidesFor(c.formatId, c.type === 'estatico' ? 'estatico' : 'carrossel', { title: c.title, goal: c.goal });
    c = data.update('contents', c.id, { slides, needsPhoto: needsPhoto(slides) }, { silent: true });
  }
  let slides = clone(c.slides);
  if (studio.id !== contentId) Object.assign(studio, { id: contentId, sel: 0 });
  let sel = Math.min(studio.sel, Math.max(0, (c.slides?.length || 1) - 1));
  const big = h('canvas', { class: 'big-canvas', 'aria-label': 'Prévia da tela selecionada' });
  const drawBig = () => imagesFor(slides[sel]).then((imgs) => drawSlide(big, slides[sel], { ...opts(c, sel, slides.length, true), images: imgs }));

  const strip = h('div', { class: 'slide-strip', role: 'listbox', 'aria-label': 'Telas' });
  const editor = h('div', { class: 'slide-editor' });

  const persist = () => {
    // Salva sem redesenhar a página, para não perder o que está sendo digitado.
    c = data.update('contents', c.id, { slides, needsPhoto: needsPhoto(slides), touched: true }, { silent: true });
    studio.sel = sel;
  };

  async function drawStrip() {
    strip.replaceChildren(...slides.map((s, i) => {
      const cv = h('canvas', { class: 'slide-canvas', 'aria-label': `Tela ${i + 1}: ${LAYOUTS[s.layout]}` });
      const b = h('button', { type: 'button', class: `slide-thumb${i === sel ? ' sel' : ''}`, role: 'option', 'aria-selected': String(i === sel), 'data-slide': i, onclick: () => { sel = i; studio.sel = i; drawStrip(); drawEditor(); } },
        cv, h('span', { class: 'slide-n' }, `${i + 1}`), missingIn(s) ? h('span', { class: 'need-photo' }, `📷${missingIn(s) > 1 ? ` ${missingIn(s)}` : ''}`) : null);
      imagesFor(s).then((imgs) => drawSlide(cv, s, { ...opts(c, i, slides.length, true), images: imgs }));
      return b;
    }));
    drawBig();
  }

  const redrawCurrent = () => {
    drawBig();
    const cv = strip.querySelector(`[data-slide="${sel}"] canvas`);
    if (cv) imagesFor(slides[sel]).then((imgs) => drawSlide(cv, slides[sel], { ...opts(c, sel, slides.length, true), images: imgs }));
  };
  const change = (patch) => {
    slides[sel] = { ...slides[sel], ...patch };
    redrawCurrent();
    persist();
  };

  const input = (label, value, onInput, { area = false, rows = 3, name } = {}) => {
    const el = h(area ? 'textarea' : 'input', { 'aria-label': label, placeholder: label, rows: area ? rows : null, name });
    el.value = value || '';
    el.addEventListener('input', () => onInput(el.value));
    return h('label', { class: `cell ${area ? 'field-area' : 'field'}` }, h('span', { class: area ? 'field-label' : 'cell-title' }, label), el);
  };

  function photoButton(s, slot) {
    const file = h('input', { type: 'file', accept: 'image/*', hidden: true, 'data-id': s.layout === 'grade' ? `photo-input-${slot}` : 'photo-input' });
    file.addEventListener('change', async () => {
      const f = file.files?.[0];
      if (!f) return;
      try {
        const blob = await shrink(f);
        const cur = slides[sel];
        if (cur.layout === 'grade') {
          const ids = [0, 1, 2, 3].map((i) => cur.photoIds?.[i] || null);
          const id = ids[slot] || newPhotoId();
          await putPhoto(id, blob);
          imgCache.delete(id);
          ids[slot] = id;
          change({ photoIds: ids });
        } else {
          const id = cur.photoId || newPhotoId();
          await putPhoto(id, blob);
          imgCache.delete(id);
          change({ photoId: id });
        }
        drawStrip();
        drawEditor();
        toast('Foto adicionada');
      } catch (e) {
        toast(e.message, 'error');
      }
    });
    const has = s.layout === 'grade' ? Boolean(s.photoIds?.[slot]) : Boolean(s.photoId);
    const label = s.layout === 'grade' ? `${has ? '🔄' : '📷'} Foto ${slot + 1}` : has ? '🔄 Trocar foto' : '📷 Adicionar foto';
    return [h('button', { type: 'button', class: `cell tappable tint${has ? '' : ' need'}`, 'data-id': s.layout === 'grade' ? `add-photo-${slot}` : 'add-photo', onclick: () => file.click() }, label), file];
  }

  const select = (label, options, value, onChange, id) => cell({ title: label, accessory: (() => {
    const sl = h('select', { 'aria-label': label, class: 'inline-select', 'data-id': id }, options.map(([k, v]) => h('option', { value: k, selected: k === value }, v)));
    sl.addEventListener('change', () => onChange(sl.value));
    return sl;
  })() });

  const itemsText = (items) => (items || []).map((i) => `${i.done === false ? 'o ' : ''}${i.text}`).join('\n');
  const parseItems = (v, check) => v.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => (check && /^o\s/i.test(l) ? { text: l.slice(2).trim(), done: false } : { text: l, done: true }));

  function drawEditor() {
    const s = slides[sel];
    if (!s) return editor.replaceChildren();
    const rows = [];
    if (s.photo) {
      const n = s.layout === 'grade' ? 4 : 1;
      rows.push(group({ header: n > 1 ? 'Fotos suas (4)' : 'Foto sua', footer: s.photoHint ? `Pedido: ${s.photoHint}` : null, children: Array.from({ length: n }, (_, k) => photoButton(s, k)).flat() }));
    }
    const fields = [];
    const L = s.layout;
    if (L === 'capa') {
      fields.push(input('Título (use *palavra* para destacar)', s.title, (v) => change({ title: v }), { area: true, rows: 2, name: 'slide-title' }));
      fields.push(input('Barra de busca (opcional)', s.kicker, (v) => change({ kicker: v })));
    }
    if (L === 'grade') {
      fields.push(input('Título (ex.: segunda)', s.title, (v) => change({ title: v }), { area: true, rows: 2, name: 'slide-title' }));
      fields.push(input('Etiqueta rosa (opcional)', s.kicker, (v) => change({ kicker: v })));
      fields.push(input('To do list (opcional, um item por linha; "o " no começo = não feito)', itemsText(s.items), (v) => change({ items: parseItems(v, true) }), { area: true, rows: 4, name: 'slide-items' }));
    }
    if (L === 'notas') {
      fields.push(input('Texto de cima (opcional)', s.title, (v) => change({ title: v }), { area: true, rows: 3, name: 'slide-title' }));
      fields.push(input('Texto da nota', s.body, (v) => change({ body: v }), { area: true, rows: 6, name: 'slide-body' }));
    }
    if (L === 'baloes') {
      fields.push(input('Título (use *palavra* para destacar)', s.title, (v) => change({ title: v }), { area: true, rows: 2, name: 'slide-title' }));
      fields.push(input('Balões (um por linha, frases curtas)', itemsText(s.items), (v) => change({ items: parseItems(v, false) }), { area: true, rows: 8, name: 'slide-items' }));
    }
    if (L === 'lista') {
      fields.push(input('Título (opcional)', s.title, (v) => change({ title: v }), { area: true, rows: 2, name: 'slide-title' }));
      fields.push(input('Nome da lista', s.kicker, (v) => change({ kicker: v })));
      fields.push(input('Itens (um por linha; "o " no começo = não feito)', itemsText(s.items), (v) => change({ items: parseItems(v, true) }), { area: true, rows: 6, name: 'slide-items' }));
    }
    if (L === 'imessage') {
      fields.push(input('Mensagens (uma por linha; "eu:" para as suas)', (s.messages || []).map((m) => `${m.me ? 'eu: ' : ''}${m.text}`).join('\n'), (v) => change({ messages: v.split('\n').filter((l) => l.trim()).map((l) => ({ me: /^eu:/i.test(l.trim()), text: l.trim().replace(/^eu:\s*/i, '') })) }), { area: true, rows: 6, name: 'slide-messages' }));
    }
    if (L === 'foto') {
      fields.push(input('Local (opcional)', s.kicker, (v) => change({ kicker: v })));
      fields.push(input('Balão na foto (opcional)', s.title, (v) => change({ title: v }), { area: true, rows: 2, name: 'slide-title' }));
      fields.push(input('Pasta azul (opcional, ex.: photodump)', s.folder, (v) => change({ folder: v })));
    }
    if (L === 'cta') {
      fields.push(input('Balão cinza (em cima)', s.title, (v) => change({ title: v }), { area: true, rows: 2, name: 'slide-title' }));
      fields.push(input('Balão azul', s.body, (v) => change({ body: v }), { area: true, rows: 2, name: 'slide-body' }));
    }
    if (L === 'widgets') {
      (s.cells || []).forEach((cl, k) => fields.push(input(cl.label || `Item ${k + 1}`, cl.value, (v) => change({ cells: slides[sel].cells.map((x, j) => (j === k ? { ...x, value: v } : x)) }), { area: true, rows: 2, name: `cell-${k}` })));
    }
    if (s.hint) rows.unshift(h('p', { class: 'hint-line' }, `✏︎ ${s.hint}`));
    rows.push(group({ header: `Tela ${sel + 1} · ${LAYOUTS[L] || 'Balões'}`, children: fields }));
    const washedLayouts = ['notas', 'imessage', 'cta'].includes(L) || (['capa', 'baloes', 'lista'].includes(L) && !s.photo);
    rows.push(group({ children: [
      select('Tipo de tela', Object.entries(LAYOUTS), L, (lay) => {
        const base = { layout: lay, title: s.title, kicker: s.kicker, bg: s.bg, decor: s.decor };
        const wantsPhoto = ['capa', 'grade', 'foto', 'baloes', 'cta'].includes(lay);
        if (wantsPhoto) Object.assign(base, { photo: true, photoId: s.photoId, photoIds: s.photoIds, photoHint: s.photoHint || 'Foto sua' });
        if (['lista', 'baloes', 'grade'].includes(lay)) base.items = s.items || (s.cells || []).map((x) => ({ text: x.value ? `${x.label}: ${x.value}` : x.label, done: true }));
        if (lay === 'imessage') base.messages = s.messages || [{ me: false, text: '' }, { me: true, text: '' }];
        if (lay === 'notas' || lay === 'cta') base.body = s.body || '';
        slides[sel] = base;
        persist();
        drawStrip();
        drawEditor();
      }, 'layout-select'),
      ['capa', 'baloes', 'lista', 'imessage'].includes(L) && cell({ title: 'Com foto minha', accessory: toggle(Boolean(s.photo), (v) => { change({ photo: v, photoHint: s.photoHint || 'Foto sua' }); drawStrip(); drawEditor(); }, 'Com foto') }),
      L === 'capa' && select('Posição do título', [['meio', 'No meio'], ['baixo', 'Embaixo']], s.pos || 'meio', (v) => change({ pos: v })),
      washedLayouts && select('Fundo', Object.entries(BACKGROUNDS).map(([k, v]) => [k, v.label]), s.bg || data.profile().artBg || 'lilas', (v) => change({ bg: v }), 'bg-select'),
      L !== 'grade' && select('Enfeites', Object.entries(DECOR), s.decor || 'estrelas', (v) => change({ decor: v }), 'decor-select'),
      h('div', { class: 'cell tool-row' },
        h('button', { type: 'button', class: 'tool', disabled: sel === 0, onclick: () => move(-1), 'aria-label': 'Mover para a esquerda' }, '‹'),
        h('button', { type: 'button', class: 'tool', disabled: sel === slides.length - 1, onclick: () => move(1), 'aria-label': 'Mover para a direita' }, '›'),
        h('button', { type: 'button', class: 'tool', 'data-id': 'add-slide', onclick: addSlide }, '+ Tela'),
        h('button', { type: 'button', class: 'tool', onclick: () => { slides.splice(sel + 1, 0, clone({ ...slides[sel], photoId: null, photoIds: [] })); sel++; persist(); drawStrip(); drawEditor(); } }, 'Duplicar'),
        h('button', { type: 'button', class: 'tool destructive', disabled: slides.length < 2, onclick: () => { slides.splice(sel, 1); sel = Math.max(0, sel - 1); persist(); drawStrip(); drawEditor(); } }, 'Apagar'),
      ),
    ] }));
    editor.replaceChildren(...rows);
  }

  const move = (d) => {
    const j = sel + d;
    [slides[sel], slides[j]] = [slides[j], slides[sel]];
    sel = j;
    persist();
    drawStrip();
    drawEditor();
  };

  async function addSlide() {
    const lay = await actionSheet({ title: 'Nova tela', actions: Object.entries(LAYOUTS).map(([value, label]) => ({ label, value })) });
    if (!lay) return;
    const base = { layout: lay, title: '', body: '' };
    if (['capa', 'grade', 'foto', 'baloes', 'cta'].includes(lay)) Object.assign(base, { photo: true, photoHint: 'Foto sua' });
    if (['lista', 'baloes', 'grade'].includes(lay)) base.items = lay === 'grade' ? [] : [{ text: '', done: true }];
    if (lay === 'imessage') base.messages = [{ me: false, text: '' }, { me: true, text: '' }];
    slides.splice(sel + 1, 0, base);
    sel++;
    persist();
    drawStrip();
    drawEditor();
  }

  async function exportAll() {
    const missing = slides.reduce((a, s) => a + missingIn(s), 0);
    const empties = slides.map(emptyFields).filter((x) => x.length).length;
    if (missing || empties) {
      const go = await actionSheet({ title: 'Ainda falta', message: [missing && `${missing} foto(s) sua(s)`, empties && `texto em ${empties} tela(s)`].filter(Boolean).join(' e ') + '. Exportar mesmo assim?', actions: [{ label: 'Exportar assim', value: true, id: 'export-anyway' }] });
      if (!go) return;
    }
    const files = [];
    for (let i = 0; i < slides.length; i++) {
      const cv = document.createElement('canvas');
      drawSlide(cv, slides[i], { ...opts(c, i, slides.length, false), images: await imagesFor(slides[i]) });
      const blob = await new Promise((r) => cv.toBlob(r, 'image/jpeg', 0.93));
      const name = `${(c.title || 'post').replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 40)}-${String(i + 1).padStart(2, '0')}.jpg`;
      files.push(new File([blob], name, { type: 'image/jpeg' }));
    }
    // No iPhone, a folha de compartilhamento tem "Salvar Imagens" (vai direto para o Fotos).
    if (navigator.canShare?.({ files })) {
      try {
        await navigator.share({ files, title: c.title });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }
    for (const f of files) {
      const a = h('a', { href: URL.createObjectURL(f), download: f.name });
      document.body.append(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(a.href);
        a.remove();
      }, 1500);
    }
    toast(`${files.length} imagem(ns) baixada(s)`);
  }

  drawStrip();
  drawEditor();
  const miss = slides.reduce((a, x) => a + missingIn(x), 0);
  return h('div', { class: 'studio' },
    h('div', { class: 'studio-stage' },
      h('div', { class: 'big-wrap' }, big),
      h('p', { class: 'subtle small' }, 'Prévia 1080×1440 (3:4, o tamanho do feed). As dicas ✏︎ e os avisos de foto não aparecem na imagem salva.'),
      strip),
    h('aside', { class: 'studio-panel' },
      card({ children: [
        h('div', { class: 'design-actions' },
          h('span', { class: 'subtle small' }, 'Use *palavra* no título para deixá-la pesada.'),
          h('button', { type: 'button', class: 'btn btn-primary', 'data-id': 'export-design', onclick: exportAll }, icon('download'), 'Salvar imagens')),
        miss > 0 && h('p', { class: 'hint-line' }, `Faltam ${miss} foto(s) sua(s). Escolha a tela marcada com 📷.`),
        h('button', { type: 'button', class: 'btn btn-ghost btn-danger btn-sm', 'data-id': 'delete-design', onclick: async () => { if (await deleteDesign(contentId)) go('conteudo/estudio'); } }, 'Apagar design'),
      ] }),
      editor),
  );
}

export { missingPhotos as photosMissing };
