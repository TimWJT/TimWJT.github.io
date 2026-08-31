// Headless render smoke test: mounts the real App in jsdom and asserts on the DOM.
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'https://timwjt.github.io/' + (process.env.HERO === 'physics' ? '?v2' : ''),
  pretendToBeVisual: true,
});

const { window } = dom;
globalThis.window = window;
globalThis.document = window.document;
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
globalThis.localStorage = window.localStorage;
globalThis.HTMLElement = window.HTMLElement;
globalThis.Element = window.Element;
globalThis.Node = window.Node;
globalThis.getComputedStyle = window.getComputedStyle;
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16);
globalThis.cancelAnimationFrame = clearTimeout;
globalThis.matchMedia = window.matchMedia = () => ({
  matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
});
class IO { constructor(cb) { this.cb = cb; } observe() {} unobserve() {} disconnect() {} }
globalThis.IntersectionObserver = window.IntersectionObserver = IO;
class RO { observe() {} unobserve() {} disconnect() {} }
globalThis.ResizeObserver = window.ResizeObserver = RO;


globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const errors = [];
const origError = console.error;
console.error = (...a) => { errors.push(a.map(String).join(' ')); origError(...a); };
const warns = [];
console.warn = (...a) => { warns.push(a.map(String).join(' ')); };

const React = (await import('react')).default;
const { createRoot } = await import('react-dom/client');
const App = (await import('../src/App.jsx')).default;

const root = createRoot(document.getElementById('root'));
const { act } = await import('react');
await act(async () => { root.render(React.createElement(App)); });
// Flush the lazy() Suspense boundary inside act so the physics hero is mounted
// before we assert, and React doesn't warn about an unwrapped resolution.
await act(async () => { await new Promise((r) => setTimeout(r, 400)); });

const html = document.getElementById('root').innerHTML;
const $ = (s) => document.querySelectorAll(s);
const checks = [];
const ok = (name, cond, extra = '') => checks.push([cond ? 'PASS' : 'FAIL', name, extra]);

ok('renders nav', $('nav.nav').length === 1);
ok('nav has 5 section links + resume', $('#nav-menu li').length === 6, `got ${$('#nav-menu li').length}`);
ok('mobile toggle present', $('button.nav-toggle').length === 1);
ok('skip link present', $('a.skip-link').length === 1);
ok('hero name rendered', html.includes('Tim Wang'));
ok('hero CTAs present', $('.hero-actions .btn').length >= 2, `got ${$('.hero-actions .btn').length}`);
ok('resume link points at pdf', !!document.querySelector('a[href$="Tim_Wang_Resume.pdf"]'));
ok('all 5 sections present', ['about','experience','projects','leadership','contact'].every((id) => document.getElementById(id)));
ok('education card + WAM', html.includes('78.88') && $('.edu-card').length === 1);
ok('experience entries = 2', $('#experience .timeline > li').length === 2, `got ${$('#experience .timeline > li').length}`);
ok('capstone listed', html.includes('Pancreas Segmentation'));
ok('RELT listed + linked', html.includes('Refugee English') && html.includes('reltutoring.org'));
ok('project cards = 7', $('#projects .card').length === 7, `got ${$('#projects .card').length}`);
ok('bot battle 2026 win shown', html.includes('1st of 94 teams'));
ok('bot battle 2026 repo linked', html.includes('bot-battle-2026'));
ok('featured cards = 2', $('#projects .card-featured').length === 2, `got ${$('#projects .card-featured').length}`);
ok('leadership orgs = 4', $('#leadership .timeline > li').length === 4, `got ${$('#leadership .timeline > li').length}`);
ok('SYNCS has 3 roles', $('#leadership .timeline > li:first-child .role-block').length === 3, `got ${$('#leadership .timeline > li:first-child .role-block').length}`);
ok('Notion campus leader kept', html.includes('Campus Leader'));
ok('Gym Society kept', html.includes('850+'));
ok('Piano Society kept', html.includes('Piano Society'));
ok('skill groups = 4', $('.skill-group').length === 4, `got ${$('.skill-group').length}`);
ok('no external link without rel=noreferrer',
  [...$('a[target="_blank"]')].every((a) => (a.getAttribute('rel') || '').includes('noreferrer')));
ok('every project card has a link', [...$('#projects .card')].every((c) => c.querySelector('a[href]')));
ok('no stale content (Tanks kept, old copy gone)', !html.includes('Godot 2D Platformer') && !html.includes('BFS tile placement'));
var PHYSICS = process.env.HERO === 'physics';

if (!PHYSICS) {
  ok('classic hero is the default', $('section.hero').length === 1 && $('.hero-physics').length === 0);
  ok('single copy of hero CTAs', $('.hero-actions').length === 1, `got ${$('.hero-actions').length}`);
  ok('hero text is selectable', getComputedStyle(document.querySelector('.hero')).userSelect !== 'none');
  ok('matter-js not loaded for classic hero', !html.includes('physics-token'));
} else {
  ok('physics hero mounted from ?v2', $('.hero-physics').length === 1, `got ${$('.hero-physics').length}`);
  ok('physics hero keeps the name + tagline', html.includes('Tim Wang') && html.includes('solving problems'));
  ok('physics hero keeps the resume CTA', !!document.querySelector('.physics-copy a[href$="Tim_Wang_Resume.pdf"]'));
  ok('play area hidden from screen readers', document.querySelector('.physics-scene')?.getAttribute('aria-hidden') === 'true');
  ok('shake control present', $('.physics-shake').length === 1);
  ok('survives a zero-size container without crashing', errors.length === 0, errors.slice(0,2).join(' | '));
}

ok('peel effect fully removed', !html.includes('peel-') && $('.peel-section, .peel-zone, .peel-reveal-layer').length === 0);
ok('style panel hidden by default', $('.style-panel').length === 0, `got ${$('.style-panel').length}`);

ok('no React errors logged', errors.length === 0, errors.slice(0, 3).join(' | '));

// --- scenario 2: the secret unlock reveals the debug panel ---
for (const ch of 'design') {
  await act(async () => {
    window.dispatchEvent(new window.KeyboardEvent('keydown', { key: ch, bubbles: true }));
  });
}
await new Promise((r) => setTimeout(r, 50));
ok('typing the secret reveals the panel', $('.style-panel').length === 1, `got ${$('.style-panel').length}`);
ok('panel has a close button', $('.panel-close').length === 1);
ok('unlock is persisted', window.localStorage.getItem('timwang-debug') === '1');

await act(async () => {
  window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
});
await new Promise((r) => setTimeout(r, 50));
ok('Escape hides the panel again', $('.style-panel').length === 0);
ok('unlock flag cleared on hide', window.localStorage.getItem('timwang-debug') === null);

console.log('\n--- smoke results ---');
for (const [status, name, extra] of checks) console.log(`${status}  ${name}${extra ? '  (' + extra + ')' : ''}`);
const failed = checks.filter((c) => c[0] === 'FAIL');
console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
if (warns.length) console.log('warnings:', warns.slice(0, 5));
process.exit(failed.length ? 1 : 0);
