// Utilitários de interface: criação de elementos, formulários, modais, avisos.

export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k in el && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  append(el, children);
  return el;
}

// Acrescenta filhos ignorando null/false (blocos opcionais que não se aplicam).
export function put(el, ...children) {
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export const clear = (el) => {
  el.replaceChildren();
  return el;
};

export function debounce(fn, ms = 200) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

export function fmtDate(iso, opts = { day: '2-digit', month: 'short' }) {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('pt-BR', opts);
}

export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Normaliza texto para busca (sem acento, minúsculo).
export const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function matches(record, query, keys) {
  if (!query) return true;
  const hay = norm(keys.map((k) => (Array.isArray(record[k]) ? record[k].join(' ') : record[k])).join(' '));
  return norm(query).split(/\s+/).every((w) => hay.includes(w));
}

// ---------- Avisos ----------
export function toast(message, kind = 'ok') {
  let box = document.getElementById('toasts');
  if (!box) {
    box = h('div', { id: 'toasts', 'aria-live': 'polite' });
    document.body.append(box);
  }
  const t = h('div', { class: `toast toast-${kind}`, role: kind === 'error' ? 'alert' : 'status' }, message);
  box.append(t);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => t.classList.add('out'), kind === 'error' ? 6000 : 2800);
  setTimeout(() => t.remove(), kind === 'error' ? 6500 : 3300);
}

// Executa uma ação assíncrona mostrando erro amigável.
export async function attempt(fn, okMsg) {
  try {
    const r = await fn();
    if (okMsg) toast(okMsg);
    return r;
  } catch (err) {
    console.error(err);
    toast(err.message || 'Algo deu errado.', 'error');
    return undefined;
  }
}

// ---------- Modal ----------
export function modal({ title, body, actions = [], wide = false, onClose }) {
  const dialog = h('dialog', { class: `modal${wide ? ' modal-wide' : ''}`, 'aria-label': title });
  const close = () => {
    dialog.close();
    dialog.remove();
    onClose?.();
  };
  const footer = h(
    'footer',
    { class: 'modal-actions' },
    actions.map((a) =>
      h('button', { type: 'button', class: `btn ${a.kind ? `btn-${a.kind}` : ''}`, onclick: () => a.onClick(close), 'data-action': a.id }, a.label),
    ),
  );
  dialog.append(
    h('header', { class: 'modal-head' }, h('h2', {}, title), h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Fechar', onclick: close }, '×')),
    h('div', { class: 'modal-body' }, body),
    footer,
  );
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    close();
  });
  document.body.append(dialog);
  dialog.showModal();
  return close;
}

export function confirmDialog(message, { okLabel = 'Excluir', danger = true } = {}) {
  return new Promise((resolve) => {
    modal({
      title: 'Confirmar',
      body: h('p', {}, message),
      onClose: () => resolve(false),
      actions: [
        { label: 'Cancelar', onClick: (close) => close() },
        {
          label: okLabel,
          kind: danger ? 'danger' : 'primary',
          id: 'confirm',
          onClick: (close) => {
            resolve(true);
            close();
          },
        },
      ],
    });
  });
}

export function emptyState(title, text, action) {
  return h('div', { class: 'empty' }, h('p', { class: 'empty-title' }, title), text && h('p', {}, text), action);
}

// ---------- Formulários ----------
// fields: [{ name, label, type, options, placeholder, help, rows, required, full, check, fields (repeat) }]
export function form(fields, values = {}) {
  const getters = {};
  const el = h('div', { class: 'form-grid' });
  for (const f of fields) {
    if (f.type === 'section') {
      put(el, h('h3', { class: 'form-section' }, f.label), f.help ? h('p', { class: 'help full' }, f.help) : null);
      continue;
    }
    const { node, get } = control(f, values[f.name]);
    getters[f.name] = get;
    const id = `f-${f.name}-${Math.random().toString(36).slice(2, 7)}`;
    node.id ||= id;
    const warn = f.check ? h('ul', { class: 'hook-warnings' }) : null;
    if (f.check) {
      const update = () => {
        const issues = f.check(get());
        clear(warn).append(...issues.map((i) => h('li', {}, i)));
      };
      node.addEventListener('input', update);
      queueMicrotask(update);
    }
    el.append(
      h(
        'div',
        { class: `field${f.full || ['textarea', 'repeat', 'checks', 'relation'].includes(f.type) ? ' full' : ''}`, dataset: { field: f.name } },
        f.type === 'checkbox' ? null : h('label', { for: node.id }, f.label, f.required ? h('span', { class: 'req' }, ' *') : null),
        node,
        f.help && h('p', { class: 'help' }, f.help),
        warn,
      ),
    );
  }
  return {
    el,
    read() {
      const out = {};
      for (const [k, g] of Object.entries(getters)) out[k] = g();
      return out;
    },
    validate() {
      const missing = fields.filter((f) => f.required && !String(getters[f.name]?.() ?? '').trim());
      if (missing.length) throw new Error(`Preencha: ${missing.map((f) => f.label).join(', ')}.`);
    },
  };
}

function control(f, value) {
  const opts = typeof f.options === 'function' ? f.options() : f.options || [];
  switch (f.type) {
    case 'textarea': {
      const n = h('textarea', { name: f.name, rows: f.rows || 3, placeholder: f.placeholder || '' });
      n.value = value ?? '';
      return { node: n, get: () => n.value.trim() };
    }
    case 'select': {
      const n = h(
        'select',
        { name: f.name },
        h('option', { value: '' }, f.placeholder || '—'),
        opts.map((o) => h('option', { value: o.value ?? o }, o.label ?? o)),
      );
      n.value = value ?? '';
      return { node: n, get: () => n.value };
    }
    case 'number': {
      const n = h('input', { type: 'number', name: f.name, min: f.min ?? 0, step: f.step || 1, inputmode: 'numeric', placeholder: f.placeholder || '' });
      n.value = value ?? '';
      return { node: n, get: () => (n.value === '' ? null : Number(n.value)) };
    }
    case 'checkbox': {
      const input = h('input', { type: 'checkbox', name: f.name });
      input.checked = Boolean(value);
      const n = h('label', { class: 'check' }, input, ' ', f.label);
      return { node: n, get: () => input.checked };
    }
    case 'checks':
    case 'relation':
      return checklist(f, opts, value);
    case 'repeat':
      return repeater(f, value);
    default: {
      const n = h('input', { type: f.type || 'text', name: f.name, placeholder: f.placeholder || '' });
      n.value = value ?? '';
      return { node: n, get: () => n.value.trim() };
    }
  }
}

// Lista de seleção múltipla com busca (para vínculos entre registros).
function checklist(f, opts, value) {
  const selected = new Set(Array.isArray(value) ? value : []);
  const list = h('div', { class: 'checklist' });
  const search = opts.length > 6 ? h('input', { type: 'search', placeholder: 'Filtrar…', class: 'checklist-search' }) : null;
  const draw = () => {
    const q = search?.value || '';
    clear(list);
    const visible = opts.filter((o) => matches({ l: o.label }, q, ['l']));
    if (!opts.length) list.append(h('p', { class: 'muted small' }, f.emptyText || 'Nada cadastrado ainda.'));
    for (const o of visible) {
      const cb = h('input', {
        type: 'checkbox',
        checked: selected.has(o.value),
        onchange: (e) => (e.target.checked ? selected.add(o.value) : selected.delete(o.value)),
      });
      list.append(h('label', { class: 'check' }, cb, ' ', o.label));
    }
  };
  search?.addEventListener('input', draw);
  draw();
  const node = h('div', { class: 'checklist-wrap' }, search, list);
  return { node, get: () => [...selected] };
}

// Editor de linhas repetidas (cenas, slides, telas, fatos de marca).
function repeater(f, value) {
  const rows = (Array.isArray(value) ? value : []).map((r) => ({ ...r }));
  const wrap = h('div', { class: 'repeater' });
  const readers = [];
  const draw = () => {
    clear(wrap);
    readers.length = 0;
    rows.forEach((row, i) => {
      const sub = form(f.fields, row);
      readers.push(sub.read);
      wrap.append(
        h(
          'div',
          { class: 'repeat-row' },
          h(
            'div',
            { class: 'repeat-head' },
            h('span', { class: 'repeat-n' }, `${f.itemLabel || 'Item'} ${i + 1}`),
            h('span', { class: 'repeat-tools' },
              h('button', { type: 'button', class: 'icon-btn', title: 'Subir', disabled: i === 0, onclick: () => move(i, -1) }, '↑'),
              h('button', { type: 'button', class: 'icon-btn', title: 'Descer', disabled: i === rows.length - 1, onclick: () => move(i, 1) }, '↓'),
              h('button', { type: 'button', class: 'icon-btn', title: 'Remover', onclick: () => { sync(); rows.splice(i, 1); draw(); } }, '×'),
            ),
          ),
          sub.el,
        ),
      );
    });
    wrap.append(h('button', { type: 'button', class: 'btn btn-ghost btn-small', onclick: () => { sync(); rows.push({}); draw(); } }, `+ ${f.addLabel || 'Adicionar'}`));
  };
  const sync = () => readers.forEach((r, i) => (rows[i] = r()));
  const move = (i, d) => {
    sync();
    [rows[i], rows[i + d]] = [rows[i + d], rows[i]];
    draw();
  };
  draw();
  return {
    node: wrap,
    get: () => {
      sync();
      return rows.filter((r) => Object.values(r).some((v) => String(v ?? '').trim()));
    },
  };
}

// Abre um formulário de edição em modal.
export function openEditor({ title, fields, values = {}, onSave, onDelete, saveLabel = 'Salvar', wide = true, intro }) {
  const f = form(fields, values);
  const body = h('form', { class: 'editor', onsubmit: (e) => e.preventDefault() }, intro, f.el);
  const actions = [];
  if (onDelete) actions.push({ label: 'Excluir', kind: 'danger-ghost', id: 'delete', onClick: async (close) => { if (await confirmDialog('Excluir este registro? Essa ação não pode ser desfeita.')) { await attempt(onDelete, 'Excluído.'); close(); } } });
  actions.push({ label: 'Cancelar', onClick: (close) => close() });
  actions.push({
    label: saveLabel,
    kind: 'primary',
    id: 'save',
    onClick: async (close) => {
      try {
        f.validate();
      } catch (err) {
        toast(err.message, 'error');
        return;
      }
      const ok = await attempt(() => onSave(f.read()), 'Salvo.');
      if (ok !== undefined) close();
    },
  });
  return modal({ title, body, actions, wide });
}

// ---------- Barra de filtros ----------
// state é um objeto mutável mantido pela tela (preserva filtros entre renderizações).
export function filterBar(state, { search = true, selects = [], onChange, extra }) {
  const bar = h('div', { class: 'filters', role: 'search' });
  if (search) {
    const s = h('input', { type: 'search', placeholder: 'Pesquisar…', value: state.q || '', 'aria-label': 'Pesquisar' });
    s.addEventListener('input', debounce(() => { state.q = s.value; onChange(); }, 150));
    bar.append(s);
  }
  for (const sel of selects) {
    const opts = typeof sel.options === 'function' ? sel.options() : sel.options;
    const n = h('select', { 'aria-label': sel.label, onchange: (e) => { state[sel.key] = e.target.value; onChange(); } },
      h('option', { value: '' }, sel.label),
      opts.map((o) => h('option', { value: o.value }, o.label)));
    n.value = state[sel.key] || '';
    if (n.value) n.classList.add('active');
    bar.append(n);
  }
  const hasAny = selects.some((s) => state[s.key]) || state.q;
  if (hasAny) bar.append(h('button', { type: 'button', class: 'btn btn-ghost btn-small', onclick: () => { for (const s of selects) state[s.key] = ''; state.q = ''; onChange(); } }, 'Limpar filtros'));
  if (extra) bar.append(extra);
  return bar;
}

export const pill = (text, kind = '') => (text ? h('span', { class: `pill ${kind}` }, text) : null);

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Copiado.');
  } catch {
    modal({ title: 'Copie o texto', body: h('textarea', { rows: 14, class: 'copy-area', readonly: true }, text), actions: [{ label: 'Fechar', onClick: (c) => c() }] });
  }
}

// Navega para outra área: go('roteiros', { idea: id })
export function go(path, params) {
  const qs = params ? `?${new URLSearchParams(params)}` : '';
  location.hash = `#/${path}${qs}`;
}
