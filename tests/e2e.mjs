// Teste de ponta a ponta num iPhone simulado (Playwright + Chromium), abrindo o index.html direto.
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

// Instagram simulado
let igOk = true;
async function mockInstagram(route) {
  const url = new URL(route.request().url());
  const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
  if (!igOk) return json({ error: { code: 190, message: 'Invalid OAuth access token' } }, 400);
  if (url.pathname.endsWith('/me')) return json({ user_id: '1', username: 'duda.ugc', account_type: 'MEDIA_CREATOR', followers_count: 1234 });
  if (url.pathname.endsWith('/me/media')) return json({ data: [
    { id: 'm1', caption: 'Minha mesa de trabalho\n#setup', media_type: 'CAROUSEL_ALBUM', media_product_type: 'FEED', permalink: 'https://www.instagram.com/p/BBB222/', timestamp: '2026-10-06T15:00:00+0000', like_count: 50, comments_count: 9 },
  ] });
  if (url.pathname.includes('/insights')) {
    const v = { reach: 1200, views: 2000, likes: 50, comments: 9, saved: 22, shares: 9, total_interactions: 90, profile_visits: 30, follows: 6 };
    return json({ data: url.searchParams.get('metric').split(',').map((name) => ({ name, values: [{ value: v[name] }] })) });
  }
  return json({ error: { code: 100, message: 'não simulado' } }, 400);
}

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const context = await browser.newContext({ ...devices['iPhone 13'], acceptDownloads: true, locale: 'pt-BR' });
await context.route('https://graph.instagram.com/**', mockInstagram);
await context.route('https://claude.ai/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>Claude (simulado)</p>' }));
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && !String(m.location()?.url).includes('graph.instagram.com') && errors.push(m.text()));

let step = 0;
const ok = (msg) => console.log(`  ✓ ${++step}. ${msg}`);
const snap = async (name) => shots && page.screenshot({ path: path.join(shots, `${name}.png`), fullPage: true });
const sheet = () => page.locator('dialog.sheet[open]').last();
const saveSheet = async () => {
  await sheet().locator('[data-id="sheet-save"]').click();
  await page.waitForSelector('dialog.sheet[open]', { state: 'detached' });
};
const tab = async (name) => {
  if (name === 'perfil') {
    await page.click('[data-tab="hoje"]');
    await page.click('[data-id="open-profile"]');
  } else await page.click(`[data-tab="${name}"]`);
  await page.waitForTimeout(80);
};
const noJunk = async (where) => {
  const bad = await page.evaluate(() => (document.body.innerText.match(/(^|\s)(null|undefined|false|NaN)(\s|$)/) || [])[0]);
  if (bad) throw new Error(`Texto indevido "${bad.trim()}" em ${where}`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 1) throw new Error(`Rolagem horizontal em ${where} (${overflow}px)`);
};
// Simula: abrir o Claude, copiar a resposta e voltar ao site.
const answerClaude = async (trigger, answer) => {
  const [popup] = await Promise.all([context.waitForEvent('page'), trigger()]);
  const q = new URL(popup.url()).searchParams.get('q') || '';
  await popup.close();
  await page.goto(`${base}#/`);
  await page.waitForTimeout(600);
  // Ao voltar, a folha de colar abre sozinha; se não abrir, usa o aviso no topo do Hoje.
  if (!(await page.locator('dialog.sheet[open] h2:has-text("Resposta do Claude")').count())) await page.click('[data-id="pending-banner"]');
  await page.waitForSelector('dialog.sheet[open] h2:has-text("Resposta do Claude")');
  await sheet().locator('textarea').fill(answer);
  await sheet().locator('[data-id="use-text"]').click();
  return q;
};

try {
  await page.goto(base);
  await page.waitForSelector('h1:has-text("Hoje")');
  await page.waitForSelector('[data-id^="sugg-"]');
  if ((await page.locator('[data-id^="sugg-"]').count()) !== 3) throw new Error('Esperava 3 sugestões');
  for (const t of ['semana', 'marcas', 'formatos', 'resultados', 'perfil', 'hoje']) {
    await tab(t);
    await page.waitForSelector('.large-title h1');
    await noJunk(`aba ${t}`);
  }
  ok('Abre direto do arquivo; 5 abas + Perfil sem erros, sem textos soltos e sem rolagem lateral; 3 sugestões no Hoje');

  // ---- Fazer uma sugestão ----
  const firstFormat = await page.locator('[data-id^="sugg-"] .cell-title').first().innerText();
  await page.locator('[data-id="do-this"]').first().click();
  await page.waitForSelector('dialog.sheet[open] h2:has-text("Novo conteúdo")');
  await sheet().locator('input[name="title"]').fill('Testei o sérum da minha irmã');
  await sheet().locator('textarea[name="hook"]').fill('Oi gente, vocês sabiam disso?');
  await sheet().locator('.warn-list li').first().waitFor();
  await sheet().locator('.format-help summary').click();
  await sheet().locator('.hook-pill').first().click();
  await sheet().locator('textarea[name="steps"]').fill('Mostro o pote\nPasso no rosto\nVeredito');
  await saveSheet();
  await page.waitForSelector('.content-row:has-text("Testei o sérum")');
  ok(`Sugestão "${firstFormat}" virou conteúdo de hoje (com revisor de gancho e ganchos-modelo do formato)`);

  // ---- Avançar etapas até postar ----
  for (let i = 0; i < 4; i++) await page.locator('.content-row:has-text("Testei o sérum") [data-id="advance"]').click();
  await page.waitForSelector('.content-row:has-text("Testei o sérum") .done-mark');
  await page.waitForSelector('[data-id="week-widget"] .w-value:text("1/5")');
  ok('Etapas avançam com um toque (roteiro → gravado → editado → postado) e o anel da semana atualiza');

  await page.reload();
  await page.waitForSelector('.content-row:has-text("Testei o sérum") .done-mark');
  ok('Continua lá depois de recarregar a página');
  await snap('01-hoje');

  // ---- Resultados ----
  await page.locator('.content-row:has-text("Testei o sérum") .content-main').click();
  await sheet().locator('input[name="views"]').fill('3000');
  await sheet().locator('input[name="follows"]').fill('12');
  await sheet().locator('input[name="saves"]').fill('40');
  await sheet().locator('input[name="brandContacts"]').fill('1');
  await saveSheet();
  await tab('resultados');
  await page.waitForSelector('.widget.stat:has-text("Posts no mês") .w-value:text("1")');
  await page.waitForSelector('.cell:has-text("Destaques"), .group-header:has-text("Destaques")');
  await page.click('.segmented button:has-text("Por formato")');
  await page.waitForSelector('.fmt-row .tag:has-text("Poucos dados")');
  await noJunk('resultados/formatos');
  ok('Resultados registrados; resumo, destaque por contato de marca e aviso de poucos dados');

  // ---- Formatos + Claude ----
  await tab('formatos');
  await page.click('[data-id="format-testei-7-dias"]');
  await sheet().locator('input[aria-label="Tema"]').fill('protetor solar');
  const answer = 'Aqui está:\n```json\n{"title":"7 dias de protetor","hook":"Usei o protetor da minha mãe por 7 dias","hooks":["a","b"],"steps":["Dia 1: abro","Dia 4: irritou","Veredito"],"caption":"legenda","cta":"me conta","check":["confirmar FPS no rótulo"],"critique":"o tema é comum, destaque sua pele oleosa"}\n```';
  const q = await answerClaude(() => sheet().locator('[data-id="format-claude"]').click(), answer);
  if (!q.includes('protetor solar') || !q.includes('Testei por 7 dias')) throw new Error('Prompt não foi para o Claude pela URL');
  await page.waitForSelector('dialog.sheet[open] .cell:has-text("confirmar FPS")');
  await page.waitForSelector('dialog.sheet[open] .cell:has-text("pele oleosa")');
  if ((await sheet().locator('textarea[name="steps"]').inputValue()).split('\n').length !== 3) throw new Error('Roteiro não preenchido');
  await sheet().locator('[data-id="sheet-cancel"]').click();
  ok('✨ Claude: abre com o prompt pronto (formato + tema + perfil); ao voltar, colar preenche o roteiro, o ponto fraco e o que confirmar');

  await answerClaude(async () => { await tab('semana'); await page.click('[data-id="claude-ideas"]'); },
    '{"ideas":[{"title":"Rotina de domingo","formatId":"organiza-comigo","hook":"h","why":"w"},{"title":"Opinião sobre skincare caro","formatId":"opiniao-impopular","hook":"h2","why":"w2"}]}');
  await page.waitForSelector('[data-id^="idea-"]:has-text("Rotina de domingo")');
  ok('Ideias do Claude entram nas ideias guardadas');

  // ---- Agendar ideia ----
  await tab('semana');
  await page.locator('[data-id^="idea-"]:has-text("Rotina de domingo") [data-id="schedule"]').click();
  await page.locator('dialog.action-sheet .as-btn').first().click();
  await page.waitForSelector('.plan-card:has-text("Rotina de domingo"), .toast:has-text("Agendado")');
  await noJunk('semana');
  ok('Ideia agendada num dia da semana');

  // ---- Referências ----
  await tab('formatos');
  await page.click('.segmented button:has-text("Referências")');
  await page.click('[data-id="new-reference"]');
  await sheet().locator('input[name="title"]').fill('Review com plot twist');
  await sheet().locator('textarea[name="worked"]').fill('Gancho com o veredito');
  await saveSheet();
  await page.waitForSelector('.cell:has-text("Review com plot twist")');
  ok('Referência salva');

  // ---- Marcas: UGC atrasado ----
  await tab('marcas');
  await page.click('[data-id="new-deal"]');
  await page.click('[data-id="new-ugc"]');
  await sheet().locator('input[name="brandName"]').fill('Glow Skin');
  await sheet().locator('[data-stage="gravacao"]').click();
  await sheet().locator('input[data-deliv="0"]').fill('2 vídeos de 30s');
  await sheet().locator('.deliv-row input[type="date"]').first().fill('2026-10-01');
  await sheet().locator('input[name="value"]').fill('800');
  await sheet().locator('input[name="paymentDue"]').fill('2026-11-10');
  await saveSheet();
  await page.waitForSelector('.group:has(.group-header:has-text("Atrasados")) [data-id^="deal-"]:has-text("Glow Skin")');
  await tab('hoje');
  await page.waitForSelector('.late-row:has-text("Glow Skin")');
  ok('Campanha UGC com entregável atrasado aparece em Marcas e no Hoje');

  // ---- Marcas: publi paga + financeiro ----
  await tab('marcas');
  await page.click('[data-id="new-deal"]');
  await page.click('[data-id="new-publi"]');
  await sheet().locator('input[name="brandName"]').fill('Fit Co');
  await sheet().locator('input[name="value"]').fill('1500');
  await sheet().locator('select[name="paymentStatus"]').selectOption('pago');
  await saveSheet();
  await page.click('.segmented button:has-text("Financeiro")');
  await page.waitForSelector('.widget.stat:has-text("Recebido no mês") .w-value:has-text("1.500,00")');
  await page.waitForSelector('.widget.stat:has-text("A receber") .w-value:has-text("800,00")');
  await page.waitForSelector('.data-note:has-text("sem nota fiscal")');
  await noJunk('financeiro');
  await snap('05-financeiro');
  ok('Financeiro: recebido, a receber e aviso de nota fiscal');

  await page.click('.segmented button:has-text("Entregas")');
  await page.locator('[data-id^="deal-"]:has-text("Glow Skin")').click();
  const [ics] = await Promise.all([page.waitForEvent('download'), sheet().locator('[data-id="deal-ics"]').click()]);
  const icsText = readFileSync(await ics.path(), 'utf8');
  if (!icsText.includes('BEGIN:VEVENT') || !icsText.includes('Glow Skin')) throw new Error('ICS inválido');
  await sheet().locator('[data-id="sheet-cancel"]').click();
  ok('Prazos da campanha exportados para o Calendário (.ics)');

  await page.click('.segmented button:has-text("Contatos")');
  await page.click('[data-id="new-brand"]');
  await sheet().locator('input[name="name"]').fill('Marca Teste');
  await sheet().locator('select[name="status"]').selectOption('contatei');
  await saveSheet();
  await page.waitForSelector('.group:has(.group-header:has-text("Contatei")) .cell:has-text("Marca Teste")');
  ok('Marca acompanhada nos contatos');

  // ---- Perfil, meta, backup ----
  await tab('perfil');
  await page.click('[data-id="edit-profile"]');
  await sheet().locator('input[name="name"]').fill('Duda Gomes');
  await saveSheet();
  await page.click('.stepper button[aria-label="Aumentar"]');
  await tab('hoje');
  await page.waitForSelector('text=oi, Duda');
  await page.waitForSelector('[data-id="week-widget"] .w-value:text("1/6")');
  ok('Perfil e meta semanal (5 → 6) refletem no Hoje');

  // ---- Instagram ----
  await tab('perfil');
  await page.click('[data-id="instagram-cell"]');
  await sheet().locator('input[type="password"]').fill('IGQ-token-teste');
  await sheet().locator('[data-id="sheet-save"]').click();
  await page.waitForSelector('.toast:has-text("@duda.ugc")');
  await page.waitForFunction(() => document.querySelector('[data-id="instagram-cell"]')?.innerText.includes('@duda.ugc'));
  await page.waitForTimeout(400);
  await tab('resultados');
  await page.click('.segmented button:has-text("Resumo")');
  await page.waitForSelector('.cell:has-text("Minha mesa de trabalho")');
  ok('Instagram conectado: post importado com números');

  await tab('perfil');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-id="backup"]')]);
  const backup = readFileSync(await dl.path(), 'utf8');
  if (backup.includes('IGQ-token-teste')) throw new Error('Token vazou no backup');
  if (!backup.includes('Testei o sérum') || !backup.includes('Marca Teste')) throw new Error('Backup incompleto');
  ok('Backup baixado com tudo e sem o token');

  igOk = false;
  await page.click('[data-id="instagram-cell"]');
  await sheet().locator('[data-id="ig-sync"]').click();
  await page.waitForSelector('.toast.error:has-text("token")');
  igOk = true;
  await page.keyboard.press('Escape');
  ok('Token recusado mostra aviso claro');

  // ---- Apagar ----
  await tab('hoje');
  await page.locator('.content-row:has-text("Testei o sérum") .content-main').click();
  await sheet().locator('[data-id="delete-content"]').click();
  await page.click('[data-id="confirm-delete"]');
  await page.waitForSelector('.content-row:has-text("Testei o sérum")', { state: 'detached' });
  await page.reload();
  await page.waitForSelector('h1:has-text("Hoje")');
  if (await page.locator('.content-row:has-text("Testei o sérum")').count()) throw new Error('Conteúdo apagado voltou');
  ok('Apagar com confirmação (folha de ações) e continua apagado após recarregar');


  // ================= Sábado: plano automático, design e Claude =================
  const sat = await browser.newContext({ ...devices['iPhone 13'], acceptDownloads: true, locale: 'pt-BR' });
  await sat.route('https://claude.ai/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>Claude</p>' }));
  const sp = await sat.newPage();
  sp.on('pageerror', (e) => errors.push(`[sábado] ${e.message}`));
  await sp.clock.setFixedTime(new Date('2026-10-24T10:00:00'));
  await sp.goto(base);
  await sp.waitForSelector('.toast:has-text("Plano da próxima semana pronto")');
  await sp.waitForSelector('[data-id="plan-banner"]');
  await sp.click('[data-tab="semana"]');
  await sp.waitForSelector('.plan-card');
  const cards = await sp.locator('.plan-card').count();
  if (cards !== 5) throw new Error(`Esperava 5 conteúdos no plano, achei ${cards}`);
  const days = await sp.locator('.plan-card').evaluateAll((els) => els.map((e) => e.dataset.id));
  if (days.join() !== 'plan-2026-10-26,plan-2026-10-27,plan-2026-10-28,plan-2026-10-29,plan-2026-10-30') throw new Error(`Dias errados: ${days}`);
  const tags = await sp.locator('.plan-card .plan-tags').allInnerTexts();
  if (!tags.some((t) => t.includes('Carrossel')) || !tags.some((t) => t.includes('Estático'))) throw new Error('Plano sem carrossel/estático');
  ok('Sábado: plano de seg a sex gerado sozinho, com vídeo, carrossel e estático, foco e formatos variados');
  await sp.screenshot({ path: shots ? path.join(shots, '06-semana-plano.png') : '/dev/null', fullPage: true }).catch(() => {});

  // Trocar um dia
  const before = await sp.locator('.plan-card .plan-title').nth(1).innerText();
  await sp.locator('.plan-card').nth(1).locator('[data-id="reroll"]').click();
  await sp.waitForFunction((b) => document.querySelectorAll('.plan-card .plan-title')[1]?.innerText !== b, before);
  ok('↻ troca a sugestão de um dia');

  // Design do estático: escrever texto e exportar
  const estatico = sp.locator('.plan-card:has(.tag:has-text("Estático"))');
  await estatico.locator('[data-id="open-design"]').click();
  await sp.waitForSelector('dialog.sheet[open] .slide-canvas');
  const body = sp.locator('dialog.sheet[open] textarea[name="slide-body"], dialog.sheet[open] textarea[name="slide-items"]').first();
  await body.fill('Quando eu comecei, aceitei valores que não pagavam a luz.\nE você?');
  const [dl1] = await Promise.all([sp.waitForEvent('download'), sp.click('[data-id="export-design"]')]);
  // (Aberto como arquivo local o navegador ignora o nome; no GitHub Pages o nome .jpg é mantido.)
  const jpg = readFileSync(await dl1.path());
  if (jpg[0] !== 0xff || jpg[1] !== 0xd8 || jpg.length < 20000) throw new Error('Exportação não gerou uma imagem JPG');
  await sp.locator('dialog.sheet[open] [data-id="sheet-done"]').click();
  ok('Design do estático: texto editado e imagem 1080×1350 exportada');

  // Carrossel de review: pede foto sua e recebe a foto
  await sp.click('[data-id="new-content-week"]');
  await sp.locator('dialog.sheet[open] input[name="title"]').fill('Minha opinião sincera sobre o protetor da minha mãe');
  await sp.locator('dialog.sheet[open] select[name="formatId"]').selectOption('review-honesto');
  await sp.locator('dialog.sheet[open] select[name="type"]').selectOption('carrossel');
  await sp.locator('dialog.sheet[open] [data-id="content-design"]').click();
  await sp.waitForSelector('dialog.sheet[open] .slide-canvas');
  const need = await sp.locator('dialog.sheet[open] .need-photo').count();
  if (need < 1) throw new Error('Carrossel de review deveria pedir foto');
  await sp.locator('dialog.sheet[open] .slide-thumb:has(.need-photo)').first().click();
  const hintText = await sp.locator('dialog.sheet[open] .group-footer:has-text("Pedido:")').innerText();
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP4z8Dwn4Hh////DAwMDAAm4gP9Vh1o8wAAAABJRU5ErkJggg==', 'base64');
  await sp.locator('dialog.sheet[open] [data-id="photo-input"]').setInputFiles({ name: 'eu.png', mimeType: 'image/png', buffer: png });
  await sp.waitForSelector('.toast:has-text("Foto adicionada")');
  await sp.waitForFunction((k) => document.querySelectorAll('dialog.sheet[open] .need-photo').length === k - 1, need);
  await sp.locator('dialog.sheet[open] [data-id="sheet-done"]').click();
  await sp.waitForSelector('dialog.sheet[open]', { state: 'detached' });
  await sp.reload();
  await sp.click('[data-tab="hoje"]');
  ok(`Carrossel pede foto sua ("${hintText.replace('Pedido: ', '')}") e guarda a foto enviada`);

  // Publi com data na semana entra no plano ao refazer
  await sp.click('[data-tab="marcas"]');
  await sp.click('[data-id="new-deal"]');
  await sp.click('[data-id="new-publi"]');
  await sp.locator('dialog.sheet[open] input[name="brandName"]').fill('Marca Publi');
  await sp.locator('dialog.sheet[open] input[name="postDate"]').fill('2026-10-29');
  await sp.locator('dialog.sheet[open] [data-id="sheet-save"]').click();
  await sp.waitForSelector('dialog.sheet[open]', { state: 'detached' });
  await sp.click('[data-tab="semana"]');
  await sp.click('[data-id="regenerate"]');
  await sp.click('[data-id="confirm-regenerate"]');
  await sp.waitForSelector('[data-id="plan-2026-10-29"]:has-text("Publi: Marca Publi")');
  ok('Publi com data entra no plano da semana');

  // Claude escreve a semana inteira
  const [pop] = await Promise.all([sat.waitForEvent('page'), sp.click('[data-id="claude-week"]')]);
  await pop.close();
  await sp.waitForTimeout(600);
  if (!(await sp.locator('dialog.sheet[open] h2:has-text("Resposta do Claude")').count())) await sp.click('[data-id="pending-banner"]').catch(async () => { await sp.click('[data-tab="hoje"]'); await sp.click('[data-id="pending-banner"]'); });
  await sp.locator('dialog.sheet[open] textarea').fill('{"days":[{"n":1,"title":"Título escrito pelo Claude","hook":"Gancho do Claude","steps":["a","b"],"caption":"legenda"}]}');
  await sp.locator('dialog.sheet[open] [data-id="use-text"]').click();
  await sp.waitForSelector('.toast:has-text("preenchidos pelo Claude")');
  await sp.click('[data-tab="semana"]');
  await sp.waitForSelector('.plan-card .plan-title:has-text("Título escrito pelo Claude")');
  ok('✨ Claude escreve a semana: resposta colada preenche os conteúdos');

  // Persistência e .ics da semana
  await sp.reload();
  await sp.click('[data-tab="semana"]');
  await sp.waitForSelector('.plan-card .plan-title:has-text("Título escrito pelo Claude")');
  const [wics] = await Promise.all([sp.waitForEvent('download'), sp.click('[data-id="week-ics"]')]);
  if (!readFileSync(await wics.path(), 'utf8').includes('VEVENT')) throw new Error('ICS da semana vazio');
  if ((await sp.locator('.toast:has-text("Plano da próxima semana pronto")').count()) > 0) throw new Error('Gerou o plano de novo ao recarregar');
  ok('Plano continua após recarregar, não é gerado duas vezes, e vai para o Calendário');
  await sat.close();

  // ---- Modo escuro e computador ----
  await page.emulateMedia({ colorScheme: 'dark' });
  for (const t of ['hoje', 'semana', 'marcas', 'formatos', 'resultados', 'perfil']) {
    await tab(t);
    await noJunk(`escuro ${t}`);
    await snap(`03-escuro-${t}`);
  }
  await page.setViewportSize({ width: 1280, height: 860 });
  await tab('hoje');
  await noJunk('computador');
  await snap('04-computador');
  ok('Modo escuro e tela de computador sem problemas');

  if (errors.length) throw new Error(`Erros no console:\n${errors.join('\n')}`);
  ok('Nenhum erro de JavaScript');
  console.log(`\nTudo certo: ${step} verificações.`);
} catch (err) {
  await snap('falha');
  console.error(`\n✗ Falhou depois da etapa ${step}: ${err.message.split('\n').slice(0, 6).join('\n')}`);
  if (errors.length) console.error(errors.join('\n'));
  process.exitCode = 1;
} finally {
  await browser.close();
}
