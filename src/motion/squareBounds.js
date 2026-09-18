const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

// Convert a screen-space movement, not a position, into the parent SVG space.
export function localDelta(matrix, x, y) {
  const determinant = matrix.a * matrix.d - matrix.b * matrix.c;
  if (Math.abs(determinant) < 0.00001) return null;
  return { x: (matrix.d * x - matrix.c * y) / determinant, y: (-matrix.b * x + matrix.a * y) / determinant };
}

export function containSquare(state, square, matrix, bounds) {
  if (!matrix || !(bounds.width > 0 && bounds.height > 0)) return;
  const angle = state.angle * Math.PI / 180;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const cx = square.x + square.size / 2 + state.x;
  const cy = square.y + square.size / 2 + state.y;
  const x = matrix.a * cx + matrix.c * cy + matrix.e;
  const y = matrix.b * cx + matrix.d * cy + matrix.f;
  // Include the widest (keyboard-focus) stroke. Both the scroll parent's
  // rotation and the dragged square's own rotation affect its screen extents.
  const half = square.size / 2 + 1.5;
  const ex = half * (Math.abs(matrix.a * cos + matrix.c * sin) + Math.abs(-matrix.a * sin + matrix.c * cos));
  const ey = half * (Math.abs(matrix.b * cos + matrix.d * sin) + Math.abs(-matrix.b * sin + matrix.d * cos));
  const fit = (centre, start, length, extent) => length < extent * 2
    ? start + length / 2 // Best fit if an unusually small stage cannot hold it.
    : clamp(centre, start + extent, start + length - extent);
  const correction = localDelta(matrix, fit(x, bounds.left, bounds.width, ex) - x, fit(y, bounds.top, bounds.height, ey) - y);
  if (correction) {
    state.x += correction.x;
    state.y += correction.y;
  }
}
