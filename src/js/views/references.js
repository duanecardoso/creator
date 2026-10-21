// D. Biblioteca de referências: estudar princípios sem copiar o original.
import * as data from '../data.js';
import { h, put, clear, openEditor, filterBar, matches, pill, attempt, emptyState, confirmDialog, go } from '../ui.js';
import { NICHES, FORMATS, PLATFORMS, REF_CATEGORIES, labelOf } from '../constants.js';

const filters = { q: '', category: '', niche: '', format: '' };
const expanded = new Set();

const rerender = () => {
  const main = document.getElementById('main');
  clear(main);
  render(main, {});
};

const usedIn = (col, refId) => data.all(col).filter((r) => (r.referenceIds || []).includes(refId));

function fields() {
  return [
    { name: 'title', label: 'Nome curto', required: true, placeholder: 'Ex.: review de sérum com plot twist' },
    { name: 'url', label: 'Link', type: 'url', placeholder: 'https://' },
    { name: 'category', label: 'Categoria', type: 'select', options: REF_CATEGORIES },
    { name: 'niche', label: 'Nicho', type: 'select', options: NICHES },
    { name: 'format', label: 'Formato', type: 'select', options: FORMATS },
    { name: 'platform', label: 'Plataforma', type: 'select', options: PLATFORMS },
    { name: 'author', label: 'Perfil / marca de origem' },
    { name: 'hook', label: 'Gancho utilizado', type: 'textarea', rows: 2 },
    { name: 'attention', label: 'O que chamou minha atenção', type: 'textarea', rows: 3 },
    { name: 'structure', label: 'Estrutura que quero estudar', type: 'textarea', rows: 3, placeholder: 'Ex.: abre no resultado, volta para o problema, termina com opinião sincera' },
    { name: 'adaptation', label: 'Como adaptar o princípio ao meu jeito (sem copiar)', type: 'textarea', rows: 3 },
    { name: 'tags', label: 'Etiquetas', placeholder: 'separe por vírgula', full: true },
    { name: 'linkedIdeas', label: 'Ideias relacionadas', type: 'relation', options: () => data.all('ideas').map((i) => ({ value: i.id, label: i.title || 'Ideia' })), emptyText: 'Nenhuma ideia ainda.' },
    { name: 'linkedScripts', label: 'Roteiros relacionados', type: 'relation', options: () => data.all('scripts').map((s) => ({ value: s.id, label: s.title || 'Roteiro' })), emptyText: 'Nenhum roteiro ainda.' },
  ];
}

// O vínculo fica guardado em ideias/roteiros (campo referenceIds). Aqui sincronizamos os dois lados.
async function syncLinks(refId, col, wanted) {
  const want = new Set(wanted);
  for (const rec of data.all(col)) {
    const has = (rec.referenceIds || []).includes(refId);
    if (want.has(rec.id) && !has) await data.update(col, rec.id, { referenceIds: [...(rec.referenceIds || []), refId] });
    if (!want.has(rec.id) && has) await data.update(col, rec.id, { referenceIds: rec.referenceIds.filter((x) => x !== refId) });
  }
}

export function editReference(ref = {}) {
  openEditor({
    title: ref.id ? 'Editar referência' : 'Nova referência',
    fields: fields(),
    values: { ...ref, linkedIdeas: ref.id ? usedIn('ideas', ref.id).map((i) => i.id) : [], linkedScripts: ref.id ? usedIn('scripts', ref.id).map((s) => s.id) : [] },
    onSave: async (v) => {
      const { linkedIdeas, linkedScripts, ...rest } = v;
      const saved = ref.id ? await data.update('references', ref.id, rest) : await data.create('references', rest);
      await syncLinks(saved.id, 'ideas', linkedIdeas);
      await syncLinks(saved.id, 'scripts', linkedScripts);
      return saved;
    },
    onDelete: ref.id ? () => data.remove('references', ref.id) : null,
  });
}

export function render(root) {
  const all = data.all('references');
  const list = all
    .filter((r) => ['category', 'niche', 'format'].every((k) => !filters[k] || r[k] === filters[k]))
    .filter((r) => matches(r, filters.q, ['title', 'url', 'author', 'hook', 'attention', 'structure', 'adaptation', 'tags']))
    .sort((a, b) => String(b.createdAt).localeCompare(a.createdAt));

  put(root, 
    h('header', { class: 'page-head' },
      h('div', {}, h('h1', {}, 'Biblioteca de referências'), h('p', { class: 'lede' }, 'Guarde o que chamou sua atenção e anote o princípio por trás, não o conteúdo.')),
      h('button', { class: 'btn btn-primary', onclick: () => editReference() }, '+ Referência'),
    ),
    filterBar(filters, { onChange: rerender, selects: [
      { key: 'category', label: 'Categoria', options: REF_CATEGORIES },
      { key: 'niche', label: 'Nicho', options: NICHES },
      { key: 'format', label: 'Formato', options: FORMATS },
    ] }),
    h('section', { class: 'panel' },
      h('div', { class: 'section-head' }, h('h2', {}, 'Referências'), h('span', { class: 'count' }, `${list.length} de ${all.length}`)),
      !all.length
        ? emptyState('Biblioteca vazia.', 'Salve aqui vídeos, anúncios, posts, ganchos e roteiros que você quer estudar.', h('button', { class: 'btn', onclick: () => editReference() }, '+ Referência'))
        : !list.length ? emptyState('Nada encontrado com esses filtros.')
          : h('ul', { class: 'entries' }, list.map(row)),
    ),
  );
}

function row(r) {
  const open = expanded.has(r.id);
  const ideas = usedIn('ideas', r.id);
  const scripts = usedIn('scripts', r.id);
  const tags = String(r.tags || '').split(',').map((t) => t.trim()).filter(Boolean);
  return h('li', { class: 'entry' },
    h('button', { class: 'entry-toggle', 'aria-expanded': String(open), onclick: () => { open ? expanded.delete(r.id) : expanded.add(r.id); rerender(); } },
      h('span', { class: 'entry-title' }, r.title || r.url || 'Referência'),
      h('span', { class: 'entry-sub' }, r.hook ? `Gancho: ${r.hook}` : r.attention || ''),
    ),
    h('p', { class: 'meta' }, pill(labelOf(REF_CATEGORIES, r.category)), pill(labelOf(NICHES, r.niche)), pill(labelOf(FORMATS, r.format)), tags.map((t) => pill(`#${t}`, 'soft')),
      (ideas.length || scripts.length) ? h('span', { class: 'muted small' }, `usada em ${ideas.length} ideia(s), ${scripts.length} roteiro(s)`) : null),
    open && h('dl', { class: 'details' },
      [['Origem', r.author], ['Gancho', r.hook], ['O que chamou atenção', r.attention], ['Estrutura a estudar', r.structure], ['Como adaptar', r.adaptation]]
        .filter(([, v]) => v).map(([k, v]) => [h('dt', {}, k), h('dd', {}, v)]),
      ideas.length > 0 && [h('dt', {}, 'Ideias'), h('dd', {}, ideas.map((i) => i.title).join(' · '))],
      scripts.length > 0 && [h('dt', {}, 'Roteiros'), h('dd', {}, scripts.map((s) => s.title).join(' · '))],
    ),
    h('div', { class: 'row-actions' },
      h('button', { class: 'btn btn-small', onclick: () => editReference(r) }, 'Editar'),
      h('button', { class: 'btn btn-small', onclick: () => go('ideias', { ref: r.id }) }, 'Usar no laboratório'),
      r.url && h('a', { class: 'btn btn-small btn-ghost', href: r.url, target: '_blank', rel: 'noopener noreferrer' }, 'Abrir link'),
      h('button', { class: 'btn btn-small btn-ghost', onclick: async () => { if (await confirmDialog(`Excluir "${r.title}"? Os vínculos com ideias e roteiros também serão removidos.`)) attempt(() => data.remove('references', r.id), 'Referência excluída.'); } }, 'Excluir'),
    ),
  );
}
