// Painel de conexão e sincronização com o Instagram.
import * as data from '../data.js';
import { h, put, clear, toast, confirmDialog } from '../ui.js';
import { tokenStatus, IG_DEFAULT_VERSION } from '../lib/instagram.js';

const META_APPS = 'https://developers.facebook.com/apps/';
let progress = '';

const when = (iso) => (iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

export async function runSync(panelRefresh) {
  progress = 'Começando…';
  panelRefresh?.();
  try {
    const s = await data.syncInstagram({ onProgress: (m) => { progress = m; const el = document.getElementById('ig-progress'); if (el) el.textContent = m; } });
    toast(`Instagram: ${s.fetched} publicações lidas (${s.created} novas, ${s.updated} atualizadas).`);
    return s;
  } catch (err) {
    toast(err.message, 'error');
    return null;
  } finally {
    progress = '';
    panelRefresh?.();
  }
}

export function instagramPanel({ compact = false } = {}) {
  const box = h('section', { class: 'panel ig-panel', id: 'ig-panel', 'aria-labelledby': 'ig-title' });
  const draw = () => {
    clear(box);
    const cfg = data.igConfig();
    put(box, h('h2', { id: 'ig-title' }, 'Instagram'));
    if (!cfg?.token) return put(box, ...connectForm(draw, compact));
    const ts = tokenStatus(cfg);
    const s = cfg.lastSummary;
    put(box, 
      h('div', { class: 'ig-status' },
        h('span', { class: 'ig-handle' }, `@${cfg.username || 'conta'}`),
        cfg.followersCount != null && h('span', { class: 'muted' }, `${Number(cfg.followersCount).toLocaleString('pt-BR')} seguidores`),
        cfg.lastErrorKind === 'auth'
          ? h('span', { class: 'pill warn' }, 'Token recusado pelo Instagram')
          : h('span', { class: `pill ${ts.state === 'ok' ? 'ok' : 'warn'}` },
            ts.state === 'expired' ? 'Token expirado' : `Token válido por ~${ts.daysLeft} dias${ts.estimated ? ' (estimado)' : ''}`),
      ),
      h('p', { class: 'small muted' }, `Última sincronização: ${when(cfg.lastSync)}`, s ? ` · ${s.fetched} lidas, ${s.created} novas, ${s.updated} atualizadas${s.insightErrors ? `, ${s.insightErrors} sem métricas` : ''}` : ''),
      cfg.lastError && h('p', { class: 'form-error' }, `Último erro (${when(cfg.lastErrorAt)}): ${cfg.lastError}`),
      s?.firstError && h('p', { class: 'small muted' }, `Algumas publicações vieram sem métricas: ${s.firstError}`),
      h('p', { class: 'progress', id: 'ig-progress', 'aria-live': 'polite' }, progress),
      h('div', { class: 'row-actions' },
        h('button', { class: 'btn btn-primary', disabled: data.isSyncing(), onclick: () => runSync(draw) }, data.isSyncing() ? 'Sincronizando…' : 'Sincronizar agora'),
        (cfg.lastErrorKind === 'auth' || ts.state !== 'ok') && h('button', { class: 'btn', onclick: () => { data.disconnectInstagram(); compact ? (location.hash = '#/ajustes') : draw(); } }, 'Colar novo token'),
        !compact && h('label', { class: 'inline' }, 'Publicações por sincronização ',
          h('select', { onchange: (e) => data.saveIgConfig({ ...data.igConfig(), syncLimit: Number(e.target.value) }, { silent: true }) },
            [15, 30, 50, 100].map((n) => h('option', { value: n, selected: (cfg.syncLimit || 30) === n }, String(n))))),
        !compact && h('button', { class: 'btn btn-ghost', onclick: async () => { if (await confirmDialog('Desconectar o Instagram? O token será apagado deste navegador. As publicações e métricas já importadas continuam.', { okLabel: 'Desconectar' })) { data.disconnectInstagram(); draw(); } } }, 'Desconectar'),
      ),
      !compact && h('p', { class: 'help' }, 'Sincroniza sozinho ao abrir o site (no máximo a cada 6 horas) e renova o token automaticamente a cada 7 dias, enquanto ele ainda for válido. Stories não entram: a API só os mostra por 24h.'),
    );
  };
  draw();
  return box;
}

function connectForm(redraw, compact) {
  if (compact) {
    return [
      h('p', {}, 'Conecte sua conta para importar publicações e métricas automaticamente.'),
      h('a', { class: 'btn btn-primary', href: '#/ajustes' }, 'Conectar em Perfil e dados'),
    ];
  }
  const token = h('input', { type: 'password', autocomplete: 'off', placeholder: 'Cole aqui o token de acesso (começa com IG…)', 'aria-label': 'Token do Instagram', spellcheck: 'false' });
  const version = h('input', { type: 'text', value: IG_DEFAULT_VERSION, 'aria-label': 'Versão da API', class: 'narrow' });
  const err = h('p', { class: 'form-error', role: 'alert' });
  const btn = h('button', {
    class: 'btn btn-primary',
    onclick: async () => {
      err.textContent = '';
      btn.disabled = true;
      btn.textContent = 'Verificando…';
      try {
        const cfg = await data.connectInstagram(token.value, version.value.trim());
        toast(`Conectado como @${cfg.username}.`);
        redraw();
        runSync(redraw);
      } catch (e) {
        err.textContent = e.message;
        btn.disabled = false;
        btn.textContent = 'Conectar';
      }
    },
  }, 'Conectar');
  return [
    h('p', {}, 'Importa suas publicações e as métricas oficiais (alcance, visualizações, curtidas, comentários, salvamentos, compartilhamentos e, quando a API oferece, visitas ao perfil e seguidores). Gratuito.'),
    h('details', { class: 'small-print' },
      h('summary', {}, 'Como gerar o token (uma vez, ~15 minutos)'),
      h('ol', { class: 'steps' },
        h('li', {}, 'No app do Instagram: Configurações → Tipo de conta → mude para ', h('strong', {}, 'conta profissional (Criador)'), '. É gratuito e não precisa de página do Facebook.'),
        h('li', {}, 'Entre em ', h('a', { href: META_APPS, target: '_blank', rel: 'noopener noreferrer' }, 'developers.facebook.com/apps'), ' com seu login do Facebook e crie um app (tipo "Empresa"/"Business").'),
        h('li', {}, 'No app, adicione o produto ', h('strong', {}, 'Instagram'), ' e abra "Configuração da API com login do Instagram".'),
        h('li', {}, 'Em "Funções do app → Testadores do Instagram", adicione seu @ e aceite o convite no Instagram (Configurações → Apps e sites → Convites de testador).'),
        h('li', {}, 'Volte em "Gerar tokens de acesso", clique em adicionar conta, faça login e copie o token. Confirme que as permissões incluem ', h('code', {}, 'instagram_business_basic'), ' e ', h('code', {}, 'instagram_business_manage_insights'), '.'),
        h('li', {}, 'Cole o token abaixo. Ele fica salvo só neste navegador, nunca no GitHub e nunca no arquivo de backup.'),
      ),
      h('p', { class: 'muted small' }, 'Os nomes dos menus da Meta mudam com frequência; se algo estiver diferente, procure por "Instagram API with Instagram Login".'),
    ),
    h('div', { class: 'row-actions' }, token, h('label', { class: 'inline' }, 'Versão ', version), btn),
    err,
    h('p', { class: 'help' }, 'Segurança: o token dá acesso de leitura às suas métricas. Não cole em sites de terceiros e não use em computador compartilhado. Para revogar, remova o app em Instagram → Configurações → Apps e sites.'),
  ];
}
