// Componentes de interface no estilo iOS.

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

// ---------- Ícones (estilo SF Symbols, desenhados à mão) ----------
const ICONS = {
  today: '<path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/><circle cx="12" cy="12" r="4.2"/>',
  formats: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
  plan: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>',
  results: '<path d="M5 20V12M10 20V6M15 20v-9M20 20V4"/>',
  profile: '<circle cx="12" cy="8.5" r="4"/><path d="M4.5 20.5c1.2-3.6 4.1-5.5 7.5-5.5s6.3 1.9 7.5 5.5"/>',
  chevron: '<path d="M9 5l7 7-7 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
};
export const icon = (name, cls = 'ic') =>
  h('span', { class: cls, 'aria-hidden': 'true', html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>` });

// Quadradinho colorido com emoji (como os ícones dos Ajustes do iPhone).
export const badge = (emoji, color = 'blue') => h('span', { class: `badge c-${color}`, 'aria-hidden': 'true' }, emoji);

// ---------- Estrutura de página ----------
// Barra de navegação com título pequeno que aparece ao rolar, e título grande.
export function page({ title, subtitle, left, right, children }) {
  const nav = h('header', { class: 'navbar' },
    h('div', { class: 'nav-side' }, left),
    h('div', { class: 'nav-title', 'aria-hidden': 'true' }, title),
    h('div', { class: 'nav-side right' }, right),
  );
  const large = h('div', { class: 'large-title' }, h('h1', {}, title), subtitle && h('p', { class: 'subtitle' }, subtitle));
  const wrap = h('div', { class: 'page' }, nav, large, h('div', { class: 'page-body' }, children));
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(([e]) => nav.classList.toggle('scrolled', !e.isIntersecting), { rootMargin: '-52px 0px 0px 0px' });
    queueMicrotask(() => io.observe(large));
  }
  return wrap;
}

export const navButton = (label, onClick, { bold = false, iconName, id } = {}) =>
  h('button', { type: 'button', class: `nav-btn${bold ? ' bold' : ''}`, onclick: onClick, 'aria-label': iconName && !label ? id || iconName : null, 'data-id': id }, iconName && icon(iconName), label);

// ---------- Listas agrupadas ----------
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

// ---------- Controles ----------
export function toggle(checked, onChange, label) {
  const input = h('input', { type: 'checkbox', role: 'switch', class: 'switch', checked: Boolean(checked), 'aria-label': label });
  input.addEventListener('change', () => onChange(input.checked));
  return input;
}

export function segmented(options, value, onChange, label = 'Opções') {
  return h('div', { class: 'segmented', role: 'tablist', 'aria-label': label },
    options.map((o) => h('button', {
      type: 'button', role: 'tab', class: o.value === value ? 'on' : '', 'aria-selected': String(o.value === value),
      onclick: () => onChange(o.value),
    }, o.label)));
}

export function chips(options, value, onChange) {
  return h('div', { class: 'chips', role: 'group' },
    options.map((o) => h('button', { type: 'button', class: `chip${o.value === value ? ' on' : ''}`, 'aria-pressed': String(o.value === value), onclick: () => onChange(o.value === value ? '' : o.value) }, o.label)));
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
  while (box.children.length > 2) box.firstChild.remove();
  const ms = kind === 'error' ? 5500 : 2200;
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

// ---------- Folhas (sheets) ----------
// Sobe de baixo no celular; no computador aparece centralizada.
export function sheet({ title, body, onSave, saveLabel = 'Salvar', cancelLabel = 'Cancelar', footer, tall = false }) {
  const dialog = h('dialog', { class: `sheet${tall ? ' tall' : ''}`, 'aria-label': title });
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    dialog.classList.add('closing');
    setTimeout(() => {
      dialog.close();
      dialog.remove();
    }, 220);
  };
  const save = onSave
    ? h('button', {
      type: 'button', class: 'nav-btn bold', 'data-id': 'sheet-save',
      onclick: async () => {
        try {
          const keepOpen = await onSave(close);
          if (keepOpen !== false) close();
        } catch (err) {
          toast(err.message || 'Não foi possível salvar.', 'error');
        }
      },
    }, saveLabel)
    : null;
  dialog.append(
    h('div', { class: 'grabber', 'aria-hidden': 'true' }),
    h('header', { class: 'sheet-head' },
      h('button', { type: 'button', class: 'nav-btn', 'data-id': 'sheet-cancel', onclick: close }, onSave ? cancelLabel : ''),
      h('h2', {}, title),
      save || h('button', { type: 'button', class: 'nav-btn bold', 'data-id': 'sheet-done', onclick: close }, 'OK'),
    ),
    h('div', { class: 'sheet-body' }, body, footer),
  );
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    close();
  });
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close(); // toque fora fecha
  });
  document.body.append(dialog);
  dialog.showModal();
  return close;
}

// Folha de ações (confirmação), com opção destrutiva em vermelho.
export function actionSheet({ title, message, actions }) {
  return new Promise((resolve) => {
    const dialog = h('dialog', { class: 'action-sheet', 'aria-label': title || 'Ações' });
    const done = (v) => {
      dialog.close();
      dialog.remove();
      resolve(v);
    };
    dialog.append(
      h('div', { class: 'as-group' },
        (title || message) && h('div', { class: 'as-head' }, title && h('strong', {}, title), message && h('p', {}, message)),
        actions.map((a) => h('button', { type: 'button', class: `as-btn${a.destructive ? ' destructive' : ''}`, 'data-id': a.id, onclick: () => done(a.value ?? a.label) }, a.label)),
      ),
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

export const confirmDelete = (what) =>
  actionSheet({ message: `Apagar ${what}? Não dá para desfazer.`, actions: [{ label: 'Apagar', destructive: true, value: true, id: 'confirm-delete' }] }).then((v) => v === true);

// ---------- Formulário em células ----------
// fields: { name, label, type: text|textarea|date|number|url|select|toggle|list, placeholder, options, rows }
export function formGroups(sections, values = {}) {
  const getters = {};
  const els = sections.map((sec) => {
    const rows = sec.fields.map((f) => {
      const v = values[f.name];
      if (f.type === 'toggle') {
        let cur = Boolean(v);
        getters[f.name] = () => cur;
        return cell({ title: f.label, accessory: toggle(cur, (x) => (cur = x), f.label) });
      }
      if (f.type === 'textarea' || f.type === 'list') {
        const ta = h('textarea', { name: f.name, rows: f.rows || 3, placeholder: f.placeholder || f.label, 'aria-label': f.label });
        ta.value = f.type === 'list' ? (Array.isArray(v) ? v.join('\n') : v || '') : v ?? '';
        getters[f.name] = () => (f.type === 'list' ? ta.value.split('\n').map((x) => x.trim()).filter(Boolean) : ta.value.trim());
        return h('label', { class: 'cell field-area' }, f.showLabel !== false && h('span', { class: 'field-label' }, f.label), ta);
      }
      if (f.type === 'select') {
        const opts = typeof f.options === 'function' ? f.options() : f.options;
        const sel = h('select', { name: f.name, 'aria-label': f.label }, f.placeholder !== false && h('option', { value: '' }, f.placeholder || 'Nenhum'), opts.map((o) => h('option', { value: o.value }, o.label)));
        sel.value = v ?? '';
        getters[f.name] = () => sel.value;
        return h('label', { class: 'cell field' }, h('span', { class: 'cell-title' }, f.label), sel);
      }
      const input = h('input', { name: f.name, type: f.type || 'text', placeholder: f.placeholder || '', 'aria-label': f.label, inputmode: f.type === 'number' ? 'numeric' : null, min: f.type === 'number' ? 0 : null });
      input.value = v ?? '';
      getters[f.name] = () => (f.type === 'number' ? (input.value === '' ? null : Number(input.value)) : input.value.trim());
      return h('label', { class: 'cell field' }, h('span', { class: 'cell-title' }, f.label), input);
    });
    return group({ header: sec.header, footer: sec.footer, children: rows });
  });
  return {
    el: h('div', { class: 'form' }, els),
    read: () => Object.fromEntries(Object.entries(getters).map(([k, g]) => [k, g()])),
  };
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export const emptyNote = (title, text) => h('div', { class: 'empty' }, h('p', { class: 'empty-title' }, title), text && h('p', {}, text));
