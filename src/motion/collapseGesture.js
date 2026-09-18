// Wheel deltas are CSS pixels (line = 16px, page = viewport height).
// Wheel events do not identify physical gestures. A pause OR a sustained
// slowdown followed by renewed acceleration separates efforts. A decaying
// momentum tail, or steady wheel rotation, can qualify only once.
export const COLLAPSE_GESTURE = Object.freeze({
  windowMs: 5000,
  burstGapMs: 240,
  impulseMs: 320,
  effortGapMs: 240,
  slowdownMs: 48,
  reboundMs: 80,
  bursts: 3,
  wheelDistance: 50,
  wheelPeak: 4,
  wheelSpeed: 0.2, // pixels/ms, measured over a rolling 320ms window
  touchDistance: 50,
  touchPeak: 4,
  touchSpeed: 0.2,
});

export function wheelPixels(event, pageHeight) {
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? pageHeight : 1;
  return { x: (event.deltaX || 0) * unit, y: event.deltaY * unit };
}

export function createCollapseGesture() {
  let hits = [];
  let burst = null;
  let collapsed = false;
  // Each counted hit must be followed by upward scrolling before the next
  // one counts, so pushing against the bottom of the page cannot stomp.
  let armed = true;
  const reset = () => { hits = []; burst = null; collapsed = false; armed = true; };
  const start = (kind, time, samples = []) => ({
    kind, start: time, last: time, peak: 0, lowSince: null,
    valley: Infinity, rebound: null, counted: false, emitted: false, samples,
  });
  return {
    reset,
    // Scrolling back up rebuilds a fallen page and starts a fresh cycle, but
    // before the stomp it only ends the current effort: hits are remembered.
    release() { burst = null; armed = true; if (collapsed) { hits = []; collapsed = false; } },
    // Finger contact is an explicit boundary; one long drag counts only once.
    beginTouch() { burst = null; },
    // Keyboard activation shares the same fallen state. Consume any current
    // effort so its momentum cannot immediately replay the keyboard stomp.
    markCollapsed() { collapsed = true; if (burst) burst.emitted = true; },
    get collapsed() { return collapsed; },
    get count() { return hits.length; },
    push(delta, time, kind = 'wheel') {
      if (!Number.isFinite(delta) || !Number.isFinite(time) || delta === 0) return null;
      if (delta < 0) { this.release(); return 'reset'; }
      const c = COLLAPSE_GESTURE;
      const touch = kind === 'touch';
      hits = hits.filter(hit => time - hit <= c.windowMs);
      if (!burst || burst.kind !== kind || time < burst.last || (!touch && time - burst.last >= c.burstGapMs)) {
        burst = start(kind, time);
      } else if (!touch) {
        // Arm only after a meaningful dip. Two rising samples confirm a new
        // effort, so a single noisy event cannot split an inertia tail.
        const renewed = burst.lowSince !== null
          && time - burst.lowSince >= c.slowdownMs
          && time - burst.start >= c.effortGapMs
          && delta >= burst.valley * 1.8
          && delta - burst.valley >= Math.max(8, burst.peak * 0.2);
        if (renewed) {
          const rebound = burst.rebound;
          if (rebound && time - rebound.time <= c.reboundMs) {
            burst = start(kind, rebound.time, [rebound]);
          } else {
            burst.rebound = { delta, time };
          }
        } else {
          burst.rebound = null;
          if (delta <= burst.peak * 0.55) {
            burst.lowSince ??= time;
            burst.valley = Math.min(burst.valley, delta);
          } else {
            burst.lowSince = null;
            burst.valley = Infinity;
          }
        }
      }
      burst.last = time;
      burst.peak = Math.max(burst.peak, delta);
      if (burst.emitted) return null;
      // A slow ramp may become a hard effort later. Expire old samples rather
      // than permanently rejecting everything after the first small event.
      burst.samples = burst.samples.filter(sample => time - sample.time <= c.impulseMs);
      burst.samples.push({ delta, time });
      if (burst.counted || (!collapsed && !armed)) return null;
      let peak = 0;
      let qualifies = false;
      // Consider shorter windows too: a gentle lead-in must not dilute the
      // actual flick's speed. All windows still need the full hard distance.
      for (let i = burst.samples.length - 1; i >= 0; i--) {
        const sample = burst.samples[i];
        const distance = burst.samples.slice(i).reduce((sum, s) => sum + s.delta, 0);
        peak = Math.max(peak, sample.delta);
        const duration = Math.max(16, time - sample.time);
        if (distance >= (touch ? c.touchDistance : c.wheelDistance)
          && peak >= (touch ? c.touchPeak : c.wheelPeak)
          && distance / duration >= (touch ? c.touchSpeed : c.wheelSpeed)) {
          qualifies = true;
          break;
        }
      }
      if (!qualifies) return null;
      burst.counted = true;
      // Already down: a fresh qualifying effort restomps the fallen pieces,
      // keeping the no-accumulation contract (no hits history is kept).
      if (collapsed) { burst.emitted = true; burst.samples = []; return 'collapse'; }
      hits.push(time);
      armed = false;
      if (hits.length < c.bursts) return null;
      collapsed = true;
      burst.emitted = true;
      burst.samples = [];
      return 'collapse';
    },
  };
}
