// Estúdio: editor de design de carrossel/estático (prévia, edição de texto, foto e exportação).
import * as data from '../data.js';
import { h, clone, group, cell, toast, actionSheet, toggle, go, card, icon, confirmDelete } from '../ui.js';
import { drawSlide } from '../lib/render.js';
import { LAYOUTS, slidesFor, emptyFields, needsPhoto } from '../lib/designs.js';
import { putPhoto, getPhoto, deletePhoto, shrink, loadImage, newPhotoId } from '../lib/media.js';

const imgCache = new Map();
async function imageFor(slide) {
  if (!slide.photoId) return null;
  if (imgCache.has(slide.photoId)) return imgCache.get(slide.photoId);
  const blob = await getPhoto(slide.photoId);
  if (!blob) return null;
  const img = await loadImage(blob);
  imgCache.set(slide.photoId, img);
  return img;
}

const opts = (c, i, total, preview) => {
  const p = data.profile();
  return { palette: p.palette, dark: c.designDark ?? p.designDark, handle: p.instagram ? `@${p.instagram.replace(/^@/, '')}` : '', index: i, total, preview };
};

// Quantas fotos ainda faltam num conteúdo.
export const missingPhotos = (c) => (c.slides || []).filter((s) => s.photo && !s.photoId).length;

// Abre o Estúdio (página) para um conteúdo.
// Apaga as telas do design (e as fotos guardadas para elas). O conteúdo e os números continuam.
export async function deleteDesign(contentId) {
  const c = data.get('contents', contentId);
  if (!c) return false;
  if (!(await confirmDelete('o design deste conteúdo (as telas e as fotos usadas nelas; o conteúdo continua)'))) return false;
  for (const s of c.slides || []) {
    if (s.photoId) {
      imgCache.delete(s.photoId);
      await deletePhoto(s.photoId).catch(() => {});
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
  let dark = c.designDark ?? data.profile().designDark ?? false;
  if (studio.id !== contentId) Object.assign(studio, { id: contentId, sel: 0 });
  let sel = Math.min(studio.sel, Math.max(0, (c.slides?.length || 1) - 1));
  const big = h('canvas', { class: 'big-canvas', 'aria-label': 'Prévia da tela selecionada' });
  const drawBig = () => imageFor(slides[sel]).then((img) => drawSlide(big, slides[sel], { ...opts({ ...c, designDark: dark }, sel, slides.length, true), image: img }));

  const strip = h('div', { class: 'slide-strip', role: 'listbox', 'aria-label': 'Telas' });
  const editor = h('div', { class: 'slide-editor' });

  const persist = () => {
    // Salva sem redesenhar a página, para não perder o que está sendo digitado.
    c = data.update('contents', c.id, { slides, needsPhoto: needsPhoto(slides), designDark: dark, touched: true }, { silent: true });
    studio.sel = sel;
  };

  async function drawStrip() {
    strip.replaceChildren(...slides.map((s, i) => {
      const cv = h('canvas', { class: 'slide-canvas', 'aria-label': `Tela ${i + 1}: ${LAYOUTS[s.layout]}` });
      const b = h('button', { type: 'button', class: `slide-thumb${i === sel ? ' sel' : ''}`, role: 'option', 'aria-selected': String(i === sel), 'data-slide': i, onclick: () => { sel = i; studio.sel = i; drawStrip(); drawEditor(); } },
        cv, h('span', { class: 'slide-n' }, `${i + 1}`), s.photo && !s.photoId ? h('span', { class: 'need-photo' }, '📷') : null);
      imageFor(s).then((img) => drawSlide(cv, s, { ...opts({ ...c, designDark: dark }, i, slides.length, true), image: img }));
      return b;
    }));
    drawBig();
  }

  const redrawCurrent = () => {
    drawBig();
    const cv = strip.querySelector(`[data-slide="${sel}"] canvas`);
    if (cv) imageFor(slides[sel]).then((img) => drawSlide(cv, slides[sel], { ...opts({ ...c, designDark: dark }, sel, slides.length, true), image: img }));
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

  function drawEditor() {
    const s = slides[sel];
    if (!s) return editor.replaceChildren();
    const rows = [];
    if (s.photo) {
      const file = h('input', { type: 'file', accept: 'image/*', hidden: true, 'data-id': 'photo-input' });
      file.addEventListener('change', async () => {
        const f = file.files?.[0];
        if (!f) return;
        try {
          const blob = await shrink(f);
          const id = s.photoId || newPhotoId();
          await putPhoto(id, blob);
          imgCache.delete(id);
          change({ photoId: id });
          drawStrip();
          toast('Foto adicionada');
        } catch (e) {
          toast(e.message, 'error');
        }
      });
      rows.push(group({ header: 'Foto sua', footer: s.photoHint ? `Pedido: ${s.photoHint}` : null, children: [
        h('button', { type: 'button', class: 'cell tappable tint', 'data-id': 'add-photo', onclick: () => file.click() }, s.photoId ? '🔄 Trocar foto' : '📷 Adicionar foto'), file,
      ] }));
    }
    const fields = [];
    if (['capa', 'notas', 'foto'].includes(s.layout)) fields.push(input('Etiqueta (opcional)', s.kicker, (v) => change({ kicker: v })));
    if (s.layout !== 'imessage') fields.push(input(s.layout === 'foto' ? 'Legenda na foto (opcional)' : 'Título', s.title, (v) => change({ title: v }), { area: true, rows: 2, name: 'slide-title' }));
    if (['notas', 'capa', 'cta'].includes(s.layout)) fields.push(input(s.layout === 'notas' ? 'Texto' : 'Subtítulo', s.body, (v) => change({ body: v }), { area: true, rows: s.layout === 'notas' ? 6 : 2, name: 'slide-body' }));
    if (s.layout === 'lista') fields.push(input('Itens (um por linha; comece com "x " para marcar como feito)', (s.items || []).map((i) => `${i.done ? 'x ' : ''}${i.text}`).join('\n'), (v) => change({ items: v.split('\n').map((l) => ({ done: /^x\s/i.test(l), text: l.replace(/^x\s/i, '').trim() })).filter((i) => i.text) }), { area: true, rows: 6, name: 'slide-items' }));
    if (s.layout === 'imessage') {
      fields.push(input('Nome no topo', s.contact, (v) => change({ contact: v })));
      fields.push(input('Mensagens (uma por linha; "eu:" para as suas)', (s.messages || []).map((m) => `${m.me ? 'eu: ' : ''}${m.text}`).join('\n'), (v) => change({ messages: v.split('\n').filter((l) => l.trim()).map((l) => ({ me: /^eu:/i.test(l.trim()), text: l.trim().replace(/^eu:\s*/i, '') })) }), { area: true, rows: 6, name: 'slide-messages' }));
    }
    if (s.layout === 'widgets') {
      (s.cells || []).forEach((cl, k) => fields.push(input(cl.label || `Widget ${k + 1}`, cl.value, (v) => change({ cells: slides[sel].cells.map((x, j) => (j === k ? { ...x, value: v } : x)) }), { area: true, rows: 2, name: `cell-${k}` })));
    }
    if (s.hint) rows.unshift(h('p', { class: 'hint-line' }, `✏︎ ${s.hint}`));
    rows.push(group({ header: `Tela ${sel + 1} · ${LAYOUTS[s.layout]}`, children: fields }));
    rows.push(group({ children: [
      cell({ title: 'Layout', accessory: (() => {
        const sl = h('select', { 'aria-label': 'Layout', class: 'inline-select' }, Object.entries(LAYOUTS).map(([k, v]) => h('option', { value: k, selected: k === s.layout }, v)));
        sl.addEventListener('change', () => {
          const lay = sl.value;
          const base = { layout: lay, title: s.title, kicker: s.kicker };
          if (lay === 'foto') Object.assign(base, { photo: true, photoId: s.photoId, photoHint: s.photoHint || 'Foto sua' });
          if (lay === 'capa') Object.assign(base, { photo: s.photo, photoId: s.photoId, photoHint: s.photoHint });
          if (lay === 'lista') base.items = s.items || [{ text: '', done: false }];
          if (lay === 'widgets') base.cells = s.cells || [{ label: 'Um', value: '' }, { label: 'Dois', value: '' }, { label: 'Três', value: '' }, { label: 'Quatro', value: '' }];
          if (lay === 'imessage') base.messages = s.messages || [{ me: false, text: '' }, { me: true, text: '' }];
          if (lay === 'notas' || lay === 'cta') base.body = s.body || '';
          slides[sel] = base;
          persist();
          drawStrip();
          drawEditor();
        });
        return sl;
      })() }),
      s.layout === 'capa' && cell({ title: 'Capa com foto', accessory: toggle(Boolean(s.photo), (v) => { change({ photo: v, photoHint: s.photoHint || 'Foto sua com o produto' }); drawStrip(); drawEditor(); }, 'Capa com foto') }),
      h('div', { class: 'cell tool-row' },
        h('button', { type: 'button', class: 'tool', disabled: sel === 0, onclick: () => move(-1), 'aria-label': 'Mover para a esquerda' }, '‹'),
        h('button', { type: 'button', class: 'tool', disabled: sel === slides.length - 1, onclick: () => move(1), 'aria-label': 'Mover para a direita' }, '›'),
        h('button', { type: 'button', class: 'tool', 'data-id': 'add-slide', onclick: addSlide }, '+ Tela'),
        h('button', { type: 'button', class: 'tool', onclick: () => { slides.splice(sel + 1, 0, clone({ ...slides[sel], photoId: null })); sel++; persist(); drawStrip(); drawEditor(); } }, 'Duplicar'),
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
    if (lay === 'foto') Object.assign(base, { photo: true, photoHint: 'Foto sua' });
    if (lay === 'lista') base.items = [{ text: '', done: false }];
    if (lay === 'widgets') base.cells = [{ label: 'Um', value: '' }, { label: 'Dois', value: '' }, { label: 'Três', value: '' }, { label: 'Quatro', value: '' }];
    if (lay === 'imessage') base.messages = [{ me: false, text: '' }, { me: true, text: '' }];
    slides.splice(sel + 1, 0, base);
    sel++;
    persist();
    drawStrip();
    drawEditor();
  }

  async function exportAll() {
    const missing = slides.filter((s) => s.photo && !s.photoId).length;
    const empties = slides.map(emptyFields).filter((x) => x.length).length;
    if (missing || empties) {
      const go = await actionSheet({ title: 'Ainda falta', message: [missing && `${missing} foto(s) sua(s)`, empties && `texto em ${empties} tela(s)`].filter(Boolean).join(' e ') + '. Exportar mesmo assim?', actions: [{ label: 'Exportar assim', value: true, id: 'export-anyway' }] });
      if (!go) return;
    }
    const files = [];
    for (let i = 0; i < slides.length; i++) {
      const cv = document.createElement('canvas');
      drawSlide(cv, slides[i], { ...opts({ ...c, designDark: dark }, i, slides.length, false), image: await imageFor(slides[i]) });
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
  const miss = slides.filter((x) => x.photo && !x.photoId).length;
  return h('div', { class: 'studio' },
    h('div', { class: 'studio-stage' },
      h('div', { class: 'big-wrap' }, big),
      h('p', { class: 'subtle small' }, 'Prévia 1080×1350 (4:5 do feed). As dicas ✏︎ e os espaços de foto não aparecem na imagem exportada.'),
      strip),
    h('aside', { class: 'studio-panel' },
      card({ children: [
        h('div', { class: 'design-actions' },
          h('label', { class: 'mini-toggle' }, toggle(dark, (v) => { dark = v; persist(); drawStrip(); }, 'Tema escuro'), 'Tema escuro'),
          h('button', { type: 'button', class: 'btn btn-primary', 'data-id': 'export-design', onclick: exportAll }, icon('download'), 'Salvar imagens')),
        miss > 0 && h('p', { class: 'hint-line' }, `Faltam ${miss} foto(s) sua(s). Escolha a tela marcada com 📷.`),
        h('button', { type: 'button', class: 'btn btn-ghost btn-danger btn-sm', 'data-id': 'delete-design', onclick: async () => { if (await deleteDesign(contentId)) go('conteudo/estudio'); } }, 'Apagar design'),
      ] }),
      editor),
  );
}

export { missingPhotos as photosMissing };
