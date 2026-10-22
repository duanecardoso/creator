// Desenha as telas de carrossel/estático em canvas (1080×1440, formato 3:4 do feed).
// Estilo da Duane: a foto dela como fundo (ou grade de fotos), título grande creme e arredondado
// misturando fino e pesado, e elementos do iPhone "colados" por cima: Notas com menu Copiar/Colar,
// To do list com clipe, balões do iMessage, barra de busca, etiqueta de local, pasta, card de perfil,
// estrelas cromadas, polaroids e papel rasgado. Tudo vetorial, para a exportação sair igual à prévia.

export const W = 1080;
export const H = 1440;
const TITLE = 'Nunito, "Arial Rounded MT Bold", Montserrat, system-ui, sans-serif';
const UI = '-apple-system, "SF Pro Text", "Helvetica Neue", Montserrat, Arial, sans-serif';
const font = (weight, size, fam = UI) => `${weight} ${size}px ${fam}`;

// Mantido para as configurações antigas de paleta (cores de destaque).
export const DEFAULT_PALETTE = {
  bg: '#FAFAF9',
  card: '#FFFFFF',
  ink: '#161616',
  muted: '#6B6B6B',
  accent: '#F8E7A2',
  accent2: '#F6E4E8',
  accent3: '#6B4537',
  accent4: '#D74F73',
};
export function palette(p = {}) {
  return { ...DEFAULT_PALETTE, ...p };
}

// Fundos lavados (quando a tela não usa foto).
export const BACKGROUNDS = {
  lilas: { label: 'Lilás', stops: ['#B9AED0', '#D9C7DC', '#C3BEDF'], ink: '#FFFFFF' },
  ceu: { label: 'Azul-céu', stops: ['#9FC4EC', '#CFE2F6', '#B7D2F0'], ink: '#FFFFFF' },
  creme: { label: 'Creme', stops: ['#E6DACA', '#F4ECE0', '#E9DECF'], ink: '#6B4537' },
  rosa: { label: 'Rosa', stops: ['#E7B7C6', '#F4D9E1', '#E3BCCB'], ink: '#FFFFFF' },
};
const inkOn = (key) => (BACKGROUNDS[key] || BACKGROUNDS.lilas).ink;
export const DECOR = { estrelas: 'Estrelas cromadas', dourada: 'Estrela dourada e polaroids', brilhos: 'Brilhos e coração', nenhum: 'Sem enfeites' };

const CREAM = '#F8EEDC';
const IOS_YELLOW = '#E2A824';
const CHECK_YELLOW = '#F2B630';
const IMSG_BLUE = '#3B82F6';

// Gerador previsível (a mesma tela sempre desenha igual).
function rng(seed) {
  let h = 2166136261;
  for (const ch of String(seed)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

// Quebra o texto em linhas que cabem na largura (pura: recebe a função de medir).
export function wrap(measure, text, maxWidth, maxLines = Infinity) {
  const lines = [];
  for (const para of String(text || '').split('\n')) {
    if (!para.trim()) {
      lines.push('');
      continue;
    }
    let line = '';
    for (const word of para.split(/\s+/)) {
      const test = line ? `${line} ${word}` : word;
      if (measure(test) <= maxWidth || !line) line = test;
      else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  if (lines.length > maxLines) {
    const cut = lines.slice(0, maxLines);
    cut[maxLines - 1] = `${cut[maxLines - 1].replace(/\s*\S*$/, '')}…`;
    return cut;
  }
  return lines;
}

function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

const tracking = (ctx, px) => { if ('letterSpacing' in ctx) ctx.letterSpacing = `${px}px`; };

function shadow(ctx, blur = 30, y = 12, a = 0.18) {
  ctx.shadowColor = `rgba(0,0,0,${a})`;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetY = y;
  ctx.shadowOffsetX = 0;
}
const noShadow = (ctx) => { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; };

function textLines(ctx, str, x, y, { size = 36, weight = 500, color = '#2B2B2B', maxWidth = 800, lh = 1.35, maxLines, align = 'left', fam = UI } = {}) {
  tracking(ctx, 0);
  ctx.font = font(weight, size, fam);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  const lines = wrap((s) => ctx.measureText(s).width, str, maxWidth, maxLines);
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * size * lh));
  return y + lines.length * size * lh;
}

// ---------- Título: *palavra* sai pesada, o resto fino. Sem asteriscos, tudo pesado. ----------
function titleTokens(str) {
  const s = String(str || '');
  if (!s.includes('*')) return s.split(/\s+/).filter(Boolean).map((t) => ({ t, heavy: true }));
  const out = [];
  s.split('*').forEach((part, i) => part.split(/\s+/).filter(Boolean).forEach((t) => out.push({ t, heavy: i % 2 === 1 })));
  return out;
}
function measureTitle(ctx, tokens, size) {
  const space = size * 0.24;
  const out = tokens.map((k) => {
    ctx.font = font(k.heavy ? 900 : 400, size, TITLE);
    tracking(ctx, k.heavy ? -size * 0.03 : -size * 0.01);
    return { ...k, w: ctx.measureText(k.t).width, space };
  });
  tracking(ctx, 0);
  return out;
}
function layoutTitle(ctx, str, size, maxWidth) {
  const toks = measureTitle(ctx, titleTokens(str), size);
  const lines = [];
  let cur = [];
  let w = 0;
  for (const k of toks) {
    const add = (cur.length ? k.space : 0) + k.w;
    if (cur.length && w + add > maxWidth) {
      lines.push({ toks: cur, w });
      cur = [k];
      w = k.w;
    } else {
      cur.push(k);
      w += add;
    }
  }
  if (cur.length) lines.push({ toks: cur, w });
  return lines;
}
// Desenha o título encolhendo até caber em maxLines. Devolve a área ocupada.
function drawTitle(ctx, str, cx, y, { size = 150, minSize = 70, maxWidth = 900, maxLines = 3, align = 'center', color = CREAM, lh = 0.98, glow = true } = {}) {
  if (!String(str || '').trim()) return { top: y, bottom: y, endX: cx, lastY: y, size };
  let s = size;
  let lines = layoutTitle(ctx, str, s, maxWidth);
  while ((lines.length > maxLines || lines.some((l) => l.w > maxWidth)) && s > minSize) {
    s -= 8;
    lines = layoutTitle(ctx, str, s, maxWidth);
  }
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = color;
  if (glow) shadow(ctx, 26, 4, 0.32);
  let endX = cx;
  let lastY = y;
  lines.forEach((ln, i) => {
    const base = y + s * 0.9 + i * s * lh;
    let x = align === 'center' ? cx - ln.w / 2 : cx;
    ln.toks.forEach((k, j) => {
      if (j) x += k.space;
      ctx.font = font(k.heavy ? 900 : 400, s, TITLE);
      tracking(ctx, k.heavy ? -s * 0.03 : -s * 0.01);
      ctx.fillText(k.t, x, base);
      x += k.w;
    });
    endX = x;
    lastY = base;
  });
  tracking(ctx, 0);
  ctx.restore();
  return { top: y, bottom: y + lines.length * s * lh + s * 0.15, endX, lastY, size: s };
}

// ---------- Fundos ----------
function washed(ctx, key, seed) {
  const bg = BACKGROUNDS[key] || BACKGROUNDS.lilas;
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, bg.stops[0]);
  g.addColorStop(0.55, bg.stops[1]);
  g.addColorStop(1, bg.stops[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const r = rng(`bg:${seed}`);
  for (let i = 0; i < 4; i++) {
    const x = r() * W;
    const y = r() * H;
    const rad = 260 + r() * 360;
    const rg = ctx.createRadialGradient(x, y, 0, x, y, rad);
    rg.addColorStop(0, `rgba(255,255,255,${0.18 + r() * 0.12})`);
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);
  }
  // granulado de papel
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = r() > 0.5 ? 'rgba(255,255,255,.10)' : 'rgba(0,0,0,.05)';
    ctx.fillRect(r() * W, r() * H, 2, 2);
  }
}

// Borda de papel rasgado na lateral esquerda.
function tornEdge(ctx, seed) {
  const r = rng(`torn:${seed}`);
  const pts = [];
  for (let y = -10; y <= H + 10; y += 22) pts.push([34 + r() * 26, y]);
  ctx.save();
  shadow(ctx, 18, 0, 0.18);
  ctx.beginPath();
  ctx.moveTo(0, -10);
  pts.forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.lineTo(0, H + 10);
  ctx.closePath();
  ctx.fillStyle = '#F7F5F1';
  ctx.fill();
  noShadow(ctx);
  ctx.beginPath();
  ctx.moveTo(0, -10);
  pts.forEach(([x, y]) => ctx.lineTo(x - 14 - r() * 6, y));
  ctx.lineTo(0, H + 10);
  ctx.closePath();
  ctx.fillStyle = '#D9D6D1';
  ctx.fill();
  ctx.restore();
}

// Foto em "cover"; sem foto, um espaço cinza claro (com o pedido, só na prévia).
function photoFill(ctx, img, x, y, w, h, r, { hint = '', preview = false } = {}) {
  ctx.save();
  rr(ctx, x, y, w, h, r);
  ctx.clip();
  if (img) {
    const s = Math.max(w / img.width, h / img.height);
    ctx.drawImage(img, x + (w - img.width * s) / 2, y + (h - img.height * s) / 2, img.width * s, img.height * s);
  } else {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, '#D8D4CF');
    g.addColorStop(1, '#C7C2BC');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    if (preview) {
      // Foto de fundo inteira: o aviso vai no alto, para não ficar embaixo do título.
      const cy = h >= H * 0.9 ? y + 230 : y + h / 2;
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = font(400, Math.min(110, w / 5));
      ctx.fillText('📷', x + w / 2, cy - Math.min(70, h / 8));
      if (hint) textLines(ctx, hint, x + w / 2, cy + Math.min(10, h / 40), { size: Math.min(34, w / 16), weight: 600, color: 'rgba(60,60,60,.85)', maxWidth: w - 80, align: 'center', maxLines: 3 });
    }
  }
  ctx.restore();
}

// Escurece um pouco a foto onde vai o título, para o creme aparecer.
function scrim(ctx, y0, y1, a = 0.38) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.5, `rgba(0,0,0,${a})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, y0, W, y1 - y0);
}

// ---------- Elementos do iPhone ----------
function bubble(ctx, text, x, y, { maxW = 560, style = 'white', tail = 'left', size = 34, anchor = 'left' } = {}) {
  if (!String(text || '').trim()) return { w: 0, h: 0 };
  tracking(ctx, 0);
  ctx.font = font(500, size);
  const lines = wrap((s) => ctx.measureText(s).width, text, maxW - 56, 5);
  const w = Math.min(maxW, Math.max(...lines.map((l) => ctx.measureText(l).width)) + 56);
  const h = lines.length * size * 1.28 + 36;
  const bx = anchor === 'right' ? x - w : x;
  const fill = style === 'blue' ? IMSG_BLUE : style === 'gray' ? 'rgba(88,92,104,.82)' : '#FFFFFF';
  const color = style === 'white' ? '#1C1C1E' : '#FFFFFF';
  ctx.save();
  shadow(ctx, 22, 8, style === 'white' ? 0.14 : 0.1);
  ctx.fillStyle = fill;
  rr(ctx, bx, y, w, h, 34);
  ctx.fill();
  if (tail) {
    const tx = tail === 'left' ? bx + 18 : bx + w - 18;
    const dir = tail === 'left' ? -1 : 1;
    ctx.beginPath();
    ctx.moveTo(tx, y + h - 30);
    ctx.quadraticCurveTo(tx + dir * 6, y + h + 2, tx + dir * 26, y + h + 6);
    ctx.quadraticCurveTo(tx - dir * 2, y + h + 4, tx - dir * 18, y + h - 10);
    ctx.closePath();
    ctx.fill();
  }
  noShadow(ctx);
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  lines.forEach((l, i) => ctx.fillText(l, bx + 28, y + 18 + i * size * 1.28));
  ctx.restore();
  return { w, h, x: bx };
}

function notesCard(ctx, x, y, w, text, { preview = false, hint = '' } = {}) {
  ctx.font = font(400, 40);
  const body = String(text || '').trim() || (preview ? hint || 'Escreva sua nota…' : '');
  const lines = wrap((s) => ctx.measureText(s).width, body, w - 104, 12);
  const h = 150 + lines.length * 40 * 1.45 + 50;
  ctx.save();
  shadow(ctx, 40, 16, 0.16);
  ctx.fillStyle = '#FFFFFF';
  rr(ctx, x, y, w, h, 56);
  ctx.fill();
  noShadow(ctx);
  // cabeçalho "‹ Notes"
  ctx.strokeStyle = IOS_YELLOW;
  ctx.fillStyle = IOS_YELLOW;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + 66, y + 62);
  ctx.lineTo(x + 50, y + 80);
  ctx.lineTo(x + 66, y + 98);
  ctx.stroke();
  ctx.font = font(500, 38);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText('Notes', x + 84, y + 81);
  // ícones de compartilhar e mais
  const sx = x + w - 170;
  ctx.lineWidth = 4;
  ctx.strokeRect(sx, y + 70, 34, 36);
  ctx.beginPath();
  ctx.moveTo(sx + 17, y + 88);
  ctx.lineTo(sx + 17, y + 52);
  ctx.moveTo(sx + 6, y + 62);
  ctx.lineTo(sx + 17, y + 50);
  ctx.lineTo(sx + 28, y + 62);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + w - 80, y + 82, 22, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.arc(x + w - 80 + i * 10, y + 82, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.font = font(400, 40);
  ctx.fillStyle = String(text || '').trim() ? '#3A3A3C' : '#A0A0A5';
  ctx.textBaseline = 'top';
  lines.forEach((l, i) => ctx.fillText(l, x + 52, y + 150 + i * 40 * 1.45));
  ctx.restore();
  return h;
}

function contextMenu(ctx, x, y) {
  const items = ['Cut', 'Copy', 'Paste', 'Replace…'];
  ctx.save();
  ctx.font = font(500, 26);
  const pads = items.map((t) => ctx.measureText(t).width + 40);
  const w = pads.reduce((a, b) => a + b, 0) + 50;
  shadow(ctx, 20, 6, 0.25);
  ctx.fillStyle = 'rgba(44,44,46,.96)';
  rr(ctx, x, y, w, 62, 14);
  ctx.fill();
  noShadow(ctx);
  ctx.beginPath();
  ctx.moveTo(x + w / 2 - 12, y + 62);
  ctx.lineTo(x + w / 2, y + 76);
  ctx.lineTo(x + w / 2 + 12, y + 62);
  ctx.fill();
  let cx = x;
  ctx.fillStyle = '#FFFFFF';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  items.forEach((t, i) => {
    ctx.fillText(t, cx + pads[i] / 2, y + 32);
    cx += pads[i];
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    ctx.fillRect(cx, y + 12, 2, 38);
    ctx.fillStyle = '#FFFFFF';
  });
  ctx.beginPath();
  ctx.moveTo(cx + 18, y + 20);
  ctx.lineTo(cx + 34, y + 31);
  ctx.lineTo(cx + 18, y + 42);
  ctx.fill();
  ctx.restore();
}

function sparkle(ctx, cx, cy, s, color = '#FFD54A') {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - s);
  ctx.quadraticCurveTo(cx + s * 0.12, cy - s * 0.12, cx + s, cy);
  ctx.quadraticCurveTo(cx + s * 0.12, cy + s * 0.12, cx, cy + s);
  ctx.quadraticCurveTo(cx - s * 0.12, cy + s * 0.12, cx - s, cy);
  ctx.quadraticCurveTo(cx - s * 0.12, cy - s * 0.12, cx, cy - s);
  ctx.fill();
  ctx.restore();
}
function sparkles(ctx, x, y, s = 40) {
  sparkle(ctx, x, y, s);
  sparkle(ctx, x + s * 1.1, y - s * 0.9, s * 0.55);
  sparkle(ctx, x + s * 1.2, y + s * 0.5, s * 0.38);
}

function heart(ctx, cx, cy, s, rot = -0.25) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  const g = ctx.createLinearGradient(-s, -s, s, s);
  g.addColorStop(0, '#FF8FC0');
  g.addColorStop(1, '#E2397A');
  ctx.fillStyle = g;
  shadow(ctx, 14, 4, 0.2);
  ctx.beginPath();
  ctx.moveTo(0, s * 0.9);
  ctx.bezierCurveTo(-s * 1.4, -s * 0.1, -s * 0.6, -s * 1.1, 0, -s * 0.35);
  ctx.bezierCurveTo(s * 0.6, -s * 1.1, s * 1.4, -s * 0.1, 0, s * 0.9);
  ctx.fill();
  noShadow(ctx);
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.beginPath();
  ctx.ellipse(-s * 0.42, -s * 0.38, s * 0.18, s * 0.1, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function starPath(ctx, r, inner = 0.48, round = 0.18) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r * inner : r;
    pts.push([Math.cos(a) * rad, Math.sin(a) * rad]);
  }
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const [x0, y0] = pts[(i + 9) % 10];
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % 10];
    const ax = x1 + (x0 - x1) * round;
    const ay = y1 + (y0 - y1) * round;
    const bx = x1 + (x2 - x1) * round;
    const by = y1 + (y2 - y1) * round;
    if (i === 0) ctx.moveTo(ax, ay);
    else ctx.lineTo(ax, ay);
    ctx.quadraticCurveTo(x1, y1, bx, by);
  }
  ctx.closePath();
}
function chromeStar(ctx, cx, cy, r, rot = 0) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  shadow(ctx, 24, 10, 0.22);
  starPath(ctx, r);
  const g = ctx.createRadialGradient(-r * 0.25, -r * 0.3, r * 0.05, 0, 0, r * 1.05);
  g.addColorStop(0, '#FFFFFF');
  g.addColorStop(0.35, '#DCE9F8');
  g.addColorStop(0.7, '#8FB1DA');
  g.addColorStop(1, '#5E83B8');
  ctx.fillStyle = g;
  ctx.fill();
  noShadow(ctx);
  ctx.strokeStyle = 'rgba(255,255,255,.9)';
  ctx.lineWidth = Math.max(2, r * 0.05);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.18, -r * 0.32, r * 0.16, r * 0.07, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
function goldStar(ctx, cx, cy, r, rot = 0.2, seed = '') {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  shadow(ctx, 24, 10, 0.2);
  starPath(ctx, r, 0.5, 0.22);
  const g = ctx.createRadialGradient(-r * 0.2, -r * 0.25, r * 0.05, 0, 0, r);
  g.addColorStop(0, '#FFF6DE');
  g.addColorStop(0.5, '#E9CB8E');
  g.addColorStop(1, '#BE9150');
  ctx.fillStyle = g;
  ctx.fill();
  noShadow(ctx);
  ctx.clip();
  const rnd = rng(`gold:${seed}`);
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,.75)' : 'rgba(150,105,40,.35)';
    ctx.fillRect((rnd() - 0.5) * 2 * r, (rnd() - 0.5) * 2 * r, 3, 3);
  }
  ctx.restore();
}

function polaroid(ctx, x, y, w, rot, img) {
  const h = w * 1.18;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(rot);
  shadow(ctx, 20, 8, 0.22);
  ctx.fillStyle = '#FBFBF9';
  ctx.fillRect(-w / 2, -h / 2, w, h);
  noShadow(ctx);
  photoFill(ctx, img, -w / 2 + w * 0.07, -h / 2 + w * 0.07, w * 0.86, w * 0.86, 2);
  ctx.restore();
}

function clapper(ctx, x, y, w, rot = -0.12) {
  const h = w * 0.62;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  shadow(ctx, 22, 8, 0.25);
  ctx.fillStyle = '#FFFFFF';
  rr(ctx, -10, -h * 0.34 - 10, w + 20, h + h * 0.34 + 20, 18);
  ctx.fill();
  noShadow(ctx);
  ctx.fillStyle = '#151515';
  rr(ctx, 0, 0, w, h, 10);
  ctx.fill();
  // barra listrada (um pouco aberta)
  ctx.save();
  ctx.translate(0, -4);
  ctx.rotate(-0.1);
  ctx.fillStyle = '#151515';
  ctx.fillRect(0, -h * 0.3, w, h * 0.26);
  ctx.beginPath();
  ctx.rect(0, -h * 0.3, w, h * 0.26);
  ctx.clip();
  ctx.fillStyle = '#FFFFFF';
  for (let i = -2; i < 10; i++) {
    ctx.beginPath();
    ctx.moveTo(i * w * 0.14, -h * 0.3);
    ctx.lineTo(i * w * 0.14 + w * 0.07, -h * 0.3);
    ctx.lineTo(i * w * 0.14 + w * 0.12, -h * 0.04);
    ctx.lineTo(i * w * 0.14 + w * 0.05, -h * 0.04);
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = font(700, w * 0.085);
  tracking(ctx, 1);
  ctx.fillText('YOU ARE', w / 2, h * 0.27);
  ctx.fillText('THE MAIN CHARACTER', w / 2, h * 0.47);
  tracking(ctx, 0);
  ctx.fillRect(w * 0.06, h * 0.62, w * 0.88, 2);
  ctx.font = font(700, w * 0.08);
  ['1', "'26", '6'].forEach((t, i) => ctx.fillText(t, w * (0.2 + i * 0.3), h * 0.8));
  ctx.restore();
}

function paperclip(ctx, x, y, s, rot = 0.25) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.strokeStyle = '#9EA3AA';
  ctx.lineWidth = s * 0.09;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(s * 0.18, s * 0.9);
  ctx.lineTo(s * 0.18, -s * 0.6);
  ctx.arc(0, -s * 0.6, s * 0.18, 0, Math.PI, true);
  ctx.lineTo(-s * 0.18, s * 1.05);
  ctx.arc(0.02 * s, s * 1.05, s * 0.2, Math.PI, 0, true);
  ctx.lineTo(s * 0.22, -s * 0.2);
  ctx.stroke();
  ctx.restore();
}

function todoCard(ctx, x, y, w, items, { title = 'To do list', rot = -0.05, preview = false } = {}) {
  const list = (items || []).filter((i) => i.text || preview).slice(0, 7);
  const rows = list.length ? list : [{ text: preview ? 'item…' : '', done: true }];
  const h = 140 + rows.length * 64 + 30;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(rot);
  ctx.translate(-w / 2, -h / 2);
  shadow(ctx, 30, 12, 0.18);
  ctx.fillStyle = '#FFFFFF';
  rr(ctx, 0, 0, w, h, 40);
  ctx.fill();
  noShadow(ctx);
  ctx.font = font(800, 50);
  const tw = ctx.measureText(title).width;
  ctx.fillStyle = 'rgba(247,215,116,.85)';
  ctx.fillRect(40, 70, tw + 20, 34);
  ctx.fillStyle = CHECK_YELLOW;
  ctx.beginPath();
  ctx.arc(44, 60, 9, 0, Math.PI * 2);
  ctx.arc(tw + 58, 108, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1C1C1E';
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillText(title, 50, 104);
  sparkles(ctx, tw + 100, 70, 18);
  rows.forEach((it, i) => {
    const cy = 150 + i * 64 + 22;
    ctx.fillStyle = CHECK_YELLOW;
    ctx.beginPath();
    ctx.arc(66, cy, 18, 0, Math.PI * 2);
    ctx.fill();
    if (it.done !== false) {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(57, cy);
      ctx.lineTo(64, cy + 7);
      ctx.lineTo(76, cy - 7);
      ctx.stroke();
    }
    ctx.font = font(500, 36);
    ctx.fillStyle = it.text ? '#2C2C2E' : '#A0A0A5';
    ctx.textBaseline = 'middle';
    ctx.fillText(wrap((s) => ctx.measureText(s).width, it.text || 'item…', w - 150, 1)[0], 102, cy + 2);
  });
  paperclip(ctx, w - 70, -20, 80);
  ctx.restore();
  return h;
}

function searchPill(ctx, cx, cy, w, text, rot = -0.04) {
  if (!String(text || '').trim()) return;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.font = font(500, 38);
  const tw = Math.min(ctx.measureText(text).width, w - 150);
  const pw = tw + 150;
  shadow(ctx, 20, 6, 0.16);
  ctx.fillStyle = '#FFFFFF';
  rr(ctx, -pw / 2, -44, pw, 88, 44);
  ctx.fill();
  noShadow(ctx);
  ctx.strokeStyle = '#3A3A3C';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(-pw / 2 + 52, -4, 14, 0, Math.PI * 2);
  ctx.moveTo(-pw / 2 + 62, 6);
  ctx.lineTo(-pw / 2 + 74, 18);
  ctx.stroke();
  ctx.fillStyle = '#2C2C2E';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(wrap((s) => ctx.measureText(s).width, text, w - 150, 1)[0], -pw / 2 + 96, 2);
  ctx.fillStyle = CHECK_YELLOW;
  ctx.fillRect(-pw / 2 + 102 + tw, -22, 4, 44);
  ctx.beginPath();
  ctx.arc(-pw / 2 + 104 + tw, -24, 7, 0, Math.PI * 2);
  ctx.arc(-pw / 2 + 104 + tw, 24, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function pinkPill(ctx, cx, y, text) {
  if (!String(text || '').trim()) return y;
  ctx.save();
  ctx.font = font(900, 56, TITLE);
  tracking(ctx, 1);
  const t = text.toUpperCase();
  const w = ctx.measureText(t).width + 70;
  shadow(ctx, 16, 6, 0.15);
  ctx.fillStyle = '#F59BB7';
  rr(ctx, cx - w / 2, y, w, 92, 24);
  ctx.fill();
  noShadow(ctx);
  ctx.fillStyle = CREAM;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(t, cx, y + 48);
  tracking(ctx, 0);
  ctx.restore();
  return y + 92;
}

function locationTag(ctx, x, y, text, P) {
  if (!String(text || '').trim()) return;
  ctx.save();
  ctx.font = font(500, 40);
  const t = text.toUpperCase();
  const w = Math.min(W - x - 40, ctx.measureText(t).width + 110);
  shadow(ctx, 14, 6, 0.15);
  ctx.fillStyle = P.accent || '#F6E7A6';
  rr(ctx, x, y, w, 84, 26);
  ctx.fill();
  noShadow(ctx);
  ctx.strokeStyle = '#4B3F1A';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x + 46, y + 36, 13, Math.PI * 0.85, Math.PI * 0.15);
  ctx.lineTo(x + 46, y + 64);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + 46, y + 36, 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#4B3F1A';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(wrap((s) => ctx.measureText(s).width, t, w - 100, 1)[0], x + 80, y + 44);
  ctx.restore();
}

function folder(ctx, x, y, s, label) {
  ctx.save();
  shadow(ctx, 14, 6, 0.18);
  ctx.fillStyle = '#5DB2EE';
  rr(ctx, x, y, s * 0.45, s * 0.2, s * 0.05);
  ctx.fill();
  const g = ctx.createLinearGradient(0, y + s * 0.1, 0, y + s * 0.78);
  g.addColorStop(0, '#8ED0FA');
  g.addColorStop(1, '#4FA8EA');
  ctx.fillStyle = g;
  rr(ctx, x, y + s * 0.12, s, s * 0.66, s * 0.06);
  ctx.fill();
  noShadow(ctx);
  if (label) {
    ctx.fillStyle = '#FFFFFF';
    shadow(ctx, 8, 2, 0.35);
    ctx.font = font(500, s * 0.2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(label, x + s / 2, y + s * 0.86);
  }
  ctx.restore();
}

function photoCard(ctx, x, y, w, h, img, label, opts) {
  ctx.save();
  shadow(ctx, 36, 14, 0.2);
  ctx.fillStyle = '#FFFFFF';
  rr(ctx, x, y, w, h, 40);
  ctx.fill();
  noShadow(ctx);
  ctx.fillStyle = '#1C1C1E';
  ctx.beginPath();
  ctx.arc(x + 50, y + 48, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = font(800, 24);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('@', x + 50, y + 49);
  ctx.fillStyle = '#1C1C1E';
  ctx.font = font(600, 30);
  ctx.textAlign = 'left';
  ctx.fillText(label || '', x + 88, y + 50);
  photoFill(ctx, img, x + 14, y + 96, w - 28, h - 110, 30, opts);
  ctx.restore();
}

function profileCard(ctx, x, y, w, prof = {}, img) {
  const h = 330;
  ctx.save();
  shadow(ctx, 30, 12, 0.2);
  ctx.fillStyle = '#FFFFFF';
  rr(ctx, x, y, w, h, 36);
  ctx.fill();
  noShadow(ctx);
  ctx.fillStyle = '#1C1C1E';
  ctx.font = font(700, 32);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`‹  ${prof.handle || '@voce'}`, x + 30, y + 52);
  ctx.fillText('···', x + w - 80, y + 46);
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + 90, y + 150, 58, 0, Math.PI * 2);
  ctx.clip();
  photoFill(ctx, img, x + 32, y + 92, 116, 116, 0);
  ctx.restore();
  ctx.font = font(700, 32);
  ctx.fillText(prof.name || 'Seu nome', x + 176, y + 128);
  ctx.font = font(500, 26);
  ctx.fillStyle = '#6B6B70';
  textLines(ctx, prof.bio || '', x + 176, y + 152, { size: 26, color: '#6B6B70', maxWidth: w - 210, maxLines: 2 });
  const bw = (w - 80) / 2;
  ctx.fillStyle = '#4C6EF5';
  rr(ctx, x + 30, y + 244, bw, 58, 14);
  ctx.fill();
  ctx.fillStyle = '#EFEFF4';
  rr(ctx, x + 50 + bw, y + 244, bw, 58, 14);
  ctx.fill();
  ctx.font = font(700, 28);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('Seguir', x + 30 + bw / 2, y + 274);
  ctx.fillStyle = '#1C1C1E';
  ctx.fillText('Mensagem', x + 50 + bw * 1.5, y + 274);
  ctx.restore();
}

// Enfeites em cantos que não cobrem o texto.
function decorate(ctx, kind, spots, seed, images = []) {
  if (kind === 'nenhum' || !spots?.length) return;
  const r = rng(`decor:${seed}`);
  if (kind === 'dourada') {
    const [a, b] = spots;
    goldStar(ctx, a[0], a[1], 110, 0.25, seed);
    if (b) {
      polaroid(ctx, b[0] - 90, b[1] - 60, 150, -0.18, images[1] || null);
      polaroid(ctx, b[0] - 20, b[1] - 110, 150, 0.12, images[2] || null);
    }
    return;
  }
  if (kind === 'brilhos') {
    spots.slice(0, 2).forEach(([x, y], i) => (i ? heart(ctx, x, y, 44) : sparkles(ctx, x, y, 46)));
    return;
  }
  // estrelas cromadas (padrão)
  spots.slice(0, 2).forEach(([x, y], i) => {
    chromeStar(ctx, x, y, i ? 62 : 96, (r() - 0.5) * 0.6);
    chromeStar(ctx, x + (i ? 70 : -110), y + (i ? -70 : 80), i ? 36 : 54, (r() - 0.5) * 0.8);
  });
}

// ---------- Layouts ----------
const LAYOUTS = {
  // Capa: foto de fundo, título grande creme, barra de busca e enfeites.
  capa(ctx, s, o) {
    const img = o.images[0];
    if (s.photo || img) photoFill(ctx, img, 0, 0, W, H, 0, { hint: s.photoHint, preview: o.preview });
    else {
      washed(ctx, s.bg || o.bg, s.title);
      tornEdge(ctx, s.title);
    }
    const low = s.pos === 'baixo';
    const y = low ? 860 : 470;
    if (s.photo || img) scrim(ctx, y - 220, y + 520, 0.36);
    const onPhoto = Boolean(s.photo || img);
    const t = drawTitle(ctx, s.title || (o.preview ? 'Título da *capa*' : ''), W / 2, y, { size: 168, maxLines: 3, maxWidth: 920, color: onPhoto ? CREAM : inkOn(s.bg || o.bg), glow: onPhoto || inkOn(s.bg || o.bg) === '#FFFFFF' });
    if (s.kicker) searchPill(ctx, W / 2, t.bottom + 90, 820, s.kicker);
    if (s.title && (s.decor || o.decor) !== 'nenhum') sparkles(ctx, Math.min(W - 70, t.endX + 30), t.lastY - t.size * 0.75, 34);
    decorate(ctx, s.decor || o.decor, low ? [[880, 240], [180, 300]] : [[890, 210], [170, 1190]], s.title, o.images);
  },
  // Grade 2x2 de fotos com título na emenda (ex.: "segunda"), etiqueta rosa e to do list.
  grade(ctx, s, o) {
    const hw = W / 2;
    const hh = H / 2;
    [0, 1, 2, 3].forEach((i) => photoFill(ctx, o.images[i], (i % 2) * hw, Math.floor(i / 2) * hh, hw, hh, 0, { hint: i === 0 ? s.photoHint : '', preview: o.preview }));
    scrim(ctx, hh - 260, hh + 260, 0.25);
    const t = drawTitle(ctx, s.title || (o.preview ? 'segunda' : ''), W / 2, hh - 150, { size: 200, maxLines: 2, maxWidth: 980 });
    if (s.title) sparkles(ctx, Math.min(W - 60, t.endX + 26), t.lastY - t.size * 0.7, 38);
    let bottom = t.bottom;
    if (s.kicker) bottom = pinkPill(ctx, W / 2, t.bottom + 10, s.kicker) + 20;
    const its = (s.items || []).filter((i) => i.text).slice(0, 7);
    if (its.length) todoCard(ctx, 570, Math.max(bottom + 40, H - (170 + its.length * 64) - 70), 450, its, { preview: o.preview });
  },
  // Fundo lavado + papel rasgado + texto de cima + nota do iPhone com menu Copiar/Colar.
  notas(ctx, s, o) {
    washed(ctx, s.bg || o.bg, `${s.title}${s.body}`);
    tornEdge(ctx, s.body || s.title);
    let y = 170;
    if (s.title) y = textLines(ctx, s.title, W / 2, y, { size: 42, weight: 700, color: inkOn(s.bg || o.bg), maxWidth: 820, align: 'center', lh: 1.4, maxLines: 7 }) + 70;
    else y = 300;
    const hNote = notesCard(ctx, 140, y, 820, s.body, { preview: o.preview, hint: s.hint });
    if (s.body) contextMenu(ctx, 300, y + hNote - 30);
    if ((s.decor || o.decor) !== 'nenhum') clapper(ctx, 760, Math.min(H - 200, y + hNote + 40), 230, -0.14);
  },
  // Foto de fundo + título no topo + balões curtos espalhados (ex.: "motivos pra me seguir").
  baloes(ctx, s, o) {
    const img = o.images[0];
    if (s.photo || img) photoFill(ctx, img, 0, 0, W, H, 0, { hint: s.photoHint, preview: o.preview });
    else washed(ctx, s.bg || o.bg, s.title);
    if (s.photo || img) scrim(ctx, 0, 520, 0.45);
    const onPhoto = Boolean(s.photo || img);
    const t = drawTitle(ctx, s.title || (o.preview ? 'motivos pra me seguir *(ou não)*' : ''), W / 2, 70, { size: 120, maxLines: 2, maxWidth: 940, color: onPhoto ? CREAM : inkOn(s.bg || o.bg), glow: onPhoto || inkOn(s.bg || o.bg) === '#FFFFFF' });
    const items = (s.items || []).filter((i) => i.text).slice(0, 12);
    const list = items.length ? items : o.preview ? [{ text: 'um balão…' }, { text: 'outro balão…' }] : [];
    const top = t.bottom + 50;
    const step = Math.max(96, (H - top - 80) / Math.max(1, Math.ceil(list.length / 2)));
    list.forEach((it, i) => {
      const right = i % 2 === 1;
      const y = top + Math.floor(i / 2) * step + (right ? step * 0.45 : 0);
      bubble(ctx, it.text, right ? W - 30 : 30, Math.min(y, H - 130), { maxW: 500, anchor: right ? 'right' : 'left', tail: right ? 'left' : 'right', size: 32 });
    });
  },
  // Foto de fundo (ou fundo lavado) + to do list.
  lista(ctx, s, o) {
    const img = o.images[0];
    if (s.photo || img) photoFill(ctx, img, 0, 0, W, H, 0, { hint: s.photoHint, preview: o.preview });
    else {
      washed(ctx, s.bg || o.bg, s.title);
      tornEdge(ctx, s.title);
    }
    let y = 150;
    if (s.title) {
      if (s.photo || img) scrim(ctx, 0, 560, 0.4);
      const onPhoto = Boolean(s.photo || img);
      y = drawTitle(ctx, s.title, W / 2, 110, { size: 130, maxLines: 3, color: onPhoto ? CREAM : inkOn(s.bg || o.bg), glow: onPhoto || inkOn(s.bg || o.bg) === '#FFFFFF' }).bottom + 60;
    }
    todoCard(ctx, 170, Math.max(y, 520), 740, s.items, { title: s.kicker || 'To do list', preview: o.preview });
    decorate(ctx, s.decor || o.decor, [[900, 1250], [160, 1230]], s.title, o.images);
  },
  // Conversa: balões cinza/azul sobre fundo lavado, com foto em card no meio (opcional).
  imessage(ctx, s, o) {
    washed(ctx, s.bg || o.bg, JSON.stringify(s.messages || []));
    tornEdge(ctx, s.contact || 'msg');
    const img = o.images[0];
    const msgs = (s.messages || []).filter((m) => m.text || o.preview);
    let y = 150;
    const draw = (m) => {
      const b = bubble(ctx, m.text || '…', m.me ? W - 90 : 150, y, { maxW: 600, style: m.me ? 'blue' : 'gray', anchor: m.me ? 'right' : 'left', tail: m.me ? 'right' : 'left', size: 38 });
      y += b.h + 34;
    };
    if (s.photo || img) {
      if (msgs[0]) draw(msgs[0]);
      const cardY = y + 10;
      photoCard(ctx, 200, cardY, 680, 820, img, o.profile?.handle || s.contact || '', { hint: s.photoHint, preview: o.preview });
      y = cardY + 40;
      msgs.slice(1).forEach(draw);
      decorate(ctx, s.decor || o.decor, [[920, H - 190]], s.contact, o.images);
    } else {
      msgs.forEach(draw);
      decorate(ctx, s.decor || o.decor, [[900, H - 200], [170, H - 220]], s.contact, o.images);
    }
  },
  // Foto inteira + etiqueta de local + balão (ex.: "date w/ my love").
  foto(ctx, s, o) {
    photoFill(ctx, o.images[0], 0, 0, W, H, 0, { hint: s.photoHint, preview: o.preview });
    if (s.kicker) locationTag(ctx, 60, 640, s.kicker, o.P);
    if (s.title) bubble(ctx, s.title, 60, H - 330, { maxW: 640, size: 38, tail: 'left' });
    decorate(ctx, s.decor || o.decor, [[910, 200]], s.title || s.kicker, o.images);
    if (s.folder) folder(ctx, 820, 980, 180, s.folder);
  },
  // Final: balão cinza, card com foto, balão azul e card de perfil.
  cta(ctx, s, o) {
    washed(ctx, s.bg || o.bg, `${s.title}${s.body}`);
    tornEdge(ctx, s.body || 'cta');
    const img = o.images[0];
    let y = 110;
    if (s.title) y += bubble(ctx, s.title, W - 120, y, { maxW: 620, style: 'gray', anchor: 'right', tail: 'right', size: 38 }).h + 40;
    if (s.photo || img) photoCard(ctx, 210, y, 640, 840, img, o.profile?.handle || '', { hint: s.photoHint, preview: o.preview });
    if (s.body) bubble(ctx, s.body, W - 60, y + 30, { maxW: 520, style: 'blue', anchor: 'right', tail: 'right', size: 38 });
    profileCard(ctx, 70, Math.min(H - 380, y + 640), 560, o.profile, img);
    decorate(ctx, s.decor || o.decor, [[900, H - 260]], s.body || s.title, o.images);
  },
};
// Telas antigas de widgets viram balões.
LAYOUTS.widgets = (ctx, s, o) => LAYOUTS.baloes(ctx, { ...s, items: (s.cells || []).map((c) => ({ text: c.value ? `${c.label}: ${c.value}` : c.label })) }, o);

/**
 * Desenha uma tela.
 * opts: { palette, images: [HTMLImageElement|ImageBitmap], image, preview, bg, decor, profile: { name, handle, bio } }
 */
export function drawSlide(canvas, slide, opts = {}) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const images = opts.images || (opts.image ? [opts.image] : []);
  const o = { ...opts, images, P: palette(opts.palette), preview: Boolean(opts.preview), bg: opts.bg || 'lilas', decor: opts.decor || 'estrelas' };
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);
  tracking(ctx, 0);
  (LAYOUTS[slide.layout] || LAYOUTS.notas)(ctx, slide, o);
  return canvas;
}
