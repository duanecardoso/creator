// Estrutura da plataforma: menu lateral por módulos, barra superior e rotas (#/modulo/pagina).
import * as data from './data.js';
import { h, put, clear, icon, toast, btn } from './ui.js';
import { isSyncDue } from './lib/instagram.js';
import { upcoming } from './lib/deals.js';
import { watchReturn, pasteSheet } from './views/claude.js';
import { newContent, today as todayIso } from './views/content-sheet.js';
import { ROUTES, NAV, REDIRECTS } from './routes.js';

const main = document.getElementById('main');
const sidebar = document.getElementById('sidebar');
const topbar = document.getElementById('topbar');
let current = null;

// "#/marcas/campanhas?id=x" → { path: 'marcas/campanhas', params: { id: 'x' } }
export function parseHash() {
  const [path, qs] = location.hash.replace(/^#\/?/, '').split('?');
  return { path: path.replace(/\/$/, ''), params: Object.fromEntries(new URLSearchParams(qs || '')) };
}

function drawSidebar() {
  const p = data.profile();
  const late = upcoming(data.all('deals'), todayIso(), 0).overdue.length;
  const counts = { 'marcas/campanhas': late };
  clear(sidebar).append(
    h('a', { class: 'brand', href: '#/visao-geral' }, h('span', { class: 'brand-mark', 'aria-hidden': 'true' }, 'C'), h('span', { class: 'brand-name' }, 'Creator', h('em', {}, '.'))),
    ...NAV.flatMap((sec) => [
      sec.label && h('p', { class: 'nav-section' }, sec.label),
      h('ul', { class: 'nav-list' }, sec.items.map((id) => {
        const r = ROUTES[id];
        const on = current?.path === id;
        return h('li', {}, h('a', { href: `#/${id}`, class: `nav-link${on ? ' on' : ''}`, 'aria-current': on ? 'page' : null, 'data-nav': id, title: r.label },
          icon(r.icon), h('span', { class: 'nav-label' }, r.label), counts[id] ? h('span', { class: 'nav-count', 'aria-label': `${counts[id]} atrasado(s)` }, String(counts[id])) : null));
      })),
    ]).filter(Boolean),
    h('div', { class: 'sidebar-foot' },
      h('a', { class: `nav-link${current?.path === 'configuracoes' ? ' on' : ''}`, href: '#/configuracoes', 'data-nav': 'configuracoes', title: 'Configurações' }, icon('settings'), h('span', { class: 'nav-label' }, 'Configurações')),
      h('a', { class: 'me', href: '#/configuracoes', 'data-id': 'open-profile' },
        h('span', { class: 'avatar' }, (p.name || 'C').trim().charAt(0).toUpperCase()),
        h('span', { class: 'me-text' }, h('strong', {}, p.name || 'Seu perfil'), h('span', {}, igLine()))),
    ),
  );
}

function igLine() {
  const cfg = data.igConfig();
  if (!cfg?.token) return 'Instagram não conectado';
  return cfg.lastError ? `@${cfg.username} · erro ao sincronizar` : `@${cfg.username}`;
}

function drawTopbar() {
  const r = current;
  const pending = data.pendingAi();
  clear(topbar).append(
    h('button', { type: 'button', class: 'icon-btn menu-btn', 'aria-label': 'Abrir menu', onclick: openMenu }, icon('menu')),
    h('nav', { class: 'crumbs', 'aria-label': 'Você está em' }, r.module && h('span', {}, r.module), r.module && h('span', { 'aria-hidden': 'true' }, '/'), h('strong', {}, r.label)),
    h('div', { class: 'topbar-actions' },
      pending && btn('Colar resposta do Claude', () => pasteSheet(pending), { kind: 'accent', iconName: 'sparkle', id: 'pending-banner', small: true }),
      btn('Novo conteúdo', () => newContent({ date: todayIso() }), { kind: 'primary', iconName: 'plus', id: 'new-content', small: true }),
    ),
  );
}

function openMenu() {
  sidebar.classList.add('open');
  const scrim = h('div', { class: 'scrim', onclick: closeMenu });
  document.body.append(scrim);
}
function closeMenu() {
  sidebar.classList.remove('open');
  document.querySelector('.scrim')?.remove();
}

function draw() {
  if (!current) return;
  const y = window.scrollY;
  try {
    clear(main);
    current.view.render(main, parseHash().params);
  } catch (err) {
    console.error(err);
    put(clear(main), h('div', { class: 'empty' }, h('p', { class: 'empty-title' }, 'Algo deu errado nesta página'), h('p', {}, err.message)));
  }
  drawSidebar();
  drawTopbar();
  window.scrollTo(0, y);
}

function route() {
  let { path } = parseHash();
  if (REDIRECTS[path] !== undefined) {
    // Endereço antigo: troca na barra sem criar entrada no histórico e segue.
    const qs = location.hash.split('?')[1];
    path = REDIRECTS[path];
    history.replaceState(null, '', `#/${path}${qs ? `?${qs}` : ''}`);
  }
  if (!ROUTES[path]) path = 'visao-geral';
  const changed = current?.path !== path;
  current = { path, ...ROUTES[path] };
  document.title = `${current.label} · Creator`;
  closeMenu();
  draw();
  if (changed) {
    window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  }
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
  try {
    if (data.autoPlan(todayIso())) toast('Plano da próxima semana pronto');
  } catch (err) {
    console.error(err);
  }
}

start();
