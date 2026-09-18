import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><header class="site-header" id="root"></header><main id="page"></main>', {
  url: 'https://example.test/', pretendToBeVisual: true,
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let focused = true;
let hidden = false;
document.hasFocus = () => focused;
Object.defineProperty(document, 'hidden', { get: () => hidden, configurable: true });
const preference = new window.EventTarget();
preference.matches = false;
window.matchMedia = () => preference;

const { default: React, act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { default: RainbowBar } = await import('../src/motion/RainbowBar.jsx');
// Track exact listener identities, including StrictMode's setup/cleanup cycle.
const registrations = [];
for (const target of [window, document, preference]) {
  const add = target.addEventListener.bind(target);
  const remove = target.removeEventListener.bind(target);
  target.addEventListener = (type, listener, options) => {
    if (['keydown', 'keyup', 'blur', 'visibilitychange', 'change'].includes(type)) {
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
let scheduled = 0;
for (const name of ['setTimeout', 'setInterval', 'requestAnimationFrame']) {
  const original = window[name].bind(window);
  window[name] = (...args) => { scheduled++; return original(...args); };
}
const root = createRoot(document.getElementById('root'));
await act(async () => root.render(React.createElement(React.StrictMode, null, React.createElement(RainbowBar))));
const overlay = document.querySelector('.rainbow-bar');
const page = document.getElementById('page');
const active = () => overlay.classList.contains('is-active');
const key = (type, code, options = {}, target = page) => {
  const event = new window.KeyboardEvent(type, { key: code, code, bubbles: true, cancelable: true, composed: true, ...options });
  target.dispatchEvent(event);
  assert.equal(event.defaultPrevented, false, 'Rainbow never prevents browser key behaviour');
  return event;
};
const down = (code = 'ArrowLeft', options, target) => key('keydown', code, options, target);
const up = (code = 'ArrowLeft', options, target) => key('keyup', code, options, target);
const clear = () => window.dispatchEvent(new window.Event('blur'));
assert.equal(overlay.getAttribute('aria-hidden'), 'true');
assert.equal(overlay.hasAttribute('tabindex'), false);
assert.equal(active(), false);
assert.equal(scheduled, 0, 'No idle timers or animation frames on mount');

for (const [first, second] of [['ArrowLeft', 'ArrowRight'], ['ArrowRight', 'ArrowLeft']]) {
  down(first);
  assert.equal(active(), true);
  assert.equal(overlay.dataset.direction, first === 'ArrowLeft' ? 'left' : 'right');
  down(second);
  assert.equal(active(), true);
  assert.equal(overlay.dataset.direction, second === 'ArrowLeft' ? 'left' : 'right');
  down(first, { repeat: true });
  assert.equal(overlay.dataset.direction, second === 'ArrowLeft' ? 'left' : 'right', 'Repeats do not steal direction');
  up(second);
  assert.equal(active(), true);
  assert.equal(overlay.dataset.direction, first === 'ArrowLeft' ? 'left' : 'right', 'Remaining arrow chooses direction');
  up(first);
  assert.equal(active(), false, 'Final keyup removes active class for CSS fade');
}
down('ArrowLeft'); down('ArrowRight'); up('ArrowLeft');
assert.equal(active(), true);
assert.equal(overlay.dataset.direction, 'right');
up('ArrowRight');
down('ArrowLeft', { repeat: true });
assert.equal(active(), false, 'Orphan repeats cannot start a hold');
for (const modifier of ['ctrlKey', 'metaKey', 'altKey', 'shiftKey', 'isComposing']) {
  down('ArrowLeft', { [modifier]: true });
  assert.equal(active(), false, `${modifier} skips activation`);
}
down('ArrowUp');
assert.equal(active(), false);
focused = false; down(); assert.equal(active(), false); focused = true;
hidden = true; down(); assert.equal(active(), false); hidden = false;
document.designMode = 'ON'; down(); assert.equal(active(), false); document.designMode = 'off';
const cancelled = new window.KeyboardEvent('keydown', { key: 'ArrowLeft', code: 'ArrowLeft', bubbles: true, cancelable: true });
cancelled.preventDefault();
page.dispatchEvent(cancelled);
assert.equal(active(), false, 'Already-consumed events skip activation');

for (const html of [
  '<input>', '<textarea></textarea>', '<select></select>', '<iframe></iframe>',
  '<div role="slider"><span></span></div>', '<div role="tablist"><span></span></div>',
  '<svg><g class="play-square" role="button" tabindex="0"><rect></rect></g></svg>',
  '<div contenteditable><span></span></div>', '<div contenteditable="true"><span></span></div>',
]) {
  page.innerHTML = html;
  const control = page.querySelector('span, input, textarea, select, iframe, rect') ?? page.firstElementChild;
  control.focus();
  down('ArrowLeft', {}, control);
  assert.equal(active(), false, `Control keeps arrows: ${html}`);
}
for (const html of [
  '<button class="name-letter"><span></span></button>', '<a href="#"><span></span></a>',
  '<details><summary><span></span></summary></details>', '<div tabindex="0"><span></span></div>',
]) {
  page.innerHTML = html;
  const control = page.querySelector('span');
  control.parentElement.focus();
  down('ArrowLeft', {}, control);
  assert.equal(active(), true, `Buttons and links do not block the rainbow: ${html}`);
  clear();
}
page.innerHTML = '<div contenteditable="false"></div>';
down('ArrowLeft', {}, page.firstElementChild);
assert.equal(active(), true, 'Explicitly non-editable page content is allowed');
clear();
page.innerHTML = '<div id="shadow-host"></div>';
const shadow = page.firstElementChild.attachShadow({ mode: 'open' });
shadow.innerHTML = '<input><span></span>';
down('ArrowLeft', {}, shadow.querySelector('input'));
assert.equal(active(), false, 'Composed path protects shadow-root controls');
page.innerHTML = '<input>';
down();
page.firstElementChild.focus();
up('ArrowLeft', { shiftKey: true }, page.firstElementChild);
assert.equal(active(), false, 'Keyup still releases after focus or modifiers change');
down();
up('ArrowLeft', { key: 'Different', code: 'ArrowLeft' });
assert.equal(active(), false, 'Held Set is keyed by physical code');

for (const stop of [clear, () => down('Escape'), () => {
  hidden = true;
  document.dispatchEvent(new window.Event('visibilitychange'));
  hidden = false;
}]) {
  down(); down('ArrowRight');
  stop();
  assert.equal(active(), false, 'Blur / Escape / hidden clears every held key');
  down('ArrowRight', { repeat: true });
  assert.equal(active(), false, 'Cancellation cannot be undone by stale repeats');
}
for (const reduced of [false, true]) {
  preference.matches = reduced;
  for (const arrow of ['ArrowLeft', 'ArrowRight']) {
    down(arrow);
    assert.equal(active(), true, `${arrow} activates with reduced motion ${reduced}`);
    assert.equal(overlay.dataset.direction, arrow === 'ArrowLeft' ? 'left' : 'right');
    down(arrow, { repeat: true });
    assert.equal(document.querySelectorAll('.rainbow-bar.is-active').length, 1, 'Repeated holds never add another overlay');
    up(arrow);
    assert.equal(active(), false, 'Key release clears the hold under either preference');
  }
}
down();
preference.matches = false;
preference.dispatchEvent(new window.Event('change'));
assert.equal(active(), true, 'Changing motion preference does not clear an active hold');
assert.equal(overlay.dataset.direction, 'left');
preference.matches = true;
preference.dispatchEvent(new window.Event('change'));
assert.equal(active(), true, 'Enabling reduced motion also preserves the active hold');
up();
assert.equal(active(), false);
assert.equal(registrations.filter(item => item.target === preference).length, 0, 'No motion-preference listeners are installed');
assert.equal(scheduled, 0, 'Neither holds nor fades schedule JS timers or frames');

// JSDOM cannot animate: inspect CSS guarantees; visual smoothness needs a browser.
const css = readFileSync(new URL('../src/motion/RainbowBar.css', import.meta.url), 'utf8');
assert.match(css, /position:\s*absolute/);
assert.match(css, /inset:\s*0/);
assert.match(css, /pointer-events:\s*none/);
assert.match(css, /opacity:\s*0;/);
assert.match(css, /transition:\s*opacity 0\.4s ease/);
assert.match(css, /animation-play-state:\s*paused/);
assert.match(css, /\.rainbow-bar\.is-active\s*\{\s*opacity:\s*0\.55;\s*animation-play-state:\s*running, running/);
assert.match(css, /\.rainbow-bar\.is-active::before\s*\{[^}]*animation-play-state:\s*running/, 'The aurora layer runs while held');
assert.match(css, /\.rainbow-bar\s*\{[^}]*animation-play-state:\s*paused, paused/);
assert.match(css, /\.rainbow-bar::before\s*\{[^}]*animation-play-state:\s*paused;/, 'The aurora layer does not animate while idle');
assert.match(css, /@keyframes rainbow-sweep/);
assert.match(css, /rainbow-sweep 1\.2s/, 'The sweep runs twice as fast as the original 2.4s');
assert.match(css, /@keyframes aurora-drift/, 'A second drifting aurora layer exists');
assert.match(css, /@keyframes aurora-hue/, 'Colours rotate like aurora lights');
assert.match(css, /filter:\s*hue-rotate/, 'The hue animation is declared');
const reducedCss = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
assert.match(reducedCss, /^@media/, 'The deliberate reduced-motion exception exists');
assert.match(reducedCss, /\.rainbow-bar\s*\{[^}]*animation:\s*rainbow-sweep 1\.2s linear infinite paused[^;]*aurora-hue[^;]*paused\s*!important\s*;/, 'The actual sweep and hue shift override the global animation:none!important reset');
assert.match(reducedCss, /\.rainbow-bar::before\s*\{[^}]*animation:\s*aurora-drift[^}]*!important/, 'The aurora layer also runs under reduced motion');
assert.match(reducedCss, /\.rainbow-bar\s*\{[^}]*transition:\s*opacity 0\.4s ease\s*!important\s*;/, 'The fade also overrides the global reduced-motion transition reset');
assert.match(reducedCss, /\.rainbow-bar\.is-active\s*\{\s*animation-play-state:\s*running, running\s*!important\s*;/, 'Held arrows run the restored sweep and hue');
assert.match(reducedCss, /\.rainbow-bar\[data-direction='left'\]\s*\{\s*animation-direction:\s*reverse, reverse\s*!important\s*;/, 'Leftwards motion overrides the important animation shorthand');
const source = readFileSync(new URL('../src/motion/RainbowBar.jsx', import.meta.url), 'utf8');
assert.doesNotMatch(source, /\b(setTimeout|setInterval|requestAnimationFrame|preventDefault|stopPropagation)\s*\(/);
down();
await act(async () => root.unmount());
assert.equal(active(), false, 'Unmount clears active class on the detached node');
assert.ok(registrations.length > 0);
assert.ok(registrations.every(item => item.removed), 'Every keyboard, blur and visibility listener removed, including Strict Mode replay');
assert.equal(registrations.filter(item => item.target === preference).length, 0, 'No media subscriptions require cleanup');
down();
assert.equal(active(), false, 'Unmounted component cannot reactivate');
assert.equal(scheduled, 0);
dom.window.close();
console.log('PASS: rainbow holds/direction, all keyboard guards, focus-loss reset, both motion preferences, CSS sweep exception and fade and listener cleanup; no JS timers.');
