// Editor de um conteúdo (folha). É a mesma tela para ideia, roteiro e post publicado.
import * as data from '../data.js';
import { h, sheet, group, cell, formGroups, toast, confirmDelete, badge } from '../ui.js';
import { FORMATS, GOALS, TYPES, formatById } from '../lib/formats.js';
import { openDesigner, missingPhotos } from './designer.js';
import { DEAL_TYPES, stageLabel } from '../lib/deals.js';
import { STATUSES, iso } from '../lib/insights.js';
import { contentPrompt, parseContent } from '../lib/prompts.js';
import { askClaude, onClaudeResult } from './claude.js';
import { checkHook } from '../lib/hookcheck.js';

export const formatOptions = () => [...FORMATS, ...data.all('formats')].map((f) => ({ value: f.id, label: `${f.emoji || '•'} ${f.name}` }));
export const today = () => iso(new Date());

// Resposta do Claude para um conteúdo: preenche o conteúdo (ou cria um novo).
onClaudeResult('content', (text, ctx) => {
  const r = parseContent(text);
  const patch = {
    ...(r.title ? { title: r.title } : {}),
    ...(r.hook ? { hook: r.hook } : {}),
    ...(r.hooks.length ? { altHooks: r.hooks } : {}),
    steps: r.steps,
    ...(r.caption ? { caption: r.caption } : {}),
    ...(r.cta ? { cta: r.cta } : {}),
    check: r.check,
    critique: r.critique,
  };
  let c = ctx.contentId && data.get('contents', ctx.contentId);
  if (c) {
    if (c.status === 'ideia') patch.status = 'roteiro';
    c = data.update('contents', c.id, patch);
  } else {
    c = data.create('contents', { title: 'Conteúdo do Claude', status: 'roteiro', date: today(), platforms: ['instagram', 'tiktok'], formatId: ctx.formatId || '', ...patch });
  }
  toast(r.loose ? 'Texto guardado como roteiro (veio sem o formato pedido).' : 'Roteiro preenchido pelo Claude.');
  setTimeout(() => openContent(c), 300);
});

export function claudeForContent(c) {
  const format = formatById(c.formatId, data.all('formats'));
  const hits = data.all('contents').filter((x) => x.status === 'postado' && x.id !== c.id && x.title).map((x) => x.title);
  askClaude({ kind: 'content', context: { contentId: c.id, formatId: c.formatId }, prompt: contentPrompt({ profile: data.profile(), format, topic: c.title === 'Novo conteúdo' ? '' : c.title, platform: (c.platforms || []).join(' e '), hits }) });
}

export function newContent(defaults = {}) {
  openContent({ title: '', status: 'ideia', platforms: ['instagram', 'tiktok'], date: '', ...defaults });
}

export function openContent(c) {
  const isNew = !c.id;
  const format = formatById(c.formatId, data.all('formats'));
  let status = c.status || 'ideia';
  const platforms = new Set(c.platforms || []);

  // Etapas (como um "stepper" de pedido de entrega)
  const stepper = h('div', { class: 'pipeline', role: 'radiogroup', 'aria-label': 'Etapa' });
  const drawStepper = () => {
    stepper.replaceChildren(...STATUSES.map((s, i) => h('button', {
      type: 'button', role: 'radio', 'aria-checked': String(s.id === status),
      class: `pipe${i <= STATUSES.findIndex((x) => x.id === status) ? ' done' : ''}${s.id === status ? ' on' : ''}`,
      onclick: () => { status = s.id; drawStepper(); resultsWrap.hidden = status !== 'postado'; },
    }, h('span', { class: 'dot' }), h('span', { class: 'pipe-label' }, s.label))));
  };
  const resultsWrap = h('div');
  drawStepper();

  const platformRow = group({ children: [
    cell({ emoji: '📸', color: 'pink', title: 'Instagram', accessory: pToggle('instagram') }),
    cell({ emoji: '🎵', color: 'dark', title: 'TikTok', accessory: pToggle('tiktok') }),
  ] });
  function pToggle(p) {
    const input = h('input', { type: 'checkbox', role: 'switch', class: 'switch', checked: platforms.has(p), 'aria-label': p });
    input.addEventListener('change', () => (input.checked ? platforms.add(p) : platforms.delete(p)));
    return input;
  }

  const main = formGroups([
    { fields: [
      { name: 'title', label: 'Título', placeholder: 'Sobre o que é?', showLabel: false, type: 'text' },
      { name: 'formatId', label: 'Formato', type: 'select', options: formatOptions, placeholder: 'Escolher…' },
      { name: 'type', label: 'Tipo', type: 'select', options: Object.entries(TYPES).map(([value, t]) => ({ value, label: `${t.emoji} ${t.label}` })), placeholder: false },
      { name: 'goal', label: 'Foco', type: 'select', options: Object.entries(GOALS).map(([value, g]) => ({ value, label: g.label })), placeholder: 'Livre' },
      { name: 'date', label: 'Data', type: 'date' },
      { name: 'theme', label: 'Tema', placeholder: 'Sobre o quê' },
    ] },
  ], { type: 'video', ...c });
  const typeSel = main.el.querySelector('select[name="type"]');

  const hookWarn = h('ul', { class: 'warn-list' });
  const script = formGroups([
    { header: 'Gancho', fields: [{ name: 'hook', label: 'Gancho', type: 'textarea', rows: 2, placeholder: 'A frase dos primeiros 2 segundos', showLabel: false }] },
    { header: 'Roteiro', footer: 'Um passo por linha.', fields: [{ name: 'steps', label: 'Roteiro', type: 'list', rows: 5, placeholder: 'Cena 1: …\nCena 2: …', showLabel: false }] },
    { header: 'Legenda e CTA', fields: [
      { name: 'caption', label: 'Legenda', type: 'textarea', rows: 3, showLabel: false, placeholder: 'Legenda' },
      { name: 'cta', label: 'CTA', placeholder: 'Chamada final' },
    ] },
  ], c);
  const hookInput = script.el.querySelector('textarea[name="hook"]');
  const updateWarn = () => hookWarn.replaceChildren(...checkHook(hookInput.value).map((w) => h('li', {}, w)));
  hookInput.addEventListener('input', updateWarn);
  updateWarn();
  hookInput.closest('.group').append(hookWarn);

  const brandOpts = () => data.all('brands').map((b) => ({ value: b.id, label: b.name }));
  const extra = formGroups([
    { header: 'Marcas', fields: [
      { name: 'portfolio', label: 'Usar no portfólio UGC', type: 'toggle' },
      { name: 'brandId', label: 'Marca', type: 'select', options: brandOpts },
    ] },
    { header: 'Notas', fields: [{ name: 'notes', label: 'Notas', type: 'textarea', rows: 2, showLabel: false, placeholder: 'Ideias soltas, referências…' }] },
  ], c);

  const r = c.results || {};
  const results = formGroups([
    { header: 'Resultados', footer: r.source === 'instagram' ? 'Números do Instagram são atualizados na sincronização. Contatos de marcas são seus.' : 'Preencha o que aparecer no app. Vazio = não sei (diferente de zero).', fields: [
      { name: 'link', label: 'Link do post', type: 'url', placeholder: 'https://' },
      { name: 'views', label: 'Visualizações', type: 'number' },
      { name: 'likes', label: 'Curtidas', type: 'number' },
      { name: 'comments', label: 'Comentários', type: 'number' },
      { name: 'saves', label: 'Salvamentos', type: 'number' },
      { name: 'shares', label: 'Compartilhamentos', type: 'number' },
      { name: 'follows', label: 'Novos seguidores', type: 'number' },
      { name: 'brandContacts', label: 'Contatos de marcas', type: 'number' },
    ] },
  ], { ...r, link: c.link });
  resultsWrap.append(results.el);
  resultsWrap.hidden = status !== 'postado';

  const formatCard = format && h('details', { class: 'format-help' },
    h('summary', {}, badge(format.emoji, format.color), h('span', {}, `Como fazer: ${format.name}`)),
    h('ol', {}, format.structure.map((s) => h('li', {}, s))),
    h('p', { class: 'muted small' }, 'Clique num gancho para usar:'),
    h('div', { class: 'hook-pills' }, [...(c.altHooks || []), ...format.hooks].map((t) => h('button', { type: 'button', class: 'hook-pill', onclick: () => { hookInput.value = t; updateWarn(); hookInput.focus(); } }, t))),
    format.tip && h('p', { class: 'tip' }, `💡 ${format.tip}`),
  );

  const notesFromClaude = Boolean(c.critique || (c.check || []).length) && group({ header: 'Do Claude', children: [
    c.critique && cell({ emoji: '🧐', color: 'orange', title: 'Ponto fraco', subtitle: c.critique }),
    (c.check || []).length > 0 && cell({ emoji: '✅', color: 'green', title: 'Confirmar antes de postar', subtitle: c.check.join(' · ') }),
  ] });

  const read = () => {
    const m = main.read();
    const s = script.read();
    const e = extra.read();
    const res = results.read();
    const { link, ...nums } = res;
    const out = { ...m, ...s, ...e, status, platforms: [...platforms], title: m.title || 'Novo conteúdo', touched: true };
    if (status === 'postado') {
      out.link = link;
      out.postedAt = c.postedAt || m.date || today();
      if (!out.date) out.date = out.postedAt;
      out.results = { ...(c.results || {}), ...nums, source: c.results?.source || 'manual' };
    }
    return out;
  };

  const deal = c.dealId && data.get('deals', c.dealId);
  const designBtn = h('div');
  const drawDesignBtn = () => {
    const ty = typeSel.value;
    if (ty !== 'carrossel' && ty !== 'estatico') return designBtn.replaceChildren();
    const miss = c.id ? missingPhotos(c) : 0;
    designBtn.replaceChildren(group({ footer: miss ? `Falta ${miss} foto(s) sua(s) para este design.` : 'Artes 1080×1350 no seu estilo iOS, prontas para salvar no Fotos.', children: [
      h('button', { type: 'button', class: 'cell tappable tint', 'data-id': 'content-design', onclick: () => {
        const saved = saveNow();
        document.querySelector('dialog.sheet [data-id="sheet-cancel"]')?.click();
        setTimeout(() => openDesigner(saved.id), 260);
      } }, miss ? `📷 Design: adicionar ${miss} foto(s)` : `🎨 Abrir design${c.slides?.length ? ` (${c.slides.length} tela${c.slides.length > 1 ? 's' : ''})` : ''}`),
    ] }));
  };
  typeSel.addEventListener('change', drawDesignBtn);
  drawDesignBtn();

  const saveNow = () => (isNew ? data.create('contents', read()) : data.update('contents', c.id, read()));

  sheet({
    title: isNew ? 'Novo conteúdo' : 'Conteúdo',
    tall: true,
    onSave: () => {
      saveNow();
      toast('Salvo');
    },
    body: h('div', { class: 'sheet-stack' },
      deal && group({ children: [cell({ emoji: DEAL_TYPES[deal.type]?.emoji, color: DEAL_TYPES[deal.type]?.color, title: `Campanha: ${deal.brandName}`, subtitle: `${DEAL_TYPES[deal.type]?.label} · ${stageLabel(deal)}`, chevron: true, onClick: () => import('./brands.js').then((m) => m.openDeal(deal)) })] }),
      main.el,
      stepper,
      designBtn,
      h('button', {
        type: 'button', class: 'btn-claude', 'data-id': 'content-claude',
        onclick: () => {
          const saved = saveNow();
          claudeForContent(saved);
          document.querySelector('dialog.sheet [data-id="sheet-cancel"]')?.click();
        },
      }, '✨ Escrever roteiro com o Claude'),
      formatCard,
      notesFromClaude,
      script.el,
      platformRow,
      resultsWrap,
      extra.el,
      !isNew && group({ children: [h('button', {
        type: 'button', class: 'cell tappable destructive', 'data-id': 'delete-content',
        onclick: async () => {
          if (await confirmDelete('este conteúdo')) {
            data.remove('contents', c.id);
            document.querySelector('dialog.sheet [data-id="sheet-cancel"]')?.click();
            toast('Apagado');
          }
        },
      }, 'Apagar conteúdo')] }),
    ),
  });
}
