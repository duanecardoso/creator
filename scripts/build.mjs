// Gera index.html (CSS + JS embutidos) a partir de src/ e copia os arquivos de public/.
// O index.html funciona com dois cliques e no GitHub Pages.
import { build } from 'esbuild';
import { readFileSync, writeFileSync, copyFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => path.join(root, 'src', p);

const js = await build({ entryPoints: [src('js/app.js')], bundle: true, format: 'iife', target: ['es2018', 'safari12'], legalComments: 'none', write: false });
const script = js.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = readFileSync(src('css/platform.css'), 'utf8');
const favicon = `data:image/svg+xml,${encodeURIComponent(readFileSync(src('favicon.svg'), 'utf8'))}`;

let html = readFileSync(src('index.html'), 'utf8')
  .replace('<link rel="stylesheet" href="css/platform.css">', () => `<style>\n${css}\n</style>`)
  .replace('href="favicon.svg"', () => `href="${favicon}"`)
  .replace('<script type="module" src="js/app.js"></script>', () => `<script>\n${script}</script>`);
if (html.includes('src="js/app.js"') || html.includes('href="css/platform.css"')) throw new Error('Marcadores do template não encontrados.');
writeFileSync(path.join(root, 'index.html'), `<!-- Gerado por "npm run build" a partir de src/. Edite src/, não este arquivo. -->\n${html}`);

const pub = path.join(root, 'public');
if (existsSync(pub)) for (const f of readdirSync(pub)) copyFileSync(path.join(pub, f), path.join(root, f));
console.log(`index.html gerado (${Math.round(html.length / 1024)} KB)`);
