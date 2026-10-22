// Componentes de interface da plataforma (menu lateral, cards, tabelas, painéis, gráficos).

export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = v; // usado só com SVG fixo do próprio app
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k in el && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  put(el, ...children);
  return el;
}

// Acrescenta filhos ignorando null/false/undefined.
export function put(el, ...children) {
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false || c === '') continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export const clear = (el) => {
  el.replaceChildren();
  return el;
};

export const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function fmtDay(isoDate, opts = { weekday: 'short', day: 'numeric', month: 'short' }) {
  if (!isoDate) return '';
  const d = new Date(`${isoDate}T12:00:00`);
  return Number.isNaN(d.getTime()) ? isoDate : d.toLocaleDateString('pt-BR', opts).replace('.', '');
}

export const fmtNum = (v) => (v === null || v === undefined ? '—' : Math.round(v).toLocaleString('pt-BR'));
export const fmtDec = (v) => (v === null || v === undefined ? '—' : v.toLocaleString('pt-BR', { maximumFractionDigits: 1 }));

export function go(path, params) {
  const qs = params ? `?${new URLSearchParams(params)}` : '';
  location.hash = `#/${path}${qs}`;
}

// ---------- Ícones (traço fino, desenhados à mão) ----------
const ICONS = {
  overview: '<rect x="3.5" y="3.5" width="7" height="8" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="5" rx="1.5"/><rect x="13.5" y="11.5" width="7" height="9" rx="1.5"/><rect x="3.5" y="14.5" width="7" height="6" rx="1.5"/>',
  plan: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4M8 13h3M8 16.5h6"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  studio: '<path d="M4 20l4.5-1 10.4-10.4a2.1 2.1 0 0 0-3-3L5.5 16z"/><path d="M14.5 7l2.5 2.5"/>',
  formats: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
  refs: '<path d="M7 3.5h10a1 1 0 0 1 1 1v16l-6-3.8-6 3.8v-16a1 1 0 0 1 1-1z"/>',
  campaigns: '<rect x="3.5" y="7.5" width="17" height="12" rx="2"/><path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5M3.5 12.5h17"/>',
  finance: '<rect x="3.5" y="6" width="17" height="13" rx="2"/><path d="M3.5 10h17M15.5 14.5h2"/>',
  contacts: '<circle cx="9" cy="9" r="3.5"/><path d="M3 19.5c.9-3 3.3-4.5 6-4.5s5.1 1.5 6 4.5"/><path d="M16 6.2a3 3 0 0 1 0 5.6M18 15.3c1.4.7 2.4 2 2.9 4.2"/>',
  performance: '<path d="M4 20V10M10 20V5M16 20v-7M21 20H3"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M4.4 6.3l1.7 1.7M17.9 16l1.7 1.7M2.8 12h2.4M18.8 12h2.4M4.4 17.7l1.7-1.7M17.9 8l1.7-1.7"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  chevron: '<path d="M9 5l7 7-7 7"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>',
  download: '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.5-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.5 4.5L20 16M20 20v-4h-4"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  camera: '<path d="M4 8.5h3l1.5-2h7l1.5 2h3v10H4z"/><circle cx="12" cy="13" r="3.2"/>',
};
export const icon = (name, cls = 'ic') =>
  h('span', { class: cls, 'aria-hidden': 'true', html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ICONS.plus}</svg>` });

// Quadradinho com emoji (identifica formato, tipo de campanha etc.).
export const badge = (emoji, color = 'gray') => h('span', { class: `badge c-${color}`, 'aria-hidden': 'true' }, emoji);
// Capa do post do Instagram. Se o link expirou ou falhou, mostra o emoji no lugar.
export function postThumb(c, { cls = 'post-thumb', emoji = '📷', color = 'gray' } = {}) {
  if (!c?.igThumb) return badge(emoji, color);
  const img = h('img', { class: cls, src: c.igThumb, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer', decoding: 'async' });
  img.addEventListener('error', () => img.replaceWith(badge(emoji, color)), { once: true });
  return img;
}
export const tag = (text, tone = '') => (text ? h('span', { class: `tag ${tone}` }, text) : null);

export const btn = (label, onClick, { kind = '', iconName, id, small = false, title } = {}) =>
  h('button', { type: 'button', class: `btn${kind ? ` btn-${kind}` : ''}${small ? ' btn-sm' : ''}`, onclick: onClick, 'data-id': id, title }, iconName && icon(iconName), label && h('span', { class: 'btn-label' }, label));

// ---------- Página ----------
// Cabeçalho (seção, título, subtítulo, ações) + corpo. "right" é mantido por compatibilidade = ações.
export function page({ kicker, title, subtitle, right, actions, children }) {
  return h('div', { class: 'page' },
    h('header', { class: 'page-head' },
      h('div', {}, kicker && h('p', { class: 'page-kicker' }, kicker), h('h1', { class: 'page-title' }, title), subtitle && h('p', { class: 'page-sub' }, subtitle)),
      h('div', { class: 'page-actions' }, actions, right),
    ),
    h('div', { class: 'page-body' }, children),
  );
}

export function section({ title, actions, children, id }) {
  return h('section', { class: 'section', id },
    title && h('div', { class: 'section-title' }, h('h2', {}, title), actions),
    children);
}

// ---------- Cards e indicadores ----------
export function card({ title, subtitle, actions, children, foot, flush = false, cls = '', id }) {
  return h('article', { class: `card ${cls}`, 'data-id': id },
    (title || actions) && h('header', { class: 'card-head' }, h('div', {}, title && h('h3', {}, title), subtitle && h('p', { class: 'card-sub' }, subtitle)), actions),
    h('div', { class: `card-body${flush ? ' flush' : ''}` }, children),
    foot && h('footer', { class: 'card-foot' }, foot),
  );
}

export function kpi({ label, value, hint, tone = '', meter = null, id }) {
  return h('div', { class: `card kpi${tone ? ` tone-${tone}` : ''}`, 'data-id': id },
    h('p', { class: 'kpi-label' }, label),
    h('p', { class: 'kpi-value' }, value),
    meter !== null && h('div', { class: 'meter', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(Math.round(meter * 100)) }, h('span', { style: { width: `${Math.min(100, Math.round(meter * 100))}%` } })),
    hint && h('p', { class: 'kpi-hint' }, hint),
  );
}

// ---------- Listas (cards com linhas) ----------
export function group({ header, footer, children, cls = '' }) {
  const items = [children].flat(Infinity).filter((c) => c !== null && c !== undefined && c !== false);
  return h('section', { class: `group ${cls}` },
    header && h('h2', { class: 'group-header' }, header),
    items.length ? h('div', { class: 'group-body' }, items) : null,
    footer && h('p', { class: 'group-footer' }, footer),
  );
}

export function cell({ emoji, color, iconEl, title, subtitle, detail, chevron = false, onClick, accessory, cls = '', id }) {
  const content = [
    emoji ? badge(emoji, color) : iconEl,
    h('span', { class: 'cell-text' }, h('span', { class: 'cell-title' }, title), subtitle && h('span', { class: 'cell-sub' }, subtitle)),
    detail !== undefined && detail !== null && detail !== '' && h('span', { class: 'cell-detail' }, detail),
    accessory,
    chevron && icon('chevron', 'chev'),
  ];
  return onClick
    ? h('button', { type: 'button', class: `cell tappable ${cls}`, onclick: onClick, 'data-id': id }, content)
    : h('div', { class: `cell ${cls}`, 'data-id': id }, content);
}

// ---------- Tabela ----------
// columns: [{ label, render(row) => node|string, cls, main }]; vira lista empilhada no celular.
export function table({ columns, rows, onRowClick, rowId, rowCls, empty = 'Nada por aqui.', caption }) {
  if (!rows.length) return emptyNote(empty);
  return h('div', { class: 'table-wrap' },
    h('table', { class: 'table stackable' },
      caption && h('caption', { class: 'sr-only' }, caption),
      h('thead', {}, h('tr', {}, columns.map((c) => h('th', { scope: 'col', class: c.cls }, c.label)))),
      h('tbody', {}, rows.map((r) => h('tr', {
        class: [onRowClick ? 'clickable' : '', rowCls?.(r) || ''].join(' ').trim() || null,
        'data-id': rowId?.(r),
        tabindex: onRowClick ? '0' : null,
        onclick: onRowClick ? (e) => { if (!e.target.closest('button, a, input, select')) onRowClick(r); } : null,
        onkeydown: onRowClick ? (e) => e.key === 'Enter' && e.target === e.currentTarget && onRowClick(r) : null,
      }, columns.map((c) => h('td', { class: [c.cls, c.main ? 'td-main' : ''].join(' ').trim() || null, 'data-label': c.label }, c.render(r))))))));
}

// ---------- Controles ----------
export function toggle(checked, onChange, label) {
  const input = h('input', { type: 'checkbox', role: 'switch', class: 'switch', checked: Boolean(checked), 'aria-label': label });
  input.addEventListener('change', () => onChange(input.checked));
  return input;
}

// Abas sublinhadas (o nome "segmented" é mantido por compatibilidade).
export function segmented(options, value, onChange, label = 'Seções') {
  return h('div', { class: 'segmented', role: 'tablist', 'aria-label': label },
    options.map((o) => h('button', {
      type: 'button', role: 'tab', class: o.value === value ? 'on' : '', 'aria-selected': String(o.value === value),
      onclick: () => onChange(o.value),
    }, o.label)));
}
export const tabs = segmented;

export function chips(options, value, onChange) {
  return h('div', { class: 'chips', role: 'group' },
    options.map((o) => h('button', { type: 'button', class: `chip${o.value === value ? ' on' : ''}`, 'aria-pressed': String(o.value === value), onclick: () => onChange(o.value === value ? '' : o.value) }, o.label)));
}

export function filterSelect(label, options, value, onChange) {
  const sel = h('select', { class: `filter-select${value ? ' active' : ''}`, 'aria-label': label, onchange: (e) => onChange(e.target.value) },
    h('option', { value: '' }, label), options.map((o) => h('option', { value: o.value, selected: o.value === value }, o.label)));
  return sel;
}

export function searchBox(value, onInput, placeholder = 'Buscar…') {
  const s = h('input', { type: 'search', class: 'search', placeholder, value: value || '', 'aria-label': placeholder });
  s.addEventListener('input', () => {
    const pos = s.selectionStart;
    onInput(s.value);
    const again = document.querySelector('.search');
    again?.focus();
    again?.setSelectionRange?.(pos, pos);
  });
  return s;
}

// ---------- Avisos ----------
export function toast(message, kind = 'ok') {
  let box = document.getElementById('toasts');
  if (!box) {
    box = h('div', { id: 'toasts', 'aria-live': 'polite' });
    document.body.append(box);
  }
  const t = h('div', { class: `toast ${kind}`, role: kind === 'error' ? 'alert' : 'status' }, kind === 'ok' ? icon('check', 'toast-ic') : null, h('span', {}, message));
  box.append(t);
  while (box.children.length > 3) box.firstChild.remove();
  const ms = kind === 'error' ? 5500 : 2600;
  setTimeout(() => t.classList.add('out'), ms);
  setTimeout(() => t.remove(), ms + 400);
}

export async function attempt(fn, okMsg) {
  try {
    const r = await fn();
    if (okMsg) toast(okMsg);
    return r ?? true;
  } catch (err) {
    console.error(err);
    toast(err.message || 'Algo deu errado.', 'error');
    return undefined;
  }
}

// ---------- Painel lateral de edição ----------
// Abre pela direita (tela cheia no celular). Nome "sheet" mantido por compatibilidade.
export function sheet({ title, body, onSave, saveLabel = 'Salvar', cancelLabel = 'Cancelar', footer, tall = false, wide = false }) {
  const dialog = h('dialog', { class: `sheet${tall ? ' tall' : ''}${wide ? ' wide' : ''}`, 'aria-label': title });
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    dialog.classList.add('closing');
    setTimeout(() => {
      dialog.close();
      dialog.remove();
    }, 170);
  };
  const doSave = async () => {
    try {
      const keepOpen = await onSave(close);
      if (keepOpen !== false) close();
    } catch (err) {
      toast(err.message || 'Não foi possível salvar.', 'error');
    }
  };
  dialog.append(
    h('header', { class: 'sheet-head' },
      h('h2', {}, title),
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Fechar', 'data-id': onSave ? 'sheet-cancel' : 'sheet-done', onclick: close }, icon('close')),
    ),
    h('div', { class: 'sheet-body' }, body, footer),
    onSave && h('footer', { class: 'sheet-foot' },
      h('button', { type: 'button', class: 'btn btn-ghost', onclick: close }, cancelLabel),
      h('button', { type: 'button', class: 'btn btn-primary', 'data-id': 'sheet-save', onclick: doSave }, saveLabel)),
  );
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    close();
  });
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close();
  });
  document.body.append(dialog);
  dialog.showModal();
  return close;
}
export const drawer = sheet;

// Diálogo de escolha/confirmação. Nome "actionSheet" mantido por compatibilidade.
export function actionSheet({ title, message, actions }) {
  return new Promise((resolve) => {
    const dialog = h('dialog', { class: 'action-sheet', 'aria-label': title || 'Escolha' });
    const done = (v) => {
      dialog.close();
      dialog.remove();
      resolve(v);
    };
    dialog.append(
      (title || message) && h('div', { class: 'as-head' }, title && h('strong', {}, title), message && h('p', {}, message)),
      h('div', { class: 'as-group' },
        actions.map((a) => h('button', { type: 'button', class: `as-btn${a.destructive ? ' destructive' : ''}`, 'data-id': a.id, onclick: () => done(a.value ?? a.label) }, a.label))),
      h('button', { type: 'button', class: 'as-btn as-cancel', onclick: () => done(null) }, 'Cancelar'),
    );
    dialog.addEventListener('cancel', (e) => {
      e.preventDefault();
      done(null);
    });
    dialog.addEventListener('click', (e) => e.target === dialog && done(null));
    document.body.append(dialog);
    dialog.showModal();
  });
}
export const choose = actionSheet;

export const confirmDelete = (what) =>
  actionSheet({ title: 'Apagar', message: `Apagar ${what}? Não dá para desfazer.`, actions: [{ label: 'Apagar', destructive: true, value: true, id: 'confirm-delete' }] }).then((v) => v === true);

// ---------- Formulário ----------
// sections: [{ header, footer, fields: [{ name, label, type: text|textarea|date|number|url|select|toggle|list, placeholder, options, rows, full }] }]
export function formGroups(sections, values = {}) {
  const getters = {};
  const els = sections.map((sec) => {
    const rows = sec.fields.map((f) => {
      const v = values[f.name];
      const lbl = (cls) => h('span', { class: f.showLabel === false ? 'sr-only' : cls }, f.label);
      if (f.type === 'toggle') {
        let cur = Boolean(v);
        getters[f.name] = () => cur;
        return h('label', { class: 'field-toggle' }, h('span', { class: 'cell-title' }, f.label), toggle(cur, (x) => (cur = x), f.label));
      }
      if (f.type === 'textarea' || f.type === 'list') {
        const ta = h('textarea', { name: f.name, rows: f.rows || 3, placeholder: f.placeholder || '', 'aria-label': f.label });
        ta.value = f.type === 'list' ? (Array.isArray(v) ? v.join('\n') : v || '') : v ?? '';
        getters[f.name] = () => (f.type === 'list' ? ta.value.split('\n').map((x) => x.trim()).filter(Boolean) : ta.value.trim());
        return h('label', { class: 'field-area' }, lbl('field-label'), ta);
      }
      if (f.type === 'select') {
        const opts = typeof f.options === 'function' ? f.options() : f.options;
        const sel = h('select', { name: f.name, 'aria-label': f.label }, f.placeholder !== false && h('option', { value: '' }, f.placeholder || 'Nenhum'), opts.map((o) => h('option', { value: o.value }, o.label)));
        sel.value = v ?? '';
        getters[f.name] = () => sel.value;
        return h('label', { class: `field${f.full ? ' full' : ''}` }, lbl('cell-title'), sel);
      }
      const input = h('input', { name: f.name, type: f.type || 'text', placeholder: f.placeholder || '', 'aria-label': f.label, inputmode: f.type === 'number' ? 'decimal' : null, min: f.type === 'number' ? 0 : null, step: f.type === 'number' ? 'any' : null });
      input.value = v ?? '';
      getters[f.name] = () => (f.type === 'number' ? (input.value === '' ? null : Number(input.value)) : input.value.trim());
      return h('label', { class: `field${f.full || f.name === 'title' ? ' full' : ''}` }, lbl('cell-title'), input);
    });
    return group({ header: sec.header, footer: sec.footer, children: rows });
  });
  return {
    el: h('div', { class: 'form' }, els),
    read: () => Object.fromEntries(Object.entries(getters).map(([k, g]) => [k, g()])),
  };
}

// ---------- Gráficos (SVG próprio, uma série) ----------
// Barras verticais: data = [{ label, value, hl, tip }]. Valor sempre acessível pela tabela abaixo.
export function barChart({ data, height = 180, fmt = (v) => String(v), refValue = null, refLabel = '', label = 'Gráfico' }) {
  const W = 600;
  const H = height;
  const pad = { t: 22, r: 8, b: 26, l: 8 };
  const max = Math.max(1, refValue || 0, ...data.map((d) => d.value || 0));
  const band = (W - pad.l - pad.r) / Math.max(1, data.length);
  const bw = Math.min(24, band * 0.55);
  const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const wrap = h('div', { class: 'chart', role: 'group', 'aria-label': label });
  const tip = h('div', { class: 'chart-tip', hidden: true });
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', label);
  const el = (tagName, attrs, text) => {
    const e = document.createElementNS(ns, tagName);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    if (text !== undefined) e.textContent = text;
    svg.append(e);
    return e;
  };
  el('line', { class: 'gridline', x1: pad.l, x2: W - pad.r, y1: H - pad.b, y2: H - pad.b });
  if (refValue) {
    el('line', { class: 'ref-line', x1: pad.l, x2: W - pad.r, y1: y(refValue), y2: y(refValue) });
    el('text', { class: 'ref-label', x: W - pad.r, y: y(refValue) - 5, 'text-anchor': 'end' }, refLabel);
  }
  data.forEach((d, i) => {
    const cx = pad.l + band * i + band / 2;
    const top = y(d.value || 0);
    const hgt = H - pad.b - top;
    const r = Math.min(4, hgt);
    const x0 = cx - bw / 2;
    // retângulo com cantos arredondados só no topo (base reta)
    const path = hgt > 0 ? `M${x0},${H - pad.b}V${top + r}Q${x0},${top} ${x0 + r},${top}H${x0 + bw - r}Q${x0 + bw},${top} ${x0 + bw},${top + r}V${H - pad.b}Z` : '';
    const hit = el('rect', { class: 'hit', x: cx - band / 2, y: pad.t - 10, width: band, height: H - pad.t - pad.b + 10, tabindex: '0', 'aria-label': `${d.label}: ${fmt(d.value || 0)}` });
    if (path) el('path', { class: `bar${d.hl ? ' hl' : ''}`, d: path });
    if (d.hl || i === data.length - 1) el('text', { class: 'value-label', x: cx, y: top - 6, 'text-anchor': 'middle' }, fmt(d.value || 0));
    el('text', { class: 'axis-label', x: cx, y: H - 8, 'text-anchor': 'middle' }, d.label);
    const show = () => {
      tip.hidden = false;
      tip.replaceChildren(h('strong', {}, fmt(d.value || 0)), h('span', {}, d.tip || d.label));
      const box = wrap.getBoundingClientRect();
      tip.style.left = `${(cx / W) * box.width}px`;
      tip.style.top = `${(top / H) * box.height}px`;
    };
    hit.addEventListener('pointerenter', show);
    hit.addEventListener('focus', show);
    hit.addEventListener('pointerleave', () => (tip.hidden = true));
    hit.addEventListener('blur', () => (tip.hidden = true));
  });
  wrap.append(svg, tip,
    h('details', { class: 'chart-table' }, h('summary', {}, 'Ver em tabela'),
      h('table', { class: 'table' }, h('tbody', {}, data.map((d) => h('tr', {}, h('td', {}, d.tip || d.label), h('td', { class: 'right num' }, fmt(d.value || 0))))))));
  return wrap;
}

// Barra horizontal simples para dentro de tabelas.
export const hbar = (value, max, text) => (value === null || value === undefined
  ? h('span', { class: 'subtle' }, '—')
  : h('span', { class: 'bar-cell' }, h('span', { class: 'hbar', style: { width: `${Math.max(2, Math.round((value / (max || 1)) * 120))}px` } }), h('span', { class: 'num' }, text)));

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export const emptyNote = (title, text, action) => h('div', { class: 'empty' }, h('p', { class: 'empty-title' }, title), text && h('p', {}, text), action && h('p', { style: { marginTop: '12px' } }, action));
