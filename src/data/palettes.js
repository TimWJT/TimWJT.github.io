/*
 * The colour variable contract. These eight keys are the entire colour system
 * (plan Q2, Option C): every one of them is read by src/index.css, and applying
 * a palette means writing all eight onto <html> as inline custom properties.
 *
 *   --paper        the page itself (:root background), and the flip side of
 *                  --ink on a raised panel
 *   --surface      the one raised plane in the design — the sticky header and
 *                  the mobile nav panel, both of which sit above the page
 *   --ink          body text
 *   --muted        secondary text
 *   --line         structural hairlines: row dividers, section rules
 *   --accent       links, focus rings, emphasis
 *   --accent-soft  a wash of the accent, used behind ::selection
 *   --border       the softer edge of a raised plane, i.e. the header rule
 *
 * Renamed here in T5: --bg became --paper and --text became --ink, because
 * those are the names src/index.css had been using all along and only --muted
 * and --accent ever overlapped. --line is new. --surface, --accent-soft and
 * --border were already written in this file and had no reader anywhere; they
 * do now.
 *
 * NOTE for whoever revives the design panel: src/components/StylePanel.jsx
 * builds its swatch gradient from p.vars['--bg'], a key that no longer exists.
 * That call site has to read '--paper' (or '--surface'). T5 was not allowed to
 * edit StylePanel.jsx, so the swatches are currently unstyled gradients.
 *
 * Values are chosen per theme, never derived. Three rules worth stating,
 * because they are the reason the numbers below are not uniform:
 *   - --line is a solid warm tint on the light themes, matching the cream
 *     design's own #d4d5c8, and a translucent pale line on the dark ones. A
 *     solid grey hairline reads as a smudge at 1px on near-black.
 *   - --surface is always a visible step off --paper, so a raised panel is
 *     actually raised rather than a second name for the page.
 *   - --accent-soft is a pale OPAQUE tint, not a translucent accent, because
 *     ::selection in src/index.css puts one fixed near-black (#22271a, kept
 *     unchanged from the original design) on top of it in every theme. That is
 *     what keeps selected text readable on a near-black page as well as on a
 *     cream one, and it is why the bands' local --ink cannot be used there.
 *
 * The cream design the site ships with is deliberately NOT one of these six: it
 * lives in :root in src/index.css and is never written by a palette.
 */
export const palettes = [
  {
    id: 'moonlit',
    name: 'Moonlit',
    description: 'Dark, calm, technical',
    vars: {
      '--paper': '#0a0a0c',
      '--surface': '#141418',
      '--ink': '#e8e6e3',
      '--muted': '#8a8884',
      '--line': 'rgba(232, 230, 227, 0.16)',
      '--accent': '#6b9fff',
      '--accent-soft': '#dbe5fb',
      '--border': 'rgba(255, 255, 255, 0.08)',
    },
  },
  {
    id: 'parchment',
    name: 'Parchment',
    description: 'Warm light minimal',
    vars: {
      '--paper': '#f7f5f0',
      '--surface': '#ffffff',
      '--ink': '#1a1917',
      '--muted': '#6b6860',
      '--line': '#dedacf',
      '--accent': '#c45d3e',
      '--accent-soft': '#f7e3da',
      '--border': 'rgba(0, 0, 0, 0.08)',
    },
  },
  {
    id: 'tide',
    name: 'Tide',
    description: 'Coastal teal',
    vars: {
      '--paper': '#0d1419',
      '--surface': '#151f28',
      '--ink': '#dde8ef',
      '--muted': '#7a9199',
      '--line': 'rgba(221, 232, 239, 0.16)',
      '--accent': '#5ec4b6',
      '--accent-soft': '#d5efeb',
      '--border': 'rgba(255, 255, 255, 0.07)',
    },
  },
  {
    id: 'moss',
    name: 'Moss',
    description: 'Muted forest green',
    vars: {
      '--paper': '#111410',
      '--surface': '#1a1e17',
      '--ink': '#e2e8dc',
      '--muted': '#8a9480',
      '--line': 'rgba(226, 232, 220, 0.16)',
      '--accent': '#8fad6e',
      '--accent-soft': '#e3ecda',
      '--border': 'rgba(255, 255, 255, 0.07)',
    },
  },
  {
    id: 'slate',
    name: 'Slate',
    description: 'Balanced professional',
    vars: {
      '--paper': '#12151a',
      '--surface': '#1c2129',
      '--ink': '#eef0f4',
      '--muted': '#8891a0',
      '--line': 'rgba(238, 240, 244, 0.16)',
      '--accent': '#e8917a',
      '--accent-soft': '#f9e4dc',
      '--border': 'rgba(255, 255, 255, 0.08)',
    },
  },
  {
    id: 'paper',
    name: 'Paper',
    description: 'Pure light minimal',
    vars: {
      '--paper': '#fafafa',
      '--surface': '#ffffff',
      '--ink': '#111111',
      '--muted': '#666666',
      '--line': '#e5e5e5',
      '--accent': '#2563eb',
      '--accent-soft': '#dce7fd',
      '--border': 'rgba(0, 0, 0, 0.08)',
    },
  },
];
