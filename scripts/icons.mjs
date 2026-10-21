// Gera os ícones PNG do app (tela de início do iPhone) a partir do favicon.svg. Rodar uma vez.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'))); }
const svg = readFileSync(path.join(root, 'src/favicon.svg'), 'utf8').replace('rx="14"', 'rx="0"'); // iOS arredonda sozinho
const browser = await chromium.launch();
for (const [name, size] of [['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<style>html,body{margin:0}</style>${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}`);
  await page.screenshot({ path: path.join(root, 'public', name) });
}
await browser.close();
console.log('ícones gerados em public/');
