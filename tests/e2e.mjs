// Teste de ponta a ponta no navegador (Playwright + Chromium).
// Uso: npm run test:e2e   (requer o pacote "playwright" instalado globalmente ou no projeto)
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  ({ chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright')));
}

const shots = process.env.SHOTS_DIR;
if (shots) mkdirSync(shots, { recursive: true });
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Abre o arquivo direto, como num clique duplo (file://).
const base = pathToFileURL(path.join(root, 'index.html')).href;

// API do Instagram simulada (nenhuma chamada real sai do teste).
let igTokenValid = true;
async function mockInstagram(route) {
  const url = new URL(route.request().url());
  const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
  if (!igTokenValid) return json({ error: { code: 190, message: 'Invalid OAuth access token' } }, 400);
  if (url.pathname.endsWith('/me')) return json({ user_id: '1', username: 'duda.ugc', account_type: 'MEDIA_CREATOR', followers_count: 1234, media_count: 2 });
  if (url.pathname.endsWith('/me/media')) return json({ data: [
    { id: 'm1', caption: 'Testei o app de treino por 7 dias', media_type: 'VIDEO', media_product_type: 'REELS', permalink: 'https://www.instagram.com/reel/AAA111/', timestamp: '2026-10-02T15:00:00+0000', like_count: 80, comments_count: 14 },
    { id: 'm2', caption: 'Minha mesa de trabalho\n#setup', media_type: 'CAROUSEL_ALBUM', media_product_type: 'FEED', permalink: 'https://www.instagram.com/p/BBB222/', timestamp: '2026-10-06T15:00:00+0000', like_count: 50, comments_count: 9 },
  ] });
  if (url.pathname.includes('/insights')) {
    const v = { reach: 1200, views: 2000, likes: 80, comments: 14, saved: 22, shares: 9, total_interactions: 125, profile_visits: 30, follows: 6 };
    return json({ data: url.searchParams.get('metric').split(',').map((name) => ({ name, values: [{ value: v[name] }] })) });
  }
  return json({ error: { code: 100, message: 'rota não simulada' } }, 400);
}

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const context = await browser.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true });
await context.route('https://graph.instagram.com/**', mockInstagram);
await context.route('https://fonts.googleapis.com/**', (r) => r.abort());
await context.route('https://fonts.gstatic.com/**', (r) => r.abort());
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && !String(m.location()?.url).includes('graph.instagram.com') && !/fonts\.g|ERR_FAILED|net::/.test(m.text()) && errors.push(m.text()));

let step = 0;
const ok = (msg) => console.log(`  ✓ ${++step}. ${msg}`);
const snap = async (name) => shots && page.screenshot({ path: path.join(shots, `${name}.png`), fullPage: true });
const dialog = () => page.locator('dialog.modal[open]').last();
const fill = (name, value) => dialog().locator(`[name="${name}"]`).first().fill(value);
const select = (name, value) => dialog().locator(`select[name="${name}"]`).first().selectOption(value);
const noJunk = async (where) => {
  const bad = await page.evaluate(() => (document.querySelector('main').innerText.match(/(^|\s)(null|undefined|false|NaN)(\s|$)/) || [])[0]);
  if (bad) throw new Error(`Texto indevido "${bad.trim()}" em ${where}`);
};
const save = async () => {
  await dialog().locator('[data-action="save"]').click();
  await page.waitForSelector('dialog.modal[open]', { state: 'detached' });
};

try {
  await page.goto(base);
  await page.waitForSelector('h1');
  ok('index.html abre direto do arquivo (clique duplo), sem servidor');
  await snap('01-mesa');

  for (const [hash, title] of [['ideias', 'Laboratório de ideias'], ['roteiros', 'Roteirista'], ['agenda', 'Planejamento editorial'], ['referencias', 'Biblioteca de referências'], ['metricas', 'Desempenho'], ['marcas', 'Pesquisa de marcas'], ['ajustes', 'Perfil e dados']]) {
    await page.goto(`${base}#/${hash}`);
    await page.waitForSelector(`h1:has-text("${title}")`);
    await noJunk(hash);
  }
  ok('Todas as áreas carregam (com estados vazios)');

  // ---- Ideias ----
  await page.goto(`${base}#/ideias`);
  await page.click('text=+ Ideia manual');
  await fill('title', 'Testei o app de treino que todo mundo indica');
  await fill('hook', 'Oi gente, vocês sabiam disso?');
  await page.waitForSelector('dialog .hook-warnings li');
  ok('Revisor de gancho aponta clichê enquanto digita');
  await fill('hook', 'Passei 7 dias usando o app de treino mais baixado e anotei o que me irritou');
  await select('goal', 'comunidade');
  await select('platform', 'instagram');
  await select('format', 'reels');
  await select('approach', 'review');
  await save();
  await page.waitForSelector('.entry-title:has-text("Testei o app de treino")');
  ok('Ideia criada');

  await page.click('text=+ Ideia manual');
  await fill('title', 'Bastidor de uma diária de UGC');
  await select('approach', 'bastidores');
  await save();
  await page.fill('.filters input[type="search"]', 'treino');
  await page.waitForFunction(() => document.querySelectorAll('.entries .entry').length === 1);
  ok('Pesquisa filtra ideias');
  await page.fill('.filters input[type="search"]', '');
  await page.waitForFunction(() => document.querySelectorAll('.entries .entry').length === 2);
  await page.locator('.filters select[aria-label="Abordagem"]').selectOption('bastidores');
  await page.waitForFunction(() => document.querySelectorAll('.entries .entry').length === 1);
  await page.click('text=Limpar filtros');
  ok('Filtro por abordagem funciona');

  const entry = page.locator('.entry', { hasText: 'Bastidor de uma diária' });
  await entry.locator('button:has-text("Editar")').click();
  await fill('title', 'Bastidor de uma diária de UGC (editado)');
  await save();
  await page.waitForSelector('.entry-title:has-text("(editado)")');
  ok('Ideia editada');

  // ---- Roteirista ----
  await page.locator('.entry', { hasText: 'Testei o app de treino' }).locator('button:has-text("Roteirizar")').click();
  await page.waitForSelector('h2:has-text("Novo roteiro")');
  await page.click('text=Escrever do zero');
  await page.waitForSelector('dialog.modal[open]');
  await dialog().locator('text=+ Adicionar cena').click();
  await dialog().locator('[data-field="scenes"] [name="speech"]').fill('Esse app tem 400 treinos e eu usei dois.');
  await dialog().locator('[data-field="scenes"] [name="timing"]').fill('0–3s');
  await fill('openingVariations', 'Abertura A\nAbertura B');
  await save();
  await page.waitForSelector('.speech:has-text("400 treinos")');
  ok('Roteiro criado a partir da ideia, com cena e fala');
  await snap('02-roteiro');

  await page.click('button:has-text("Levar para agenda")');
  await page.waitForSelector('dialog.modal[open] h2:has-text("Editar publicação")');
  const d = new Date();
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-15`;
  await fill('plannedDate', iso);
  await fill('publishedUrl', 'https://www.instagram.com/reel/AAA111/?igsh=xyz');
  await select('status', 'agendado');
  await select('pillar', 'Reviews e testes');
  await save();
  await page.goto(`${base}#/agenda`);
  await page.waitForSelector('.cal-grid .chip:has-text("Testei o app de treino")');
  ok('Roteiro levado para a agenda e aparece no calendário');
  await snap('03-agenda');

  // Persistência após recarregar
  await page.reload();
  await page.waitForSelector('.cal-grid .chip:has-text("Testei o app de treino")');
  ok('Dados continuam após atualizar a página');

  await page.click('.segmented button:has-text("Lista")');
  await page.locator('.post-row select.status-select').first().selectOption('publicado');
  await page.waitForSelector('.post-row button:has-text("Métricas")');
  ok('Status alterado direto na lista');

  // ---- Métricas ----
  await page.click('.post-row button:has-text("Métricas")');
  await fill('reach', '1200');
  await fill('likes', '80');
  await fill('comments', '14');
  await fill('saves', '22');
  await fill('shares', '9');
  await fill('follows', '6');
  await save();
  await page.goto(`${base}#/metricas`);
  await page.waitForSelector('.stat:has-text("com métricas") .stat-n:text("1")');
  await page.waitForSelector('.verdict:has-text("poucas publicações")');
  ok('Métricas registradas; análise não tira conclusão com 1 publicação');
  await snap('04-metricas');

  // ---- Referências ----
  await page.goto(`${base}#/referencias`);
  await page.click('text=+ Referência');
  await fill('title', 'Review com plot twist no final');
  await fill('url', 'https://example.com/video');
  await select('category', 'video');
  await fill('structure', 'Abre no resultado, volta para o problema');
  await dialog().locator('[data-field="linkedIdeas"] label.check:has-text("Testei o app de treino") input').check();
  await save();
  await page.waitForSelector('text=usada em 1 ideia(s), 0 roteiro(s)');
  ok('Referência criada e vinculada a uma ideia');

  // ---- Marcas ----
  await page.goto(`${base}#/marcas`);
  await page.click('text=+ Marca');
  await fill('name', 'Marca Teste');
  await fill('product', 'Garrafa térmica');
  await dialog().locator('text=+ Adicionar item de pesquisa').click();
  await dialog().locator('[data-field="insights"] select[name="category"]').nth(0).selectOption('diferencial');
  await dialog().locator('[data-field="insights"] select[name="status"]').nth(0).selectOption('confirmado');
  await dialog().locator('[data-field="insights"] [name="text"]').nth(0).fill('Mantém gelado por 24h (site oficial)');
  await dialog().locator('text=+ Adicionar item de pesquisa').click();
  await dialog().locator('[data-field="insights"] select[name="category"]').nth(1).selectOption('dor');
  await dialog().locator('[data-field="insights"] [name="text"]').nth(1).fill('Água esquenta no treino');
  await save();
  await page.waitForSelector('h1:has-text("Marca Teste")');
  await page.waitForSelector('.opp:has-text("Água esquenta no treino")');
  await page.waitForSelector('.pill.warn:has-text("ainda é hipótese")');
  ok('Marca com fato e hipótese separados; matriz gera oportunidade');
  await snap('05-marca');
  await page.locator('.opp button:has-text("Virar ideia")').first().click();
  await page.waitForSelector('.toast:has-text("Ideia criada")');
  ok('Oportunidade virou ideia no laboratório');

  // ---- Exclusão ----
  await page.goto(`${base}#/ideias`);
  const target = page.locator('.entry', { hasText: '(editado)' });
  await target.locator('button:has-text("Excluir")').click();
  await page.click('dialog [data-action="confirm"]');
  await page.waitForSelector('.entry-title:has-text("(editado)")', { state: 'detached' });
  await page.reload();
  await page.waitForSelector('h1:has-text("Laboratório")');
  if (await page.locator('.entry-title:has-text("(editado)")').count()) throw new Error('Ideia excluída voltou após recarregar');
  ok('Exclusão com confirmação, persistida após recarregar');

  // ---- Perfil e backup ----
  await page.goto(`${base}#/ajustes`);
  await page.fill('[name="name"]', 'Duda');
  await page.click('text=Salvar perfil');
  await page.waitForSelector('.toast:has-text("Perfil salvo")');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('text=Baixar backup (JSON)')]);
  const exp = JSON.parse(readFileSync(await dl.path(), 'utf8'));
  if (exp.profile.name !== 'Duda' || exp.ideas.length !== 2 || exp.posts.length !== 1) throw new Error(`Exportação inconsistente: ${exp.ideas.length} ideias, ${exp.posts.length} posts`);
  ok('Perfil salvo e backup baixado com tudo');

  // ---- IA: copiar prompt e colar resposta ----
  await page.goto(`${base}#/ideias`);
  await page.fill('[name="subject"]', 'minha rotina de skincare');
  await page.click('[data-ai="copy"]');
  await page.waitForSelector('dialog.modal[open] textarea.copy-area, .toast:has-text("Copiado")');
  const promptText = await page.evaluate(() => document.querySelector('dialog.modal[open] textarea')?.value || '');
  if (promptText && !promptText.includes('minha rotina de skincare')) throw new Error('Prompt não contém o briefing');
  if (await page.locator('dialog.modal[open]').count()) await page.click('dialog.modal[open] button:has-text("Fechar")');
  await page.click('[data-ai="paste"]');
  await dialog().locator('textarea').fill('Aqui vai:\n```json\n{"critique":"O assunto está amplo demais.","ideas":[{"title":"Skincare de quem esquece","hook":"Eu esqueço o protetor todo dia e resolvi testar um jeito","concept":"c","development":"d","strategicGoal":"s","rationale":"r","cta":"x","visuals":"","platform":"Instagram","format":"Reels","approach":"storytelling","audience":"comunidade","needsVerification":["confirmar FPS"]},{"title":"Review sem filtro","hook":"h2","concept":"c2","development":"","strategicGoal":"","rationale":"","cta":"","visuals":"","platform":"TikTok","format":"Carrossel","approach":"review","audience":"marcas","needsVerification":[]}]}\n```');
  await dialog().locator('[data-action="use-answer"]').click();
  await page.waitForSelector('.critique:has-text("amplo demais")');
  await page.click('#result button:has-text("Salvar todas")');
  await page.waitForSelector('.entry-title:has-text("Skincare de quem esquece")');
  ok('Resposta da IA colada vira ideias (com crítica e itens a confirmar)');
  await page.click('[data-ai="paste"]');
  await dialog().locator('textarea').fill('não é json');
  await dialog().locator('[data-action="use-answer"]').click();
  await page.waitForSelector('dialog .form-error:has-text("JSON")');
  await page.click('dialog.modal[open] button:has-text("Cancelar")');
  ok('Resposta inválida mostra erro claro');

  // ---- Instagram (API simulada) ----
  await page.goto(`${base}#/ajustes`);
  await page.fill('#ig-panel input[type="password"]', 'IGQ-token-de-teste');
  await page.click('#ig-panel button:has-text("Conectar")');
  await page.waitForSelector('#ig-panel .ig-handle:has-text("@duda.ugc")');
  await page.waitForSelector('#ig-panel :text("2 lidas")');
  ok('Instagram conectado e sincronizado');
  await page.goto(`${base}#/metricas`);
  await page.waitForSelector('.metric-row:has-text("Minha mesa de trabalho") .pill:has-text("via Instagram")');
  // A publicação planejada com link do Reels foi casada (não duplicou)
  const testeiRows = await page.locator('.metric-row:has-text("Testei o app de treino")').count();
  if (testeiRows !== 1) throw new Error(`Esperava 1 linha do Reels casado, achei ${testeiRows}`);
  await page.locator('.metric-row:has-text("Minha mesa de trabalho") select.goal-select').selectOption('conexao');
  await page.waitForSelector('.toast:has-text("Objetivo definido")');
  await noJunk('métricas com Instagram');
  await snap('07-metricas-instagram');
  ok('Métricas do Instagram aparecem, publicação existente casada pelo link, objetivo definido na lista');
  await page.reload();
  await page.waitForSelector('.metric-row:has-text("Minha mesa de trabalho")');
  const token = await page.evaluate(() => JSON.parse(localStorage.getItem('estudio:instagram')).token);
  const [dl2] = await Promise.all([page.waitForEvent('download'), page.goto(`${base}#/ajustes`).then(() => page.click('text=Baixar backup (JSON)'))]);
  if (readFileSync(await dl2.path(), 'utf8').includes(token)) throw new Error('Token vazou no backup!');
  ok('Token do Instagram não vai para o backup');
  igTokenValid = false;
  await page.click('#ig-panel button:has-text("Sincronizar agora")');
  await page.waitForSelector('#ig-panel .form-error:has-text("token")');
  await page.waitForSelector('#ig-panel .pill:has-text("Token recusado")');
  await page.click('#ig-panel button:has-text("Colar novo token")');
  await page.waitForSelector('#ig-panel input[type="password"]');
  igTokenValid = true;
  ok('Token inválido mostra aviso claro');

  // ---- Celular ----
  await page.setViewportSize({ width: 390, height: 844 });
  for (const hash of ['', 'ideias', 'agenda', 'metricas']) {
    await page.goto(`${base}#/${hash}`);
    await page.waitForSelector('h1');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 1) throw new Error(`Rolagem horizontal no celular em #/${hash} (${overflow}px)`);
    await noJunk(`celular #/${hash}`);
    await snap(`06-mobile-${hash || 'mesa'}`);
  }
  for (const hash of ['roteiros', 'referencias', 'marcas', 'ajustes']) {
    await page.goto(`${base}#/${hash}`);
    await page.waitForSelector('h1');
    await noJunk(`celular #/${hash}`);
  }
  ok('Layout de celular sem rolagem horizontal e sem textos soltos (null/false)');

  if (errors.length) throw new Error(`Erros no console:\n${errors.join('\n')}`);
  ok('Nenhum erro de JavaScript no console');
  console.log(`\nTudo certo: ${step} verificações.`);
} catch (err) {
  await snap('falha');
  console.error(`\n✗ Falhou depois da etapa ${step}: ${err.message}`);
  if (errors.length) console.error(errors.join('\n'));
  process.exitCode = 1;
} finally {
  await browser.close();
}
