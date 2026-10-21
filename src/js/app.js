// Inicialização, navegação e roteamento por hash (#/area?param=valor).
import * as data from './data.js';
import { h, clear } from './ui.js';
import { isSyncDue } from './lib/instagram.js';
import * as home from './views/home.js';
import * as ideas from './views/ideas.js';
import * as scripts from './views/scripts.js';
import * as planner from './views/planner.js';
import * as references from './views/references.js';
import * as metrics from './views/metrics.js';
import * as brands from './views/brands.js';
import * as settings from './views/settings.js';

const ROUTES = [
  { path: '', label: 'Mesa', icon: '☼', view: home },
  { path: 'ideias', label: 'Laboratório de ideias', short: 'Ideias', icon: '✦', view: ideas },
  { path: 'roteiros', label: 'Roteirista', short: 'Roteiros', icon: '✎', view: scripts },
  { path: 'agenda', label: 'Planejamento', short: 'Agenda', icon: '▦', view: planner },
  { path: 'referencias', label: 'Referências', icon: '❏', view: references },
  { path: 'metricas', label: 'Desempenho', short: 'Métricas', icon: '↗', view: metrics },
  { path: 'marcas', label: 'Pesquisa de marcas', short: 'Marcas', icon: '◇', view: brands },
  { path: 'ajustes', label: 'Perfil e dados', short: 'Perfil', icon: '⚙', view: settings },
];

const main = document.getElementById('main');
const nav = document.getElementById('nav');

export function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, qs] = raw.split('?');
  return { path: path || '', params: Object.fromEntries(new URLSearchParams(qs || '')) };
}

function renderNav(active) {
  clear(nav).append(
    h('ul', {}, ROUTES.map((r) =>
      h('li', {}, h('a', { href: `#/${r.path}`, class: r.path === active ? 'active' : '', 'aria-current': r.path === active ? 'page' : null },
        h('span', { class: 'nav-icon', 'aria-hidden': 'true' }, r.icon),
        h('span', { class: 'nav-long' }, r.label),
        h('span', { class: 'nav-short' }, r.short || r.label),
      )),
    )),
  );
}

let current = null;
function route() {
  const { path, params } = parseHash();
  const r = ROUTES.find((x) => x.path === path) || ROUTES[0];
  const changed = current !== r;
  current = r;
  renderNav(r.path);
  document.title = `${r.label} · Estúdio de Conteúdo`;
  draw(params);
  if (changed) {
    main.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
}

function draw(params = parseHash().params) {
  try {
    clear(main);
    current.view.render(main, params);
  } catch (err) {
    console.error(err);
    clear(main).append(h('div', { class: 'error-box' }, h('h2', {}, 'Esta tela encontrou um erro'), h('p', {}, err.message)));
  }
}

async function start() {
  try {
    await data.init();
  } catch (err) {
    clear(main).append(
      h('div', { class: 'error-box' },
        h('h2', {}, 'Não consegui carregar seus dados'),
        h('p', {}, err.message),
        h('p', {}, 'Se você tem um backup, ainda pode importá-lo em "Perfil e dados" depois de resolver o problema.'),
      ),
    );
    return;
  }
  updateBadge();
  // Rerenderiza a tela atual quando os dados mudam (filtros ficam guardados em cada tela).
  data.onChange(() => {
    updateBadge();
    draw();
  });
  window.addEventListener('hashchange', route);
  route();
  autoSync();
}

function updateBadge() {
  const cfg = data.igConfig();
  const el = document.getElementById('ai-badge');
  if (!el) return;
  if (!cfg?.token) el.textContent = 'Instagram não conectado';
  else if (cfg.lastError) el.textContent = `@${cfg.username} · erro na última sincronização`;
  else el.textContent = `@${cfg.username} · sincronizado ${cfg.lastSync ? new Date(cfg.lastSync).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'nunca'}`;
}

// Sincroniza sozinho ao abrir, no máximo a cada 6 horas.
function autoSync() {
  if (!isSyncDue(data.igConfig())) return;
  data.syncInstagram().catch(() => {
    /* o erro fica registrado e aparece no painel do Instagram */
  });
}

start();
