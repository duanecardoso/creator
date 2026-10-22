// Configurações: perfil criativo, meta e plano semanal, estilo das artes, Instagram, Claude e backup.
import * as data from '../data.js';
import { h, page, group, cell, sheet, formGroups, toast, actionSheet, fmtDay, card, btn } from '../ui.js';
import { tokenStatus } from '../lib/instagram.js';
import { DEFAULT_PALETTE, drawSlide } from '../lib/render.js';
import { toggle } from '../ui.js';

const SWATCHES = [
  ['bg', 'Fundo'], ['card', 'Cartões'], ['ink', 'Texto'], ['accent', 'Destaque 1 (manteiga)'], ['accent2', 'Destaque 2 (rosa)'], ['accent3', 'Detalhes (marrom)'],
];

function paletteGroup(p) {
  const pal = { ...DEFAULT_PALETTE, ...(p.palette || {}) };
  const preview = h('canvas', { class: 'palette-preview', 'aria-label': 'Prévia do estilo' });
  const sample = { layout: 'notas', kicker: 'review honesto', title: 'Testei o protetor da minha mãe', body: 'Textura leve, não deixou branco.\nNo calor, precisei reaplicar.' };
  const redraw = () => drawSlide(preview, sample, { palette: pal, dark: data.profile().designDark, handle: p.instagram ? `@${p.instagram.replace(/^@/, '')}` : '@voce', index: 0, total: 3 });
  queueMicrotask(redraw);
  const rows = SWATCHES.map(([k, label]) => {
    const inp = h('input', { type: 'color', value: pal[k], 'aria-label': label, class: 'swatch' });
    inp.addEventListener('input', () => { pal[k] = inp.value; redraw(); });
    inp.addEventListener('change', () => data.saveProfile({ palette: { ...pal } }));
    return h('label', { class: 'cell field' }, h('span', { class: 'cell-title' }, label), inp);
  });
  return group({
    header: 'Estilo das artes',
    footer: 'Base neutra e cor só nos detalhes, para não ficar colorido demais. Vale para carrosséis e estáticos.',
    children: [
      h('div', { class: 'cell palette-cell' }, preview),
      ...rows,
      cell({ title: 'Artes no tema escuro', accessory: toggle(Boolean(p.designDark), (v) => { data.saveProfile({ designDark: v }); }, 'Tema escuro') }),
      h('button', { type: 'button', class: 'cell tappable tint', onclick: () => { data.saveProfile({ palette: {} }); toast('Paleta original restaurada'); } }, 'Restaurar paleta original'),
    ],
  });
}

function planGroup(p) {
  const mix = { video: 3, carrossel: 1, estatico: 1, ...(p.mix || {}) };
  const step = (k) => stepper(mix[k], (n) => {
    mix[k] = n;
    data.saveProfile({ mix: { ...mix } });
  }, 0, 5);
  const total = mix.video + mix.carrossel + mix.estatico;
  return group({
    header: 'Plano semanal (seg a sex)',
    footer: `${total} conteúdos por semana. ${total !== 5 ? 'O plano tem 5 dias: o que passar de 5 é ignorado e o que faltar vira vídeo.' : ''} A partir de sábado, o plano da próxima semana é gerado quando você abre o app.`,
    children: [
      cell({ emoji: '✨', color: 'orange', title: 'Gerar sozinho aos sábados', accessory: toggle(p.autoPlan !== false, (v) => data.saveProfile({ autoPlan: v }), 'Gerar sozinho') }),
      cell({ emoji: '🎬', color: 'red', title: 'Vídeos', accessory: step('video') }),
      cell({ emoji: '🖼️', color: 'blue', title: 'Carrosséis', accessory: step('carrossel') }),
      cell({ emoji: '🔲', color: 'gray', title: 'Estáticos', accessory: step('estatico') }),
    ],
  });
}

const rerender = () => document.dispatchEvent(new Event('rerender'));
const when = (s) => (s ? new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'nunca');

function editProfile() {
  const p = data.profile();
  const f = formGroups([
    { fields: [{ name: 'name', label: 'Nome' }, { name: 'instagram', label: 'Instagram', placeholder: '@' }, { name: 'tiktok', label: 'TikTok', placeholder: '@' }] },
    { header: 'Nichos', fields: [{ name: 'niches', label: 'Nichos', type: 'textarea', rows: 2, showLabel: false }] },
    { header: 'Sobre você', footer: 'Só fatos reais. O Claude usa isso e não deve inventar nada além.', fields: [{ name: 'about', label: 'Sobre', type: 'textarea', rows: 3, showLabel: false }] },
    { header: 'Seu jeito', fields: [{ name: 'style', label: 'Estilo', type: 'textarea', rows: 3, showLabel: false }] },
    { header: 'Evitar', fields: [{ name: 'avoid', label: 'Evitar', type: 'textarea', rows: 3, showLabel: false }] },
  ], p);
  sheet({ title: 'Perfil', tall: true, body: f.el, onSave: () => { data.saveProfile(f.read()); toast('Perfil salvo'); } });
}

function stepper(value, onChange, min = 1, max = 14) {
  const out = h('span', { class: 'step-val', 'aria-live': 'polite' }, String(value));
  const set = (v) => {
    const n = Math.min(max, Math.max(min, v));
    out.textContent = String(n);
    onChange(n);
  };
  return h('span', { class: 'stepper' },
    h('button', { type: 'button', 'aria-label': 'Diminuir', onclick: () => set(Number(out.textContent) - 1) }, '−'),
    out,
    h('button', { type: 'button', 'aria-label': 'Aumentar', onclick: () => set(Number(out.textContent) + 1) }, '+'),
  );
}

function instagramSheet() {
  const cfg = data.igConfig();
  if (cfg?.token) {
    const ts = tokenStatus(cfg);
    const s = cfg.lastSummary;
    const progress = h('p', { class: 'muted pad-x', 'aria-live': 'polite' });
    let close;
    close = sheet({
      title: 'Instagram',
      body: h('div', { class: 'sheet-stack' },
        group({ children: [
          cell({ emoji: '📸', color: 'pink', title: `@${cfg.username || 'conta'}`, subtitle: cfg.followersCount != null ? `${Number(cfg.followersCount).toLocaleString('pt-BR')} seguidores` : '' }),
          cell({ title: 'Token', detail: cfg.lastErrorKind === 'auth' ? 'recusado' : ts.state === 'expired' ? 'expirado' : `~${ts.daysLeft} dias` }),
          cell({ title: 'Última sincronização', detail: when(cfg.lastSync) }),
          s && cell({ title: 'Resultado', subtitle: `${s.fetched} posts lidos · ${s.created} novos · ${s.updated} atualizados${s.insightErrors ? ` · ${s.insightErrors} sem métricas` : ''}` }),
        ] }),
        cfg.lastError && h('p', { class: 'form-error pad-x' }, cfg.lastError),
        progress,
        group({ children: [
          h('button', { type: 'button', class: 'cell tappable tint', 'data-id': 'ig-sync', onclick: async (e) => {
            const btn = e.currentTarget;
            btn.disabled = true;
            try {
              const r = await data.syncInstagram({ onProgress: (m) => (progress.textContent = m) });
              toast(`${r.fetched} posts lidos`);
              close();
            } catch (err) {
              progress.textContent = '';
              toast(err.message, 'error');
              btn.disabled = false;
            }
          } }, 'Sincronizar agora'),
          h('button', { type: 'button', class: 'cell tappable tint', onclick: () => { data.disconnectInstagram(); close(); setTimeout(instagramSheet, 260); } }, 'Colar um novo token'),
          h('button', { type: 'button', class: 'cell tappable destructive', onclick: async () => {
            const ok = await actionSheet({ message: 'Desconectar o Instagram? Os posts e números já importados continuam.', actions: [{ label: 'Desconectar', destructive: true, value: true }] });
            if (ok) { data.disconnectInstagram(); close(); }
          } }, 'Desconectar'),
        ], footer: 'Sincroniza sozinho ao abrir o site (no máximo a cada 6h) e renova o token a cada 7 dias. Stories não entram.' }),
      ),
    });
    return;
  }
  const input = h('input', { type: 'password', autocomplete: 'off', spellcheck: 'false', placeholder: 'Cole o token aqui', 'aria-label': 'Token do Instagram' });
  const err = h('p', { class: 'form-error pad-x', role: 'alert' });
  sheet({
    title: 'Conectar Instagram',
    tall: true,
    saveLabel: 'Conectar',
    body: h('div', { class: 'sheet-stack' },
      h('p', { class: 'pad-x muted' }, 'Puxa seus posts e números automaticamente (visualizações, curtidas, comentários, salvamentos, compartilhamentos e, quando a API oferece, novos seguidores). Gratuito, pela API oficial da Meta.'),
      group({ children: [h('label', { class: 'cell field' }, input)] }),
      err,
      group({ header: 'Como pegar o token (uma vez)', children: [
        ['1', 'No Instagram: Configurações → Tipo de conta → Conta profissional (Criador).'],
        ['2', 'Em developers.facebook.com/apps, crie um app (tipo Empresa).'],
        ['3', 'Adicione o produto Instagram → "API com login do Instagram".'],
        ['4', 'Em Funções do app → Testadores do Instagram, adicione seu @ e aceite o convite no app (Configurações → Apps e sites).'],
        ['5', 'Em "Gerar tokens de acesso", entre com sua conta e copie o token.'],
      ].map(([n, t]) => cell({ iconEl: h('span', { class: 'step-n' }, n), title: t })), footer: 'O token fica só neste aparelho. Não vai para o GitHub nem para o backup. Os menus da Meta mudam às vezes; se algo estiver diferente, procure "Instagram API with Instagram Login".' }),
    ),
    onSave: async () => {
      err.textContent = '';
      try {
        const cfg = await data.connectInstagram(input.value);
        toast(`Conectado: @${cfg.username}`);
        data.syncInstagram().catch(() => {});
      } catch (e) {
        err.textContent = e.message;
        return false;
      }
    },
  });
}

async function importFile() {
  const input = h('input', { type: 'file', accept: 'application/json,.json' });
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    let parsed;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      return toast('Esse arquivo não é um backup válido.', 'error');
    }
    const mode = await actionSheet({ title: 'Importar backup', message: 'Juntar com o que já existe ou substituir tudo?', actions: [{ label: 'Juntar', value: 'merge', id: 'import-merge' }, { label: 'Substituir tudo', value: 'replace', destructive: true, id: 'import-replace' }] });
    if (!mode) return;
    try {
      const c = data.importBackup(parsed, mode);
      toast(`Importado: ${c.contents} conteúdos`);
    } catch (e) {
      toast(e.message, 'error');
    }
  });
  input.click();
}

function profileForm(p) {
  const f = formGroups([
    { fields: [{ name: 'name', label: 'Nome' }, { name: 'instagram', label: 'Instagram', placeholder: '@' }, { name: 'tiktok', label: 'TikTok', placeholder: '@' }, { name: 'niches', label: 'Nichos', placeholder: 'Beleza, fitness…' }] },
    { fields: [
      { name: 'about', label: 'Sobre você (só fatos reais; o Claude usa isso)', type: 'textarea', rows: 3 },
      { name: 'style', label: 'Seu jeito de criar', type: 'textarea', rows: 3 },
      { name: 'avoid', label: 'O que evitar', type: 'textarea', rows: 3 },
    ] },
  ], p);
  return card({
    title: 'Perfil criativo', subtitle: 'Usado em todos os prompts e nas artes', id: 'profile-card',
    children: f.el,
    foot: h('div', { class: 'page-actions' }, btn('Salvar perfil', () => { data.saveProfile(f.read()); toast('Perfil salvo'); }, { kind: 'primary', id: 'save-profile' })),
  });
}

export function render(root) {
  const p = data.profile();
  const cfg = data.igConfig();
  const last = data.lastBackup();
  const snap = data.snapshotInfo();

  root.append(page({
    kicker: 'Conta',
    title: 'Configurações',
    subtitle: 'Perfil, ritmo de publicação, estilo das artes, conexões e backup.',
    children: h('div', { class: 'grid cols-main' },
      h('div', { class: 'stack' },
        profileForm(p),
        card({ title: 'Plano e constância', flush: true, children: h('div', { class: 'card-body' },
          group({ header: 'Meta', footer: 'Posts por semana que você quer manter. A Visão geral acompanha.', children: [
            cell({ emoji: '🎯', color: 'pink', title: 'Meta semanal', accessory: stepper(p.weeklyGoal || 5, (n) => data.saveProfile({ weeklyGoal: n })) }),
          ] }),
          planGroup(p)) }),
        card({ title: 'Estilo das artes', subtitle: 'Carrosséis e estáticos gerados no Estúdio', flush: true, children: h('div', { class: 'card-body' }, paletteGroup(p)) }),
      ),
      h('div', { class: 'stack' },
        card({ title: 'Conexões', flush: true, children: group({ children: [
          cell({ emoji: '📸', color: 'pink', title: 'Instagram', detail: cfg?.token ? (cfg.lastError ? 'erro' : `@${cfg.username}`) : 'Conectar', chevron: true, onClick: instagramSheet, id: 'instagram-cell' }),
          cell({ emoji: '✨', color: 'orange', title: 'Claude', subtitle: 'Copiar e colar, sem chave de API', chevron: true, onClick: () => sheet({ title: 'Como o Claude ajuda', body: h('div', { class: 'stack' },
            h('p', {}, 'Como o site é público (GitHub Pages), ele não guarda chave de IA.'),
            h('p', {}, 'Nos botões ✨, o site copia um prompt com seu perfil, o formato e o tema, e abre o Claude. Ao voltar, ele oferece colar a resposta e preenche o conteúdo.'),
            h('p', { class: 'muted' }, 'Funciona no plano gratuito do Claude.')) }) }),
        ] }) }),
        card({
          title: 'Seus dados', flush: true, id: 'data-card',
          foot: `Tudo fica salvo só neste navegador (${Math.max(1, Math.round(data.sizeBytes() / 1024))} KB). Limpar os dados do navegador apaga. ${last ? `Último backup: ${fmtDay(last.slice(0, 10), { day: 'numeric', month: 'short' })}.` : 'Você ainda não fez backup.'}`,
          children: group({ children: [
            cell({ emoji: '⬇️', color: 'blue', title: 'Baixar backup', subtitle: 'Arquivo JSON com tudo (sem o token e sem fotos)', onClick: () => { data.exportBackup(); toast('Backup baixado'); rerender(); }, id: 'backup' }),
            cell({ emoji: '⬆️', color: 'blue', title: 'Importar backup', onClick: importFile, id: 'import' }),
            cell({ emoji: '📄', color: 'green', title: 'Exportar conteúdos (CSV)', onClick: () => data.exportCsv() }),
            snap && cell({ emoji: '↩️', color: 'gray', title: `Voltar ao início de ${fmtDay(snap.day, { day: 'numeric', month: 'short' })}`, subtitle: 'Desfaz um erro recente', onClick: async () => {
              const ok = await actionSheet({ message: 'Voltar todos os dados para essa cópia? O que foi feito depois será perdido.', actions: [{ label: 'Voltar', destructive: true, value: true }] });
              if (ok) { data.restoreSnapshot(); toast('Dados restaurados'); }
            } }),
          ] }),
        }),
      ),
    ),
  }));
}
