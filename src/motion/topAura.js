import { totalSpinSpeed } from './topPhysics';

export const AURA_SPEED_THRESHOLD = 55;
export const auraPower = state => Math.log1p(Math.max(0, totalSpinSpeed(state) - AURA_SPEED_THRESHOLD) / 14);

// A continuous golden flame, drawn with a fixed canvas resolution at every power level.
export function paintAura(canvas, state, bounds) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  if (canvas.width !== 480 * ratio || canvas.height !== 480 * ratio) {
    canvas.width = 480 * ratio;
    canvas.height = 480 * ratio;
  }
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, 480, 480);
  const power = auraPower(state);
  if (power <= 0) return;
  const time = window.performance.now() / 1000;
  const size = 120 + power * 95;
  // Only allocate the visible hero area, even when the logical flame grows huge.
  const left = Math.max(0, bounds.left);
  const top = Math.max(0, bounds.top);
  const width = Math.min(window.innerWidth, bounds.right ?? bounds.left + bounds.width) - left;
  const height = Math.min(window.innerHeight, bounds.bottom ?? bounds.top + bounds.height) - top;
  if (width <= 0 || height <= 0 || !Number.isFinite(size)) return;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.style.left = `${left - (bounds.left + state.x - 43)}px`;
  canvas.style.top = `${top - (bounds.top + state.y - 60)}px`;
  const heat = 1 - Math.exp(-power * 1.5);
  const x = 240;
  const floor = 480 * 0.86;
  ctx.save();
  ctx.setTransform(480 * ratio / width, 0, 0, 480 * ratio / height, 0, 0);
  ctx.translate(bounds.left + state.x - left - size / 2, bounds.top + state.y - top - size * 0.86);
  ctx.scale(size / 480, size / 480);
  // Amber edges supply contrast on the pale page; the center burns yellow-gold.
  const halo = ctx.createRadialGradient(x, 305, 15, x, 285, 190);
  halo.addColorStop(0, `rgba(255, 193, 0, ${heat * 0.65})`);
  halo.addColorStop(0.55, `rgba(237, 142, 0, ${heat * 0.28})`);
  halo.addColorStop(1, 'rgba(218, 108, 0, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, 480, 480);
  for (let layer = 0; layer < 3; layer++) {
    const scale = 1 - layer * 0.2;
    ctx.beginPath();
    for (let i = 0; i <= 80; i++) {
      const angle = i / 80 * Math.PI * 2;
      const upward = Math.max(0, -Math.sin(angle));
      const ripple = (Math.sin(angle * 7 + time * 2.4 + layer) + Math.sin(angle * 11 - time * 3) * 0.4) * 0.055;
      const width = (82 + ripple * 90) * scale;
      const height = (85 + upward * (95 + ripple * 350)) * scale;
      const px = x + Math.cos(angle) * width * (1 - upward * 0.35);
      const py = floor - 75 * scale + Math.sin(angle) * height;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    const gold = ctx.createLinearGradient(0, 100, 0, floor);
    gold.addColorStop(0, `rgba(255, 225, 55, ${heat * 0.35})`);
    gold.addColorStop(0.55, layer === 0 ? `rgba(226, 124, 0, ${heat * 0.75})` : `rgba(255, 207, 12, ${heat * 0.85})`);
    gold.addColorStop(1, `rgba(255, 233, 91, ${heat * 0.55})`);
    ctx.fillStyle = gold;
    ctx.fill();
    ctx.strokeStyle = `rgba(202, 112, 0, ${heat * (layer === 0 ? 0.65 : 0.18)})`;
    ctx.lineWidth = layer === 0 ? 2.5 : 1;
    ctx.stroke();
  }
  ctx.restore();
}
