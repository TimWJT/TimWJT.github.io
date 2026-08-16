export const PEEL_COLS = 16;
export const PEEL_RADIUS = 3;
export const PEEL_REVEAL_SIZE_START = 0.12;
export const PEEL_REVEAL_RADIUS_END = 3;
export const PEEL_REVEAL_ANIM_MS = 900;
export const PEEL_REVEAL_MS = 2500;
/** Dot spacing for the pixelated peel grain (CSS px) */
export const PEEL_GRAIN_STEP = 4;
/** How much of each peeled cell stays dotted at full reveal (0–1, lower = more holes) */
export const PEEL_GRAIN_FILL = 0.84;
/** How many cell-widths the organic reveal brush spans */
export const PEEL_BRUSH_CELL_MULTIPLIER = 2.4;

/**
 * Organic reveal footprint — elliptical with angle-wobbled radius (not a plain circle).
 */
export function isInsidePeelBrush(dx, dy, brushRadius) {
  const ellipseX = brushRadius * 1.22;
  const ellipseY = brushRadius * 0.76;
  const angle = Math.atan2(dy, dx);
  const wobble =
    0.2 * Math.sin(angle * 2.4 + 0.55) +
    0.14 * Math.cos(angle * 3.9 - 1.1) +
    0.09 * Math.sin(angle * 6.2 + 1.35);
  const scale = 0.84 + wobble;
  const nx = dx / (ellipseX * scale);
  const ny = dy / (ellipseY * scale);
  return nx * nx + ny * ny <= 1;
}

export function getPeelBrushCellIndices(clientX, clientY, gridRect, cellSize, rowCount) {
  if (!gridRect || cellSize <= 0 || rowCount <= 0) return [];

  const px = clientX - gridRect.left;
  const py = clientY - gridRect.top;
  const brushRadius = cellSize * PEEL_BRUSH_CELL_MULTIPLIER;
  const reach = brushRadius * 1.35;

  const colMin = Math.max(0, Math.floor((px - reach) / cellSize));
  const colMax = Math.min(PEEL_COLS - 1, Math.floor((px + reach) / cellSize));
  const rowMin = Math.max(0, Math.floor((py - reach) / cellSize));
  const rowMax = Math.min(rowCount - 1, Math.floor((py + reach) / cellSize));

  const indices = [];
  for (let row = rowMin; row <= rowMax; row++) {
    for (let col = colMin; col <= colMax; col++) {
      const cx = (col + 0.5) * cellSize;
      const cy = (row + 0.5) * cellSize;
      if (isInsidePeelBrush(px - cx, py - cy, brushRadius)) {
        indices.push(row * PEEL_COLS + col);
      }
    }
  }
  return indices;
}
