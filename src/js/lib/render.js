// Desenha as telas de carrossel/estático em canvas (1080×1350, formato 4:5 do feed).
// Mesma identidade do portfólio: Montserrat, base clara pontilhada, títulos pesados com ponto rosa,
// detalhes iOS (barra de status, Notas, Lembretes, iMessage, widgets) e cor só nos detalhes.

export const W = 1080;
export const H = 1350;
const FONT = 'Montserrat, system-ui, "Segoe UI", Roboto, Arial, sans-serif';
const font = (weight, size) => `${weight} ${size}px ${FONT}`;
// Títulos com letras mais juntas, como no portfólio (o navegador que não suporta só ignora).
function tracking(ctx, size, weight) {
  if ('letterSpacing' in ctx) ctx.letterSpacing = weight >= 700 && size >= 56 ? `${-Math.round(size * 0.04)}px` : weight >= 700 ? `${-Math.round(size * 0.015)}px` : '0px';
}

// Paleta do portfólio
export const DEFAULT_PALETTE = {
  bg: '#FAFAF9', // fundo
  card: '#FFFFFF',
  ink: '#161616',
  muted: '#6B6B6B',
  accent: '#F8E7A2', // manteiga
  accent2: '#F6E4E8', // rosa suave
  accent3: '#6B4537', // marrom
  accent4: '#D74F73', // rosa (ponto final e detalhes)
};

export function palette(p = {}, dark = false) {
  const base = { ...DEFAULT_PALETTE, ...p };
  if (!dark) return base;
  return { ...base, bg: '#161616', card: '#232323', ink: '#FAFAF9', muted: '#A3A3A0', bubbleIn: '#2C2C2C' };
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

function text(ctx, str, x, y, { size = 44, weight = 400, color, maxWidth = 900, lh = 1.3, maxLines, align = 'left', dot = null }) {
  ctx.font = font(weight, size);
  tracking(ctx, size, weight);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  const lines = wrap((s) => ctx.measureText(s).width, str, maxWidth, maxLines);
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * size * lh));
  if (dot && lines.length && !/[.!?…:;]$/.test(lines[lines.length - 1])) {
    // ponto rosa no fim do título, a assinatura do portfólio
    const last = lines[lines.length - 1];
    const lw = ctx.measureText(last).width;
    const lx = align === 'center' ? x + lw / 2 : x + lw;
    ctx.textAlign = 'left';
    ctx.fillStyle = dot;
    ctx.fillText('.', lx, y + (lines.length - 1) * size * lh);
  }
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
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
  ctx.fillStyle = P.dark ? '#2C2C2C' : '#F3F3F2';
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
  ctx.font = font(700, 30);
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
    ctx.font = font(700, 28);
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
      ctx.fillStyle = i === index ? P.accent4 : dark ? '#4A4A4A' : '#D6D6D2';
      ctx.fill();
    }
  }
}

// Rótulo como no portfólio: quadradinho manteiga com contorno rosa + texto em caixa alta.
function label(ctx, str, x, y, P, { color } = {}) {
  if (!str) return y;
  rr(ctx, x + 2, y + 6, 26, 26, 8);
  ctx.fillStyle = P.accent;
  ctx.fill();
  ctx.strokeStyle = P.accent4;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.font = font(700, 30);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '2.4px';
  ctx.fillStyle = color || (P.dark ? P.accent2 : '#B23A5C');
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(str.toUpperCase(), x + 46, y + 20);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  return y + 40;
}

function pill(ctx, label, x, y, P, { bg = P.accent, color = P.ink } = {}) {
  if (!label) return y;
  ctx.font = font(700, 28);
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
      const y = s.kicker ? label(ctx, s.kicker, 72, 900, P) + 22 : 910;
      text(ctx, s.title || (preview ? 'Título da capa' : ''), 72, y, { size: 66, weight: 800, color: s.title ? P.ink : P.muted, maxWidth: W - 144, lh: 1.05, maxLines: s.kicker ? 3 : 4, dot: s.title ? P.accent4 : null });
      return;
    }
    // detalhe: post-it manteiga inclinado no canto, como os lembretes do portfólio
    ctx.save();
    ctx.translate(W - 210, 300);
    ctx.rotate(-0.07);
    rr(ctx, -110, -90, 220, 180, 26);
    ctx.fillStyle = P.accent;
    ctx.shadowColor = 'rgba(0,0,0,.12)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 12;
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(W - 128, 214, 22, 0, Math.PI * 2);
    ctx.fillStyle = P.accent4;
    ctx.fill();
    const y = s.kicker ? label(ctx, s.kicker, 72, 440, P) : 440;
    const end = text(ctx, s.title || (preview ? 'Título da capa' : ''), 72, y + 34, { size: 104, weight: 800, color: s.title ? P.ink : P.muted, maxWidth: W - 144, lh: 1.0, maxLines: 5, dot: s.title ? P.accent4 : null });
    if (s.body) text(ctx, s.body, 72, end + 36, { size: 40, color: P.muted, maxWidth: W - 144, maxLines: 3 });
  },
  notas(ctx, s, P, img, preview) {
    // cartão de Notas como no portfólio: topo separado por linha, corpo claro
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.08)';
    ctx.shadowBlur = 50;
    ctx.shadowOffsetY = 18;
    rr(ctx, 60, 130, W - 120, 1080, 56);
    ctx.fillStyle = P.card;
    ctx.fill();
    ctx.restore();
    ctx.font = font(700, 32);
    ctx.fillStyle = P.accent4;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText('‹ Notas', 108, 200);
    const today = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
    ctx.font = font(600, 26);
    ctx.fillStyle = P.muted;
    ctx.textAlign = 'right';
    ctx.fillText(today, W - 108, 200);
    ctx.fillStyle = P.dark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.08)';
    ctx.fillRect(60, 262, W - 120, 2);
    let y = 316;
    if (s.kicker) y = label(ctx, s.kicker, 108, y, P) + 28;
    y = text(ctx, s.title || '', 108, y, { size: 64, weight: 800, color: P.ink, maxWidth: W - 216, lh: 1.06, maxLines: 3, dot: s.title ? P.accent4 : null });
    if (s.body) text(ctx, s.body, 108, y + 28, { size: 42, color: P.ink, maxWidth: W - 216, lh: 1.38, maxLines: Math.max(3, Math.floor((1150 - y) / 58)) });
    else hint(ctx, s, 108, y + 28, P, preview, W - 216);
  },
  lista(ctx, s, P, img, preview) {
    text(ctx, s.title || (preview ? 'Lista' : ''), 72, 170, { size: 78, weight: 800, color: P.ink, maxWidth: W - 144, lh: 1.02, maxLines: 2, dot: s.title ? P.accent4 : null });
    let y = 400;
    const items = (s.items || []).filter((i) => i.text || preview);
    if (!items.some((i) => i.text)) hint(ctx, s, 72, 340, P, preview);
    for (const it of items.slice(0, 8)) {
      ctx.beginPath();
      ctx.arc(102, y + 30, 26, 0, Math.PI * 2);
      if (it.done) {
        ctx.fillStyle = P.accent4;
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
      const end = text(ctx, it.text || (preview ? 'item…' : ''), 160, y + 6, { size: 42, weight: 600, color: it.done ? P.muted : P.ink, maxWidth: W - 240, maxLines: 2 });
      y = Math.max(end, y + 60) + 26;
      ctx.fillStyle = P.dark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.08)';
      ctx.fillRect(160, y - 14, W - 232, 2);
    }
  },
  imessage(ctx, s, P, img, preview) {
    ctx.beginPath();
    ctx.arc(W / 2, 190, 52, 0, Math.PI * 2);
    ctx.fillStyle = P.accent;
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = P.accent4;
    ctx.stroke();
    text(ctx, s.contact || 'Conversa', W / 2, 256, { size: 30, weight: 500, color: P.muted, align: 'center' });
    let y = 360;
    const msgs = s.messages || [];
    if (!msgs.some((m) => m.text)) hint(ctx, s, 72, 330, P, preview);
    for (const m of msgs) {
      if (!m.text && !preview) continue;
      ctx.font = font(500, 40);
      const lines = wrap((t) => ctx.measureText(t).width, m.text || '…', 640, 6);
      const w = Math.min(720, Math.max(...lines.map((l) => ctx.measureText(l).width)) + 64);
      const h = lines.length * 54 + 40;
      const x = m.me ? W - 60 - w : 60;
      rr(ctx, x, y, w, h, 44);
      ctx.fillStyle = m.me ? P.ink : P.dark ? P.bubbleIn : P.card;
      ctx.fill();
      lines.forEach((l, i) => {
        ctx.fillStyle = m.me ? (P.dark ? '#161616' : '#FFFFFF') : P.ink;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(l, x + 32, y + 22 + i * 54);
      });
      y += h + 22;
      if (y > H - 200) break;
    }
  },
  widgets(ctx, s, P, img, preview) {
    text(ctx, s.title || '', 72, 170, { size: 68, weight: 800, color: P.ink, maxWidth: W - 144, lh: 1.04, maxLines: 2, dot: s.title ? P.accent4 : null });
    const cells = (s.cells || []).slice(0, 4);
    const gw = (W - 144 - 30) / 2;
    const gh = 420;
    cells.forEach((c, i) => {
      const x = 72 + (i % 2) * (gw + 30);
      const y = 360 + Math.floor(i / 2) * (gh + 30);
      // widget como as métricas do portfólio: o primeiro em manteiga, os outros brancos
      const hl = i === 0;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.07)';
      ctx.shadowBlur = 40;
      ctx.shadowOffsetY = 14;
      rr(ctx, x, y, gw, gh, 48);
      ctx.fillStyle = hl ? P.accent : P.card;
      ctx.fill();
      ctx.restore();
      rr(ctx, x + 36, y + 36, 30, 30, 9);
      ctx.fillStyle = hl ? P.card : i % 2 ? P.accent2 : P.accent;
      ctx.fill();
      text(ctx, (c.label || '').toUpperCase(), x + 80, y + 36, { size: 26, weight: 700, color: hl ? P.accent3 : P.muted, maxWidth: gw - 110, maxLines: 1 });
      text(ctx, c.value || (preview ? '…' : ''), x + 36, y + 104, { size: 42, weight: 700, color: c.value ? (hl ? P.accent3 : P.ink) : P.muted, maxWidth: gw - 72, lh: 1.18, maxLines: 6 });
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
      ctx.font = font(700, 42);
      const lines = wrap((t) => ctx.measureText(t).width, s.title, W - 240, 3);
      const h = lines.length * 54 + 56;
      ctx.save();
      ctx.globalAlpha = 0.9;
      rr(ctx, 60, H - 150 - h, W - 120, h, 40);
      ctx.fillStyle = P.card;
      ctx.fill();
      ctx.restore();
      text(ctx, s.title, 108, H - 150 - h + 28, { size: 42, weight: 700, color: P.ink, maxWidth: W - 240, maxLines: 3, lh: 1.28 });
    }
  },
  cta(ctx, s, P) {
    const end = text(ctx, s.title || '', W / 2, 470, { size: 86, weight: 800, color: P.ink, maxWidth: W - 200, align: 'center', lh: 1.02, maxLines: 4, dot: s.title ? P.accent4 : null });
    if (s.body) text(ctx, s.body, W / 2, end + 24, { size: 40, color: P.muted, align: 'center', maxWidth: W - 200 });
    // ícones de curtir, comentar, salvar (salvar em destaque)
    const cy = 980;
    const xs = [W / 2 - 170, W / 2, W / 2 + 170];
    xs.forEach((x, i) => {
      ctx.beginPath();
      ctx.arc(x, cy, 66, 0, Math.PI * 2);
      ctx.fillStyle = i === 2 ? P.accent : P.card;
      ctx.fill();
      if (i === 2) {
        ctx.lineWidth = 6;
        ctx.strokeStyle = P.accent4;
        ctx.stroke();
      }
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
  // pontilhado discreto do fundo do portfólio
  ctx.fillStyle = P.dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.07)';
  for (let y = 27; y < H; y += 54) for (let x = 27; x < W; x += 54) ctx.fillRect(x, y, 3, 3);
  (LAYOUTS[slide.layout] || LAYOUTS.notas)(ctx, slide, P, opts.image || null, Boolean(opts.preview));
  if (slide.layout !== 'foto') chrome(ctx, P, opts);
  else if ((opts.total || 1) > 1) chrome(ctx, { ...P, ink: '#FFFFFF', muted: 'rgba(255,255,255,.8)' }, { ...opts, handle: '' });
  return canvas;
}
