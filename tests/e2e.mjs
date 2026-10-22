// Teste de ponta a ponta da plataforma (Playwright + Chromium), abrindo o index.html direto.
// Computador (fluxo completo), um sábado simulado (plano automático e Estúdio) e celular.
// Uso: npm run test:e2e
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const require = createRequire(import.meta.url);
let pw;
try {
  pw = require('playwright');
} catch {
  pw = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));
}
const { chromium, devices } = pw;
const shots = process.env.SHOTS_DIR;
if (shots) mkdirSync(shots, { recursive: true });
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = pathToFileURL(path.join(root, 'index.html')).href;
const ROUTES = ['visao-geral', 'conteudo/planejamento', 'conteudo/lista', 'conteudo/estudio', 'conteudo/formatos', 'conteudo/referencias', 'marcas/campanhas', 'marcas/financeiro', 'marcas/contatos', 'analise/desempenho', 'configuracoes'];

// Capa simulada do post (imagem PNG embutida, sem rede)
const CAPA = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP4z8Dwn4Hh////DAwMDAAm4gP9Vh1o8wAAAABJRU5ErkJggg==';
// Instagram simulado (nenhuma chamada real sai do teste)
let igOk = true;
async function mockInstagram(route) {
  const url = new URL(route.request().url());
  const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
  if (!igOk) return json({ error: { code: 190, message: 'Invalid OAuth access token' } }, 400);
  if (url.pathname.endsWith('/me')) return json({ user_id: '1', username: 'duda.ugc', account_type: 'MEDIA_CREATOR', followers_count: 1234 });
  if (url.pathname.endsWith('/me/media')) return json({ data: [
    { id: 'm1', caption: 'Minha mesa de trabalho\n#setup', media_type: 'CAROUSEL_ALBUM', media_product_type: 'FEED', media_url: CAPA, permalink: 'https://www.instagram.com/p/BBB222/', timestamp: '2026-10-06T15:00:00+0000', like_count: 50, comments_count: 9 },
  ] });
  if (url.pathname.includes('/insights')) {
    const v = { reach: 1200, views: 2000, likes: 50, comments: 9, saved: 22, shares: 9, total_interactions: 90, profile_visits: 30, follows: 6 };
    return json({ data: url.searchParams.get('metric').split(',').map((name) => ({ name, values: [{ value: v[name] }] })) });
  }
  return json({ error: { code: 100, message: 'não simulado' } }, 400);
}

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const errors = [];
let step = 0;
const ok = (msg) => console.log(`  ✓ ${++step}. ${msg}`);

async function newPage(opts, clock) {
  const context = await browser.newContext({ acceptDownloads: true, locale: 'pt-BR', ...opts });
  await context.route('https://graph.instagram.com/**', mockInstagram);
  await context.route('https://claude.ai/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>Claude (simulado)</p>' }));
  await context.route('https://fonts.googleapis.com/**', (r) => r.abort());
  await context.route('https://fonts.gstatic.com/**', (r) => r.abort());
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && !String(m.location()?.url).includes('graph.instagram.com') && !/fonts\.g|ERR_FAILED|net::/.test(m.text()) && errors.push(m.text()));
  if (clock) await page.clock.setFixedTime(new Date(clock));
  return { context, page };
}

const { context, page } = await newPage({ viewport: { width: 1440, height: 900 } }, '2026-10-21T10:00:00');
let current = page;
const snap = async (name, p = current) => shots && p.screenshot({ path: path.join(shots, `${name}.png`), fullPage: true });
const drawer = (p = current) => p.locator('dialog.sheet[open]').last();
const save = async (p = current) => {
  await drawer(p).locator('[data-id="sheet-save"]').click();
  await p.waitForSelector('dialog.sheet[open]', { state: 'detached' });
};
const nav = async (route, p = current) => {
  const link = p.locator(`.sidebar [data-nav="${route}"]`);
  if (await link.isVisible()) await link.click();
  else await p.goto(`${base}#/${route}`);
  await p.waitForSelector(`.sidebar .nav-link.on[data-nav="${route}"]`, { state: 'attached' });
  await p.waitForSelector('.page-title');
};
const noJunk = async (where, p = current) => {
  const bad = await p.evaluate(() => (document.body.innerText.match(/(^|\s)(null|undefined|false|NaN)(\s|$)/) || [])[0]);
  if (bad) throw new Error(`Texto indevido "${bad.trim()}" em ${where}`);
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 1) throw new Error(`Rolagem horizontal em ${where} (${overflow}px)`);
};
// Simula: abrir o Claude, copiar a resposta e voltar à plataforma.
const answerClaude = async (trigger, answer, p = current, ctx = context) => {
  const [popup] = await Promise.all([ctx.waitForEvent('page'), trigger()]);
  const q = new URL(popup.url()).searchParams.get('q') || '';
  await popup.close();
  await p.waitForTimeout(500);
  if (!(await p.locator('dialog.sheet[open] h2:has-text("Resposta do Claude")').count())) await p.click('[data-id="pending-banner"]');
  await p.waitForSelector('dialog.sheet[open] h2:has-text("Resposta do Claude")');
  await drawer(p).locator('textarea').fill(answer);
  await drawer(p).locator('[data-id="use-text"]').click();
  return q;
};

try {
  // ================= Computador =================
  await page.goto(base);
  await page.waitForSelector('.page-title:has-text("Visão geral")');
  if (!(await page.locator('.sidebar .nav-link.on[data-nav="visao-geral"]').count())) throw new Error('Menu lateral sem item ativo');
  for (const r of ROUTES) {
    await nav(r);
    if (!(await page.locator(`.sidebar .nav-link.on[data-nav="${r}"]`).count())) throw new Error(`Menu não marcou ${r}`);
    await noJunk(r);
  }
  ok(`Abre direto do arquivo; menu lateral leva às ${ROUTES.length} páginas sem erros, textos soltos ou rolagem lateral`);

  await page.goto(`${base}#/semana`);
  await page.waitForSelector('.page-title:has-text("Planejamento")');
  if (!page.url().endsWith('#/conteudo/planejamento')) throw new Error(`Redirecionamento falhou: ${page.url()}`);
  ok('Endereços antigos (#/semana) redirecionam para as páginas novas');

  // ---- Visão geral: sugestão → conteúdo ----
  await nav('visao-geral');
  if ((await page.locator('[data-id^="sugg-"]').count()) !== 3) throw new Error('Esperava 3 sugestões');
  await page.locator('[data-id="do-this"]').first().click();
  await page.waitForSelector('dialog.sheet[open] h2:has-text("Novo conteúdo")');
  await drawer().locator('input[name="title"]').fill('Testei o sérum da minha irmã');
  await drawer().locator('textarea[name="hook"]').fill('Oi gente, vocês sabiam disso?');
  await drawer().locator('.warn-list li').first().waitFor();
  await drawer().locator('.format-help summary').click();
  await drawer().locator('.hook-pill').first().click();
  await drawer().locator('textarea[name="steps"]').fill('Mostro o pote\nPasso no rosto\nVeredito');
  await save();
  await page.waitForSelector('[data-id="today-card"] .content-row:has-text("Testei o sérum")');
  ok('Sugestão do dia vira conteúdo pelo painel lateral (revisor de gancho e ganchos-modelo)');

  for (let i = 0; i < 4; i++) await page.locator('.content-row:has-text("Testei o sérum") [data-id="advance"]').click();
  await page.waitForSelector('.content-row:has-text("Testei o sérum") .done-mark');
  await page.waitForSelector('[data-id="week-widget"] .kpi-value:text("1/5")');
  await page.reload();
  await page.waitForSelector('.content-row:has-text("Testei o sérum") .done-mark');
  ok('Etapas avançam com um clique, indicador da semana atualiza e tudo continua após recarregar');
  await snap('01-visao-geral');

  // ---- Resultados do post → Desempenho ----
  await page.locator('.content-row:has-text("Testei o sérum") .content-main').click();
  await drawer().locator('input[name="views"]').fill('3000');
  await drawer().locator('input[name="follows"]').fill('12');
  await drawer().locator('input[name="saves"]').fill('40');
  await drawer().locator('input[name="brandContacts"]').fill('1');
  await save();
  await nav('analise/desempenho');
  await page.waitForSelector('.kpi:has-text("Posts publicados") .kpi-value:text("1")');
  await page.waitForSelector('[data-id^="post-"]:has-text("Testei o sérum")');
  await page.waitForSelector('.tag:has-text("Poucos dados")');
  await page.waitForSelector('.chart svg');
  await noJunk('desempenho');
  await snap('02-desempenho');
  ok('Desempenho: indicadores, gráficos, tabela por formato (com aviso de poucos dados) e tabela de posts');

  // ---- Formatos + Claude ----
  await nav('conteudo/formatos');
  await page.click('[data-id="format-testei-7-dias"]');
  await drawer().locator('input[aria-label="Tema"]').fill('protetor solar');
  const answer = 'Aqui está:\n```json\n{"title":"7 dias de protetor","hook":"Usei o protetor da minha mãe por 7 dias","hooks":["a","b"],"steps":["Dia 1: abro","Dia 4: irritou","Veredito"],"caption":"legenda","cta":"me conta","check":["confirmar FPS no rótulo"],"critique":"o tema é comum, destaque sua pele oleosa"}\n```';
  const q = await answerClaude(() => drawer().locator('[data-id="format-claude"]').click(), answer);
  if (!q.includes('protetor solar') || !q.includes('Testei por 7 dias')) throw new Error('Prompt não foi para o Claude pela URL');
  await page.waitForSelector('dialog.sheet[open] .cell:has-text("confirmar FPS")');
  await page.waitForSelector('dialog.sheet[open] .cell:has-text("pele oleosa")');
  if ((await drawer().locator('textarea[name="steps"]').inputValue()).split('\n').length !== 3) throw new Error('Roteiro não preenchido');
  await drawer().locator('[data-id="sheet-cancel"]').click();
  ok('Claude: abre com o prompt pronto; ao voltar, colar a resposta preenche roteiro, ponto fraco e o que confirmar');

  await answerClaude(async () => { await nav('conteudo/planejamento'); await page.click('[data-id="claude-ideas"]'); },
    '{"ideas":[{"title":"Rotina de domingo","formatId":"organiza-comigo","hook":"h","why":"w"},{"title":"Opinião sobre skincare caro","formatId":"opiniao-impopular","hook":"h2","why":"w2"}]}');
  await page.waitForSelector('[data-id^="idea-"]:has-text("Rotina de domingo")');
  await page.locator('[data-id^="idea-"]:has-text("Rotina de domingo") [data-id="schedule"]').click();
  await page.locator('dialog.action-sheet .as-btn').first().click();
  await page.waitForSelector('.board .plan-card:has-text("Rotina de domingo")');
  await noJunk('planejamento');
  ok('Ideias do Claude entram nas ideias guardadas e são agendadas no quadro da semana');

  // ---- Conteúdos: tabela, busca, etapa, quadro ----
  await nav('conteudo/lista');
  await page.waitForSelector('tbody tr[data-id^="row-"]');
  const total = await page.locator('tbody tr').count();
  await page.locator('.search').fill('domingo');
  await page.waitForFunction(() => document.querySelectorAll('tbody tr').length === 1);
  await page.locator('tbody tr [data-id="status-select"]').selectOption('gravado');
  await page.waitForSelector('.toast:has-text("Etapa atualizada")');
  await page.locator('.search').fill('');
  await page.waitForFunction((n) => document.querySelectorAll('tbody tr').length === n, total);
  await page.click('.segmented button:has-text("Quadro por etapa")');
  await page.waitForSelector('.kanban-col[data-status="gravado"] .kanban-card:has-text("Rotina de domingo")');
  await snap('03-conteudos-quadro');
  ok(`Conteúdos: tabela (${total}), busca, troca de etapa na linha e quadro por etapa`);
  await page.click('.segmented button:has-text("Tabela")');

  // ---- Referências ----
  await nav('conteudo/referencias');
  await page.click('[data-id="new-reference"]');
  await drawer().locator('input[name="title"]').fill('Review com plot twist');
  await drawer().locator('textarea[name="worked"]').fill('Gancho com o veredito');
  await save();
  await page.waitForSelector('tbody tr[data-id^="ref-"]:has-text("Review com plot twist")');
  ok('Referência salva e listada em tabela');

  // ---- Campanhas ----
  await nav('marcas/campanhas');
  await page.click('[data-id="new-deal"]');
  await page.click('[data-id="new-ugc"]');
  await drawer().locator('input[name="brandName"]').fill('Glow Skin');
  await drawer().locator('[data-stage="gravacao"]').click();
  await drawer().locator('input[data-deliv="0"]').fill('2 vídeos de 30s');
  await drawer().locator('.deliv-row input[type="date"]').first().fill('2026-10-01');
  await drawer().locator('input[name="value"]').fill('800');
  await drawer().locator('input[name="paymentDue"]').fill('2026-11-10');
  await save();
  await page.waitForSelector('tbody tr.is-late[data-id^="deal-"]:has-text("Glow Skin")');
  await page.waitForSelector('.sidebar [data-nav="marcas/campanhas"] .nav-count:text("1")');
  await nav('visao-geral');
  await page.waitForSelector('[data-id="brand-deadlines"] .late-row:has-text("Glow Skin")');
  await page.waitForSelector('[data-id="late-kpi"] .kpi-value:text("1")');
  ok('Campanha UGC atrasada: linha destacada, contador no menu e alerta na Visão geral');

  await nav('marcas/campanhas');
  await page.click('[data-id="new-deal"]');
  await page.click('[data-id="new-publi"]');
  await drawer().locator('input[name="brandName"]').fill('Fit Co');
  await drawer().locator('input[name="value"]').fill('1500');
  await drawer().locator('select[name="paymentStatus"]').selectOption('pago');
  await save();
  await nav('marcas/financeiro');
  await page.waitForSelector('[data-id="kpi-received"] .kpi-value:has-text("1.500,00")');
  await page.waitForSelector('[data-id="kpi-to-receive"] .kpi-value:has-text("800,00")');
  await page.waitForSelector('.warn-note:has-text("sem nota fiscal")');
  await page.waitForSelector('.chart svg');
  await noJunk('financeiro');
  await snap('04-financeiro');
  ok('Financeiro: recebido, a receber, gráfico mensal e aviso de nota fiscal');

  await nav('marcas/campanhas');
  await page.locator('tbody tr[data-id^="deal-"]:has-text("Glow Skin")').click();
  const [ics] = await Promise.all([page.waitForEvent('download'), drawer().locator('[data-id="deal-ics"]').click()]);
  const icsText = readFileSync(await ics.path(), 'utf8');
  if (!icsText.includes('BEGIN:VEVENT') || !icsText.includes('Glow Skin')) throw new Error('ICS inválido');
  await drawer().locator('[data-id="sheet-cancel"]').click();
  ok('Prazos da campanha exportados para o Calendário (.ics)');

  await nav('marcas/contatos');
  await page.click('[data-id="new-brand"]');
  await drawer().locator('input[name="name"]').fill('Marca Teste');
  await drawer().locator('select[name="status"]').selectOption('contatei');
  await save();
  await page.waitForSelector('tbody tr[data-id^="brand-"]:has-text("Marca Teste")');
  ok('Contatos de marcas em tabela');

  // ---- Configurações ----
  await nav('configuracoes');
  await page.locator('[data-id="profile-card"] input[name="name"]').fill('Duda Gomes');
  await page.click('[data-id="save-profile"]');
  await page.locator('.stepper button[aria-label="Aumentar"]').first().click();
  await nav('visao-geral');
  await page.waitForSelector('.page-title:has-text("Olá, Duda")');
  await page.waitForSelector('[data-id="week-widget"] .kpi-value:text("1/6")');
  ok('Perfil e meta semanal (5 → 6) refletem na Visão geral');

  await nav('configuracoes');
  await page.click('[data-id="instagram-cell"]');
  await drawer().locator('input[type="password"]').fill('IGQ-token-teste');
  await drawer().locator('[data-id="sheet-save"]').click();
  await page.waitForSelector('.toast:has-text("@duda.ugc")');
  await page.waitForTimeout(500);
  await nav('analise/desempenho');
  await page.selectOption('select[aria-label="Período"]', 'all');
  await page.waitForSelector('.post-grid [data-id^="post-"]:has-text("Minha mesa de trabalho") .tag:has-text("Instagram")');
  await page.waitForSelector('.post-grid [data-id^="post-"]:has-text("Minha mesa de trabalho") img.pg-img');
  await page.click('.card-head .segmented button:has-text("Tabela")');
  await page.waitForSelector('tbody tr[data-id^="post-"]:has-text("Minha mesa de trabalho") img.td-thumb');
  await page.click('.card-head .segmented button:has-text("Grade")');
  ok('Instagram conectado: post importado com capa na grade e na tabela, números e origem marcada');

  await nav('configuracoes');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-id="backup"]')]);
  const backup = readFileSync(await dl.path(), 'utf8');
  if (backup.includes('IGQ-token-teste')) throw new Error('Token vazou no backup');
  if (!backup.includes('Testei o sérum') || !backup.includes('Glow Skin')) throw new Error('Backup incompleto');
  ok('Backup baixado com tudo e sem o token');

  igOk = false;
  await page.click('[data-id="instagram-cell"]');
  await drawer().locator('[data-id="ig-sync"]').click();
  await page.waitForSelector('.toast.error:has-text("token")');
  igOk = true;
  await page.keyboard.press('Escape');
  ok('Token recusado mostra aviso claro');

  // Pacote: junta ideias, formato e perfil sem apagar nada
  const pack = { meta: { kind: 'pacote', title: 'Pacote de teste' }, profile: { about: 'Sobre vindo do pacote' }, formats: [{ id: 'serie-teste', name: 'Série de teste', why: 'w', structure: ['a'], hooks: ['h'], goals: ['marcas'] }], contents: Array.from({ length: 13 }, (_, i) => ({ id: `pk-${i}`, title: `Ideia do pacote ${i + 1}`, status: 'ideia', date: '' })) };
  const totalBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('creator:db')).contents.length);
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('[data-id="import"]')]);
  await chooser.setFiles({ name: 'pacote.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(pack)) });
  await page.click('[data-id="import-pack"]');
  await page.waitForSelector('.toast:has-text("Pacote importado")');
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('creator:db')));
  if (after.contents.length !== totalBefore + 13) throw new Error('Pacote não juntou as ideias');
  if (after.profile.about !== 'Sobre vindo do pacote' || after.profile.name !== 'Duda Gomes') throw new Error('Pacote não atualizou só o perfil enviado');
  await nav('conteudo/planejamento');
  await page.click('[data-id="all-ideas"]');
  await page.waitForSelector('tbody tr:has-text("Ideia do pacote 13")');
  await page.click('.filters .btn:has-text("Limpar filtros")');
  ok('Pacote importado junta ideias, formato e perfil sem apagar nada; "Ver todas as ideias" abre a lista filtrada');
  await nav('configuracoes');

  await nav('conteudo/lista');
  await page.locator('tbody tr:has-text("Testei o sérum")').click();
  await drawer().locator('[data-id="delete-content"]').click();
  await page.click('[data-id="confirm-delete"]');
  await page.waitForSelector('tbody tr:has-text("Testei o sérum")', { state: 'detached' });
  await page.reload();
  await page.waitForSelector('.page-title:has-text("Conteúdos")');
  if (await page.locator('tbody tr:has-text("Testei o sérum")').count()) throw new Error('Conteúdo apagado voltou');
  ok('Apagar com confirmação e continua apagado após recarregar');
  await context.close();

  // ================= Sábado: plano automático, Estúdio e Claude =================
  const sat = await newPage({ viewport: { width: 1440, height: 900 } }, '2026-10-24T10:00:00');
  const sp = sat.page;
  current = sp;
  await sp.goto(base);
  await sp.waitForSelector('.toast:has-text("Plano da próxima semana pronto")');
  await sp.waitForSelector('[data-id="plan-banner"]');
  await nav('conteudo/planejamento');
  const days = await sp.locator('.board .plan-card').evaluateAll((els) => els.map((e) => e.dataset.id));
  if (days.join() !== 'plan-2026-10-26,plan-2026-10-27,plan-2026-10-28,plan-2026-10-29,plan-2026-10-30') throw new Error(`Dias errados: ${days}`);
  const tagsText = (await sp.locator('.board .plan-tags').allInnerTexts()).join(' ');
  if (!tagsText.includes('Carrossel') || !tagsText.includes('Estático')) throw new Error('Plano sem carrossel/estático');
  await snap('05-planejamento', sp);
  ok('Sábado: plano de segunda a sexta gerado sozinho no quadro, com vídeo, carrossel e estático');

  const before = await sp.locator('.board .plan-title').nth(1).innerText();
  await sp.locator('.board .plan-card').nth(1).locator('[data-id="reroll"]').click();
  await sp.waitForFunction((b) => document.querySelectorAll('.board .plan-title')[1]?.innerText !== b, before);
  ok('↻ troca a sugestão de um dia');

  await sp.locator('.board .plan-card:has(.tag:has-text("Estático")) [data-id="open-design"]').click();
  await sp.waitForSelector('.big-canvas');
  const body = sp.locator('textarea[name="slide-body"], textarea[name="slide-items"]').first();
  await body.fill('Quando eu comecei, aceitei valores que não pagavam a luz.\nE você?');
  if ((await sp.evaluate(() => document.activeElement?.name)) !== (await body.getAttribute('name'))) throw new Error('Perdeu o foco ao digitar no Estúdio');
  const [dl1] = await Promise.all([sp.waitForEvent('download'), sp.click('[data-id="export-design"]')]);
  const jpg = readFileSync(await dl1.path());
  if (jpg[0] !== 0xff || jpg[1] !== 0xd8 || jpg.length < 20000) throw new Error('Exportação não gerou JPG');
  await snap('06-estudio', sp);
  ok('Estúdio em página inteira: texto editado ao vivo (sem perder o foco) e imagem 1080×1350 exportada');

  await sp.click('[data-id="new-content"]');
  await drawer(sp).locator('input[name="title"]').fill('Minha opinião sincera sobre o protetor da minha mãe');
  await drawer(sp).locator('select[name="formatId"]').selectOption('review-honesto');
  await drawer(sp).locator('select[name="type"]').selectOption('carrossel');
  const prevUrl = sp.url();
  await drawer(sp).locator('[data-id="content-design"]').click();
  await sp.waitForFunction((u) => location.href !== u, prevUrl);
  await sp.waitForSelector('.slide-thumb .need-photo');
  const need = await sp.locator('.need-photo').count();
  if (need < 1) throw new Error('Carrossel de review deveria pedir foto');
  await sp.locator('.slide-thumb:has(.need-photo)').first().click();
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP4z8Dwn4Hh////DAwMDAAm4gP9Vh1o8wAAAABJRU5ErkJggg==', 'base64');
  await sp.locator('[data-id="photo-input"]').setInputFiles({ name: 'eu.png', mimeType: 'image/png', buffer: png });
  await sp.waitForSelector('.toast:has-text("Foto adicionada")');
  await sp.waitForFunction((k) => document.querySelectorAll('.need-photo').length === k - 1, need);
  ok('Carrossel pede foto sua e guarda a foto enviada');

  const studioUrl = sp.url();
  await sp.click('[data-id="delete-design"]');
  await sp.click('[data-id="confirm-delete"]');
  await sp.waitForSelector('.toast:has-text("Design apagado")');
  await sp.waitForFunction((u) => location.href !== u, studioUrl);
  await sp.waitForSelector('.page-title:has-text("Estúdio")');
  if (await sp.locator('.gallery-item:has-text("protetor da minha mãe")').count()) throw new Error('Design apagado continua no Estúdio');
  await nav('conteudo/lista');
  await sp.locator('tbody tr:has-text("protetor da minha mãe")').click();
  await drawer(sp).locator('[data-id="content-design"]:has-text("Criar design")').waitFor();
  if (await drawer(sp).locator('[data-id="content-delete-design"]').count()) throw new Error('Botão de apagar design sem design');
  await drawer(sp).locator('[data-id="sheet-cancel"]').click();
  ok('Apagar design: some do Estúdio, o conteúdo continua e dá para criar de novo');

  await nav('marcas/campanhas');
  await sp.click('[data-id="new-deal"]');
  await sp.click('[data-id="new-publi"]');
  await drawer(sp).locator('input[name="brandName"]').fill('Marca Publi');
  await drawer(sp).locator('input[name="postDate"]').fill('2026-10-29');
  await save(sp);
  await nav('conteudo/planejamento');
  await sp.click('[data-id="regenerate"]');
  await sp.click('[data-id="confirm-regenerate"]');
  await sp.waitForSelector('[data-id="plan-2026-10-29"]:has-text("Publi: Marca Publi")');
  ok('Publi com data entra no plano da semana');

  await answerClaude(() => sp.click('[data-id="claude-week"]'), '{"days":[{"n":1,"title":"Título escrito pelo Claude","hook":"Gancho do Claude","steps":["a","b"],"caption":"legenda"}]}', sp, sat.context);
  await sp.waitForSelector('.toast:has-text("preenchidos pelo Claude")');
  await nav('conteudo/planejamento');
  await sp.waitForSelector('.board .plan-title:has-text("Título escrito pelo Claude")');
  await sp.reload();
  await sp.waitForSelector('.board .plan-title:has-text("Título escrito pelo Claude")');
  const [wics] = await Promise.all([sp.waitForEvent('download'), sp.click('[data-id="week-ics"]')]);
  if (!readFileSync(await wics.path(), 'utf8').includes('VEVENT')) throw new Error('ICS da semana vazio');
  if ((await sp.locator('.toast:has-text("Plano da próxima semana pronto")').count()) > 0) throw new Error('Gerou o plano de novo ao recarregar');
  ok('Claude escreve a semana; plano continua após recarregar, não é gerado duas vezes e vai para o Calendário');

  // ================= Celular =================
  const mob = await newPage({ ...devices['iPhone 13'] }, '2026-10-24T10:00:00');
  current = mob.page;
  const mp = mob.page;
  await mp.goto(base);
  await mp.waitForSelector('.page-title');
  if (await mp.locator('.sidebar').isVisible().then(async (v) => v && (await mp.evaluate(() => document.querySelector('.sidebar').getBoundingClientRect().right > 0)))) throw new Error('Menu lateral deveria ficar fechado no celular');
  await mp.click('.menu-btn');
  await mp.click('.sidebar [data-nav="marcas/financeiro"]');
  await mp.waitForSelector('.page-title:has-text("Financeiro")');
  for (const r of ROUTES) {
    await mp.goto(`${base}#/${r}`);
    await mp.waitForSelector('.page-title');
    await noJunk(`celular ${r}`, mp);
  }
  await snap('07-celular', mp);
  ok('Celular: menu abre pelo botão, todas as páginas sem rolagem lateral');
  await sat.context.close();
  await mob.context.close();

  if (errors.length) throw new Error(`Erros no console:\n${errors.join('\n')}`);
  ok('Nenhum erro de JavaScript');
  console.log(`\nTudo certo: ${step} verificações.`);
} catch (err) {
  await snap('falha').catch(() => {});
  console.error(`\n✗ Falhou depois da etapa ${step}: ${err.message.split('\n').slice(0, 6).join('\n')}`);
  if (errors.length) console.error(errors.join('\n'));
  process.exitCode = 1;
} finally {
  await browser.close();
}
