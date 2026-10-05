import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

/*
 * The palette contract, which was broken in two directions at once: the data
 * file set --bg/--text/--surface/--border while the stylesheet read --paper/--ink
 * and never looked at the other three, and the page background was a literal,
 * so no palette could have changed it. Both halves are asserted here.
 *
 * A palette is now applied as a `data-palette` attribute on <html>, never as
 * inline custom properties, because a rule loses to an inline property and the
 * pre-paint script in index.html <head> has to be able to switch the theme by
 * setting one attribute before the first pixel. The eight values therefore live
 * in the stylesheet, in one [data-palette='…'] block per theme, and the only
 * thing JavaScript writes is the attribute. This suite asserts the new contract
 * as strictly as it asserted the old one: the attribute is set and cleared, the
 * inline style attribute stays empty (including stale values from the previous
 * build, which inline custom properties would still be winning with), and each
 * stylesheet block matches src/data/palettes.js token for token and value for
 * value, because the two are now duplicates that nothing enforces at runtime.
 *
 * JSDOM HAS NO CASCADE FOR CUSTOM PROPERTIES. It does not resolve var() out of
 * a stylesheet, and it does not report stylesheet-declared custom properties
 * through getComputedStyle at all. So this suite asserts three other things
 * instead, which is what it can actually prove:
 *   1. the data-palette attribute on <html> and the absence of any inline custom
 *      property, read back off the element, and
 *   2. the stylesheet text — the six attribute blocks compared against the data
 *      file, which tokens exist, which rules read them, and which tokens each
 *      locked section declares for itself.
 * What that leaves to a human with a browser is on the final lines.
 */

const dom = new JSDOM('<!doctype html><div id="host"></div>', { url: 'https://example.test/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { default: React, act } = await import('react');
const { createRoot } = await import('react-dom/client');
const root = document.documentElement;

// Importing the context module must be free of side effects. This runs before
// any render, and before anything else touches the document.
const { PaletteProvider, usePalette, BASE_PALETTE } = await import('../src/context/PaletteContext.jsx');
assert.equal(root.getAttribute('style'), null, 'Importing PaletteContext.jsx writes no inline style');
assert.equal(root.style.length, 0, 'Importing PaletteContext.jsx sets no custom properties');
assert.equal(root.hasAttribute('data-design'), false, 'Importing PaletteContext.jsx touches no attributes');

const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
const source = readFileSync(new URL('../src/context/PaletteContext.jsx', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const { palettes } = await import('../src/data/palettes.js');

const stripComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '');
// Leaf rules only: [^{}]+ { [^{}]* } cannot span a nested at-rule, so every match
// is one declaration block and the prefix is its selector (possibly with the
// enclosing @media prelude in front of it).
const rules = [...stripComments(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
  selector: match[1].trim(),
  body: match[2],
}));
const declarations = (body) => {
  const found = new Map();
  for (const part of body.split(';')) {
    const at = part.indexOf(':');
    if (at < 0) continue;
    found.set(part.slice(0, at).trim(), part.slice(at + 1).trim());
  }
  return found;
};
const ruleFor = (selector) => {
  const found = rules.filter((rule) => rule.selector.endsWith(selector));
  assert.equal(found.length, 1, `Exactly one stylesheet rule selects ${selector}`);
  return declarations(found[0].body);
};
const varNames = (text) => [...text.matchAll(/var\(\s*(--[a-z-]+)/g)].map((match) => match[1]);

/* Nothing in the palette path may write a custom property onto <html> any more.
   The stylesheet supplies the values, and an inline property would outrank
   every rule in it — including for a tab that was left open across the upgrade,
   which is why this is checked after a value has been planted, not just on a
   clean document. */
const assertNoInlineTokens = (label) => {
  const inline = root.getAttribute('style');
  assert.ok(inline === null || inline.trim() === '', `${label}: <html> has no inline style text, got ${JSON.stringify(inline)}`);
  assert.equal(root.style.length, 0, `${label}: <html> carries no inline declaration at all`);
  for (const token of TOKENS) {
    assert.equal(root.style.getPropertyValue(token), '', `${label}: <html> writes no inline ${token}`);
  }
};

/* 1. The data contract every other task depends on. */
const TOKENS = ['--paper', '--surface', '--ink', '--muted', '--line', '--accent', '--accent-soft', '--border'];
assert.deepEqual(palettes.map((p) => p.id), ['moonlit', 'parchment', 'tide', 'moss', 'slate', 'paper'], 'Palette order and ids are the panel\'s contract');
for (const palette of palettes) {
  assert.deepEqual(Object.keys(palette.vars), TOKENS, `${palette.id} sets exactly the eight documented tokens`);
  for (const token of TOKENS) {
    assert.equal(typeof palette.vars[token], 'string', `${palette.id} ${token} is a string`);
    assert.ok(palette.vars[token].length > 0, `${palette.id} ${token} is not empty`);
  }
  assert.notEqual(palette.vars['--line'], palette.vars['--border'], `${palette.id} keeps --line and --border as two different ideas`);
  assert.notEqual(palette.vars['--paper'], palette.vars['--surface'], `${palette.id} keeps the raised plane off the page colour`);
  assert.notEqual(palette.vars['--ink'], palette.vars['--paper'], `${palette.id} is readable: ink is not the page colour`);
  assert.ok(palette.name && palette.description, `${palette.id} still has a name and a description for the panel row`);
}

/* 2. The cream design is still the :root default, and is not one of the six. */
const rootVars = ruleFor(':root');
assert.equal(rootVars.get('background'), 'var(--paper)', 'The page background reads --paper instead of a literal');
assert.equal(rootVars.get('color'), 'var(--ink)', 'Body text reads --ink instead of a literal');
for (const [token, value] of Object.entries({
  '--paper': '#f5f4ed', '--surface': '#f5f4ed', '--ink': '#282a24', '--muted': '#686a60',
  '--line': '#d4d5c8', '--accent': '#64704e', '--accent-soft': '#d4ddad', '--border': '#d4d5c8',
})) {
  assert.equal(rootVars.get(token), value, `:root keeps the cream ${token}`);
}
assert.doesNotMatch(rootVars.get('background'), /#/, 'The page background is no longer a hard-coded colour');
assert.ok(palettes.every((p) => p.vars['--paper'] !== '#f5f4ed'), 'The shipped cream design is deliberately not one of the six palettes');

/* 2b. The base design is an exported value with a palette-shaped hole in it.
   The panel renders `palette` as a row, so position 0 of the cycle needs a name
   and a description; it is not in src/data/palettes.js, because "no palette
   applied" and "the design you know" have to be the same state. */
assert.equal(typeof BASE_PALETTE, 'object', 'BASE_PALETTE is exported from PaletteContext.jsx');
assert.notEqual(BASE_PALETTE, null);
assert.equal(BASE_PALETTE.id, 'base', 'The base design has the id the provider and the panel agree on');
assert.equal(BASE_PALETTE.name, 'Base', 'The base design has a name for the panel row');
assert.equal(BASE_PALETTE.description, 'Default cream', 'The base design has a description for the panel row');
assert.ok(!palettes.some((p) => p.id === BASE_PALETTE.id), 'The base design is not one of the six palettes');
assert.ok(!palettes.some((p) => p.id === 'base'), 'No palette in the data file claims the base id');

/* 2c. The six themes are stylesheet blocks keyed by the attribute, and they are
   a hand-maintained duplicate of src/data/palettes.js. Nothing at runtime checks
   they agree, so this does: every palette has exactly one block, the block
   declares exactly the eight tokens, and each value is the same text as the data
   file's. */
for (const palette of palettes) {
  const selector = `[data-palette='${palette.id}']`;
  const found = rules.filter((rule) => rule.selector === selector);
  assert.equal(found.length, 1, `Exactly one stylesheet block applies ${palette.id}`);
  const block = declarations(found[0].body);
  assert.deepEqual([...block.keys()], TOKENS, `${selector} declares exactly the eight documented tokens`);
  for (const token of TOKENS) {
    assert.equal(block.get(token), palette.vars[token], `${selector} declares ${token} exactly as src/data/palettes.js does`);
  }
}

/* 3. Every token has a reader. A token that is written but never read is the
   exact defect this suite exists for, so count the readers of all eight. */
for (const token of TOKENS) {
  const readers = rules.filter((rule) => varNames(rule.body).includes(token));
  assert.ok(readers.length > 0, `${token} is read by at least one rule`);
  assert.ok(readers.some((rule) => !rule.selector.endsWith(':root')), `${token} is read outside :root`);
}
const headerRule = rules.find((rule) => rule.selector.endsWith('.site-header'));
const header = declarations(headerRule.body);
assert.match(headerRule.body, /background:var\(--surface\);/, 'The header has an opaque --surface fallback under the tint');
assert.match(header.get('background'), /^color-mix\(in srgb, ?var\(--surface\) 96%, ?transparent\)$/, 'The header tint is 96% of the raised plane, as the old 96%-alpha cream was');
assert.equal(header.get('border-bottom'), '1px solid var(--border)', 'The header edge uses --border, not the content divider');
const menuBackgrounds = rules
  .filter((rule) => rule.selector.includes('.nav-menu'))
  .map((rule) => declarations(rule.body).get('background'))
  .filter(Boolean);
assert.deepEqual(menuBackgrounds, ['var(--surface)'], 'The mobile nav panel is the same raised plane as the header');
const selection = declarations(rules.find((r) => r.selector.includes('::selection')).body);
assert.equal(selection.get('background'), 'var(--accent-soft)', 'The selection wash is the soft accent');
assert.equal(selection.get('color'), '#22271a', 'The selection text keeps the original near-black: it is a fixed dark-on-pale pair, not a token');
// ...which is only safe because every soft accent is a pale opaque tint. Check it
// rather than trust it, so a translucent value cannot quietly come back.
const luminance = (hex) => {
  const channel = (value) => {
    const scaled = parseInt(value, 16) / 255;
    return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = hex.match(/[0-9a-f]{2}/g).map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};
for (const [label, value] of [['the cream default', rootVars.get('--accent-soft')], ...palettes.map((p) => [p.id, p.vars['--accent-soft']])]) {
  assert.match(value, /^#[0-9a-f]{6}$/, `${label} soft accent is an opaque hex, so the fixed selection text has something to sit on`);
  assert.ok(contrast(value, '#22271a') >= 4.5, `${label} soft accent keeps selected text above 4.5:1 (got ${contrast(value, '#22271a').toFixed(2)})`);
}

/* 4. Mounting the provider applies a palette by attribute only, and cycling
   behaves. Nothing is written onto <html>'s inline style, so the check that
   used to read eight custom properties back off it is now the opposite check:
   the style attribute stays empty, including after a stale value from the
   previous build is planted on it, because an inline custom property outranks
   every rule in the stylesheet and nothing writes it any more. */
let seen = null;
const Probe = () => { seen = usePalette(); return null; };
const host = document.getElementById('host');
await act(async () => createRoot(host).render(React.createElement(PaletteProvider, null, React.createElement(Probe))));

/* The contract the panel consumes, asserted as a set of requirements rather than
   an exact key list: the keys the panel reads must all be there, and a future
   key may be added, but nothing the panel needs can quietly disappear. */
for (const key of ['palette', 'index', 'total', 'next', 'prev', 'setById', 'palettes']) {
  assert.ok(key in seen, `usePalette still returns ${key}, which the design panel consumes`);
}
assert.ok('isBase' in seen, 'usePalette returns isBase, which the design panel consumes');
assert.equal(typeof seen.isBase, 'boolean', 'isBase is a boolean, not a truthy value the panel has to coerce');
assert.equal(seen.total, palettes.length, 'total is the number of palettes, so the panel counter is not hard-coded');
assert.equal(seen.total, 6, 'There are six palettes');
assert.equal(typeof seen.next, 'function', 'next is callable, so the panel can render a button');
assert.equal(typeof seen.prev, 'function', 'prev is callable, so the panel can render a button');
assert.equal(typeof seen.setById, 'function', 'setById is callable, so a swatch click does something');
assert.deepEqual(seen.palettes.map((p) => p.id), palettes.map((p) => p.id), 'The six palettes reach the panel in list order');

/* The base design: position 0, no attribute, and not one of the six. */
assert.equal(seen.isBase, true, 'A first load in a new tab is the cream design, not a palette');
assert.equal(seen.index, 0, 'The cream design is position 0 of the cycle');
assert.equal(seen.palette.id, 'base', 'The cream design is handed to the panel under the base id');
assert.equal(root.getAttribute('data-palette'), null, 'The cream design carries no data-palette attribute at all');
assertNoInlineTokens('On mount, showing the cream design');

const assertPaletteInForce = (position, palette) => {
  assert.equal(seen.index, position, `The cycle position is ${position} on ${palette.id}`);
  assert.equal(seen.palette.id, palette.id, `${palette.id} is the palette the panel is handed`);
  assert.equal(seen.isBase, false, `${palette.id} is not the base design`);
  assert.equal(root.getAttribute('data-palette'), palette.id, `${palette.id} is applied by the data-palette attribute`);
  assertNoInlineTokens(`While ${palette.id} is in force`);
};
act(() => seen.next());
assertPaletteInForce(1, palettes[0]);

/* Every palette, applied by a pick from the panel. Each iteration moves away
   from the theme in force first, so setById always has a real change to make and
   the layout effect always re-runs. */
for (const palette of palettes) {
  act(() => seen.setById(palette.id === 'moonlit' ? 'tide' : 'moonlit'));
  act(() => seen.setById(palette.id));
  assertPaletteInForce(palettes.indexOf(palette) + 1, palette);
  assert.equal(root.hasAttribute('data-design'), false, `${palette.id} clears the retired data-design attribute`);
}
act(() => seen.next());
assert.equal(seen.index, 1, 'next wraps from the last palette to the first');
assert.equal(seen.palette.id, palettes[0].id, 'next from the last palette lands on the first one');
assert.equal(root.getAttribute('data-palette'), palettes[0].id, 'and it is the attribute that changed');
act(() => seen.prev());
assert.equal(seen.index, 6, 'prev wraps from the first palette to the last');
assert.equal(seen.palette.id, palettes[5].id, 'prev from the first palette lands on the last one');
act(() => seen.setById('nope'));
assert.equal(seen.index, 6, 'An unknown id changes nothing');
assert.equal(root.getAttribute('data-palette'), palettes[5].id, 'An unknown id leaves the applied theme alone');
act(() => seen.setById('base'));
assert.equal(seen.index, 6, "'base' is not a pick, so it cannot pin the cream design through the panel");
assert.equal(root.getAttribute('data-palette'), palettes[5].id, "and it leaves the applied theme alone too");

/* The upgrade case. A tab left open across the change from inline custom
   properties to the stylesheet still has those eight tokens on <html>, and an
   inline property outranks every rule in the stylesheet, so applying a palette
   has to take them off rather than only set the attribute. */
for (const token of TOKENS) root.style.setProperty(token, 'stale');
assert.equal(root.style.length, TOKENS.length, 'A build from before the change really did leave eight inline tokens behind');
act(() => seen.setById('moss'));
assert.equal(root.getAttribute('data-palette'), 'moss', 'the new theme is applied by the attribute');
assertNoInlineTokens('applying a palette removes the stale inline tokens an older build left behind');

act(() => seen.setById('tide'));
assert.equal(root.getAttribute('data-palette'), 'tide', 'The applied theme is the one that was selected');
assert.equal(seen.index, 3, 'and the cycle position says so');
assertNoInlineTokens('With tide applied');

/* 5. The two fixed bands cannot be repainted by anything written above them.
   Tide is the applied theme right now, so the checks below run with a dark
   theme in force. The proof is not a colour comparison — it is that each band
   declares every token it reads, on its own rule, and reads nothing a palette
   writes. */
const rootTokens = new Set(TOKENS);
for (const band of [
  { selector: '.experience-section', marker: 'experience', locals: { '--ink': '#f5f4ed', '--muted': '#b8c0ad', '--line': '#4b5444', '--accent': '#dceba6' } },
  { selector: '.community-section', marker: 'community', locals: { '--ink': '#f5f4ed', '--muted': '#d3dcf7', '--line': '#6d88d4', '--accent': '#f4d77c' } },
]) {
  const own = ruleFor(band.selector);
  for (const [token, value] of Object.entries(band.locals)) {
    assert.equal(own.get(token), value, `${band.selector} declares its own ${token}`);
  }
  assert.deepEqual(own.get('color'), 'var(--ink)', `${band.selector} paints its text with its own --ink`);
  assert.match(own.get('background'), /^#[0-9a-f]{6}$/, `${band.selector} keeps a literal background, not a palette token`);
  const used = rules
    .filter((rule) => rule.selector.includes(band.marker))
    .flatMap((rule) => varNames(rule.body))
    .filter((token) => rootTokens.has(token));
  const undeclared = [...new Set(used)].filter((token) => !(token in band.locals));
  assert.deepEqual(undeclared, [], `${band.selector} reads no palette token it has not declared for itself`);
  assert.deepEqual(
    [...new Set(used)].sort(),
    Object.keys(band.locals).sort(),
    `${band.selector} reads all four of its own tokens, so the check above is not passing on an empty set`,
  );
}
// Every attribute-keyed theme block is one of the six, and there is no block for
// the cream design: position 0 has no attribute at all, so there is nothing to
// undo when the visitor goes back to it.
const attributeBlocks = rules
  .filter((rule) => rule.selector.includes('[data-palette'))
  .map((rule) => rule.selector);
assert.deepEqual(
  attributeBlocks,
  palettes.map((p) => `[data-palette='${p.id}']`),
  'The only attribute-keyed palette blocks are the six palettes, one each, in list order',
);
assert.doesNotMatch(css, /\[data-palette=['"]?base/, 'There is no base block: the cream design is the :root default, reached by the attribute being absent');
assert.doesNotMatch(source, /\blocalStorage\b|\bsessionStorage\b/, 'The site stores nothing that outlives a tab');
assert.doesNotMatch(source, /\napplyPalette\(/, 'applyPalette is no longer called at module scope');
assert.doesNotMatch(source, /\.style\.setProperty\b/, 'The provider never writes an inline custom property; the stylesheet supplies the values');
assert.match(source, /useLayoutEffect/, 'The palette is applied from the provider layout effect');
assert.match(source, /function applyPalette[\s\S]*?document\.documentElement/, 'applyPalette is still the thing that touches <html>');
assert.equal(root.style.length, 0, 'No palette token is written inline at the end of the run');
assert.equal(root.getAttribute('data-palette'), 'tide', 'Tide is still the applied theme at the end of the run');

dom.window.close();
console.log('PASS: eight-token palette contract; the six themes live in attribute-keyed stylesheet blocks that match');
console.log('      src/data/palettes.js value for value, are applied by a data-palette attribute on <html>, and leave no');
console.log('      inline custom property behind; the base design is exported and is position 0 with no attribute at all;');
console.log('      module import has no side effect, no storage, and the dark Experience band and blue Community band still');
console.log('      own every token they read.');
console.log('NOTE: asserted on the data-palette attribute and the inline style of <html>, and on the stylesheet text,');
console.log('      because JSDOM cannot resolve var() out of a stylesheet. Nothing here renders a colour. A human still');
console.log('      needs to look at: the cream design is byte-for-byte unchanged; each of the six themes as a whole page; the two');
console.log('      light themes (Parchment, Paper) against the dark Experience band and the blue Community band; selected');
console.log('      text; the sticky header over scrolling content; the footer landing bar, which takes var(--ink) inside');
console.log('      the contact band whose background is a fixed literal; and the hero artwork under the four dark');
console.log('      themes, since it is drawn with mix-blend-mode:multiply.');
