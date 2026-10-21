// Abas, navegação e inicialização.
import * as data from './data.js';
import { h, put, clear, icon, toast } from './ui.js';
import { isSyncDue } from './lib/instagram.js';
import { watchReturn, pasteSheet } from './views/claude.js';
import * as today from './views/today.js';
import * as formats from './views/formats.js';
import * as week from './views/week.js';
import * as brands from './views/brands.js';
import * as results from './views/results.js';
import * as profile from './views/profile.js';

const TABS = [
  { path: '', label: 'Hoje', icon: 'today', view: today },
  { path: 'semana', label: 'Semana', icon: 'plan', view: week },
  { path: 'marcas', label: 'Marcas', icon: 'brands', view: brands },
  { path: 'formatos', label: 'Formatos', icon: 'formats', view: formats },
  { path: 'resultados', label: 'Resultados', icon: 'results', view: results },
  { path: 'perfil', label: 'Perfil', icon: 'profile', view: profile, hidden: true },
];

const main = document.getElementById('main');
const tabbar = document.getElementById('tabbar');
let current = null;

const currentPath = () => location.hash.replace(/^#\/?/, '').split('?')[0];

function drawTabs() {
  clear(tabbar).append(...TABS.filter((t) => !t.hidden).map((t) => h('a', {
    href: `#/${t.path}`, class: `tab${t === current ? ' on' : ''}`, 'aria-current': t === current ? 'page' : null, 'data-tab': t.path || 'hoje',
  }, icon(t.icon, 'tab-ic'), h('span', {}, t.label))));
}

function draw() {
  const y = window.scrollY;
  try {
    clear(main);
    current.view.render(main);
  } catch (err) {
    console.error(err);
    put(clear(main), h('div', { class: 'empty' }, h('p', { class: 'empty-title' }, 'Algo deu errado nesta tela'), h('p', {}, err.message)));
  }
  window.scrollTo(0, y);
}

function route() {
  const next = TABS.find((t) => t.path === currentPath()) || TABS[0];
  const changed = next !== current;
  current = next;
  document.title = `${current.label} · Creator`;
  drawTabs();
  draw();
  if (changed) window.scrollTo(0, 0);
}

async function start() {
  try {
    await data.init();
  } catch (err) {
    put(clear(main), h('div', { class: 'empty' }, h('p', { class: 'empty-title' }, 'Não consegui salvar dados aqui'), h('p', {}, err.message)));
    return;
  }
  data.onChange(draw);
  document.addEventListener('rerender', draw);
  window.addEventListener('hashchange', route);
  route();
  watchReturn();
  if (data.pendingAi()) setTimeout(() => pasteSheet(), 400);
  if (isSyncDue(data.igConfig())) data.syncInstagram().catch(() => {});
  // A partir de sábado, gera sozinho o plano de segunda a sexta da próxima semana.
  const now = new Date();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  try {
    if (data.autoPlan(todayIso)) toast('🗓️ Plano da próxima semana pronto');
  } catch (err) {
    console.error(err);
  }
}

start();
