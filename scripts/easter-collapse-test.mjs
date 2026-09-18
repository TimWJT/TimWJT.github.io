import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { COLLAPSE_GESTURE as C, createCollapseGesture, wheelPixels } from '../src/motion/collapseGesture.js';

// Each hit must be preceded by upward scrolling, so every hard burst scrolls up first.
const hard = (gesture, time) => {
  gesture.push(-1, time - 1);
  return [0, 40, 80].map(offset => gesture.push(100, time + offset)).find(Boolean) ?? null;
};
let gesture = createCollapseGesture();
assert.equal(hard(gesture, 0), null);
assert.equal(hard(gesture, 700), null);
assert.equal(hard(gesture, 1400), 'collapse', 'Three distinct hard bursts activate');
assert.equal(gesture.push(1000, 2200), 'collapse', 'A fresh hard stomp while fallen restomps the pieces');
assert.equal(gesture.count, 3, 'Restomps do not accumulate extra history');
assert.equal(gesture.push(-1, 2250), 'reset');
assert.equal(gesture.collapsed, false, 'Any upward input rebuilds');
assert.equal(gesture.count, 0, 'Rebuild clears the rolling history');
assert.equal(hard(gesture, 3000), null, 'A new cycle requires three fresh bursts');

// Pushing against the bottom without scrolling back up only counts once.
gesture = createCollapseGesture();
for (const start of [0, 700, 1400, 2100]) [0, 40, 80].forEach(offset => gesture.push(100, start + offset));
assert.equal(gesture.count, 1, 'Repeated downward bursts without scrolling up count once');
assert.equal(gesture.collapsed, false);
gesture.push(-1, 2500);
assert.equal(hard(gesture, 2600), null, 'Scrolling up re-arms the next hit');
assert.equal(gesture.count, 2);

// Scrolling back up between swipes keeps the count within the window.
gesture = createCollapseGesture();
assert.equal(hard(gesture, 0), null);
assert.equal(gesture.push(-50, 500), 'reset');
assert.equal(hard(gesture, 2000), null);
assert.equal(gesture.push(-50, 2500), 'reset');
assert.equal(gesture.count, 2, 'Upward scrolling before the stomp does not clear swipes');
assert.equal(hard(gesture, 4000), 'collapse', 'Swipes separated by upward scrolling still add up');

gesture = createCollapseGesture();
for (const time of [0, 700, 1400]) {
  for (let i = 0; i < 12; i++) assert.equal(gesture.push(4, time + i * 16), null);
}
assert.equal(gesture.count, 0, 'Gentle events cannot add up to hard input');
gesture = createCollapseGesture();
for (let time = 0; time < 4500; time += 16) gesture.push(Math.max(1, 38 - time / 40), time);
assert.equal(gesture.count, 1, 'Hundreds of inertial wheel events remain one burst');
assert.equal(gesture.collapsed, false);
gesture = createCollapseGesture();
hard(gesture, 0);
hard(gesture, 2000);
assert.equal(hard(gesture, C.windowMs + 100), null, 'Expired first burst cannot complete the sequence');
assert.equal(gesture.count, 2);
assert.equal(hard(gesture, C.windowMs + 700), 'collapse', 'Rolling window, not a fixed timer, accepts later three');
gesture = createCollapseGesture();
hard(gesture, 0);
hard(gesture, 2000);
assert.equal(hard(gesture, C.windowMs), 'collapse', 'Exactly five seconds is included');
// Small deltas are normal on trackpads: speed and distance qualify an effort.
const feed = (g, values, start, step = 16) => values.map((value, i) => g.push(value, start + i * step)).at(-1);
for (const values of [
  Array(9).fill(18),
  [1, 2, 3, 4, 6, 8, 10, 12, 15, 18, 22, 26, 30, 34],
  [...Array(16).fill(2), 8, 12, 18, 26, 32, 36, 32],
]) {
  gesture = createCollapseGesture();
  for (const start of [0, 1000, 2000]) { gesture.push(-1, start - 1); feed(gesture, values, start); }
  assert.equal(gesture.collapsed, true, 'Small deltas / slow-starting ramps can be three hard efforts');
}
gesture = createCollapseGesture();
for (const start of [0, 2000, 4000]) feed(gesture, Array(9).fill(18), start, 200);
assert.equal(gesture.count, 0, 'Same distance at a gentle pace is not a hard effort');
gesture = createCollapseGesture();
for (const start of [0, 700, 1400]) {
  gesture.push(-1, start - 1);
  feed(gesture, Array(3).fill(wheelPixels({ deltaY: 3, deltaMode: 1 }, 800).y), start, 55);
}
assert.equal(gesture.collapsed, true, 'Three quick groups of ordinary three-line mouse notches work');
gesture = createCollapseGesture();
for (let t = 0; t < 4500; t += 55) gesture.push(48, t);
assert.equal(gesture.count, 1, 'Continuous mouse rotation is one effort, not one hit per notch');

// No silence: each flick starts while the previous momentum tail still runs.
gesture = createCollapseGesture();
const flick = [2, 4, 8, 14, 22, 30, 36, 34, 29, 23, 18, 13, 9, 6, 4, 3, 2, 2, 2, 2];
for (let i = 0; i < 3; i++) feed(gesture, flick, i * flick.length * 16);
assert.equal(gesture.count, 1, 'Back-to-back flicks without scrolling up count once');
gesture = createCollapseGesture();
for (let i = 0; i < 3; i++) {
  gesture.push(-1, i * flick.length * 16 - 1);
  feed(gesture, flick, i * flick.length * 16);
  assert.equal(gesture.count, i + 1, 'Flicks separated by upward scrolling each count');
}
assert.equal(gesture.collapsed, true);
// While fallen, a renewed effort restomps even without a quiet gap.
const restomps = flick.map((value, i) => gesture.push(value, (3 * flick.length + i) * 16));
assert.ok(restomps.includes('collapse'), 'Renewed effort while fallen restomps without a quiet gap');
gesture = createCollapseGesture();
feed(gesture, flick, 0);
for (let t = 320; t < 4500; t += 16) gesture.push(t % 160 === 0 ? 18 : 3 + (t % 3), t);
assert.equal(gesture.count, 1, 'Isolated noisy tail spikes cannot create extra efforts');
gesture = createCollapseGesture();
for (let t = 0; t < 4500; t += 16) gesture.push(Math.max(2, 38 - t / 30) + (t % 3), t);
assert.equal(gesture.count, 1, 'A small decaying trackpad flick with jitter stays one effort');
gesture = createCollapseGesture();
gesture.beginTouch();
for (const start of [0, 700, 1400]) [20, 25, 30, 35].forEach((delta, i) => gesture.push(delta, start + i * 25, 'touch'));
assert.equal(gesture.count, 1, 'Pauses within one finger contact cannot become three swipes');
assert.equal(gesture.push(NaN, 3000), null);
assert.equal(gesture.push(Infinity, 3000), null);
assert.deepEqual(wheelPixels({ deltaX: 1, deltaY: 15, deltaMode: 1 }, 800), { x: 16, y: 240 });
assert.deepEqual(wheelPixels({ deltaX: 0, deltaY: 1, deltaMode: 2 }, 800), { x: 0, y: 800 });

// No single-effort shortcut: even a violent fling is just one hit.
for (const kind of ['wheel', 'touch']) {
  gesture = createCollapseGesture();
  assert.equal(gesture.push(1200, 0, kind), null, `${kind}: one violent fling does not collapse`);
  for (let t = 16; t < 1000; t += 16) gesture.push(Math.max(2, 1200 - t), t, kind);
  assert.equal(gesture.collapsed, false, `${kind}: fling momentum cannot add hits`);
  assert.equal(gesture.count, 1, `${kind}: a fling counts as one effort`);
}
gesture = createCollapseGesture();
feed(gesture, Array(10).fill(100), 0, 100);
assert.equal(gesture.collapsed, false, 'Steady rotation is only one ordinary effort');
const dom = new JSDOM(`<!doctype html><html><body>
<div id="root"><div id="top" style="color: red">
  <header class="site-header" data-collapse-piece><nav><a href="#target">Work</a></nav></header>
  <main><section class="hero-scroll-scene" data-collapse-piece><div class="hero-stage" style="position:sticky">
    <h1 class="hero-name" data-collapse-piece style="transform:translateY(-12px);translate:2px 3px;rotate:1deg">Tim</h1>
    <div class="hero-art" data-collapse-piece><svg><g class="play-square" transform="rotate(23)"></g></svg></div>
  </div></section>
  <article id="target" data-collapse-piece><div data-collapse-piece><a href="https://example.com/">Project</a></div></article>
  <div id="fixed-wrapper" data-collapse-piece><button style="position:fixed">Fixed</button></div>
  <div id="sticky-piece" data-collapse-piece style="position:sticky">Sticky</div></main>
  <footer><h2 data-collapse-piece><span class="touch-zone"><em style="transform:rotate(5deg)">touch</em></span></h2>
    <nav class="contact-links" data-collapse-piece><a href="mailto:hello@example.com">Email</a></nav>
    <div class="footer-bottom" data-collapse-piece>Footer</div>
    <div class="footer-landing" data-collapse-piece><span class="landing-tile" style="transform:scaleY(.8)"></span></div>
  </footer>
  <div id="collapse-mount"></div>
</div></div><button class="deployed-top" style="position:fixed;transform:translate3d(100px,100px,0)"></button>
</body></html>`, { pretendToBeVisual: true, url: 'https://example.com/' });
const { window } = dom;
globalThis.window = window;
globalThis.document = window.document;
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let time = 0;
window.performance.now = () => time;
let hidden = false;
Object.defineProperty(document, 'hidden', { get: () => hidden, configurable: true });
const mediaCallbacks = new Set();
let mediaSubscriptions = 0;
const preference = {
  matches: false,
  addEventListener: (_, callback) => { mediaSubscriptions++; mediaCallbacks.add(callback); },
  removeEventListener: (_, callback) => mediaCallbacks.delete(callback),
};
window.matchMedia = () => preference;
let frameRequests = 0;
window.requestAnimationFrame = () => { frameRequests++; return frameRequests; };
const animations = [];
window.Element.prototype.animate = function (keyframes, options) {
  const animation = { node: this, keyframes, options, cancelled: false, cancel() { this.cancelled = true; } };
  animations.push(animation);
  return animation;
};
const active = () => animations.filter(animation => !animation.cancelled);
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { default: PageCollapse, installPageCollapse } = await import('../src/motion/PageCollapse.jsx');
const top = document.getElementById('top');
// jsdom has no layout: explicit rectangles exercise viewport selection.
let viewportMode = 'all';
window.Element.prototype.getBoundingClientRect = function () {
  // Model a fallen piece leaving the viewport. Replay must cancel the old
  // effects BEFORE selection, otherwise those pieces disappear from replay.
  const fallen = active().some(animation => animation.node === this);
  const visible = !fallen && (viewportMode === 'all' || (viewportMode === 'footer' && this.closest('footer')));
  const y = visible ? 100 : -600;
  return { x: 20, y, left: 20, right: 320, top: y, bottom: y + 100, width: 300, height: 100 };
};
const originalHTML = top.innerHTML;
const originalStyle = top.getAttribute('style');
const wheel = (deltaY, when, extra = {}) => {
  time = when;
  const event = new window.WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true, ...extra });
  window.dispatchEvent(event);
  assert.equal(event.defaultPrevented, false, 'Native scrolling is never prevented');
};
const three = (start = 0) => {
  for (const offset of [0, 700, 1400]) {
    wheel(-1, start + offset - 10);
    wheel(100, start + offset);
    wheel(100, start + offset + 40);
    wheel(100, start + offset + 80);
  }
};
const rebuilt = message => {
  assert.equal(active().length, 0, message);
  assert.equal(top.classList.contains('page-collapse-active'), false);
  assert.equal(top.innerHTML, originalHTML, 'Original nodes, links and inline styles remain exactly intact');
  assert.equal(top.getAttribute('style'), originalStyle);
};

// Track just the installation's event handlers, not React's event delegation.
const registrations = new Set();
const patched = [window, document, top].map(target => {
  const add = target.addEventListener;
  const remove = target.removeEventListener;
  target.addEventListener = function (name, callback, options) {
    registrations.add(callback);
    return add.call(this, name, callback, options);
  };
  target.removeEventListener = function (name, callback, options) {
    registrations.delete(callback);
    return remove.call(this, name, callback, options);
  };
  return () => { target.addEventListener = add; target.removeEventListener = remove; };
});
const dispose = installPageCollapse(top, window);
const installedCallbacks = new Set(registrations);
rebuilt('Installation renders nothing and starts no motion');
window.scrollY = 5000;
window.dispatchEvent(new window.Event('scroll'));
three();
assert.equal(top.classList.contains('page-collapse-active'), true, 'Three hard wheel bursts at a fixed scrollY collapse');
assert.equal(window.scrollY, 5000, 'Does not force scroll or rely on movement at the bottom');
assert.equal(active().length, 5, 'Four safe disjoint content pieces and the bottom tile animate');
assert.ok(active().every(a => !a.node.matches('.site-header, nav, .hero-stage, .hero-art, .footer-landing, #fixed-wrapper, #sticky-piece')));
assert.equal(active().filter(a => a.node.closest('#target')).length, 1, 'Nested markers do not double animate');
for (const animation of active()) {
  assert.equal(animation.options.iterations, 1);
  assert.ok(animation.options.duration <= 1500);
  assert.equal(animation.options.fill, 'forwards', 'Pieces stay fallen without a running frame loop');
  assert.equal(animation.options.composite, 'add', 'Existing translate and rotate are composed, not replaced');
  assert.ok(parseFloat(animation.keyframes.at(-1).translate.split(' ')[1]) >= 140, 'Fall is substantial, not a barely visible nudge');
  assert.ok(animation.keyframes.every(frame => !('transform' in frame)), 'Existing transform animations stay independent');
  assert.ok(parseFloat(animation.keyframes.at(-1).rotate) !== 0, 'Pieces visibly tilt');
}
assert.equal(document.querySelector('.landing-tile').style.transform, 'scaleY(.8)');
assert.equal(document.querySelector('.play-square').getAttribute('transform'), 'rotate(23)');
assert.equal(document.querySelector('.deployed-top').parentElement, document.body);
const firstFall = [...active()];
wheel(1000, 3000);
assert.equal(active().length, 5, 'Replay remains bounded to the same five pieces');
assert.ok(firstFall.every(animation => animation.cancelled), 'A fresh stomp actually replaces the original fall');
assert.ok(active().every(animation => !firstFall.includes(animation)), 'Replay creates fresh animations');
const replayCount = animations.length;
for (let t = 3016; t < 3300; t += 16) wheel(Math.max(2, 180 - (t - 3016)), t);
assert.equal(animations.length, replayCount, 'Momentum never restarts component animations');
wheel(-1, 3310);
rebuilt('Upward wheel instantly restores existing transforms and properties');
three(4000);
window.scrollY = 4999;
window.dispatchEvent(new window.Event('scroll'));
rebuilt('Upward actual scroll also rebuilds');
three(6000);
window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }));
rebuilt('Escape resets');
three(8000);
document.querySelector('#target a').dispatchEvent(new window.FocusEvent('focusin', { bubbles: true }));
rebuilt('Focusing a link restores its unshifted position');
three(10000);
document.querySelector('#target a').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
rebuilt('Links are not trapped in their fallen positions');
const key = (options = {}, target = window) => {
  const event = new window.KeyboardEvent('keydown', { key: '\\', code: 'Backslash', bubbles: true, cancelable: true, composed: true, ...options });
  target.dispatchEvent(event);
  assert.equal(event.defaultPrevented, false, 'Keyboard behaviour stays native');
};
for (const reduced of [false, true]) {
  preference.matches = reduced;
  three(12000);
  assert.equal(active().length, 5, `Wheel collapse works with reduced motion ${reduced}`);
  wheel(-1, 13600);
  rebuilt('Upward wheel resets with either preference');
  for (const resetKey of ['Escape', 'ArrowUp', 'PageUp', 'Home', ' ']) {
    key();
    assert.equal(active().length, 5, `Direct backslash works with reduced motion ${reduced}`);
    const beforeReplay = [...active()];
    key();
    assert.ok(beforeReplay.every(animation => animation.cancelled), 'Backslash replays an existing fall');
    assert.equal(active().length, 5, 'Keyboard replay never stacks animations');
    const afterReplay = animations.length;
    key({ repeat: true });
    assert.equal(animations.length, afterReplay, 'Held backslash cannot spam replays');
    key({ key: resetKey, shiftKey: resetKey === ' ' });
    rebuilt(`${resetKey} resets a direct collapse`);
  }
  for (const guard of ['ctrlKey', 'metaKey', 'altKey', 'shiftKey', 'repeat', 'isComposing']) {
    key({ [guard]: true });
    rebuilt(`${guard} blocks backslash with reduced motion ${reduced}`);
  }
  key({ key: 'a' });
  rebuilt('Other keys do not collapse');
  const consumed = new window.KeyboardEvent('keydown', { key: '\\', bubbles: true, cancelable: true });
  consumed.preventDefault();
  window.dispatchEvent(consumed);
  rebuilt('Consumed backslash is ignored');
  document.designMode = 'ON';
  key();
  rebuilt('Design mode preserves typing');
  document.designMode = 'off';

  // Keep test controls outside #top so original DOM preservation remains checked.
  const host = document.createElement('div');
  document.body.append(host);
  for (const html of ['<input>', '<textarea></textarea>', '<select></select>', '<div contenteditable><span></span></div>', '<div contenteditable="true"><span></span></div>']) {
    host.innerHTML = html;
    key({}, host.querySelector('span') ?? host.firstElementChild);
    rebuilt(`Editable context preserves backslash: ${html}`);
  }
  host.innerHTML = '<div></div>';
  const shadow = host.firstElementChild.attachShadow({ mode: 'open' });
  shadow.innerHTML = '<textarea></textarea>';
  key({}, shadow.firstElementChild);
  rebuilt('Composed path protects shadow-root editors');
  host.innerHTML = '<div contenteditable="false"></div>';
  key({}, host.firstElementChild);
  assert.equal(active().length, 5, 'Explicitly non-editable content allows backslash');
  wheel(-1, 15600);
  rebuilt('Upward wheel resets a direct collapse');
  host.remove();
}
three(16000);
const beforePreferenceChange = [...active()];
preference.matches = false;
mediaCallbacks.forEach(callback => callback());
assert.deepEqual(active(), beforePreferenceChange, 'Preference changes do not cancel or replace an active fall');
assert.equal(mediaSubscriptions, 0, 'No motion-preference subscriptions are installed');
hidden = true;
document.dispatchEvent(new window.Event('visibilitychange'));
rebuilt('Hiding the document restores everything');
three(18000);
key();
rebuilt('Hidden page ignores gestures and backslash');
hidden = false;
document.dispatchEvent(new window.Event('visibilitychange'));
wheel(300, 20000);
wheel(300, 20700);
rebuilt('Hidden history does not leak into the next visible cycle');
wheel(-1, 20800);
for (const start of [21000, 21700, 22400]) wheel(1000, start, { ctrlKey: true });
rebuilt('Pinch zoom cannot activate collapse');
for (const start of [23000, 23700, 24400]) wheel(1000, start, { deltaX: 1200 });
rebuilt('Horizontal scrolling cannot activate collapse');

const touch = (type, y, when, count = 1) => {
  time = when;
  const event = new window.Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'touches', { value: Array.from({ length: count }, (_, identifier) => ({ identifier, clientX: 100, clientY: y })) });
  top.dispatchEvent(event);
  assert.equal(event.defaultPrevented, false, 'Touch scrolling stays native');
};
for (const start of [25000, 25700, 26400]) {
  touch('touchstart', 400, start);
  touch('touchmove', 401, start + 10);
  touch('touchmove', 350, start + 20);
  touch('touchmove', 300, start + 60);
  touch('touchmove', 250, start + 100);
  touch('touchend', 250, start + 120, 0);
}
assert.equal(active().length, 5, 'Three forceful finger swipes are equivalent');
touch('touchstart', 250, 27000);
touch('touchmove', 251, 27020);
rebuilt('Downward finger movement means upward scrolling and restores');
for (const start of [28000, 28700, 29400]) {
  touch('touchstart', 400, start);
  for (let i = 1; i <= 20; i++) touch('touchmove', 400 - i * 2, start + i * 20);
  touch('touchend', 360, start + 410, 0);
}
rebuilt('Tiny finger nudges cannot activate');
for (const start of [31000, 31700, 32400]) {
  touch('touchstart', 400, start, 2);
  touch('touchmove', 50, start + 30, 2);
}
rebuilt('Multitouch is ignored');
three(34000);
window.dispatchEvent(new window.Event('resize'));
rebuilt('Resize restores rather than leaving offscreen links');
for (let i = 0; i < 3; i++) {
  wheel(-1, 36000 + i * flick.length * 16 - 1);
  flick.forEach((delta, j) => wheel(delta, 36000 + (i * flick.length + j) * 16));
}
assert.equal(active().length, 5, 'Realistic flicks also work through the installed handler');
dispose();
rebuilt('Disposal cancels every animation');
assert.equal(mediaCallbacks.size, 0);
for (const callback of installedCallbacks) assert.equal(registrations.has(callback), false, 'Every installed listener is removed');
// Mid-page movement never counts, whatever the input source.
Object.defineProperty(document.documentElement, 'scrollHeight', { value: 50000, configurable: true });
const disposeMovement = installPageCollapse(top, window);
const scrollBy = (delta, when) => {
  time = when;
  window.scrollY += delta;
  window.dispatchEvent(new window.Event('scroll'));
};
for (const start of [38000, 38700, 39400]) {
  for (let i = 0; i < 8; i++) {
    wheel(22, start + i * 16);
    scrollBy(22, start + i * 16);
  }
}
rebuilt('Hard scrolling mid-page never triggers');
for (const start of [40000, 40700, 41400]) wheel(1200, start);
rebuilt('Even violent flings mid-page never trigger');
scrollBy(-1, 41700);
disposeMovement();
Object.defineProperty(document.documentElement, 'scrollHeight', { value: 0, configurable: true });
const beforeDispose = animations.length;
three(38000);
key();
assert.equal(animations.length, beforeDispose, 'Disposed wheel and backslash handlers cannot reactivate');
patched.forEach(restore => restore());

const reactRoot = createRoot(document.getElementById('collapse-mount'));
await React.act(async () => reactRoot.render(React.createElement(React.StrictMode, null, React.createElement(PageCollapse))));
assert.equal(document.getElementById('collapse-mount').childNodes.length, 0, 'React component returns null');
three(40000);
assert.equal(active().length, 5, 'Strict Mode effect replay does not duplicate handlers');
const mountedFall = [...active()];
wheel(120, 42000);
assert.ok(mountedFall.every(animation => animation.cancelled), 'Mounted React component actually replays a fresh stomp');
assert.equal(active().length, 5, 'Mounted replay is bounded');
const mountedReplayCount = animations.length;
wheel(600, 42020);
wheel(300, 42040);
assert.equal(animations.length, mountedReplayCount, 'Same-effort violent continuation cannot replay twice');
key();
assert.equal(animations.length, mountedReplayCount + 5, 'Mounted backslash also replays');
const beforeGentle = animations.length;
for (let t = 42056; t < 42200; t += 16) wheel(4, t);
assert.equal(animations.length, beforeGentle, 'Gentle input while fallen never restomps');
wheel(-1, 42200);
wheel(200, 42300);
wheel(200, 42340);
wheel(200, 42380);
rebuilt('A single violent fling at the bottom does not activate');
wheel(120, 42800); wheel(120, 42840); wheel(120, 42880);
wheel(120, 43300); wheel(120, 43340); wheel(120, 43380);
rebuilt('Efforts without scrolling back up count once');
wheel(-1, 43400);
wheel(120, 43800); wheel(120, 43840); wheel(120, 43880);
rebuilt('Two efforts are not enough');
wheel(-1, 44200);
wheel(120, 44300); wheel(120, 44340); wheel(120, 44380);
assert.equal(active().length, 5, 'Third effort within five seconds activates');
for (const when of [44700, 44950, 45200, 45450, 45700]) {
  const previous = [...active()];
  wheel(120, when);
  assert.ok(previous.every(animation => animation.cancelled), 'Each fresh effort can replay indefinitely');
  assert.equal(active().length, 5, 'Repeated stomps never accumulate animation effects');
}
wheel(-1, 45900);
viewportMode = 'footer';
three(46000);
assert.equal(active().length, 3, 'At the bottom only visible footer text and landing tile fall');
assert.ok(active().every(animation => animation.node.closest('footer')), 'Offscreen hero and project pieces are untouched');
wheel(-1, 48000);
viewportMode = 'none';
three(49000);
rebuilt('No visible eligible content leaves no misleading active class');
await React.act(async () => reactRoot.unmount());
rebuilt('React unmount performs full cleanup');
assert.equal(mediaCallbacks.size, 0);
assert.equal(frameRequests, 0, 'No RAF or persistent JavaScript animation loop is used');
assert.equal(mediaSubscriptions, 0, 'Strict Mode never installs motion-preference subscriptions');

const css = readFileSync('src/motion/PageCollapse.css', 'utf8');
assert.match(css, /#top\.page-collapse-active\s*\{\s*overflow:\s*clip;/, 'Visual overflow is clipped without making a scroll container');
assert.doesNotMatch(css, /(?:^|[;{])\s*(?:transform|position|height|contain|filter)\s*:/m, 'CSS does not capture fixed children or alter document height');
console.log('PASS: bounded component and keyboard replay, no single-fling or mid-page trigger, reacceleration gesture detection (no required pause), small-delta/ramp/notch/inertia sequences, three-in-five, touch, wheel at bottom, viewport selection, backslash and keyboard guards, rebuild under both motion preferences, bounded independent effects, null React render, Strict Mode and listener cleanup.');
console.log('NOTE: jsdom has no browser layout or Web Animations renderer; real-device gesture feel, visual clipping and unchanged scrollHeight still need a browser check.');
window.close();
