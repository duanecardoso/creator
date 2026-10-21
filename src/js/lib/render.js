// Desenha as telas de carrossel/estático em canvas (1080×1350, formato 4:5 do feed).
// Estética iOS: base neutra, cantos arredondados, tipografia SF, cor só nos detalhes.

export const W = 1080;
export const H = 1350;
const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Inter, Arial, sans-serif';
const font = (weight, size) => `${weight} ${size}px ${FONT}`;

export const DEFAULT_PALETTE = {
  bg: '#F5F4F1', // off-white
  card: '#FFFFFF',
  ink: '#1C1C1E',
  muted: '#8E8E93',
  accent: '#EAD9A4', // amarelo-manteiga suave
  accent2: '#EBCBD1', // rosa suave
  accent3: '#7A5A48', // marrom
};

export function palette(p = {}, dark = false) {
  const base = { ...DEFAULT_PALETTE, ...p };
  if (!dark) return base;
  return { ...base, bg: '#0B0B0C', card: '#1C1C1E', ink: '#F2F2F7', muted: '#8E8E93', bubbleIn: '#262629' };
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
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, { size = 44, weight = 400, color, maxWidth = 900, lh = 1.3, maxLines, align = 'left' }) {
  ctx.font = font(weight, size);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  const lines = wrap((s) => ctx.measureText(s).width, str, maxWidth, maxLines);
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * size * lh));
  return y + lines.length * size * lh;
}

function drawImageCover(ctx, img, x, y, w, h, r) {
  ctx.save();
  rr(ctx, x, y, w, h, r);
  ctx.clip();
  const s = Math.max(w / img.width, h / img.height);
  const iw = img.width * s;
  const ih = img.height * s;
  ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
  ctx.restore();
}

function photoSlot(ctx, x, y, w, h, r, P, slide, img, preview) {
  if (img) return drawImageCover(ctx, img, x, y, w, h, r);
  rr(ctx, x, y, w, h, r);
  ctx.fillStyle = P.dark ? '#2C2C2E' : '#E9E8E4';
  ctx.fill();
  if (preview) {
    text(ctx, '📷', x + w / 2, y + h / 2 - 90, { size: 72, color: P.muted, align: 'center' });
    text(ctx, slide.photoHint || 'Foto sua aqui', x + w / 2, y + h / 2 + 10, { size: 34, weight: 500, color: P.muted, align: 'center', maxWidth: w - 120, maxLines: 3 });
  }
}

function hint(ctx, slide, x, y, P, preview, maxWidth = 860) {
  if (preview && slide.hint) text(ctx, `✏︎ ${slide.hint}`, x, y, { size: 36, color: P.muted, maxWidth, maxLines: 3 });
}

function chrome(ctx, P, { index, total, handle, dark }) {
  // Barra de status do iPhone (detalhe "iOS core")
  ctx.font = font(600, 30);
  ctx.fillStyle = P.ink;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText('9:41', 72, 64);
  // bateria
  ctx.strokeStyle = P.ink;
  ctx.lineWidth = 3;
  rr(ctx, W - 132, 52, 56, 26, 8);
  ctx.stroke();
  rr(ctx, W - 127, 57, 40, 16, 4);
  ctx.fillStyle = P.ink;
  ctx.fill();
  // sinal
  for (let i = 0; i < 4; i++) {
    rr(ctx, W - 230 + i * 14, 72 - (i + 1) * 6, 9, (i + 1) * 6, 2);
    ctx.fill();
  }
  // rodapé: @ e pontos de página (como o UIPageControl)
  if (handle) {
    ctx.font = font(500, 28);
    ctx.fillStyle = P.muted;
    ctx.textAlign = 'left';
    ctx.fillText(handle, 72, H - 64);
  }
  if (total > 1) {
    const gap = 26;
    const startX = W / 2 - ((total - 1) * gap) / 2;
    for (let i = 0; i < total; i++) {
      ctx.beginPath();
      ctx.arc(startX + i * gap, H - 64, 7, 0, Math.PI * 2);
      ctx.fillStyle = i === index ? P.ink : dark ? '#48484A' : '#C7C7CC';
      ctx.fill();
    }
  }
}

function pill(ctx, label, x, y, P, { bg = P.accent, color = '#1C1C1E' } = {}) {
  if (!label) return y;
  ctx.font = font(600, 30);
  const w = ctx.measureText(label.toUpperCase()).width + 48;
  rr(ctx, x, y, w, 56, 28);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(label.toUpperCase(), x + 24, y + 29);
  return y + 56;
}

const LAYOUTS = {
  capa(ctx, s, P, img, preview) {
    if (s.photo) {
      photoSlot(ctx, 60, 120, W - 120, 740, 56, P, s, img, preview);
      const y = s.kicker ? pill(ctx, s.kicker, 72, 900, P) + 22 : 910;
      text(ctx, s.title || (preview ? 'Título da capa' : ''), 72, y, { size: 64, weight: 700, color: s.title ? P.ink : P.muted, maxWidth: W - 144, lh: 1.12, maxLines: s.kicker ? 3 : 4 });
      return;
    }
    // detalhe: círculo suave de cor no canto
    ctx.beginPath();
    ctx.arc(W - 140, 300, 120, 0, Math.PI * 2);
    ctx.fillStyle = P.accent2;
    ctx.fill();
    const y = pill(ctx, s.kicker, 72, 420, P);
    const end = text(ctx, s.title || (preview ? 'Título da capa' : ''), 72, y + 40, { size: 100, weight: 700, color: s.title ? P.ink : P.muted, maxWidth: W - 144, lh: 1.08, maxLines: 5 });
    if (s.body) text(ctx, s.body, 72, end + 36, { size: 40, color: P.muted, maxWidth: W - 144, maxLines: 3 });
  },
  notas(ctx, s, P, img, preview) {
    rr(ctx, 60, 130, W - 120, 1080, 56);
    ctx.fillStyle = P.card;
    ctx.fill();
    ctx.font = font(500, 36);
    ctx.fillStyle = P.accent3;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText('‹ Notas', 108, 180);
    const today = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    text(ctx, today, W / 2, 250, { size: 26, color: P.muted, align: 'center' });
    let y = 320;
    if (s.kicker) y = pill(ctx, s.kicker, 108, y, P, { bg: P.accent2 }) + 28;
    y = text(ctx, s.title || '', 108, y, { size: 62, weight: 700, color: P.ink, maxWidth: W - 216, lh: 1.12, maxLines: 3 });
    if (s.body) text(ctx, s.body, 108, y + 28, { size: 42, color: P.ink, maxWidth: W - 216, lh: 1.38, maxLines: Math.max(3, Math.floor((1150 - y) / 58)) });
    else hint(ctx, s, 108, y + 28, P, preview, W - 216);
  },
  lista(ctx, s, P, img, preview) {
    text(ctx, s.title || (preview ? 'Lista' : ''), 72, 170, { size: 76, weight: 700, color: P.accent3, maxWidth: W - 144, lh: 1.1, maxLines: 2 });
    let y = 400;
    const items = (s.items || []).filter((i) => i.text || preview);
    if (!items.some((i) => i.text)) hint(ctx, s, 72, 340, P, preview);
    for (const it of items.slice(0, 8)) {
      ctx.beginPath();
      ctx.arc(102, y + 30, 26, 0, Math.PI * 2);
      if (it.done) {
        ctx.fillStyle = P.accent3;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(90, y + 30);
        ctx.lineTo(100, y + 40);
        ctx.lineTo(116, y + 20);
        ctx.stroke();
      } else {
        ctx.strokeStyle = P.muted;
        ctx.lineWidth = 4;
        ctx.stroke();
      }
      const end = text(ctx, it.text || (preview ? 'item…' : ''), 160, y + 6, { size: 44, color: it.done ? P.muted : P.ink, maxWidth: W - 240, maxLines: 2 });
      y = Math.max(end, y + 60) + 26;
      ctx.fillStyle = P.dark ? '#2C2C2E' : '#E5E5EA';
      ctx.fillRect(160, y - 14, W - 232, 2);
    }
  },
  imessage(ctx, s, P, img, preview) {
    ctx.beginPath();
    ctx.arc(W / 2, 190, 52, 0, Math.PI * 2);
    ctx.fillStyle = P.dark ? '#3A3A3C' : '#D1D1D6';
    ctx.fill();
    text(ctx, s.contact || 'Conversa', W / 2, 256, { size: 30, weight: 500, color: P.muted, align: 'center' });
    let y = 360;
    const msgs = s.messages || [];
    if (!msgs.some((m) => m.text)) hint(ctx, s, 72, 330, P, preview);
    for (const m of msgs) {
      if (!m.text && !preview) continue;
      ctx.font = font(400, 42);
      const lines = wrap((t) => ctx.measureText(t).width, m.text || '…', 640, 6);
      const w = Math.min(720, Math.max(...lines.map((l) => ctx.measureText(l).width)) + 64);
      const h = lines.length * 54 + 40;
      const x = m.me ? W - 60 - w : 60;
      rr(ctx, x, y, w, h, 44);
      ctx.fillStyle = m.me ? P.ink : P.dark ? P.bubbleIn : '#E9E9EB';
      ctx.fill();
      lines.forEach((l, i) => {
        ctx.fillStyle = m.me ? (P.dark ? '#1C1C1E' : '#FFFFFF') : P.ink;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(l, x + 32, y + 22 + i * 54);
      });
      y += h + 22;
      if (y > H - 200) break;
    }
  },
  widgets(ctx, s, P, img, preview) {
    text(ctx, s.title || '', 72, 170, { size: 66, weight: 700, color: P.ink, maxWidth: W - 144, lh: 1.1, maxLines: 2 });
    const cells = (s.cells || []).slice(0, 4);
    const gw = (W - 144 - 30) / 2;
    const gh = 420;
    cells.forEach((c, i) => {
      const x = 72 + (i % 2) * (gw + 30);
      const y = 360 + Math.floor(i / 2) * (gh + 30);
      rr(ctx, x, y, gw, gh, 48);
      ctx.fillStyle = P.card;
      ctx.fill();
      rr(ctx, x + 36, y + 40, 18, 18, 9);
      ctx.fillStyle = i % 2 ? P.accent2 : P.accent;
      ctx.fill();
      text(ctx, (c.label || '').toUpperCase(), x + 66, y + 32, { size: 28, weight: 600, color: P.muted, maxWidth: gw - 100, maxLines: 1 });
      text(ctx, c.value || (preview ? '…' : ''), x + 36, y + 100, { size: 42, weight: 600, color: c.value ? P.ink : P.muted, maxWidth: gw - 72, lh: 1.22, maxLines: 6 });
    });
  },
  foto(ctx, s, P, img, preview) {
    photoSlot(ctx, 0, 0, W, H, 0, P, s, img, preview);
    if (s.kicker) {
      ctx.save();
      ctx.globalAlpha = 0.92;
      pill(ctx, s.kicker, 72, 120, P, { bg: P.card, color: P.ink });
      ctx.restore();
    }
    if (s.title) {
      ctx.font = font(600, 42);
      const lines = wrap((t) => ctx.measureText(t).width, s.title, W - 240, 3);
      const h = lines.length * 54 + 56;
      ctx.save();
      ctx.globalAlpha = 0.9;
      rr(ctx, 60, H - 150 - h, W - 120, h, 40);
      ctx.fillStyle = P.card;
      ctx.fill();
      ctx.restore();
      text(ctx, s.title, 108, H - 150 - h + 28, { size: 42, weight: 600, color: P.ink, maxWidth: W - 240, maxLines: 3, lh: 1.28 });
    }
  },
  cta(ctx, s, P) {
    const end = text(ctx, s.title || '', W / 2, 470, { size: 84, weight: 700, color: P.ink, maxWidth: W - 200, align: 'center', lh: 1.1, maxLines: 4 });
    if (s.body) text(ctx, s.body, W / 2, end + 24, { size: 40, color: P.muted, align: 'center', maxWidth: W - 200 });
    // ícones de curtir, comentar, salvar (salvar em destaque)
    const cy = 980;
    const xs = [W / 2 - 170, W / 2, W / 2 + 170];
    xs.forEach((x, i) => {
      ctx.beginPath();
      ctx.arc(x, cy, 66, 0, Math.PI * 2);
      ctx.fillStyle = i === 2 ? P.accent : P.card;
      ctx.fill();
      ctx.strokeStyle = P.ink;
      ctx.lineWidth = 6;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      if (i === 0) {
        ctx.moveTo(x, cy + 22);
        ctx.bezierCurveTo(x - 46, cy - 6, x - 30, cy - 40, x, cy - 18);
        ctx.bezierCurveTo(x + 30, cy - 40, x + 46, cy - 6, x, cy + 22);
      } else if (i === 1) {
        ctx.arc(x, cy - 2, 28, 0.6, Math.PI * 2 + 0.1);
        ctx.lineTo(x + 30, cy + 26);
        ctx.closePath();
      } else {
        ctx.moveTo(x - 20, cy - 30);
        ctx.lineTo(x + 20, cy - 30);
        ctx.lineTo(x + 20, cy + 30);
        ctx.lineTo(x, cy + 14);
        ctx.lineTo(x - 20, cy + 30);
        ctx.closePath();
      }
      ctx.stroke();
    });
  },
};

/**
 * Desenha uma tela.
 * opts: { palette, dark, handle, index, total, image (HTMLImageElement|ImageBitmap), preview }
 */
export function drawSlide(canvas, slide, opts = {}) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const P = { ...palette(opts.palette, opts.dark), dark: Boolean(opts.dark) };
  ctx.fillStyle = P.bg;
  ctx.fillRect(0, 0, W, H);
  (LAYOUTS[slide.layout] || LAYOUTS.notas)(ctx, slide, P, opts.image || null, Boolean(opts.preview));
  if (slide.layout !== 'foto') chrome(ctx, P, opts);
  else if ((opts.total || 1) > 1) chrome(ctx, { ...P, ink: '#FFFFFF', muted: 'rgba(255,255,255,.8)' }, { ...opts, handle: '' });
  return canvas;
}
