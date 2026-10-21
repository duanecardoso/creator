// Gera um único index.html (CSS + JS embutidos) a partir de src/.
// Esse arquivo abre com dois cliques e é o que vai para o GitHub Pages.
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => path.join(root, 'src', p);

const js = await build({
  entryPoints: [src('js/app.js')],
  bundle: true,
  format: 'iife',
  target: ['es2020'],
  minify: false,
  legalComments: 'none',
  write: false,
});
const script = js.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = readFileSync(src('css/styles.css'), 'utf8');
const favicon = `data:image/svg+xml,${encodeURIComponent(readFileSync(src('favicon.svg'), 'utf8'))}`;

let html = readFileSync(src('index.html'), 'utf8')
  .replace('<link rel="stylesheet" href="css/styles.css">', () => `<style>\n${css}\n</style>`)
  .replace('href="favicon.svg"', () => `href="${favicon}"`)
  .replace('<script type="module" src="js/app.js"></script>', () => `<script>\n${script}</script>`);

if (html.includes('src="js/app.js"') || html.includes('href="css/styles.css"')) throw new Error('Marcadores do template não encontrados.');
html = `<!-- Arquivo gerado por "npm run build" a partir de src/. Edite os arquivos em src/, não este. -->\n${html}`;
writeFileSync(path.join(root, 'index.html'), html);
console.log(`index.html gerado (${Math.round(html.length / 1024)} KB)`);
