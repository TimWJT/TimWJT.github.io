import { createContext, useContext, useLayoutEffect, useState } from 'react';
import { palettes } from '../data/palettes';

const PaletteContext = createContext(null);

/*
 * The site's own cream design. It is not one of the six palettes and has no
 * entry in src/data/palettes.js, because "no palette applied" and "the design
 * you know" have to be the same state: it is what the page renders on every
 * ordinary load, and reloading is the way back to it. It needs a shape like a
 * palette anyway, so the design panel can render it like one.
 */
export const BASE_PALETTE = { id: 'base', name: 'Base', description: 'Default cream' };

/*
 * A palette is applied as a `data-palette` attribute on <html>, never as inline
 * custom properties. The six themes are [data-palette="…"] blocks in
 * src/index.css, which is why the palette values live in the stylesheet instead
 * of being written into the page by JavaScript: one attribute flips a whole
 * theme, and nothing can drift between the data file and the running page.
 *
 * The .experience-section and .community-section bands still win inside
 * themselves, because they declare their own four tokens on their own rule and
 * read nothing a palette writes.
 */
function applyPalette(palette) {
  const root = document.documentElement;
  // 'base' means no theme at all, and "no attribute" is exactly what the CSS and
  // the suites mean by the cream design, so the attribute is removed rather
  // than set to an empty value.
  if (palette.id === BASE_PALETTE.id) root.removeAttribute('data-palette');
  else root.setAttribute('data-palette', palette.id);
  // Belt and braces for a browser tab that loaded an older build: that code
  // wrote these eight tokens inline, inline beats every rule in the stylesheet,
  // and nothing writes them now, so any left over are stale and are removed.
  // It also keeps <html>'s inline style attribute empty, which the suite checks.
  for (const token of Object.keys(palettes[0].vars)) root.style.removeProperty(token);
  // `data-design` was the old design-panel marker and nothing in the site sets
  // it any more, but the removal is kept: it is one line, and if a future
  // feature re-adds it as a second theme signal the two writers would otherwise
  // fight over the same attribute.
  root.removeAttribute('data-design');
}

export function PaletteProvider({ children }) {
  // Every ordinary load starts on the cream design. Nothing outside this
  // provider writes the theme, so there is no earlier decision to agree with.
  const [paletteId, setPaletteId] = useState(BASE_PALETTE.id);
  const palette = paletteId === BASE_PALETTE.id
    ? BASE_PALETTE
    : palettes.find((entry) => entry.id === paletteId) ?? BASE_PALETTE;

  // Runs before the browser paints, so switching a swatch repaints once.
  useLayoutEffect(() => {
    applyPalette(palette);
  }, [palette]);

  const positionOf = (id) => palettes.findIndex((entry) => entry.id === id);

  /*
   * A deliberate pick, for this page view only. Nothing is written to storage:
   * a theme lasts until you reload, and a reload brings the cream design back.
   */
  const choose = (id) => setPaletteId(id);

  /*
   * next and prev keep the meaning they always had: one step along the six
   * palettes, wrapping at both ends. The cream design is treated as "before the
   * first" for next and "after the last" for prev, which means neither can land
   * back on the base design - so every deliberate pick turns `isBase` off.
   * Reloading the page is the way back to cream.
   */
  const step = (delta) => {
    const here = positionOf(paletteId);
    if (here < 0) return choose(palettes[delta > 0 ? 0 : palettes.length - 1].id);
    return choose(palettes[(here + delta + palettes.length) % palettes.length].id);
  };
  const next = () => step(1);
  const prev = () => step(-1);

  // An id that is not one of the six changes nothing, and 'base' is
  // deliberately in that set: every one of these three is a deliberate pick,
  // and a pick is never the cream design. So the panel cannot choose cream, and
  // reloading the page is the route back to it.
  const setById = (id) => {
    if (positionOf(id) < 0) return;
    choose(id);
  };

  return (
    <PaletteContext.Provider
      value={{
        palette,
        // 0 is the cream design and 1 to 6 are the palettes in list order, so
        // `index` is the number the panel's own counter shows.
        index: palette === BASE_PALETTE ? 0 : positionOf(palette.id) + 1,
        isBase: palette === BASE_PALETTE,
        total: palettes.length,
        next,
        prev,
        setById,
        palettes,
      }}
    >
      {children}
    </PaletteContext.Provider>
  );
}

export function usePalette() {
  const ctx = useContext(PaletteContext);
  if (!ctx) throw new Error('usePalette must be used within PaletteProvider');
  return ctx;
}
