// Circle against a convex, clockwise polygon in screen coordinates.
export function circlePolygonContact(center, radius, vertices) {
  let inside = true;
  let nearest = null;
  let distanceSquared = Infinity;
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const lengthSquared = ex * ex + ey * ey;
    if (lengthSquared < 0.0001) continue;
    const cross = ex * (center.y - a.y) - ey * (center.x - a.x);
    if (cross < 0) inside = false;
    const t = Math.max(0, Math.min(1, ((center.x - a.x) * ex + (center.y - a.y) * ey) / lengthSquared));
    const point = { x: a.x + t * ex, y: a.y + t * ey };
    const squared = (center.x - point.x) ** 2 + (center.y - point.y) ** 2;
    if (squared < distanceSquared) {
      distanceSquared = squared;
      const length = Math.sqrt(lengthSquared);
      nearest = { point, nx: ey / length, ny: -ex / length };
    }
  }
  if (!nearest || (!inside && distanceSquared >= radius * radius)) return null;
  const distance = Math.sqrt(distanceSquared);
  if (!inside && distance > 0.001) {
    nearest.nx = (center.x - nearest.point.x) / distance;
    nearest.ny = (center.y - nearest.point.y) / distance;
  }
  return { ...nearest, depth: inside ? radius + distance : radius - distance };
}

export function resolveTopBlock(state, block) {
  const center = { x: state.x + Math.sin(state.tilt) * 14, y: state.y - 22 };
  const contact = circlePolygonContact(center, 22, block.vertices);
  if (!contact) return false;
  const { nx, ny, point, depth } = contact;
  state.x += nx * (depth + 0.05);
  state.y += ny * (depth + 0.05);
  const blockVX = block.vx - block.omega * (point.y - block.cy);
  const blockVY = block.vy + block.omega * (point.x - block.cx);
  const speed = (state.vx - blockVX) * nx + (state.vy - blockVY) * ny;
  if (speed < 0) {
    const bounce = speed < -45 ? 0.65 : 0;
    const impulse = -(1 + bounce) * speed / (1 + block.inverseMass);
    state.vx += impulse * nx;
    state.vy += impulse * ny;
    state.leanVelocity += Math.max(-3.8, Math.min(3.8, (nx + ny * state.fallSide * 0.6) * impulse * 0.012));
    if (speed < -45) {
      state.energy = Math.min(1.8, state.energy + Math.min(0.16, -speed * 0.0003));
      state.collisions++;
      block.impulse(-impulse * nx, -impulse * ny, point);
    }
  }
  if (ny < -0.5 && Math.abs(speed) < 45) {
    state.grounded = true;
    state.vy = Math.min(0, blockVY);
  }
  return true;
}
