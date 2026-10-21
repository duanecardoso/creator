// Ponte com o assistente de IA: copiar o prompt, colar a resposta e transformar em registros.
import * as data from '../data.js';
import { h, modal, toast, copyText, attempt } from '../ui.js';
import { parseAnswer } from '../lib/prompts.js';

export const CLAUDE_URL = 'https://claude.ai/new';

export function aiSteps({ kind, getBody, onResult, validate, label = 'Gerar com IA' }) {
  const copy = async () => {
    if (validate) {
      const problem = validate();
      if (problem) return toast(problem, 'error');
    }
    const text = await attempt(() => data.buildPrompt(kind, getBody()));
    if (text) copyText(text);
  };
  return h('div', { class: 'ai-steps', role: 'group', 'aria-label': label },
    h('span', { class: 'ai-steps-label' }, label),
    h('button', { type: 'button', class: 'btn btn-primary', onclick: copy, 'data-ai': 'copy' }, '1 · Copiar prompt'),
    h('a', { class: 'btn', href: CLAUDE_URL, target: '_blank', rel: 'noopener noreferrer' }, '2 · Abrir o Claude ↗'),
    h('button', { type: 'button', class: 'btn', 'data-ai': 'paste', onclick: () => pasteDialog(kind, onResult) }, '3 · Colar resposta'),
  );
}

export function pasteDialog(kind, onResult) {
  const area = h('textarea', { rows: 14, class: 'copy-area', placeholder: 'Cole aqui a resposta inteira do assistente (o bloco JSON).', 'aria-label': 'Resposta do assistente' });
  const err = h('p', { class: 'form-error', role: 'alert' });
  modal({
    title: 'Colar resposta da IA',
    wide: true,
    body: h('div', {}, h('p', { class: 'help' }, 'O prompt pede que a resposta venha em JSON. Cole tudo; o site encontra o bloco sozinho.'), area, err),
    actions: [
      { label: 'Cancelar', onClick: (close) => close() },
      {
        label: 'Usar resposta',
        kind: 'primary',
        id: 'use-answer',
        onClick: async (close) => {
          try {
            const parsed = parseAnswer(area.value, kind);
            close();
            await onResult(parsed);
          } catch (e) {
            err.textContent = e.message;
          }
        },
      },
    ],
  });
  setTimeout(() => area.focus(), 50);
}
