import {
  PEEL_COLS,
  PEEL_GRAIN_FILL,
  PEEL_GRAIN_STEP,
  PEEL_REVEAL_ANIM_MS,
  PEEL_REVEAL_RADIUS_END,
  PEEL_REVEAL_SIZE_START,
} from '../data/peel';

const maskUrlByLayer = new WeakMap();
const maskTicketByLayer = new WeakMap();

/** 4×4 Bayer matrix for ordered, pixel-like dithering */
const BAYER_4X4 = new Uint8Array([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]);

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function paintGrainCell(ctx, x, y, w, h, radius, progress, color, grainStep) {
  const step = Math.max(2, Math.round(grainStep));
  const fillRatio = progress >= 1 ? PEEL_GRAIN_FILL : progress;
  const dot = Math.max(1, step - 1);

  ctx.save();
  roundRect(ctx, x, y, w, h, radius);
  ctx.clip();
  ctx.fillStyle = color;

  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.ceil(x + w);
  const y1 = Math.ceil(y + h);

  for (let py = y0; py < y1; py += step) {
    const by = Math.floor(py / step) & 3;
    for (let px = x0; px < x1; px += step) {
      const bx = Math.floor(px / step) & 3;
      const threshold = BAYER_4X4[by * 4 + bx] / 16;
      if (fillRatio > threshold) {
        ctx.fillRect(px, py, dot, dot);
      }
    }
  }

  ctx.restore();
}

export function cellRevealProgress(startTime, now = performance.now()) {
  if (!startTime) return 1;
  return Math.min(1, (now - startTime) / PEEL_REVEAL_ANIM_MS);
}

export function paintPeelMasks({
  coverCanvas,
  revealCanvas,
  width,
  height,
  rowCount,
  revealed,
  animStartTimes,
  now = performance.now(),
}) {
  if (width < 1 || height < 1 || rowCount <= 0) return false;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const pw = Math.floor(width * dpr);
  const ph = Math.floor(height * dpr);
  const cellW = (width / PEEL_COLS) * dpr;
  const cellH = (height / rowCount) * dpr;
  const endRadius = PEEL_REVEAL_RADIUS_END * dpr;
  const grainStep = PEEL_GRAIN_STEP * dpr;

  let stillAnimating = false;

  const paint = (canvas, peeledFill, baseFill) => {
    if (!canvas) return;
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw;
      canvas.height = ph;
    }
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = baseFill;
    ctx.fillRect(0, 0, pw, ph);
    if (revealed.size === 0) return;

    revealed.forEach((index) => {
      const col = index % PEEL_COLS;
      const row = Math.floor(index / PEEL_COLS);
      const startTime = animStartTimes.get(index);
      const progress = cellRevealProgress(startTime, now);
      if (startTime && progress >= 1) animStartTimes.delete(index);
      if (progress < 1) stillAnimating = true;

      const fullSize = cellW;
      const size =
        fullSize * (PEEL_REVEAL_SIZE_START + (1 - PEEL_REVEAL_SIZE_START) * progress);
      const inset = (fullSize - size) / 2;
      const x = col * cellW + inset;
      const y = row * cellH + inset;
      const radius = progress < 1 ? size / 2 : endRadius;

      paintGrainCell(ctx, x, y, size, size, radius, progress, peeledFill, grainStep);
    });
  };

  paint(coverCanvas, '#000', '#fff');
  paint(revealCanvas, '#fff', '#000');

  return stillAnimating;
}

function setMaskUrl(layer, url) {
  const prev = maskUrlByLayer.get(layer);
  if (prev) URL.revokeObjectURL(prev);
  maskUrlByLayer.set(layer, url);
  layer.style.maskImage = `url("${url}")`;
  layer.style.webkitMaskImage = `url("${url}")`;
  layer.style.maskSize = '100% 100%';
  layer.style.webkitMaskSize = '100% 100%';
  layer.style.maskRepeat = 'no-repeat';
  layer.style.webkitMaskRepeat = 'no-repeat';
}

export function applyMaskToLayer(layer, canvas) {
  if (!layer || !canvas) return;

  const ticket = (maskTicketByLayer.get(layer) ?? 0) + 1;
  maskTicketByLayer.set(layer, ticket);

  canvas.toBlob((blob) => {
    if (!blob || maskTicketByLayer.get(layer) !== ticket) return;
    setMaskUrl(layer, URL.createObjectURL(blob));
  }, 'image/png');
}

export function releaseMaskLayer(layer) {
  if (!layer) return;
  const prev = maskUrlByLayer.get(layer);
  if (prev) URL.revokeObjectURL(prev);
  maskUrlByLayer.delete(layer);
  maskTicketByLayer.delete(layer);
}
