// Estúdio: galeria dos carrosséis e estáticos e o editor de design de cada um.
import * as data from '../data.js';
import { h, page, card, btn, go, fmtDay, emptyNote, tag, chips } from '../ui.js';
import { TYPES, formatById } from '../lib/formats.js';
import { drawSlide } from '../lib/render.js';
import { buildDesigner, missingPhotos } from './designer.js';
import { openContent } from './content-sheet.js';

const state = { filter: '' };
const rerender = () => document.dispatchEvent(new Event('rerender'));

function thumb(c) {
  const cv = h('canvas', { class: 'thumb-canvas', 'aria-hidden': 'true' });
  const p = data.profile();
  if (c.slides?.length) queueMicrotask(() => drawSlide(cv, c.slides[0], { palette: p.palette, dark: c.designDark ?? p.designDark, handle: '', index: 0, total: c.slides.length, preview: true }));
  return cv;
}

function gallery(root) {
  // Some da galeria: design apagado, ou post já publicado que nunca teve design.
  const all = data.all('contents').filter((c) => (c.type === 'carrossel' || c.type === 'estatico') && !c.noDesign && (c.slides?.length || c.status !== 'postado'))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const list = all.filter((c) => (state.filter === 'fotos' ? missingPhotos(c) > 0 : state.filter ? c.type === state.filter : true));
  root.append(page({
    kicker: 'Conteúdo',
    title: 'Estúdio',
    subtitle: 'Artes de carrossel e estático no seu estilo, prontas para salvar e postar.',
    children: [
      chips([{ value: 'carrossel', label: 'Carrosséis' }, { value: 'estatico', label: 'Estáticos' }, { value: 'fotos', label: 'Faltando foto' }], state.filter, (v) => { state.filter = v; rerender(); }),
      list.length
        ? h('div', { class: 'gallery' }, list.map((c) => {
          const miss = missingPhotos(c);
          const f = formatById(c.formatId, data.all('formats'));
          return h('button', { type: 'button', class: 'gallery-item', 'data-id': `studio-${c.id}`, onclick: () => go('conteudo/estudio', { id: c.id }) },
            h('span', { class: 'gallery-thumb' }, c.slides?.length ? thumb(c) : h('span', { class: 'gallery-empty' }, 'Sem telas ainda')),
            h('span', { class: 'gallery-meta' },
              h('span', { class: 'tags' }, tag(TYPES[c.type]?.label, `type-${c.type}`), miss ? tag(`📷 ${miss} foto(s)`, 'warn') : null),
              h('strong', {}, c.title),
              h('span', { class: 'subtle small' }, [c.date ? fmtDay(c.date) : 'sem data', f?.name, c.slides?.length ? `${c.slides.length} tela(s)` : null].filter(Boolean).join(' · '))));
        }))
        : emptyNote('Nenhuma arte por aqui', 'Carrosséis e estáticos do Planejamento aparecem aqui. Mude o tipo de um conteúdo para carrossel ou estático para criar a arte.'),
    ],
  }));
}

export function render(root, params = {}) {
  if (!params.id) return gallery(root);
  const c = data.get('contents', params.id);
  if (!c) {
    root.append(page({ title: 'Estúdio', children: emptyNote('Conteúdo não encontrado', 'Ele pode ter sido apagado.', btn('Ver todas as artes', () => go('conteudo/estudio'))) }));
    return;
  }
  if (c.noDesign) {
    root.append(page({ kicker: 'Estúdio', title: c.title || 'Sem título', children: emptyNote('Design apagado', 'O conteúdo continua salvo. Você pode criar um design novo quando quiser.', h('div', { class: 'btn-row' }, btn('Criar design de novo', () => { data.update('contents', c.id, { noDesign: false }); }, { kind: 'primary' }), btn('Todas as artes', () => go('conteudo/estudio'), { kind: 'ghost' }))) }));
    return;
  }
  const designer = buildDesigner(c.id);
  root.append(page({
    kicker: `Estúdio · ${TYPES[c.type]?.label || 'Arte'}`,
    title: c.title || 'Sem título',
    subtitle: [c.date ? fmtDay(c.date, { weekday: 'long', day: 'numeric', month: 'long' }) : null, formatById(c.formatId, data.all('formats'))?.name].filter(Boolean).join(' · '),
    actions: [
      btn('Todas as artes', () => go('conteudo/estudio'), { iconName: 'back', kind: 'ghost' }),
      btn('Abrir conteúdo', () => openContent(data.get('contents', c.id)), { id: 'open-content-from-studio' }),
    ],
    children: designer,
  }));
}
