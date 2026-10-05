import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

// The first dedicated suite for the nav top. Until now its physics was only
// covered incidentally inside smoke-test.mjs, which drives the whole App and
// cannot isolate scroll position, tab visibility or focus. This file mounts the
// real component in jsdom and talks to it the way a reader would: presses,
// Escape, wheel, scroll and a tab that is not being looked at.

// ---------------------------------------------------------------- environment
const dom = new JSDOM('<!doctype html><html><body><main class="hero-stage"></main><div id="root"></div></body></html>', { pretendToBeVisual: true });
const { window } = dom;
globalThis.window = window;
globalThis.document = window.document;
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
// No Web Audio on this host: the helper is required to cope with that, and a
// silent dock keeps this suite about input, not sound.
window.AudioContext = undefined;
const motionPreference = { matches: false };
window.matchMedia = () => motionPreference; // The toy no longer asks about motion: it has no cut left to soften.
window.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, {
  get: (target, property) => target[property] ?? (String(property).includes('Gradient') ? (() => ({ addColorStop() {} })) : (() => {})),
  set: (target, property, value) => { target[property] = value; return true; },
});
// Every animation frame is ours, so "did the toy ask for a frame?" is a fact
// rather than a guess. An empty map is the idle state the design notes promise.
const frames = new Map();
let nextFrame = 0;
let frameTime = 0;
window.requestAnimationFrame = callback => { frames.set(++nextFrame, callback); return nextFrame; };
window.cancelAnimationFrame = id => frames.delete(id);
window.performance.now = () => frameTime;
const flushFrames = count => {
  for (let i = 0; i < (count ?? 1); i++) {
    frameTime += 16;
    const pendingFrames = [...frames.values()];
    frames.clear();
    pendingFrames.forEach(callback => callback(frameTime));
  }
};
// jsdom has no layout and no scroll offset of its own. Both are inputs the
// component is allowed to read, so both are stated outright here.
let scrollTop = 0;
const scrollCalls = [];
window.scrollTo = options => { scrollCalls.push(options); scrollTop = 0; };
Object.defineProperty(window, 'scrollY', { get: () => scrollTop, configurable: true });
const scrollTo = position => { scrollTop = position; };
let hidden = false;
Object.defineProperty(document, 'hidden', { get: () => hidden, configurable: true });
const setHidden = value => { hidden = value; };

const React = (await import('react')).default;
const { act } = await import('react');
const { createRoot } = await import('react-dom/client');
const SpinningTop = (await import('../src/motion/SpinningTop.jsx')).default;
const root = createRoot(document.getElementById('root'));
await act(async () => root.render(React.createElement(SpinningTop)));
const dock = document.querySelector('.top-toy');
const floating = document.querySelector('.deployed-top');
const hero = document.querySelector('.hero-stage');
let stage = { top: 96, left: 40, width: 900, height: 400, bottom: 496 };
hero.getBoundingClientRect = () => ({ ...stage });
dock.getBoundingClientRect = () => ({ top: 8, left: 40, width: 112, height: 72, bottom: 80 });
const pressDock = () => act(async () => dock.click());
const pressFitting = 30;

// ------------------------------------------------- 1. the dock never relocates
// Finding F6: the dock sits in the sticky header, so it is pressable from any
// scroll position, and pressing it far down the page used to call
// window.scrollTo({ top: 0 }) — a smooth full-page drag, or under reduced
// motion an instant cut of the whole page height.
motionPreference.matches = true;
scrollTo(1500);
for (let i = 0; i < 2; i++) await pressDock();
assert.deepEqual(scrollCalls, [], 'Two presses 1500px down the page never move the page, reduced motion or not');
assert.equal(dock.dataset.state, 'wobbling', 'A press far down the page is an ordinary wobble');
assert.equal(floating.hidden, true, 'Nothing is deployed over the lower sections');
flushFrames();
assert.notEqual(dock.dataset.tilt, '0.000', 'The far-down wobble is a real impulse, not a dead press');
flushFrames(300);
assert.equal(dock.dataset.state, 'idle', 'The far-down wobble settles like any other');
assert.equal(frames.size, 0, 'A settled dock asks for no frames');
// The launch that those two presses earned down page is spent, not saved, so
// the reader still has to earn it where they can watch it happen.
assert.equal(dock.dataset.angle, '0.400', 'No flight was ever created by the far-down presses');
motionPreference.matches = false;

// ------------------------------------------------ 2. near the top it deploys
scrollTo(0);
await act(async () => { dock.focus(); dock.click(); });
assert.equal(dock.dataset.state, 'wobbling', 'One press near the top only wobbles');
// A wheel or a touch elsewhere on the page must not disturb a launch that is
// already under way; there is no longer a return journey to interrupt.
window.dispatchEvent(new window.WheelEvent('wheel', { deltaY: 800 }));
window.dispatchEvent(new window.Event('touchstart'));
await pressDock();
assert.equal(dock.dataset.state, 'launching', 'Two quick presses still release the top');
flushFrames(pressFitting);
assert.equal(dock.dataset.state, 'deployed', 'The top deploys into the hero');
assert.equal(floating.hidden, false, 'The floating layer is visible while deployed');
assert.equal(dock.disabled, true, 'The empty dock cannot be pressed again mid-flight');
assert.match(floating.style.transform, /^translate3d\(/, 'The deployed top is positioned on the body-level layer');
assert.ok(Number.isFinite(Number(floating.dataset.x)) && Number.isFinite(Number(floating.dataset.y)), 'Its hero coordinates are real numbers');
assert.deepEqual(scrollCalls, [], 'Deploying near the top never moves the page either');
assert.equal(document.activeElement, floating, 'Focus follows the top out of the sticky header');

// ------------------------------------------------------ 3. Escape docks it
await act(async () => window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' })));
assert.equal(dock.dataset.state, 'idle', 'Escape docks the deployed top');
assert.equal(floating.hidden, true, 'Escape puts the toy away, it does not leave it floating');
assert.equal(dock.dataset.angle, '0.400', 'Docking restores the resting dock state');
assert.equal(document.activeElement, dock, 'Focus is restored to the dock button');
assert.equal(frames.size, 0, 'A docked toy asks for no frames');
flushFrames(30);
assert.equal(frames.size, 0, 'And stays that way while nothing is happening');

// A second Escape on the dock, and a resize, must both be harmless.
await act(async () => {
  window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }));
  window.dispatchEvent(new window.Event('resize'));
});
assert.equal(dock.dataset.state, 'idle', 'Escape and resize on an idle dock change nothing');
assert.equal(frames.size, 0, 'Neither one starts an animation loop');

// ------------------------------------------- 4. a hidden tab pauses the loop
scrollTo(0);
await pressDock();
await pressDock();
flushFrames(pressFitting);
assert.equal(dock.dataset.state, 'deployed', 'The top redeploys for the visibility checks');
assert.equal(frames.size, 1, 'A moving deployed top keeps exactly one frame in flight');
setHidden(true);
await act(async () => document.dispatchEvent(new window.Event('visibilitychange')));
assert.equal(frames.size, 0, 'Hiding the tab cancels the simulation frame');
// Input that arrives while the tab is hidden must not quietly restart it.
const hiddenX = Number(floating.dataset.x);
const hiddenY = Number(floating.dataset.y);
await act(async () => floating.dispatchEvent(new window.MouseEvent('pointerdown', { button: 0, bubbles: true, cancelable: true, clientX: 40 + hiddenX - 30, clientY: 96 + hiddenY - 22 })));
assert.equal(frames.size, 0, 'A hidden tab is not animated by input either');
flushFrames(30);
assert.equal(Number(floating.dataset.x), hiddenX, 'The paused simulation does not advance');
setHidden(false);
await act(async () => document.dispatchEvent(new window.Event('visibilitychange')));
assert.equal(frames.size, 1, 'Returning to a visible tab resumes the simulation');
flushFrames(5);
assert.notEqual(Number(floating.dataset.x), hiddenX, 'And the top moves again once it can be seen');

// ------------------------------------------- 5. the hero leaving view docks it
stage = { top: -700, left: 40, width: 900, height: 400, bottom: -300 };
await act(async () => window.dispatchEvent(new window.Event('scroll')));
assert.equal(dock.dataset.state, 'idle', 'Leaving the hero returns the toy to the dock');
assert.equal(floating.hidden, true, 'No toy is left floating over a reading section');
assert.deepEqual(scrollCalls, [], 'Scrolling the hero away never moves the page');
stage = { top: 96, left: 40, width: 900, height: 400, bottom: 496 };
flushFrames(30);
assert.equal(dock.dataset.state, 'idle', 'The dock stays idle once the hero is back on screen');

// ------------------------------------------------------- 6. what it promises
const dockLabel = dock.getAttribute('aria-label');
assert.ok(dockLabel.includes('Wobble'), 'The dock keeps its nonvisual instructions');
assert.match(dockLabel, /top of the page/i, 'The dock says where the top can be released');
assert.ok(!/scroll/i.test(dockLabel), 'The dock does not imply that it moves the page');
assert.match(floating.getAttribute('aria-label'), /Escape returns it to its stand/, 'The floating top still documents Escape');
assert.equal(dock.title, '', 'No visible tooltip instructions');

// A hero too small to receive the top must reset rather than strand it.
stage = { top: 96, left: 40, width: 40, height: 20, bottom: 116 };
scrollTo(0);
await pressDock();
await pressDock();
flushFrames(pressFitting);
assert.equal(dock.dataset.state, 'idle', 'A hero that cannot receive the top resets to the dock');
assert.equal(floating.hidden, true, 'And nothing is left floating');
stage = { top: 96, left: 40, width: 900, height: 400, bottom: 496 };

// ------------------------------------------------------------------- teardown
await act(async () => root.unmount());
assert.equal(frames.size, 0, 'Unmount cancels the animation loop');
scrollTo(1500);
window.dispatchEvent(new window.Event('scroll'));
window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }));
assert.deepEqual(scrollCalls, [], 'Nothing left behind after unmount can move the page');
assert.equal(frames.size, 0, 'And no listener survives to start a loop');
window.close();
console.log('Easter spinning-top tests passed: the dock never moves the reader, two presses near the top still deploy, Escape docks and restores focus, idle asks for no frames, a hidden tab pauses the loop, and the hero leaving view puts the toy away.');
