// Perfil (usado nos prompts), backup/importação e conexão com o Instagram.
import * as data from '../data.js';
import { h, put, form, attempt, toast, confirmDialog, fmtDate } from '../ui.js';
import { instagramPanel } from './instagram-panel.js';

export function render(root) {
  const p = data.profile();
  const f = form(
    [
      { name: 'name', label: 'Seu nome (opcional)' },
      { name: 'handleInstagram', label: '@ no Instagram' },
      { name: 'handleTiktok', label: '@ no TikTok' },
      { name: 'summary', label: 'Quem eu sou', type: 'textarea', rows: 3 },
      { name: 'experience', label: 'Experiência (só fatos reais)', type: 'textarea', rows: 2, help: 'A IA só cita o que estiver aqui. Não coloque números que você não tem.' },
      { name: 'goals', label: 'Objetivos (um por linha)', type: 'textarea', rows: 5 },
      { name: 'portfolioNiches', label: 'Nichos de portfólio (um por linha)', type: 'textarea', rows: 3 },
      { name: 'exploreNiches', label: 'Temas que quero explorar (um por linha)', type: 'textarea', rows: 4 },
      { name: 'pillars', label: 'Pilares editoriais (um por linha)', type: 'textarea', rows: 4, help: 'Aparecem como opção na agenda e nos filtros.' },
      { name: 'style', label: 'Meu estilo', type: 'textarea', rows: 5 },
      { name: 'avoid', label: 'Evitar (um por linha)', type: 'textarea', rows: 6 },
    ],
    p,
  );

  const fileInput = h('input', { type: 'file', accept: 'application/json,.json', 'aria-label': 'Arquivo de backup' });
  const modeSel = h('select', { 'aria-label': 'Modo de importação' },
    h('option', { value: 'merge' }, 'Mesclar (mantém o que já existe)'),
    h('option', { value: 'replace' }, 'Substituir tudo pelo backup'));
  const kb = Math.round(data.sizeBytes() / 1024);
  const last = data.lastBackup();
  const snap = data.snapshotInfo();

  put(root, 
    h('header', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Perfil e dados'), h('p', { class: 'lede' }, 'Seu perfil orienta os prompts. Seus dados ficam salvos neste navegador.'))),
    instagramPanel(),
    h('section', { class: 'panel' },
      h('h2', {}, 'Perfil criativo'),
      f.el,
      h('div', { class: 'row-actions' }, h('button', { class: 'btn btn-primary', onclick: () => attempt(() => data.saveProfile(f.read()), 'Perfil salvo.') }, 'Salvar perfil')),
    ),
    h('section', { class: 'panel' },
      h('h2', {}, 'Backup'),
      h('p', {}, `Seus dados ocupam ${kb} KB e estão guardados só neste navegador, neste aparelho. `,
        h('strong', {}, 'Limpar os dados do navegador apaga tudo.'), ' Baixe um backup com frequência e guarde no Google Drive, iCloud ou e-mail.'),
      h('p', { class: last ? 'muted small' : 'note' }, last ? `Último backup baixado: ${fmtDate(last, { day: '2-digit', month: 'short', year: 'numeric' })}.` : 'Você ainda não baixou nenhum backup.'),
      !data.isPersistent() && h('p', { class: 'muted small' }, 'O navegador não garantiu armazenamento permanente para este site. Mais um motivo para manter backups.'),
      h('div', { class: 'row-actions' },
        h('button', { class: 'btn btn-primary', onclick: () => { data.exportBackup(); toast('Backup baixado.'); } }, 'Baixar backup (JSON)'),
        h('button', { class: 'btn', onclick: () => data.exportCsv() }, 'Exportar agenda + métricas (CSV)'),
      ),
      h('h3', {}, 'Restaurar ou levar para outro aparelho'),
      h('p', { class: 'help' }, 'No outro aparelho/navegador, abra o site, venha aqui e importe o arquivo de backup.'),
      h('div', { class: 'row-actions' }, fileInput, modeSel,
        h('button', { class: 'btn', onclick: async () => {
          const file = fileInput.files?.[0];
          if (!file) return toast('Escolha um arquivo .json de backup.', 'error');
          let parsed;
          try {
            parsed = JSON.parse(await file.text());
          } catch {
            return toast('Este arquivo não é um JSON válido.', 'error');
          }
          if (modeSel.value === 'replace' && !(await confirmDialog('Substituir TODOS os dados atuais pelo backup? Baixe um backup do estado atual antes, se tiver dúvida.', { okLabel: 'Substituir' }))) return;
          const r = await attempt(() => data.importBackup(parsed, modeSel.value));
          if (r) toast(`Importado: ${Object.entries(r.counts).map(([k, v]) => `${v} ${k}`).join(', ')}.`);
        } }, 'Importar'),
      ),
      snap && h('p', { class: 'help' }, `Desfazer um erro recente: o site guarda uma cópia de como estava no início de ${fmtDate(snap.day, { day: '2-digit', month: 'short' })}. `,
        h('button', { class: 'link-btn', onclick: async () => {
          if (await confirmDialog('Voltar todos os dados para essa cópia? O que foi feito depois será perdido.', { okLabel: 'Voltar' })) attempt(() => data.restoreSnapshot(), 'Dados restaurados.');
        } }, 'Voltar para essa cópia')),
    ),
    h('section', { class: 'panel small-print' },
      h('h2', {}, 'Como a IA funciona aqui'),
      h('p', {}, 'Este é um site público (GitHub Pages), então não pode guardar chave de API: qualquer pessoa conseguiria vê-la. Por isso, nas áreas de ideias, roteiros e marcas você usa três passos: copiar o prompt, colar no Claude (claude.ai) e colar a resposta de volta. O site lê a resposta e cria os registros.'),
      h('p', {}, 'Funciona com o plano gratuito ou pago do Claude, sem custo extra de API.'),
    ),
  );
}
