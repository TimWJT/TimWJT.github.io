import { createContext, useContext, useLayoutEffect, useState } from 'react';
import { palettes } from '../data/palettes';

const PaletteContext = createContext(null);
const STORAGE_KEY = 'timwang-palette';
const VALID_IDS = new Set(palettes.map((p) => p.id));

function applyPalette(palette) {
  const root = document.documentElement;
  root.removeAttribute('data-design');
  Object.entries(palette.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

function readInitialIndex() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && !VALID_IDS.has(saved)) {
    localStorage.removeItem(STORAGE_KEY);
  }
  if (saved && VALID_IDS.has(saved)) {
    return palettes.findIndex((p) => p.id === saved);
  }
  return 0;
}

export function PaletteProvider({ children }) {
  const [index, setIndex] = useState(readInitialIndex);
  const palette = palettes[index] ?? palettes[0];

  useLayoutEffect(() => {
    applyPalette(palette);
    localStorage.setItem(STORAGE_KEY, palette.id);
  }, [palette]);

  const next = () => setIndex((i) => (i + 1) % palettes.length);
  const prev = () => setIndex((i) => (i - 1 + palettes.length) % palettes.length);
  const setById = (id) => {
    const i = palettes.findIndex((p) => p.id === id);
    if (i >= 0) setIndex(i);
  };

  return (
    <PaletteContext.Provider value={{ palette, index, total: palettes.length, next, prev, setById, palettes }}>
      {children}
    </PaletteContext.Provider>
  );
}

export function usePalette() {
  const ctx = useContext(PaletteContext);
  if (!ctx) throw new Error('usePalette must be used within PaletteProvider');
  return ctx;
}

// Apply before first paint when possible
applyPalette(palettes[readInitialIndex()] ?? palettes[0]);
