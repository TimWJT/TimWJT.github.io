// The artwork owns its springs; the top reads transformed colliders and applies impulses.
const blocks = new Map();
const listeners = new Set();

export function registerBlock(key, block) {
  blocks.set(key, block);
  return () => blocks.delete(key);
}

export function sampleBlocks(origin) {
  return [...blocks.values()].flatMap(block => {
    const sample = block.sample();
    if (!sample) return [];
    return [{
      ...sample,
      cx: sample.cx - origin.left,
      cy: sample.cy - origin.top,
      vertices: sample.vertices.map(point => ({ x: point.x - origin.left, y: point.y - origin.top })),
      impulse: (x, y, point) => block.impulse(x, y, { x: point.x + origin.left, y: point.y + origin.top }),
    }];
  });
}

export function notifyBlockMotion() {
  listeners.forEach(listener => listener());
}

export function onBlockMotion(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
