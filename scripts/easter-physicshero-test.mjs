import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

// The dedicated suite for the physics hero. It is written around one fact that
// is easy to forget: jsdom has no layout engine and no pointer coordinates.
// `getBoundingClientRect()` returns zeros, `clientWidth`/`clientHeight` return
// zero, and a `MouseEvent` has no `pageX`/`pageY`.
//
// That has a hard consequence for what may be asserted. The component measures
// every token with `getBoundingClientRect()` and measures the scene with
// `clientWidth`/`clientHeight`, so in jsdom every number the simulation runs on
// is either zero (the real default, which makes the effect bail out at the top)
// or a number this file invented. A token's *resting* position is therefore a
// property of the stub, not of the component: seeding, gravity, collision
// response and pile shape all depend on box sizes that only exist here. So this
// suite never asserts where a token comes to rest, how high the pile stacks, or
// how long it takes to settle.
//
// What it does assert falls into four groups, and each one is chosen because it
// survives the absence of layout:
//
//   1. Markup and content, with the real jsdom defaults (a zero-size scene).
//      The hero must still render its name and every token, the effect must
//      bail out early, and it must leave no listener, timer or frame behind.
//   2. The running simulation, with a scene size supplied here. Only claims
//      hold that are expressed relative to that same size - most importantly
//      containment inside the wall rectangle, which is legitimate (see the
//      comment above it) because the walls are built from the very numbers this
//      file passes in, so a missing or misplaced wall is still caught.
//   3. Input and lifecycle behaviour: dragging, shaking, the hidden tab, the
//      settle timer, repeated wakes and unmount. None of these depend on where
//      a body happens to be.
//   4. `prefers-reduced-motion` rendering the static fallback.
//
// Every frame and every long timer belongs to this file, so "is a loop running
//?" is a fact rather than a guess, and `Math.random` is pinned so two runs
// produce byte-identical motion. Nothing here depends on wall-clock time.
//
// How the hero actually looks, whether the pile is readable at real token
// sizes, and how it performs on a phone need a real browser.

// ---------------------------------------------------------------- environment
const dom = new JSDOM(
  '<!doctype html><html><body><main id="page"></main><div id="root"></div><div id="root-2"></div></body></html>',
  { url: 'https://example.test/', pretendToBeVisual: true },
);
const { window } = dom;
globalThis.window = window;
globalThis.document = window.document;
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// The component uses Math.random to spread the initial drop and to kick the
// shake. A constant makes every run identical, and a constant of 0.5 means no
// random horizontal spread and no random spin, so the motion under test comes
// from the component and the engine rather than from a dice roll.
globalThis.Math.random = () => 0.5;

const preference = new window.EventTarget();
preference.matches = false;
window.matchMedia = query => (query.includes('reduce')
  ? preference
  : { matches: false, addEventListener() {}, removeEventListener() {} });
let hidden = false;
Object.defineProperty(document, 'hidden', { get: () => hidden, configurable: true });

// Every animation frame belongs to this file. Matter's runner asks for one,
// the DOM sync asks for one, and nothing else ever should.
const frames = new Map();
let nextFrame = 0;
let frameTime = 0;
window.requestAnimationFrame = callback => { frames.set(++nextFrame, callback); return nextFrame; };
window.cancelAnimationFrame = id => frames.delete(id);
globalThis.requestAnimationFrame = window.requestAnimationFrame;
globalThis.cancelAnimationFrame = window.cancelAnimationFrame;
window.performance.now = () => frameTime;
// Matter's Common.now() reads the bare global, and Runner.tick stamps its clock
// with it, so the simulated clock has to be the global one too.
Object.defineProperty(globalThis.performance, 'now', { value: () => frameTime, configurable: true });
const flush = (count = 1) => {
  for (let i = 0; i < count; i += 1) {
    frameTime += 16;
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach(callback => callback(frameTime));
  }
};

// The settle timer is 14 seconds away and the frames above are driven by hand,
// so long timers are held here instead of being waited out. Short timers are
// left to jsdom.
const deferred = new Map();
let nextTimer = 1;
const realSetTimeout = window.setTimeout.bind(window);
const realClearTimeout = window.clearTimeout.bind(window);
window.setTimeout = (fn, ms, ...args) => {
  if (!(ms >= 1000)) return realSetTimeout(fn, ms, ...args);
  deferred.set(nextTimer, () => fn(...args));
  return nextTimer++;
};
window.clearTimeout = id => (deferred.delete(id) ? undefined : realClearTimeout(id));
const fireDeferred = () => {
  const pending = [...deferred.values()];
  deferred.clear();
  pending.forEach(fn => fn());
};

// Listeners the component or Matter put on the page, recorded by identity so
// teardown can be checked. React's own delegated listeners land on the mount
// container and are not part of this.
const registrations = [];
const isScene = node => {
  try {
    return node?.classList?.contains?.('physics-scene') === true;
  } catch {
    return false; // a prototype, not an element
  }
};
const watch = (target, type) => (target === window && type === 'resize')
  || (target === document && type === 'visibilitychange')
  || (isScene(target) && ['mousedown', 'mousemove', 'mouseup', 'wheel', 'touchstart', 'touchmove', 'touchend', 'DOMMouseScroll', 'pointerdown'].includes(type));
for (const target of [window, document, window.Element.prototype]) {
  const add = target.addEventListener;
  const remove = target.removeEventListener;
  target.addEventListener = function trackedAdd(type, listener, options) {
    if (watch(this, type)) registrations.push({ target: this, type, listener, removed: false });
    return add.call(this, type, listener, options);
  };
  target.removeEventListener = function trackedRemove(type, listener, options) {
    const entry = registrations.find(item => !item.removed && item.target === this && item.type === type && item.listener === listener);
    if (entry) entry.removed = true;
    return remove.call(this, type, listener, options);
  };
}

const { default: React, act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { default: PhysicsHero } = await import('../src/motion/PhysicsHero.jsx');
const { profile, physicsHero } = await import('../src/data/content.js');

const tokenNodes = () => [...document.querySelectorAll('.physics-token')];
const read = node => {
  const match = /translate3d\((-?[\d.]+)px, (-?[\d.]+)px/.exec(node?.style?.transform ?? '');
  return match ? { x: Number(match[1]), y: Number(match[2]) } : null;
};
const positions = () => tokenNodes().map(read);
const moved = (from, to) => (from.some(p => !p) || to.some(p => !p)
  ? Infinity
  : from.reduce((total, point, i) => total + Math.hypot(point.x - to[i].x, point.y - to[i].y), 0));
// Matter reads pageX/pageY, which jsdom's MouseEvent does not implement.
const pointer = (type, x, y) => {
  const event = new window.MouseEvent(type, { clientX: x, clientY: y, button: 0, bubbles: true, cancelable: true });
  Object.defineProperty(event, 'pageX', { value: x });
  Object.defineProperty(event, 'pageY', { value: y });
  return event;
};
// The same content in the simulated hero and in the static one, so both can be
// checked without repeating the list.
const checkContent = where => {
  const section = document.querySelector('.hero-physics');
  assert.ok(section, `The physics hero renders its own section (${where})`);
  assert.equal(section.id, 'top', 'It keeps the #top anchor the rest of the page links to');
  assert.equal(document.querySelector('h1').textContent, profile.name, `The name is the reader's (${where})`);
  assert.equal(document.querySelector('.eyebrow').textContent, profile.roles.join(' · '), `The roles are listed (${where})`);
  assert.equal(document.querySelector('.hero-tagline').textContent, profile.tagline, `The tagline is there (${where})`);
  // The static hero under reduced motion has no actions, so the resume link is
  // only checked where the interactive hero is what rendered.
  if (document.querySelector('.btn-primary')) {
    assert.match(document.querySelector('.btn-primary').getAttribute('href'), /Tim_Wang_Resume\.pdf$/, `The resume link is real (${where})`);
  } else {
    assert.equal(where, 'reduced motion', `Only the static hero has no resume link (${where})`);
  }
  // Reduced motion renders the same words as pills, not as simulated tokens, so
  // the token list is only checked where the interactive hero is what rendered.
  // The pills are checked, in order and by weight, a few lines below.
  if (document.querySelector('.physics-token')) {
    const labels = tokenNodes().map(node => node.textContent);
    assert.deepEqual(labels, physicsHero.tokens.map(token => token.label), `Every token is rendered, in order (${where})`);
    tokenNodes().forEach((node, i) => {
      assert.equal(node.dataset.weight, physicsHero.tokens[i].weight, `Each token keeps its weight (${where})`);
    });
  } else {
    assert.equal(where, 'reduced motion', `Only the static hero has no simulated tokens (${where})`);
  }
};
const hero = () => React.createElement(React.StrictMode, null, React.createElement(PhysicsHero));
// A fresh host and a fresh root per mount: React will not let an unmounted
// root be rendered into again, and each part of this suite wants a clean one.
let hosts = 0;
const mount = async () => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(hero()));
  hosts += 1;
  return root;
};

// ===========================================================================
// 1. The hero with jsdom's real, empty layout: content, and an effect that
//    bails out because there is no box to simulate.
// ===========================================================================
const bareRoot = await mount();
checkContent('no layout');
const bareScene = document.querySelector('.physics-scene');
assert.ok(bareScene, 'The scene element is always rendered');
assert.equal(bareScene.getAttribute('aria-hidden'), 'true', 'The scene is hidden from assistive tech');
assert.equal(bareScene.classList.contains('is-ready'), false, 'It does not claim to be laid out when it has no size');
assert.equal(document.querySelector('.physics-hint').textContent, 'Drag the tags. Throw them.');
assert.equal(document.querySelector('.physics-hint').classList.contains('is-hidden'), false, 'The hint is offered before anything is touched');
assert.equal(document.querySelector('.physics-shake').textContent, 'Shake');
assert.equal(
  tokenNodes().every(node => node.style.transform === ''),
  true,
  'With no frames, nothing is placed by hand and no token has been moved',
);
assert.equal(document.body.textContent.includes('light tokens only on a wide screen'), false, 'No narrow-screen notice leaks into the copy');
// window.innerWidth is 1024 in jsdom, so the small-screen trim must not have run.
assert.equal(
  tokenNodes().some(node => node.dataset.weight === 'light'),
  true,
  'A wide window keeps the light tokens',
);
assert.equal(frames.size, 0, 'An unsized scene asks for no frames');
assert.equal(deferred.size, 0, 'An unsized scene owns no settle timer');
assert.equal(registrations.length, 0, 'An unsized scene installs no resize, visibility or pointer listener');
// The shake button with no engine must be a no-op, not a crash.
assert.doesNotThrow(() => { document.querySelector('.physics-shake').click(); }, 'Shaking without an engine is safe');
await act(async () => {});
assert.equal(frames.size, 0, 'And it still starts nothing');
assert.equal(deferred.size, 0, 'And it owns no timer');
assert.equal(document.querySelector('.physics-hint').classList.contains('is-hidden'), false, 'And it does not claim the reader has dragged');
await act(async () => bareRoot.unmount());
assert.equal(document.querySelector('.hero-physics'), null, 'Unmounting the unsized hero removes it');
assert.equal(frames.size, 0);

// ===========================================================================
// 2. The same hero, now with a scene size. From here the component builds a
//    real Matter world, so its listeners, timers and frame loops are real.
// ===========================================================================
// The size the component will measure. Nothing below asserts a token's resting
// position, because a resting position is measured from these numbers rather
// than from the component. The token boxes below are deliberately plausible
// (a few dozen to a few hundred pixels wide, 34 tall, ~12% of the scene filled)
// so the simulation is not a nonsense world, but no assertion is calibrated to
// them: if you change them, every assertion here should still hold.
const SCENE = { width: 900, height: 420 };
// A plain function, not an arrow: it is installed on Element.prototype and is
// called with no arguments, so the element it measures is `this`.
function layout() {
  const node = this;
  if (isScene(node)) {
    return { x: 0, y: 0, left: 0, top: 0, right: SCENE.width, bottom: SCENE.height, width: SCENE.width, height: SCENE.height, toJSON: () => ({}) };
  }
  const width = Math.min(24 + (node.textContent ?? '').length * 7, 150);
  return { x: 0, y: 0, left: 0, top: 0, right: width, bottom: 34, width, height: 34, toJSON: () => ({}) };
}
window.Element.prototype.getBoundingClientRect = layout;
Object.defineProperty(window.HTMLElement.prototype, 'clientWidth', { get() { return isScene(this) ? SCENE.width : 0; }, configurable: true });
Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', { get() { return isScene(this) ? SCENE.height : 0; }, configurable: true });

const liveRoot = await mount();
const scene = document.querySelector('.physics-scene');
checkContent('simulated');
assert.equal(scene.classList.contains('is-ready'), true, 'A measured scene reports itself laid out');
assert.equal(frames.size, 2, 'Exactly one Matter frame and one DOM-sync frame are in flight');
assert.equal(deferred.size, 1, 'The settle timer is the only long timer the hero owns');
assert.ok(registrations.some(item => item.type === 'resize' && item.target === window), 'It listens for a resize');
assert.ok(registrations.some(item => item.type === 'visibilitychange' && item.target === document), 'It listens for a hidden tab');
assert.ok(registrations.some(item => item.type === 'pointerdown' && isScene(item.target)), 'A press on the scene can wake the pile');
['mousedown', 'mousemove', 'mouseup'].forEach(type => {
  assert.ok(registrations.some(item => item.type === type && isScene(item.target)), `Matter's ${type} listener was installed`);
});

// ---------------------------------------------------------------------------
// 2a. The bodies are kept inside the walls.
//
// This is the one geometry claim that is fair to make in jsdom. The component
// builds its walls from `measure()`, that is from the same two numbers this
// file supplies, so the wall rectangle is a property of the component and the
// stub together, and it is checked frame by frame: if a wall were dropped, put
// on the wrong axis, or sized from a different number, a body would leave this
// rectangle and the test would say so. It deliberately says nothing about
// whether the pile looks right inside the visible box - only that nothing
// escapes the box the component built. The token centres are read from the
// transforms the component itself writes, so this is the component's own
// arithmetic, not a restatement of the input.
// ---------------------------------------------------------------------------
// Walls are built as: a floor centred (w/2, h + 100), a left wall centred
// (-100, h/2), a right wall (w + 100, h/2) and a ceiling (w/2, -h - 200), each
// 200 thick. So the union of all four occupies x in [-200, w + 200] and
// y in [-h - 400, h + 200].
const WALL = 200;
const walls = { left: -WALL, right: SCENE.width + WALL, top: -SCENE.height - 2 * WALL, bottom: SCENE.height + WALL };
const FRAMES = 300;
for (let frame = 1; frame <= FRAMES; frame += 1) {
  flush(1);
  const here = positions();
  assert.equal(here.every(Boolean), true, `Frame ${frame}: every token is placed by the simulation`);
  here.forEach((point, i) => {
    const where = `frame ${frame}, token ${physicsHero.tokens[i].label}`;
    assert.ok(point.x > walls.left && point.x < walls.right, `${where} stays between the side walls (x ${Math.round(point.x)})`);
    assert.ok(point.y > walls.top && point.y < walls.bottom, `${where} stays between the floor and the ceiling (y ${Math.round(point.y)})`);
  });
}
assert.equal(frames.size, 2, 'A running simulation keeps asking for its two frames, not more');

// ---------------------------------------------------------------------------
// 2b. Dragging a token. No resting position is claimed; only that the pointer
//     reaches the bodies, that the class and the hint react, and that a press
//     on empty scene is harmless.
// ---------------------------------------------------------------------------
const target = tokenNodes()[3];
const start = read(target);
const hint = document.querySelector('.physics-hint');
// The pointer work is wrapped in act(): Matter's drag events call setNudged
// and setState on the component, and a state update outside act() is not
// committed to the DOM before the next assertion reads it.
assert.doesNotThrow(
  () => { target.dispatchEvent(pointer('mousedown', start.x, start.y)); },
  'Pressing a token is safe',
);
await act(async () => { flush(1); });
assert.equal(scene.classList.contains('is-grabbing'), true, 'A press on a token picks it up');
assert.equal(hint.classList.contains('is-hidden'), true, 'The hint retires once the reader has dragged');
assert.doesNotThrow(() => target.dispatchEvent(pointer('mousemove', start.x + 120, start.y - 200)), 'Moving the pointer is safe');
await act(async () => { flush(8); });
const dragged = read(target);
assert.notDeepEqual(dragged, start, 'The held token is moved by the pointer');
assert.ok(
  dragged.y < start.y,
  `The held token is carried towards the pointer, which went up (${Math.round(start.y)} -> ${Math.round(dragged.y)})`,
);
assert.doesNotThrow(() => target.dispatchEvent(pointer('mouseup', dragged.x, dragged.y)), 'Releasing is safe');
await act(async () => { flush(2); });
assert.equal(scene.classList.contains('is-grabbing'), false, 'Releasing lets go');
flush(30);
assert.notDeepEqual(read(target), dragged, 'The released token keeps its momentum');
assert.doesNotThrow(() => scene.dispatchEvent(pointer('mousedown', 12, 12)), 'A press on empty scene is safe');
flush(2);
assert.doesNotThrow(() => scene.dispatchEvent(pointer('mousemove', 20, 30)), 'A drag from empty scene is safe');
assert.doesNotThrow(() => scene.dispatchEvent(pointer('mouseup', 20, 30)), 'A release on empty scene is safe');
flush(2);

// ---------------------------------------------------------------------------
// 2c. The shake button. Measured against a control run of the same number of
//     frames, so the assertion is "shaking moves the pile far more than the
//     pile moves on its own" and not a claim about any absolute position.
// ---------------------------------------------------------------------------
const settle = (limit = 1500) => {
  let still = 0;
  let previous = positions();
  for (let pumped = 1; pumped < limit && still < 6; pumped += 1) {
    flush(1);
    const now = positions();
    still = moved(previous, now) < 0.5 ? still + 1 : 0;
    previous = now;
  }
  return still;
};
settle();
const beforeShake = positions();
flush(6);
const idleTravel = moved(beforeShake, positions());
const beforeClick = positions();
await act(async () => { assert.doesNotThrow(() => { document.querySelector('.physics-shake').click(); }, 'Shaking is safe'); });
flush(1);
const shakeTravel = moved(beforeClick, positions());
assert.equal(hint.classList.contains('is-hidden'), true, 'The hint stays retired after a shake');
assert.ok(
  shakeTravel > Math.max(idleTravel * 4, 60),
  `Shaking moves the pile much more than idle drift (${Math.round(shakeTravel)} against ${idleTravel.toFixed(3)})`,
);
flush(4);
assert.equal(frames.size, 2, 'Shaking does not add a second frame loop');

// ---------------------------------------------------------------------------
// 2d. Waking, settling and the hidden tab.
// ---------------------------------------------------------------------------
assert.equal(deferred.size, 1, 'Shaking did not add a timer');
fireDeferred();
// Pausing does not cancel the frames already in flight; it stops them asking
// for more. So the count must be unchanged here, and must fall to nothing once
// the pending callbacks have run. It is compared with the count from before,
// because how many frames a running Matter loop has in flight is Matter's
// business, not this file's.
const framesBeforeSettle = frames.size;
fireDeferred();
assert.ok(framesBeforeSettle > 0, 'A running loop has frames in flight before the settle timer');
assert.equal(frames.size, framesBeforeSettle, 'The settle timer pauses the loop without asking for a frame of its own');
await act(async () => { flush(3); });
assert.equal(frames.size, 0, 'And the frames in flight stop instead of asking for another');
await act(async () => { flush(3); });
assert.equal(frames.size, 0, 'And it stays that way while nothing happens');
// Matter's Runner.run starts a fresh loop on every call and Runner.stop can
// only cancel the most recent one, so two wakes used to leave an orphan loop
// ticking for the rest of the page's life. The hero wakes on pointerdown (the
// component's own listener), not on mousedown, so that is what is dispatched.
scene.dispatchEvent(pointer('pointerdown', 450, 300));
scene.dispatchEvent(pointer('pointerdown', 460, 310));
await act(async () => { flush(1); });
const woken = frames.size;
assert.ok(woken > 0, 'A press on the scene wakes the simulation');
scene.dispatchEvent(pointer('pointerdown', 470, 320));
await act(async () => { flush(1); });
assert.equal(frames.size, woken, 'Repeated presses wake exactly one Matter loop, not one each');
scene.dispatchEvent(pointer('pointerup', 470, 320));
await act(async () => { flush(2); });

hidden = true;
document.dispatchEvent(new window.Event('visibilitychange'));
// Pausing cannot recall a frame that is already queued, so the claim is that
// the queue drains and does not refill, not that it empties instantly.
flush(3);
const hiddenFrames = frames.size;
flush(3);
assert.equal(frames.size, hiddenFrames, 'A hidden tab is not simulated: the queue drains and nothing is asked for');
assert.ok(hiddenFrames <= 1, `At most the one frame already in flight is left (${hiddenFrames})`);
hidden = false;
document.dispatchEvent(new window.Event('visibilitychange'));
const resumed = frames.size;
assert.ok(resumed > 0, 'Coming back resumes the simulation');
flush(2);

// ---------------------------------------------------------------------------
// 2e. Teardown.
// ---------------------------------------------------------------------------
const afterMount = registrations.length;
assert.ok(afterMount >= 6, 'The hero really does install listeners');
await act(async () => liveRoot.unmount());
assert.ok(
  registrations.every(item => item.removed),
  'Every listener the hero and Matter installed is removed, including the Strict Mode replay',
);
assert.equal(frames.size, 0, 'Unmount cancels both loops');
flush(10);
assert.equal(frames.size, 0, 'No orphaned Matter loop survives to re-request frames');
assert.equal(deferred.size, 0, 'The settle timer is cleared');
assert.doesNotThrow(() => scene.dispatchEvent(pointer('mousedown', 300, 200)), 'A press on the removed scene cannot throw');
flush(3);
assert.equal(frames.size, 0, 'And cannot restart anything');
assert.equal(document.querySelector('.hero-physics'), null, 'The section is gone from the document');

// ===========================================================================
// 3. Reduced motion renders the static hero instead, with no simulation.
// ===========================================================================
preference.matches = true;
const beforeReduced = registrations.length;
const reducedRoot = await mount();
const fallback = document.querySelector('.physics-fallback');
assert.ok(fallback, 'Reduced motion renders the static hero instead');
assert.equal(document.querySelector('.physics-scene'), null, 'No physics scene is built at all');
assert.equal(document.getElementById('top').tagName, 'SECTION', 'The #top anchor survives');
checkContent('reduced motion');
const pills = [...document.querySelectorAll('.physics-fallback-tags li')];
assert.deepEqual(
  pills.map(pill => pill.textContent),
  physicsHero.tokens.map(token => token.label),
  'Every token is still readable as a pill',
);
assert.deepEqual(
  pills.map(pill => pill.className),
  physicsHero.tokens.map(token => (token.weight === 'heavy' ? 'pill' : 'pill pill-ghost')),
  'Heavy pills are solid and light ones are ghosted',
);
assert.equal(frames.size, 0, 'The static hero asks for no frames');
assert.equal(deferred.size, 0, 'The static hero owns no settle timer');
assert.equal(registrations.length, beforeReduced, 'The static hero installs no listeners');
await act(async () => reducedRoot.unmount());
flush(3);
assert.equal(frames.size, 0, 'The static hero leaves no loop behind');
assert.ok(hosts === 3, 'Three independent mounts, none of them reusing a dead root');

dom.window.close();
console.log(
  'PASS: the physics hero renders its name and every token with jsdom\'s real zero-size layout and then does nothing at all; given a measured scene it builds one Matter world with one frame loop, one settle timer and one listener set, keeps every token inside the walls it built over 300 frames, responds to the pointer, shakes harder than it idles, stops for a settled pile and a hidden tab, never stacks loops on repeated wakes, leaves no listener, timer or frame behind on unmount, and renders the static hero with all its pills under reduced motion. jsdom cannot judge how the pile looks or performs - that needs a real browser.',
);
