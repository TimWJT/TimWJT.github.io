import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createWoodClick } from '../src/motion/woodClick.js';

class AudioParamMock {
  values = [];
  setValueAtTime(value, time) { this.values.push({ kind: 'set', value, time }); }
  linearRampToValueAtTime(value, time) { this.values.push({ kind: 'linear', value, time }); }
  exponentialRampToValueAtTime(value, time) { this.values.push({ kind: 'exponential', value, time }); }
}
class AudioNodeMock {
  constructor(context, kind) {
    this.kind = kind;
    this.gain = new AudioParamMock();
    this.frequency = new AudioParamMock();
    this.Q = new AudioParamMock();
    this.connections = [];
    this.stops = [];
    context.nodes.push(this);
    this.context = context;
  }
  connect(node) { this.connections.push(node); }
  disconnect() { this.disconnected = true; }
  start(time) { this.started = time; this.context.starts++; }
  stop(time) { this.stops.push(time); }
}
class AudioContextMock {
  static instances = [];
  constructor() {
    AudioContextMock.instances.push(this);
    this.state = 'suspended';
    this.sampleRate = 48000;
    this.currentTime = 1;
    this.nodes = [];
    this.starts = 0;
    this.resumes = 0;
    this.closes = 0;
    this.destination = {};
  }
  createBuffer(channels, length, sampleRate) {
    assert.equal(channels, 1);
    assert.equal(sampleRate, this.sampleRate);
    this.noise = new Float32Array(length);
    return { getChannelData: () => this.noise };
  }
  createGain() { return new AudioNodeMock(this, 'gain'); }
  createBiquadFilter() { return new AudioNodeMock(this, 'filter'); }
  createBufferSource() { return new AudioNodeMock(this, 'noise'); }
  createOscillator() { return new AudioNodeMock(this, 'oscillator'); }
  resume() { this.resumes++; this.state = 'running'; return Promise.resolve(); }
  close() { this.closes++; this.state = 'closed'; return Promise.resolve(); }
}
const settle = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };
const lastContext = () => AudioContextMock.instances.at(-1);
const source = () => ({ AudioContext: AudioContextMock });
const sound = createWoodClick(source);
assert.equal(AudioContextMock.instances.length, 0, 'Creating the helper does not create/unlock audio');
sound.play();
await settle();
const context = lastContext();
assert.equal(context.resumes, 1, 'First deliberate click unlocks audio');
const sourcesPerTap = 3; // Grain transient + two wood partials. Nothing else.
assert.equal(context.starts, sourcesPerTap, 'One tap starts only the transient and two partials');
assert.ok(context.noise.every(value => Math.abs(value) <= 0.5), 'Noise is bounded before mixing');
assert.equal(context.noise.length, 960, 'Noise grain lasts only 20 ms (rounded up)');
const kinds = kind => context.nodes.filter(node => node.kind === kind);
assert.equal(kinds('filter').length, 1, 'One filter: the bandpass on the contact transient');
const bandpass = kinds('filter').find(node => node.type === 'bandpass');
assert.ok(bandpass, 'The hard contact transient is bandpass filtered');
const bandpassFrequency = bandpass.frequency.values[0].value;
assert.ok(bandpassFrequency > 1200 && bandpassFrequency < 2200, `Transient keeps a solid edge without piercing highs (got ${bandpassFrequency} Hz)`);
const bandpassQ = bandpass.Q.values[0].value;
assert.ok(bandpassQ > 0.5 && bandpassQ <= 2, 'The bandpass is tight enough to keep the tap bright, not boomy');
assert.equal(kinds('oscillator').length, 2, 'Exactly two resonant partials, no spring carrier, no wobble');
const woodPartials = kinds('oscillator');
const partialFrequencies = woodPartials.map(node => node.frequency.values[0].value).sort((a, b) => a - b);
const [low, high] = partialFrequencies;
assert.ok(low > 700 && low < 1200 && high > 1200 && high < 2200, `Resonances are deep wood taps (got ${low.toFixed(0)} Hz and ${high.toFixed(0)} Hz)`);
assert.ok(Math.abs(high / low - 3400 / 2100) < 0.05, 'Partials stay near the designed 2100 Hz / 3400 Hz wood pair');
for (const partial of woodPartials) {
  assert.equal(partial.type, 'sine', 'Resonances use clean sine partials');
  assert.equal(partial.frequency.values.length, 1, 'Frequencies are fixed — no pitch glides or rubbery bends');
}
assert.ok(new Set(partialFrequencies).size === partialFrequencies.length, 'The two partials are distinct resonances');
assert.ok(woodPartials.every(node => node.stops[0] < node.context.currentTime + 0.1), 'Both partials stop inside 100 ms');
assert.ok(woodPartials[1].stops[0] < woodPartials[0].stops[0], 'The higher partial dies away sooner than the lower one');
assert.equal(kinds('noise').length, 1, 'One filtered grain per tap');
const bus = context.nodes[0];
assert.equal(bus.kind, 'gain', 'All voices share one bounded master bus');
assert.equal(bus.gain.values[0].value, 0.14, 'Master bus keeps overlapping taps modest');
assert.deepEqual(bus.connections, [context.destination], 'Only the master bus reaches the output');
assert.equal(context.nodes.filter(node => node.connections.includes(context.destination)).length, 1);
const layerGains = kinds('gain').filter(node => node.connections.includes(bus));
assert.equal(layerGains.length, 3, 'Grain and both partials each have an envelope');
for (const layer of layerGains) {
  assert.equal(layer.gain.values[0].value, 0, 'Each audible layer attacks from silence');
  assert.equal(layer.gain.values[1].kind, 'linear', 'Each audible layer has a very short attack');
  assert.equal(layer.gain.values.at(-1).kind, 'exponential', 'Every audible layer is damped');
  assert.equal(layer.gain.values.at(-1).value, 0.0001, 'Every audible layer fades near silence');
}
const grainGain = bandpass.connections[0];
const grainDecay = grainGain.gain.values.at(-1).time - context.currentTime;
assert.ok(grainDecay > 0 && grainDecay < 0.05, 'The transient dies within tens of milliseconds, not a hiss');
for (const partial of woodPartials) {
  const partialGain = partial.connections[0];
  assert.ok(partialGain.gain.values[1].value < grainGain.gain.values[1].value, 'Resonances sit below the transient');
}
for (const sourceNode of context.nodes.filter(node => node.started !== undefined)) {
  assert.ok(sourceNode.stops[0] > sourceNode.started && sourceNode.stops[0] <= context.currentTime + 0.1, 'All sources have bounded stops');
}
const lastStop = Math.max(...context.nodes.filter(node => node.stops.length).map(node => node.stops.at(-1)));
const tailLength = lastStop - context.currentTime;
assert.ok(tailLength >= 0.05 && tailLength <= 0.081, `Every voice lasts 50–80 ms (got ${tailLength.toFixed(3)} s)`);
const cleanupSource = context.nodes.find(node => node.onended);
assert.equal(cleanupSource.stops[0], lastStop, 'Only the longest source retires the graph; the grain cannot cut resonances short');
for (const layer of layerGains) {
  assert.ok(layer.gain.values[1].time - context.currentTime <= 0.0011, 'Hard contact attacks within 1 ms');
}
for (const node of context.nodes) {
  assert.ok(node.connections.every(connection => !(connection instanceof AudioParamMock)), 'No pitch modulation or spring-like control oscillators');
}
for (let i = 0; i < 100; i++) sound.play();
assert.equal(context.starts, 101 * sourcesPerTap, 'Rapid running-context clicks each start one bounded tap');
assert.equal(kinds('oscillator').filter(node => !node.disconnected).length, 8, 'At most four complete taps overlap');
assert.equal(context.nodes.filter(node => node.onended).length, 4, 'Exactly four voices retain their cleanup callback');
for (const node of [...context.nodes]) if (node.onended) node.onended();
assert.ok(context.nodes.every(node => node.disconnected), 'Ended voices disconnect their entire graph');
sound.play();
sound.dispose();
sound.dispose();
assert.equal(context.closes, 1, 'Dispose closes the context only once');
assert.ok(context.nodes.every(node => node.disconnected), 'Dispose disconnects active voices');
const startsBeforeDispose = context.starts;
sound.play();
assert.equal(context.starts, startsBeforeDispose, 'Disposed helpers cannot restart audio');

// Devices with no Web Audio or with denied/failed audio must never break input.
for (const host of [undefined, {}, { AudioContext: class { constructor() { throw Error('Denied'); } } }]) {
  const unavailable = createWoodClick(() => host);
  assert.doesNotThrow(() => unavailable.play());
  assert.doesNotThrow(() => unavailable.dispose());
}
const legacy = createWoodClick(() => ({ webkitAudioContext: AudioContextMock }));
legacy.play();
await settle();
assert.equal(lastContext().starts, sourcesPerTap, 'Prefixed Web Audio works too');
legacy.dispose();
for (const mode of ['resume-reject', 'resume-throw', 'still-suspended', 'closed', 'interrupted', 'buffer-fail', 'graph-fail', 'close-reject', 'close-throw']) {
  class FailedContext extends AudioContextMock {
    constructor() { super(); if (['closed', 'interrupted'].includes(mode)) this.state = mode; }
    resume() {
      if (mode === 'resume-reject') return Promise.reject(Error('Blocked'));
      if (mode === 'resume-throw') throw Error('Blocked');
      if (mode === 'still-suspended') return Promise.resolve();
      return super.resume();
    }
    createBuffer(...args) { if (mode === 'buffer-fail') throw Error('No buffer'); return super.createBuffer(...args); }
    createOscillator() { if (mode === 'graph-fail') throw Error('No oscillator'); return super.createOscillator(); }
    close() {
      if (mode === 'close-reject') return Promise.reject(Error('Cannot close'));
      if (mode === 'close-throw') throw Error('Cannot close');
      return super.close();
    }
  }
  const failed = createWoodClick(() => ({ AudioContext: FailedContext }));
  assert.doesNotThrow(() => failed.play(), mode);
  await settle();
  const failedContext = lastContext();
  if (!mode.startsWith('close-')) assert.equal(failedContext.starts, 0, `${mode}: no unexpected sound`);
  failed.dispose();
  await settle();
  assert.ok(failedContext.nodes.every(node => node.disconnected), `${mode}: partial graphs are cleaned up`);
}
let finishResume;
class PendingContext extends AudioContextMock {
  resume() {
    this.resumes++;
    return new Promise(resolve => { finishResume = resolve; });
  }
}
const pending = createWoodClick(() => ({ AudioContext: PendingContext }));
for (let i = 0; i < 10; i++) pending.play();
const pendingContext = lastContext();
assert.equal(pendingContext.resumes, 1, 'Blocked unlock attempts do not queue repeated taps');
pending.dispose();
finishResume();
await settle();
assert.equal(pendingContext.starts, 0, 'An unlock resolving after teardown stays silent');
assert.equal(pendingContext.closes, 1, 'Pending context is closed on teardown');

// Isolated real React spinner, without App or the shared smoke test.
const dom = new JSDOM('<!doctype html><html><body><main class="hero-stage"></main><button id="other">Other</button><div id="root"></div></body></html>', { pretendToBeVisual: true });
const { window } = dom;
globalThis.window = window;
globalThis.document = window.document;
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
window.AudioContext = AudioContextMock;
window.matchMedia = () => ({ matches: false });
window.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, {
  get: (target, property) => target[property] ?? (String(property).includes('Gradient') ? (() => ({ addColorStop() {} })) : (() => {})),
  set: (target, property, value) => { target[property] = value; return true; },
});
const frames = new Map();
let nextFrame = 0;
let frameTime = 0;
window.requestAnimationFrame = callback => { frames.set(++nextFrame, callback); return nextFrame; };
window.cancelAnimationFrame = id => frames.delete(id);
window.performance.now = () => frameTime;
const flushFrames = () => {
  frameTime += 16;
  const pendingFrames = [...frames.values()];
  frames.clear();
  pendingFrames.forEach(callback => callback(frameTime));
};
const React = (await import('react')).default;
const { act } = await import('react');
const { createRoot } = await import('react-dom/client');
const SpinningTop = (await import('../src/motion/SpinningTop.jsx')).default;
const root = createRoot(document.getElementById('root'));
const beforeMount = AudioContextMock.instances.length;
await act(async () => root.render(React.createElement(React.StrictMode, null, React.createElement(SpinningTop))));
const dock = document.querySelector('.top-toy');
const floating = document.querySelector('.deployed-top');
const hero = document.querySelector('.hero-stage');
hero.getBoundingClientRect = () => ({ top: 96, left: 40, width: 900, height: 400, bottom: 496 });
dock.getBoundingClientRect = () => ({ top: 8, left: 40, width: 112, height: 72, bottom: 80 });
const pointer = (type, pointerType = 'mouse', x = 100, y = 100) => {
  const event = new window.MouseEvent(type, { button: 0, bubbles: true, cancelable: true, clientX: x, clientY: y });
  Object.defineProperty(event, 'pointerType', { value: pointerType });
  return event;
};
const click = (node, detail = 1) => node.dispatchEvent(new window.MouseEvent('click', { button: 0, detail, bubbles: true }));
const tap = async (node, type) => act(async () => {
  node.dispatchEvent(pointer('pointerdown', type));
  node.dispatchEvent(pointer('pointerup', type));
  click(node);
});
const quietEvents = () => {
  document.getElementById('other').click();
  document.body.click();
  hero.dispatchEvent(pointer('pointerdown'));
  hero.dispatchEvent(pointer('pointerup'));
  hero.dispatchEvent(pointer('pointermove'));
  dock.dispatchEvent(pointer('pointerover'));
  window.dispatchEvent(new window.Event('scroll'));
  window.dispatchEvent(new window.WheelEvent('wheel', { deltaY: 100 }));
  floating.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
};
await act(async () => quietEvents());
assert.equal(AudioContextMock.instances.length, beforeMount, 'Mount, site clicks, hover, wheel, scroll and arrows do not unlock audio');
await act(async () => dock.dispatchEvent(pointer('pointerdown')));
assert.equal(AudioContextMock.instances.length, beforeMount, 'Docked pointerdown alone is silent');
await act(async () => click(dock));
const spinnerContext = lastContext();
assert.equal(spinnerContext.starts, sourcesPerTap, 'First dock click sounds exactly once');
assert.equal(dock.dataset.state, 'wobbling', 'First click preserves wobble-only activation');
await tap(dock, 'touch');
assert.equal(spinnerContext.starts, 2 * sourcesPerTap, 'Touch pointer/click sequence sounds once');
assert.equal(dock.dataset.state, 'launching', 'Second click still deploys');
for (let i = 0; i < 30; i++) flushFrames();
assert.equal(dock.dataset.state, 'deployed');
assert.equal(floating.hidden, false);
assert.equal(dock.disabled, true, 'The empty dock is disabled while the top floats');
await act(async () => click(dock));
assert.equal(spinnerContext.starts, 2 * sourcesPerTap, 'Clicking the empty dock while deployed stays silent');
await act(async () => quietEvents());
const x = 40 + Number(floating.dataset.x);
const y = 96 + Number(floating.dataset.y) - 22;
await act(async () => {
  window.dispatchEvent(pointer('pointermove', 'mouse', x - 75, y));
  window.dispatchEvent(pointer('pointermove', 'mouse', x + 75, y));
});
assert.ok(Number(floating.dataset.swipeSpin) > 0, 'Swipe steering still operates');
assert.equal(spinnerContext.starts, 2 * sourcesPerTap, 'Deployed arrows, hover/swipe, site clicks and scrolling stay silent');
await act(async () => floating.dispatchEvent(pointer('pointerdown')));
assert.equal(spinnerContext.starts, 2 * sourcesPerTap, 'Deployed pointerdown stays silent');
await act(async () => click(floating));
assert.equal(spinnerContext.starts, 2 * sourcesPerTap, 'Deployed clicks never sound — including after pointerdown');
await tap(floating, 'touch');
assert.equal(spinnerContext.starts, 2 * sourcesPerTap, 'Deployed touch pointer/click sequences stay silent');

// JSDOM does not implement keyboard button defaults. Supply the browser's native
// detail=0 click once, and verify key handlers never play a sound.
const keyboardActivate = async (node, key) => {
  const before = spinnerContext.starts;
  await act(async () => {
    node.focus();
    node.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  });
  assert.equal(spinnerContext.starts, before, `${key}: keydown alone is silent`);
  await act(async () => {
    const repeat = new window.KeyboardEvent('keydown', { key, repeat: true, bubbles: true, cancelable: true });
    node.dispatchEvent(repeat);
    assert.equal(repeat.defaultPrevented, true, `${key}: held-key auto-repeat is suppressed`);
    node.dispatchEvent(new window.KeyboardEvent('keyup', { key, bubbles: true }));
    click(node, 0);
  });
  assert.equal(spinnerContext.starts, before + (node === dock ? sourcesPerTap : 0),
    `${key}: docked activation sounds once, deployed activation stays silent`);
};
await keyboardActivate(floating, 'Enter');
await keyboardActivate(floating, ' ');
await act(async () => window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
assert.equal(dock.dataset.state, 'idle');
await keyboardActivate(dock, 'Enter');
await keyboardActivate(dock, ' ');
assert.equal(dock.dataset.state, 'launching', 'Keyboard preserves two-click deployment');
assert.equal(spinnerContext.starts, 4 * sourcesPerTap, 'Docked keyboard activation sounds exactly once per key, repeats suppressed');
await act(async () => root.unmount());
assert.equal(spinnerContext.closes, 1, 'Unmount closes spinner-owned AudioContext');
assert.ok(spinnerContext.nodes.every(node => node.disconnected), 'Unmount disconnects every spinner sound node');
assert.equal(frames.size, 0, 'Unmount cancels the spinner animation');
window.close();
console.log('Easter sound tests passed: lazy audio, hard bounded click synthesis (no spring), failure cleanup, docked-only mouse/touch/keyboard clicks, silent deployed top, no pointer/click duplicates, and preserved two-click deployment.');
