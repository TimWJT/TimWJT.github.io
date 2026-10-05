import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><div id="root"></div><input id="other">', {
  url: 'https://example.test/', pretendToBeVisual: true,
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { default: React, act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { default: CopyEmail } = await import('../src/motion/CopyEmail.jsx');
const css = readFileSync(new URL('../src/motion/CopyEmail.css', import.meta.url), 'utf8');
const style = document.createElement('style');
style.textContent = css;
document.head.appendChild(style);

// Deterministic clock: verify replacement, duration, and unmount cleanup.
const timers = new Map();
let nextTimer = 0;
window.setTimeout = (callback, delay) => {
  const id = ++nextTimer;
  timers.set(id, { callback, delay });
  return id;
};
window.clearTimeout = id => timers.delete(id);
const EMAIL = 'Exact.Email+tag@example.test';
const FAILURE = 'Couldn’t copy — select the email instead.';
const root = createRoot(document.getElementById('root'));
await act(async () => root.render(React.createElement(React.StrictMode, null, React.createElement(CopyEmail, { email: EMAIL }))));
const button = document.querySelector('button');
const status = document.querySelector('[role="status"]');
// The live region is portalled to the end of the body, so it is never a
// descendant of the button and never a child of the contact links nav.
const live = document.querySelector('.contact-email-live');
const clipboard = value => Object.defineProperty(navigator, 'clipboard', { configurable: true, value });
const click = () => act(async () => { button.click(); });
const defer = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
function assertPresentation(message = '') {
  const action = button.querySelector('.contact-email-action');
  const failed = message === FAILURE;
  const success = message !== '' && !failed;
  // The region survives every update, and it is never a descendant of the
  // control that holds focus while the copy runs.
  assert.equal(document.querySelector('[role="status"]'), status, 'live region persists across updates');
  assert.equal(document.querySelectorAll('[role="status"]').length, 1);
  assert.equal(status, live);
  assert.equal(status.parentElement, document.body, 'live region is portalled out of the button');
  assert.equal(button.contains(status), false, 'live region is not a descendant of the button');
  assert.equal(status.isConnected, true, 'live region stays in the document on success');
  assert.equal(status.textContent, message);
  assert.equal(status.getAttribute('aria-atomic'), 'true');
  assert.equal(status.closest('[aria-hidden="true"]'), null, 'live region stays accessible');
  assert.equal(action.getAttribute('aria-hidden'), 'true', 'visual action is not announced twice');
  assert.equal(action.textContent, success ? message : 'Copy');
  assert.equal(action.querySelectorAll('svg').length, success ? 0 : 1);
  assert.equal(action.querySelector('.contact-email-action-label')?.textContent, success ? undefined : 'Copy');
  assert.equal(button.querySelector('.contact-email-address').textContent, EMAIL);
  // The failure sentence stays on screen for sighted readers while the live
  // region carries it for assistive technology, so it is never read twice.
  const visibleFailure = button.querySelector('.contact-email-failure');
  assert.equal(visibleFailure?.textContent ?? '', failed ? FAILURE : '');
  assert.equal(visibleFailure?.getAttribute('aria-hidden') ?? null, failed ? 'true' : null);
  const statusStyle = window.getComputedStyle(status);
  assert.notEqual(statusStyle.display, 'none');
  assert.notEqual(statusStyle.visibility, 'hidden');
  // Always clipped: the live region only ever talks, it is never shown.
  assert.equal(statusStyle.clipPath, 'inset(50%)');
  assert.equal(statusStyle.position, 'absolute');
  assert.equal(statusStyle.width, '1px');
  assert.equal(statusStyle.height, '1px');
  assert.equal(statusStyle.overflow, 'hidden');
  assert.equal(button.textContent, EMAIL + (success ? message : message + 'Copy'), 'one visible message, with email unchanged');
}
let fallbackCalls = 0;
document.execCommand = () => { fallbackCalls++; return false; };
assert.equal(button.type, 'button');
assert.equal(document.querySelector('a'), null);
assert.equal(status.getAttribute('aria-live'), 'polite');
assert.equal(status.textContent, '');
assert.equal(button.contains(status), false, 'announcement region is outside the focused button');
assert.equal(document.querySelectorAll('.contact-email-live').length, 1);
assert.equal(status.parentElement, document.body);
assert.equal(document.querySelector('.contact-email-address').textContent, EMAIL);
assertPresentation();
assert.equal(timers.size, 0);

const writes = [];
clipboard({ writeText: async value => { writes.push(value); } });
await click();
assert.deepEqual(writes, [EMAIL]);
assert.equal(fallbackCalls, 0);
assertPresentation('Copied!');
assert.equal(timers.size, 1);
assert.equal([...timers.values()][0].delay, 2500);
const firstTimer = [...timers.keys()][0];
await click();
assert.equal(timers.size, 1, 'repeat success replaces the timer');
assert.equal(timers.has(firstTimer), false);
const timer = [...timers.values()][0];
timers.clear();
await act(async () => timer.callback());
assert.equal(status.textContent, '', 'confirmation clears after 2500ms');
assertPresentation();

// Fallback selects the exact email, removes its temporary field and restores focus.
const other = document.getElementById('other');
const fallbackMessages = ['Copied again!', 'Copied again!', 'Same email!', 'Same email!'];
for (const api of [undefined, {}, { writeText: async () => { throw new Error('denied'); } }, { writeText: () => { throw new Error('sync denial'); } }]) {
  clipboard(api);
  other.focus();
  let field;
  document.execCommand = command => {
    fallbackCalls++;
    field = document.querySelector('textarea');
    assert.equal(command, 'copy');
    assert.equal(field.value, EMAIL);
    assert.equal(document.activeElement, field);
    assert.equal(field.selectionStart, 0);
    assert.equal(field.selectionEnd, EMAIL.length);
    return true;
  };
  await click();
  assertPresentation(fallbackMessages.shift());
  assert.equal(field.isConnected, false);
  assert.equal(document.querySelector('textarea'), null);
  assert.equal(document.activeElement, other);
}

// Failed legacy copies never show success, always clean up and remain selectable.
for (const exec of [() => false, () => { throw new Error('not supported'); }, undefined]) {
  clipboard({ writeText: async () => { throw new Error('denied'); } });
  document.execCommand = exec;
  button.focus();
  const selection = document.getSelection();
  const range = document.createRange();
  range.selectNodeContents(document.querySelector('.contact-email-address'));
  selection.removeAllRanges();
  selection.addRange(range);
  await click();
  assertPresentation(FAILURE);
  assert.equal(document.querySelector('textarea'), null);
  assert.equal(document.activeElement, button);
  assert.equal(selection.toString(), EMAIL, 'manual text selection restored');
  assert.equal(timers.size, 0, 'failure remains visible until the next attempt');
}

// Latest click wins: a slow rejection cannot replace newer success or run fallback.
const slow = defer();
const fast = defer();
let requests = 0;
clipboard({ writeText: () => (++requests === 1 ? slow.promise : fast.promise) });
await click();
assertPresentation();
await click();
assertPresentation();
await act(async () => fast.resolve());
assertPresentation('Same email!');
let staleFallback = 0;
document.execCommand = () => { staleFallback++; return false; };
await act(async () => slow.reject(new Error('late denial')));
assertPresentation('Same email!');
assert.equal(staleFallback, 0);
assert.equal(timers.size, 1);

// Unmount clears the confirmation timer, and pending promises do no further work.
await act(async () => root.unmount());
assert.equal(timers.size, 0);
for (const reject of [false, true]) {
  const pending = defer();
  clipboard({ writeText: () => pending.promise });
  const nextRoot = createRoot(document.getElementById('root'));
  await act(async () => nextRoot.render(React.createElement(CopyEmail, { email: EMAIL })));
  await act(async () => document.querySelector('button').click());
  await act(async () => nextRoot.unmount());
  await act(async () => reject ? pending.reject(new Error('late denial')) : pending.resolve());
  assert.equal(timers.size, 0);
  assert.equal(staleFallback, 0);
  assert.equal(document.querySelector('textarea'), null);
}
// Repeat copies escalate the confirmation; failures and a fresh mount do not count.
const expected = ['Copied!', 'Copied!', 'Copied again!', 'Copied again!', 'Same email!', 'Same email!', 'Same email!',
  'Just email me :)', 'Just email me :)', 'Just email me :)', 'Just email me :)', 'I’m flattered.', 'I’m flattered.'];
for (const remount of [false, true]) {
  const nextRoot = createRoot(document.getElementById('root'));
  await act(async () => nextRoot.render(React.createElement(CopyEmail, { email: EMAIL })));
  const copyButton = document.querySelector('button');
  for (const [index, message] of expected.entries()) {
    if (index === 4) {
      clipboard({ writeText: async () => { throw new Error('denied'); } });
      document.execCommand = () => false;
      await act(async () => copyButton.click());
      assert.equal(document.querySelector('[role="status"]').textContent, FAILURE, `remount ${remount}: failure in the middle of a streak`);
    }
    clipboard({ writeText: async () => {} });
    await act(async () => copyButton.click());
    assert.equal(document.querySelector('[role="status"]').textContent, message, `remount ${remount}: copy ${index + 1}`);
    assert.equal(copyButton.querySelector('.contact-email-action').textContent, message);
  }
  await act(async () => nextRoot.unmount());
  timers.clear();
}
assert.match(css, /user-select:\s*text/);
assert.doesNotMatch(css, /display:\s*none|visibility:\s*hidden/);
for (const match of css.replace(/\/\*[^]*?\*\//g, '').matchAll(/([^{}]+)\{/g)) {
  assert.ok(match[1].trim().startsWith('.contact-email'), 'all CSS selectors scoped to .contact-email');
}
assert.equal(window.location.href, 'https://example.test/', 'no navigation');
dom.window.close();
console.log('PASS: idle icon + Copy, success-only action, accessible live region outside the button, single visible failure, email clipboard success, denial fallback, exact selection, focus/textarea cleanup, repeat races, 2500ms timer, escalating repeat-copy confirmations and unmount cleanup.');
