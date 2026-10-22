// Ponte com o Claude: um toque copia o prompt e abre o Claude; ao voltar, o site oferece colar a resposta.
import * as data from '../data.js';
import { h, sheet, toast, copyText, attempt } from '../ui.js';

const handlers = {};
export const onClaudeResult = (kind, fn) => (handlers[kind] = fn);

export async function askClaude({ kind, prompt, context = {} }) {
  // Tudo no mesmo instante do toque (sem esperar nada antes): o Safari bloqueia pop-up depois de um "await".
  const copying = copyText(prompt);
  data.setPendingAi({ kind, context });
  // claude.ai aceita o texto pela URL (?q=); se o prompt for grande demais, só abre e você cola.
  const url = prompt.length < 6000 ? `https://claude.ai/new?q=${encodeURIComponent(prompt)}` : 'https://claude.ai/new';
  // Sem "noopener" na chamada: com ele o navegador sempre devolve null e não dá para saber se abriu.
  const win = window.open(url, '_blank');
  if (win) {
    try {
      win.opener = null;
    } catch {
      /* ignora */
    }
  }
  const copied = await copying;
  if (!win && !copied) {
    showPrompt(prompt);
    return;
  }
  toast(copied ? 'Prompt copiado. Se não aparecer escrito no Claude, é só colar.' : 'Claude aberto.');
}

function showPrompt(prompt) {
  const ta = h('textarea', { rows: 12, class: 'mono', readonly: true }, prompt);
  sheet({ title: 'Copie o prompt', body: h('div', { class: 'pad' }, h('p', { class: 'muted' }, 'Selecione tudo, copie e cole no Claude.'), ta) });
}

// Folha "colar resposta". Tenta ler a área de transferência com um toque.
export function pasteSheet(pending = data.pendingAi()) {
  if (!pending) return;
  const ta = h('textarea', { rows: 8, placeholder: 'Ou cole aqui a resposta do Claude…', 'aria-label': 'Resposta do Claude' });
  const err = h('p', { class: 'form-error', role: 'alert' });
  const use = async (text, close) => {
    const fn = handlers[pending.kind];
    if (!fn) return;
    try {
      await fn(text, pending.context || {});
      data.setPendingAi(null);
      close();
    } catch (e) {
      err.textContent = e.message;
    }
  };
  let closeRef = null;
  const pasteBtn = h('button', {
    type: 'button', class: 'btn-filled', 'data-id': 'paste-clipboard',
    onclick: async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (!text.trim()) throw new Error('vazio');
        ta.value = text;
        use(text, closeRef);
      } catch {
        err.textContent = 'Não consegui ler a área de transferência. Cole no campo abaixo (Ctrl+V / Cmd+V, ou toque e segure no celular).';
        ta.focus();
      }
    },
  }, 'Colar resposta do Claude');
  closeRef = sheet({
    title: 'Resposta do Claude',
    body: h('div', { class: 'pad stack' },
      h('p', { class: 'muted' }, 'No Claude, copie a resposta inteira e volte aqui.'),
      pasteBtn,
      ta,
      err,
      h('button', { type: 'button', class: 'btn-plain', 'data-id': 'use-text', onclick: () => use(ta.value, closeRef) }, 'Usar o texto colado'),
      h('button', { type: 'button', class: 'btn-plain muted', onclick: () => { data.setPendingAi(null); closeRef(); } }, 'Descartar pedido'),
    ),
  });
}

// Quando a pessoa volta para a aba do site, oferece colar a resposta.
let offered = 0;
export function watchReturn() {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    const p = data.pendingAi();
    if (!p || p.at === offered || document.querySelector('dialog[open]')) return;
    offered = p.at;
    setTimeout(() => pasteSheet(p), 250);
  });
}


export { attempt };
