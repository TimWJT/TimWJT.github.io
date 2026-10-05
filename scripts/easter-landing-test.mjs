// Regression lock for the documented reduced-motion exemption (plan T2, Q5 = Option B).
// The footer landing band is NOT gated on prefers-reduced-motion. That is a deliberate,
// written-down choice, so this suite fails if a later change silently "fixes" it.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'https://example.test/', pretendToBeVisual: true });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let hidden = false;
Object.defineProperty(document, 'hidden', { get: () => hidden, configurable: true });

// A single fake preference whose `matches` can be flipped between the two cases.
const preference = new window.EventTarget();
preference.matches = false;
let seenQueries = [];
window.matchMedia = query => { seenQueries.push(query); return preference; };

// Deterministic clock: the band divides scroll deltas by elapsed time, so speed
// and therefore impact strength only mean something if time is ours.
let clock = 0;
Object.defineProperty(window.performance, 'now', { value: () => clock, configurable: true });

// Deterministic frames: queue callbacks ourselves and flush them with chosen timestamps.
let pending = 0;
let nextId = 0;
const queue = new Map();
window.requestAnimationFrame = callback => { const id = ++nextId; queue.set(id, callback); pending++; return id; };
window.cancelAnimationFrame = id => { if (queue.delete(id)) pending--; };
const flush = (start, frames) => {
  for (let i = 0; i < frames; i++) {
    const due = [...queue.entries()];
    queue.clear(); pending -= due.length;
    assert.ok(due.length > 0, 'A frame was queued when the suite expected one');
    for (const [, callback] of due) callback(start + i * 16);
  }
};

// A page tall enough to scroll, and a real scroll position we can drive.
const PAGE = 3000;
let scrollY = 0;
Object.defineProperty(window, 'scrollY', { get: () => scrollY, configurable: true });
Object.defineProperty(document.documentElement, 'scrollHeight', { get: () => PAGE, configurable: true });
Object.defineProperty(window, 'innerHeight', { get: () => 768, configurable: true });
const atBottom = () => { scrollY = PAGE - window.innerHeight; window.dispatchEvent(new window.Event('scroll')); };
// Land hard: three fast downward steps with no elapsed time between them.
const hardDropToBottom = () => {
  for (let i = 1; i <= 3; i++) { clock += 16; scrollY = Math.round((PAGE - window.innerHeight) * i / 3); window.dispatchEvent(new window.Event('scroll')); }
};

const { default: React, act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { default: FooterLanding, landingStrength } = await import('../src/motion/FooterLanding.jsx');
// Track exact listener identities, including StrictMode's setup/cleanup cycle.
const registrations = [];
for (const target of [window, document, preference]) {
  const add = target.addEventListener.bind(target);
  const remove = target.removeEventListener.bind(target);
  target.addEventListener = (type, listener, options) => {
    if (['scroll', 'resize', 'visibilitychange', 'change'].includes(type)) {
      registrations.push({ target, type, listener, removed: false });
    }
    return add(type, listener, options);
  };
  target.removeEventListener = (type, listener, options) => {
    const entry = registrations.find(item => !item.removed && item.target === target && item.type === type && item.listener === listener);
    if (entry) entry.removed = true;
    return remove(type, listener, options);
  };
}

const root = createRoot(document.getElementById('root'));
await act(async () => root.render(React.createElement(React.StrictMode, null, React.createElement(FooterLanding))));
const band = document.querySelector('.footer-landing');
const tiles = [...document.querySelectorAll('.landing-tile')];
assert.ok(band && tiles.length === 12, 'The band renders twelve tiles');
assert.equal(band.getAttribute('aria-hidden'), 'true', 'The band is decorative');
assert.equal(pending, 0, 'Idle and settled states request no frames');
assert.equal(band.dataset.strength, undefined, 'Nothing has landed yet');

for (const reduced of [true, false]) {
  preference.matches = reduced;
  clock += 16; hardDropToBottom();
  assert.ok(Number(band.dataset.impacts) >= 1, `An impact is recorded with reduced motion ${reduced}`);
  assert.ok(Number(band.dataset.strength) > 0, `The impact has strength with reduced motion ${reduced}`);
  assert.ok(pending > 0, `A frame is scheduled after a hard arrival with reduced motion ${reduced}`);
  const start = clock + 100;
  flush(start, 4);
  assert.ok(tiles.some(tile => tile.style.transform.startsWith('scaleY(')), `Tiles dip with reduced motion ${reduced}`);
  assert.ok(pending > 0, 'The rebound keeps requesting frames while the impact plays out');
  // Let the whole 1.1 second impact expire; the band must return to rest on its own.
  let time = start + 4 * 16;
  while (pending > 0 && time < start + 2000) { time += 16; const due = [...queue.values()]; queue.clear(); pending -= due.length; for (const callback of due) callback(time); }
  assert.equal(pending, 0, 'The impact ends by itself and leaves no frame outstanding');
  assert.equal(tiles.some(tile => tile.style.transform !== ''), false, 'Tile transforms are cleared once the impact settles');
  // Scroll back up and re-arm, so the next case starts from a clean page.
  clock += 16; scrollY = 0; window.dispatchEvent(new window.Event('scroll'));
  clock += 16; atBottom(); hardDropToBottom();
  assert.ok(Number(band.dataset.impacts) >= 2, 'A second hard arrival lands too');
  clock += 16; scrollY = 0; window.dispatchEvent(new window.Event('scroll'));
  pending = 0; queue.clear();
  band.removeAttribute('data-impacts'); band.removeAttribute('data-strength');
}

// A resize and a visibility change both re-arm the band instead of leaving it stuck.
atBottom();
assert.ok(Number(band.dataset.impacts) >= 1, 'Landing straight from the top still triggers');
clock += 16; window.dispatchEvent(new window.Event('resize'));
clock += 16; hidden = true; document.dispatchEvent(new window.Event('visibilitychange')); hidden = false;

assert.equal(seenQueries.length, 0, 'The band never asks the browser about motion preferences');
assert.equal(registrations.filter(item => item.target === preference).length, 0, 'No motion-preference listeners are installed');
assert.ok(registrations.filter(item => item.type === 'scroll').length > 0, 'The band listens for scroll');
assert.ok(registrations.filter(item => item.type === 'resize').length > 0, 'The band listens for resize');
assert.ok(registrations.filter(item => item.type === 'visibilitychange').length > 0, 'The band listens for visibility change');

// A hard arrival followed immediately by unmount must cancel the pending frame.
clock += 16; scrollY = 0; window.dispatchEvent(new window.Event('scroll'));
clock += 16; hardDropToBottom();
assert.ok(pending > 0, 'A frame is outstanding at unmount time');
const outstanding = pending;
await act(async () => root.unmount());
assert.equal(pending, 0, 'Unmount cancels the pending frame');
assert.ok(outstanding > 0, 'The cancelled frame was real');
assert.ok(registrations.every(item => item.removed), 'Every scroll, resize and visibility listener removed, including Strict Mode replay');
document.dispatchEvent(new window.Event('visibilitychange'));
window.dispatchEvent(new window.Event('resize'));
window.dispatchEvent(new window.Event('scroll'));
assert.equal(pending, 0, 'An unmounted band cannot schedule or keep frames');

// Source-text guards: the exemption is "no reduced-motion check at all", so a stray
// matchMedia query or gate added later must fail here even if the behaviour looks fine.
const source = readFileSync(new URL('../src/motion/FooterLanding.jsx', import.meta.url), 'utf8');
assert.doesNotMatch(source, /matchMedia/, 'The exemption means the component never consults the motion preference');
assert.doesNotMatch(source, /prefers-reduced-motion/, 'No reduced-motion query is hidden in the source either');
assert.doesNotMatch(source, /\bsetTimeout\s*\(|setInterval\s*\(/, 'The band uses animation frames only, never JS timers');
assert.match(source, /export const landingStrength/, 'The documented landingStrength contract is still exported');
assert.equal(typeof landingStrength(0), 'number');

dom.window.close();
console.log('PASS: footer landing band animates under both motion preferences, as the documented exemption requires; no preference query, listeners and pending frame cleaned up on unmount.');
