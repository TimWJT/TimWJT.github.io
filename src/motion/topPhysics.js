import { resolveTopBlock } from './blockCollision';

export const RESTING_TILT = 41 * Math.PI / 180;
const MAX_TILT = 60 * Math.PI / 180;
export const SWIPE_COAST_DELAY = 1;
export const totalSpinSpeed = state => Math.max(0, state.energy || 0) * 22 + Math.max(0, state.swipeSpin || 0);

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const sign = random => random() < 0.5 ? -1 : 1;

export function createDockState() {
  return { angle: 0.4, tilt: 0, leanVelocity: 0, charge: 0, side: 1, energy: 0 };
}

export function pokeDock(state, random = Math.random) {
  if (state.charge < 0.1) state.side = sign(random);
  state.charge += 1;
  state.leanVelocity += state.side * (2.2 + state.charge * 0.45);
  return state.charge >= 3.4;
}

export function advanceDock(state, elapsed) {
  const dt = clamp(elapsed, 0, 1 / 30);
  state.charge = Math.max(0, state.charge - dt * 0.85);
  state.leanVelocity += -state.tilt * 48 * dt;
  state.leanVelocity *= Math.exp(-5.5 * dt);
  state.tilt += state.leanVelocity * dt;
  if (Math.abs(state.tilt) + Math.abs(state.leanVelocity) < 0.008) {
    state.tilt = state.leanVelocity = state.charge = 0;
    return false;
  }
  return true;
}

export function createFlight(bounds, origin, side, random = Math.random) {
  const floor = bounds.height - 12;
  const x = clamp(origin.x, 45, Math.max(45, bounds.width - 45));
  const target = bounds.width * (0.22 + random() * 0.56);
  const lift = 200 + random() * 110;
  const flightTime = (lift + Math.sqrt(lift * lift + 1800 * Math.max(40, floor - origin.y))) / 900;
  return {
    x, y: origin.y, vx: (target - x) / flightTime, vy: -lift,
    angle: random() * Math.PI * 2, tilt: side * 0.9, leanVelocity: side * 2,
    energy: 1.2 + random() * 0.6, spinDirection: sign(random),
    fallSide: sign(random), phase: random() * Math.PI * 2,
    restitution: 0.38 + random() * 0.2, grounded: false, collisions: 0,
  };
}

export function advanceFlight(state, elapsed, bounds, blocks = []) {
  // Swipe spin adds gyroscopic balance without applying a translational impulse.
  const spinDt = Math.min(elapsed, 0.06);
  const hold = state.swipeHold || 0;
  state.swipeHold = Math.max(0, hold - spinDt);
  state.spinOffset = ((state.spinOffset || 0) + (state.swipeSpin || 0) * state.spinDirection * spinDt) % (Math.PI * 2);
  state.swipeSpin = (state.swipeSpin || 0) * Math.exp(-0.24 * Math.max(0, spinDt - hold));
  if (state.swipeSpin < 0.02) state.swipeSpin = 0;
  // Bounded substeps keep collisions stable after a delayed frame.
  const steps = Math.max(1, Math.ceil(Math.min(elapsed, 0.06) * 120));
  const dt = Math.min(elapsed, 0.06) / steps;
  const left = Math.min(45, bounds.width / 2);
  const right = Math.max(left, bounds.width - 45);
  const floor = Math.max(60, bounds.height - 12);
  for (let i = 0; i < steps; i++) {
    const energyLoss = Math.min(state.energy, dt * (state.grounded ? 0.13 : 0.06));
    state.energy -= energyLoss;
    if (hold > i * dt) state.swipeSpin += energyLoss * 22;
    state.angle += state.energy * 22 * state.spinDirection * dt;
    if (state.grounded) state.vx += Math.cos(state.angle * 0.23 + state.phase) * state.energy * 12 * dt;
    state.vx *= Math.exp(-(state.grounded ? 0.24 : 0.04) * dt);
    state.vy += 900 * dt;
    state.x += state.vx * dt;
    state.y += state.vy * dt;
    state.grounded = false;
    if (Number.isFinite(bounds.ceiling) && state.y < bounds.ceiling) {
      state.y = bounds.ceiling;
      state.vy = Math.abs(state.vy) * 0.55;
    }
    if (state.x < left || state.x > right) {
      const wall = state.x < left ? 1 : -1;
      state.x = clamp(state.x, left, right);
      state.vx = wall * Math.abs(state.vx) * 0.7;
      state.leanVelocity += wall * Math.min(3.8, Math.abs(state.vx) * 0.02);
      state.fallSide = wall;
      state.energy *= 0.94;
      state.collisions++;
    }
    if (state.y >= floor) {
      state.y = floor;
      if (state.vy > 65) {
        const impactSpeed = state.vy;
        state.vy *= -state.restitution;
        state.vx += state.spinDirection * state.energy * 24;
        state.leanVelocity += state.fallSide * Math.min(4.8, impactSpeed * 0.012);
        state.grounded = false;
        state.collisions++;
      } else {
        state.vy = 0;
        state.grounded = true;
      }
    }
    blocks.forEach(block => resolveTopBlock(state, block));
    // A block moving into a wall cannot eject the toy from its play area.
    state.x = clamp(state.x, left, right);
    state.y = Math.min(state.y, floor);
    const balance = clamp(state.energy / 0.4 + state.swipeSpin / 4, 0, 1);
    const wobble = Math.sin(state.angle * 0.45 + state.phase) * (1 - balance) * balance * 0.6;
    const targetTilt = state.fallSide * (1 - balance) ** 2 * RESTING_TILT + wobble;
    state.leanVelocity += (targetTilt - state.tilt) * 38 * dt;
    state.leanVelocity *= Math.exp(-6 * dt);
    state.tilt += state.leanVelocity * dt;
    if (Math.abs(state.tilt) > MAX_TILT) {
      state.tilt = Math.sign(state.tilt) * MAX_TILT;
      if (state.leanVelocity * state.tilt > 0) state.leanVelocity = 0;
    }
    if (state.energy === 0 && state.grounded) state.vx *= Math.exp(-4 * dt);
  }
  const moving = state.swipeSpin > 0 || state.energy > 0 || !state.grounded || Math.abs(state.vx) > 0.1 || Math.abs(state.leanVelocity) > 0.005;
  if (!moving) state.vx = state.leanVelocity = 0;
  return moving;
}

export function swipeFlight(state, speed) {
  if (!Number.isFinite(speed) || speed <= 0) return;
  // Overflow guard only; there is no reachable gameplay speed cap.
  state.swipeSpin = Math.min(Number.MAX_VALUE / 4, (state.swipeSpin || 0) + Math.min(3.6, speed * 0.0018));
  state.swipeHold = SWIPE_COAST_DELAY;
}

export function nudgeFlight(state, hit = { x: 0, y: 0 }) {
  const length = Math.hypot(hit.x, hit.y);
  const nx = length > 3 ? -hit.x / length : 0;
  const ny = length > 3 ? -hit.y / length : -1;
  state.energy = Math.min(1.8, state.energy + 0.7);
  state.vx = clamp(state.vx * 0.15 + nx * 540, -600, 600);
  state.vy = state.vy * 0.1 + ny * 720;
  if (Math.abs(ny) < 0.35) state.vy -= 440;
  if (state.grounded && state.vy > -220) state.vy = -220;
  if (Math.abs(nx) > 0.1) {
    state.spinDirection = nx > 0 ? 1 : -1;
    state.fallSide = state.spinDirection;
  }
  state.leanVelocity += (Math.abs(nx) > 0.1 ? Math.sign(nx) : state.fallSide) * 2.4;
  state.grounded = false;
}
