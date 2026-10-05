import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

/*
 * The design panel's unlock hook and the panel itself.
 *
 * What is proved here:
 *   1. the typed word "design" unlocks, and typing it again locks;
 *   2. the sequence is a six-keystroke sliding window that expires after two
 *      seconds, so a half-typed word neither sticks nor joins a later half;
 *   3. the keydown guards match src/motion/RainbowBar.jsx — modifiers, IME
 *      composition, an already-handled event and design mode all switch the
 *      hook off, and Escape is below those guards so a form field keeps its own
 *      Escape key;
 *   4. the composed path is honoured, so a control inside a shadow root still
 *      owns its keys;
 *   5. ?design unlocks on load;
 *   6. the panel renders when unlocked, renders nothing when locked, and every
 *      class its markup uses is defined in the stylesheet that ships with it;
 *   7. nothing is ever written to storage, and the hook and the panel still
 *      work when storage throws on every single access.
 *
 * JSDOM resolves no cascade, so nothing here proves what the panel looks like.
 * That is on the final lines, for a human with a browser.
 */

const dom = new JSDOM(
  '<!doctype html><div id="root"></div><main id="page"></main><input id="field"><div id="shadow-host"></div>',
  { url: 'https://example.test/', pretendToBeVisual: true },
);
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/* Every storage access in the run is recorded, so "nothing is written" is a
   fact and not a claim. A later section swaps in a storage that throws. */
const storageLog = [];
const recordingStorage = {
  get length() { storageLog.push(['length']); return 0; },
  key: (i) => { storageLog.push(['key', i]); return null; },
  getItem: (key) => { storageLog.push(['getItem', key]); return null; },
  setItem: (key, value) => { storageLog.push(['setItem', key, value]); },
  removeItem: (key) => { storageLog.push(['removeItem', key]); },
  clear: () => { storageLog.push(['clear']); },
};
const installStorage = (value) => {
  // Both spellings: window.localStorage for the hook and VersionContext, and
  // the bare global for MotionContext.jsx, which is how a browser resolves it.
  Object.defineProperty(window, 'localStorage', { value, configurable: true });
  try {
    Object.defineProperty(globalThis, 'localStorage', { value, configurable: true, writable: true });
  } catch {
    globalThis.localStorage = value;
  }
};
installStorage(recordingStorage);

const { default: React, act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { default: useDebugUnlock } = await import('../src/hooks/useDebugUnlock.js');
const { default: StylePanel } = await import('../src/components/StylePanel.jsx');
const { PaletteProvider } = await import('../src/context/PaletteContext.jsx');
const { MotionProvider } = await import('../src/context/MotionContext.jsx');
const { VersionProvider } = await import('../src/context/VersionContext.jsx');
const { palettes } = await import('../src/data/palettes.js');

const page = document.getElementById('page');
const field = document.getElementById('field');

// The hook's two-second window runs on window.setTimeout, so the window is
// tested on a fake clock, exactly as scripts/email-copy-test.mjs does. A real
// 2.1s sleep inside act() is what used to kill this suite: JSDOM's animation
// frame loop and React's act() scheduler keep feeding each other for as long
// as the await lasts, and two seconds of that is enough to exhaust the heap
// ("RangeError: Array buffer allocation failed", no stack, no test output).
// Advancing a fake clock proves the same thing instantly and repeatably.
const fakeTimers = new Map();
let nextTimer = 0;
let virtualNow = 0;
const installFakeClock = () => {
  window.setTimeout = (callback, delay) => {
    const id = ++nextTimer;
    fakeTimers.set(id, { callback, due: virtualNow + (Number(delay) || 0) });
    return id;
  };
  window.clearTimeout = (id) => fakeTimers.delete(id);
};
const restoreClock = () => {
  window.setTimeout = (callback, delay) => setTimeout(callback, delay);
  window.clearTimeout = (id) => clearTimeout(id);
};
// Runs every timer that comes due within `ms` of virtual time, in due order.
const advanceClock = (ms) => {
  const due = [...fakeTimers.entries()]
    .filter(([, timer]) => timer.due <= virtualNow + ms)
    .sort(([, a], [, b]) => a.due - b.due);
  for (const [id, timer] of due) {
    fakeTimers.delete(id);
    timer.callback();
  }
  virtualNow += ms;
  return due.length;
};

// A keydown, dispatched exactly as a browser would deliver it, flushed
// through act so the resulting state update is committed before the next line.
const press = async (key, options = {}, target = page) => {
  let event;
  await act(async () => {
    event = new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, composed: true, ...options });
    target.dispatchEvent(event);
  });
  return event;
};
// Likewise a real click, so the provider state update behind it is flushed too.
const click = async (element) => { await act(async () => { element.click(); }); };
const typeWord = async (word, options = {}, target = page) => {
  for (const character of word) await press(character, options, target);
};
// A key some other handler has already consumed.
const pressConsumed = async (key, target = page) => {
  const event = new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, composed: true });
  event.preventDefault();
  await act(async () => { target.dispatchEvent(event); });
};

/* 1-3. The hook on its own, mounted and unmounted repeatedly. */
let hook = null;
const HookProbe = () => { hook = useDebugUnlock(); return null; };
let host = document.createElement('div');
document.body.appendChild(host);
const root = createRoot(host);
const mountHook = async () => {
  await act(async () => root.render(React.createElement(React.StrictMode, null, React.createElement(HookProbe))));
  return hook;
};
// The root is kept and re-rendered into, never re-created: React remembers the
// container a root was made from. Rendering null unmounts the probe, which is
// what runs the hook's listener cleanup.
const unmountHook = async () => { await act(async () => root.render(null)); };
const unlocked = () => hook[0];

await mountHook();
assert.deepEqual(Object.keys(hook).length, 2, 'useDebugUnlock still returns exactly two values');
assert.equal(unlocked(), false, 'A plain URL leaves the panel locked');

await typeWord('design');
assert.equal(unlocked(), true, 'd-e-s-i-g-n unlocks');
await typeWord('design');
assert.equal(unlocked(), false, 'The same word again locks it again, so the gesture is a toggle');
await typeWord('design');
assert.equal(unlocked(), true, 'And again unlocks');

/* 2. The sliding window. Only the last six keystrokes can make the word, so a
   burst of unrelated typing cannot leave the buffer primed forever. */
await typeWord('qwertyui'); // eight keys: everything before them has fallen out of the window
await typeWord('design');
assert.equal(unlocked(), false, 'A partial word separated from its other half by more than six keys does not unlock');
await typeWord('de');
await typeWord('asdfgh'); // six keys, still inside the window
await typeWord('sign');
assert.equal(unlocked(), false, 'Six intervening keys still break the sequence, because the window is only six long');
await typeWord('design');
assert.equal(unlocked(), true, 'The word on its own still unlocks, so the junk above was not a lock-out');
await typeWord('design'); // back to locked for the next case
assert.equal(unlocked(), false);

installFakeClock();
await typeWord('des');
assert.equal(fakeTimers.size, 1, 'The half-typed word left one expiry pending on the fake clock');
assert.equal(advanceClock(1999), 0, 'Nothing expires one millisecond early');
assert.equal(advanceClock(1), 1, 'The expiry fires exactly on the two-second boundary');
await typeWord('ign');
assert.equal(unlocked(), false, 'The two-second window expires, so a half-typed word does not wait for its other half');
await typeWord('design');
assert.equal(unlocked(), true, 'Typing the whole word after the pause still works');
await typeWord('design');
restoreClock();

/* 3. Guards. Each of these is a way a keystroke is not the hook's to act on. */
for (const modifier of ['ctrlKey', 'metaKey', 'altKey']) {
  await typeWord('desig', { [modifier]: true });
  await press('n', { [modifier]: true });
  assert.equal(unlocked(), false, `${modifier} + design does not unlock`);
}
await typeWord('desig', { isComposing: true });
await press('n', { isComposing: true });
assert.equal(unlocked(), false, 'A keypress inside an IME composition does not unlock');
await typeWord('desig');
for (const character of 'ign') await pressConsumed(character);
assert.equal(unlocked(), false, 'A keypress another handler already consumed does not unlock');
document.designMode = 'on';
await typeWord('design');
assert.equal(unlocked(), false, 'designMode switches the gesture off');
await press('Escape');
document.designMode = 'off';
assert.equal(unlocked(), false, 'Escape locks nothing when the panel was never unlocked');
await typeWord('design');
assert.equal(unlocked(), true, 'The guards come off again with designMode');

/* Escape, below every guard. A form field keeps its own Escape key. */
await press('Escape', {}, field);
assert.equal(unlocked(), true, 'Escape typed into a text field does not lock the panel');
page.innerHTML = '<div contenteditable="true"><span id="editable">x</span></div>';
await press('Escape', {}, document.getElementById('editable'));
assert.equal(unlocked(), true, 'Escape typed into a contenteditable does not lock the panel');
page.innerHTML = '<div id="inner-shadow"></div>';
const inner = document.getElementById('inner-shadow').attachShadow({ mode: 'open' });
inner.innerHTML = '<input id="deep">';
await press('Escape', {}, inner.querySelector('#deep'));
assert.equal(unlocked(), true, 'The composed path finds an input inside a shadow root, not just event.target');
page.innerHTML = '';
await press('Escape');
assert.equal(unlocked(), false, 'Escape anywhere else locks the panel');

/* Typing is guarded by the same composed path. */
const shadowHost = document.getElementById('shadow-host');
shadowHost.innerHTML = '';
const shadow = shadowHost.attachShadow({ mode: 'open' });
shadow.innerHTML = '<input id="shadow-field">';
await typeWord('design', {}, shadow.querySelector('#shadow-field'));
assert.equal(unlocked(), false, 'Typing "design" inside a shadow-root field does not unlock');
await typeWord('design');
assert.equal(unlocked(), true, 'The same word on the page itself does');
await typeWord('design');
await unmountHook();

/* 4. ?design. The module is already loaded, so this proves readInitial reads
   the URL on every mount rather than once at import. */
dom.reconfigure({ url: 'https://example.test/?design' });
assert.equal(new window.URLSearchParams(window.location.search).has('design'), true, 'JSDOM really did reconfigure the URL');
await mountHook();
assert.equal(unlocked(), true, '?design unlocks on load, with no keypress and no storage');
await unmountHook();
dom.reconfigure({ url: 'https://example.test/' });
await mountHook();
assert.equal(unlocked(), false, 'Without the flag it is locked again, so nothing was remembered');
await unmountHook();

/* 5-6. The panel, in the provider stack another writer is mounting in App.jsx. */
const providers = (child) => React.createElement(
  PaletteProvider,
  null,
  React.createElement(MotionProvider, null, React.createElement(VersionProvider, null, child)),
);
const panelHost = document.createElement('div');
document.body.appendChild(panelHost);
const panelRoot = createRoot(panelHost);
await act(async () => panelRoot.render(providers(React.createElement(StylePanel))));
assert.equal(document.querySelector('.style-panel'), null, 'The locked panel renders nothing at all');
await typeWord('design');
const panel = document.querySelector('.style-panel');
assert.ok(panel, 'The panel is in the document once unlocked');
assert.equal(panel.parentNode, panelHost, 'The panel is mounted where it was asked for, with no portal of its own');

/* The fixed selector contract the other two writers are coding against. */
const controls = [...panel.querySelectorAll('button')];
assert.ok(controls.length >= 8, `The panel has its buttons (found ${controls.length})`);
assert.equal(
  panel.querySelectorAll('button:not(.panel-control)').length,
  0,
  'Every interactive control inside the panel carries panel-control',
);
assert.deepEqual(
  controls.map((button) => button.getAttribute('aria-label')).filter((label) => label?.startsWith('Previous')),
  ['Previous colors', 'Previous motion'],
  'The cycling arrows keep their names',
);
assert.equal(panel.querySelector('.panel-close').getAttribute('aria-label'), 'Hide design panel');

/* The swatch gradient reads the tokens the palettes actually define. The old
   code asked for --bg, which no longer exists, and inlined the word "undefined". */
const swatch = panel.querySelector('.swatch');
assert.match(swatch.getAttribute('style'), new RegExp(palettes[0].vars['--paper']), 'The swatch gradient starts from the palette paper colour');
assert.match(swatch.getAttribute('style'), new RegExp(palettes[0].vars['--accent']), 'and ends on its accent');
assert.doesNotMatch(swatch.getAttribute('style'), /undefined/, 'No missing token leaks the word undefined into a style');
assert.equal(panel.querySelectorAll('.swatch').length, palettes.length, 'One swatch per palette, in palette order');
assert.ok(!panel.textContent.includes('undefined'), 'No missing value reaches the panel text either');

/* Selecting a palette. The first swatch is clicked rather than assumed active,
   because the provider may be showing the site's own cream design, in which
   case no swatch is pressed and the row says so instead of pretending. */
await click(panel.querySelectorAll('.swatch')[2]);
assert.equal(panel.querySelectorAll('.swatch.active').length, 1, 'Exactly one swatch is active once a palette is chosen');
assert.equal(panel.querySelectorAll('.swatch')[2].getAttribute('aria-pressed'), 'true', 'And it is the one that was clicked');
assert.equal(panel.querySelectorAll('.swatch')[2].className.includes('active'), true, 'The active swatch carries the class as well as the state');
assert.equal(panel.querySelector('.panel-count').textContent, '3 / 6', 'Tide is the third of the six');
assert.equal(
  document.documentElement.getAttribute('data-palette'),
  palettes[2].id,
  'and the document follows the chosen palette',
);

/* Cycling actually cycles. */
await click(panel.querySelector('[aria-label="Next colors"]'));
assert.equal(panel.querySelector('.panel-count').textContent, '4 / 6', 'The next arrow steps along the six');
await click(panel.querySelector('[aria-label="Previous colors"]'));
assert.equal(panel.querySelector('.panel-count').textContent, '3 / 6', 'The previous arrow steps back');
assert.equal(panel.querySelectorAll('.swatch')[2].getAttribute('aria-pressed'), 'true', 'and the pressed swatch follows');

/* The hero switch and the motion list are wired to their contexts. */
assert.match(panel.querySelector('.panel-version').textContent, /Switch to physics hero|Physics \(v2\)/);
await click(panel.querySelector('.panel-version'));
assert.match(panel.querySelector('.panel-version').textContent, /Physics \(v2\)|Switch back to classic/);
assert.equal(new window.URLSearchParams(window.location.search).has('v2'), false, 'The version lives in state, not in the URL');
await click(panel.querySelector('.panel-expand'));
assert.ok(panel.querySelector('.motion-list'), 'The expanded panel lists the motion styles');
assert.ok(panel.querySelectorAll('.motion-option').length >= 2, 'There is more than one motion style to list');
assert.match(panel.querySelector('.panel-expand').textContent, /Hide motion list/);
assert.equal(panel.classList.contains('is-expanded'), true, 'and the modifier class is on while it is open');
await click(panel.querySelector('.panel-expand'));
assert.equal(panel.querySelector('.motion-list'), null, 'Collapsing removes the list again');
assert.equal(panel.classList.contains('is-expanded'), false, 'and drops the modifier class');
assert.equal(panel.querySelectorAll('.panel-control').length, panel.querySelectorAll('button').length, 'Still every button, with the modifier class added and removed with it');

/* Every class the markup uses has to exist in the stylesheet that ships with
   it, because before this task none of them was defined anywhere. */
const componentSource = readFileSync(new URL('../src/components/StylePanel.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/components/StylePanel.css', import.meta.url), 'utf8');
const used = new Set();
for (const [, quoted] of componentSource.matchAll(/className="([^"]*)"/g)) {
  quoted.split(/\s+/).filter(Boolean).forEach((name) => used.add(name));
}
for (const [, template] of componentSource.matchAll(/className=\{`([^`]*)`\}/g)) {
  template.replace(/\$\{[^}]*\}/g, ' ').split(/\s+/).filter((name) => /^[a-z][a-z0-9-]*$/.test(name)).forEach((name) => used.add(name));
}
assert.ok(used.size >= 17, `The class list was parsed out of the component (${used.size} classes)`);
for (const name of used) {
  assert.match(css, new RegExp(`\\.${name}\\b`), `.${name} is styled in StylePanel.css`);
}
// The three classes that only ever appear as a second name in a compound
// selector, so the loop above cannot see them.
assert.match(css, /\.style-panel\.is-expanded\b/, '.is-expanded has a rule');
assert.match(css, /\.swatch\.active\b/, '.swatch.active has a rule');
assert.match(css, /\.motion-option\.active\b/, '.motion-option.active has a rule');
assert.match(css, /\.style-panel\s*\{[^}]*position:\s*fixed/, 'The panel is fixed, so it does not take layout space');
assert.match(css, /\.style-panel\s*\{[^}]*z-index:\s*50;/, 'z-index 50: above the page, below the deployed top (60), the skip link (100) and the terminal (200)');
assert.match(css, /\.style-panel\s*\{[^}]*right:\s*16px[^}]*bottom:\s*16px/, 'Bottom right, clear of the sticky header and the deployed top');
assert.match(css, /\.panel-control\s*\{/, 'The panel-control contract has a base rule');
assert.doesNotMatch(css, /z-index:\s*(?:[6-9]\d|[1-9]\d\d)/, 'No layer above the deployed top, the skip link or the terminal');
assert.doesNotMatch(css, /position:\s*fixed[^}]*#top|#top\s*\{/, 'The panel never touches #top, so the sticky header and fixed top stay put');
assert.match(css, /@media \(prefers-reduced-motion: reduce\)/, 'The entrance fade is switched off for reduced motion');
assert.match(css, /var\(--surface|var\(--paper|var\(--ink|var\(--muted|var\(--line|var\(--accent/, 'The panel paints with the site\'s own tokens');
// Every literal colour in the file has to be a var() fallback, because that is
// the only reason a literal is allowed to be there at all. The one exception is
// the shadow's alpha ink, which is the same value index.css already uses.
const outsideVar = css
  .replace(/var\(--[a-z-]+,[^()]*(?:\([^()]*\))?[^()]*\)/g, 'TOKEN')
  .replace(/box-shadow:[^;]*;/g, '');
assert.doesNotMatch(outsideVar, /#[0-9a-f]{3,8}/i, 'Every colour is a token, and the only literals are the fallbacks inside var()');
for (const token of ['--paper', '--surface', '--ink', '--muted', '--line', '--accent']) {
  assert.ok(new RegExp(`${token},`).test(css) || css.includes(`var(${token})`), `${token} has a fallback after it`);
}

const hookSource = readFileSync(new URL('../src/hooks/useDebugUnlock.js', import.meta.url), 'utf8');
assert.doesNotMatch(hookSource, /localStorage|sessionStorage/, 'The hook stores nothing (Q4: remember nothing)');
assert.doesNotMatch(hookSource, /timwang-debug/, 'And the retired storage key is gone from the source');
assert.match(hookSource, /export default function useDebugUnlock\(\)/, 'The default export is unchanged');
assert.doesNotMatch(componentSource, /localStorage|sessionStorage/, 'The panel stores nothing either');

/* The panel again, this time with storage throwing on every access, which is
   what Safari Private Browsing and a blocked-site setting both look like to a
   page. The same panel, not a second copy of it: mounting a second full
   provider stack alongside the first one is what used to run this suite into
   the wall (V8 heap exhaustion, "RangeError: Array buffer allocation failed",
   with no stack and no test output). One stack, every control, storage dead. */
const hostileStorage = new Proxy({}, {
  get: (target, property) => {
    if (property === 'length' || typeof property === 'symbol') return 0;
    throw new Error(`storage disabled: read ${String(property)}`);
  },
});
installStorage(hostileStorage);
// The panel is the subject here, because the standalone probe was unmounted
// in section 4. Escape closes it and the word opens it again, which is the
// whole gesture working with every storage read and write throwing.
await press('Escape');
assert.equal(document.querySelector('.style-panel'), null, 'Escape closes the panel with storage disabled');
await typeWord('design');
assert.ok(document.querySelector('.style-panel'), 'And the word opens it again, because the gesture never touches storage');
// Escape unmounted the panel, so the node captured in section 6 is detached.
// Every control below is clicked on the panel that is in the document now.
const hostilePanel = document.querySelector('.style-panel');

/* Every control in the panel, exercised with storage still throwing. */
await click(hostilePanel.querySelectorAll('.swatch')[3]);
assert.equal(document.querySelectorAll('.swatch.active').length, 1, 'A palette swatch still applies');
await click(hostilePanel.querySelector('[aria-label="Next motion"]'));
assert.ok(document.querySelector('.panel-controls'), 'The motion arrows still step');
await click(hostilePanel.querySelector('.panel-version'));
assert.ok(document.querySelector('.panel-version'), 'The hero switch still toggles');
await click(hostilePanel.querySelector('.panel-expand'));
assert.ok(document.querySelector('.motion-list'), 'The motion list still opens');
await click(document.querySelectorAll('.motion-option')[1]);
assert.equal(document.querySelectorAll('.motion-option.active').length, 1, 'And a listed motion style can be chosen');
await press('Escape');
assert.equal(document.querySelector('.style-panel'), null, 'Escape still closes the panel');
installStorage(recordingStorage);
await act(async () => panelRoot.render(null));

/* Nothing about the unlock was ever written anywhere. */
assert.deepEqual(
  storageLog.filter(([, key]) => typeof key === 'string' && key.includes('debug')),
  [],
  'No debug key is read or written at any point in this run',
);
assert.deepEqual(
  storageLog.filter(([call]) => ['setItem', 'removeItem', 'clear'].includes(call)),
  [],
  'And nothing in this run wrote to localStorage at all (Q4: remember nothing)',
);

/* No provider reaches for storage either (Q4: remember nothing). A source
   check, not a mount-under-a-hostile-Proxy check: the providers have no
   storage code left to exercise, and proving that from the source is both
   stricter and cheaper than a second and third mount. */
for (const [label, path] of [
  ['MotionContext.jsx', '../src/context/MotionContext.jsx'],
  ['VersionContext.jsx', '../src/context/VersionContext.jsx'],
]) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  assert.doesNotMatch(source, /localStorage|sessionStorage/, `${label} stores nothing at all`);
}
const paletteSource = readFileSync(new URL('../src/context/PaletteContext.jsx', import.meta.url), 'utf8');
assert.doesNotMatch(paletteSource, /localStorage/, 'PaletteContext.jsx writes no localStorage either, and no storage at all now the colour cycle is gone');

dom.window.close();
console.log('PASS: typed word toggles unlock, six-key sliding window with a two-second expiry, modifier/composition/');
console.log('      consumed-event/designMode guards, Escape below those guards, composed-path typing, ?design on load,');
console.log('      locked panel renders null, every markup class styled, tokens-only CSS, and no storage at all.');
console.log('NOTE: JSDOM resolves no cascade, so nothing above proves what the panel looks like. A human needs to check:');
console.log('      the panel sits in the bottom-right corner clear of the sticky header, the docked and deployed top,');
console.log('      and the skip link; it stays readable and its rows still line up under a dark palette; the expanded');
console.log('      motion list scrolls inside the panel; and the 19rem width suits a narrow phone viewport.');
