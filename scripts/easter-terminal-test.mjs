import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const MAX_BLOCKS = 120; // Kept in step with MAX_BLOCKS in Terminal.jsx.

const dom = new JSDOM(
  `<!doctype html><html><body>
    <div id="root">
      <main id="page">
        <button id="seed" type="button">seed</button>
        <a id="link" href="#about">about</a>
        <footer class="footer-landing" id="land"></footer>
      </main>
    </div>
  </body></html>`,
  { url: 'https://example.test/', pretendToBeVisual: true },
);
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let hidden = false;
Object.defineProperty(document, 'hidden', { get: () => hidden, configurable: true });
const preference = new window.EventTarget();
preference.matches = false;
window.matchMedia = () => preference;

const { default: React, act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { default: Terminal } = await import('../src/motion/Terminal.jsx');
const { registerCommand, getCommands } = await import('../src/motion/terminalCommands.js');
const { about, education, profile } = await import('../src/data/content.js');

// Track exact listener identities, including StrictMode's setup/cleanup cycle.
const registrations = [];
for (const target of [window, document, preference]) {
  const add = target.addEventListener.bind(target);
  const remove = target.removeEventListener.bind(target);
  target.addEventListener = (type, listener, options) => {
    if (['keydown', 'keyup', 'visibilitychange', 'change'].includes(type)) {
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

// The panel is mounted inside .footer-landing on purpose. That band has
// `contain: layout paint`, so anything rendered inside it is cropped; the portal
// is what keeps the full-screen overlay out of trouble. Mounting it here proves
// the portal escapes, rather than only proving it in production.
const page = document.getElementById('page');
const seed = document.getElementById('seed');
const link = document.getElementById('link');
const host = document.getElementById('land');
const scratch = document.createElement('div');
page.appendChild(scratch);
const root = createRoot(host);
await act(async () => root.render(React.createElement(React.StrictMode, null, React.createElement(Terminal))));

// Comments are stripped before the source assertions: the files document, in
// prose, the timers and storage they must not use.
const code = text => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');

const overlay = () => document.querySelector('.terminal-overlay');
const isOpen = () => Boolean(overlay());
const press = (target = page, options = {}) => {
  const event = new window.KeyboardEvent('keydown', {
    key: ';', code: 'Semicolon', bubbles: true, cancelable: true, composed: true, ...options,
  });
  target.dispatchEvent(event);
  return event;
};
const open = async (target = page) => {
  let event;
  // Inside act() so React flushes the open synchronously; the event object is
  // returned because defaultPrevented is part of the contract.
  await act(async () => { event = press(target); });
  return event;
};
const submit = async (text) => {
  document.querySelector('.terminal-input').value = text;
  const form = overlay().querySelector('.terminal-form');
  await act(async () => { form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })); });
};
const output = () => document.querySelector('.terminal-output').textContent;
const blocks = () => document.querySelectorAll('.terminal-block').length;
const escape = async () => {
  await act(async () => { document.activeElement.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); });
};

assert.equal(isOpen(), false, 'Nothing renders until the key is pressed');
assert.equal(host.childElementCount, 0, 'The closed panel renders no portal content at all');
assert.equal(scheduled, 0, 'No idle timers or animation frames on mount');

// --- the key is unclaimed only under these guards -----------------------------
assert.equal(press(page, { key: 'a' }).defaultPrevented, false, 'A letter is not ours and is left alone');
assert.equal(isOpen(), false);
for (const modifier of ['ctrlKey', 'metaKey', 'altKey', 'shiftKey']) {
  const event = press(page, { [modifier]: true });
  assert.equal(event.defaultPrevented, false, `${modifier} is left to the browser`);
  assert.equal(isOpen(), false, `${modifier} skips the panel`);
}
for (const option of [{ isComposing: true }, { repeat: true }]) {
  press(page, option);
  assert.equal(isOpen(), false, `${Object.keys(option)[0]} skips the panel`);
}
const consumed = new window.KeyboardEvent('keydown', { key: ';', code: 'Semicolon', bubbles: true, cancelable: true, composed: true });
consumed.preventDefault();
page.dispatchEvent(consumed);
assert.equal(isOpen(), false, 'An event another handler already consumed is not ours');
hidden = true;
press(page);
assert.equal(isOpen(), false, 'A hidden document cannot open a panel nobody can see');
hidden = false;
document.designMode = 'ON';
press(page);
assert.equal(isOpen(), false, 'Design mode is a text-editing context');
document.designMode = 'off';

for (const [html, selector, label] of [
  ['<input id="field">', '#field', 'input'],
  ['<textarea id="area"></textarea>', '#area', 'textarea'],
  ['<select id="pick"><option>a</option></select>', '#pick', 'select'],
  ['<div id="rich" contenteditable="true"><span id="rich-text">x</span></div>', '#rich-text', 'contenteditable'],
]) {
  scratch.innerHTML = html;
  scratch.querySelector(selector).focus();
  press(scratch.querySelector(selector));
  assert.equal(isOpen(), false, `Typing in a ${label} is never interrupted`);
}
const shadow = document.createElement('div');
scratch.appendChild(shadow);
const root2 = shadow.attachShadow({ mode: 'open' });
root2.innerHTML = '<input><span></span>';
root2.querySelector('input').focus();
press(root2.querySelector('input'));
assert.equal(isOpen(), false, 'A control in a shadow root keeps its keys, so composedPath is used');
// The clipboard fallback in CopyEmail.jsx briefly appends a real <textarea> to
// <body>. Reproduced literally, because that is the case the guard exists for.
const scratchTextarea = document.createElement('textarea');
document.body.appendChild(scratchTextarea);
scratchTextarea.focus();
press(scratchTextarea);
assert.equal(isOpen(), false, 'The clipboard fallback textarea is a text field too');
scratchTextarea.remove();
scratch.remove();
assert.equal(isOpen(), false, 'No guard was satisfied, so nothing is open');
assert.equal(scheduled, 0, 'Every rejected press still schedules nothing');

// --- opening, and the shape of the overlay ------------------------------------
seed.focus();
const opened = await open(seed);
assert.equal(isOpen(), true, 'An unmodified semicolon from ordinary content opens the panel');
assert.equal(opened.defaultPrevented, true, 'The semicolon is swallowed so no find bar opens behind the panel');
const panel = overlay();
assert.equal(panel.className, 'terminal-overlay', 'The root class is exactly the documented one');
assert.equal(panel.parentElement, document.body, 'Portalled to <body>, so no ancestor can crop it');
assert.equal(panel.closest('.footer-landing'), null, 'Never inside the contain: layout paint band');
assert.equal(document.getElementById('root').contains(panel), false, 'And never inside #top');
assert.equal(panel.getAttribute('role'), 'dialog', 'Announced as a dialog');
assert.equal(panel.getAttribute('aria-modal'), 'true', 'Announced as modal: the page behind is covered and unreachable');
assert.ok(panel.getAttribute('aria-label'), 'The dialog has an accessible name');
assert.equal(panel.querySelector('.terminal-output').getAttribute('aria-live'), 'polite', 'Output is announced politely');
assert.equal(panel.querySelector('.terminal-output').getAttribute('aria-atomic'), 'false', 'Only the new block is announced, not the whole scrollback');
const input = panel.querySelector('input.terminal-input');
assert.ok(input, 'The command entry is a real input');
assert.equal(input.tagName, 'INPUT');
assert.equal(input.type, 'text');
assert.equal(document.activeElement, input, 'Focus moves to the input on open');
assert.equal(document.body.style.overflow, 'hidden', 'The page behind cannot scroll');
assert.equal(host.childElementCount, 0, 'The mount point stays empty; the overlay lives in the portal');
assert.equal(scheduled, 0, 'Opening schedules no timer and no frame');

const typed = press(input);
assert.equal(typed.defaultPrevented, false, 'Typing a semicolon in the panel is left to the input');
assert.equal(document.querySelectorAll('.terminal-overlay').length, 1, 'A second overlay is never added');

// --- the registry -------------------------------------------------------------
const commands = getCommands();
assert.ok(Array.isArray(commands), 'getCommands() returns an array');
const names = commands.map(command => command.name);
assert.deepEqual(names, [...names].sort(), 'Commands come back sorted by name');
for (const name of ['about', 'clear', 'help', 'projects', 'stack', 'whoami']) {
  assert.ok(names.includes(name), `${name} is registered`);
}
assert.equal(names.includes('reset'), false, 'No feature owns a reset command, so this registry does not register one');
for (const command of commands) {
  assert.match(command.name, /^[a-z]+$/, 'Names are lower case and take no arguments');
  assert.equal(typeof command.help, 'string');
  assert.ok(command.help.length > 0 && !command.help.includes('\n'), 'Help is one plain line');
  assert.equal(typeof command.run, 'function');
  assert.ok(Object.keys(command).every(key => ['name', 'help', 'run', 'clear'].includes(key)), 'No unexpected entry fields');
  const lines = command.run();
  assert.ok(Array.isArray(lines), `${command.name} returns lines`);
  // `clear` is the one command that prints nothing on purpose.
  assert.ok(command.clear ? lines.length === 0 : lines.length > 0, `${command.name} ${command.clear ? 'prints nothing' : 'says something'}`);
  assert.ok(lines.every(line => typeof line === 'string'), `${command.name} returns only strings`);
}
assert.ok(getCommands().find(command => command.name === 'about').run().includes(about.paragraphs[0]), 'about prints the site copy verbatim');
const whoami = getCommands().find(command => command.name === 'whoami').run().join('\n');
assert.ok(whoami.includes(profile.legalName) && whoami.includes(education.school) && whoami.includes(education.major), 'whoami draws from profile and education');

registerCommand('ping', { help: 'Print a line back.', run: () => ['pong'] });
assert.doesNotThrow(() => registerCommand('ping', { help: 'Replaced by a later definition.', run: () => ['pong', 'again'] }), 'Registering a name twice does not throw');
const ping = getCommands().find(command => command.name === 'ping');
assert.equal(ping.help, 'Replaced by a later definition.', 'The later definition wins');
assert.deepEqual(ping.run(), ['pong', 'again']);

// --- running commands ---------------------------------------------------------
await submit('');
assert.equal(blocks(), 0, 'An empty line prints nothing');
await submit('ping');
assert.match(output(), /ping/, 'The typed command is echoed back');
assert.match(output(), /pong[\s\S]*again/, 'The returned lines are printed in order');
assert.equal(blocks(), 1);
await submit('nope');
assert.match(output(), /nope: no such command/, 'An unknown command fails politely, not loudly');
assert.equal(blocks(), 2);
registerCommand('boom', { help: 'Always fails.', run: () => { throw new Error('the machine said no'); } });
await submit('boom');
assert.match(output(), /the machine said no/, "A thrown Error's message is printed to the visitor");
assert.equal(isOpen(), true, 'A broken command does not take the session with it');
await submit('whoami');
assert.match(output(), /Sydney Computing Society/, 'Content commands keep working after a failure');
await submit('clear');
assert.equal(blocks(), 0, 'clear empties the scrollback');

await submit('help');
const helpText = output();
for (const command of getCommands()) {
  assert.ok(helpText.includes(command.name), `help lists ${command.name}`);
  assert.ok(helpText.includes(command.help), `help explains ${command.name}`);
}
await submit('clear');
await act(async () => {
  const field = document.querySelector('.terminal-input');
  const form = overlay().querySelector('.terminal-form');
  for (let index = 0; index < MAX_BLOCKS + 10; index++) {
    field.value = 'ping';
    form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  }
});
assert.equal(blocks(), MAX_BLOCKS, 'The scrollback is capped, so a pasted command cannot grow state without bound');
assert.equal(scheduled, 0, 'Printing 130 blocks still scheduled no timer and no frame');
await submit('clear');

// --- closing ------------------------------------------------------------------
await escape();
assert.equal(isOpen(), false, 'Escape closes the panel');
assert.equal(document.activeElement, seed, 'Focus returns to whatever had it');
assert.equal(document.body.style.overflow, '', 'The page can scroll again');
assert.equal(scheduled, 0, 'Closing schedules nothing either');

link.focus();
await open(link);
assert.equal(isOpen(), true, 'A link is ordinary content, not a text field');
await act(async () => { overlay().dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true, cancelable: true })); });
assert.equal(isOpen(), false, 'A press on the uncovered background closes the panel');
assert.equal(document.activeElement, link, 'and returns focus too');

await open();
await act(async () => {
  // A fresh query: each open remounts the portal, so the node captured on the
  // first open is detached and would not bubble anywhere.
  document.querySelector('.terminal-input').dispatchEvent(new window.FocusEvent('focusout', { bubbles: true, relatedTarget: seed }));
});
assert.equal(isOpen(), false, 'Tabbing or clicking out of the panel closes it rather than stranding it');

seed.focus();
await open();
await act(async () => { link.focus(); });
assert.equal(isOpen(), false, 'Moving focus to a control behind the panel also closes it');
assert.equal(document.activeElement, link, 'and focus is left where the reader put it, not yanked back');

seed.focus();
await open();
await escape();
assert.equal(isOpen(), false, 'Escape still undoes after the other close paths');
assert.equal(document.activeElement, seed);

// --- teardown -----------------------------------------------------------------
await act(async () => root.unmount());
assert.equal(isOpen(), false, 'Unmount removes the portal');
assert.equal(document.body.style.overflow, '', 'Unmount leaves the page scrollable');
assert.ok(registrations.length > 0, 'The keydown listener was installed');
assert.ok(registrations.every(item => item.removed), 'Every listener removed, including the StrictMode replay');
press(seed);
assert.equal(isOpen(), false, 'An unmounted panel cannot reopen');
assert.equal(scheduled, 0);

// JSDOM has no layout and no renderer: inspect the guarantees in the source.
const css = readFileSync(new URL('../src/motion/Terminal.css', import.meta.url), 'utf8');
assert.match(css, /\.terminal-overlay\s*\{[^}]*position:\s*fixed/, 'Fixed, not absolute, so it covers the viewport');
assert.match(css, /\.terminal-overlay\s*\{[^}]*inset:\s*0/);
assert.match(css, /\.terminal-overlay\s*\{[^}]*z-index:\s*200/, 'Above the skip link, deployed top and header');
for (const token of ['--surface', '--paper', '--ink', '--muted', '--line', '--accent']) {
  assert.ok(css.includes(`var(${token}`), `The ${token} token is used`);
}
assert.match(css, /background:\s*var\(--surface, var\(--paper/, 'The surface falls back to the page paper');
assert.match(css, /\.terminal-input\s*\{[^}]*caret-color:\s*var\(--accent/, 'The caret uses the accent token');
assert.match(css, /\.terminal-output\s*\{[^}]*overflow-y:\s*auto/, 'The scrollback is a scrolling region');
assert.match(css, /\.terminal-output\s*\{[^}]*overscroll-behavior:\s*contain/, 'Scrolling it does not scroll the page behind');
const reducedCss = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
assert.match(reducedCss, /^@media/, 'The reduced-motion decision is written down');
assert.match(reducedCss, /\.terminal-overlay\s*\{[^}]*animation:\s*none\s*!important/, 'Reduced motion means no motion at all here');
assert.equal(css.match(/@keyframes/g).length, 1, 'One keyframe, the fade, and nothing loops');

const source = code(readFileSync(new URL('../src/motion/Terminal.jsx', import.meta.url), 'utf8'));
assert.match(source, /createPortal\(/, 'Rendered through a portal');
assert.match(source, /document\.body,\s*\);/, 'The portal target is <body>');
assert.match(source, /className="terminal-overlay"/);
assert.match(source, /className="terminal-input"[\s\S]*?type="text"/, 'A real text input, not a contenteditable div');
assert.doesNotMatch(source, /\b(setTimeout|setInterval|requestAnimationFrame|requestIdleCallback)\b/);
assert.doesNotMatch(source, /\b(localStorage|sessionStorage|matchMedia)\b/, 'No storage, no media queries, no idle work');
assert.doesNotMatch(source, /motion\/react|matter-js/, 'No dependency the bundle would have to carry');

const registrySource = code(readFileSync(new URL('../src/motion/terminalCommands.js', import.meta.url), 'utf8'));
assert.match(registrySource, /from '\.\.\/data\/content'/, 'Commands draw their copy from the site content');
assert.doesNotMatch(registrySource, /\b(localStorage|sessionStorage|fetch|document|window|setTimeout)\b/);

dom.window.close();
console.log('PASS: semicolon guards, text-field and shadow-root guard, escape close and focus restore, live output, unknown/throw/clear handling, registry shape and help, body-level portal; no timers or frames.');
