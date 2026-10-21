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
  await page.click(`[data-tab="${name}"]`);
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
  for (const t of ['formatos', 'planejar', 'resultados', 'perfil', 'hoje']) {
    await tab(t);
    await page.waitForSelector('.large-title h1');
    await noJunk(`aba ${t}`);
  }
  ok('Abre direto do arquivo; 5 abas sem erros, sem textos soltos e sem rolagem lateral; 3 sugestões no Hoje');

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
  await page.waitForSelector('[data-id="week-widget"] .w-value:text("1/4")');
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
  await page.click('.segmented button:has-text("Formatos")');
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

  await answerClaude(async () => { await tab('planejar'); await page.click('[data-id="claude-ideas"]'); },
    '{"ideas":[{"title":"Rotina de domingo","formatId":"organiza-comigo","hook":"h","why":"w"},{"title":"Opinião sobre skincare caro","formatId":"opiniao-impopular","hook":"h2","why":"w2"}]}');
  await page.waitForSelector('[data-id^="idea-"]:has-text("Rotina de domingo")');
  ok('Ideias do Claude entram nas ideias guardadas');

  // ---- Planejar ----
  await page.locator('[data-id^="idea-"]:has-text("Rotina de domingo") [data-id="schedule"]').click();
  await page.waitForSelector('.content-row:has-text("Rotina de domingo")');
  const days = await page.locator('.week-strip .day').count();
  await page.locator('.week-strip .day').nth(days - 1).click();
  const fill = page.locator('[data-id="fill-week"]');
  if (await fill.count()) {
    await fill.click();
    await page.click('[data-id="confirm-fill"]');
    await page.waitForSelector('.toast:has-text("Semana completa")');
  }
  await noJunk('planejar');
  await snap('02-planejar');
  ok('Agendar ideia no dia e "Completar a semana" com sugestões');

  // ---- Referências ----
  await tab('formatos');
  await page.click('.segmented button:has-text("Referências")');
  await page.click('[data-id="new-reference"]');
  await sheet().locator('input[name="title"]').fill('Review com plot twist');
  await sheet().locator('textarea[name="worked"]').fill('Gancho com o veredito');
  await saveSheet();
  await page.waitForSelector('.cell:has-text("Review com plot twist")');
  ok('Referência salva');

  // ---- Marcas ----
  await tab('resultados');
  await page.click('.segmented button:has-text("Marcas")');
  await page.click('[data-id="new-brand"]');
  await sheet().locator('input[name="name"]').fill('Marca Teste');
  await sheet().locator('select[name="status"]').selectOption('contatei');
  await saveSheet();
  await page.waitForSelector('.group:has(.group-header:has-text("Contatei")) .cell:has-text("Marca Teste")');
  ok('Marca acompanhada por etapa');

  // ---- Perfil, meta, backup ----
  await tab('perfil');
  await page.click('[data-id="edit-profile"]');
  await sheet().locator('input[name="name"]').fill('Duda Gomes');
  await saveSheet();
  await page.click('.stepper button[aria-label="Aumentar"]');
  await tab('hoje');
  await page.waitForSelector('text=oi, Duda');
  await page.waitForSelector('[data-id="week-widget"] .w-value:text("1/5")');
  ok('Perfil e meta semanal (4 → 5) refletem no Hoje');

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

  // ---- Modo escuro e computador ----
  await page.emulateMedia({ colorScheme: 'dark' });
  for (const t of ['hoje', 'formatos', 'planejar', 'resultados', 'perfil']) {
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
